import React, { useRef, useState, useEffect } from 'react'
import useGameStore from '../store/gameStore'
import './BackgroundMusic.css'

// 背景音乐组件
function BackgroundMusic() {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.4)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [autoPlayAttempted, setAutoPlayAttempted] = useState(false)
  const { gameState } = useGameStore()
  
  // 音乐列表 - 使用更好听的免费音乐
  const tracks = [
    {
      name: 'Happy Adventure',
      // 使用免费的背景音乐 - 可以替换为实际的音乐文件
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    },
    {
      name: 'Magic Dreams',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    },
    {
      name: 'Starry Night',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    },
    {
      name: 'Wonderful World',
      // 可以使用其他免费音乐源，比如：
      // - https://freemusicarchive.org/
      // - https://incompetech.com/music/
      // - https://www.bensound.com/
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
    }
  ]
  
  // 播放/暂停
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true)
            setAutoPlayAttempted(true)
            console.log('背景音乐播放成功')
          })
          .catch(e => {
            console.log('Audio play failed:', e)
            setIsPlaying(false)
          })
      }
    }
  }
  
  // 切换曲目
  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % tracks.length)
  }
  
  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length)
  }
  
  // 音量控制
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }
  
  // 当曲目改变时更新音频源
  useEffect(() => {
    if (audioRef.current) {
      const wasPlaying = isPlaying
      audioRef.current.src = tracks[currentTrack].url
      audioRef.current.volume = volume
      audioRef.current.load()
      
      if (wasPlaying) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => {
            console.log('Audio play failed:', e)
            setIsPlaying(false)
          })
      }
    }
  }, [currentTrack])
  
  // 游戏开始时自动播放（用户点击开始游戏后）
  useEffect(() => {
    if (gameState === 'learning' && audioRef.current) {
      // 用户已经点击了"开始游戏"按钮，所以可以自动播放
      const timer = setTimeout(() => {
        if (audioRef.current && !isPlaying) {
          audioRef.current.play()
            .then(() => {
              setIsPlaying(true)
              setAutoPlayAttempted(true)
              console.log('背景音乐自动播放成功')
            })
            .catch(e => {
              console.log('自动播放失败，请手动点击播放按钮:', e)
              // 如果自动播放失败，用户需要手动点击播放按钮
            })
        }
      }, 300)
      
      return () => clearTimeout(timer)
    } else if (gameState === 'idle' || gameState === 'completed') {
      // 游戏结束时暂停音乐
      if (audioRef.current && isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      }
    }
  }, [gameState, isPlaying])
  
  // 初始化音频
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
      audioRef.current.loop = true
      audioRef.current.preload = 'auto'
    }
  }, [])
  
  return (
    <div className="music-player">
      <audio 
        ref={audioRef}
        loop
        preload="auto"
        onEnded={() => setIsPlaying(false)}
        onError={(e) => {
          console.error('Audio error:', e)
          setIsPlaying(false)
        }}
      />
      
      <div className="music-controls">
        <button className="music-btn play-btn" onClick={togglePlay}>
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <div className="track-info">
          <span className="music-icon">🎵</span>
          <span className="track-name">{tracks[currentTrack].name}</span>
        </div>
        
        <div className="track-controls">
          <button className="music-btn small" onClick={prevTrack}>⏮️</button>
          <button className="music-btn small" onClick={nextTrack}>⏭️</button>
        </div>
        
        <div className="volume-control">
          <span className="volume-icon">{volume > 0.5 ? '🔊' : volume > 0 ? '🔉' : '🔇'}</span>
          <input 
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      </div>
    </div>
  )
}

export default BackgroundMusic
