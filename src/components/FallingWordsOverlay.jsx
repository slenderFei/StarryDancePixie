import React, { useRef, useEffect, useCallback, useState } from 'react'
import useGameStore, { getLatestPose } from '../store/gameStore'
import { lmToViewportCoverMirror } from '../utils/cameraLandmarks'
import { getBalloonGeometry, isBalloonHit } from '../utils/balloonGeometry'
import { playSuccessTone, playWordPronunciation } from '../utils/soundEffects'
import './FallingWordsOverlay.css'

const POSE_LM = {
  NOSE: 0,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
}

const LEFT_BODY = [POSE_LM.LEFT_WRIST, POSE_LM.LEFT_ELBOW]
const RIGHT_BODY = [POSE_LM.RIGHT_WRIST, POSE_LM.RIGHT_ELBOW]

const VIS_MIN = 0.45

/** 气球同屏适中防卡顿 */
const BALLOON_MAX_AIRBORNE = 7

const BALLOON_SPAWN_GAP_MIN = 950
const BALLOON_SPAWN_GAP_EXTRA = 750

/** 气球约 14–18s 落穿一屏 */
const BALLOON_FALL_CROSS_MS = 15500
const ARCADE_HIT_COOLDOWN_MS = 240
const ARCADE_SPEECH_GAP_MS = 720

const BALLOON_TYPES = [
  {
    id: 'pearl',
    label: '白晶',
    score: 1,
    className: 'balloon-type-pearl',
    legendClassName: 'balloon-type-pearl',
    weight: 40,
    speedScale: 0.95,
    sizeScale: 1.05,
  },
  {
    id: 'aqua',
    label: '蓝能',
    score: 2,
    className: 'balloon-type-aqua',
    legendClassName: 'balloon-type-aqua',
    weight: 32,
    speedScale: 1,
    sizeScale: 1,
  },
  {
    id: 'violet',
    label: '紫核',
    score: 3,
    className: 'balloon-type-violet balloon-shape-heart',
    legendClassName: 'balloon-type-violet',
    weight: 18,
    speedScale: 1.08,
    sizeScale: 0.98,
  },
  {
    id: 'gold',
    label: '金星',
    score: 5,
    className: 'balloon-type-gold balloon-shape-star',
    legendClassName: 'balloon-type-gold',
    weight: 10,
    speedScale: 1.16,
    sizeScale: 0.93,
  },
]

const BALLOON_TYPE_TOTAL_WEIGHT = BALLOON_TYPES.reduce((sum, type) => sum + type.weight, 0)

function pickBalloonType() {
  let roll = Math.random() * BALLOON_TYPE_TOTAL_WEIGHT
  for (const type of BALLOON_TYPES) {
    roll -= type.weight
    if (roll <= 0) return type
  }
  return BALLOON_TYPES[0]
}

function decorateWord(word, balloonType, hitBy = '') {
  if (!word) return word
  return {
    ...word,
    balloonType: balloonType?.id || '',
    balloonLabel: balloonType?.label || '',
    score: Number(balloonType?.score || 0),
    hitBy,
    hitAt: new Date().toISOString(),
  }
}

function arcadeSpawnConfig(isBalloonMode) {
  if (isBalloonMode) {
    return {
      maxAirborne: BALLOON_MAX_AIRBORNE,
      spawnGapMin: BALLOON_SPAWN_GAP_MIN,
      spawnGapExtra: BALLOON_SPAWN_GAP_EXTRA,
      fallCrossMs: BALLOON_FALL_CROSS_MS,
    }
  }
  return {
    maxAirborne: BALLOON_MAX_AIRBORNE,
    spawnGapMin: BALLOON_SPAWN_GAP_MIN,
    spawnGapExtra: BALLOON_SPAWN_GAP_EXTRA,
    fallCrossMs: BALLOON_FALL_CROSS_MS,
  }
}

function mirrorPx(lm, vw, vh) {
  return { x: (1 - lm.x) * vw, y: lm.y * vh }
}

function lmToHitPx(lm, vw, vh, useBalloonCover, iw, ih) {
  if (useBalloonCover) return lmToViewportCoverMirror(lm, vw, vh, iw, ih)
  return mirrorPx(lm, vw, vh)
}

function nearestHitPlayer(
  landmarks,
  balloon,
  arcadeVersus,
  vw,
  vh,
  useBalloonCover,
  iw,
  ih,
) {
  const toPx = (p) => lmToHitPx(p, vw, vh, useBalloonCover, iw, ih)

  if (!arcadeVersus) {
    const indices = [...LEFT_BODY, ...RIGHT_BODY, POSE_LM.NOSE]
    for (const i of indices) {
      const p = landmarks[i]
      if (!p || (p.visibility != null && p.visibility < VIS_MIN)) continue
      const { x, y } = toPx(p)
      if (x < 0 || x > vw || y < 0 || y > vh) continue
      if (isBalloonHit({ x, y }, balloon)) return 'hit'
    }
    return ''
  }

  let best = null
  for (const idx of [...LEFT_BODY, ...RIGHT_BODY]) {
    const p = landmarks[idx]
    if (!p || (p.visibility != null && p.visibility < VIS_MIN)) continue
    const { x, y } = toPx(p)
    if (x < 0 || x > vw || y < 0 || y > vh) continue
    if (!isBalloonHit({ x, y }, balloon)) continue
    const d2 = (x - balloon.cx) ** 2 + (y - balloon.cy) ** 2
    if (!best || d2 < best.d2) best = { x, d2 }
  }
  return best ? (best.x < vw / 2 ? 'p1' : 'p2') : ''
}


function FallingWordsOverlay() {
  const arcadeSessionWords = useGameStore((s) => s.arcadeSessionWords)
  const playMode = useGameStore((s) => s.playMode)
  const arcadeVersus = useGameStore((s) => s.arcadeVersus)
  const finishArcade = useGameStore((s) => s.finishArcade)
  const gameState = useGameStore((s) => s.gameState)

  const queueRef = useRef([])
  const itemsRef = useRef([])
  const itemElsRef = useRef(new Map())
  const nextSpawnAtRef = useRef(0)
  const spawnedCountRef = useRef(0)
  const hitClockRef = useRef({ hit: -Infinity, p1: -Infinity, p2: -Infinity })
  const lastSpeechAtRef = useRef(-Infinity)
  const popTimeoutsRef = useRef(new Set())
  const feedbackTimeoutsRef = useRef(new Set())
  const [hitFeedback, setHitFeedback] = useState([])
  const [trackingPauseReason, setTrackingPauseReason] = useState('')
  const [renderItems, setRenderItems] = useState([])
  const [hudStats, setHudStats] = useState({
    popped: 0,
    missed: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    p1Hits: 0,
    p2Hits: 0,
    p1Score: 0,
    p2Score: 0,
  })

  const statsRef = useRef({
    popped: 0,
    missed: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    p1Hits: 0,
    p2Hits: 0,
    p1Score: 0,
    p2Score: 0,
    poppedList: [],
    missedList: [],
    spawnedList: [],
  })

  const isBalloon = playMode === 'balloon'
  const sessionTotal = arcadeSessionWords.length

  const clearPopTimeouts = useCallback(() => {
    popTimeoutsRef.current.forEach((timerId) => clearTimeout(timerId))
    popTimeoutsRef.current.clear()
    feedbackTimeoutsRef.current.forEach((timerId) => clearTimeout(timerId))
    feedbackTimeoutsRef.current.clear()
  }, [])

  const commitItems = useCallback(() => {
    setRenderItems([...itemsRef.current])
  }, [])

  const commitHudStats = useCallback(() => {
    const s = statsRef.current
    setHudStats({
      popped: s.popped,
      missed: s.missed,
      score: s.score,
      combo: s.combo,
      bestCombo: s.bestCombo,
      p1Hits: s.p1Hits,
      p2Hits: s.p2Hits,
      p1Score: s.p1Score,
      p2Score: s.p2Score,
    })
  }, [])

  useEffect(() => {
    clearPopTimeouts()
    queueRef.current = [...arcadeSessionWords]
    itemsRef.current = []
    itemElsRef.current.clear()
    spawnedCountRef.current = 0
    hitClockRef.current = { hit: -Infinity, p1: -Infinity, p2: -Infinity }
    lastSpeechAtRef.current = -Infinity
    nextSpawnAtRef.current = performance.now() + (playMode === 'balloon' ? 280 : 400)
    statsRef.current = {
      popped: 0,
      missed: 0,
      score: 0,
      combo: 0,
      bestCombo: 0,
      p1Hits: 0,
      p2Hits: 0,
      p1Score: 0,
      p2Score: 0,
      poppedList: [],
      missedList: [],
      spawnedList: [],
    }
    setRenderItems([])
    setHitFeedback([])
    setTrackingPauseReason('')
    setHudStats({
      popped: 0,
      missed: 0,
      score: 0,
      combo: 0,
      bestCombo: 0,
      p1Hits: 0,
      p2Hits: 0,
      p1Score: 0,
      p2Score: 0,
    })
  }, [arcadeSessionWords, gameState, playMode, clearPopTimeouts])

  const endRun = useCallback(() => {
    const s = statsRef.current
    finishArcade({
      playMode,
      arcadeVersus,
      sessionTotal,
      allWords: [...s.spawnedList],
      poppedWords: [...s.poppedList],
      missedWords: [...s.missedList],
      missed: s.missed,
      player1Hits: arcadeVersus ? s.p1Hits : s.popped,
      player2Hits: arcadeVersus ? s.p2Hits : 0,
      player1Score: arcadeVersus ? s.p1Score : s.score,
      player2Score: arcadeVersus ? s.p2Score : 0,
      score: s.score,
      bestCombo: s.bestCombo,
    })
  }, [finishArcade, arcadeVersus, playMode, sessionTotal])

  const trySpawn = useCallback(
    (now) => {
      const cfg = arcadeSpawnConfig(isBalloon)
      if (
        queueRef.current.length === 0 ||
        spawnedCountRef.current >= sessionTotal ||
        itemsRef.current.length >= cfg.maxAirborne
      ) {
        return
      }
      if (now < nextSpawnAtRef.current) return

      const word = queueRef.current.shift()
      if (!word) return

      const spawnIdx = spawnedCountRef.current
      const id = `${word.id}-${spawnIdx}`
      spawnedCountRef.current += 1

      const balloonType = isBalloon ? pickBalloonType() : null
      const xFrac = 0.08 + Math.random() * 0.84
      const vhEff =
        typeof globalThis.innerHeight === 'number' && globalThis.innerHeight > 0
          ? globalThis.innerHeight
          : 820
      const speedTune = isBalloon
        ? (0.88 + Math.random() * 0.32) * (balloonType?.speedScale ?? 1)
        : 0.72 + Math.random() * 0.56
      const vy = (vhEff / cfg.fallCrossMs) * speedTune
      const sizeScale = isBalloon
        ? (balloonType?.sizeScale ?? 1) * (0.95 + Math.random() * 0.12)
        : 1

      itemsRef.current.push({
        id,
        word,
        xFrac,
        y: -(60 + Math.random() * (isBalloon ? 140 : 100)),
        vy,
        phase: Math.random() * Math.PI * 2,
        swayAmp: isBalloon ? 0.022 + Math.random() * 0.014 : 0.018,
        wobbleDeg: 0,
        popping: false,
        done: false,
        swayPx: 0,
        balloonType,
        sizeScale,
      })
      statsRef.current.spawnedList.push(decorateWord(word, balloonType))

      nextSpawnAtRef.current = now + cfg.spawnGapMin + Math.random() * cfg.spawnGapExtra
      commitItems()
    },
    [sessionTotal, isBalloon, commitItems],
  )

  const applyItemTransform = useCallback(
    (it, vw) => {
      const el = itemElsRef.current.get(it.id)
      if (!el) return
      const { cx, cy, width, height, scale } = getBalloonGeometry(it, vw)
      el.style.transform = `translate3d(${cx - width / 2}px, ${cy - height / 2}px, 0) rotate(${it.wobbleDeg ?? 0}deg) scale(${scale})`
    },
    [],
  )

  useEffect(() => {
    if (gameState !== 'arcade_playing' || playMode !== 'balloon') return undefined

    let raf = null
    let last = performance.now()
    let lastHudCommit = 0
    let lastPauseReason = ''
    let animationTime = 0
    const onVisibilityChange = () => {
      if (document.hidden) {
        lastPauseReason = 'hidden'
        setTrackingPauseReason('hidden')
      }
    }
    const onResize = () => {
      for (const it of itemsRef.current) {
        const el = itemElsRef.current.get(it.id)
        if (!el) continue
        it.width = el.offsetWidth
        it.height = el.offsetHeight
        applyItemTransform(it, innerWidth || 390)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('resize', onResize)

    const step = () => {
      const now = performance.now()
      let dt = Math.min(now - last, 48)
      last = now

      const gs = useGameStore.getState()
      const landmarks = getLatestPose()
      const useCoverHits = gs.playMode === 'balloon'
      const iw = gs.poseVideoIntrinsics?.width ?? 0
      const ih = gs.poseVideoIntrinsics?.height ?? 0
      const vw = innerWidth || 390
      const vh = innerHeight || 820

      const hasArmTracking = [...LEFT_BODY, ...RIGHT_BODY].some((index) => {
        const point = landmarks?.[index]
        if (!point || (point.visibility != null && point.visibility < VIS_MIN)) return false
        const { x, y } = lmToHitPx(point, vw, vh, useCoverHits, iw, ih)
        return x >= 0 && x <= vw && y >= 0 && y <= vh
      })
      const pauseReason = document.hidden ? 'hidden' : !hasArmTracking ? 'arms' : ''
      const paused = !!pauseReason
      if (paused) {
        if (lastPauseReason !== pauseReason) {
          setTrackingPauseReason(pauseReason)
          lastPauseReason = pauseReason
        }
        raf = requestAnimationFrame(step)
        return
      }
      if (lastPauseReason) {
        nextSpawnAtRef.current = now + 500
        hitClockRef.current = { hit: now, p1: now, p2: now }
        setTrackingPauseReason('')
        lastPauseReason = ''
        dt = 0
      }
      animationTime += dt

      trySpawn(now)

      const minVH = Math.min(vw, vh)

      const beforePrune = itemsRef.current.length
      itemsRef.current = itemsRef.current.filter((it) => !it.done)
      if (itemsRef.current.length !== beforePrune) {
        commitItems()
      }

      for (const it of itemsRef.current) {
        if (it.done || it.popping) continue

        it.y += it.vy * dt

        const swayAmp = it.swayAmp ?? 0.018
        const sway = Math.sin(animationTime * 0.00115 + it.phase) * minVH * swayAmp
        it.swayPx = sway
        it.wobbleDeg = Math.sin(animationTime * 0.0018 + it.phase * 1.3) * (isBalloon ? 5.5 : 2)
        const balloon = getBalloonGeometry(it, vw)
        applyItemTransform(it, vw)

        if (landmarks && landmarks.length && !it.popping) {
          const who = nearestHitPlayer(
            landmarks,
            balloon,
            gs.arcadeVersus,
            vw,
            vh,
            useCoverHits,
            iw,
            ih,
          )
          const hitKey = gs.arcadeVersus ? who : 'hit'
          const enoughGap = who && now - (hitClockRef.current[hitKey] ?? -Infinity) >= ARCADE_HIT_COOLDOWN_MS
          if (who && enoughGap) {
            hitClockRef.current[hitKey] = now
            it.popping = true
            const w = it.word
            const points = Number(it.balloonType?.score || 1)
            statsRef.current.popped += 1
            statsRef.current.score += points
            statsRef.current.combo += 1
            statsRef.current.bestCombo = Math.max(
              statsRef.current.bestCombo,
              statsRef.current.combo,
            )
            statsRef.current.poppedList.push(decorateWord(w, it.balloonType, who))

            if (gs.arcadeVersus) {
              if (who === 'p1') statsRef.current.p1Hits += 1
              if (who === 'p2') statsRef.current.p2Hits += 1
              if (who === 'p1') statsRef.current.p1Score += points
              if (who === 'p2') statsRef.current.p2Score += points
            }

            playSuccessTone(Math.min(5, points + Math.min(2, statsRef.current.combo % 3)))
            if (now - lastSpeechAtRef.current >= ARCADE_SPEECH_GAP_MS) {
              lastSpeechAtRef.current = now
              playWordPronunciation(w.word)
            }
            const feedback = {
              id: `${it.id}-${Math.round(now)}`,
              x: balloon.cx,
              y: balloon.cy,
              points,
              combo: statsRef.current.combo,
            }
            setHitFeedback((current) => [...current, feedback].slice(-8))
            const feedbackTimer = setTimeout(() => {
              feedbackTimeoutsRef.current.delete(feedbackTimer)
              setHitFeedback((current) => current.filter((item) => item.id !== feedback.id))
            }, 680)
            feedbackTimeoutsRef.current.add(feedbackTimer)
            commitHudStats()

            const el = itemElsRef.current.get(it.id)
            if (el) el.classList.add('popping')

            const popTimer = setTimeout(() => {
              popTimeoutsRef.current.delete(popTimer)
              it.done = true
              commitItems()
            }, 340)
            popTimeoutsRef.current.add(popTimer)
          }
        }

        if (!it.popping && it.y > vh + 120) {
          it.done = true
          statsRef.current.missed += 1
          statsRef.current.combo = 0
          statsRef.current.missedList.push(decorateWord(it.word, it.balloonType))
          commitHudStats()
        }
      }

      const spawnedAll = spawnedCountRef.current >= sessionTotal
      const draining = spawnedAll && queueRef.current.length === 0
      if (draining && itemsRef.current.every((it) => it.done)) {
        cancelAnimationFrame(raf)
        endRun()
        return
      }

      if (now - lastHudCommit > 250) {
        commitHudStats()
        lastHudCommit = now
      }

      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('resize', onResize)
      clearPopTimeouts()
    }
  }, [
    gameState,
    playMode,
    arcadeVersus,
    trySpawn,
    endRun,
    sessionTotal,
    isBalloon,
    applyItemTransform,
    commitItems,
    commitHudStats,
    clearPopTimeouts,
  ])

  if (gameState !== 'arcade_playing' || playMode !== 'balloon') return null

  const itemsRender = renderItems
  const st = hudStats

  let hudVersus = null
  if (arcadeVersus) {
    hudVersus = (
      <div className="versus-stats falling-stats">
        <span title="画面左侧玩家得分">P1 · {st.p1Score}分 / {st.p1Hits}击</span>
        <span title="画面右侧玩家得分">P2 · {st.p2Score}分 / {st.p2Hits}击</span>
        <span>连击 {st.combo}</span>
        <span>漏接 {st.missed}</span>
      </div>
    )
  } else {
    hudVersus = (
      <div className="falling-stats">
        <span className="falling-score-main">分数 {st.score}</span>
        <span>
          击破 {st.popped} / {sessionTotal}
        </span>
        <span>连击 {st.combo}</span>
        <span>漏接 {st.missed}</span>
      </div>
    )
  }

  return (
    <div className="falling-words-overlay">
      <div className="falling-hud">
        <div className="falling-hud-title">
          {arcadeVersus ? '气球跳跳碰 · 双人' : '气球跳跳碰 · 单机'}
          {arcadeVersus && <span>左侧 P1｜右侧 P2</span>}
        </div>
        {hudVersus}
        <div className="balloon-score-legend" aria-hidden="true">
          {BALLOON_TYPES.map((type) => (
            <span key={type.id} className={`balloon-score-key ${type.legendClassName}`}>
              <i />
              {type.label} +{type.score}
            </span>
          ))}
        </div>
      </div>

      {trackingPauseReason && (
        <div className="balloon-tracking-paused" role="status">
          <strong>气球已暂停</strong>
          <span>
            {trackingPauseReason === 'hidden'
              ? '回到游戏页面后继续'
              : '让手臂进入画面，气球会继续飘落'}
          </span>
          <small>分数与气球位置已保留</small>
        </div>
      )}

      {hitFeedback.map((feedback) => (
        <div
          key={feedback.id}
          className="balloon-hit-feedback"
          style={{ left: feedback.x, top: feedback.y }}
          aria-hidden="true"
        >
          <i className="balloon-hit-ring" />
          <strong>+{feedback.points}</strong>
          {feedback.combo > 1 && <span>{feedback.combo} 连击</span>}
        </div>
      ))}

      {itemsRender.map((it) => {
        const balloonClasses = isBalloon
          ? ['balloon-shape', it.balloonType?.className ?? 'balloon-type-pearl'].join(' ')
          : 'fruit-shape'
        const scale = isBalloon ? it.sizeScale ?? 1 : 1

        return (
          <div
            key={it.id}
            className={`falling-item ${balloonClasses} ${it.popping ? 'popping' : ''}`}
            ref={(node) => {
              if (node) {
                itemElsRef.current.set(it.id, node)
                it.width = node.offsetWidth
                it.height = node.offsetHeight
                applyItemTransform(it, window.innerWidth || 390)
              } else {
                itemElsRef.current.delete(it.id)
              }
            }}
            style={{
              '--balloon-scale': scale,
            }}
          >
            {isBalloon && <span className="balloon-shine" aria-hidden="true" />}
            {isBalloon && (
              <span className="balloon-score-chip" aria-hidden="true">
                +{it.balloonType?.score ?? 1}
              </span>
            )}
            <span className="falling-word">{it.word.word}</span>
            {isBalloon && (
              <span className="balloon-tier-name" aria-hidden="true">
                {it.balloonType?.label ?? '白晶'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default FallingWordsOverlay
