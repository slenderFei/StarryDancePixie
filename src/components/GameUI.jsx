import React, { useEffect } from 'react'
import useGameStore from '../store/gameStore'
import { isRootSession, logout } from '../utils/auth'
import './GameUI.css'

function modeTitle(playMode, arcadeVersus) {
  if (playMode === 'balloon')
    return arcadeVersus ? '🎈 气球跳跳碰 · 双人' : '🎈 气球跳跳碰 · 单机'
  if (playMode === 'fruit')
    return arcadeVersus ? '🍉 切水果 · 双人' : '🍉 单词切水果 · 单机'
  return '星光词汇挑战'
}

function GameUI({ session, onOpenAdmin, onSessionChange }) {
  const gameState = useGameStore((s) => s.gameState)
  const score = useGameStore((s) => s.score)
  const completedWords = useGameStore((s) => s.completedWords)
  const words = useGameStore((s) => s.words)
  const resetGame = useGameStore((s) => s.resetGame)
  const arcadeResult = useGameStore((s) => s.arcadeResult)
  const playMode = useGameStore((s) => s.playMode)
  const arcadeVersus = useGameStore((s) => s.arcadeVersus)
  const canExit =
    gameState === 'learning' ||
    gameState === 'action_pending' ||
    gameState === 'action_success' ||
    gameState === 'arcade_playing' ||
    gameState === 'completed'

  useEffect(() => {
    if (!canExit) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        resetGame()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canExit, resetGame])

  const handleLogout = () => {
    logout()
    onSessionChange()
  }

  const accountActions = (
    <div className="account-actions">
      <span>{session?.username}</span>
      {isRootSession(session) && (
        <button type="button" onClick={onOpenAdmin}>
          后台
        </button>
      )}
      <button type="button" onClick={handleLogout}>
        退出
      </button>
    </div>
  )

  if (gameState === 'completed' && arcadeResult) {
    const r = arcadeResult
    const versus = !!(r.arcadeVersus ?? r.fruitVersus)
    const learned = r.poppedWords.length
    const rate = Math.min(100, Math.round((learned / r.sessionTotal) * 100))

    return (
      <div className="game-ui completion-screen">
        {accountActions}
        <div className="completion-card arcade-complete">
          <h1 className="completion-title">🎯 一局结束啦！</h1>
          <p className="arcade-complete-sub">{modeTitle(r.playMode, versus)}</p>

          <div className="completion-stats arcade-stats-row">
            <div className="stat-item highlight">
              <span className="stat-icon">{r.playMode === 'balloon' ? '🎈' : '🍉'}</span>
              <span className="stat-value">{learned}</span>
              <span className="stat-label">击破单词</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📦</span>
              <span className="stat-value">{r.sessionTotal}</span>
              <span className="stat-label">本局总数</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">💨</span>
              <span className="stat-value">{r.missed}</span>
              <span className="stat-label">漏接</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🏆</span>
              <span className="stat-value">{rate}%</span>
              <span className="stat-label">击中率</span>
            </div>
          </div>

          {versus && (
            <div className="versus-final">
              <span>🔵 P1 · {r.player1Hits ?? 0}</span>
              <span className="vs-dot">⚡</span>
              <span>🔴 P2 · {r.player2Hits ?? 0}</span>
            </div>
          )}

          <div className="completion-words">
            <h3>击破的单词</h3>
            <div className="words-grid">
              {(r.poppedWords || []).map((word, idx) => (
                <div key={`${word.id}-${idx}`} className="word-badge">
                  <span className="word-en">{word.word}</span>
                  <span className="word-cn">{word.meaning}</span>
                </div>
              ))}
            </div>
          </div>

          <button type="button" className="play-again-btn" onClick={resetGame}>
            <span>🏠</span>
            返回选模式
          </button>

          <p className="encouragement">
            {rate >= 80
              ? '反应超快！再玩一局冲击满分吧！💫'
              : '多花一点点时间看准位置就更准啦～加油！💪'}
          </p>
        </div>
      </div>
    )
  }

  // 魔法学单词通关
  if (gameState === 'completed') {
    const totalScore = score
    const wordsLearned = completedWords.length
    const perfectScore = wordsLearned === words.length

    return (
      <div className="game-ui completion-screen">
        {accountActions}
        <div className="completion-card">
          <div className="completion-stars">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="star" style={{ animationDelay: `${i * 0.1}s` }}>
                ⭐
              </span>
            ))}
          </div>

          <h1 className="completion-title">
            {perfectScore ? '🎉 完美通关！' : '✨ 太棒了！'}
          </h1>

          <div className="completion-stats">
            <div className="stat-item">
              <span className="stat-icon">📚</span>
              <span className="stat-value">{wordsLearned}</span>
              <span className="stat-label">学会的单词</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <span className="stat-value">{totalScore}</span>
              <span className="stat-label">获得积分</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🏆</span>
              <span className="stat-value">{Math.round((wordsLearned / words.length) * 100)}%</span>
              <span className="stat-label">完成率</span>
            </div>
          </div>

          <div className="completion-words">
            <h3>今日学会的单词：</h3>
            <div className="words-grid">
              {completedWords.map((word) => (
                <div key={word.id} className="word-badge">
                  <span className="word-en">{word.word}</span>
                  <span className="word-cn">{word.meaning}</span>
                </div>
              ))}
            </div>
          </div>

          <button type="button" className="play-again-btn" onClick={resetGame}>
            <span>🔄</span>
            再来一次
          </button>

          <p className="encouragement">
            {perfectScore
              ? '你是最闪亮的星星！继续保持哦！💫'
              : '每一次练习都让你变得更棒！明天继续加油！💪'}
          </p>
        </div>
      </div>
    )
  }

  const inClassic =
    gameState === 'learning' || gameState === 'action_pending' || gameState === 'action_success'

  if (inClassic || gameState === 'arcade_playing') {
    return (
      <div className="game-ui in-game">
        <div className="top-bar">
          <div className="game-title">
            <span className="title-icon">✨</span>
            <span>{gameState === 'arcade_playing' ? modeTitle(playMode, arcadeVersus) : '星光体感学单词'}</span>
          </div>
          <button type="button" className="exit-btn" onClick={resetGame}>
            返回首页
          </button>
          {accountActions}
        </div>
      </div>
    )
  }

  return <div className="game-ui account-only">{accountActions}</div>
}

export default GameUI
