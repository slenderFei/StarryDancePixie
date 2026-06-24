import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Trail } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'

// 精灵的光环效果
function SpriteHalo({ color, scale }) {
  const ref = useRef()
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = state.clock.elapsedTime * 0.5
    }
  })
  
  return (
    <mesh ref={ref} scale={scale}>
      <torusGeometry args={[1.5, 0.05, 16, 64]} />
      <meshStandardMaterial 
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

// 精灵身上的小星星
function SpriteStar({ position, scale, delay }) {
  const ref = useRef()
  
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime + delay
      ref.current.rotation.z = t * 2
      ref.current.scale.setScalar(scale * (1 + Math.sin(t * 3) * 0.2))
    }
  })
  
  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[0.15, 0]} />
      <meshStandardMaterial 
        color="#FFD700"
        emissive="#FFD700"
        emissiveIntensity={1}
      />
    </mesh>
  )
}

function Sprite3D() {
  const groupRef = useRef()
  const bodyRef = useRef()
  const { mousePosition, gameState, showSuccessAnimation } = useGameStore()
  
  // 目标位置（平滑跟随鼠标）
  const targetPosition = useRef({ x: 0, y: 0 })
  const currentPosition = useRef({ x: 0, y: 0 })
  
  // 小星星位置
  const stars = useMemo(() => [
    { position: [0.8, 0.5, 0.3], scale: 0.8, delay: 0 },
    { position: [-0.7, 0.6, 0.2], scale: 0.6, delay: 1 },
    { position: [0.5, -0.4, 0.4], scale: 0.5, delay: 2 },
    { position: [-0.6, -0.3, 0.3], scale: 0.7, delay: 1.5 },
  ], [])
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // 更新目标位置（基于鼠标）
      targetPosition.current.x = mousePosition.x * 3
      targetPosition.current.y = mousePosition.y * 2
      
      // 平滑插值
      currentPosition.current.x += (targetPosition.current.x - currentPosition.current.x) * 0.05
      currentPosition.current.y += (targetPosition.current.y - currentPosition.current.y) * 0.05
      
      // 应用位置
      groupRef.current.position.x = currentPosition.current.x
      groupRef.current.position.y = currentPosition.current.y
      
      // 轻微的晃动效果
      const wobble = Math.sin(state.clock.elapsedTime * 2) * 0.1
      groupRef.current.rotation.z = wobble + (mousePosition.x * 0.2)
      groupRef.current.rotation.x = mousePosition.y * 0.1
    }
    
    // 身体的呼吸效果
    if (bodyRef.current) {
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05
      bodyRef.current.scale.setScalar(breathe)
    }
  })
  
  // 成功动画时放大效果
  const successScale = showSuccessAnimation ? 1.3 : 1
  
  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={successScale}>
      <Float
        speed={2}
        rotationIntensity={0.3}
        floatIntensity={0.5}
      >
        {/* 精灵主体 - 可爱的球形身体 */}
        <Trail
          width={2}
          length={5}
          color="#FFB6C1"
          attenuation={(t) => t * t}
        >
          <mesh ref={bodyRef}>
            <sphereGeometry args={[1, 32, 32]} />
            <MeshDistortMaterial
              color="#FFB6C1"
              emissive="#FFB6C1"
              emissiveIntensity={0.3}
              roughness={0.2}
              metalness={0.1}
              distort={0.3}
              speed={2}
            />
          </mesh>
        </Trail>
        
        {/* 精灵的眼睛 */}
        <group position={[0, 0.2, 0.85]}>
          {/* 左眼 */}
          <mesh position={[-0.25, 0, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#5D4E6D" />
          </mesh>
          <mesh position={[-0.22, 0.03, 0.08]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.5} />
          </mesh>
          
          {/* 右眼 */}
          <mesh position={[0.25, 0, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#5D4E6D" />
          </mesh>
          <mesh position={[0.28, 0.03, 0.08]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.5} />
          </mesh>
        </group>
        
        {/* 脸红 */}
        <mesh position={[-0.45, -0.1, 0.7]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial 
            color="#FF9999" 
            transparent 
            opacity={0.6}
          />
        </mesh>
        <mesh position={[0.45, -0.1, 0.7]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial 
            color="#FF9999" 
            transparent 
            opacity={0.6}
          />
        </mesh>
        
        {/* 微笑 */}
        <mesh position={[0, -0.2, 0.9]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.15, 0.03, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#5D4E6D" />
        </mesh>
        
        {/* 小翅膀 */}
        <group position={[-0.9, 0.3, 0]} rotation={[0, 0, 0.3]}>
          <mesh>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial 
              color="#E6E6FA"
              emissive="#DDA0DD"
              emissiveIntensity={0.3}
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
        <group position={[0.9, 0.3, 0]} rotation={[0, 0, -0.3]}>
          <mesh>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial 
              color="#E6E6FA"
              emissive="#DDA0DD"
              emissiveIntensity={0.3}
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
        
        {/* 头顶的小星星 */}
        <mesh position={[0, 1.3, 0]}>
          <octahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial 
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={1}
          />
        </mesh>
        
        {/* 环绕的小星星 */}
        {stars.map((star, i) => (
          <SpriteStar key={i} {...star} />
        ))}
        
        {/* 光环 */}
        <SpriteHalo color="#FFD700" scale={0.8} />
        <SpriteHalo color="#FFB6C1" scale={1} />
      </Float>
    </group>
  )
}

export default Sprite3D
