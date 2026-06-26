import React, { useRef, useEffect, useCallback, useState } from 'react'
import useGameStore, { getLatestPose } from '../store/gameStore'
import { lmToViewportCoverMirror } from '../utils/cameraLandmarks'
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

const FRUIT_SPRITES = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍉', '🍑', '🍒']

const VIS_MIN = 0.45

/** 气球：同屏更多、节奏更快；水果保持原节奏 */
const BALLOON_MAX_AIRBORNE = 9
const FRUIT_MAX_AIRBORNE = 6

const BALLOON_SPAWN_GAP_MIN = 950
const BALLOON_SPAWN_GAP_EXTRA = 750
const FRUIT_SPAWN_GAP_MIN = 400
const FRUIT_SPAWN_GAP_EXTRA = 560

/** 气球约 14–18s 落穿一屏；水果略快 */
const BALLOON_FALL_CROSS_MS = 15500
const FRUIT_FALL_CROSS_MS = 22000

/** 气球造型：颜色 / 形状各异 */
const BALLOON_VARIANTS = [
  { id: 'candy', className: 'balloon-candy' },
  { id: 'sky', className: 'balloon-sky' },
  { id: 'sunshine', className: 'balloon-sunshine' },
  { id: 'lavender', className: 'balloon-lavender' },
  { id: 'mint', className: 'balloon-mint' },
  { id: 'coral', className: 'balloon-coral' },
  { id: 'heart', className: 'balloon-heart balloon-shape-heart' },
  { id: 'star', className: 'balloon-star balloon-shape-star' },
]

function pickBalloonVariant(seed) {
  const n = BALLOON_VARIANTS.length
  const i = Math.abs(Math.floor(seed)) % n
  return BALLOON_VARIANTS[i]
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
    maxAirborne: FRUIT_MAX_AIRBORNE,
    spawnGapMin: FRUIT_SPAWN_GAP_MIN,
    spawnGapExtra: FRUIT_SPAWN_GAP_EXTRA,
    fallCrossMs: FRUIT_FALL_CROSS_MS,
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
  cx,
  cy,
  hitR2,
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
      const d2 = (x - cx) ** 2 + (y - cy) ** 2
      if (d2 <= hitR2) return 'hit'
    }
    return ''
  }

  let best = null
  for (const idx of LEFT_BODY) {
    const p = landmarks[idx]
    if (!p || (p.visibility != null && p.visibility < VIS_MIN)) continue
    const { x, y } = toPx(p)
    const d2 = (x - cx) ** 2 + (y - cy) ** 2
    if (d2 > hitR2) continue
    if (!best || d2 < best.d2) best = { player: 'p1', d2 }
  }
  for (const idx of RIGHT_BODY) {
    const p = landmarks[idx]
    if (!p || (p.visibility != null && p.visibility < VIS_MIN)) continue
    const { x, y } = toPx(p)
    const d2 = (x - cx) ** 2 + (y - cy) ** 2
    if (d2 > hitR2) continue
    if (!best || d2 < best.d2) best = { player: 'p2', d2 }
  }
  return best ? best.player : ''
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
  const [renderItems, setRenderItems] = useState([])
  const [hudStats, setHudStats] = useState({
    popped: 0,
    missed: 0,
    p1Hits: 0,
    p2Hits: 0,
  })

  const statsRef = useRef({
    popped: 0,
    missed: 0,
    p1Hits: 0,
    p2Hits: 0,
    poppedList: [],
  })

  const isBalloon = playMode === 'balloon'
  const sessionTotal = arcadeSessionWords.length

  const commitItems = useCallback(() => {
    setRenderItems([...itemsRef.current])
  }, [])

  const commitHudStats = useCallback(() => {
    const s = statsRef.current
    setHudStats({
      popped: s.popped,
      missed: s.missed,
      p1Hits: s.p1Hits,
      p2Hits: s.p2Hits,
    })
  }, [])

  useEffect(() => {
    queueRef.current = [...arcadeSessionWords]
    itemsRef.current = []
    itemElsRef.current.clear()
    spawnedCountRef.current = 0
    nextSpawnAtRef.current = performance.now() + (playMode === 'balloon' ? 280 : 400)
    statsRef.current = {
      popped: 0,
      missed: 0,
      p1Hits: 0,
      p2Hits: 0,
      poppedList: [],
    }
    setRenderItems([])
    setHudStats({
      popped: 0,
      missed: 0,
      p1Hits: 0,
      p2Hits: 0,
    })
  }, [arcadeSessionWords, gameState, playMode])

  const endRun = useCallback(() => {
    const s = statsRef.current
    finishArcade({
      playMode,
      arcadeVersus,
      sessionTotal,
      poppedWords: [...s.poppedList],
      missed: s.missed,
      player1Hits: arcadeVersus ? s.p1Hits : s.popped,
      player2Hits: arcadeVersus ? s.p2Hits : 0,
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

      const xFrac = 0.08 + Math.random() * 0.84
      const vhEff =
        typeof globalThis.innerHeight === 'number' && globalThis.innerHeight > 0
          ? globalThis.innerHeight
          : 820
      const speedTune = isBalloon ? 0.88 + Math.random() * 0.32 : 0.72 + Math.random() * 0.56
      const vy = (vhEff / cfg.fallCrossMs) * speedTune
      const balloonVariant = isBalloon
        ? pickBalloonVariant((Number(word.id) || spawnIdx) + spawnIdx * 7)
        : null
      const sizeScale = isBalloon ? 0.9 + Math.random() * 0.22 : 1

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
        balloonVariant,
        sizeScale,
        fruitEmoji: FRUIT_SPRITES[(Number(word.id) || spawnIdx) % FRUIT_SPRITES.length],
      })

      nextSpawnAtRef.current = now + cfg.spawnGapMin + Math.random() * cfg.spawnGapExtra
      commitItems()
    },
    [sessionTotal, isBalloon, commitItems],
  )

  const applyItemTransform = useCallback(
    (it, vw) => {
      const el = itemElsRef.current.get(it.id)
      if (!el) return
      const halfW = isBalloon ? 59 : 60
      const scale = isBalloon ? it.sizeScale ?? 1 : 1
      const x = it.xFrac * vw + (it.swayPx ?? 0) - halfW * scale
      const y = it.y
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${it.wobbleDeg ?? 0}deg) scale(${scale})`
    },
    [isBalloon],
  )

  useEffect(() => {
    if (gameState !== 'arcade_playing') return undefined

    let raf = null
    let last = performance.now()
    let lastHudCommit = 0

    const step = () => {
      const now = performance.now()
      const dt = Math.min(now - last, 48)
      last = now

      const gs = useGameStore.getState()
      const landmarks = getLatestPose()
      const balloonCoverHits = gs.playMode === 'balloon'
      const iw = gs.poseVideoIntrinsics?.width ?? 0
      const ih = gs.poseVideoIntrinsics?.height ?? 0

      trySpawn(now)

      const vw = innerWidth || 390
      const vh = innerHeight || 820
      const minVH = Math.min(vw, vh)
      const hitR = minVH * 0.09
      const hitR2 = hitR * hitR
      const cxOffset = isBalloon ? 59 : 60
      const cyOffset = isBalloon ? 70 : 59

      const beforePrune = itemsRef.current.length
      itemsRef.current = itemsRef.current.filter((it) => !it.done)
      if (itemsRef.current.length !== beforePrune) {
        commitItems()
      }

      for (const it of itemsRef.current) {
        if (it.done || it.popping) continue

        it.y += it.vy * dt

        const swayAmp = it.swayAmp ?? 0.018
        const sway = Math.sin(now * 0.00115 + it.phase) * minVH * swayAmp
        it.swayPx = sway
        it.wobbleDeg = Math.sin(now * 0.0018 + it.phase * 1.3) * (isBalloon ? 5.5 : 2)
        const cx = it.xFrac * vw + sway + cxOffset
        const cy = it.y + cyOffset
        applyItemTransform(it, vw)

        if (landmarks && landmarks.length && !it.popping) {
          const who = nearestHitPlayer(
            landmarks,
            cx,
            cy,
            hitR2,
            gs.arcadeVersus,
            vw,
            vh,
            balloonCoverHits,
            iw,
            ih,
          )
          if (who) {
            it.popping = true
            const w = it.word
            statsRef.current.popped += 1
            statsRef.current.poppedList.push(w)

            if (gs.arcadeVersus) {
              if (who === 'p1') statsRef.current.p1Hits += 1
              if (who === 'p2') statsRef.current.p2Hits += 1
            }

            playSuccessTone(Math.min(4, 1 + (statsRef.current.popped % 5)))
            playWordPronunciation(w.word)
            commitHudStats()

            const el = itemElsRef.current.get(it.id)
            if (el) el.classList.add('popping')

            setTimeout(() => {
              it.done = true
              commitItems()
            }, 300)
          }
        }

        if (!it.popping && it.y > vh + 120) {
          it.done = true
          statsRef.current.missed += 1
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
    return () => cancelAnimationFrame(raf)
  }, [
    gameState,
    arcadeVersus,
    trySpawn,
    endRun,
    sessionTotal,
    isBalloon,
    applyItemTransform,
    commitItems,
    commitHudStats,
  ])

  if (gameState !== 'arcade_playing') return null

  const itemsRender = renderItems
  const st = hudStats

  let hudVersus = null
  if (arcadeVersus) {
    hudVersus = (
      <div className="versus-stats">
        <span title="左手手腕/手肘击中">🔵 P1 · {st.p1Hits}</span>
        <span>|</span>
        <span title="右手手腕/手肘击中">🔴 P2 · {st.p2Hits}</span>
        <span>|</span>
        <span>漏接 {st.missed}</span>
      </div>
    )
  } else {
    hudVersus = (
      <>
        <span>
          ⚡击破 {st.popped} / {sessionTotal}
        </span>
        <span>漏接 {st.missed}</span>
      </>
    )
  }

  return (
    <div className="falling-words-overlay" aria-hidden="true">
      <div className="falling-hud">
        {playMode === 'balloon'
          ? arcadeVersus
            ? '🎈 气球跳跳碰 · 双人'
            : '🎈 气球跳跳碰 · 单机'
          : arcadeVersus
            ? '🍉 单词切水果 · 双人'
            : '🍉 单词切水果'}
        {arcadeVersus && <span>左手腕/肘=P1｜右手腕/肘=P2</span>}
        {hudVersus}
      </div>

      {itemsRender.map((it) => {
        const balloonClasses = isBalloon
          ? ['balloon-shape', it.balloonVariant?.className ?? 'balloon-candy'].join(' ')
          : 'fruit-shape'
        const scale = isBalloon ? it.sizeScale ?? 1 : 1
        const halfW = isBalloon ? 59 : 60
        const halfScaled = halfW * scale

        return (
          <div
            key={it.id}
            className={`falling-item ${balloonClasses} ${it.popping ? 'popping' : ''}`}
            ref={(node) => {
              if (node) {
                itemElsRef.current.set(it.id, node)
                requestAnimationFrame(() => {
                  applyItemTransform(it, window.innerWidth || 390)
                })
              } else {
                itemElsRef.current.delete(it.id)
              }
            }}
            style={{
              '--balloon-scale': scale,
              transform: `translate3d(${-halfScaled}px, ${it.y}px, 0) scale(${scale})`,
            }}
          >
            {isBalloon && <span className="balloon-shine" aria-hidden="true" />}
            {!isBalloon && <span className="fruit-emoji">{it.fruitEmoji}</span>}
            <span className="falling-word">{it.word.word}</span>
          </div>
        )
      })}
    </div>
  )
}

export default FallingWordsOverlay
