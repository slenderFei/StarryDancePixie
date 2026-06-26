import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Pose } from '@mediapipe/pose'
import { Hands } from '@mediapipe/hands'
import useGameStore from '../store/gameStore'
import { lmToCanvasMirroredDrawingPx } from '../utils/cameraLandmarks'

// MediaPipe Pose 关键点索引
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
}

const SKELETON_CONNECTIONS = [
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
]

const KEY_BODY_POINTS = [
  POSE_LANDMARKS.NOSE,
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.LEFT_ELBOW,
  POSE_LANDMARKS.RIGHT_ELBOW,
  POSE_LANDMARKS.LEFT_WRIST,
  POSE_LANDMARKS.RIGHT_WRIST,
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_KNEE,
  POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
]

const POSE_PUBLISH_INTERVAL_MS = 90
const HANDS_PUBLISH_INTERVAL_MS = 55
const HANDS_SEND_INTERVAL_MS = 55

function isArcadeMode(gameState, playMode) {
  return (
    gameState === 'arcade_playing' &&
    (playMode === 'balloon' || playMode === 'fruit' || playMode === 'rope')
  )
}

function drawSkeletonMini(ctx, landmarks, width, height) {
  ctx.lineWidth = 3
  ctx.lineCap = 'round'

  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#00CED1')
  gradient.addColorStop(0.5, '#87CEEB')
  gradient.addColorStop(1, '#B0E0E6')
  ctx.strokeStyle = gradient

  SKELETON_CONNECTIONS.forEach(([start, end]) => {
    const startPoint = landmarks[start]
    const endPoint = landmarks[end]

    if (startPoint && endPoint && startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
      ctx.beginPath()
      ctx.moveTo(startPoint.x * width, startPoint.y * height)
      ctx.lineTo(endPoint.x * width, endPoint.y * height)
      ctx.stroke()
    }
  })

  KEY_BODY_POINTS.forEach((index) => {
    const point = landmarks[index]
    if (point && point.visibility > 0.5) {
      ctx.beginPath()
      ctx.arc(point.x * width, point.y * height, 10, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0, 206, 209, 0.3)'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(point.x * width, point.y * height, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#00CED1'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(point.x * width, point.y * height, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
    }
  })

  const wrists = [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST]
  wrists.forEach((index) => {
    const point = landmarks[index]
    if (point && point.visibility > 0.5) {
      ctx.beginPath()
      ctx.arc(point.x * width, point.y * height, 15, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(0, 206, 209, 0.6)'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  })
}

/** 画布与全屏 video 一样 scaleX(-1)，内部用 cover 后的未镜像坐标 */
function drawSkeletonCoverOnMirroredCanvas(ctx, landmarks, vw, vh, iw, ih) {
  const m = Math.min(vw, vh)
  const lineW = Math.max(3, m * 0.007)
  const ringR = Math.max(7, m * 0.012)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const gradient = ctx.createLinearGradient(0, 0, vw, vh)
  gradient.addColorStop(0, '#00CED1')
  gradient.addColorStop(0.5, '#fde68a')
  gradient.addColorStop(1, '#f472b6')
  ctx.strokeStyle = gradient

  SKELETON_CONNECTIONS.forEach(([start, end]) => {
    const startPoint = landmarks[start]
    const endPoint = landmarks[end]
    if (!startPoint || !endPoint || startPoint.visibility < 0.5 || endPoint.visibility < 0.5)
      return
    const a = lmToCanvasMirroredDrawingPx(startPoint, vw, vh, iw, ih)
    const b = lmToCanvasMirroredDrawingPx(endPoint, vw, vh, iw, ih)
    ctx.lineWidth = lineW
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  })

  KEY_BODY_POINTS.forEach((index) => {
    const point = landmarks[index]
    if (!point || point.visibility < 0.5) return
    const { x, y } = lmToCanvasMirroredDrawingPx(point, vw, vh, iw, ih)

    ctx.beginPath()
    ctx.arc(x, y, ringR + 5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 206, 209, 0.22)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x, y, ringR, 0, Math.PI * 2)
    ctx.fillStyle = '#22d3ee'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x, y, ringR * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
  })

  const wrists = [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST]
  wrists.forEach((index) => {
    const point = landmarks[index]
    if (!point || point.visibility < 0.5) return
    const { x, y } = lmToCanvasMirroredDrawingPx(point, vw, vh, iw, ih)
    ctx.beginPath()
    ctx.arc(x, y, ringR + 10, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 251, 235, 0.75)'
    ctx.lineWidth = Math.max(2, lineW * 0.6)
    ctx.stroke()
  })
}

function PoseDetector() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const poseRef = useRef(null)
  const handsRef = useRef(null)
  const animationRef = useRef(null)
  const poseStatusRef = useRef('')
  const lastPosePublishRef = useRef(0)
  const lastHandsPublishRef = useRef(0)
  const lastHandsSendRef = useRef(0)
  const handsActiveRef = useRef(false)
  const actionLockRef = useRef(null)

  const [isLoading, setIsLoading] = useState(true)
  const [poseStatus, setPoseStatus] = useState('')

  const gameState = useGameStore((s) => s.gameState)
  const playMode = useGameStore((s) => s.playMode)
  const setPose = useGameStore((s) => s.setPose)
  const setHands = useGameStore((s) => s.setHands)
  const setCameraReady = useGameStore((s) => s.setCameraReady)
  const setPoseVideoIntrinsics = useGameStore((s) => s.setPoseVideoIntrinsics)
  const completeAction = useGameStore((s) => s.completeAction)
  const triggerStarEffect = useGameStore((s) => s.triggerStarEffect)

  const arcadeFullscreen = isArcadeMode(gameState, playMode)

  const updatePoseStatus = useCallback((message) => {
    if (poseStatusRef.current === message) return
    poseStatusRef.current = message
    setPoseStatus(message)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const applySize = () => {
      if (arcadeFullscreen) {
        const rawDpr = window.devicePixelRatio || 1
        const dpr = Math.min(rawDpr, 1.85)
        const w = window.innerWidth
        const h = window.innerHeight
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      } else {
        canvas.width = 320
        canvas.height = 240
        canvas.style.width = ''
        canvas.style.height = ''
      }
    }

    applySize()

    if (arcadeFullscreen) {
      window.addEventListener('resize', applySize)
      return () => window.removeEventListener('resize', applySize)
    }
    return undefined
  }, [arcadeFullscreen])

  /** 街机全屏：轻量 BlazePose，降低发热与卡顿 */
  useEffect(() => {
    poseRef.current?.setOptions({
      modelComplexity: arcadeFullscreen ? 0 : 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
  }, [arcadeFullscreen])

  const checkAction = useCallback((landmarks, requiredAction) => {
    if (!landmarks || landmarks.length === 0) return false

    const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]
    const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
    const nose = landmarks[POSE_LANDMARKS.NOSE]

    if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return false

    switch (requiredAction) {
      case 'hands_up':
        return leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y

      case 'arms_wave':
        return Math.abs(leftWrist.x - rightWrist.x) > 0.4

      case 'arms_arc':
        return (
          leftWrist.y < leftShoulder.y &&
          rightWrist.y < rightShoulder.y &&
          Math.abs(leftWrist.x - rightWrist.x) > 0.3
        )

      case 'sway': {
        const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2
        return Math.abs(shoulderCenter - 0.5) > 0.05
      }

      case 'jump': {
        const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
        const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
        if (!leftHip || !rightHip) return false
        const hipCenter = (leftHip.y + rightHip.y) / 2
        return hipCenter < 0.55
      }

      case 'arms_triangle':
        if (!nose) return false
        return (
          leftWrist.y < nose.y && rightWrist.y < nose.y && Math.abs(leftWrist.x - rightWrist.x) < 0.15
        )

      case 'wave_motion':
        return Math.abs(leftWrist.x - rightWrist.x) > 0.5

      case 'bloom':
        return (
          Math.abs(leftWrist.x - rightWrist.x) > 0.4 &&
          leftWrist.y < leftShoulder.y + 0.1 &&
          rightWrist.y < rightShoulder.y + 0.1
        )

      case 'stretch':
        return Math.abs(leftWrist.x - rightWrist.x) > 0.6

      case 'hands_together':
        return (
          Math.abs(leftWrist.x - rightWrist.x) < 0.1 &&
          leftWrist.y > leftShoulder.y &&
          rightWrist.y > rightShoulder.y
        )

      case 'arms_spread':
        return (
          Math.abs(leftWrist.x - rightWrist.x) > 0.6 &&
          Math.abs(leftWrist.y - leftShoulder.y) < 0.15 &&
          Math.abs(rightWrist.y - rightShoulder.y) < 0.15
        )

      default:
        return false
    }
  }, [])

  const onResults = useCallback(
    (results) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')

      if (!canvas || !ctx) return

      const gs = useGameStore.getState()
      const fullArcade = isArcadeMode(gs.gameState, gs.playMode)
      const { width: iw, height: ih } = gs.poseVideoIntrinsics || { width: 0, height: 0 }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const rawDpr = window.devicePixelRatio || 1
      const drawDpr = fullArcade ? Math.min(rawDpr, 1.85) : 1
      ctx.setTransform(fullArcade ? drawDpr : 1, 0, 0, fullArcade ? drawDpr : 1, 0, 0)

      if (results.poseLandmarks && results.poseLandmarks.length > 0) {
        const landmarks = results.poseLandmarks

        const now = performance.now()
        const shouldPublishPose = now - lastPosePublishRef.current >= POSE_PUBLISH_INTERVAL_MS
        setPose(landmarks, { publish: shouldPublishPose })
        if (shouldPublishPose) {
          lastPosePublishRef.current = now
        }

        const rect = canvas.getBoundingClientRect()
        const vw = rect.width
        const vh = rect.height

        if (fullArcade && vw > 0 && vh > 0) {
          drawSkeletonCoverOnMirroredCanvas(ctx, landmarks, vw, vh, iw, ih)
        } else {
          drawSkeletonMini(ctx, landmarks, canvas.width, canvas.height)
        }

        if (gs.gameState === 'arcade_playing') {
          if (gs.playMode === 'fruit') {
            updatePoseStatus('✍️ 左手张开写字｜握拳提交｜双手交叉重写')
          } else if (gs.playMode === 'rope') {
            updatePoseStatus('🪢 虚拟跳绳：全身入镜，双脚跳起落下计数')
          } else if (gs.arcadeVersus) {
            updatePoseStatus('🎈 双人：左侧=P1｜右侧=P2 · 击中高分气球抢分')
          } else {
            updatePoseStatus('🎈 挥动手臂顶破气球，高分球更稀有')
          }
          return
        }

        const currentWord = gs.getCurrentWord()
        if (currentWord && (gs.gameState === 'learning' || gs.gameState === 'action_pending')) {
          const actionMatched = checkAction(landmarks, currentWord.action)

          if (actionMatched) {
            updatePoseStatus('✨ 动作正确！')
            if (actionLockRef.current !== currentWord.id) {
              actionLockRef.current = currentWord.id
              completeAction()
              triggerStarEffect()
            }
          } else {
            actionLockRef.current = null
            updatePoseStatus(`🎯 ${currentWord.actionDescription}`)
          }
        } else {
          if (gs.gameState !== 'action_success') {
            actionLockRef.current = null
          }
          updatePoseStatus('✅ 姿态已识别')
        }

        if (gs.gameState === 'idle') {
          const handsUp = checkAction(landmarks, 'hands_up')
          if (handsUp) triggerStarEffect()
        }
      } else {
        setPose(null)
        lastPosePublishRef.current = 0
        updatePoseStatus('🔍 请站在摄像头前，确保光线充足')
      }
    },
    [setPose, checkAction, completeAction, triggerStarEffect, updatePoseStatus],
  )

  const onHandsResults = useCallback(
    (results) => {
      const now = performance.now()
      const shouldPublishHands = now - lastHandsPublishRef.current >= HANDS_PUBLISH_INTERVAL_MS
      if (shouldPublishHands) {
        lastHandsPublishRef.current = now
      }

      const landmarks = results.multiHandLandmarks || []
      const handedness = (results.multiHandedness || []).map((hand) => {
        const rawLabel = hand.label
        return {
          ...hand,
          rawLabel,
          label: rawLabel === 'Left' ? 'Right' : rawLabel === 'Right' ? 'Left' : rawLabel,
        }
      })

      setHands(
        {
          multiHandLandmarks: landmarks,
          multiHandedness: handedness,
          updatedAt: now,
        },
        { publish: shouldPublishHands },
      )
    },
    [setHands],
  )

  useEffect(() => {
    let isMounted = true

    const initPose = async () => {
      try {
        poseRef.current = new Pose({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
          },
        })

        poseRef.current.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        poseRef.current.onResults((results) => {
          if (isMounted) {
            onResults(results)
          }
        })

        try {
          handsRef.current = new Hands({
            locateFile: (file) => {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            },
          })

          handsRef.current.setOptions({
            selfieMode: false,
            maxNumHands: 2,
            modelComplexity: 0,
            minDetectionConfidence: 0.55,
            minTrackingConfidence: 0.5,
          })

          handsRef.current.onResults((results) => {
            if (isMounted) {
              onHandsResults(results)
            }
          })
        } catch (error) {
          console.error('❌ Error initializing hand detection:', error)
          handsRef.current = null
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: 'user',
          },
        })

        if (videoRef.current && isMounted) {
          const videoEl = videoRef.current
          videoEl.srcObject = stream

          videoEl.onloadedmetadata = () => {
            if (!isMounted) return

            if (videoEl.videoWidth && videoEl.videoHeight) {
              setPoseVideoIntrinsics(videoEl.videoWidth, videoEl.videoHeight)
            }

            videoEl
              .play()
              .then(() => {
                setCameraReady(true)
                setIsLoading(false)

                const detect = async () => {
                  if (!isMounted) return

                  if (videoEl && poseRef.current && videoEl.readyState === 4) {
                    try {
                      await poseRef.current.send({ image: videoEl })
                      const gs = useGameStore.getState()
                      const wantsHands =
                        gs.gameState === 'arcade_playing' && gs.playMode === 'fruit'
                      const now = performance.now()

                      if (!wantsHands && handsActiveRef.current) {
                        handsActiveRef.current = false
                        lastHandsPublishRef.current = 0
                        setHands(null)
                      }

                      if (
                        wantsHands &&
                        handsRef.current &&
                        now - lastHandsSendRef.current >= HANDS_SEND_INTERVAL_MS
                      ) {
                        handsActiveRef.current = true
                        lastHandsSendRef.current = now
                        await handsRef.current.send({ image: videoEl })
                      }
                    } catch (error) {
                      console.error('❌ Pose detection error:', error)
                    }
                  }

                  if (isMounted) {
                    animationRef.current = requestAnimationFrame(detect)
                  }
                }

                setTimeout(() => {
                  if (isMounted) {
                    detect()
                  }
                }, 200)
              })
              .catch((error) => {
                console.error('❌ Video play error:', error)
                if (isMounted) {
                  setIsLoading(false)
                  poseStatusRef.current = '📷 视频播放失败'
                  setPoseStatus('📷 视频播放失败')
                }
              })
          }

          videoEl.onerror = () => {
            if (isMounted) {
              setIsLoading(false)
              poseStatusRef.current = '📷 摄像头加载失败'
              setPoseStatus('📷 摄像头加载失败')
            }
          }
        }
      } catch (error) {
        console.error('❌ Error initializing pose detection:', error)
        if (isMounted) {
          setIsLoading(false)
          poseStatusRef.current = '📷 请允许摄像头访问'
          setPoseStatus('📷 请允许摄像头访问')
        }
      }
    }

    initPose()

    return () => {
      isMounted = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach((track) => track.stop())
      }
      setHands(null)
      poseRef.current?.close?.().catch(() => {})
      handsRef.current?.close?.().catch(() => {})
    }
  }, [onResults, onHandsResults, setCameraReady, setHands, setPoseVideoIntrinsics])

  const wrapperClass = arcadeFullscreen ? 'pose-arcade-fullscreen' : 'pose-detector-container'

  return (
    <div className={wrapperClass}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ display: isLoading ? 'none' : 'block' }}
      />
      <canvas ref={canvasRef} width={320} height={240} />

      {isLoading && (
        <div className="camera-loading">
          <div className="loading-spinner" />
          <span>正在启动摄像头...</span>
        </div>
      )}

      <div className="camera-status">
        <div
          className="camera-status-dot"
          style={{
            background: isLoading ? '#FFA500' : '#4CAF50',
          }}
        />
        <span>{isLoading ? '加载中' : arcadeFullscreen ? '全屏体感' : '已连接'}</span>
      </div>

      {poseStatus && <div className="pose-status">{poseStatus}</div>}
    </div>
  )
}

export default PoseDetector
