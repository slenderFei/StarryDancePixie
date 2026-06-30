import React, { useCallback, useEffect, useRef, useState } from 'react'
import useGameStore, { getLatestPose } from '../../store/gameStore'
import { playSuccessTone, playWordPronunciation } from '../../utils/soundEffects'
import './PlatformerOverlay.css'

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

const LEVEL_ID = 'sunny-valley-1'
const ROUND_SECONDS = 150
const CALIBRATION_FRAMES = 20
const COUNTDOWN_MS = 2500
const PLAYER_W = 0.62
const PLAYER_H = 1.05
const GRAVITY = -24
const WALK_ACCEL = 34
const MAX_WALK_SPEED = 5.1
const FRICTION = 0.82
const AIR_FRICTION = 0.96
const AIR_CONTROL = 0.56
const JUMP_VELOCITY = 11.8
const JUMP_COOLDOWN_MS = 360
const KEYBOARD_CALIBRATION = {
  centerX: 0.5,
  hipY: 0.6,
  bodyHeight: 0.48,
}

const PLATFORMS = [
  { id: 'ground-1', type: 'ground', x: -1, y: 0, w: 10.5, h: 0.7 },
  { id: 'p-1', type: 'float', x: 10.5, y: 1.45, w: 3.5, h: 0.45 },
  { id: 'p-2', type: 'float', x: 15.5, y: 2.45, w: 3.4, h: 0.45 },
  { id: 'ground-2', type: 'ground', x: 20.2, y: 0, w: 6.2, h: 0.7 },
  { id: 'p-3', type: 'float', x: 26.8, y: 1.7, w: 3.4, h: 0.45 },
  { id: 'p-4', type: 'spring', x: 31.8, y: 2.55, w: 3.3, h: 0.45 },
  { id: 'ground-3', type: 'ground', x: 36.8, y: 0, w: 9.5, h: 0.7 },
]

const COINS = [
  { id: 'c-1', x: 3.2, y: 1.65, score: 10 },
  { id: 'c-2', x: 6.2, y: 1.65, score: 10 },
  { id: 'c-3', x: 11.6, y: 2.45, score: 10 },
  { id: 'c-4', x: 16.7, y: 3.45, score: 10 },
  { id: 'c-5', x: 23.5, y: 1.65, score: 10 },
  { id: 'c-6', x: 28.3, y: 2.7, score: 10 },
  { id: 'c-7', x: 33.1, y: 3.55, score: 50 },
  { id: 'c-8', x: 40.5, y: 1.65, score: 10 },
]

const WORD_BOXES = [
  { id: 'w-1', x: 7.6, y: 2.2, action: 'hands_up' },
  { id: 'w-2', x: 13.0, y: 2.85, action: 'hands_up' },
  { id: 'w-3', x: 22.0, y: 2.0, action: 'jump' },
  { id: 'w-4', x: 29.1, y: 3.0, action: 'hands_up' },
  { id: 'w-5', x: 38.8, y: 2.2, action: 'hands_up' },
]

const ENEMIES = [
  { id: 'e-1', x: 21.7, y: 0.7, w: 0.78, h: 0.68, minX: 21.1, maxX: 25.1, speed: 0.95 },
  { id: 'e-2', x: 38.3, y: 0.7, w: 0.78, h: 0.68, minX: 37.6, maxX: 42.3, speed: 1.08 },
]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function visible(point, min = 0.44) {
  return point && (point.visibility == null || point.visibility >= min)
}

function mid(a, b) {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function circleHitRect(cx, cy, radius, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w)
  const ny = clamp(cy, rect.y, rect.y + rect.h)
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= radius ** 2
}

function poseSnapshot(pose) {
  const leftShoulder = pose?.[POSE_LM.LEFT_SHOULDER]
  const rightShoulder = pose?.[POSE_LM.RIGHT_SHOULDER]
  const leftHip = pose?.[POSE_LM.LEFT_HIP]
  const rightHip = pose?.[POSE_LM.RIGHT_HIP]
  const leftAnkle = pose?.[POSE_LM.LEFT_ANKLE]
  const rightAnkle = pose?.[POSE_LM.RIGHT_ANKLE]
  const leftWrist = pose?.[POSE_LM.LEFT_WRIST]
  const rightWrist = pose?.[POSE_LM.RIGHT_WRIST]
  const shoulder = mid(visible(leftShoulder) ? leftShoulder : null, visible(rightShoulder) ? rightShoulder : null)
  const hip = mid(visible(leftHip) ? leftHip : null, visible(rightHip) ? rightHip : null)
  const foot = mid(visible(leftAnkle) ? leftAnkle : null, visible(rightAnkle) ? rightAnkle : null)
  const visibleCount = [
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    leftAnkle,
    rightAnkle,
  ].filter((point) => visible(point)).length

  if (!shoulder || !hip || !foot || visibleCount < 4) {
    return { ok: false, visibleCount, quality: Math.round((visibleCount / 6) * 100) }
  }

  const handsUp =
    visible(leftWrist) &&
    visible(rightWrist) &&
    leftWrist.y < shoulder.y - 0.035 &&
    rightWrist.y < shoulder.y - 0.035

  return {
    ok: true,
    quality: Math.round((visibleCount / 6) * 100),
    centerX: 1 - hip.x,
    hipY: hip.y,
    shoulderY: shoulder.y,
    footY: foot.y,
    bodyHeight: Math.max(0.22, foot.y - shoulder.y),
    handsUp,
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function startCountdown(s, now, status = '准备') {
  s.phase = 'countdown'
  s.countdownStartedAt = now
  s.status = status
}

function PlatformerOverlay() {
  const finishArcade = useGameStore((s) => s.finishArcade)
  const arcadeSessionWords = useGameStore((s) => s.arcadeSessionWords)
  const gameState = useGameStore((s) => s.gameState)
  const playMode = useGameStore((s) => s.playMode)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const stateRef = useRef(null)
  const keysRef = useRef(new Set())
  const [ui, setUi] = useState({
    phase: 'calibrating',
    status: '站稳校准',
    countdown: 3,
    score: 0,
    coins: 0,
    health: 3,
    learned: 0,
    secondsLeft: ROUND_SECONDS,
    quality: 0,
    challenge: null,
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
      phase: s.phase,
      status: s.status,
      countdown: s.countdown,
      score: s.score,
      coins: s.collectedCoinIds.size,
      health: s.player.health,
      learned: s.learnedWords.length,
      secondsLeft: s.startedAt
        ? Math.max(0, Math.ceil(ROUND_SECONDS - (performance.now() - s.startedAt) / 1000))
        : ROUND_SECONDS,
      quality: s.quality,
      challenge: s.challenge,
    })
  }, [])

  const completeChallenge = useCallback((source = 'gesture') => {
    const s = stateRef.current
    if (!s?.challenge) return
    const { boxId, word } = s.challenge
    if (!s.openedBoxIds.has(boxId)) {
      s.openedBoxIds.add(boxId)
      s.learnedWords.push({
        ...word,
        score: 80,
        source,
      })
      s.score += 180
      playSuccessTone(4)
      playWordPronunciation(word.word)
    }
    s.challenge = null
    s.phase = 'playing'
    s.status = '继续冒险'
    publish()
  }, [publish])

  const hurtPlayer = useCallback((sourceId) => {
    const s = stateRef.current
    const now = performance.now()
    if (!s || now < s.player.invincibleUntil) return
    s.damageCount += 1
    s.player.health -= 1
    s.player.invincibleUntil = now + 1300
    s.status = '小心障碍'
    playSuccessTone(1)

    if (s.player.health <= 0) {
      s.completed = false
      s.finishReason = sourceId || 'damage'
      s.finished = true
    }
  }, [])

  const finishRun = useCallback((completed) => {
    const s = stateRef.current
    if (!s || s.reported) return
    s.reported = true
    const durationSeconds = s.startedAt
      ? Math.max(1, Math.round((performance.now() - s.startedAt) / 1000))
      : 0
    const learnedIds = new Set(s.learnedWords.map((word) => word.id))
    const missedWords = s.words.filter((word) => !learnedIds.has(word.id))

    finishArcade({
      playMode: 'platformer',
      arcadeVersus: false,
      sessionTotal: s.words.length,
      allWords: s.words,
      poppedWords: s.learnedWords,
      missedWords,
      missed: missedWords.length,
      player1Hits: s.learnedWords.length,
      player2Hits: 0,
      score: s.score,
      rankScore: s.score,
      durationSeconds,
      coins: s.collectedCoinIds.size,
      completed,
      damageCount: s.damageCount,
      deathCount: s.deathCount,
      platformerStats: {
        levelId: LEVEL_ID,
        completed,
        maxX: Number(s.maxX.toFixed(2)),
        coinsCollected: [...s.collectedCoinIds],
        enemiesDefeated: [...s.defeatedEnemyIds],
        wordBoxResults: s.words.map((word) => ({
          id: word.id,
          word: word.word,
          learned: learnedIds.has(word.id),
        })),
      },
    })
  }, [finishArcade])

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const s = stateRef.current
    if (!canvas || !ctx || !s) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const vw = canvas.clientWidth || window.innerWidth || 390
    const vh = canvas.clientHeight || window.innerHeight || 820
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, vw, vh)

    const scale = Math.min(vw / 13.8, vh / 7.4)
    const cameraX = clamp(s.player.x - 4.2, -0.8, 32.5)
    const baseY = vh - Math.max(76, vh * 0.14)
    const wx = (x) => (x - cameraX) * scale
    const wy = (y) => baseY - y * scale

    const sky = ctx.createLinearGradient(0, 0, 0, vh)
    sky.addColorStop(0, '#7dd3fc')
    sky.addColorStop(0.48, '#dbeafe')
    sky.addColorStop(1, '#fef3c7')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, vw, vh)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.76)'
    ;[
      [3.5, 5.7, 1.4],
      [12, 5.15, 1.1],
      [21, 5.8, 1.35],
      [34, 5.25, 1.2],
    ].forEach(([x, y, r]) => {
      const sx = wx(x)
      const sy = wy(y)
      ctx.beginPath()
      ctx.arc(sx, sy, r * scale * 0.36, 0, Math.PI * 2)
      ctx.arc(sx + r * scale * 0.28, sy + 5, r * scale * 0.29, 0, Math.PI * 2)
      ctx.arc(sx - r * scale * 0.28, sy + 8, r * scale * 0.25, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.fillStyle = 'rgba(53, 214, 180, 0.22)'
    ctx.beginPath()
    ctx.moveTo(0, baseY + scale * 0.1)
    for (let i = 0; i <= 9; i += 1) {
      const x = i * (vw / 8)
      const y = baseY - Math.sin(i * 0.9) * scale * 0.26
      ctx.lineTo(x, y)
    }
    ctx.lineTo(vw, vh)
    ctx.lineTo(0, vh)
    ctx.fill()

    PLATFORMS.forEach((platform) => {
      const x = wx(platform.x)
      const y = wy(platform.y + platform.h)
      const w = platform.w * scale
      const h = platform.h * scale
      ctx.fillStyle = platform.type === 'spring' ? '#facc15' : platform.type === 'ground' ? '#35d6b4' : '#f8fafc'
      roundedRect(ctx, x, y, w, h, 8)
      ctx.fill()
      ctx.fillStyle =
        platform.type === 'spring'
          ? 'rgba(120, 53, 15, 0.42)'
          : platform.type === 'ground'
            ? 'rgba(6, 95, 70, 0.28)'
            : 'rgba(14, 116, 144, 0.16)'
      ctx.fillRect(x, y + h * 0.58, w, h * 0.42)
    })

    COINS.forEach((coin) => {
      if (s.collectedCoinIds.has(coin.id)) return
      const bob = Math.sin(performance.now() * 0.004 + coin.x) * 4
      const x = wx(coin.x)
      const y = wy(coin.y) + bob
      ctx.fillStyle = coin.score >= 50 ? '#f97316' : '#facc15'
      ctx.beginPath()
      ctx.ellipse(x, y, scale * 0.16, scale * 0.24, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    WORD_BOXES.forEach((box, index) => {
      const opened = s.openedBoxIds.has(box.id)
      const x = wx(box.x)
      const y = wy(box.y + 0.7)
      const size = scale * 0.7
      ctx.fillStyle = opened ? 'rgba(148, 163, 184, 0.72)' : '#8b5cf6'
      roundedRect(ctx, x, y, size, size, 8)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `900 ${Math.max(13, scale * 0.2)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(opened ? '✓' : s.words[index]?.word?.[0]?.toUpperCase() || '?', x + size / 2, y + size * 0.58)
    })

    s.enemies.forEach((enemy) => {
      if (s.defeatedEnemyIds.has(enemy.id)) return
      const x = wx(enemy.x)
      const y = wy(enemy.y + enemy.h)
      const w = enemy.w * scale
      const h = enemy.h * scale
      ctx.fillStyle = '#fb7185'
      roundedRect(ctx, x, y, w, h, 12)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(x + w * 0.32, y + h * 0.38, 3.5, 0, Math.PI * 2)
      ctx.arc(x + w * 0.68, y + h * 0.38, 3.5, 0, Math.PI * 2)
      ctx.fill()
    })

    const flagX = wx(43.2)
    const flagBase = wy(0.7)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(flagX, flagBase)
    ctx.lineTo(flagX, wy(4.2))
    ctx.stroke()
    ctx.fillStyle = '#22d3ee'
    ctx.beginPath()
    ctx.moveTo(flagX + 2, wy(4.15))
    ctx.lineTo(flagX + scale * 0.85, wy(3.75))
    ctx.lineTo(flagX + 2, wy(3.35))
    ctx.closePath()
    ctx.fill()

    const p = s.player
    const px = wx(p.x)
    const py = wy(p.y + p.h)
    const pw = p.w * scale
    const ph = p.h * scale
    const blinking = p.invincibleUntil > performance.now() && Math.floor(performance.now() / 90) % 2 === 0
    if (!blinking) {
      const body = ctx.createLinearGradient(px, py, px + pw, py + ph)
      body.addColorStop(0, '#ff6fae')
      body.addColorStop(1, '#2364ff')
      ctx.fillStyle = body
      roundedRect(ctx, px, py, pw, ph, 12)
      ctx.fill()
      ctx.fillStyle = '#fef3c7'
      ctx.beginPath()
      ctx.arc(px + pw * 0.5, py + ph * 0.28, pw * 0.34, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#172033'
      ctx.beginPath()
      ctx.arc(px + pw * 0.39, py + ph * 0.25, 2.6, 0, Math.PI * 2)
      ctx.arc(px + pw * 0.61, py + ph * 0.25, 2.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
      ctx.beginPath()
      ctx.arc(px + pw * 0.72, py + ph * 0.13, pw * 0.14, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  useEffect(() => {
    stateRef.current = {
      phase: 'calibrating',
      status: '站稳校准',
      quality: 0,
      countdown: 3,
      countdownStartedAt: 0,
      startedAt: 0,
      finished: false,
      reported: false,
      completed: false,
      finishReason: '',
      calibrationSamples: [],
      calibration: null,
      words: arcadeSessionWords.slice(0, 5),
      player: {
        x: 1.2,
        y: 0.75,
        vx: 0,
        vy: 0,
        w: PLAYER_W,
        h: PLAYER_H,
        grounded: false,
        health: 3,
        invincibleUntil: 0,
      },
      checkpoint: { x: 1.2, y: 0.75 },
      enemies: ENEMIES.map((enemy) => ({ ...enemy, dir: 1 })),
      collectedCoinIds: new Set(),
      openedBoxIds: new Set(),
      defeatedEnemyIds: new Set(),
      learnedWords: [],
      challenge: null,
      score: 0,
      damageCount: 0,
      deathCount: 0,
      maxX: 1.2,
      lastJumpAt: -Infinity,
      poseJumpActive: false,
      keyJumpActive: false,
      lastPublishAt: 0,
    }
    resizeCanvas()
    publish()
    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [arcadeSessionWords, publish, resizeCanvas])

  useEffect(() => {
    const down = (event) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar'].includes(event.key)) {
        event.preventDefault()
      }
      keysRef.current.add(event.key.toLowerCase())
      const s = stateRef.current
      if (s?.phase === 'calibrating' && (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar')) {
        s.calibration = KEYBOARD_CALIBRATION
        startCountdown(s, performance.now(), '键盘模式准备')
        publish()
      }
      if (event.key === 'Enter' || event.key.toLowerCase() === 'e') {
        completeChallenge('keyboard')
      }
    }
    const up = (event) => {
      keysRef.current.delete(event.key.toLowerCase())
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [completeChallenge])

  useEffect(() => {
    if (gameState !== 'arcade_playing' || playMode !== 'platformer') return undefined

    let last = performance.now()
    const step = () => {
      const s = stateRef.current
      if (!s) return
      const now = performance.now()
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const pose = poseSnapshot(getLatestPose())
      s.quality = pose.quality || 0

      if (s.phase === 'calibrating') {
        if (pose.ok) {
          s.calibrationSamples.push(pose)
          s.status = `站稳校准 ${Math.min(s.calibrationSamples.length, CALIBRATION_FRAMES)}/${CALIBRATION_FRAMES}`
          if (s.calibrationSamples.length >= CALIBRATION_FRAMES) {
            s.calibration = {
              centerX: median(s.calibrationSamples.map((sample) => sample.centerX)),
              hipY: median(s.calibrationSamples.map((sample) => sample.hipY)),
              bodyHeight: median(s.calibrationSamples.map((sample) => sample.bodyHeight)),
            }
            startCountdown(s, now)
          }
        } else {
          s.calibrationSamples = []
          s.status = '请全身入镜，或按 Enter 键盘体验'
        }
      } else if (s.phase === 'countdown') {
        s.countdown = Math.max(1, Math.ceil((COUNTDOWN_MS - (now - s.countdownStartedAt)) / 1000))
        s.status = `${s.countdown}`
        if (now - s.countdownStartedAt >= COUNTDOWN_MS) {
          s.phase = 'playing'
          s.startedAt = now
          s.status = '开始冒险'
        }
      } else if (s.phase === 'wordChallenge') {
        const jumpNow = pose.ok && pose.handsUp
        if (jumpNow && !s.poseJumpActive) {
          completeChallenge('gesture')
        }
        s.poseJumpActive = jumpNow
        s.status = '举起双手或按 E 完成单词挑战'
      } else if (s.phase === 'playing') {
        const keys = keysRef.current
        const leftKey = keys.has('a') || keys.has('arrowleft')
        const rightKey = keys.has('d') || keys.has('arrowright')
        const jumpKey = keys.has(' ') || keys.has('spacebar') || keys.has('w') || keys.has('arrowup')
        let move = 0
        let poseJump = false

        if (pose.ok && s.calibration) {
          const dx = pose.centerX - s.calibration.centerX
          if (dx < -0.042) move -= 1
          if (dx > 0.042) move += 1
          poseJump = pose.handsUp || pose.hipY < s.calibration.hipY - s.calibration.bodyHeight * 0.075
        } else if (!pose.ok) {
          s.status = '回到镜头继续'
        }

        if (leftKey) move -= 1
        if (rightKey) move += 1
        move = clamp(move, -1, 1)
        const jumpPressed = (poseJump && !s.poseJumpActive) || (jumpKey && !s.keyJumpActive)
        s.poseJumpActive = poseJump
        s.keyJumpActive = jumpKey

        const p = s.player
        const control = p.grounded ? 1 : AIR_CONTROL
        p.vx += move * WALK_ACCEL * control * dt
        p.vx = clamp(p.vx, -MAX_WALK_SPEED, MAX_WALK_SPEED)
        if (move === 0) {
          p.vx *= p.grounded ? FRICTION : AIR_FRICTION
          if (Math.abs(p.vx) < 0.02) p.vx = 0
        }

        if (jumpPressed && p.grounded && now - s.lastJumpAt > JUMP_COOLDOWN_MS) {
          p.vy = JUMP_VELOCITY
          p.grounded = false
          s.lastJumpAt = now
          s.status = '跳跃'
          playSuccessTone(1)
        }

        p.vy = Math.max(-18, p.vy + GRAVITY * dt)
        const prev = { x: p.x, y: p.y }

        p.x += p.vx * dt
        for (const platform of PLATFORMS) {
          if (!intersects(p, platform)) continue
          if (p.vx > 0) p.x = platform.x - p.w
          if (p.vx < 0) p.x = platform.x + platform.w
          p.vx = 0
        }

        p.y += p.vy * dt
        p.grounded = false
        for (const platform of PLATFORMS) {
          if (!intersects(p, platform)) continue
          if (p.vy <= 0 && prev.y >= platform.y + platform.h - 0.08) {
            p.y = platform.y + platform.h
            p.vy = platform.type === 'spring' ? JUMP_VELOCITY * 1.22 : 0
            p.grounded = platform.type !== 'spring'
            if (platform.type === 'spring') playSuccessTone(3)
          } else if (p.vy > 0) {
            p.y = platform.y - p.h
            p.vy = 0
          }
        }

        p.x = clamp(p.x, -0.5, 44.1)
        s.maxX = Math.max(s.maxX, p.x)
        if (p.grounded && p.x > s.checkpoint.x + 5) {
          s.checkpoint = { x: p.x, y: p.y }
        }

        COINS.forEach((coin) => {
          if (s.collectedCoinIds.has(coin.id)) return
          if (circleHitRect(coin.x, coin.y, 0.34, p)) {
            s.collectedCoinIds.add(coin.id)
            s.score += coin.score
            s.status = `金币 +${coin.score}`
            playSuccessTone(2)
          }
        })

        WORD_BOXES.forEach((box, index) => {
          if (s.openedBoxIds.has(box.id) || s.challenge) return
          const rect = { x: box.x, y: box.y, w: 0.72, h: 0.72 }
          if (!intersects(p, rect)) return
          const word = s.words[index]
          if (!word) return
          s.phase = 'wordChallenge'
          s.challenge = { boxId: box.id, word, action: box.action }
          s.status = '单词挑战'
          playWordPronunciation(word.word)
        })

        s.enemies.forEach((enemy) => {
          if (s.defeatedEnemyIds.has(enemy.id)) return
          enemy.x += enemy.dir * enemy.speed * dt
          if (enemy.x < enemy.minX) {
            enemy.x = enemy.minX
            enemy.dir = 1
          }
          if (enemy.x > enemy.maxX) {
            enemy.x = enemy.maxX
            enemy.dir = -1
          }
          if (!intersects(p, enemy)) return
          if (prev.y >= enemy.y + enemy.h * 0.62 && p.vy < 0) {
            s.defeatedEnemyIds.add(enemy.id)
            s.score += 100
            p.vy = JUMP_VELOCITY * 0.58
            s.status = '踩掉障碍 +100'
            playSuccessTone(4)
          } else {
            hurtPlayer(enemy.id)
          }
        })

        if (p.y < -3) {
          s.deathCount += 1
          hurtPlayer('fall')
          p.x = s.checkpoint.x
          p.y = s.checkpoint.y + 0.2
          p.vx = 0
          p.vy = 0
        }

        if (p.x >= 42.8) {
          s.completed = true
          s.finished = true
          s.score += Math.max(0, Math.ceil(ROUND_SECONDS - (now - s.startedAt) / 1000)) * 3
          s.status = '通关'
        }

        if (s.startedAt && now - s.startedAt >= ROUND_SECONDS * 1000) {
          s.finished = true
          s.completed = false
          s.finishReason = 'timeout'
        }
      }

      drawScene()

      if (s.finished) {
        finishRun(s.completed)
        return
      }

      if (now - s.lastPublishAt > 120) {
        s.lastPublishAt = now
        publish()
      }
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [completeChallenge, drawScene, finishRun, gameState, hurtPlayer, playMode, publish])

  if (gameState !== 'arcade_playing' || playMode !== 'platformer') return null

  const challenge = ui.challenge

  return (
    <div className="platformer-overlay">
      <canvas ref={canvasRef} className="platformer-canvas" />

      <section className="platformer-hud" aria-label="星光大冒险">
        <div>
          <span>生命</span>
          <strong>{'♥'.repeat(Math.max(0, ui.health)) || '0'}</strong>
        </div>
        <div>
          <span>分数</span>
          <strong>{ui.score}</strong>
        </div>
        <div>
          <span>金币</span>
          <strong>{ui.coins}</strong>
        </div>
        <div>
          <span>单词</span>
          <strong>{ui.learned}/5</strong>
        </div>
        <div>
          <span>时间</span>
          <strong>{ui.secondsLeft}</strong>
        </div>
      </section>

      <div className="platformer-status">
        <span>{ui.status}</span>
        <em>入镜 {ui.quality}%</em>
      </div>

      {ui.phase !== 'playing' && ui.phase !== 'wordChallenge' && (
        <div className="platformer-ready">
          <span>{ui.phase === 'calibrating' ? '站稳校准' : '准备出发'}</span>
          <strong>{ui.phase === 'calibrating' ? `${ui.quality}%` : ui.countdown}</strong>
        </div>
      )}

      {challenge && (
        <div className="platformer-word-card">
          <span>单词方块</span>
          <strong>{challenge.word.word}</strong>
          <em>{challenge.word.meaning}</em>
          <p>举起双手或按 E 收集这个单词</p>
        </div>
      )}

      <div className="platformer-controls">
        <span>左倾 / A</span>
        <span>右倾 / D</span>
        <span>举手跳 / Space</span>
      </div>
    </div>
  )
}

export default PlatformerOverlay
