import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'

// 改进的角度计算 - 更准确
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

// 计算3D旋转角度（考虑Z轴）
const calculate3DAngle = (p1, p2, p3) => {
  if (!p1 || !p2 || !p3) return { x: 0, y: 0, z: 0 }
  
  // 计算方向向量
  const v1 = new THREE.Vector3(p1.x - p2.x, p1.y - p2.y, (p1.z || 0) - (p2.z || 0))
  const v2 = new THREE.Vector3(p3.x - p2.x, p3.y - p2.y, (p3.z || 0) - (p2.z || 0))
  
  v1.normalize()
  v2.normalize()
  
  // 计算角度
  const angle = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))))
  
  // 计算旋转轴
  const axis = new THREE.Vector3().crossVectors(v1, v2).normalize()
  
  return {
    x: axis.x * angle,
    y: axis.y * angle,
    z: axis.z * angle
  }
}

// 可爱的头部
function CuteHead({ isHappy }) {
  const headRef = useRef()
  const eyeRef = useRef()
  
  useFrame((state) => {
    if (headRef.current) {
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.01
      headRef.current.scale.setScalar(breathe)
    }
    if (eyeRef.current && isHappy) {
      // 开心时眼睛稍微眯起来
      eyeRef.current.scale.y = 0.7
    } else if (eyeRef.current) {
      eyeRef.current.scale.y = 1
    }
  })
  
  return (
    <group position={[0, 0.9, 0]}>
      <group ref={headRef}>
        {/* 头部主体 - 更圆润 */}
        <mesh>
          <sphereGeometry args={[0.32, 32, 32]} />
          <meshStandardMaterial 
            color="#FFE4C4" 
            roughness={0.5}
            metalness={0.05}
          />
        </mesh>
        
        {/* 大眼睛 */}
        <group position={[0, 0.05, 0.25]} ref={eyeRef}>
          {/* 左眼 */}
          <group position={[-0.1, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[0, 0, 0.04]}>
              <sphereGeometry args={[0.045, 16, 16]} />
              <meshStandardMaterial color="#4169E1" />
            </mesh>
            <mesh position={[0, 0, 0.055]}>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshStandardMaterial color="#1a1a2e" />
            </mesh>
            <mesh position={[0.015, 0.015, 0.07]}>
              <sphereGeometry args={[0.01, 8, 8]} />
              <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1} />
            </mesh>
          </group>
          
          {/* 右眼 */}
          <group position={[0.1, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[0, 0, 0.04]}>
              <sphereGeometry args={[0.045, 16, 16]} />
              <meshStandardMaterial color="#4169E1" />
            </mesh>
            <mesh position={[0, 0, 0.055]}>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshStandardMaterial color="#1a1a2e" />
            </mesh>
            <mesh position={[0.015, 0.015, 0.07]}>
              <sphereGeometry args={[0.01, 8, 8]} />
              <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1} />
            </mesh>
          </group>
        </group>
        
        {/* 眉毛 */}
        <mesh position={[-0.1, 0.15, 0.23]} rotation={[0, 0, 0.1]}>
          <capsuleGeometry args={[0.01, 0.05, 4, 8]} />
          <meshStandardMaterial color="#E8D5B5" />
        </mesh>
        <mesh position={[0.1, 0.15, 0.23]} rotation={[0, 0, -0.1]}>
          <capsuleGeometry args={[0.01, 0.05, 4, 8]} />
          <meshStandardMaterial color="#E8D5B5" />
        </mesh>
        
        {/* 鼻子 */}
        <mesh position={[0, -0.02, 0.28]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#FFE4E1" />
        </mesh>
        
        {/* 嘴巴 */}
        {isHappy ? (
          <mesh position={[0, -0.12, 0.26]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.05, 0.015, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#E8A0A0" />
          </mesh>
        ) : (
          <mesh position={[0, -0.1, 0.27]}>
            <capsuleGeometry args={[0.01, 0.035, 4, 8]} />
            <meshStandardMaterial color="#E8A0A0" />
          </mesh>
        )}
        
        {/* 腮红 */}
        <mesh position={[-0.18, -0.05, 0.22]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#FFB6C1" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0.18, -0.05, 0.22]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#FFB6C1" transparent opacity={0.5} />
        </mesh>
        
        {/* 可爱的双马尾 */}
        <group>
          {/* 左侧马尾 */}
          <mesh position={[-0.25, 0.1, -0.05]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
          <mesh position={[-0.3, -0.05, -0.08]}>
            <capsuleGeometry args={[0.08, 0.2, 8, 16]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
          <mesh position={[-0.32, -0.25, -0.1]}>
            <capsuleGeometry args={[0.07, 0.18, 8, 16]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
          
          {/* 右侧马尾 */}
          <mesh position={[0.25, 0.1, -0.05]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
          <mesh position={[0.3, -0.05, -0.08]}>
            <capsuleGeometry args={[0.08, 0.2, 8, 16]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
          <mesh position={[0.32, -0.25, -0.1]}>
            <capsuleGeometry args={[0.07, 0.18, 8, 16]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
          
          {/* 头顶 */}
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
        </group>
        
        {/* 蝴蝶结 */}
        <group position={[0, 0.35, 0.1]}>
          <mesh position={[-0.1, 0, 0]} rotation={[0, 0, 0.3]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#FF69B4" />
          </mesh>
          <mesh position={[0.1, 0, 0]} rotation={[0, 0, -0.3]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#FF69B4" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial color="#FF1493" />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// 可爱的身体
function CuteBody() {
  return (
    <group position={[0, 0.3, 0]}>
      {/* 上身 - 粉色上衣 */}
      <mesh position={[0, 0.15, 0]}>
        <capsuleGeometry args={[0.16, 0.28, 8, 16]} />
        <meshStandardMaterial 
          color="#FFB6C1"
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      
      {/* 裙子 */}
      <mesh position={[0, -0.3, 0]}>
        <coneGeometry args={[0.4, 0.6, 16]} />
        <meshStandardMaterial 
          color="#DDA0DD"
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      
      {/* 裙子装饰 */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <mesh 
          key={i}
          position={[
            Math.sin((i / 7) * Math.PI * 2) * 0.3,
            -0.5,
            Math.cos((i / 7) * Math.PI * 2) * 0.3
          ]}
        >
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial 
            color="#FF69B4"
            emissive="#FF69B4"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}

// 改进的手臂 - 更准确的姿态映射
function CuteArm({ isLeft, shoulderPos, elbowPos, wristPos, showMagic }) {
  const armGroupRef = useRef()
  const magicRef = useRef()
  
  // 计算肩膀到手腕的方向（3D）
  const armRotation = useMemo(() => {
    const isValid = (pos) => pos && pos.visibility !== undefined && pos.visibility > 0.3
    
    if (!isValid(shoulderPos) || !isValid(wristPos)) {
      return { x: 0, y: 0, z: isLeft ? 0.3 : -0.3 }
    }
    
    // MediaPipe坐标：x[0,1], y[0,1], z相对深度
    // 转换为3D空间的角度
    const dx = wristPos.x - shoulderPos.x
    const dy = wristPos.y - shoulderPos.y
    const dz = (wristPos.z || 0) - (shoulderPos.z || 0)
    
    // 计算水平旋转（左右）
    const horizontalAngle = Math.atan2(dx, -dy)
    
    // 计算垂直角度（上下）
    const verticalAngle = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy))
    
    return {
      x: verticalAngle * 0.5, // 前后摆动
      y: 0,
      z: isLeft ? horizontalAngle + Math.PI/2 : horizontalAngle - Math.PI/2
    }
  }, [shoulderPos, wristPos, isLeft])
  
  // 计算肘部角度
  const elbowAngle = useMemo(() => {
    const isValid = (pos) => pos && pos.visibility !== undefined && pos.visibility > 0.3
    
    if (!isValid(shoulderPos) || !isValid(elbowPos) || !isValid(wristPos)) {
      return Math.PI * 0.7
    }
    
    return calculateAngle(shoulderPos, elbowPos, wristPos)
  }, [shoulderPos, elbowPos, wristPos])
  
  useFrame((state) => {
    if (magicRef.current && showMagic) {
      magicRef.current.rotation.z = state.clock.elapsedTime * 5
      magicRef.current.rotation.y = state.clock.elapsedTime * 3
    }
  })
  
  const xOffset = isLeft ? -0.28 : 0.28
  
  return (
    <group position={[xOffset, 0.4, 0]} ref={armGroupRef}>
      <group rotation={[armRotation.x, armRotation.y, armRotation.z]}>
        {/* 上臂 */}
        <mesh position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.05, 0.18, 8, 16]} />
          <meshStandardMaterial color="#FFE4C4" />
        </mesh>
        
        {/* 肘部 */}
        <group position={[0, -0.24, 0]} rotation={[0, 0, (Math.PI - elbowAngle) * (isLeft ? 1 : -1)]}>
          <mesh>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial color="#FFE4C4" />
          </mesh>
          
          {/* 前臂 */}
          <mesh position={[0, -0.12, 0]}>
            <capsuleGeometry args={[0.045, 0.15, 8, 16]} />
            <meshStandardMaterial color="#FFE4C4" />
          </mesh>
          
          {/* 手 */}
          <group position={[0, -0.22, 0]}>
            <mesh>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial 
                color={showMagic ? "#FFD700" : "#FFE4C4"}
                emissive={showMagic ? "#FFD700" : "#000000"}
                emissiveIntensity={showMagic ? 0.8 : 0}
              />
            </mesh>
            
            {/* 魔法效果 */}
            {showMagic && (
              <group ref={magicRef}>
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
                <Sparkles count={20} scale={0.4} size={4} speed={1.5} color="#FFD700" />
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  )
}

// 改进的腿部
function CuteLeg({ isLeft, hipPos, kneePos, anklePos }) {
  const legRotation = useMemo(() => {
    const isValid = (pos) => pos && pos.visibility !== undefined && pos.visibility > 0.3
    
    if (!isValid(hipPos) || !isValid(anklePos)) return 0
    
    const dx = anklePos.x - hipPos.x
    const dy = anklePos.y - hipPos.y
    
    // 更准确的腿部角度计算
    return Math.atan2(dx, -dy) * 0.4
  }, [hipPos, anklePos])
  
  const xOffset = isLeft ? -0.12 : 0.12
  
  return (
    <group position={[xOffset, -0.65, 0]}>
      <group rotation={[0, 0, legRotation]}>
        {/* 大腿 */}
        <mesh position={[0, -0.1, 0]}>
          <capsuleGeometry args={[0.06, 0.16, 8, 16]} />
          <meshStandardMaterial color="#FFE4C4" />
        </mesh>
        
        {/* 膝盖 */}
        <group position={[0, -0.24, 0]} rotation={[0, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshStandardMaterial color="#FFE4C4" />
          </mesh>
          
          {/* 小腿 */}
          <mesh position={[0, -0.12, 0]}>
            <capsuleGeometry args={[0.05, 0.16, 8, 16]} />
            <meshStandardMaterial color="#FFE4C4" />
          </mesh>
          
          {/* 脚/鞋子 */}
          <mesh position={[0, -0.24, 0.03]}>
            <boxGeometry args={[0.08, 0.05, 0.12]} />
            <meshStandardMaterial color="#FF69B4" />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// 主角色组件
function CuteCharacter() {
  const groupRef = useRef()
  const { currentPose, showSuccessAnimation, isActionCorrect, poseDetected } = useGameStore()
  
  // 从姿态数据提取关节位置 - 改进的映射
  const jointData = useMemo(() => {
    if (!currentPose || !Array.isArray(currentPose) || currentPose.length < 29) {
      return {
        leftShoulder: null, rightShoulder: null,
        leftElbow: null, rightElbow: null,
        leftWrist: null, rightWrist: null,
        leftHip: null, rightHip: null,
        leftKnee: null, rightKnee: null,
        leftAnkle: null, rightAnkle: null,
      }
    }
    
    return {
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
  }, [currentPose, poseDetected])
  
  // 计算身体倾斜
  const bodyTilt = useMemo(() => {
    const isValid = (joint) => joint && joint.visibility !== undefined && joint.visibility > 0.3
    
    if (isValid(jointData.leftShoulder) && isValid(jointData.rightShoulder)) {
      return (jointData.leftShoulder.x - jointData.rightShoulder.x) * 2
    }
    return 0
  }, [jointData])
  
  // 动画
  useFrame((state) => {
    if (groupRef.current) {
      // 轻微的浮动
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.02
      groupRef.current.rotation.z = bodyTilt * 0.3
      
      if (showSuccessAnimation) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 3) * 0.1
        const celebrateScale = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.02
        groupRef.current.scale.setScalar(celebrateScale * 2.5)
      } else {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.03
        groupRef.current.scale.setScalar(2.5)
      }
    }
  })
  
  const isHappy = showSuccessAnimation || isActionCorrect
  const showMagic = showSuccessAnimation
  
  return (
    <group ref={groupRef} position={[-6.5, 0, 0]}>
      <Float speed={1.5} rotationIntensity={0.03} floatIntensity={0.15}>
        {/* 头部 */}
        <CuteHead isHappy={isHappy} />
        
        {/* 身体 */}
        <CuteBody />
        
        {/* 左臂 */}
        <CuteArm 
          isLeft={true}
          shoulderPos={jointData.leftShoulder}
          elbowPos={jointData.leftElbow}
          wristPos={jointData.leftWrist}
          showMagic={showMagic}
        />
        
        {/* 右臂 */}
        <CuteArm 
          isLeft={false}
          shoulderPos={jointData.rightShoulder}
          elbowPos={jointData.rightElbow}
          wristPos={jointData.rightWrist}
          showMagic={showMagic}
        />
        
        {/* 左腿 */}
        <CuteLeg 
          isLeft={true}
          hipPos={jointData.leftHip}
          kneePos={jointData.leftKnee}
          anklePos={jointData.leftAnkle}
        />
        
        {/* 右腿 */}
        <CuteLeg 
          isLeft={false}
          hipPos={jointData.rightHip}
          kneePos={jointData.rightKnee}
          anklePos={jointData.rightAnkle}
        />
        
        {/* 角色底部阴影 */}
        <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.45, 32]} />
          <meshStandardMaterial color="#FFB6C1" transparent opacity={0.2} />
        </mesh>
      </Float>
      
      {/* 常驻的星星效果 */}
      <Sparkles 
        count={25}
        scale={[2, 2.5, 2]}
        size={2}
        speed={0.3}
        color="#FFD700"
        opacity={0.4}
      />
    </group>
  )
}

export default CuteCharacter
