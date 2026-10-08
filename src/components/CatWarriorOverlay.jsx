import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useGameStore, { getLatestPose } from '../store/gameStore'
import { playSuccessTone } from '../utils/soundEffects'
import './CatWarriorOverlay.css'

const visible = (p, indexes) => indexes.every((index) => p?.[index] && (p[index].visibility ?? 1) > 0.45)
const ACTIONS = {
  crouch: (p) => visible(p, [23, 24, 25, 26]) && (p[23].y + p[24].y) / 2 > 0.64,
  guard: (p) => visible(p, [11, 12, 15, 16]) && p[15].y < p[11].y && p[16].y < p[12].y,
  claw: (p) => visible(p, [11, 12, 15, 16]) && Math.abs(p[15].x - p[16].x) > 0.52,
  prowl: (p) => visible(p, [11, 12]) && Math.abs((p[11].x + p[12].x) / 2 - 0.5) > 0.08,
  pounce: (p) => visible(p, [23, 24, 27, 28]) && (p[23].y + p[24].y) / 2 < 0.54,
  unite: (p) => visible(p, [11, 12, 15, 16]) && Math.abs(p[15].x - p[16].x) < 0.16 && (p[15].y + p[16].y) / 2 > (p[11].y + p[12].y) / 2,
}

const MISSIONS = [
  { id: 'm1', title: '苔藓潜行', action: 'crouch', label: '蹲低身体，悄悄穿过灌木', color: '#90c98a' },
  { id: 'm2', title: '月下警戒', action: 'guard', label: '双手举高，观察四周', color: '#9ec5ff' },
  { id: 'm3', title: '利爪出鞘', action: 'claw', label: '张开双臂，挥出猫爪', color: '#f6b27c' },
  { id: 'm4', title: '林间巡行', action: 'prowl', label: '身体向一侧倾斜，追踪气味', color: '#d3a7ef' },
  { id: 'm5', title: '跃过溪流', action: 'pounce', label: '双脚离地，完成一次跃击', color: '#71d5df' },
  { id: 'm6', title: '族群集结', action: 'unite', label: '双手合拢，向族群致意', color: '#f0d77d' },
]

function CatWarriorOverlay() {
  const finishArcade = useGameStore((s) => s.finishArcade)
  const gameState = useGameStore((s) => s.gameState)
  const playMode = useGameStore((s) => s.playMode)
  const [missionIndex, setMissionIndex] = useState(0)
  const [phase, setPhase] = useState('briefing')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [feedback, setFeedback] = useState('准备接受第一项巡林任务')
  const [startedAt] = useState(() => Date.now())
  const lockedRef = useRef(false)
  const actionStartedRef = useRef(0)
  const mission = MISSIONS[missionIndex]
  const progress = Math.round((missionIndex / MISSIONS.length) * 100)
  const stars = useMemo(() => Array.from({ length: 18 }, (_, i) => i), [])

  const completeMission = useCallback(() => {
    if (phase !== 'active' || lockedRef.current) return
    lockedRef.current = true
    const nextCombo = combo + 1
    const nextScore = score + 120 + nextCombo * 25
    setCombo(nextCombo)
    setScore(nextScore)
    setFeedback(`${mission.title}完成！勇气 +${120 + nextCombo * 25}`)
    playSuccessTone(Math.min(5, nextCombo))
    setPhase('success')
    window.setTimeout(() => {
      if (missionIndex + 1 >= MISSIONS.length) {
        finishArcade({ playMode: 'catwarrior', arcadeVersus: false, sessionTotal: MISSIONS.length, allWords: MISSIONS, poppedWords: MISSIONS.slice(0, missionIndex + 1), missed: 0, player1Hits: missionIndex + 1, player2Hits: 0, score: nextScore, rankScore: nextScore, completed: true, catMissions: missionIndex + 1, bestCombo: nextCombo, durationSeconds: Math.round((Date.now() - startedAt) / 1000) })
      } else {
        setMissionIndex((value) => value + 1)
        setFeedback('新的巡林线索出现了')
        setPhase('active')
        lockedRef.current = false
      }
    }, 900)
  }, [combo, finishArcade, mission, missionIndex, phase, score, startedAt])

  useEffect(() => {
    if (phase !== 'active') return undefined
    const timer = window.setInterval(() => {
      if (ACTIONS[mission.action]?.(getLatestPose())) {
        if (!actionStartedRef.current) actionStartedRef.current = performance.now()
        if (performance.now() - actionStartedRef.current >= 420) completeMission()
      } else {
        actionStartedRef.current = 0
      }
    }, 90)
    return () => {
      window.clearInterval(timer)
      actionStartedRef.current = 0
    }
  }, [completeMission, mission, phase])

  if (gameState !== 'arcade_playing' || playMode !== 'catwarrior') return null

  return (
    <div className="cat-warrior-overlay" style={{ '--mission-color': mission.color }}>
      <div className="cat-night-sky" aria-hidden="true"><span className="cat-moon" />{stars.map((star) => <i key={star} style={{ '--star': star }} />)}</div>
      <header className="cat-warrior-header"><div><span className="cat-eyebrow">MOONCLAN PATROL</span><h1>猫武士 · 月影巡林</h1><p>守护族群，完成今夜的六项巡林任务</p></div><div className="cat-score"><span>勇气值</span><strong>{score}</strong><em>{combo > 1 ? `${combo} 连击` : '新兵'}</em></div></header>
      <main className="cat-warrior-main"><aside className="cat-mission-rail" aria-label="巡林任务进度"><div className="cat-progress-track"><i style={{ height: `${progress}%`, '--progress': `${progress}%` }} /></div>{MISSIONS.map((item, itemIndex) => <div key={item.id} className={`cat-mission-step ${itemIndex < missionIndex ? 'done' : ''} ${itemIndex === missionIndex ? 'current' : ''}`}><span>{itemIndex < missionIndex ? '✓' : itemIndex + 1}</span><small>{item.title}</small></div>)}</aside><section className={`cat-stage cat-phase-${phase}`}><div className="cat-stage-copy"><span>任务 {missionIndex + 1} / {MISSIONS.length}</span><h2>{phase === 'briefing' ? '夜色降临' : mission.title}</h2><p>{phase === 'briefing' ? '跟随猫武士完成一段安全、清晰的动作挑战。' : mission.label}</p></div><img className="cat-warrior-art" src="/assets/cat-warrior.svg" alt="猫武士角色" /><div className="cat-action-ring"><span>{phase === 'briefing' ? '准备' : phase === 'success' ? '完成' : '行动'}</span></div><div className="cat-feedback">{feedback}</div>{phase === 'briefing' && <button type="button" className="cat-start-btn" onClick={() => { setPhase('active'); setFeedback(mission.label) }}>开始巡林 <span>→</span></button>}{phase === 'active' && <div className="cat-live-badge"><i />正在追踪动作</div>}</section></main><footer className="cat-warrior-footer"><span>动作识别开启</span><span>保持全身入镜 · 光线充足</span><b>{missionIndex} / {MISSIONS.length} 已完成</b></footer>
    </div>
  )
}

export default CatWarriorOverlay
