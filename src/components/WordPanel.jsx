import React, { useEffect, useState } from 'react'
import useGameStore from '../store/gameStore'
import './WordPanel.css'

function WordPanel() {
  const { getCurrentWord, gameState, score, streak, completedWords, words } = useGameStore()
  const currentWord = getCurrentWord()
  const [showWord, setShowWord] = useState(false)
  
  // 入场动画
  useEffect(() => {
    setShowWord(false)
    const timer = setTimeout(() => setShowWord(true), 100)
    return () => clearTimeout(timer)
  }, [currentWord?.id])
  
  if (!currentWord) return null
  
  const progress = ((completedWords.length) / words.length) * 100
  
  return (
    <div className={`word-panel ${showWord ? 'show' : ''} ${gameState === 'action_success' ? 'success' : ''}`}>
      {/* 进度条 */}
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}>
          <div className="progress-glow"></div>
        </div>
        <span className="progress-text">{completedWords.length} / {words.length}</span>
      </div>
      
      {/* 分数和连击 */}
      <div className="score-section">
        <div className="score">
          <span className="score-icon">⭐</span>
          <span className="score-value">{score}</span>
        </div>
        {streak > 1 && (
          <div className="streak">
            <span className="streak-icon">🔥</span>
            <span className="streak-value">x{streak}</span>
          </div>
        )}
      </div>
      
      {/* 单词卡片 */}
      <div className="word-card">
        <div className="word-number">#{currentWord.id}</div>
        
        <div className="word-main">
          <h1 className="word-text">{currentWord.word}</h1>
          <p className="word-pronunciation">{currentWord.pronunciation}</p>
        </div>
        
        <div className="word-meaning">
          <span className="meaning-label">中文释义</span>
          <h2 className="meaning-text">{currentWord.meaning}</h2>
        </div>
        
        <div className="word-divider">
          <span className="divider-star">✨</span>
        </div>
        
        <div className="action-instruction">
          <div className="action-icon">🎯</div>
          <div className="action-text">
            <span className="action-label">魔法动作</span>
            <p className="action-description">{currentWord.actionDescription}</p>
          </div>
        </div>
        
        {/* 成功反馈 */}
        {gameState === 'action_success' && (
          <div className="success-feedback">
            <div className="success-stars">
              <span>⭐</span>
              <span>🌟</span>
              <span>✨</span>
              <span>🌟</span>
              <span>⭐</span>
            </div>
            <p className="success-message">{currentWord.encouragement}</p>
          </div>
        )}
      </div>
      
      {/* 提示 */}
      <div className="hint-section">
        <p className="hint-text">
          {gameState === 'action_success' 
            ? '🎉 太棒了！准备下一个单词...'
            : '💡 完成魔法动作来记住这个单词！'
          }
        </p>
      </div>
    </div>
  )
}

export default WordPanel
