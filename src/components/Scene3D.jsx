import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { 
  Stars, 
  Float, 
  Sparkles,
  Environment,
  Text
} from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import Sprite3D from './Sprite3D'
import CuteCharacter from './CuteCharacter'
import StarParticles from './StarParticles'
import IceMagicEffects from './IceMagicEffects'
import WordShatter3D from './WordShatter3D'
import useGameStore from '../store/gameStore'

// 马卡龙色背景渐变平面
function DreamyBackground() {
  const meshRef = useRef()
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color('#FFB6C1') }, // 粉色
    uColor2: { value: new THREE.Color('#E6E6FA') }, // 淡紫
    uColor3: { value: new THREE.Color('#87CEEB') }, // 天蓝
    uColor4: { value: new THREE.Color('#DDA0DD') }, // 梅红
  }), [])
  
  useFrame((state) => {
    if (meshRef.current) {
      uniforms.uTime.value = state.clock.elapsedTime * 0.3
    }
  })
  
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
  
  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;
    varying vec2 vUv;
    
    void main() {
      vec2 uv = vUv;
      
      // 动态渐变
      float t = sin(uTime * 0.5) * 0.5 + 0.5;
      float s = cos(uTime * 0.3) * 0.5 + 0.5;
      
      vec3 color1 = mix(uColor1, uColor2, uv.x + sin(uTime + uv.y * 3.0) * 0.2);
      vec3 color2 = mix(uColor3, uColor4, uv.y + cos(uTime * 0.7 + uv.x * 2.0) * 0.2);
      vec3 finalColor = mix(color1, color2, (uv.x + uv.y) * 0.5 + sin(uTime * 0.4) * 0.1);
      
      // 添加柔和的光晕效果
      float glow = 0.1 / length(uv - vec2(0.5 + sin(uTime) * 0.2, 0.5 + cos(uTime * 0.7) * 0.2));
      finalColor += vec3(1.0, 0.9, 0.95) * glow * 0.02;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
  
  return (
    <mesh ref={meshRef} position={[0, 0, -15]} scale={[50, 30, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial 
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}

// 漂浮的装饰元素 - 调整位置避开主要区域
function FloatingElements() {
  const elements = useMemo(() => {
    const items = []
    const colors = ['#35d6b4', '#2dd4ff', '#e0ffff', '#8b5cf6', '#ff6fae']
    
    for (let i = 0; i < 8; i++) {
      items.push({
        position: [
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 10,
          -3 - Math.random() * 5
        ],
        scale: Math.random() * 0.2 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 0.5 + 0.5,
        rotationSpeed: Math.random() * 0.02
      })
    }
    return items
  }, [])
  
  return (
    <>
      {elements.map((el, i) => (
        <Float
          key={i}
          speed={el.speed}
          rotationIntensity={0.5}
          floatIntensity={1}
          floatingRange={[-0.5, 0.5]}
        >
          <mesh position={el.position} scale={el.scale}>
            {i % 3 === 0 ? (
              <octahedronGeometry args={[1, 0]} />
            ) : i % 3 === 1 ? (
              <dodecahedronGeometry args={[1, 0]} />
            ) : (
              <icosahedronGeometry args={[1, 0]} />
            )}
            <meshStandardMaterial 
              color={el.color}
              emissive={el.color}
              emissiveIntensity={0.3}
              transparent
              opacity={0.6}
              roughness={0.2}
              metalness={0.1}
            />
          </mesh>
        </Float>
      ))}
    </>
  )
}

// 梦幻光源设置
function DreamyLights() {
  const light1Ref = useRef()
  const light2Ref = useRef()
  
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (light1Ref.current) {
      light1Ref.current.position.x = Math.sin(t * 0.5) * 5
      light1Ref.current.position.y = Math.cos(t * 0.3) * 3
    }
    if (light2Ref.current) {
      light2Ref.current.position.x = Math.cos(t * 0.4) * 5
      light2Ref.current.position.y = Math.sin(t * 0.6) * 3
    }
  })
  
  return (
    <>
      {/* 主环境光 */}
      <ambientLight intensity={0.6} color="#FFF5EE" />
      
      {/* 移动的彩色点光源 */}
      <pointLight 
        ref={light1Ref}
        position={[5, 3, 5]} 
        intensity={2} 
        color="#87CEEB" 
        distance={20}
      />
      <pointLight 
        ref={light2Ref}
        position={[-5, -3, 5]} 
        intensity={2} 
        color="#B0E0E6" 
        distance={20}
      />
      
      {/* 主方向光 */}
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1.2} 
        color="#FFFAF0"
        castShadow
      />
      
      {/* 角色专用补光 - 左侧 */}
      <pointLight position={[-6.5, 2, 5]} intensity={2.2} color="#FFFFFF" />
      <pointLight position={[-6.5, -1, 3]} intensity={1.2} color="#FFE4C4" />
      <pointLight position={[-6.5, 0.5, 2]} intensity={1} color="#FFB6C1" />
      
      {/* 单词区域补光 - 中间 */}
      <pointLight position={[0, 1, 3]} intensity={1.5} color="#87CEEB" />
    </>
  )
}

// 成功提示文字 - 冰雪主题
function SuccessText() {
  const { showSuccessAnimation, getCurrentWord } = useGameStore()
  const textRef = useRef()
  const currentWord = getCurrentWord()
  
  useFrame((state) => {
    if (textRef.current && showSuccessAnimation) {
      textRef.current.position.y = 3.5 + Math.sin(state.clock.elapsedTime * 3) * 0.15
      textRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.05
    }
  })
  
  if (!showSuccessAnimation || !currentWord) return null
  
  return (
    <group ref={textRef} position={[0, 3.5, 0]}>
      <Float speed={3} floatIntensity={0.5}>
        <Text
          fontSize={0.4}
          color="#00CED1"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#FFFFFF"
        >
          {currentWord.encouragement}
        </Text>
      </Float>
      {/* 雪花装饰 */}
      <Sparkles count={30} scale={2} size={5} speed={0.8} color="#E0FFFF" />
    </group>
  )
}

function Scene3D() {
  const { showStarEffect, gameState } = useGameStore()
  const isPlaying =
    gameState === 'learning' ||
    gameState === 'action_pending' ||
    gameState === 'action_success'
  
  return (
    <>
      {/* 梦幻渐变背景 */}
      <DreamyBackground />
      
      {/* 灯光设置 */}
      <DreamyLights />
      
      {/* 星空背景 */}
      <Stars 
        radius={50} 
        depth={50} 
        count={1200} 
        factor={4} 
        saturation={0.5}
        fade 
        speed={0.35}
      />
      
      {/* 闪烁粒子 - 雪花效果 */}
      <Sparkles 
        count={38}
        scale={[30, 18, 10]}
        size={2}
        speed={0.16}
        color="#E0FFFF"
        opacity={0.42}
      />
      
      {/* 漂浮装饰元素 */}
      <FloatingElements />
      
      {/* 3D 精灵助手 - 隐藏（艾莎是主角） */}
      {/* <group position={[-5.5, -2.5, 0]} scale={0.4}>
        <Sprite3D />
      </group> */}
      
      {/* 可爱的卡通角色 - 在左侧，与真人姿态映射 */}
      {isPlaying && <CuteCharacter />}
      
      {/* 3D 单词打碎效果 */}
      <WordShatter3D />
      
      {/* 魔法效果 - 跟随角色位置（左侧） */}
      <group position={[-6.5, 0, 0]}>
        <IceMagicEffects />
      </group>
      
      {/* 成功提示 */}
      <SuccessText />
      
      {/* 星星粒子特效 */}
      {showStarEffect && <StarParticles />}
      
      {/* 后期处理效果 */}
      <EffectComposer>
        <Bloom 
          intensity={0.45}
          luminanceThreshold={0.48}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </>
  )
}

export default Scene3D
