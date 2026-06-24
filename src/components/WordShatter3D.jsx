import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'

// 冰晶碎片
function IceShard({ startPos, velocity, rotationSpeed, color, scale, delay }) {
  const meshRef = useRef()
  const [active, setActive] = useState(false)
  const [opacity, setOpacity] = useState(1)
  const posRef = useRef([...startPos])
  const velRef = useRef([...velocity])
  
  useEffect(() => {
    const timer = setTimeout(() => setActive(true), delay * 1000)
    return () => clearTimeout(timer)
  }, [delay])
  
  useFrame((state, delta) => {
    if (meshRef.current && active) {
      // 更新速度（重力）
      velRef.current[1] -= 15 * delta
      
      // 更新位置
      posRef.current[0] += velRef.current[0] * delta
      posRef.current[1] += velRef.current[1] * delta
      posRef.current[2] += velRef.current[2] * delta
      
      meshRef.current.position.set(...posRef.current)
      
      // 旋转
      meshRef.current.rotation.x += rotationSpeed[0] * delta
      meshRef.current.rotation.y += rotationSpeed[1] * delta
      meshRef.current.rotation.z += rotationSpeed[2] * delta
      
      // 渐隐
      setOpacity(prev => Math.max(0, prev - delta * 0.5))
    }
  })
  
  if (!active || opacity <= 0) return null
  
  return (
    <mesh ref={meshRef} position={startPos} scale={scale}>
      <octahedronGeometry args={[0.1, 0]} />
      <meshStandardMaterial 
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        transparent
        opacity={opacity}
        metalness={0.9}
        roughness={0.1}
      />
    </mesh>
  )
}

// 魔法冲击波
function MagicShockwave({ position, onComplete }) {
  const ringRef = useRef()
  const [scale, setScale] = useState(0.1)
  const [opacity, setOpacity] = useState(1)
  
  useFrame((state, delta) => {
    if (ringRef.current) {
      setScale(prev => prev + delta * 8)
      setOpacity(prev => Math.max(0, prev - delta * 2))
      
      ringRef.current.scale.setScalar(scale)
      
      if (opacity <= 0 && onComplete) {
        onComplete()
      }
    }
  })
  
  if (opacity <= 0) return null
  
  return (
    <mesh ref={ringRef} position={position} rotation={[0, 0, 0]}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshStandardMaterial 
        color="#00CED1"
        emissive="#00CED1"
        emissiveIntensity={2}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// 魔法光球飞向单词
function MagicProjectile({ startPos, endPos, onHit }) {
  const groupRef = useRef()
  const [progress, setProgress] = useState(0)
  const [hasHit, setHasHit] = useState(false)
  
  useFrame((state, delta) => {
    if (groupRef.current && !hasHit) {
      setProgress(prev => {
        const next = prev + delta * 2.5
        if (next >= 1 && !hasHit) {
          setHasHit(true)
          if (onHit) onHit()
        }
        return Math.min(1, next)
      })
      
      // 贝塞尔曲线路径
      const t = progress
      const midY = Math.max(startPos[1], endPos[1]) + 2
      
      const x = startPos[0] + (endPos[0] - startPos[0]) * t
      const y = startPos[1] * (1-t) * (1-t) + midY * 2 * (1-t) * t + endPos[1] * t * t
      const z = startPos[2] + (endPos[2] - startPos[2]) * t
      
      groupRef.current.position.set(x, y, z)
      groupRef.current.rotation.z = state.clock.elapsedTime * 10
    }
  })
  
  if (hasHit) return null
  
  return (
    <group ref={groupRef} position={startPos}>
      {/* 核心能量球 */}
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color="#00CED1"
          emissive="#00CED1"
          emissiveIntensity={3}
        />
      </mesh>
      
      {/* 外层光晕 */}
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial 
          color="#87CEEB"
          emissive="#87CEEB"
          emissiveIntensity={1}
          transparent
          opacity={0.4}
        />
      </mesh>
      
      {/* 旋转环 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.03, 8, 32]} />
        <meshStandardMaterial 
          color="#E0FFFF"
          emissive="#00CED1"
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.35, 0.02, 8, 32]} />
        <meshStandardMaterial 
          color="#B0E0E6"
          emissive="#87CEEB"
          emissiveIntensity={1.5}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* 拖尾粒子 */}
      <Sparkles count={40} scale={1} size={5} speed={3} color="#00CED1" />
    </group>
  )
}

// 单词爆炸碎片生成器
function WordExplosion({ position }) {
  const shards = useMemo(() => {
    const pieces = []
    const colors = ['#00CED1', '#87CEEB', '#E0FFFF', '#B0E0E6', '#4169E1', '#FFD700']
    
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2
      const elevation = (Math.random() - 0.3) * Math.PI
      const speed = 5 + Math.random() * 8
      
      pieces.push({
        id: i,
        startPos: [
          position[0] + (Math.random() - 0.5) * 0.5,
          position[1] + (Math.random() - 0.5) * 0.5,
          position[2] + (Math.random() - 0.5) * 0.3
        ],
        velocity: [
          Math.cos(angle) * Math.cos(elevation) * speed,
          Math.sin(elevation) * speed + 3,
          Math.sin(angle) * Math.cos(elevation) * speed * 0.5
        ],
        rotationSpeed: [
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        ],
        color: colors[Math.floor(Math.random() * colors.length)],
        scale: 0.5 + Math.random() * 1,
        delay: Math.random() * 0.15
      })
    }
    return pieces
  }, [position])
  
  return (
    <group>
      {shards.map(shard => (
        <IceShard key={shard.id} {...shard} />
      ))}
      <MagicShockwave position={position} />
      <Sparkles 
        count={80}
        scale={5}
        size={8}
        speed={4}
        color="#00CED1"
        position={position}
      />
    </group>
  )
}

// 主组件
function WordShatter3D() {
  const { showSuccessAnimation, gameState } = useGameStore()
  
  const [phase, setPhase] = useState('idle') // idle, shooting, exploding
  
  // 角色位置（左侧）- 手部位置
  const characterPos = [-5.5, 0.8, 0]
  // 单词位置（中间）
  const wordPos = [0, 0, 0]
  
  useEffect(() => {
    if (showSuccessAnimation) {
      setPhase('shooting')
    } else {
      setPhase('idle')
    }
  }, [showSuccessAnimation])
  
  const handleHit = () => {
    setPhase('exploding')
  }
  
  if (gameState === 'idle' || gameState === 'completed') return null
  
  return (
    <group>
      {/* 魔法光球 */}
      {phase === 'shooting' && (
        <MagicProjectile 
          startPos={characterPos}
          endPos={wordPos}
          onHit={handleHit}
        />
      )}
      
      {/* 单词爆炸 */}
      {phase === 'exploding' && (
        <WordExplosion position={wordPos} />
      )}
    </group>
  )
}

export default WordShatter3D
