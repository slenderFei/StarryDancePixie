import React, { useMemo, useState, useEffect } from 'react'
import useGameStore from '../store/gameStore'
import './LoadingScreen.css'

function LoadingScreen() {
  const { startGame, cameraReady } = useGameStore()
  const [showContent, setShowContent] = useState(false)
  const [typedText, setTypedText] = useState('')

  const welcomeText = '欢迎来到星光词汇挑战！'
  const decorations = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        fontSize: `${Math.random() * 16 + 9}px`,
        glyph: ['✦', '✧', '✺', '✹'][Math.floor(Math.random() * 4)],
      })),
    [],
  )

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!showContent) return undefined
    let index = 0
    const typeTimer = setInterval(() => {
      if (index <= welcomeText.length) {
        setTypedText(welcomeText.slice(0, index))
        index += 1
      } else {
        clearInterval(typeTimer)
      }
    }, 100)
    return () => clearInterval(typeTimer)
  }, [showContent])

  return (
    <div className={`loading-screen ${showContent ? 'show' : ''}`}>
      <div className="loading-content loading-content-wide">
        <div className="logo-section">
          <div className="logo-stars">
            <span className="star star-1">⭐</span>
            <span className="star star-2">✨</span>
            <span className="star star-3">🌟</span>
            <span className="star star-4">✨</span>
            <span className="star star-5">⭐</span>
          </div>
          <div className="logo-sprite">
            <div className="sprite-body"></div>
            <div className="sprite-face">
              <div className="sprite-eyes">
                <span className="eye left"></span>
                <span className="eye right"></span>
              </div>
              <div className="sprite-blush left"></div>
              <div className="sprite-blush right"></div>
              <div className="sprite-smile"></div>
            </div>
            <div className="sprite-wings">
              <div className="wing left"></div>
              <div className="wing right"></div>
            </div>
          </div>
        </div>

        <h1 className="main-title">
          <span className="title-icon">✨</span>
          星光词汇挑战
          <span className="title-icon">✨</span>
        </h1>

        <p className="welcome-text">
          {typedText}
          <span className="cursor">|</span>
        </p>

        <div className="camera-notice">
          <span className="camera-icon">{cameraReady ? '📷' : '⏳'}</span>
          <span className="camera-text">
            {cameraReady ? '摄像头已就绪！' : '正在准备摄像头...'}
          </span>
        </div>

        <div className="mode-section">
          <h2 className="mode-heading">选一个游戏模式</h2>
          <div className="mode-cards">
            <button
              type="button"
              className={`mode-card ${cameraReady ? 'ready' : ''}`}
              onClick={() => startGame({ mode: 'classic' })}
              disabled={!cameraReady}
              aria-disabled={!cameraReady}
            >
              <span className="mode-icon">📚</span>
              <span className="mode-title">体感学单词（经典）</span>
              <span className="mode-desc">跟随动作提示，在 3D 场景里学完词表。</span>
            </button>

            <div
              className={`mode-card arcade-versus-slot ${cameraReady ? 'ready' : ''}`}
              aria-disabled={!cameraReady}
            >
              <span className="mode-icon">🎈</span>
              <span className="mode-title">气球跳跳碰（全屏摄像头）</span>
              <span className="mode-desc">
                实时画面上叠加火柴人骨架与单词气球下落，从词池中随机抽取 60 词。双人时画面左右两侧分别代表
                P1 / P2（单摄像头）。
              </span>
              <div className="versus-actions">
                <button
                  type="button"
                  className="mode-sub-btn"
                  onClick={() => startGame({ mode: 'balloon', versus: false })}
                  disabled={!cameraReady}
                >
                  单机
                </button>
                <button
                  type="button"
                  className="mode-sub-btn accent"
                  onClick={() => startGame({ mode: 'balloon', versus: true })}
                  disabled={!cameraReady}
                >
                  双人竞赛
                </button>
              </div>
            </div>

            <div
              className={`mode-card arcade-versus-slot ${cameraReady ? 'ready' : ''}`}
              aria-disabled={!cameraReady}
            >
              <span className="mode-icon">✍️</span>
              <span className="mode-title">单词拼写</span>
              <span className="mode-desc">
                只看中文释义，用右手食指在摄像头画面中拼出英文单词。一局随机 5 词。
              </span>
              <div className="versus-actions">
                <button
                  type="button"
                  className="mode-sub-btn spelling-start"
                  onClick={() => startGame({ mode: 'fruit', versus: false })}
                  disabled={!cameraReady}
                >
                  开始拼写
                </button>
              </div>
            </div>
          </div>
        </div>

        {!cameraReady && (
          <p className="mode-wait-muted">请先允许摄像头并开始检测，按钮即可亮起。</p>
        )}

        <div className="menu-footer">
          <span>上半身入镜</span>
          <span>保持光线充足</span>
          <span>挥动手臂开始挑战</span>
        </div>
      </div>

      <div className="bg-decorations">
        {decorations.map((star) => (
          <div
            key={star.id}
            className="floating-star"
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.animationDelay,
              fontSize: star.fontSize,
            }}
          >
            {star.glyph}
          </div>
        ))}
      </div>
    </div>
  )
}

export default LoadingScreen
