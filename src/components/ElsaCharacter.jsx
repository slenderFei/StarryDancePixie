import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Sparkles, Trail } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'

// 角度计算工具
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

// 艾莎的头部 - 精致的公主脸庞
function ElsaHead({ isHappy }) {
  const headRef = useRef()
  const hairRef = useRef()
  
  useFrame((state) => {
    if (headRef.current) {
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.015
      headRef.current.scale.setScalar(breathe)
    }
    if (hairRef.current) {
      // 头发轻微飘动
      hairRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5) * 0.05
    }
  })
  
  return (
    <group position={[0, 0.85, 0]}>
      <group ref={headRef}>
        {/* 脸部 - 优雅的椭圆形 */}
        <mesh>
          <sphereGeometry args={[0.28, 32, 32]} />
          <meshStandardMaterial 
            color="#FFF5EE" 
            roughness={0.4}
            metalness={0.05}
          />
        </mesh>
        
        {/* 蓝色大眼睛 */}
        <group position={[0, 0.03, 0.22]}>
          {/* 左眼 */}
          <group position={[-0.09, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.055, 16, 16]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <sphereGeometry args={[0.035, 16, 16]} />
              <meshStandardMaterial color="#4169E1" /> {/* 皇家蓝 */}
            </mesh>
            <mesh position={[0, 0, 0.045]}>
              <sphereGeometry args={[0.018, 16, 16]} />
              <meshStandardMaterial color="#1a1a2e" />
            </mesh>
            <mesh position={[0.01, 0.01, 0.055]}>
              <sphereGeometry args={[0.008, 8, 8]} />
              <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.8} />
            </mesh>
            {/* 睫毛 */}
            <mesh position={[0, 0.05, 0.02]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.08, 0.01, 0.01]} />
              <meshStandardMaterial color="#2a2a3a" />
            </mesh>
          </group>
          
          {/* 右眼 */}
          <group position={[0.09, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.055, 16, 16]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <sphereGeometry args={[0.035, 16, 16]} />
              <meshStandardMaterial color="#4169E1" />
            </mesh>
            <mesh position={[0, 0, 0.045]}>
              <sphereGeometry args={[0.018, 16, 16]} />
              <meshStandardMaterial color="#1a1a2e" />
            </mesh>
            <mesh position={[0.01, 0.01, 0.055]}>
              <sphereGeometry args={[0.008, 8, 8]} />
              <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.8} />
            </mesh>
            <mesh position={[0, 0.05, 0.02]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.08, 0.01, 0.01]} />
              <meshStandardMaterial color="#2a2a3a" />
            </mesh>
          </group>
        </group>
        
        {/* 眉毛 */}
        <mesh position={[-0.09, 0.12, 0.23]} rotation={[0, 0, 0.1]}>
          <capsuleGeometry args={[0.008, 0.04, 4, 8]} />
          <meshStandardMaterial color="#E8D5B5" />
        </mesh>
        <mesh position={[0.09, 0.12, 0.23]} rotation={[0, 0, -0.1]}>
          <capsuleGeometry args={[0.008, 0.04, 4, 8]} />
          <meshStandardMaterial color="#E8D5B5" />
        </mesh>
        
        {/* 鼻子 */}
        <mesh position={[0, -0.02, 0.26]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#FFE4E1" />
        </mesh>
        
        {/* 嘴巴 */}
        {isHappy ? (
          <mesh position={[0, -0.1, 0.24]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.04, 0.012, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#E8A0A0" />
          </mesh>
        ) : (
          <mesh position={[0, -0.09, 0.25]}>
            <capsuleGeometry args={[0.008, 0.03, 4, 8]} />
            <meshStandardMaterial color="#E8A0A0" />
          </mesh>
        )}
        
        {/* 腮红 */}
        <mesh position={[-0.15, -0.03, 0.2]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#FFB6C1" transparent opacity={0.4} />
        </mesh>
        <mesh position={[0.15, -0.03, 0.2]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#FFB6C1" transparent opacity={0.4} />
        </mesh>
      </group>
      
      {/* 艾莎的铂金色头发 */}
      <group ref={hairRef}>
        {/* 头顶头发 */}
        <mesh position={[0, 0.15, -0.05]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial 
            color="#F5F5DC" 
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
        
        {/* 刘海 */}
        <mesh position={[0, 0.18, 0.18]} rotation={[0.3, 0, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#FFF8DC" />
        </mesh>
        
        {/* 侧边头发 */}
        <mesh position={[-0.25, 0, -0.05]}>
          <capsuleGeometry args={[0.08, 0.3, 8, 16]} />
          <meshStandardMaterial color="#F5F5DC" />
        </mesh>
        <mesh position={[0.25, 0, -0.05]}>
          <capsuleGeometry args={[0.08, 0.3, 8, 16]} />
          <meshStandardMaterial color="#F5F5DC" />
        </mesh>
        
        {/* 长辫子 - 从后面垂下 */}
        <group position={[0.15, -0.2, -0.2]}>
          <mesh position={[0, 0, 0]}>
            <capsuleGeometry args={[0.06, 0.15, 8, 16]} />
            <meshStandardMaterial color="#F5F5DC" />
          </mesh>
          <mesh position={[0.02, -0.2, 0.02]}>
            <capsuleGeometry args={[0.055, 0.15, 8, 16]} />
            <meshStandardMaterial color="#FFF8DC" />
          </mesh>
          <mesh position={[0.03, -0.4, 0.04]}>
            <capsuleGeometry args={[0.05, 0.15, 8, 16]} />
            <meshStandardMaterial color="#F5F5DC" />
          </mesh>
          <mesh position={[0.02, -0.6, 0.03]}>
            <capsuleGeometry args={[0.045, 0.12, 8, 16]} />
            <meshStandardMaterial color="#FFF8DC" />
          </mesh>
          {/* 辫子末端装饰 */}
          <mesh position={[0.02, -0.75, 0.03]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial 
              color="#87CEEB" 
              emissive="#87CEEB"
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
        
        {/* 头发上的雪花装饰 */}
        <mesh position={[-0.15, 0.25, 0.1]}>
          <octahedronGeometry args={[0.03, 0]} />
          <meshStandardMaterial 
            color="#E0FFFF" 
            emissive="#87CEEB"
            emissiveIntensity={0.5}
          />
        </mesh>
        <mesh position={[0.18, 0.22, 0.08]}>
          <octahedronGeometry args={[0.025, 0]} />
          <meshStandardMaterial 
            color="#E0FFFF" 
            emissive="#87CEEB"
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>
      
      {/* 冰雪皇冠 */}
      <group position={[0, 0.35, 0.05]}>
        <mesh>
          <cylinderGeometry args={[0.12, 0.15, 0.03, 6]} />
          <meshStandardMaterial 
            color="#B0E0E6" 
            metalness={0.8}
            roughness={0.2}
            emissive="#87CEEB"
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* 皇冠尖端 */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh 
            key={i} 
            position={[
              Math.sin((i / 5) * Math.PI * 2) * 0.1,
              0.06,
              Math.cos((i / 5) * Math.PI * 2) * 0.1
            ]}
          >
            <coneGeometry args={[0.02, 0.08, 4]} />
            <meshStandardMaterial 
              color="#E0FFFF" 
              emissive="#00CED1"
              emissiveIntensity={0.5}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// 艾莎的冰雪礼服身体
function ElsaBody() {
  return (
    <group position={[0, 0.25, 0]}>
      {/* 上身 - 冰蓝色紧身衣 */}
      <mesh position={[0, 0.1, 0]}>
        <capsuleGeometry args={[0.15, 0.25, 8, 16]} />
        <meshStandardMaterial 
          color="#4169E1"
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      {/* 肩部装饰 */}
      <mesh position={[-0.18, 0.2, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial 
          color="#87CEEB"
          transparent
          opacity={0.8}
          metalness={0.5}
        />
      </mesh>
      <mesh position={[0.18, 0.2, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial 
          color="#87CEEB"
          transparent
          opacity={0.8}
          metalness={0.5}
        />
      </mesh>
      
      {/* 腰部 */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.1, 16]} />
        <meshStandardMaterial 
          color="#4169E1"
          metalness={0.4}
        />
      </mesh>
      
      {/* 冰雪长裙 */}
      <mesh position={[0, -0.35, 0]}>
        <coneGeometry args={[0.35, 0.5, 16]} />
        <meshStandardMaterial 
          color="#87CEEB"
          transparent
          opacity={0.9}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      
      {/* 裙子上的冰晶装饰 */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh 
          key={i}
          position={[
            Math.sin((i / 6) * Math.PI * 2) * 0.25,
            -0.4,
            Math.cos((i / 6) * Math.PI * 2) * 0.25
          ]}
        >
          <octahedronGeometry args={[0.03, 0]} />
          <meshStandardMaterial 
            color="#E0FFFF"
            emissive="#00CED1"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
      
      {/* 披风效果 */}
      <mesh position={[0, 0, -0.15]} rotation={[0.2, 0, 0]}>
        <planeGeometry args={[0.5, 0.8]} />
        <meshStandardMaterial 
          color="#B0E0E6"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          metalness={0.3}
        />
      </mesh>
    </group>
  )
}

// 艾莎的手臂 - 优雅的冰雪魔法手臂
function ElsaArm({ isLeft, shoulderPos, elbowAngle, wristPos, showMagic }) {
  const armRef = useRef()
  const magicRef = useRef()
  
  const shoulderRotation = useMemo(() => {
    // 检查数据有效性
    const isValid = (pos) => pos && pos.visibility !== undefined && pos.visibility > 0.3
    
    if (!isValid(shoulderPos) || !isValid(wristPos)) {
      return { x: 0, y: 0, z: isLeft ? 0.3 : -0.3 }
    }
    
    const dx = wristPos.x - shoulderPos.x
    const dy = wristPos.y - shoulderPos.y
    const angle = Math.atan2(dx, -dy)
    return { x: 0, y: 0, z: isLeft ? angle + Math.PI/2 : angle - Math.PI/2 }
  }, [shoulderPos, wristPos, isLeft])
  
  useFrame((state) => {
    if (magicRef.current && showMagic) {
      magicRef.current.rotation.z = state.clock.elapsedTime * 5
      magicRef.current.rotation.y = state.clock.elapsedTime * 3
    }
  })
  
  const xOffset = isLeft ? -0.25 : 0.25
  
  return (
    <group position={[xOffset, 0.35, 0]}>
      <group rotation={[shoulderRotation.x, shoulderRotation.y, shoulderRotation.z]}>
        {/* 上臂 */}
        <mesh position={[0, -0.1, 0]}>
          <capsuleGeometry args={[0.04, 0.12, 8, 16]} />
          <meshStandardMaterial color="#FFF5EE" />
        </mesh>
        
        {/* 手套（冰蓝色） */}
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.045, 0.042, 0.08, 8]} />
          <meshStandardMaterial 
            color="#87CEEB"
            transparent
            opacity={0.7}
          />
        </mesh>
        
        {/* 肘部 */}
        <group position={[0, -0.2, 0]} rotation={[0, 0, elbowAngle * (isLeft ? 1 : -1)]}>
          <mesh>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial color="#FFF5EE" />
          </mesh>
          
          {/* 前臂 */}
          <mesh position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.035, 0.12, 8, 16]} />
            <meshStandardMaterial color="#FFF5EE" />
          </mesh>
          
          {/* 手 */}
          <group position={[0, -0.2, 0]}>
            <mesh>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshStandardMaterial 
                color={showMagic ? "#00CED1" : "#FFF5EE"}
                emissive={showMagic ? "#00CED1" : "#000000"}
                emissiveIntensity={showMagic ? 0.8 : 0}
              />
            </mesh>
            
            {/* 冰雪魔法效果 */}
            {showMagic && (
              <group ref={magicRef}>
                <mesh>
                  <torusGeometry args={[0.08, 0.008, 8, 32]} />
                  <meshStandardMaterial 
                    color="#00CED1" 
                    emissive="#00CED1" 
                    emissiveIntensity={1}
                    transparent
                    opacity={0.8}
                  />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.06, 0.006, 8, 32]} />
                  <meshStandardMaterial 
                    color="#87CEEB" 
                    emissive="#87CEEB" 
                    emissiveIntensity={1}
                    transparent
                    opacity={0.8}
                  />
                </mesh>
                {/* 冰晶粒子 */}
                <Sparkles count={15} scale={0.3} size={3} speed={1} color="#00CED1" />
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  )
}

// 艾莎的腿
function ElsaLeg({ isLeft, hipPos, kneeAngle, anklePos }) {
  const legRotation = useMemo(() => {
    const isValid = (pos) => pos && pos.visibility !== undefined && pos.visibility > 0.3
    
    if (!isValid(hipPos) || !isValid(anklePos)) return 0
    
    const dx = anklePos.x - hipPos.x
    const dy = anklePos.y - hipPos.y
    return Math.atan2(dx, -dy) * 0.3
  }, [hipPos, anklePos])
  
  const xOffset = isLeft ? -0.1 : 0.1
  
  return (
    <group position={[xOffset, -0.6, 0]}>
      <group rotation={[0, 0, legRotation]}>
        {/* 裙子下的腿（大部分被裙子遮住） */}
        <mesh position={[0, -0.08, 0]}>
          <capsuleGeometry args={[0.04, 0.1, 8, 16]} />
          <meshStandardMaterial color="#FFF5EE" />
        </mesh>
        
        {/* 冰晶高跟鞋 */}
        <mesh position={[0, -0.18, 0.02]}>
          <boxGeometry args={[0.05, 0.04, 0.1]} />
          <meshStandardMaterial 
            color="#87CEEB"
            transparent
            opacity={0.8}
            metalness={0.6}
            roughness={0.2}
          />
        </mesh>
        {/* 高跟 */}
        <mesh position={[0, -0.22, -0.03]}>
          <cylinderGeometry args={[0.01, 0.015, 0.05, 8]} />
          <meshStandardMaterial 
            color="#B0E0E6"
            metalness={0.8}
          />
        </mesh>
      </group>
    </group>
  )
}

// 冰雪光环效果
function IceAura({ active }) {
  const auraRef = useRef()
  
  useFrame((state) => {
    if (auraRef.current) {
      auraRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })
  
  if (!active) return null
  
  return (
    <group ref={auraRef} position={[0, 0, 0]}>
      {/* 底部冰环 */}
      <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.02, 8, 64]} />
        <meshStandardMaterial 
          color="#00CED1"
          emissive="#00CED1"
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* 飘落的雪花 */}
      <Sparkles 
        count={60}
        scale={[1.5, 2, 1.5]}
        size={4}
        speed={0.5}
        color="#E0FFFF"
        opacity={0.8}
      />
      
      {/* 冰晶光柱 */}
      {[0, 1, 2, 3].map((i) => (
        <mesh 
          key={i}
          position={[
            Math.sin((i / 4) * Math.PI * 2) * 0.5,
            0,
            Math.cos((i / 4) * Math.PI * 2) * 0.5
          ]}
          rotation={[0, 0, 0]}
        >
          <cylinderGeometry args={[0.02, 0.01, 1.5, 6]} />
          <meshStandardMaterial 
            color="#87CEEB"
            emissive="#00CED1"
            emissiveIntensity={0.5}
            transparent
            opacity={0.4}
          />
        </mesh>
      ))}
    </group>
  )
}

// 主角色组件 - 艾莎公主
function ElsaCharacter() {
  const groupRef = useRef()
  const { currentPose, showSuccessAnimation, isActionCorrect, poseDetected } = useGameStore()
  const debugRef = useRef({ lastUpdate: 0, updateCount: 0 })
  
  // 从姿态数据提取关节位置
  const jointData = useMemo(() => {
    // 检查姿态数据是否有效
    if (!currentPose || !Array.isArray(currentPose) || currentPose.length < 29) {
      // 返回默认姿态（站立姿势）
      return {
        leftShoulder: { x: 0.4, y: 0.5, z: 0, visibility: 0 },
        rightShoulder: { x: 0.6, y: 0.5, z: 0, visibility: 0 },
        leftElbow: { x: 0.35, y: 0.65, z: 0, visibility: 0 },
        rightElbow: { x: 0.65, y: 0.65, z: 0, visibility: 0 },
        leftWrist: { x: 0.3, y: 0.8, z: 0, visibility: 0 },
        rightWrist: { x: 0.7, y: 0.8, z: 0, visibility: 0 },
        leftHip: { x: 0.45, y: 0.7, z: 0, visibility: 0 },
        rightHip: { x: 0.55, y: 0.7, z: 0, visibility: 0 },
        leftKnee: { x: 0.45, y: 0.85, z: 0, visibility: 0 },
        rightKnee: { x: 0.55, y: 0.85, z: 0, visibility: 0 },
        leftAnkle: { x: 0.45, y: 0.95, z: 0, visibility: 0 },
        rightAnkle: { x: 0.55, y: 0.95, z: 0, visibility: 0 },
      }
    }
    
    // 提取有效的关节数据
    const joints = {
      leftShoulder: currentPose[11] || null,
      rightShoulder: currentPose[12] || null,
      leftElbow: currentPose[13] || null,
      rightElbow: currentPose[14] || null,
      leftWrist: currentPose[15] || null,
      rightWrist: currentPose[16] || null,
      leftHip: currentPose[23] || null,
      rightHip: currentPose[24] || null,
      leftKnee: currentPose[25] || null,
      rightKnee: currentPose[26] || null,
      leftAnkle: currentPose[27] || null,
      rightAnkle: currentPose[28] || null
    }
    
    // 调试信息（每60次更新打印一次）
    debugRef.current.updateCount++
    if (debugRef.current.updateCount % 60 === 0) {
      const now = Date.now()
      if (now - debugRef.current.lastUpdate > 1000) {
        console.log('🎭 艾莎角色更新姿态数据:', {
          poseDetected,
          hasPose: !!currentPose,
          poseLength: currentPose?.length,
          leftWrist: joints.leftWrist ? {
            x: joints.leftWrist.x.toFixed(3),
            y: joints.leftWrist.y.toFixed(3),
            visibility: joints.leftWrist.visibility.toFixed(3)
          } : 'null',
          rightWrist: joints.rightWrist ? {
            x: joints.rightWrist.x.toFixed(3),
            y: joints.rightWrist.y.toFixed(3),
            visibility: joints.rightWrist.visibility.toFixed(3)
          } : 'null'
        })
        debugRef.current.lastUpdate = now
      }
    }
    
    return joints
  }, [currentPose, poseDetected])
  
  // 计算关节角度
  const angles = useMemo(() => {
    // 检查关节数据是否有效（visibility > 0.3）
    const isValid = (joint) => joint && joint.visibility !== undefined && joint.visibility > 0.3
    
    const leftElbowAngle = isValid(jointData.leftShoulder) && 
                          isValid(jointData.leftElbow) && 
                          isValid(jointData.leftWrist)
      ? calculateAngle(jointData.leftShoulder, jointData.leftElbow, jointData.leftWrist)
      : Math.PI * 0.7 // 默认角度
    
    const rightElbowAngle = isValid(jointData.rightShoulder) && 
                            isValid(jointData.rightElbow) && 
                            isValid(jointData.rightWrist)
      ? calculateAngle(jointData.rightShoulder, jointData.rightElbow, jointData.rightWrist)
      : Math.PI * 0.7
    
    const leftKneeAngle = isValid(jointData.leftHip) && 
                          isValid(jointData.leftKnee) && 
                          isValid(jointData.leftAnkle)
      ? calculateAngle(jointData.leftHip, jointData.leftKnee, jointData.leftAnkle)
      : Math.PI * 0.8
    
    const rightKneeAngle = isValid(jointData.rightHip) && 
                           isValid(jointData.rightKnee) && 
                           isValid(jointData.rightAnkle)
      ? calculateAngle(jointData.rightHip, jointData.rightKnee, jointData.rightAnkle)
      : Math.PI * 0.8
    
    let bodyTilt = 0
    if (isValid(jointData.leftShoulder) && isValid(jointData.rightShoulder)) {
      bodyTilt = (jointData.leftShoulder.x - jointData.rightShoulder.x) * 1.5
    }
    
    return {
      leftElbow: Math.PI - leftElbowAngle,
      rightElbow: Math.PI - rightElbowAngle,
      leftKnee: Math.PI - leftKneeAngle,
      rightKnee: Math.PI - rightKneeAngle,
      bodyTilt
    }
  }, [jointData])
  
  // 动画
  useFrame((state) => {
    if (groupRef.current) {
      // 优雅的浮动
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.03
      groupRef.current.rotation.z = angles.bodyTilt * 0.2
      
      if (showSuccessAnimation) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 3) * 0.15
        const celebrateScale = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.03
        groupRef.current.scale.setScalar(celebrateScale * 2.2)
      } else {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05
        groupRef.current.scale.setScalar(2.2)
      }
    }
  })
  
  const isHappy = showSuccessAnimation || isActionCorrect
  const showMagic = showSuccessAnimation
  
  return (
    <group ref={groupRef} position={[-6.5, 0, 0]}>
      <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.2}>
        {/* 艾莎头部 */}
        <ElsaHead isHappy={isHappy} />
        
        {/* 艾莎身体 */}
        <ElsaBody />
        
        {/* 左臂 */}
        <ElsaArm 
          isLeft={true}
          shoulderPos={jointData.leftShoulder}
          elbowAngle={angles.leftElbow}
          wristPos={jointData.leftWrist}
          showMagic={showMagic}
        />
        
        {/* 右臂 */}
        <ElsaArm 
          isLeft={false}
          shoulderPos={jointData.rightShoulder}
          elbowAngle={angles.rightElbow}
          wristPos={jointData.rightWrist}
          showMagic={showMagic}
        />
        
        {/* 左腿 */}
        <ElsaLeg 
          isLeft={true}
          hipPos={jointData.leftHip}
          kneeAngle={angles.leftKnee}
          anklePos={jointData.leftAnkle}
        />
        
        {/* 右腿 */}
        <ElsaLeg 
          isLeft={false}
          hipPos={jointData.rightHip}
          kneeAngle={angles.rightKnee}
          anklePos={jointData.rightAnkle}
        />
        
        {/* 冰雪光环 */}
        <IceAura active={showMagic} />
        
        {/* 角色底部阴影 */}
        <mesh position={[0, -0.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.4, 32]} />
          <meshStandardMaterial color="#4169E1" transparent opacity={0.2} />
        </mesh>
      </Float>
      
      {/* 常驻的雪花效果 */}
      <Sparkles 
        count={30}
        scale={[2, 2.5, 2]}
        size={2}
        speed={0.3}
        color="#B0E0E6"
        opacity={0.5}
      />
    </group>
  )
}

export default ElsaCharacter
