import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'

// 星星粒子特效 - 使用 Shader 实现
function StarParticles() {
  const pointsRef = useRef()
  const { playSound } = useGameStore()
  
  // 粒子数量
  const particleCount = 500
  
  // 创建粒子属性
  const { positions, velocities, sizes, colors, delays } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const colors = new Float32Array(particleCount * 3)
    const delays = new Float32Array(particleCount)
    
    const colorPalette = [
      new THREE.Color('#FFD700'), // 金色
      new THREE.Color('#FFB6C1'), // 粉色
      new THREE.Color('#87CEEB'), // 天蓝
      new THREE.Color('#DDA0DD'), // 梅红
      new THREE.Color('#FFFFFF'), // 白色
    ]
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      
      // 从中心点出发
      positions[i3] = 0
      positions[i3 + 1] = 0
      positions[i3 + 2] = 0
      
      // 随机方向的速度（球形散开）
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = Math.random() * 3 + 2
      
      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed
      velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
      velocities[i3 + 2] = Math.cos(phi) * speed
      
      // 随机大小
      sizes[i] = Math.random() * 20 + 10
      
      // 随机颜色
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
      
      // 随机延迟
      delays[i] = Math.random() * 0.3
    }
    
    return { positions, velocities, sizes, colors, delays }
  }, [])
  
  // 着色器
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aVelocity;
        attribute float aDelay;
        attribute vec3 aColor;
        
        uniform float uTime;
        uniform float uProgress;
        
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vColor = aColor;
          
          // 计算实际时间（考虑延迟）
          float t = max(0.0, uTime - aDelay);
          
          // 重力效果
          vec3 pos = position + aVelocity * t - vec3(0.0, 0.5 * t * t, 0.0);
          
          // 透明度随时间递减
          vAlpha = 1.0 - smoothstep(0.0, 2.0, t);
          
          // 大小随时间变化
          float size = aSize * (1.0 + sin(t * 10.0) * 0.3) * (1.0 - t * 0.3);
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (300.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          // 创建星形
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          // 星星的光芒效果
          float angle = atan(center.y, center.x);
          float rays = abs(sin(angle * 4.0));
          float star = smoothstep(0.5, 0.2, dist) * (0.5 + rays * 0.5);
          
          // 发光效果
          float glow = exp(-dist * 4.0);
          
          float alpha = (star + glow * 0.5) * vAlpha;
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])
  
  // 动画
  const startTime = useRef(Date.now())
  
  useEffect(() => {
    startTime.current = Date.now()
    playSound('star')
  }, [])
  
  useFrame(() => {
    if (pointsRef.current && shaderMaterial) {
      const elapsed = (Date.now() - startTime.current) / 1000
      shaderMaterial.uniforms.uTime.value = elapsed
    }
  })
  
  return (
    <points ref={pointsRef} material={shaderMaterial}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aVelocity"
          count={particleCount}
          array={velocities}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aDelay"
          count={particleCount}
          array={delays}
          itemSize={1}
        />
      </bufferGeometry>
    </points>
  )
}

export default StarParticles
