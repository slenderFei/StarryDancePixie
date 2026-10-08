import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useGameStore, { getLatestPose } from '../store/gameStore'
import herbsData from '../data/herbs.json'
import { playSuccessTone, playWordPronunciation } from '../utils/soundEffects'
import './HerbVillageOverlay.css'

const ACTIONS = {
  hands_up: (p) => p?.[15]?.y < p?.[11]?.y && p?.[16]?.y < p?.[12]?.y,
  sway: (p) => Math.abs(((p?.[11]?.x || 0) + (p?.[12]?.x || 0)) / 2 - 0.5) > 0.07,
  arms_spread: (p) => Math.abs((p?.[15]?.x || 0) - (p?.[16]?.x || 0)) > 0.55,
  squat: (p) => ((p?.[25]?.y || 0) + (p?.[26]?.y || 0)) / 2 > 0.76,
  wave: (p) => Math.abs((p?.[15]?.x || 0) - (p?.[16]?.x || 0)) > 0.4,
  hands_together: (p) => Math.abs((p?.[15]?.x || 0) - (p?.[16]?.x || 0)) < 0.14,
}

const HERBS = herbsData.herbs
const fallbackImage = (herb) => `/assets/herb-${herb.id}.svg`
const displayImage = (herb) => herb.image || fallbackImage(herb)
const displayMaterialImage = (herb) => herb.materialImage || fallbackImage(herb)
const recoverImage = (event, herb, type = 'raw') => {
  event.currentTarget.onerror = null
  event.currentTarget.src = type === 'material' ? displayImage(herb) : fallbackImage(herb)
}

function HerbVillageOverlay() {
  const finishArcade = useGameStore((s) => s.finishArcade)
  const sessionWords = useGameStore((s) => s.arcadeSessionWords)
  const gameState = useGameStore((s) => s.gameState)
  const playMode = useGameStore((s) => s.playMode)
  const [sessionHerbs] = useState(() => {
    const pool = sessionWords.length ? sessionWords : HERBS
    const count = Math.min(pool.length, 5 + Math.floor(Math.random() * 6))
    return [...pool].sort(() => 0.5 - Math.random()).slice(0, count)
  })
  const [index, setIndex] = useState(0)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [phase, setPhase] = useState('preview')
  const [feedback, setFeedback] = useState('')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [voiceState, setVoiceState] = useState('idle')
  const [selected, setSelected] = useState([])
  const recognitionRef = useRef(null)
  const current = phase === 'preview' ? sessionHerbs[previewIndex] : sessionHerbs[index]
  const options = useMemo(() => {
    if (!current) return []
    const pool = sessionHerbs.filter((herb) => herb.id !== current.id).sort(() => 0.5 - Math.random()).slice(0, 1)
    return [current, ...pool].sort(() => 0.5 - Math.random())
  }, [current?.id, sessionHerbs])

  const complete = useCallback((herb, method) => {
    if (phase !== 'challenge' || selected.includes(herb.id)) return
    const correct = herb.id === current.id
    setSelected((items) => [...items, herb.id])
    if (correct) {
      const nextCombo = combo + 1
      setScore((value) => value + 100 + nextCombo * 20)
      setCombo(nextCombo)
      setFeedback(method === 'voice' ? `语音识别正确：${current.name}` : '动作正确！药材收集成功')
      playSuccessTone(Math.min(5, nextCombo))
      playWordPronunciation(current.name)
      setTimeout(() => {
        if (index + 1 >= sessionHerbs.length) {
          finishArcade({
            playMode: 'herb', arcadeVersus: false, sessionTotal: sessionHerbs.length,
            allWords: sessionHerbs, poppedWords: sessionHerbs.slice(0, index + 1), missed: 0,
            player1Hits: index + 1, player2Hits: 0, score: score + 100 + nextCombo * 20,
            rankScore: score + 100 + nextCombo * 20, completed: true, completedHerbs: index + 1,
          })
        } else {
          setIndex((value) => value + 1)
          setSelected([])
          setFeedback('')
        }
      }, 1150)
    } else {
      setCombo(0)
      setFeedback('再试一次，观察药材特征')
      playSuccessTone(1)
      setTimeout(() => setSelected([]), 750)
    }
  }, [combo, current, finishArcade, index, phase, score, selected])

  const listen = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceState('unsupported')
      return
    }
    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = false
    recognition.maxAlternatives = 3
    recognition.onstart = () => setVoiceState('listening')
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results[0] || []).map((item) => item.transcript).join('')
      const match = HERBS.find((herb) => transcript.includes(herb.name) || transcript.replaceAll(' ', '').includes(herb.pinyin.replaceAll(' ', '')))
      setVoiceState(match ? 'success' : 'retry')
      if (match) complete(match, 'voice')
      else setFeedback(`听到“${transcript || '未识别'}”，请再说一次药材名`)
    }
    recognition.onerror = () => setVoiceState('retry')
    recognition.onend = () => setVoiceState((value) => value === 'listening' ? 'retry' : value)
    recognitionRef.current = recognition
    recognition.start()
  }

  useEffect(() => () => recognitionRef.current?.abort(), [])

  useEffect(() => {
    if (phase !== 'preview') return undefined
    const timer = setTimeout(() => {
      if (previewIndex + 1 >= sessionHerbs.length) {
        setIndex(0)
        setPhase('challenge')
        setFeedback('观察完成！用动作选择正确的药名')
      } else {
        setPreviewIndex((value) => value + 1)
      }
    }, 1800)
    return () => clearTimeout(timer)
  }, [phase, previewIndex, sessionHerbs.length])

  useEffect(() => {
    if (phase !== 'challenge') return undefined
    const timer = setInterval(() => {
      const pose = getLatestPose()
      if (ACTIONS[current?.action]?.(pose)) complete(current, 'pose')
    }, 100)
    return () => clearInterval(timer)
  }, [complete, current, phase])

  if (gameState !== 'arcade_playing' || playMode !== 'herb') return null

  return (
    <div className="herb-village-overlay">
      <div className="herb-village-bg" />
      <header className="herb-village-header">
        <div><span>HERB VILLAGE</span><h1>识别中草药村</h1></div>
        <div className="herb-village-progress"><strong>{phase === 'preview' ? previewIndex + 1 : index + 1}</strong><span>/ {sessionHerbs.length} 药材</span><b>{score} 分</b></div>
      </header>

      <main className="herb-village-main">
        <div className="herb-library-strip" aria-label="本草图鉴">
          {sessionHerbs.map((herb, herbIndex) => (
            <div key={herb.id} className={`herb-library-item ${herb.id === current?.id ? 'is-current' : ''}`}>
              <img src={displayImage(herb)} onError={(event) => recoverImage(event, herb)} alt="" />
              <span>{herb.name}</span>
              <small>{herb.pinyin}</small>
            </div>
          ))}
        </div>
        <section className={`herb-showcase ${phase}`}>
          <div className="herb-image-pair">
            <figure className="herb-image-wrap"><img src={displayImage(current)} onError={(event) => recoverImage(event, current)} alt={`${current.name}植物原料实物图`} /><figcaption>植物原料</figcaption></figure>
            <figure className="herb-image-wrap herb-material-image"><img src={displayMaterialImage(current)} onError={(event) => recoverImage(event, current, 'material')} alt={`${current.name}中药饮片实物图`} /><figcaption>中药饮片</figcaption></figure>
            <span className="herb-seal">本草图鉴</span>
          </div>
          <div className="herb-info">
            <span className="herb-kicker">{current.origin}</span>
            <h2>{current.name} <small>{current.pinyin}</small></h2>
            <p>{current.habit}</p>
            <div className="herb-property"><span>药性</span><strong>{current.property}</strong><i /></div>
            <div className="herb-preparation"><span>制作说明</span><p>{current.preparation}</p></div>
            <div className="herb-action-guide"><span>动作提示</span><strong>{current.actionLabel}</strong></div>
            {phase === 'preview' ? <p className="herb-feedback">正在认识第 {previewIndex + 1} 味药材…</p> : <p className="herb-feedback">{feedback}</p>}
          </div>
        </section>

        {phase === 'challenge' && <section className="herb-challenge" aria-label="选择药材">
          <div className="herb-challenge-heading"><span>用动作选择正确的药名</span><em>{combo > 1 ? `${combo} 连对` : '两项中选一项'}</em></div>
          <div className="herb-options">{options.map((herb) => <button key={herb.id} className={selected.includes(herb.id) ? 'is-selected' : ''} onClick={() => complete(herb, 'choice')}><img src={displayImage(herb)} onError={(event) => recoverImage(event, herb)} alt="" /><span>{herb.name}</span><small>{herb.pinyin}</small></button>)}</div>
          <button className={`herb-voice ${voiceState}`} onClick={listen}><span>◉</span>{voiceState === 'listening' ? '正在听…' : voiceState === 'unsupported' ? '浏览器不支持语音' : '说出药材名'}</button>
        </section>}
      </main>
      <footer className="herb-village-footer"><span>{phase === 'preview' ? `自动展示 ${previewIndex + 1} / ${sessionHerbs.length}` : `已识别 ${index} / ${sessionHerbs.length}`}</span><span>每味药材都值得认识</span></footer>
    </div>
  )
}

export default HerbVillageOverlay
