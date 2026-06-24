import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'

// 魔法光环效果
function MagicRing({ radius, color, speed, delay }) {
  const ringRef = useRef()
  const [visible, setVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay * 1000)
    return () => clearTimeout(timer)
  }, [delay])
  
  useFrame((state) => {
    if (ringRef.current && visible) {
      ringRef.current.rotation.z = state.clock.elapsedTime * speed
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1
      ringRef.current.scale.setScalar(scale)
    }
  })
  
  if (!visible) return null
  
  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.03, 8, 64]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={1}
        transparent
        opacity={0.7}
      />
    </mesh>
  )
}

// 飞舞的星星
function FlyingStars({ count = 30 }) {
  const starsRef = useRef()
  
  const { positions, velocities, scales, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = []
    const scales = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    
    const colorOptions = [
      new THREE.Color('#FFD700'),
      new THREE.Color('#FFB6C1'),
      new THREE.Color('#87CEEB'),
      new THREE.Color('#DDA0DD'),
    ]
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const angle = (i / count) * Math.PI * 2
      const radius = 1 + Math.random() * 0.5
      
      positions[i3] = Math.cos(angle) * radius
      positions[i3 + 1] = (Math.random() - 0.5) * 2
      positions[i3 + 2] = Math.sin(angle) * radius
      
      velocities.push({
        angle: angle,
        radius: radius,
        speed: 0.5 + Math.random() * 0.5,
        ySpeed: (Math.random() - 0.5) * 0.02,
        phase: Math.random() * Math.PI * 2
      })
      
      scales[i] = 0.1 + Math.random() * 0.2
      
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)]
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }
    
    return { positions, velocities, scales, colors }
  }, [count])
  
  useFrame((state) => {
    if (starsRef.current) {
      const posArray = starsRef.current.geometry.attributes.position.array
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const vel = velocities[i]
        
        vel.angle += 0.02 * vel.speed
        const currentRadius = vel.radius + Math.sin(state.clock.elapsedTime * 2 + vel.phase) * 0.3
        
        posArray[i3] = Math.cos(vel.angle) * currentRadius
        posArray[i3 + 1] += vel.ySpeed
        posArray[i3 + 2] = Math.sin(vel.angle) * currentRadius
        
        // 循环 Y 位置
        if (posArray[i3 + 1] > 2) posArray[i3 + 1] = -2
        if (posArray[i3 + 1] < -2) posArray[i3 + 1] = 2
      }
      
      starsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
}

// 心形粒子爆发
function HeartBurst({ onComplete }) {
  const groupRef = useRef()
  const [hearts, setHearts] = useState([])
  
  useEffect(() => {
    const newHearts = []
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2
      const speed = 2 + Math.random() * 2
      newHearts.push({
        id: i,
        x: 0,
        y: 0,
        z: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 2,
        vz: (Math.random() - 0.5) * speed,
        rotation: Math.random() * Math.PI * 2,
        scale: 0.1 + Math.random() * 0.1,
        color: ['#FFB6C1', '#FF69B4', '#FF1493'][Math.floor(Math.random() * 3)]
      })
    }
    setHearts(newHearts)
    
    const timer = setTimeout(() => {
      if (onComplete) onComplete()
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [onComplete])
  
  useFrame((state, delta) => {
    setHearts(prev => prev.map(heart => ({
      ...heart,
      x: heart.x + heart.vx * delta,
      y: heart.y + heart.vy * delta - 0.5 * 9.8 * delta * delta,
      z: heart.z + heart.vz * delta,
      vy: heart.vy - 9.8 * delta * 0.3,
      rotation: heart.rotation + delta * 2
    })))
  })
  
  return (
    <group ref={groupRef}>
      {hearts.map(heart => (
        <mesh 
          key={heart.id}
          position={[heart.x, heart.y, heart.z]}
          rotation={[0, 0, heart.rotation]}
          scale={heart.scale}
        >
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial 
            color={heart.color}
            emissive={heart.color}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}

// 彩虹光柱效果
function RainbowBeam() {
  const beamRef = useRef()
  
  const colors = useMemo(() => [
    '#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
  ], [])
  
  useFrame((state) => {
    if (beamRef.current) {
      beamRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })
  
  return (
    <group ref={beamRef} position={[0, 0, 0]}>
      {colors.map((color, i) => (
        <mesh 
          key={i}
          position={[0, 0, 0]}
          rotation={[0, (i / colors.length) * Math.PI * 2, 0]}
        >
          <planeGeometry args={[0.1, 4]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.8}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// 主魔法效果组件
function MagicEffects() {
  const { showSuccessAnimation, isActionCorrect, getCurrentWord } = useGameStore()
  const currentWord = getCurrentWord()
  
  if (!showSuccessAnimation) return null
  
  return (
    <group position={[3, 0.5, 0]}>
      {/* 多层魔法光环 */}
      <MagicRing radius={1} color="#FFD700" speed={2} delay={0} />
      <MagicRing radius={1.3} color="#FFB6C1" speed={-1.5} delay={0.1} />
      <MagicRing radius={1.6} color="#87CEEB" speed={1} delay={0.2} />
      
      {/* 飞舞的星星 */}
      <FlyingStars count={40} />
      
      {/* 彩虹光柱 */}
      <RainbowBeam />
      
      {/* 大量闪烁粒子 */}
      <Sparkles 
        count={100}
        scale={3}
        size={6}
        speed={2}
        color="#FFD700"
        opacity={0.8}
      />
      
      {/* 心形爆发 */}
      <HeartBurst />
    </group>
  )
}

export default MagicEffects
