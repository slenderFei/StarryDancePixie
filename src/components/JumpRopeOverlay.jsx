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
const COUNTDOWN_MS = 3000
const CALIBRATION_SAMPLE_COUNT = 24
const CALIBRATION_SAMPLE_INTERVAL_MS = 70
const AIR_THRESHOLD_RATIO = 0.058
const HIP_THRESHOLD_RATIO = 0.025
const MIN_VISIBLE_POINTS = 4
const MIN_JUMP_GAP_MS = 300
const MAX_JUMP_GAP_MS = 1600
const MIN_AIRBORNE_MS = 80
const MAX_AIRBORNE_MS = 950
const POSE_LOST_RESET_MS = 360
const RESUME_SETTLE_MS = 420

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function medianDeviation(values) {
  if (!values.length) return 0
  const center = median(values)
  return median(values.map((value) => Math.abs(value - center)))
}

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

function smoothValue(prev, next, alpha = 0.34) {
  if (!Number.isFinite(prev)) return next
  return prev * (1 - alpha) + next * alpha
}

function posePoint(landmarks, index, vw, vh, iw, ih) {
  const point = landmarks?.[index]
  if (!visible(point)) return null
  return lmToOverlayPx(point, vw, vh, iw, ih)
}

function formatTime(ms) {
  return Math.max(0, Math.ceil(ms / 1000))
}

function formatPace(count, roundStartedAt) {
  if (!roundStartedAt || count <= 0) return 0
  const elapsedSeconds = Math.max(1, (performance.now() - roundStartedAt) / 1000)
  return Math.round((count / elapsedSeconds) * 60)
}

function rankForScore(leaderboard, score) {
  if (!score) return leaderboard.length ? leaderboard.length + 1 : 1
  return leaderboard.filter((entry) => Number(entry.jumpCount || 0) > score).length + 1
}

function gradeForCount(count) {
  if (count >= 140) return 'S+'
  if (count >= 110) return 'S'
  if (count >= 85) return 'A'
  if (count >= 60) return 'B'
  return 'C'
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
    phase: 'calibrating',
    countdown: 3,
    quality: 0,
    calibrationProgress: 0,
    bestScore: 0,
    combo: 0,
    bestCombo: 0,
    pace: 0,
    rankPreview: 1,
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
      phase: s.phase,
      countdown: s.countdown,
      quality: s.quality,
      calibrationProgress: s.calibrationProgress,
      bestScore: Math.max(s.bestScore, s.count),
      combo: s.combo,
      bestCombo: Math.max(s.bestCombo, s.combo),
      pace: formatPace(s.count, s.roundStartedAt),
      rankPreview: rankForScore(s.leaderboard, s.count),
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
    const leftShoulder = posePoint(pose, POSE_LM.LEFT_SHOULDER, vw, vh, iw, ih)
    const rightShoulder = posePoint(pose, POSE_LM.RIGHT_SHOULDER, vw, vh, iw, ih)
    const leftHip = posePoint(pose, POSE_LM.LEFT_HIP, vw, vh, iw, ih)
    const rightHip = posePoint(pose, POSE_LM.RIGHT_HIP, vw, vh, iw, ih)
    const shoulder = midpoint(leftShoulder, rightShoulder)
    const hip = midpoint(leftHip, rightHip)
    const foot = midpoint(leftAnkle, rightAnkle)

    const centerX = hip?.x || vw / 2
    const groundY = s.baselineY || foot?.y || vh * 0.78
    const bodyHeight = s.bodyHeight || (shoulder && foot ? Math.max(foot.y - shoulder.y, vh * 0.34) : vh * 0.56)
    const ropeWidth = Math.min(vw * 0.9, clamp(bodyHeight * 1.08, 280, vw * 0.86))
    const ropeHeight = clamp(bodyHeight * 0.52, 175, vh * 0.46)
    const timerBase = s.roundStartedAt || s.countdownStartedAt || s.mountedAt
    const ropeMs = s.roundStartedAt ? clamp(840 - s.count * 3.2, 540, 840) : 1120
    const ropePhase = ((now - timerBase) / ropeMs) * Math.PI * 2
    const swing = Math.sin(ropePhase)
    const front = swing > 0
    const topY = groundY - ropeHeight * (0.76 + 0.16 * Math.cos(ropePhase))
    const bottomY = groundY + 8 + Math.abs(swing) * 18
    const leftX = centerX - ropeWidth / 2
    const rightX = centerX + ropeWidth / 2
    const readyLineY = groundY - (s.airThresholdPx || 36)

    const stage = ctx.createRadialGradient(centerX, groundY, 12, centerX, groundY, Math.max(vw, vh) * 0.58)
    stage.addColorStop(0, 'rgba(45, 212, 255, 0.14)')
    stage.addColorStop(0.48, 'rgba(15, 23, 42, 0.06)')
    stage.addColorStop(1, 'rgba(15, 23, 42, 0)')
    ctx.fillStyle = stage
    ctx.fillRect(0, 0, vw, vh)

    ctx.fillStyle = 'rgba(15, 23, 42, 0.34)'
    ctx.beginPath()
    ctx.ellipse(centerX, groundY + 18, ropeWidth * 0.44, Math.max(16, ropeHeight * 0.08), 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.28)'
    ctx.lineWidth = 2
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath()
      ctx.ellipse(centerX, groundY + 18, ropeWidth * (0.24 + i * 0.1), 14 + i * 11, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

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
    ctx.setLineDash([7, 10])
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.44)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(Math.max(16, centerX - ropeWidth * 0.36), readyLineY)
    ctx.lineTo(Math.min(vw - 16, centerX + ropeWidth * 0.36), readyLineY)
    ctx.stroke()

    ctx.setLineDash([10, 12])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(Math.max(16, centerX - ropeWidth * 0.44), groundY)
    ctx.lineTo(Math.min(vw - 16, centerX + ropeWidth * 0.44), groundY)
    ctx.stroke()
    ctx.setLineDash([])

    ;[leftWrist, rightWrist].forEach((hand) => {
      if (!hand) return
      ctx.fillStyle = 'rgba(255, 255, 255, 0.86)'
      ctx.beginPath()
      ctx.arc(hand.x, hand.y, 8, 0, Math.PI * 2)
      ctx.fill()
    })

    if (foot) {
      const lift = Math.max(0, groundY - foot.y)
      const flash = now < (s.jumpFlashUntil || 0)
      ctx.fillStyle = flash
        ? 'rgba(52, 211, 153, 0.94)'
        : s.inAir
          ? 'rgba(250, 204, 21, 0.92)'
          : 'rgba(45, 212, 255, 0.84)'
      ctx.beginPath()
      ctx.arc(foot.x, foot.y, 12 + Math.min(12, lift * 0.09), 0, Math.PI * 2)
      ctx.fill()
    }

    s.jumpBursts = (s.jumpBursts || []).filter((burst) => now - burst.createdAt < 620)
    s.jumpBursts.forEach((burst) => {
      const age = (now - burst.createdAt) / 620
      const radius = 18 + age * 58
      ctx.globalAlpha = 1 - age
      ctx.strokeStyle = burst.combo >= 10 ? '#fef08a' : '#67e8f9'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = burst.combo >= 10 ? '#fef9c3' : '#cffafe'
      ctx.font = '900 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('+1', burst.x, burst.y - radius * 0.45)
      ctx.globalAlpha = 1
    })
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
      score: s.count,
      bestCombo: s.bestCombo,
    })
  }, [finishArcade])

  useEffect(() => {
    const leaderboard = getJumpRopeLeaderboard(5)
    stateRef.current = {
      mountedAt: performance.now(),
      roundStartedAt: 0,
      baselineSamples: [],
      baselineY: 0,
      baselineHipY: 0,
      bodyHeight: 0,
      airThresholdPx: 36,
      landingThresholdPx: 16,
      hipThresholdPx: 16,
      hipLandingThresholdPx: 7,
      smoothedFootY: Number.NaN,
      smoothedHipY: Number.NaN,
      countdownStartedAt: 0,
      missingSince: 0,
      ignoreUntil: 0,
      lastCalibrationSampleAt: 0,
      calibrated: false,
      phase: 'calibrating',
      countdown: 3,
      quality: 0,
      calibrationProgress: 0,
      bestScore: leaderboard[0]?.jumpCount || 0,
      count: 0,
      combo: 0,
      bestCombo: 0,
      inAir: false,
      airborneStartedAt: 0,
      jumpPeakLift: 0,
      jumpPeakHipLift: 0,
      lastJumpAt: -Infinity,
      lastPublishAt: 0,
      status: '校准中',
      leaderboard,
      jumpBursts: [],
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
      const roundElapsed = s.roundStartedAt ? now - s.roundStartedAt : 0
      const pose = getLatestPose()
      const vw = window.innerWidth || 390
      const vh = window.innerHeight || 820
      const gs = useGameStore.getState()
      const iw = gs.poseVideoIntrinsics?.width || 0
      const ih = gs.poseVideoIntrinsics?.height || 0

      const leftAnkle = posePoint(pose, POSE_LM.LEFT_ANKLE, vw, vh, iw, ih)
      const rightAnkle = posePoint(pose, POSE_LM.RIGHT_ANKLE, vw, vh, iw, ih)
      const leftShoulder = posePoint(pose, POSE_LM.LEFT_SHOULDER, vw, vh, iw, ih)
      const rightShoulder = posePoint(pose, POSE_LM.RIGHT_SHOULDER, vw, vh, iw, ih)
      const leftHip = posePoint(pose, POSE_LM.LEFT_HIP, vw, vh, iw, ih)
      const rightHip = posePoint(pose, POSE_LM.RIGHT_HIP, vw, vh, iw, ih)
      const shoulder = midpoint(leftShoulder, rightShoulder)
      const hip = midpoint(leftHip, rightHip)
      const foot = midpoint(leftAnkle, rightAnkle)
      const visibleCount = [leftShoulder, rightShoulder, leftHip, rightHip, leftAnkle, rightAnkle].filter(Boolean).length
      const hasStableBody = foot && hip && shoulder && visibleCount >= MIN_VISIBLE_POINTS
      s.quality = Math.round((visibleCount / 6) * 100)

      if (hasStableBody && s.missingSince) {
        const missingFor = now - s.missingSince
        if (s.calibrated && !s.roundStartedAt) {
          s.countdownStartedAt += missingFor
        }
        if (s.roundStartedAt && missingFor > POSE_LOST_RESET_MS) {
          s.inAir = false
          s.baselineY = foot.y
          s.baselineHipY = hip.y
          s.smoothedFootY = foot.y
          s.smoothedHipY = hip.y
          s.ignoreUntil = now + RESUME_SETTLE_MS
          s.status = '重新就位'
        }
        s.missingSince = 0
      }

      if (!hasStableBody) {
        if (!s.missingSince) s.missingSince = now
        const missingFor = now - s.missingSince
        s.status = visibleCount >= 4 ? '下半身再入镜' : '请全身入镜'
        if (!s.calibrated) {
          s.baselineSamples = []
          s.calibrationProgress = 0
          s.phase = 'calibrating'
        } else if (!s.roundStartedAt) {
          s.phase = 'countdown'
          s.status = '回到镜头继续'
        } else if (missingFor > POSE_LOST_RESET_MS) {
          s.inAir = false
          s.status = '回到镜头继续'
        }
      } else if (!s.calibrated) {
        const bodyHeight = clamp(foot.y - shoulder.y, vh * 0.28, vh * 0.82)
        if (now - s.lastCalibrationSampleAt >= CALIBRATION_SAMPLE_INTERVAL_MS) {
          s.lastCalibrationSampleAt = now
          s.baselineSamples.push({ footY: foot.y, hipY: hip.y, bodyHeight })
          if (s.baselineSamples.length > CALIBRATION_SAMPLE_COUNT * 2) {
            s.baselineSamples.shift()
          }
        }
        const readySamples = s.baselineSamples.slice(-CALIBRATION_SAMPLE_COUNT)
        const sampleCount = Math.min(CALIBRATION_SAMPLE_COUNT, readySamples.length)
        const sampledBodyHeight = median(readySamples.map((sample) => sample.bodyHeight))
        const footJitter = medianDeviation(readySamples.map((sample) => sample.footY))
        const hipJitter = medianDeviation(readySamples.map((sample) => sample.hipY))
        const jitterLimit = clamp(sampledBodyHeight * 0.026, 10, 28)
        const stableEnough =
          sampleCount >= CALIBRATION_SAMPLE_COUNT &&
          footJitter <= jitterLimit &&
          hipJitter <= jitterLimit
        s.phase = 'calibrating'
        s.calibrationProgress = stableEnough
          ? 100
          : Math.min(99, Math.round((sampleCount / CALIBRATION_SAMPLE_COUNT) * 100))
        s.status =
          sampleCount < CALIBRATION_SAMPLE_COUNT
            ? `站稳 ${sampleCount}/${CALIBRATION_SAMPLE_COUNT}`
            : '保持站稳'
        if (stableEnough) {
          s.baselineY = median(readySamples.map((sample) => sample.footY))
          s.baselineHipY = median(readySamples.map((sample) => sample.hipY))
          s.bodyHeight = sampledBodyHeight
          s.airThresholdPx = clamp(s.bodyHeight * AIR_THRESHOLD_RATIO, 28, 62)
          s.landingThresholdPx = clamp(s.airThresholdPx * 0.42, 10, 26)
          s.hipThresholdPx = clamp(s.bodyHeight * HIP_THRESHOLD_RATIO, 10, 30)
          s.hipLandingThresholdPx = clamp(s.hipThresholdPx * 0.42, 5, 14)
          s.smoothedFootY = s.baselineY
          s.smoothedHipY = s.baselineHipY
          s.calibrated = true
          s.countdownStartedAt = now
          s.phase = 'countdown'
          s.status = '准备'
        }
      } else if (!s.roundStartedAt) {
        const countdownLeft = COUNTDOWN_MS - (now - s.countdownStartedAt)
        s.phase = 'countdown'
        s.countdown = clamp(Math.ceil(countdownLeft / 1000), 1, 3)
        s.status = `${s.countdown}`
        if (countdownLeft <= 0) {
          s.roundStartedAt = now
          s.phase = 'active'
          s.baselineY = foot.y
          s.baselineHipY = hip.y
          s.smoothedFootY = foot.y
          s.smoothedHipY = hip.y
          s.inAir = false
          s.airborneStartedAt = 0
          s.jumpPeakLift = 0
          s.jumpPeakHipLift = 0
          s.lastJumpAt = now - MIN_JUMP_GAP_MS
          s.status = '开始'
        }
      } else {
        s.phase = 'active'
        s.smoothedFootY = smoothValue(s.smoothedFootY, foot.y)
        s.smoothedHipY = smoothValue(s.smoothedHipY, hip.y)
        const lift = s.baselineY - s.smoothedFootY
        const hipLift = s.baselineHipY - s.smoothedHipY
        const strongFootLift = lift > s.airThresholdPx * 1.35
        const isAirborne =
          (lift > s.airThresholdPx && hipLift > s.hipThresholdPx) || strongFootLift
        const isLanded =
          lift < s.landingThresholdPx && hipLift < s.hipLandingThresholdPx
        const gap = now - s.lastJumpAt

        if (now < (s.ignoreUntil || 0)) {
          s.inAir = false
          s.airborneStartedAt = 0
          s.jumpPeakLift = 0
          s.jumpPeakHipLift = 0
          s.status = '重新就位'
        } else if (!s.inAir && isAirborne && gap >= MIN_JUMP_GAP_MS) {
          s.inAir = true
          s.airborneStartedAt = now
          s.jumpPeakLift = Math.max(0, lift)
          s.jumpPeakHipLift = Math.max(0, hipLift)
          s.status = '跳起'
        }

        if (s.inAir) {
          s.jumpPeakLift = Math.max(s.jumpPeakLift, lift)
          s.jumpPeakHipLift = Math.max(s.jumpPeakHipLift, hipLift)
        }

        const airborneMs = s.inAir ? now - s.airborneStartedAt : 0
        if (
          now >= (s.ignoreUntil || 0) &&
          s.inAir &&
          (airborneMs > MAX_AIRBORNE_MS ||
            (gap > MAX_JUMP_GAP_MS && lift < s.airThresholdPx * 0.65))
        ) {
          s.inAir = false
          s.airborneStartedAt = 0
          s.jumpPeakLift = 0
          s.jumpPeakHipLift = 0
          s.status = '调整节奏'
        }

        if (now >= (s.ignoreUntil || 0) && s.inAir && isLanded && gap >= MIN_JUMP_GAP_MS) {
          const enoughAirTime = airborneMs >= MIN_AIRBORNE_MS && airborneMs <= MAX_AIRBORNE_MS
          const enoughLift =
            s.jumpPeakLift >= s.airThresholdPx &&
            (s.jumpPeakHipLift >= s.hipThresholdPx * 0.72 ||
              s.jumpPeakLift >= s.airThresholdPx * 1.32)
          s.inAir = false
          s.airborneStartedAt = 0
          if (enoughAirTime && enoughLift) {
            const nextCombo = gap <= MAX_JUMP_GAP_MS ? s.combo + 1 : 1
            s.lastJumpAt = now
            s.count += 1
            s.combo = nextCombo
            s.bestCombo = Math.max(s.bestCombo, s.combo)
            s.statusHoldUntil = now + 420
            s.jumpFlashUntil = now + 240
            s.status = s.combo >= 10 ? `${s.combo} 连击` : '计数 +1'
            s.jumpBursts.push({
              x: foot?.x || vw / 2,
              y: foot?.y || vh * 0.76,
              combo: s.combo,
              createdAt: now,
            })
            playSuccessTone(Math.min(5, 1 + (s.count % 5)))
          } else {
            s.combo = 0
            s.statusHoldUntil = now + 320
            s.status = '再跳高一点'
          }
          s.jumpPeakLift = 0
          s.jumpPeakHipLift = 0
        } else if (!s.inAir && now > (s.statusHoldUntil || 0)) {
          if (gap > MAX_JUMP_GAP_MS && s.combo > 0) s.combo = 0
          s.status = '准备'
        }

        if (!s.inAir && isLanded) {
          s.baselineY = s.baselineY * 0.988 + s.smoothedFootY * 0.012
          s.baselineHipY = s.baselineHipY * 0.99 + s.smoothedHipY * 0.01
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

  const timeProgress = clamp(ui.secondsLeft / 60, 0, 1)
  const grade = gradeForCount(ui.count)
  const topThree = ui.leaderboard.slice(0, 3)

  return (
    <div className="jump-rope-overlay">
      <canvas ref={canvasRef} className="jump-rope-canvas" />
      <section className="jump-rope-hud" aria-label="虚拟跳绳挑战">
        <div className="jump-rope-title">
          <span>ROPE CHALLENGE</span>
          <strong>虚拟跳绳挑战</strong>
        </div>
        <div
          className="jump-rope-timer"
          style={{ '--rope-progress': `${timeProgress * 360}deg` }}
        >
          <span>TIME</span>
          <strong>{ui.secondsLeft}</strong>
        </div>
        <div className="jump-rope-mode-switch">
          <span className="active">SOLO</span>
          <span>DUO</span>
        </div>
      </section>

      <section className="jump-rope-scorecard">
        <span className="score-label">JUMPS</span>
        <strong>{ui.count}</strong>
        <em>{ui.status}</em>
        <div className="jump-rope-combo">
          <span>{ui.combo}</span>
          <small>COMBO</small>
        </div>
      </section>

      <section className="jump-rope-stats" aria-label="跳绳数据">
        <div>
          <span>配速</span>
          <strong>{ui.pace}</strong>
          <em>次/分</em>
        </div>
        <div>
          <span>最佳</span>
          <strong>{Math.max(ui.bestScore, ui.count)}</strong>
          <em>个人/榜单</em>
        </div>
        <div>
          <span>榜位</span>
          <strong>#{ui.rankPreview}</strong>
          <em>实时预估</em>
        </div>
        <div>
          <span>评级</span>
          <strong>{grade}</strong>
          <em>挑战等级</em>
        </div>
      </section>

      {ui.phase !== 'active' && (
        <div className={`jump-rope-ready jump-rope-ready-${ui.phase}`}>
          <span>{ui.phase === 'calibrating' ? '站稳校准' : '准备'}</span>
          <strong>{ui.phase === 'calibrating' ? `${ui.calibrationProgress}%` : ui.countdown}</strong>
        </div>
      )}

      <aside className="jump-rope-board">
        <div className="jump-rope-board-head">
          <span>LIVE BOARD</span>
          <strong>排行榜</strong>
        </div>
        {ui.leaderboard.length ? (
          topThree.map((entry, index) => (
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

      <aside className="jump-rope-coach">
        <span>入镜</span>
        <strong>{ui.quality}%</strong>
        <em>{ui.phase === 'active' ? '保持节奏' : ui.phase === 'calibrating' ? '站稳校准' : '准备起跳'}</em>
      </aside>
    </div>
  )
}

export default JumpRopeOverlay
