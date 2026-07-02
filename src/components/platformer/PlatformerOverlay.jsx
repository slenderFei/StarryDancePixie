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

const WORDS_PER_LEVEL = 5
const ROUND_SECONDS = 240
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

const LEVELS = [
  {
    id: 'sunny-valley-1',
    name: '阳光山谷',
    subtitle: '熟悉移动和跳跃节奏',
    spawn: { x: 1.2, y: 0.75 },
    finishX: 42.8,
    flagX: 43.2,
    cameraMinX: -0.8,
    cameraMaxX: 32.5,
    palette: {
      sky: ['#7dd3fc', '#dbeafe', '#fef3c7'],
      ground: '#35d6b4',
      groundShade: 'rgba(6, 95, 70, 0.28)',
      platform: '#f8fafc',
      accent: '#22d3ee',
      hill: 'rgba(53, 214, 180, 0.24)',
      farHill: 'rgba(14, 165, 233, 0.16)',
    },
    platforms: [
      { id: 'l1-ground-1', type: 'ground', x: -1, y: 0, w: 10.5, h: 0.7 },
      { id: 'l1-p-1', type: 'float', x: 10.5, y: 1.45, w: 3.5, h: 0.45 },
      { id: 'l1-p-2', type: 'float', x: 15.5, y: 2.45, w: 3.4, h: 0.45 },
      { id: 'l1-ground-2', type: 'ground', x: 20.2, y: 0, w: 6.2, h: 0.7 },
      { id: 'l1-p-3', type: 'float', x: 26.8, y: 1.7, w: 3.4, h: 0.45 },
      { id: 'l1-p-4', type: 'spring', x: 31.8, y: 2.55, w: 3.3, h: 0.45 },
      { id: 'l1-ground-3', type: 'ground', x: 36.8, y: 0, w: 9.5, h: 0.7 },
    ],
    coins: [
      { id: 'l1-c-1', x: 3.2, y: 1.65, score: 10 },
      { id: 'l1-c-2', x: 6.2, y: 1.65, score: 10 },
      { id: 'l1-c-3', x: 11.6, y: 2.45, score: 10 },
      { id: 'l1-c-4', x: 16.7, y: 3.45, score: 10 },
      { id: 'l1-c-5', x: 23.5, y: 1.65, score: 10 },
      { id: 'l1-c-6', x: 28.3, y: 2.7, score: 10 },
      { id: 'l1-c-7', x: 33.1, y: 3.55, score: 50 },
      { id: 'l1-c-8', x: 40.5, y: 1.65, score: 10 },
    ],
    wordBoxes: [
      { id: 'l1-w-1', x: 7.6, y: 2.2, action: 'hands_up' },
      { id: 'l1-w-2', x: 13.0, y: 2.85, action: 'hands_up' },
      { id: 'l1-w-3', x: 22.0, y: 2.0, action: 'jump' },
      { id: 'l1-w-4', x: 29.1, y: 3.0, action: 'hands_up' },
      { id: 'l1-w-5', x: 38.8, y: 2.2, action: 'hands_up' },
    ],
    enemies: [
      { id: 'l1-e-1', type: 'walker', x: 21.7, y: 0.7, w: 0.78, h: 0.68, minX: 21.1, maxX: 25.1, speed: 0.95 },
      { id: 'l1-e-2', type: 'walker', x: 38.3, y: 0.7, w: 0.78, h: 0.68, minX: 37.6, maxX: 42.3, speed: 1.08 },
    ],
  },
  {
    id: 'crystal-cavern-2',
    name: '水晶洞穴',
    subtitle: '平台更窄，注意落点',
    spawn: { x: 1.0, y: 0.85 },
    finishX: 45.4,
    flagX: 45.8,
    cameraMinX: -0.8,
    cameraMaxX: 35.6,
    palette: {
      sky: ['#172554', '#312e81', '#0f766e'],
      ground: '#67e8f9',
      groundShade: 'rgba(8, 47, 73, 0.46)',
      platform: '#e0f2fe',
      accent: '#a78bfa',
      hill: 'rgba(103, 232, 249, 0.18)',
      farHill: 'rgba(167, 139, 250, 0.16)',
    },
    platforms: [
      { id: 'l2-ground-1', type: 'ground', x: -1, y: 0, w: 8.2, h: 0.7 },
      { id: 'l2-p-1', type: 'crystal', x: 8.6, y: 1.25, w: 2.9, h: 0.42 },
      { id: 'l2-p-2', type: 'crystal', x: 12.7, y: 2.22, w: 2.8, h: 0.42 },
      { id: 'l2-p-3', type: 'spring', x: 17.2, y: 1.08, w: 2.7, h: 0.42 },
      { id: 'l2-ground-2', type: 'ground', x: 21.1, y: 0, w: 5.5, h: 0.7 },
      { id: 'l2-p-4', type: 'crystal', x: 27.1, y: 1.65, w: 2.7, h: 0.42 },
      { id: 'l2-p-5', type: 'crystal', x: 31.8, y: 2.65, w: 2.9, h: 0.42 },
      { id: 'l2-p-6', type: 'spring', x: 35.9, y: 1.08, w: 2.6, h: 0.42 },
      { id: 'l2-ground-3', type: 'ground', x: 40.1, y: 0, w: 7.0, h: 0.7 },
    ],
    coins: [
      { id: 'l2-c-1', x: 4.2, y: 1.65, score: 10 },
      { id: 'l2-c-2', x: 9.7, y: 2.1, score: 10 },
      { id: 'l2-c-3', x: 13.7, y: 3.0, score: 10 },
      { id: 'l2-c-4', x: 18.4, y: 2.55, score: 50 },
      { id: 'l2-c-5', x: 23.9, y: 1.65, score: 10 },
      { id: 'l2-c-6', x: 28.2, y: 2.55, score: 10 },
      { id: 'l2-c-7', x: 33.2, y: 3.55, score: 10 },
      { id: 'l2-c-8', x: 42.8, y: 1.65, score: 50 },
    ],
    wordBoxes: [
      { id: 'l2-w-1', x: 6.2, y: 2.2, action: 'hands_up' },
      { id: 'l2-w-2', x: 12.9, y: 3.05, action: 'hands_up' },
      { id: 'l2-w-3', x: 22.8, y: 2.0, action: 'jump' },
      { id: 'l2-w-4', x: 31.9, y: 3.22, action: 'hands_up' },
      { id: 'l2-w-5', x: 41.6, y: 2.2, action: 'hands_up' },
    ],
    enemies: [
      { id: 'l2-e-1', type: 'spinner', x: 22.4, y: 0.72, w: 0.8, h: 0.72, minX: 21.6, maxX: 25.3, speed: 1.15 },
      { id: 'l2-e-2', type: 'walker', x: 40.9, y: 0.72, w: 0.82, h: 0.7, minX: 40.3, maxX: 44.9, speed: 1.18 },
      { id: 'l2-e-3', type: 'spinner', x: 34.1, y: 3.1, w: 0.72, h: 0.62, minX: 32.2, maxX: 34.2, speed: 0.78 },
    ],
  },
  {
    id: 'cloud-tower-3',
    name: '云端高塔',
    subtitle: '连续跳跃，冲向终点',
    spawn: { x: 1.1, y: 0.85 },
    finishX: 48.4,
    flagX: 48.8,
    cameraMinX: -0.8,
    cameraMaxX: 38.6,
    palette: {
      sky: ['#38bdf8', '#f0f9ff', '#ffe4e6'],
      ground: '#f0abfc',
      groundShade: 'rgba(134, 25, 143, 0.24)',
      platform: '#ffffff',
      accent: '#fb7185',
      hill: 'rgba(251, 113, 133, 0.15)',
      farHill: 'rgba(56, 189, 248, 0.16)',
    },
    platforms: [
      { id: 'l3-ground-1', type: 'ground', x: -1, y: 0, w: 7.4, h: 0.7 },
      { id: 'l3-p-1', type: 'cloud', x: 7.7, y: 1.35, w: 2.7, h: 0.42 },
      { id: 'l3-p-2', type: 'cloud', x: 11.6, y: 2.35, w: 2.55, h: 0.42 },
      { id: 'l3-p-3', type: 'spring', x: 15.3, y: 3.15, w: 2.5, h: 0.42 },
      { id: 'l3-p-4', type: 'cloud', x: 19.4, y: 2.1, w: 2.8, h: 0.42 },
      { id: 'l3-ground-2', type: 'ground', x: 23.4, y: 0, w: 4.8, h: 0.7 },
      { id: 'l3-p-5', type: 'cloud', x: 29.0, y: 1.75, w: 2.7, h: 0.42 },
      { id: 'l3-p-6', type: 'cloud', x: 33.0, y: 2.8, w: 2.7, h: 0.42 },
      { id: 'l3-p-7', type: 'spring', x: 37.3, y: 1.2, w: 2.6, h: 0.42 },
      { id: 'l3-ground-3', type: 'ground', x: 41.6, y: 0, w: 8.7, h: 0.7 },
    ],
    coins: [
      { id: 'l3-c-1', x: 3.6, y: 1.65, score: 10 },
      { id: 'l3-c-2', x: 8.8, y: 2.25, score: 10 },
      { id: 'l3-c-3', x: 12.6, y: 3.25, score: 10 },
      { id: 'l3-c-4', x: 16.4, y: 4.18, score: 50 },
      { id: 'l3-c-5', x: 20.7, y: 3.02, score: 10 },
      { id: 'l3-c-6', x: 30.2, y: 2.65, score: 10 },
      { id: 'l3-c-7', x: 34.3, y: 3.8, score: 10 },
      { id: 'l3-c-8', x: 38.4, y: 2.72, score: 50 },
      { id: 'l3-c-9', x: 46.2, y: 1.65, score: 50 },
    ],
    wordBoxes: [
      { id: 'l3-w-1', x: 6.0, y: 2.2, action: 'hands_up' },
      { id: 'l3-w-2', x: 12.0, y: 3.12, action: 'hands_up' },
      { id: 'l3-w-3', x: 23.8, y: 2.05, action: 'jump' },
      { id: 'l3-w-4', x: 33.2, y: 3.42, action: 'hands_up' },
      { id: 'l3-w-5', x: 45.0, y: 2.2, action: 'hands_up' },
    ],
    enemies: [
      { id: 'l3-e-1', type: 'walker', x: 24.6, y: 0.72, w: 0.78, h: 0.68, minX: 23.8, maxX: 27.4, speed: 1.25 },
      { id: 'l3-e-2', type: 'spinner', x: 42.7, y: 0.72, w: 0.8, h: 0.72, minX: 42.1, maxX: 46.8, speed: 1.35 },
      { id: 'l3-e-3', type: 'walker', x: 30.6, y: 2.17, w: 0.74, h: 0.62, minX: 29.2, maxX: 31.2, speed: 0.8 },
    ],
  },
]

const TOTAL_WORDS = LEVELS.length * WORDS_PER_LEVEL

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

function currentLevel(s) {
  return LEVELS[s?.levelIndex || 0] || LEVELS[0]
}

function wordIndexForBox(levelIndex, boxIndex) {
  return levelIndex * WORDS_PER_LEVEL + boxIndex
}

function startCountdown(s, now, status = '准备') {
  s.phase = 'countdown'
  s.countdownStartedAt = now
  s.status = status
}

function enterLevel(s, levelIndex, now, status) {
  const level = LEVELS[levelIndex] || LEVELS[0]
  s.levelIndex = levelIndex
  s.player.x = level.spawn.x
  s.player.y = level.spawn.y
  s.player.vx = 0
  s.player.vy = 0
  s.player.grounded = false
  s.checkpoint = { ...level.spawn }
  s.enemies = level.enemies.map((enemy) => ({ ...enemy, dir: 1 }))
  s.poseJumpActive = false
  s.keyJumpActive = false
  s.lastJumpAt = -Infinity
  startCountdown(s, now, status || `${level.name} 准备`)
}

function platformColors(platform, palette) {
  if (platform.type === 'spring') {
    return { fill: '#facc15', shade: 'rgba(120, 53, 15, 0.42)', top: '#fef08a' }
  }
  if (platform.type === 'crystal') {
    return { fill: '#bae6fd', shade: 'rgba(14, 116, 144, 0.28)', top: '#f0f9ff' }
  }
  if (platform.type === 'cloud') {
    return { fill: '#ffffff', shade: 'rgba(14, 165, 233, 0.16)', top: '#f8fafc' }
  }
  if (platform.type === 'ground') {
    return { fill: palette.ground, shade: palette.groundShade, top: 'rgba(255, 255, 255, 0.36)' }
  }
  return { fill: palette.platform, shade: 'rgba(14, 116, 144, 0.16)', top: 'rgba(255, 255, 255, 0.46)' }
}

function drawStar(ctx, x, y, outer, inner, points = 5) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (i * Math.PI) / points
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

function drawCalibrationGuide(ctx, vw, vh, pose, progress) {
  const frameW = Math.min(vw * 0.72, 560)
  const frameH = Math.min(vh * 0.54, 520)
  const x = (vw - frameW) / 2
  const y = Math.max(118, Math.min(vh - frameH - 112, (vh - frameH) / 2 + 22))
  const ready = pose.ok && progress > 0.1
  const guideColor = ready ? '#86efac' : '#67e8f9'
  const centerX = x + frameW / 2

  ctx.save()
  roundedRect(ctx, x, y, frameW, frameH, 18)
  ctx.clip()
  ctx.clearRect(x - 2, y - 2, frameW + 4, frameH + 4)
  ctx.restore()

  ctx.save()
  ctx.fillStyle = 'rgba(8, 13, 30, 0.18)'
  roundedRect(ctx, x, y, frameW, frameH, 18)
  ctx.fill()

  ctx.strokeStyle = guideColor
  ctx.lineWidth = 3
  ctx.setLineDash([12, 8])
  roundedRect(ctx, x, y, frameW, frameH, 18)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(centerX, y + frameH * 0.08)
  ctx.lineTo(centerX, y + frameH * 0.92)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(254, 240, 138, 0.72)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x + frameW * 0.18, y + frameH * 0.82)
  ctx.lineTo(x + frameW * 0.82, y + frameH * 0.82)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.beginPath()
  ctx.arc(centerX, y + frameH * 0.18, frameW * 0.07, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(centerX, y + frameH * 0.28)
  ctx.lineTo(centerX, y + frameH * 0.58)
  ctx.moveTo(x + frameW * 0.31, y + frameH * 0.36)
  ctx.lineTo(x + frameW * 0.69, y + frameH * 0.36)
  ctx.moveTo(centerX, y + frameH * 0.58)
  ctx.lineTo(x + frameW * 0.36, y + frameH * 0.78)
  ctx.moveTo(centerX, y + frameH * 0.58)
  ctx.lineTo(x + frameW * 0.64, y + frameH * 0.78)
  ctx.stroke()

  ctx.fillStyle = 'rgba(254, 240, 138, 0.24)'
  ctx.beginPath()
  ctx.ellipse(x + frameW * 0.38, y + frameH * 0.84, frameW * 0.11, 10, 0, 0, Math.PI * 2)
  ctx.ellipse(x + frameW * 0.62, y + frameH * 0.84, frameW * 0.11, 10, 0, 0, Math.PI * 2)
  ctx.fill()

  if (pose.ok) {
    const dotX = clamp(pose.centerX * vw, x + 18, x + frameW - 18)
    const dotY = clamp(pose.hipY * vh, y + 18, y + frameH - 18)
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.arc(dotX, dotY, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.38)'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(dotX, dotY, 18, 0, Math.PI * 2)
    ctx.stroke()
  }

  const barW = frameW * 0.62
  const barX = x + (frameW - barW) / 2
  const barY = y + frameH + 18
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)'
  roundedRect(ctx, barX, barY, barW, 12, 6)
  ctx.fill()
  ctx.fillStyle = ready ? '#86efac' : '#67e8f9'
  roundedRect(ctx, barX, barY, barW * clamp(progress, 0, 1), 12, 6)
  ctx.fill()
  ctx.restore()
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
    levelIndex: 0,
    levelName: LEVELS[0].name,
    totalLevels: LEVELS.length,
    score: 0,
    coins: 0,
    health: 3,
    learned: 0,
    totalWords: TOTAL_WORDS,
    secondsLeft: ROUND_SECONDS,
    quality: 0,
    visibleCount: 0,
    calibrationProgress: 0,
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
    const level = currentLevel(s)
    setUi({
      phase: s.phase,
      status: s.status,
      countdown: s.countdown,
      levelIndex: s.levelIndex,
      levelName: level.name,
      totalLevels: LEVELS.length,
      score: s.score,
      coins: s.collectedCoinIds.size,
      health: s.player.health,
      learned: s.learnedWords.length,
      totalWords: s.words.length,
      secondsLeft: s.startedAt
        ? Math.max(0, Math.ceil(ROUND_SECONDS - (performance.now() - s.startedAt) / 1000))
        : ROUND_SECONDS,
      quality: s.quality,
      visibleCount: s.visibleCount || 0,
      calibrationProgress: s.calibrationProgress || 0,
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
        levelId: LEVELS.map((level) => level.id).join('+'),
        completed,
        maxX: Number(s.maxX.toFixed(2)),
        levelsCompleted: completed ? LEVELS.length : s.levelsCompleted,
        totalLevels: LEVELS.length,
        levelProgress: s.levelProgress.map((progress) => Number(progress.toFixed(2))),
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

    const level = currentLevel(s)
    const palette = level.palette
    const scale = Math.min(vw / 13.8, vh / 7.5)
    const cameraX = clamp(s.player.x - 4.2, level.cameraMinX, level.cameraMaxX)
    const baseY = vh - Math.max(76, vh * 0.14)
    const wx = (x) => (x - cameraX) * scale
    const wy = (y) => baseY - y * scale

    const sky = ctx.createLinearGradient(0, 0, 0, vh)
    sky.addColorStop(0, palette.sky[0])
    sky.addColorStop(0.5, palette.sky[1])
    sky.addColorStop(1, palette.sky[2])
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, vw, vh)

    ctx.fillStyle = s.levelIndex === 1 ? 'rgba(224, 242, 254, 0.28)' : 'rgba(255, 255, 255, 0.76)'
    ;[
      [3.5, 5.7, 1.4],
      [12, 5.15, 1.1],
      [21, 5.8, 1.35],
      [34, 5.25, 1.2],
      [44, 5.75, 1.05],
    ].forEach(([x, y, r]) => {
      const sx = wx(x)
      const sy = wy(y)
      ctx.beginPath()
      ctx.arc(sx, sy, r * scale * 0.36, 0, Math.PI * 2)
      ctx.arc(sx + r * scale * 0.28, sy + 5, r * scale * 0.29, 0, Math.PI * 2)
      ctx.arc(sx - r * scale * 0.28, sy + 8, r * scale * 0.25, 0, Math.PI * 2)
      ctx.fill()
    })

    const orbX = wx(s.levelIndex === 1 ? 9 : 5.2)
    const orbY = wy(s.levelIndex === 1 ? 5.1 : 5.7)
    const orb = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, scale * 1.2)
    orb.addColorStop(0, s.levelIndex === 1 ? 'rgba(199, 210, 254, 0.7)' : 'rgba(254, 240, 138, 0.82)')
    orb.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = orb
    ctx.beginPath()
    ctx.arc(orbX, orbY, scale * 1.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = palette.farHill
    ctx.beginPath()
    ctx.moveTo(0, baseY + scale * 0.2)
    for (let i = 0; i <= 10; i += 1) {
      const x = i * (vw / 9)
      const y = baseY - Math.sin(i * 0.72 + s.levelIndex) * scale * 0.4 - scale * 0.55
      ctx.lineTo(x, y)
    }
    ctx.lineTo(vw, vh)
    ctx.lineTo(0, vh)
    ctx.fill()

    ctx.fillStyle = palette.hill
    ctx.beginPath()
    ctx.moveTo(0, baseY + scale * 0.1)
    for (let i = 0; i <= 9; i += 1) {
      const x = i * (vw / 8)
      const y = baseY - Math.sin(i * 0.9 + s.levelIndex * 0.45) * scale * 0.3
      ctx.lineTo(x, y)
    }
    ctx.lineTo(vw, vh)
    ctx.lineTo(0, vh)
    ctx.fill()

    if (s.phase === 'calibrating') {
      drawCalibrationGuide(ctx, vw, vh, s.poseSnapshot || { ok: false }, s.calibrationProgress || 0)
      return
    }

    if (s.levelIndex === 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
      for (let i = 0; i < 16; i += 1) {
        const x = wx(2.5 + i * 3.2)
        const y = wy(0.6 + (i % 4) * 0.45)
        drawStar(ctx, x, y, 5 + (i % 3) * 2, 2.5, 4)
        ctx.fill()
      }
    }

    level.platforms.forEach((platform) => {
      const x = wx(platform.x)
      const y = wy(platform.y + platform.h)
      const w = platform.w * scale
      const h = platform.h * scale
      const colors = platformColors(platform, palette)
      ctx.fillStyle = colors.fill
      roundedRect(ctx, x, y, w, h, 8)
      ctx.fill()
      ctx.fillStyle = colors.top
      roundedRect(ctx, x + 4, y + 4, Math.max(0, w - 8), Math.max(2, h * 0.22), 5)
      ctx.fill()
      ctx.fillStyle = colors.shade
      ctx.fillRect(x, y + h * 0.58, w, h * 0.42)

      if (platform.type === 'spring') {
        ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)'
        ctx.lineWidth = 2
        for (let i = 0; i < 4; i += 1) {
          ctx.beginPath()
          ctx.moveTo(x + w * (0.18 + i * 0.18), y + h * 0.7)
          ctx.lineTo(x + w * (0.26 + i * 0.18), y + h * 0.28)
          ctx.stroke()
        }
      }
    })

    level.coins.forEach((coin) => {
      if (s.collectedCoinIds.has(coin.id)) return
      const bob = Math.sin(performance.now() * 0.004 + coin.x) * 4
      const x = wx(coin.x)
      const y = wy(coin.y) + bob
      const coinGradient = ctx.createRadialGradient(x - 3, y - 4, 2, x, y, scale * 0.28)
      coinGradient.addColorStop(0, '#fff7ed')
      coinGradient.addColorStop(0.55, coin.score >= 50 ? '#fb923c' : '#facc15')
      coinGradient.addColorStop(1, coin.score >= 50 ? '#c2410c' : '#ca8a04')
      ctx.fillStyle = coinGradient
      ctx.beginPath()
      ctx.ellipse(x, y, scale * 0.16, scale * 0.24, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
      ctx.fillRect(x - 1, y - scale * 0.16, 2, scale * 0.32)
    })

    level.wordBoxes.forEach((box, index) => {
      const opened = s.openedBoxIds.has(box.id)
      const x = wx(box.x)
      const y = wy(box.y + 0.7)
      const size = scale * 0.7
      const boxGradient = ctx.createLinearGradient(x, y, x + size, y + size)
      if (opened) {
        boxGradient.addColorStop(0, 'rgba(148, 163, 184, 0.74)')
        boxGradient.addColorStop(1, 'rgba(71, 85, 105, 0.72)')
      } else {
        boxGradient.addColorStop(0, '#a78bfa')
        boxGradient.addColorStop(0.55, palette.accent)
        boxGradient.addColorStop(1, '#4f46e5')
      }
      ctx.fillStyle = boxGradient
      roundedRect(ctx, x, y, size, size, 8)
      ctx.fill()
      ctx.strokeStyle = opened ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.62)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = `900 ${Math.max(13, scale * 0.2)}px sans-serif`
      ctx.textAlign = 'center'
      const word = s.words[wordIndexForBox(s.levelIndex, index)]
      ctx.fillText(opened ? '✓' : word?.word?.[0]?.toUpperCase() || '?', x + size / 2, y + size * 0.58)
    })

    s.enemies.forEach((enemy) => {
      if (s.defeatedEnemyIds.has(enemy.id)) return
      const x = wx(enemy.x)
      const y = wy(enemy.y + enemy.h)
      const w = enemy.w * scale
      const h = enemy.h * scale
      ctx.fillStyle = enemy.type === 'spinner' ? '#a78bfa' : '#fb7185'
      roundedRect(ctx, x, y, w, h, 12)
      ctx.fill()
      if (enemy.type === 'spinner') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + w * 0.16, y + h * 0.72)
        ctx.lineTo(x + w * 0.84, y + h * 0.26)
        ctx.moveTo(x + w * 0.18, y + h * 0.24)
        ctx.lineTo(x + w * 0.82, y + h * 0.74)
        ctx.stroke()
      }
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(x + w * 0.32, y + h * 0.38, 3.5, 0, Math.PI * 2)
      ctx.arc(x + w * 0.68, y + h * 0.38, 3.5, 0, Math.PI * 2)
      ctx.fill()
    })

    const flagX = wx(level.flagX)
    const flagBase = wy(0.7)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(flagX, flagBase)
    ctx.lineTo(flagX, wy(4.2))
    ctx.stroke()
    ctx.fillStyle = palette.accent
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
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)'
    ctx.beginPath()
    ctx.ellipse(px + pw * 0.5, wy(p.y), pw * 0.78, Math.max(4, scale * 0.08), 0, 0, Math.PI * 2)
    ctx.fill()
    if (!blinking) {
      ctx.fillStyle = 'rgba(236, 72, 153, 0.72)'
      ctx.beginPath()
      ctx.moveTo(px + pw * 0.22, py + ph * 0.34)
      ctx.lineTo(px - pw * 0.22, py + ph * 0.72)
      ctx.lineTo(px + pw * 0.28, py + ph * 0.78)
      ctx.closePath()
      ctx.fill()
      const body = ctx.createLinearGradient(px, py, px + pw, py + ph)
      body.addColorStop(0, '#ff6fae')
      body.addColorStop(1, '#2364ff')
      ctx.fillStyle = body
      roundedRect(ctx, px, py, pw, ph, 12)
      ctx.fill()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
      ctx.beginPath()
      ctx.arc(px + pw * 0.18, py + ph * 0.46, pw * 0.13, 0, Math.PI * 2)
      ctx.arc(px + pw * 0.82, py + ph * 0.46, pw * 0.13, 0, Math.PI * 2)
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
      ctx.fillStyle = '#172033'
      roundedRect(ctx, px + pw * 0.12, py + ph * 0.88, pw * 0.28, ph * 0.1, 4)
      ctx.fill()
      roundedRect(ctx, px + pw * 0.6, py + ph * 0.88, pw * 0.28, ph * 0.1, 4)
      ctx.fill()
    }
  }, [])

  useEffect(() => {
    const firstLevel = LEVELS[0]
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
      levelIndex: 0,
      levelsCompleted: 0,
      levelProgress: LEVELS.map(() => 0),
      visibleCount: 0,
      calibrationProgress: 0,
      poseSnapshot: null,
      calibrationSamples: [],
      calibration: null,
      words: arcadeSessionWords.slice(0, TOTAL_WORDS),
      player: {
        x: firstLevel.spawn.x,
        y: firstLevel.spawn.y,
        vx: 0,
        vy: 0,
        w: PLAYER_W,
        h: PLAYER_H,
        grounded: false,
        health: 3,
        invincibleUntil: 0,
      },
      checkpoint: { ...firstLevel.spawn },
      enemies: firstLevel.enemies.map((enemy) => ({ ...enemy, dir: 1 })),
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
        s.calibrationProgress = 1
        s.visibleCount = 6
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
      s.visibleCount = pose.visibleCount || (pose.ok ? 6 : 0)
      s.poseSnapshot = pose

      if (s.phase === 'calibrating') {
        if (pose.ok) {
          s.calibrationSamples.push(pose)
          s.calibrationProgress = Math.min(1, s.calibrationSamples.length / CALIBRATION_FRAMES)
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
          s.calibrationProgress = 0
          s.status = '请全身入镜，或按 Enter 键盘体验'
        }
      } else if (s.phase === 'countdown') {
        s.countdown = Math.max(1, Math.ceil((COUNTDOWN_MS - (now - s.countdownStartedAt)) / 1000))
        s.status = `${s.countdown}`
        if (now - s.countdownStartedAt >= COUNTDOWN_MS) {
          s.phase = 'playing'
          if (!s.startedAt) s.startedAt = now
          s.status = `${currentLevel(s).name} 开始`
        }
      } else if (s.phase === 'wordChallenge') {
        const jumpNow = pose.ok && pose.handsUp
        if (jumpNow && !s.poseJumpActive) {
          completeChallenge('gesture')
        }
        s.poseJumpActive = jumpNow
        s.status = '举起双手或按 E 完成单词挑战'
      } else if (s.phase === 'playing') {
        const level = currentLevel(s)
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
        for (const platform of level.platforms) {
          if (!intersects(p, platform)) continue
          if (p.vx > 0) p.x = platform.x - p.w
          if (p.vx < 0) p.x = platform.x + platform.w
          p.vx = 0
        }

        p.y += p.vy * dt
        p.grounded = false
        for (const platform of level.platforms) {
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

        p.x = clamp(p.x, -0.5, level.finishX + 1.3)
        s.levelProgress[s.levelIndex] = Math.max(s.levelProgress[s.levelIndex] || 0, p.x)
        s.maxX = Math.max(s.maxX, s.levelIndex * 100 + p.x)
        if (p.grounded && p.x > s.checkpoint.x + 5) {
          s.checkpoint = { x: p.x, y: p.y }
        }

        level.coins.forEach((coin) => {
          if (s.collectedCoinIds.has(coin.id)) return
          if (circleHitRect(coin.x, coin.y, 0.34, p)) {
            s.collectedCoinIds.add(coin.id)
            s.score += coin.score
            s.status = `金币 +${coin.score}`
            playSuccessTone(2)
          }
        })

        level.wordBoxes.forEach((box, index) => {
          if (s.openedBoxIds.has(box.id) || s.challenge) return
          const rect = { x: box.x, y: box.y, w: 0.72, h: 0.72 }
          if (!intersects(p, rect)) return
          const word = s.words[wordIndexForBox(s.levelIndex, index)]
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
          if (!s.finished) {
            p.x = s.checkpoint.x
            p.y = s.checkpoint.y + 0.2
            p.vx = 0
            p.vy = 0
          }
        }

        if (p.x >= level.finishX) {
          const isLastLevel = s.levelIndex >= LEVELS.length - 1
          s.score += 250 + Math.max(0, Math.ceil(ROUND_SECONDS - (now - s.startedAt) / 1000))
          s.levelsCompleted = Math.max(s.levelsCompleted, s.levelIndex + 1)
          if (isLastLevel) {
            s.completed = true
            s.finished = true
            s.score += Math.max(0, Math.ceil(ROUND_SECONDS - (now - s.startedAt) / 1000)) * 3
            s.status = '全部通关'
          } else {
            s.player.health = Math.min(4, s.player.health + 1)
            enterLevel(s, s.levelIndex + 1, now, `进入 ${LEVELS[s.levelIndex + 1].name}`)
            playSuccessTone(5)
          }
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
  const calibrationPercent = Math.round((ui.calibrationProgress || 0) * 100)

  return (
    <div className={`platformer-overlay ${ui.phase === 'calibrating' ? 'is-calibrating' : ''}`}>
      <canvas ref={canvasRef} className="platformer-canvas" />

      <section className="platformer-hud" aria-label="星光大冒险">
        <div>
          <span>生命</span>
          <strong>{'♥'.repeat(Math.max(0, ui.health)) || '0'}</strong>
        </div>
        <div>
          <span>关卡</span>
          <strong>{ui.levelIndex + 1}/{ui.totalLevels}</strong>
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
          <strong>{ui.learned}/{ui.totalWords}</strong>
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

      {ui.phase === 'calibrating' && (
        <div className="platformer-calibration-panel">
          <span>校准提示</span>
          <strong>{calibrationPercent}%</strong>
          <div className="platformer-calibration-meter">
            <i style={{ width: `${calibrationPercent}%` }} />
          </div>
          <p className={ui.visibleCount >= 4 ? 'ready' : ''}>全身站进中央框</p>
          <p className={ui.quality >= 66 ? 'ready' : ''}>头、肩、脚保持可见</p>
          <p className={ui.calibrationProgress >= 0.5 ? 'ready' : ''}>站稳直到倒计时开始</p>
        </div>
      )}

      {ui.phase === 'countdown' && (
        <div className="platformer-ready">
          <span>{ui.levelName}</span>
          <strong>{ui.countdown}</strong>
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
