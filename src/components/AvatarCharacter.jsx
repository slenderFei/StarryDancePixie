import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Trail, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'

// 关节角度计算工具
const calculateAngle = (p1, p2, p3) => {
  if (!p1 || !p2 || !p3) return 0
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
  if (mag1 === 0 || mag2 === 0) return 0
  return Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2))))
}

// 可爱的卡通头部
function CartoonHead({ position, rotation, isHappy }) {
  const headRef = useRef()
  const eyeScale = isHappy ? 0.8 : 1
  
  useFrame((state) => {
    if (headRef.current) {
      // 轻微的呼吸效果
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02
      headRef.current.scale.setScalar(breathe)
    }
  })
  
  return (
    <group position={position} rotation={rotation}>
      <group ref={headRef}>
        {/* 头部主体 */}
        <mesh>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial 
            color="#FFE4C4" 
            roughness={0.6}
            metalness={0.1}
          />
        </mesh>
        
        {/* 腮红 */}
        <mesh position={[-0.2, -0.05, 0.28]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#FFB6C1" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0.2, -0.05, 0.28]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#FFB6C1" transparent opacity={0.6} />
        </mesh>
        
        {/* 眼睛 */}
        <group position={[-0.12, 0.08, 0.28]} scale={eyeScale}>
          <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#4A3728" />
          </mesh>
          <mesh position={[0.02, 0.02, 0.07]}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.5} />
          </mesh>
        </group>
        
        <group position={[0.12, 0.08, 0.28]} scale={eyeScale}>
          <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#4A3728" />
          </mesh>
          <mesh position={[0.02, 0.02, 0.07]}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.5} />
          </mesh>
        </group>
        
        {/* 嘴巴 - 开心时是笑脸 */}
        {isHappy ? (
          <mesh position={[0, -0.12, 0.3]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.06, 0.02, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#E57373" />
          </mesh>
        ) : (
          <mesh position={[0, -0.1, 0.32]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial color="#E57373" />
          </mesh>
        )}
        
        {/* 头发/装饰 - 双马尾 */}
        <mesh position={[-0.3, 0.15, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0.3, 0.15, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        
        {/* 头顶蝴蝶结 */}
        <group position={[0, 0.4, 0.1]}>
          <mesh position={[-0.08, 0, 0]} rotation={[0, 0, 0.3]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#FFB6C1" />
          </mesh>
          <mesh position={[0.08, 0, 0]} rotation={[0, 0, -0.3]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#FFB6C1" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshStandardMaterial color="#FF69B4" />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// 身体部分
function CartoonBody({ position, rotation }) {
  return (
    <group position={position} rotation={rotation}>
      {/* 裙子/连衣裙 */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.2, 0.35, 0.5, 16]} />
        <meshStandardMaterial color="#DDA0DD" />
      </mesh>
      
      {/* 上身 */}
      <mesh position={[0, 0.15, 0]}>
        <capsuleGeometry args={[0.18, 0.2, 8, 16]} />
        <meshStandardMaterial color="#FFB6C1" />
      </mesh>
      
      {/* 裙子装饰 */}
      <mesh position={[0, -0.2, 0.2]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#FF69B4" />
      </mesh>
    </group>
  )
}

// 手臂（带关节）
function CartoonArm({ side, shoulderPos, elbowAngle, wristPos, isLeft, showMagic }) {
  const armRef = useRef()
  const handRef = useRef()
  
  // 计算手臂旋转角度
  const shoulderRotation = useMemo(() => {
    if (!shoulderPos || !wristPos) return { x: 0, y: 0, z: isLeft ? 0.5 : -0.5 }
    
    // 计算从肩膀到手腕的方向
    const dx = wristPos.x - shoulderPos.x
    const dy = wristPos.y - shoulderPos.y
    
    // 转换为旋转角度（y轴向下，所以需要调整）
    const angle = Math.atan2(dx, -dy)
    
    return { 
      x: 0, 
      y: 0, 
      z: isLeft ? angle + Math.PI/2 : angle - Math.PI/2
    }
  }, [shoulderPos, wristPos, isLeft])
  
  useFrame((state) => {
    if (handRef.current && showMagic) {
      // 魔法效果时手部发光旋转
      handRef.current.rotation.z = state.clock.elapsedTime * 3
    }
  })
  
  const xOffset = isLeft ? -0.35 : 0.35
  
  return (
    <group position={[xOffset, 0.1, 0]}>
      {/* 上臂 */}
      <group rotation={[shoulderRotation.x, shoulderRotation.y, shoulderRotation.z]}>
        <mesh position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.06, 0.2, 8, 16]} />
          <meshStandardMaterial color="#FFE4C4" />
        </mesh>
        
        {/* 肘部关节 */}
        <group position={[0, -0.3, 0]} rotation={[0, 0, elbowAngle * (isLeft ? 1 : -1)]}>
          <mesh>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#FFE4C4" />
          </mesh>
          
          {/* 前臂 */}
          <mesh position={[0, -0.12, 0]}>
            <capsuleGeometry args={[0.05, 0.15, 8, 16]} />
            <meshStandardMaterial color="#FFE4C4" />
          </mesh>
          
          {/* 手 */}
          <group ref={handRef} position={[0, -0.25, 0]}>
            <mesh>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshStandardMaterial 
                color={showMagic ? "#FFD700" : "#FFE4C4"}
                emissive={showMagic ? "#FFD700" : "#000000"}
                emissiveIntensity={showMagic ? 0.5 : 0}
              />
            </mesh>
            
            {/* 魔法光环 */}
            {showMagic && (
              <>
                <mesh>
                  <torusGeometry args={[0.1, 0.01, 8, 32]} />
                  <meshStandardMaterial 
                    color="#FFD700" 
                    emissive="#FFD700" 
                    emissiveIntensity={1}
                    transparent
                    opacity={0.8}
                  />
                </mesh>
                <Sparkles count={20} scale={0.3} size={2} speed={0.5} color="#FFD700" />
              </>
            )}
          </group>
        </group>
      </group>
    </group>
  )
}

// 腿部
function CartoonLeg({ isLeft, hipPos, kneeAngle, anklePos }) {
  const legRotation = useMemo(() => {
    if (!hipPos || !anklePos) return 0
    const dx = anklePos.x - hipPos.x
    const dy = anklePos.y - hipPos.y
    return Math.atan2(dx, -dy) * 0.5
  }, [hipPos, anklePos])
  
  const xOffset = isLeft ? -0.12 : 0.12
  
  return (
    <group position={[xOffset, -0.35, 0]}>
      <group rotation={[0, 0, legRotation]}>
        {/* 大腿 */}
        <mesh position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.07, 0.15, 8, 16]} />
          <meshStandardMaterial color="#FFE4C4" />
        </mesh>
        
        {/* 膝盖 */}
        <group position={[0, -0.25, 0]} rotation={[0, 0, kneeAngle * 0.3]}>
          <mesh>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#FFE4C4" />
          </mesh>
          
          {/* 小腿 */}
          <mesh position={[0, -0.12, 0]}>
            <capsuleGeometry args={[0.055, 0.15, 8, 16]} />
            <meshStandardMaterial color="#FFE4C4" />
          </mesh>
          
          {/* 脚/鞋子 */}
          <mesh position={[0, -0.25, 0.02]}>
            <boxGeometry args={[0.08, 0.05, 0.12]} />
            <meshStandardMaterial color="#FF69B4" />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// 主角色组件
function AvatarCharacter() {
  const groupRef = useRef()
  const { currentPose, showSuccessAnimation, gameState, isActionCorrect } = useGameStore()
  
  // 从姿态数据提取关节位置
  const jointData = useMemo(() => {
    if (!currentPose || currentPose.length === 0) {
      return {
        leftShoulder: null,
        rightShoulder: null,
        leftElbow: null,
        rightElbow: null,
        leftWrist: null,
        rightWrist: null,
        leftHip: null,
        rightHip: null,
        leftKnee: null,
        rightKnee: null,
        leftAnkle: null,
        rightAnkle: null,
        nose: null
      }
    }
    
    return {
      nose: currentPose[0],
      leftShoulder: currentPose[11],
      rightShoulder: currentPose[12],
      leftElbow: currentPose[13],
      rightElbow: currentPose[14],
      leftWrist: currentPose[15],
      rightWrist: currentPose[16],
      leftHip: currentPose[23],
      rightHip: currentPose[24],
      leftKnee: currentPose[25],
      rightKnee: currentPose[26],
      leftAnkle: currentPose[27],
      rightAnkle: currentPose[28]
    }
  }, [currentPose])
  
  // 计算各关节角度
  const angles = useMemo(() => {
    const leftElbowAngle = calculateAngle(
      jointData.leftShoulder,
      jointData.leftElbow,
      jointData.leftWrist
    )
    
    const rightElbowAngle = calculateAngle(
      jointData.rightShoulder,
      jointData.rightElbow,
      jointData.rightWrist
    )
    
    const leftKneeAngle = calculateAngle(
      jointData.leftHip,
      jointData.leftKnee,
      jointData.leftAnkle
    )
    
    const rightKneeAngle = calculateAngle(
      jointData.rightHip,
      jointData.rightKnee,
      jointData.rightAnkle
    )
    
    // 身体倾斜角度
    let bodyTilt = 0
    if (jointData.leftShoulder && jointData.rightShoulder) {
      bodyTilt = (jointData.leftShoulder.x - jointData.rightShoulder.x) * 2
    }
    
    return {
      leftElbow: Math.PI - leftElbowAngle,
      rightElbow: Math.PI - rightElbowAngle,
      leftKnee: Math.PI - leftKneeAngle,
      rightKnee: Math.PI - rightKneeAngle,
      bodyTilt
    }
  }, [jointData])
  
  // 动画效果
  useFrame((state) => {
    if (groupRef.current) {
      // 轻微的浮动效果
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.05
      
      // 根据身体倾斜
      groupRef.current.rotation.z = angles.bodyTilt * 0.3
      
      // 成功时的庆祝动画
      if (showSuccessAnimation) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 5) * 0.2
        groupRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 8) * 0.05)
      } else {
        groupRef.current.rotation.y = 0
        groupRef.current.scale.setScalar(1)
      }
    }
  })
  
  const isHappy = showSuccessAnimation || isActionCorrect
  const showMagic = showSuccessAnimation
  
  return (
    <group ref={groupRef} position={[3, 0, 0]} scale={2}>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
        {/* 头部 */}
        <CartoonHead 
          position={[0, 0.7, 0]} 
          rotation={[0, 0, 0]}
          isHappy={isHappy}
        />
        
        {/* 身体 */}
        <CartoonBody 
          position={[0, 0.2, 0]}
          rotation={[0, 0, 0]}
        />
        
        {/* 左臂 */}
        <CartoonArm 
          isLeft={true}
          shoulderPos={jointData.leftShoulder}
          elbowAngle={angles.leftElbow}
          wristPos={jointData.leftWrist}
          showMagic={showMagic}
        />
        
        {/* 右臂 */}
        <CartoonArm 
          isLeft={false}
          shoulderPos={jointData.rightShoulder}
          elbowAngle={angles.rightElbow}
          wristPos={jointData.rightWrist}
          showMagic={showMagic}
        />
        
        {/* 左腿 */}
        <CartoonLeg 
          isLeft={true}
          hipPos={jointData.leftHip}
          kneeAngle={angles.leftKnee}
          anklePos={jointData.leftAnkle}
        />
        
        {/* 右腿 */}
        <CartoonLeg 
          isLeft={false}
          hipPos={jointData.rightHip}
          kneeAngle={angles.rightKnee}
          anklePos={jointData.rightAnkle}
        />
        
        {/* 成功时的魔法光环 */}
        {showMagic && (
          <group position={[0, 0.3, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.8, 0.02, 8, 64]} />
              <meshStandardMaterial 
                color="#FFD700" 
                emissive="#FFD700" 
                emissiveIntensity={1}
                transparent
                opacity={0.6}
              />
            </mesh>
            <Sparkles count={50} scale={2} size={4} speed={1} color="#FFD700" />
          </group>
        )}
        
        {/* 角色底部阴影 */}
        <mesh position={[0, -0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.4, 32]} />
          <meshStandardMaterial 
            color="#000000" 
            transparent 
            opacity={0.2}
          />
        </mesh>
      </Float>
    </group>
  )
}

export default AvatarCharacter
