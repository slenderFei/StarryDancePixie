import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'
import { challengeProgress } from '../utils/faceMetrics'
import './GNMHeadOverlay.css'

const MODEL_URL = `${import.meta.env.BASE_URL}assets/gnm_head_game.bin`
const CHALLENGE_SECONDS = 7
const HOLD_MS = 650

const CHALLENGES = [
  { id: 'smile', label: '笑一笑', cue: '抬起嘴角，保持笑容' },
  { id: 'mouth_open', label: '张开嘴', cue: '自然张嘴并保持' },
  { id: 'blink_both', label: '眨双眼', cue: '同时闭上双眼' },
  { id: 'wink', label: '单眼眨眼', cue: '只闭上一只眼睛' },
  { id: 'turn_side', label: '转动头部', cue: '向任意一侧转头' },
  { id: 'tilt', label: '歪一歪头', cue: '把头轻轻歪向一侧' },
]

const DTYPE = {
  float32: Float32Array,
  uint8: Uint8Array,
  uint16: Uint16Array,
}

function parseGNMAsset(buffer) {
  const view = new DataView(buffer)
  const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 4))
  if (magic !== 'GNMW' || view.getUint32(4, true) !== 1) {
    throw new Error('GNM 模型格式无效')
  }

  const headerLength = view.getUint32(8, true)
  const header = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 12, headerLength)).trim(),
  )
  const base = 12 + headerLength
  const sections = {}

  header.sections.forEach((section) => {
    const Constructor = DTYPE[section.dtype]
    sections[section.name] = new Constructor(
      buffer,
      base + section.offset,
      section.byteLength / Constructor.BYTES_PER_ELEMENT,
    )
  })

  return { meta: header.meta, sections }
}

function useGNMAsset() {
  const [state, setState] = useState({ asset: null, error: '' })

  useEffect(() => {
    let active = true
    fetch(MODEL_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.arrayBuffer()
      })
      .then((buffer) => {
        if (active) setState({ asset: parseGNMAsset(buffer), error: '' })
      })
      .catch((error) => {
        if (active) setState({ asset: null, error: error.message })
      })
    return () => {
      active = false
    }
  }, [])

  return state
}

function GNMHead({ asset, metrics, wireframe }) {
  const groupRef = useRef(null)
  const meshRef = useRef(null)
  const wireRef = useRef(null)
  const setMeshRef = useCallback((mesh) => {
    meshRef.current = mesh
    mesh?.updateMorphTargets()
  }, [])
  const setWireRef = useCallback((mesh) => {
    wireRef.current = mesh
    mesh?.updateMorphTargets()
  }, [])

  const geometry = useMemo(() => {
    const { sections } = asset
    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.BufferAttribute(sections.template, 3))
    next.setIndex(new THREE.BufferAttribute(sections.triangles, 1))

    const palette = ['#3f75a8', '#f4f0e8', '#c8787a', '#d85f67', '#f7f6ef', '#b78642', '#101318']
    const colors = new Float32Array(asset.meta.numVertices * 3)
    const color = new THREE.Color()
    for (let index = 0; index < asset.meta.numVertices; index += 1) {
      color.set(palette[sections.material_id[index]] || palette[0])
      colors[index * 3] = color.r
      colors[index * 3 + 1] = color.g
      colors[index * 3 + 2] = color.b
    }
    next.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    next.morphTargetsRelative = true
    next.morphAttributes.position = [
      sections.smile,
      sections.mouth_open,
      sections.blink_left,
      sections.blink_right,
    ].map((values) => new THREE.BufferAttribute(values, 3))
    next.computeVertexNormals()
    next.center()
    return next
  }, [asset])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state, delta) => {
    const live = metrics || {}
    const targets = [live.smile || 0, live.mouthOpen || 0, live.leftBlink || 0, live.rightBlink || 0]
    ;[meshRef.current, wireRef.current].forEach((mesh) => {
      if (!mesh?.morphTargetInfluences) return
      targets.forEach((target, index) => {
        mesh.morphTargetInfluences[index] = THREE.MathUtils.damp(
          mesh.morphTargetInfluences[index] || 0,
          target,
          14,
          delta,
        )
      })
    })

    if (!groupRef.current) return
    const idleYaw = metrics ? 0 : Math.sin(state.clock.elapsedTime * 0.45) * 0.08
    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      metrics ? (metrics.yaw || 0) * 1.65 : idleYaw,
      10,
      delta,
    )
    groupRef.current.rotation.z = THREE.MathUtils.damp(
      groupRef.current.rotation.z,
      metrics ? -(metrics.roll || 0) : 0,
      10,
      delta,
    )
  })

  return (
    <group ref={groupRef} scale={8.2} rotation={[0, 0, 0]}>
      <mesh
        ref={setMeshRef}
        geometry={geometry}
      >
        <meshStandardMaterial vertexColors roughness={0.58} metalness={0.05} />
      </mesh>
      <mesh
        ref={setWireRef}
        geometry={geometry}
        visible={wireframe}
      >
        <meshBasicMaterial
          color="#17253a"
          wireframe
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function HeadStage({ asset, metrics, wireframe }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.2], fov: 35 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={1.5} color="#b9d8ff" />
      <directionalLight position={[3, 4, 5]} intensity={3.1} color="#fff0dd" />
      <directionalLight position={[-4, 1, 2]} intensity={1.8} color="#66d9ff" />
      <pointLight position={[0, -3, 2]} intensity={1.1} color="#ff8b7b" />
      <GNMHead asset={asset} metrics={metrics} wireframe={wireframe} />
    </Canvas>
  )
}

function GNMHeadOverlay() {
  const finishArcade = useGameStore((state) => state.finishArcade)
  const currentFace = useGameStore((state) => state.currentFace)
  const { asset, error } = useGNMAsset()
  const [wireframe, setWireframe] = useState(true)
  const [ui, setUi] = useState({
    phase: 'waiting',
    countdown: 3,
    challengeIndex: 0,
    progress: 0,
    remaining: CHALLENGE_SECONDS,
    score: 0,
    completed: 0,
  })
  const phaseRef = useRef('waiting')
  const phaseStartedRef = useRef(0)
  const challengeStartedRef = useRef(0)
  const holdStartedRef = useRef(0)
  const challengeIndexRef = useRef(0)
  const scoreRef = useRef(0)
  const completedRef = useRef(0)
  const comboRef = useRef(0)
  const bestComboRef = useRef(0)
  const resultsRef = useRef([])
  const gameStartedRef = useRef(0)
  const finishedRef = useRef(false)

  useEffect(() => {
    const advance = (success, now, remaining) => {
      const challenge = CHALLENGES[challengeIndexRef.current]
      let nextScore = scoreRef.current
      if (success) {
        comboRef.current += 1
        bestComboRef.current = Math.max(bestComboRef.current, comboRef.current)
        completedRef.current += 1
        nextScore += 100 + Math.round(remaining * 10) + (comboRef.current - 1) * 15
        scoreRef.current = nextScore
      } else {
        comboRef.current = 0
      }
      resultsRef.current.push({ id: challenge.id, success })

      if (challengeIndexRef.current >= CHALLENGES.length - 1) {
        finishedRef.current = true
        finishArcade({
          playMode: 'gnm',
          arcadeVersus: false,
          sessionTotal: CHALLENGES.length,
          poppedWords: [],
          missed: CHALLENGES.length - completedRef.current,
          completedChallenges: completedRef.current,
          score: scoreRef.current,
          bestCombo: bestComboRef.current,
          durationSeconds: Math.round((now - gameStartedRef.current) / 1000),
          completed: completedRef.current === CHALLENGES.length,
          expressionResults: resultsRef.current,
        })
        return
      }

      challengeIndexRef.current += 1
      challengeStartedRef.current = now
      holdStartedRef.current = 0
      setUi((previous) => ({
        ...previous,
        challengeIndex: challengeIndexRef.current,
        progress: 0,
        remaining: CHALLENGE_SECONDS,
        score: scoreRef.current,
        completed: completedRef.current,
      }))
    }

    const timer = window.setInterval(() => {
      if (finishedRef.current) return
      const now = performance.now()
      const face = useGameStore.getState().currentFace
      const faceIsLive = face && now - face.updatedAt < 900

      if (phaseRef.current === 'waiting') {
        if (!faceIsLive) return
        phaseRef.current = 'countdown'
        phaseStartedRef.current = now
        setUi((previous) => ({ ...previous, phase: 'countdown', countdown: 3 }))
        return
      }

      if (phaseRef.current === 'countdown') {
        if (!faceIsLive) {
          phaseRef.current = 'waiting'
          setUi((previous) => ({ ...previous, phase: 'waiting' }))
          return
        }
        const elapsed = now - phaseStartedRef.current
        const countdown = Math.max(1, 3 - Math.floor(elapsed / 1000))
        if (elapsed < 3000) {
          setUi((previous) => ({ ...previous, countdown }))
          return
        }
        phaseRef.current = 'playing'
        gameStartedRef.current = now
        challengeStartedRef.current = now
        setUi((previous) => ({ ...previous, phase: 'playing' }))
      }

      if (phaseRef.current !== 'playing') return
      const challenge = CHALLENGES[challengeIndexRef.current]
      const progress = faceIsLive ? challengeProgress(face.metrics, challenge.id) : 0
      const remaining = Math.max(0, CHALLENGE_SECONDS - (now - challengeStartedRef.current) / 1000)

      if (progress >= 0.72) {
        if (!holdStartedRef.current) holdStartedRef.current = now
        if (now - holdStartedRef.current >= HOLD_MS) {
          advance(true, now, remaining)
          return
        }
      } else {
        holdStartedRef.current = 0
      }

      if (remaining <= 0) {
        advance(false, now, 0)
        return
      }

      const held = holdStartedRef.current ? (now - holdStartedRef.current) / HOLD_MS : 0
      setUi((previous) => ({
        ...previous,
        progress: Math.min(1, Math.max(progress, held)),
        remaining,
      }))
    }, 70)

    return () => window.clearInterval(timer)
  }, [finishArcade])

  const challenge = CHALLENGES[ui.challengeIndex]
  const faceLive = currentFace && performance.now() - currentFace.updatedAt < 900

  return (
    <div className="gnm-overlay">
      <section className="gnm-stage" aria-label="GNM Head 实时头像">
        {asset ? (
          <HeadStage asset={asset} metrics={faceLive ? currentFace.metrics : null} wireframe={wireframe} />
        ) : (
          <div className="gnm-model-loading">
            <span className="loading-spinner" />
            <strong>{error ? '模型加载失败' : '正在载入 GNM Head'}</strong>
            {error && <small>{error}</small>}
          </div>
        )}

        <div className="gnm-stage-head">
          <div>
            <span>GENERATIVE ANTHROPOMETRIC MODEL</span>
            <strong>GNM Head <em>v3.0</em></strong>
          </div>
          <div className="gnm-view-toggle" aria-label="模型显示模式">
            <button type="button" className={!wireframe ? 'active' : ''} onClick={() => setWireframe(false)}>
              实体
            </button>
            <button type="button" className={wireframe ? 'active' : ''} onClick={() => setWireframe(true)}>
              拓扑
            </button>
          </div>
        </div>

        <div className="gnm-readout" aria-label="实时面部参数">
          <span>微笑 <i style={{ '--value': currentFace?.metrics?.smile || 0 }} /></span>
          <span>张嘴 <i style={{ '--value': currentFace?.metrics?.mouthOpen || 0 }} /></span>
          <span>眨眼 <i style={{ '--value': currentFace?.metrics?.leftBlink || 0 }} /></span>
        </div>

        <p className="gnm-attribution">GNM Head v3.0 · Google · Apache 2.0</p>
      </section>

      <section className="gnm-challenge" aria-live="polite">
        {ui.phase === 'waiting' ? (
          <div className="gnm-waiting">
            <span />
            <strong>等待面部识别</strong>
            <small>正对镜头后自动开始</small>
          </div>
        ) : ui.phase === 'countdown' ? (
          <div className="gnm-countdown">
            <span>{ui.countdown}</span>
            <strong>准备模仿表情</strong>
          </div>
        ) : (
          <>
            <div className="gnm-round-meta">
              <span>挑战 {ui.challengeIndex + 1}/{CHALLENGES.length}</span>
              <strong>{ui.score.toLocaleString()} 分</strong>
              <span>{Math.ceil(ui.remaining)} 秒</span>
            </div>
            <div className="gnm-prompt">
              <strong>{challenge.label}</strong>
              <span>{challenge.cue}</span>
            </div>
            <div className="gnm-progress" aria-label={`动作完成度 ${Math.round(ui.progress * 100)}%`}>
              <i style={{ width: `${ui.progress * 100}%` }} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default GNMHeadOverlay
