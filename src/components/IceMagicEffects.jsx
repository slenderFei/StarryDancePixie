import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'

// 冰晶爆发效果
function IceCrystalBurst() {
  const groupRef = useRef()
  const [crystals, setCrystals] = useState([])
  
  useEffect(() => {
    const newCrystals = []
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2
      const speed = 1.5 + Math.random() * 2
      newCrystals.push({
        id: i,
        x: 0,
        y: 0,
        z: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.random() * 2 + 1,
        vz: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5,
        scale: 0.05 + Math.random() * 0.08,
        opacity: 1
      })
    }
    setCrystals(newCrystals)
  }, [])
  
  useFrame((state, delta) => {
    setCrystals(prev => prev.map(crystal => ({
      ...crystal,
      x: crystal.x + crystal.vx * delta,
      y: crystal.y + crystal.vy * delta - 2 * delta,
      z: crystal.z + crystal.vz * delta,
      vy: crystal.vy - 3 * delta,
      rotation: crystal.rotation + crystal.rotationSpeed * delta,
      opacity: Math.max(0, crystal.opacity - delta * 0.4)
    })).filter(c => c.opacity > 0))
  })
  
  return (
    <group ref={groupRef}>
      {crystals.map(crystal => (
        <mesh 
          key={crystal.id}
          position={[crystal.x, crystal.y, crystal.z]}
          rotation={[crystal.rotation, crystal.rotation * 0.7, 0]}
          scale={crystal.scale}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial 
            color="#00CED1"
            emissive="#00CED1"
            emissiveIntensity={0.8}
            transparent
            opacity={crystal.opacity * 0.8}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  )
}

// 雪花漩涡
function SnowflakeVortex() {
  const vortexRef = useRef()
  const snowflakes = useMemo(() => {
    const flakes = []
    for (let i = 0; i < 50; i++) {
      flakes.push({
        angle: (i / 50) * Math.PI * 2,
        radius: 0.5 + Math.random() * 1,
        y: (Math.random() - 0.5) * 2,
        speed: 1 + Math.random() * 0.5,
        size: 0.02 + Math.random() * 0.03
      })
    }
    return flakes
  }, [])
  
  useFrame((state) => {
    if (vortexRef.current) {
      vortexRef.current.rotation.y = state.clock.elapsedTime * 2
    }
  })
  
  return (
    <group ref={vortexRef}>
      {snowflakes.map((flake, i) => (
        <mesh 
          key={i}
          position={[
            Math.cos(flake.angle) * flake.radius,
            flake.y,
            Math.sin(flake.angle) * flake.radius
          ]}
        >
          <octahedronGeometry args={[flake.size, 0]} />
          <meshStandardMaterial 
            color="#E0FFFF"
            emissive="#87CEEB"
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  )
}

// 冰柱升起效果
function IcePillars() {
  const pillarsRef = useRef()
  const [pillars, setPillars] = useState([])
  
  useEffect(() => {
    const newPillars = []
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      newPillars.push({
        id: i,
        x: Math.cos(angle) * 0.8,
        z: Math.sin(angle) * 0.8,
        height: 0,
        targetHeight: 0.5 + Math.random() * 0.5,
        delay: i * 0.1
      })
    }
    setPillars(newPillars)
  }, [])
  
  useFrame((state, delta) => {
    setPillars(prev => prev.map(pillar => ({
      ...pillar,
      height: Math.min(pillar.targetHeight, pillar.height + delta * 2)
    })))
  })
  
  return (
    <group ref={pillarsRef}>
      {pillars.map(pillar => (
        <group key={pillar.id} position={[pillar.x, -0.8, pillar.z]}>
          <mesh position={[0, pillar.height / 2, 0]}>
            <cylinderGeometry args={[0.02, 0.05, pillar.height, 6]} />
            <meshStandardMaterial 
              color="#B0E0E6"
              emissive="#00CED1"
              emissiveIntensity={0.4}
              transparent
              opacity={0.7}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          {/* 顶部冰晶 */}
          <mesh position={[0, pillar.height, 0]}>
            <octahedronGeometry args={[0.04, 0]} />
            <meshStandardMaterial 
              color="#E0FFFF"
              emissive="#00CED1"
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// 冰雪魔法光环
function IceMagicRings() {
  const ring1Ref = useRef()
  const ring2Ref = useRef()
  const ring3Ref = useRef()
  
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ring1Ref.current) ring1Ref.current.rotation.z = t * 2
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 1.5
    if (ring3Ref.current) ring3Ref.current.rotation.x = t * 1.8
  })
  
  return (
    <group>
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.015, 8, 64]} />
        <meshStandardMaterial 
          color="#00CED1"
          emissive="#00CED1"
          emissiveIntensity={1}
          transparent
          opacity={0.7}
        />
      </mesh>
      
      <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1, 0.01, 8, 64]} />
        <meshStandardMaterial 
          color="#87CEEB"
          emissive="#87CEEB"
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      <mesh ref={ring3Ref} rotation={[0, Math.PI / 4, 0]}>
        <torusGeometry args={[1.2, 0.008, 8, 64]} />
        <meshStandardMaterial 
          color="#B0E0E6"
          emissive="#B0E0E6"
          emissiveIntensity={0.6}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  )
}

// 主冰雪魔法效果组件
function IceMagicEffects() {
  const { showSuccessAnimation } = useGameStore()
  
  if (!showSuccessAnimation) return null
  
  return (
    <group position={[0, 0.3, 0]}>
      {/* 冰晶爆发 */}
      <IceCrystalBurst />
      
      {/* 雪花漩涡 */}
      <SnowflakeVortex />
      
      {/* 冰柱升起 */}
      <IcePillars />
      
      {/* 魔法光环 */}
      <IceMagicRings />
      
      {/* 大量雪花粒子 */}
      <Sparkles 
        count={150}
        scale={3}
        size={5}
        speed={1.5}
        color="#E0FFFF"
        opacity={0.8}
      />
      
      {/* 蓝色光芒粒子 */}
      <Sparkles 
        count={80}
        scale={2}
        size={8}
        speed={2}
        color="#00CED1"
        opacity={0.6}
      />
    </group>
  )
}

export default IceMagicEffects
