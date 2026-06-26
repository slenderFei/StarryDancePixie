import React, { lazy, useEffect, Suspense, useRef, useState } from 'react'
import WordPanel from './components/WordPanel'
import GameUI from './components/GameUI'
import LoadingScreen from './components/LoadingScreen'
import BackgroundMusic from './components/BackgroundMusic'
import LoginScreen from './components/LoginScreen'
import AdminDashboard from './components/AdminDashboard'
import useGameStore from './store/gameStore'
import { getSession, isRootSession } from './utils/auth'
import { initSpeechSynthesis } from './utils/soundEffects'
import './App.css'

const GameCanvas = lazy(() => import('./components/GameCanvas'))
const PoseDetector = lazy(() => import('./components/PoseDetector'))
const FallingWordsOverlay = lazy(() => import('./components/FallingWordsOverlay'))
const SpellingWordsOverlay = lazy(() => import('./components/SpellingWordsOverlay'))
const JumpRopeOverlay = lazy(() => import('./components/JumpRopeOverlay'))

function App() {
  const gameState = useGameStore((s) => s.gameState)
  const playMode = useGameStore((s) => s.playMode)
  const setMousePosition = useGameStore((s) => s.setMousePosition)
  const resetGame = useGameStore((s) => s.resetGame)
  const [session, setSession] = useState(() => getSession())
  const [view, setView] = useState(() => (isRootSession(getSession()) ? 'admin' : 'game'))
  const mouseFrameRef = useRef(null)
  const mousePointRef = useRef({ x: 0, y: 0 })

  const isClassicPlaying =
    gameState === 'learning' ||
    gameState === 'action_pending' ||
    gameState === 'action_success'
  const isArcadePlaying = gameState === 'arcade_playing'
  const isPlaying = isClassicPlaying || isArcadePlaying
  const hideCanvasForArcade =
    isArcadePlaying && (playMode === 'balloon' || playMode === 'fruit' || playMode === 'rope')
  const shouldRenderCanvas = isPlaying && !hideCanvasForArcade
  
  // 初始化语音合成（某些浏览器需要）
  useEffect(() => {
    initSpeechSynthesis()
  }, [])

  const handleLogin = (nextSession) => {
    setSession(nextSession)
    setView(isRootSession(nextSession) ? 'admin' : 'game')
  }

  const handleSessionChange = () => {
    resetGame()
    const nextSession = getSession()
    setSession(nextSession)
    setView(isRootSession(nextSession) ? 'admin' : 'game')
  }
  
  // 追踪鼠标位置
  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePointRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      }

      if (mouseFrameRef.current) return
      mouseFrameRef.current = requestAnimationFrame(() => {
        mouseFrameRef.current = null
        setMousePosition(mousePointRef.current.x, mousePointRef.current.y)
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (mouseFrameRef.current) {
        cancelAnimationFrame(mouseFrameRef.current)
      }
    }
  }, [setMousePosition])
  
  if (!session) {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (view === 'admin') {
    return <AdminDashboard onExit={() => setView('game')} onSessionChange={handleSessionChange} />
  }

  return (
    <div className="app-container">
      {/* 3D 场景 */}
      {shouldRenderCanvas && (
        <Suspense fallback={null}>
          <GameCanvas />
        </Suspense>
      )}
      
      {/* MediaPipe 摄像头与骨架 */}
      <Suspense fallback={null}>
        <PoseDetector />
      </Suspense>

      {/* 街机图层：盖住全屏实况，夹在摄像头层与顶部 GameUI 之间 */}
      {isArcadePlaying && playMode === 'balloon' && (
        <Suspense fallback={null}>
          <FallingWordsOverlay />
        </Suspense>
      )}

      {isArcadePlaying && playMode === 'fruit' && (
        <Suspense fallback={null}>
          <SpellingWordsOverlay />
        </Suspense>
      )}

      {isArcadePlaying && playMode === 'rope' && (
        <Suspense fallback={null}>
          <JumpRopeOverlay />
        </Suspense>
      )}

      {/* 游戏 UI */}
      <GameUI
        session={session}
        onOpenAdmin={() => setView('admin')}
        onSessionChange={handleSessionChange}
      />
      
      {/* 单词面板 - 右侧 */}
      {isClassicPlaying && <WordPanel />}
      
      {/* 角色标签 - 左上（魔法学单词模式） */}
      {isClassicPlaying && (
        <div className="avatar-label">
          ✨ 小精灵会跟着你动哦！
        </div>
      )}
      
      {/* 背景音乐播放器 */}
      {isPlaying && <BackgroundMusic />}
      
      {/* 加载屏幕 */}
      {gameState === 'idle' && <LoadingScreen />}
    </div>
  )
}

export default App
