import React, { useCallback, useEffect, useRef, useState } from 'react'
import useGameStore, { getLatestPose } from '../store/gameStore'
import { lmToOverlayPx } from '../utils/cameraLandmarks'
import { getJumpRopeLeaderboard } from '../utils/gameRecords'
import { playSuccessTone } from '../utils/soundEffects'
import './JumpRopeOverlay.css'

const POSE_LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
}

const ROUND_MS = 60_000
const CALIBRATION_MS = 1400
const AIR_THRESHOLD_PX = 34
const LANDING_THRESHOLD_PX = 16
const MIN_JUMP_GAP_MS = 260

function visible(point, min = 0.42) {
  return point && (point.visibility == null || point.visibility >= min)
}

function midpoint(a, b) {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

function posePoint(landmarks, index, vw, vh, iw, ih) {
  const point = landmarks?.[index]
  if (!visible(point)) return null
  return lmToOverlayPx(point, vw, vh, iw, ih)
}

function formatTime(ms) {
  return Math.max(0, Math.ceil(ms / 1000))
}

function JumpRopeOverlay() {
  const finishArcade = useGameStore((s) => s.finishArcade)
  const gameState = useGameStore((s) => s.gameState)
  const playMode = useGameStore((s) => s.playMode)

  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const stateRef = useRef(null)
  const [ui, setUi] = useState({
    count: 0,
    secondsLeft: 60,
    status: '校准中',
    calibrated: false,
    leaderboard: [],
  })

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const vw = window.innerWidth || 390
    const vh = window.innerHeight || 820
    canvas.width = Math.floor(vw * dpr)
    canvas.height = Math.floor(vh * dpr)
    canvas.style.width = `${vw}px`
    canvas.style.height = `${vh}px`
  }, [])

  const publish = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    setUi({
      count: s.count,
      secondsLeft: s.roundStartedAt
        ? formatTime(ROUND_MS - (performance.now() - s.roundStartedAt))
        : 60,
      status: s.status,
      calibrated: s.calibrated,
      leaderboard: s.leaderboard,
    })
  }, [])

  const drawScene = useCallback((pose, now) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const s = stateRef.current
    if (!canvas || !ctx || !s) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const vw = canvas.clientWidth || window.innerWidth || 390
    const vh = canvas.clientHeight || window.innerHeight || 820
    const gs = useGameStore.getState()
    const iw = gs.poseVideoIntrinsics?.width || 0
    const ih = gs.poseVideoIntrinsics?.height || 0
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, vw, vh)

    const leftWrist = posePoint(pose, POSE_LM.LEFT_WRIST, vw, vh, iw, ih)
    const rightWrist = posePoint(pose, POSE_LM.RIGHT_WRIST, vw, vh, iw, ih)
    const leftAnkle = posePoint(pose, POSE_LM.LEFT_ANKLE, vw, vh, iw, ih)
    const rightAnkle = posePoint(pose, POSE_LM.RIGHT_ANKLE, vw, vh, iw, ih)
    const leftHip = posePoint(pose, POSE_LM.LEFT_HIP, vw, vh, iw, ih)
    const rightHip = posePoint(pose, POSE_LM.RIGHT_HIP, vw, vh, iw, ih)
    const hip = midpoint(leftHip, rightHip)
    const foot = midpoint(leftAnkle, rightAnkle)

    const centerX = hip?.x || vw / 2
    const groundY = s.baselineY || foot?.y || vh * 0.78
    const ropeWidth = Math.min(vw * 0.86, Math.max(260, vw * 0.62))
    const ropeHeight = Math.min(vh * 0.42, Math.max(170, vh * 0.28))
    const phase = ((now - (s.roundStartedAt || now)) / 780) * Math.PI * 2
    const swing = Math.sin(phase)
    const front = swing > 0
    const topY = groundY - ropeHeight * (0.76 + 0.16 * Math.cos(phase))
    const bottomY = groundY + 8 + Math.abs(swing) * 18
    const leftX = centerX - ropeWidth / 2
    const rightX = centerX + ropeWidth / 2

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowBlur = front ? 20 : 10
    ctx.shadowColor = front ? 'rgba(250, 204, 21, 0.72)' : 'rgba(56, 189, 248, 0.48)'
    ctx.lineWidth = front ? 9 : 5
    ctx.strokeStyle = front ? 'rgba(254, 240, 138, 0.92)' : 'rgba(125, 211, 252, 0.48)'
    ctx.beginPath()
    ctx.moveTo(leftWrist?.x || leftX, leftWrist?.y || topY)
    ctx.quadraticCurveTo(centerX, front ? bottomY : topY, rightWrist?.x || rightX, rightWrist?.y || topY)
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.setLineDash([10, 12])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(Math.max(16, centerX - ropeWidth * 0.44), groundY)
    ctx.lineTo(Math.min(vw - 16, centerX + ropeWidth * 0.44), groundY)
    ctx.stroke()
    ctx.setLineDash([])

    if (foot) {
      const lift = Math.max(0, groundY - foot.y)
      ctx.fillStyle = s.inAir ? 'rgba(250, 204, 21, 0.92)' : 'rgba(45, 212, 255, 0.84)'
      ctx.beginPath()
      ctx.arc(foot.x, foot.y, 12 + Math.min(10, lift * 0.08), 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  const finishRun = useCallback(() => {
    const s = stateRef.current
    if (!s || s.finished) return
    s.finished = true
    finishArcade({
      playMode: 'rope',
      arcadeVersus: false,
      sessionTotal: 60,
      poppedWords: [],
      missed: 0,
      player1Hits: s.count,
      player2Hits: 0,
      jumpCount: s.count,
      durationSeconds: 60,
      rankScore: s.count,
    })
  }, [finishArcade])

  useEffect(() => {
    stateRef.current = {
      mountedAt: performance.now(),
      roundStartedAt: 0,
      baselineSamples: [],
      baselineY: 0,
      calibrated: false,
      count: 0,
      inAir: false,
      lastJumpAt: -Infinity,
      lastPublishAt: 0,
      status: '校准中',
      leaderboard: getJumpRopeLeaderboard(5),
      finished: false,
    }
    resizeCanvas()
    publish()
    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [publish, resizeCanvas])

  useEffect(() => {
    if (gameState !== 'arcade_playing' || playMode !== 'rope') return undefined

    const step = () => {
      const s = stateRef.current
      if (!s || s.finished) return
      const now = performance.now()
      const calibrationElapsed = now - s.mountedAt
      const roundElapsed = s.roundStartedAt ? now - s.roundStartedAt : 0
      const pose = getLatestPose()
      const vw = window.innerWidth || 390
      const vh = window.innerHeight || 820
      const gs = useGameStore.getState()
      const iw = gs.poseVideoIntrinsics?.width || 0
      const ih = gs.poseVideoIntrinsics?.height || 0

      const leftAnkle = posePoint(pose, POSE_LM.LEFT_ANKLE, vw, vh, iw, ih)
      const rightAnkle = posePoint(pose, POSE_LM.RIGHT_ANKLE, vw, vh, iw, ih)
      const foot = midpoint(leftAnkle, rightAnkle)

      if (!foot) {
        s.status = '脚踝未入镜'
      } else if (!s.calibrated) {
        s.baselineSamples.push(foot.y)
        s.status = '校准中'
        if (calibrationElapsed >= CALIBRATION_MS && s.baselineSamples.length >= 12) {
          const sorted = [...s.baselineSamples].sort((a, b) => a - b)
          s.baselineY = sorted[Math.floor(sorted.length * 0.68)]
          s.calibrated = true
          s.roundStartedAt = now
          s.status = '开始跳'
        }
      } else {
        const lift = s.baselineY - foot.y
        const isAirborne = lift > AIR_THRESHOLD_PX
        const isLanded = lift < LANDING_THRESHOLD_PX

        if (!s.inAir && isAirborne) {
          s.inAir = true
          s.status = '空中'
        }

        if (s.inAir && isLanded && now - s.lastJumpAt >= MIN_JUMP_GAP_MS) {
          s.inAir = false
          s.lastJumpAt = now
          s.count += 1
          s.status = '计数 +1'
          playSuccessTone(Math.min(5, 1 + (s.count % 5)))
        } else if (!s.inAir && s.calibrated) {
          s.status = '准备'
        }

        if (!s.inAir && isLanded) {
          s.baselineY = s.baselineY * 0.985 + foot.y * 0.015
        }
      }

      drawScene(pose, now)

      if (s.roundStartedAt && roundElapsed >= ROUND_MS) {
        publish()
        finishRun()
        return
      }

      if (now - s.lastPublishAt > 130) {
        s.lastPublishAt = now
        publish()
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [drawScene, finishRun, gameState, playMode, publish])

  if (gameState !== 'arcade_playing' || playMode !== 'rope') return null

  return (
    <div className="jump-rope-overlay">
      <canvas ref={canvasRef} className="jump-rope-canvas" />
      <section className="jump-rope-hud" aria-label="虚拟跳绳">
        <div className="jump-rope-meter">
          <span>倒计时</span>
          <strong>{ui.secondsLeft}</strong>
        </div>
        <div className="jump-rope-count">
          <span>次数</span>
          <strong>{ui.count}</strong>
          <em>{ui.status}</em>
        </div>
        <div className="jump-rope-meter">
          <span>目标</span>
          <strong>60s</strong>
        </div>
      </section>

      <aside className="jump-rope-board">
        <h3>排行榜</h3>
        {ui.leaderboard.length ? (
          ui.leaderboard.map((entry, index) => (
            <div key={entry.id} className="jump-rope-rank">
              <span>{index + 1}</span>
              <strong>{entry.username}</strong>
              <em>{entry.jumpCount}</em>
            </div>
          ))
        ) : (
          <div className="jump-rope-empty">暂无成绩</div>
        )}
      </aside>
    </div>
  )
}

export default JumpRopeOverlay
