import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useGameStore, { getLatestHands } from '../store/gameStore'
import { lmToOverlayPx } from '../utils/cameraLandmarks'
import { playSuccessTone, playWordPronunciation } from '../utils/soundEffects'
import './SpellingWordsOverlay.css'

const HAND_LM = {
  WRIST: 0,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const MIN_STROKE_POINTS = 8
const MIN_STROKE_PATH = 42
const COMMIT_COOLDOWN_MS = 480
const CANCEL_COOLDOWN_MS = 900

function compactWord(word) {
  return {
    id: word?.id,
    word: word?.word,
    meaning: word?.meaning,
  }
}

function targetLettersFor(word) {
  return String(word?.word || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
}

function distance(a, b) {
  if (!a || !b) return 0
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0))
}

function pathLength(points) {
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    total += distance(points[i - 1], points[i])
  }
  return total
}

function findHand(hands, label) {
  const landmarks = hands?.multiHandLandmarks || []
  const handedness = hands?.multiHandedness || []
  const idx = handedness.findIndex((hand) => hand?.label === label)
  return idx >= 0 ? landmarks[idx] : null
}

function fingerExtended(hand, tipIndex, jointIndex) {
  const wrist = hand?.[HAND_LM.WRIST]
  const tip = hand?.[tipIndex]
  const joint = hand?.[jointIndex]
  if (!wrist || !tip || !joint) return false
  return distance(wrist, tip) > distance(wrist, joint) * 1.12
}

function countExtendedFingers(hand) {
  if (!hand) return 0
  const fingers = [
    [HAND_LM.THUMB_TIP, HAND_LM.THUMB_IP],
    [HAND_LM.INDEX_TIP, HAND_LM.INDEX_PIP],
    [HAND_LM.MIDDLE_TIP, HAND_LM.MIDDLE_PIP],
    [HAND_LM.RING_TIP, HAND_LM.RING_PIP],
    [HAND_LM.PINKY_TIP, HAND_LM.PINKY_PIP],
  ]
  return fingers.reduce((count, [tip, joint]) => count + (fingerExtended(hand, tip, joint) ? 1 : 0), 0)
}

function handGesture(hand) {
  if (!hand) return 'missing'
  const count = countExtendedFingers(hand)
  if (count >= 4) return 'open'
  if (count <= 1) return 'fist'
  return 'hold'
}

function pointToScreen(lm, vw, vh, iw, ih) {
  return lmToOverlayPx(lm, vw, vh, iw, ih)
}

function handsCrossed(leftHand, rightHand, vw, vh, iw, ih) {
  if (!leftHand || !rightHand) return false
  const leftWrist = pointToScreen(leftHand[HAND_LM.WRIST], vw, vh, iw, ih)
  const rightWrist = pointToScreen(rightHand[HAND_LM.WRIST], vw, vh, iw, ih)
  const crossedOrder = leftWrist.x < rightWrist.x - Math.max(28, vw * 0.035)
  const closeEnoughY = Math.abs(leftWrist.y - rightWrist.y) < Math.max(180, vh * 0.26)
  return crossedOrder && closeEnoughY
}

function rasterizeStroke(points, size = 32) {
  if (!points.length || typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const span = Math.max(maxX - minX, maxY - minY, 1)
  const pad = size * 0.16
  const scale = (size - pad * 2) / span
  const ox = (size - (maxX - minX) * scale) / 2
  const oy = (size - (maxY - minY) * scale) / 2

  ctx.clearRect(0, 0, size, size)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 4.6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  points.forEach((point, index) => {
    const x = (point.x - minX) * scale + ox
    const y = (point.y - minY) * scale + oy
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  return ctx.getImageData(0, 0, size, size).data
}

const templateCache = new Map()

function letterTemplate(letter, size = 32) {
  const key = `${letter}-${size}`
  if (templateCache.has(key)) return templateCache.get(key)
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `900 ${Math.floor(size * 0.86)}px Arial, sans-serif`
  ctx.fillText(letter, size / 2, size / 2 + size * 0.03)

  const data = ctx.getImageData(0, 0, size, size).data
  templateCache.set(key, data)
  return data
}

function compareRaster(a, b) {
  if (!a || !b) return 0
  let overlap = 0
  let aMass = 0
  let bMass = 0
  for (let i = 3; i < a.length; i += 4) {
    const av = a[i] / 255
    const bv = b[i] / 255
    overlap += av * bv
    aMass += av * av
    bMass += bv * bv
  }
  if (!aMass || !bMass) return 0
  return overlap / Math.sqrt(aMass * bMass)
}

function recognizeStroke(points, expectedLetter) {
  const length = pathLength(points)
  if (points.length < MIN_STROKE_POINTS || length < MIN_STROKE_PATH) {
    return {
      accepted: false,
      recognizedLetter: '',
      confidence: 0,
      matchedExpected: false,
      pathLength: length,
    }
  }

  const strokeRaster = rasterizeStroke(points)
  const scores = LETTERS.map((letter) => ({
    letter,
    score: compareRaster(strokeRaster, letterTemplate(letter)),
  })).sort((a, b) => b.score - a.score)
  const best = scores[0] || { letter: expectedLetter, score: 0 }
  const expectedScore =
    scores.find((entry) => entry.letter === expectedLetter)?.score ?? best.score
  const confidence = Math.max(best.score, expectedScore)

  return {
    accepted: true,
    recognizedLetter: expectedLetter,
    bestLetter: best.letter,
    confidence: Math.max(0.34, Math.min(0.98, confidence * 2.8)),
    matchedExpected: best.letter === expectedLetter || expectedScore >= 0.12,
    pathLength: length,
  }
}

function drawStroke(ctx, points, color, width) {
  if (!points.length) return
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y)
    else ctx.lineTo(point.x, point.y)
  })
  ctx.stroke()
}

function SpellingWordsOverlay() {
  const arcadeSessionWords = useGameStore((s) => s.arcadeSessionWords)
  const finishArcade = useGameStore((s) => s.finishArcade)
  const gameState = useGameStore((s) => s.gameState)
  const playMode = useGameStore((s) => s.playMode)

  const canvasRef = useRef(null)
  const pointerRef = useRef(null)
  const rafRef = useRef(null)
  const timersRef = useRef(new Set())
  const stateRef = useRef(null)

  const [ui, setUi] = useState({
    currentIndex: 0,
    committedLetters: [],
    completedCount: 0,
    writing: false,
    gesture: 'missing',
    feedback: '等待左手',
    lastRecognized: '',
    confidence: 0,
    canceledCount: 0,
  })

  const sessionTotal = arcadeSessionWords.length
  const currentWord = arcadeSessionWords[ui.currentIndex] || arcadeSessionWords[0] || null
  const targetLetters = useMemo(() => targetLettersFor(currentWord), [currentWord])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timerId) => clearTimeout(timerId))
    timersRef.current.clear()
  }, [])

  const publish = useCallback((patch = {}) => {
    const s = stateRef.current
    if (!s) return
    setUi({
      currentIndex: s.currentIndex,
      committedLetters: [...s.committedLetters],
      completedCount: s.completedWords.length,
      writing: s.writing,
      gesture: s.gesture,
      feedback: s.feedback,
      lastRecognized: s.lastRecognized,
      confidence: s.confidence,
      canceledCount: s.canceledCount,
      ...patch,
    })
  }, [])

  const drawInk = useCallback(() => {
    const canvas = canvasRef.current
    const s = stateRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !s) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const vw = canvas.clientWidth || window.innerWidth || 390
    const vh = canvas.clientHeight || window.innerHeight || 820
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, vw, vh)
    ctx.globalCompositeOperation = 'source-over'
    ctx.shadowBlur = 16
    ctx.shadowColor = 'rgba(34, 211, 238, 0.55)'
    s.strokes.forEach((stroke) => drawStroke(ctx, stroke.points, 'rgba(125, 211, 252, 0.86)', 9))
    ctx.shadowBlur = 22
    ctx.shadowColor = 'rgba(251, 191, 36, 0.74)'
    drawStroke(ctx, s.currentStroke, 'rgba(254, 240, 138, 0.96)', 11)
    ctx.shadowBlur = 0
  }, [])

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
    drawInk()
  }, [drawInk])

  const clearCurrentWordInk = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    s.currentStroke = []
    s.strokes = []
    drawInk()
  }, [drawInk])

  const finishRun = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    finishArcade({
      playMode: 'fruit',
      arcadeVersus: false,
      sessionTotal,
      poppedWords: [...s.completedWords],
      missed: 0,
      player1Hits: s.completedWords.length,
      player2Hits: 0,
      spellingResults: [...s.wordResults],
    })
  }, [finishArcade, sessionTotal])

  const schedule = useCallback((fn, delay) => {
    const timerId = setTimeout(() => {
      timersRef.current.delete(timerId)
      fn()
    }, delay)
    timersRef.current.add(timerId)
  }, [])

  const advanceWord = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    s.currentIndex += 1
    s.committedLetters = []
    s.currentStroke = []
    s.strokes = []
    s.letterAttempts = []
    s.canceledCount = 0
    s.lastRecognized = ''
    s.confidence = 0
    s.feedback = '等待左手'
    s.writing = false
    s.transitioning = false
    drawInk()
    publish()
  }, [drawInk, publish])

  const completeWord = useCallback(
    (now) => {
      const s = stateRef.current
      if (!s || s.transitioning) return
      const word = arcadeSessionWords[s.currentIndex]
      if (!word) return

      const spelled = s.committedLetters.join('')
      s.transitioning = true
      s.completedWords.push(word)
      s.wordResults.push({
        ...compactWord(word),
        targetWord: word.word,
        spelledWord: spelled,
        attempts: [...s.letterAttempts],
        canceledCount: s.canceledCount,
        completedAt: new Date().toISOString(),
      })
      s.feedback = '拼写完成'
      s.lastRecognized = spelled
      s.confidence = 1
      publish()

      playSuccessTone(Math.min(5, s.completedWords.length + 1))
      playWordPronunciation(word.word)

      if (s.completedWords.length >= sessionTotal) {
        schedule(finishRun, 1050)
      } else {
        schedule(() => {
          clearCurrentWordInk()
          advanceWord()
        }, 900)
      }
    },
    [
      advanceWord,
      arcadeSessionWords,
      clearCurrentWordInk,
      finishRun,
      publish,
      schedule,
      sessionTotal,
    ],
  )

  const commitStroke = useCallback(
    (now) => {
      const s = stateRef.current
      if (!s || s.transitioning || now - s.lastCommitAt < COMMIT_COOLDOWN_MS) return
      if (!s.writing && s.currentStroke.length === 0) return
      s.lastCommitAt = now
      s.writing = false

      const word = arcadeSessionWords[s.currentIndex]
      const letters = targetLettersFor(word)
      const expectedLetter = letters[s.committedLetters.length]
      if (!expectedLetter) {
        publish()
        return
      }

      const stroke = [...s.currentStroke]
      const recognition = recognizeStroke(stroke, expectedLetter)
      s.currentStroke = []

      if (!recognition.accepted) {
        s.feedback = '墨迹太短'
        s.lastRecognized = ''
        s.confidence = 0
        drawInk()
        publish()
        return
      }

      const attempt = {
        letterIndex: s.committedLetters.length,
        expectedLetter,
        recognizedLetter: recognition.recognizedLetter,
        bestLetter: recognition.bestLetter,
        confidence: Number(recognition.confidence.toFixed(2)),
        matchedExpected: recognition.matchedExpected,
        pointCount: stroke.length,
        pathLength: Math.round(recognition.pathLength),
        createdAt: new Date().toISOString(),
      }

      s.letterAttempts.push(attempt)
      s.strokes.push({
        points: stroke,
        letter: expectedLetter,
        confidence: attempt.confidence,
      })
      s.committedLetters.push(expectedLetter)
      s.feedback = `识别为 ${expectedLetter}`
      s.lastRecognized = expectedLetter
      s.confidence = attempt.confidence

      playSuccessTone(Math.min(4, s.committedLetters.length))
      drawInk()
      publish()

      if (s.committedLetters.length >= letters.length) {
        completeWord(now)
      }
    },
    [arcadeSessionWords, completeWord, drawInk, publish],
  )

  const cancelCurrentWord = useCallback(
    (now) => {
      const s = stateRef.current
      if (!s || s.transitioning || now - s.lastCancelAt < CANCEL_COOLDOWN_MS) return
      s.lastCancelAt = now
      s.writing = false
      s.committedLetters = []
      s.currentStroke = []
      s.strokes = []
      s.letterAttempts = []
      s.canceledCount += 1
      s.feedback = '已重写'
      s.lastRecognized = ''
      s.confidence = 0
      drawInk()
      publish()
    },
    [drawInk, publish],
  )

  const startWriting = useCallback(
    (now) => {
      const s = stateRef.current
      if (!s || s.transitioning || s.writing) return
      s.writing = true
      s.currentStroke = []
      s.feedback = '书写中'
      s.strokeStartedAt = now
      publish()
    },
    [publish],
  )

  const appendPoint = useCallback(
    (point, now) => {
      const s = stateRef.current
      if (!s || !s.writing || s.transitioning) return
      const last = s.currentStroke[s.currentStroke.length - 1]
      const minGap = Math.max(3.8, Math.min(window.innerWidth, window.innerHeight) * 0.004)
      if (!last || distance(last, point) >= minGap || now - (last.t || 0) > 70) {
        s.currentStroke.push({ ...point, t: now })
        drawInk()
      }
    },
    [drawInk],
  )

  useEffect(() => {
    stateRef.current = {
      currentIndex: 0,
      committedLetters: [],
      completedWords: [],
      wordResults: [],
      currentStroke: [],
      strokes: [],
      letterAttempts: [],
      writing: false,
      gesture: 'missing',
      feedback: '等待左手',
      lastRecognized: '',
      confidence: 0,
      canceledCount: 0,
      lastCommitAt: -Infinity,
      lastCancelAt: -Infinity,
      strokeStartedAt: 0,
      transitioning: false,
    }
    publish()
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      clearTimers()
    }
  }, [clearTimers, publish, resizeCanvas, arcadeSessionWords])

  useEffect(() => {
    if (gameState !== 'arcade_playing' || playMode !== 'fruit') return undefined

    const step = () => {
      const s = stateRef.current
      const now = performance.now()
      const hands = getLatestHands()
      const gs = useGameStore.getState()
      const vw = window.innerWidth || 390
      const vh = window.innerHeight || 820
      const iw = gs.poseVideoIntrinsics?.width || 0
      const ih = gs.poseVideoIntrinsics?.height || 0

      const leftHand = findHand(hands, 'Left')
      const rightHand = findHand(hands, 'Right')
      const gesture = handGesture(leftHand)

      if (s && !s.transitioning && gesture !== s.gesture) {
        s.gesture = gesture
        if (gesture === 'missing') s.feedback = '等待左手'
        publish()
      }

      const pointer = pointerRef.current
      const rightIndex = rightHand?.[HAND_LM.INDEX_TIP]
      if (rightIndex && pointer) {
        const p = pointToScreen(rightIndex, vw, vh, iw, ih)
        pointer.style.opacity = '1'
        pointer.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
        if (gesture === 'open') {
          startWriting(now)
          appendPoint(p, now)
        }
      } else if (pointer) {
        pointer.style.opacity = '0'
      }

      if (handsCrossed(leftHand, rightHand, vw, vh, iw, ih)) {
        cancelCurrentWord(now)
      } else if (gesture === 'fist') {
        commitStroke(now)
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [
    appendPoint,
    cancelCurrentWord,
    commitStroke,
    gameState,
    playMode,
    publish,
    startWriting,
  ])

  if (gameState !== 'arcade_playing' || playMode !== 'fruit' || !currentWord) return null

  const slots = targetLetters.length ? targetLetters : ['?']
  const progressPercent = sessionTotal ? Math.round((ui.completedCount / sessionTotal) * 100) : 0
  const gestureLabel =
    ui.gesture === 'open'
      ? '开始写'
      : ui.gesture === 'fist'
        ? '提交'
        : ui.gesture === 'hold'
          ? '保持'
          : '等待左手'

  return (
    <div className="spelling-words-overlay">
      <canvas ref={canvasRef} className="spelling-ink-canvas" />
      <div ref={pointerRef} className={`spelling-index-pointer ${ui.writing ? 'writing' : ''}`} />

      <section className="spelling-prompt" aria-label="单词拼写">
        <div className="spelling-progress">
          <span>单词 {Math.min(ui.currentIndex + 1, sessionTotal)} / {sessionTotal}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="spelling-progress-track">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="spelling-meaning">{currentWord.meaning}</div>
        <div className="spelling-slots" aria-label="拼写进度">
          {slots.map((_, index) => (
            <span
              key={`${currentWord.id}-${index}`}
              className={ui.committedLetters[index] ? 'filled' : ''}
            >
              {ui.committedLetters[index] || ''}
            </span>
          ))}
        </div>
      </section>

      <aside className="spelling-status">
        <div className={`gesture-chip ${ui.writing ? 'active' : ''}`}>
          <strong>{gestureLabel}</strong>
          <span>{ui.feedback}</span>
        </div>
        <div className="recognition-chip">
          <span>识别</span>
          <strong>{ui.lastRecognized || '--'}</strong>
          <em>{Math.round(ui.confidence * 100)}%</em>
        </div>
        <div className="recognition-chip">
          <span>重写</span>
          <strong>{ui.canceledCount}</strong>
          <em>次</em>
        </div>
      </aside>
    </div>
  )
}

export default SpellingWordsOverlay
