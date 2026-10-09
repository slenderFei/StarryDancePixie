import React, { useState } from 'react'
import useGameStore from '../store/gameStore'
import { logout } from '../utils/auth'
import './SpellingWordsOverlay.css'

const TYPE_WORDS_URL = 'https://typewords.cc/words'

function SpellingWordsOverlay({ onSessionChange }) {
  const gameState = useGameStore((s) => s.gameState)
  const playMode = useGameStore((s) => s.playMode)
  const resetGame = useGameStore((s) => s.resetGame)
  const [loaded, setLoaded] = useState(false)

  const handleLogout = () => {
    logout()
    onSessionChange()
  }

  if (gameState !== 'arcade_playing' || playMode !== 'fruit') return null

  return (
    <div className="typewords-embed-overlay">
      {!loaded && <div className="typewords-embed-loading"><strong>正在加载 Type Words</strong><span>请稍候，正在打开单词练习页面…</span></div>}
      <iframe
        className="typewords-embed-frame"
        src={TYPE_WORDS_URL}
        title="Type Words 单词练习"
        allow="autoplay; clipboard-write"
        onLoad={() => setLoaded(true)}
      />
      <div className="typewords-embed-topbar">
        <button type="button" onClick={resetGame}>
          ← 返回星光词汇
        </button>
        <button type="button" className="typewords-logout-button" onClick={handleLogout}>
          退出登录
        </button>
        <span>Type Words · 词典和单词可直接点击</span>
      </div>
      <div className="typewords-embed-tools">
        <span>Type Words · 单词练习</span>
        <a href={TYPE_WORDS_URL} target="_blank" rel="noreferrer">新标签页打开 ↗</a>
      </div>
    </div>
  )
}

export default SpellingWordsOverlay
