import React, { useCallback, useEffect, useRef, useState } from 'react'
import useGameStore from '../store/gameStore'
import { playSuccessTone, playWordPronunciation } from '../utils/soundEffects'
import './SpellingWordsOverlay.css'

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

function normalize(value) {
  return String(value || '').replace(/[^a-z]/gi, '').toUpperCase()
}

function compactWord(word) {
  return { id: word?.id, word: word?.word, meaning: word?.meaning }
}

function TypingWordsOverlay() {
  const words = useGameStore((s) => s.arcadeSessionWords)
  const finishArcade = useGameStore((s) => s.finishArcade)
  const gameState = useGameStore((s) => s.gameState)
  const playMode = useGameStore((s) => s.playMode)
  const inputRef = useRef(null)
  const timersRef = useRef(new Set())
  const stateRef = useRef({
    currentIndex: 0, typed: '', startedAt: 0, wordStartedAt: 0, errors: 0,
    correctChars: 0, keypresses: 0, score: 0, combo: 0, bestCombo: 0,
    completedWords: [], spellingResults: [], skippedCount: 0, transitioning: false,
    finished: false, status: '输入第一个字母开始练习',
  })
  const [ui, setUi] = useState({
    currentIndex: 0, typed: '', elapsedSeconds: 0, errors: 0, correctChars: 0,
    keypresses: 0, score: 0, combo: 0, bestCombo: 0, completedCount: 0,
    skippedCount: 0, status: '输入第一个字母开始练习',
  })

  const sessionTotal = words.length
  const currentWord = words[ui.currentIndex] || null
  const target = normalize(currentWord?.word)
  const nextLetter = target[ui.typed.length] || ''
  const completedProgress = ui.completedCount + ui.skippedCount
  const accuracy = ui.keypresses ? Math.max(0, Math.round((ui.correctChars / (ui.correctChars + ui.errors)) * 100)) : 100
  const wpm = ui.elapsedSeconds > 0 ? Math.round((ui.correctChars / 5) / (ui.elapsedSeconds / 60)) : 0

  const publish = useCallback(() => {
    const state = stateRef.current
    const elapsedSeconds = state.startedAt ? Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)) : 0
    setUi({
      currentIndex: state.currentIndex, typed: state.typed, elapsedSeconds,
      errors: state.errors, correctChars: state.correctChars, keypresses: state.keypresses,
      score: state.score, combo: state.combo, bestCombo: state.bestCombo,
      completedCount: state.completedWords.length, skippedCount: state.skippedCount,
      status: state.status,
    })
  }, [])

  const schedule = useCallback((callback, delay) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer)
      callback()
    }, delay)
    timersRef.current.add(timer)
  }, [])

  const finishRun = useCallback(() => {
    const state = stateRef.current
    if (state.finished) return
    state.finished = true
    const elapsedSeconds = state.startedAt ? Math.max(1, Math.round((Date.now() - state.startedAt) / 1000)) : 0
    const totalAttempts = state.correctChars + state.errors
    const typingAccuracy = totalAttempts ? Math.round((state.correctChars / totalAttempts) * 100) : 100
    const typingWpm = elapsedSeconds ? Math.round((state.correctChars / 5) / (elapsedSeconds / 60)) : 0
    finishArcade({
      playMode: 'fruit', arcadeVersus: false, sessionTotal, allWords: words,
      poppedWords: [...state.completedWords], missedWords: words.filter((word) => !state.completedWords.some((completed) => completed.id === word.id)),
      missed: state.skippedCount, player1Hits: state.completedWords.length, player2Hits: 0,
      spellingResults: [...state.spellingResults], score: state.score, rankScore: state.score,
      bestCombo: state.bestCombo, durationSeconds: elapsedSeconds, typingAccuracy, typingWpm,
      completed: state.completedWords.length === sessionTotal,
    })
  }, [finishArcade, sessionTotal, words])

  const advance = useCallback(() => {
    const state = stateRef.current
    if (state.currentIndex + 1 >= sessionTotal) {
      finishRun()
      return
    }
    state.currentIndex += 1
    state.typed = ''
    state.wordStartedAt = Date.now()
    state.transitioning = false
    state.status = '准备好后继续输入'
    publish()
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }, [finishRun, publish, sessionTotal])

  const completeWord = useCallback(() => {
    const state = stateRef.current
    const word = words[state.currentIndex]
    if (!word || state.transitioning) return
    state.transitioning = true
    state.combo += 1
    state.bestCombo = Math.max(state.bestCombo, state.combo)
    const wordSeconds = state.wordStartedAt ? Math.max(1, (Date.now() - state.wordStartedAt) / 1000) : 1
    const points = 100 + Math.max(0, 80 - Math.round(wordSeconds * 3)) + state.combo * 15
    state.score += points
    state.completedWords.push(word)
    state.spellingResults.push({ ...compactWord(word), targetWord: word.word, spelledWord: state.typed, attempts: [], canceledCount: 0, completedAt: new Date().toISOString() })
    state.status = `拼写正确 · +${points} 分`
    publish()
    playSuccessTone(Math.min(5, state.combo))
    playWordPronunciation(word.word)
    schedule(advance, 650)
  }, [advance, publish, schedule, words])

  const handleInput = useCallback((event) => {
    const state = stateRef.current
    if (state.transitioning || state.finished) return
    const word = words[state.currentIndex]
    const expected = normalize(word?.word)
    const next = normalize(event.target.value).slice(0, expected.length)
    state.keypresses += 1
    if (next && !expected.startsWith(next)) {
      state.errors += 1
      state.status = `字母不匹配，下一位应为 “${expected[state.typed.length] || expected[0]}”`
      publish()
      return
    }
    if (!state.startedAt) state.startedAt = Date.now()
    if (!state.wordStartedAt) state.wordStartedAt = Date.now()
    state.correctChars += Math.max(0, next.length - state.typed.length)
    state.typed = next
    state.status = next.length === expected.length ? '拼写完成' : '继续输入'
    publish()
    if (next.length === expected.length) completeWord()
  }, [completeWord, publish, words])

  const skipWord = useCallback(() => {
    const state = stateRef.current
    if (state.transitioning || state.finished) return
    state.transitioning = true
    state.combo = 0
    state.skippedCount += 1
    state.status = '已跳过，下一词继续'
    publish()
    schedule(advance, 420)
  }, [advance, publish, schedule])

  const playCurrentWord = useCallback(() => {
    if (currentWord?.word) playWordPronunciation(currentWord.word)
    inputRef.current?.focus()
  }, [currentWord])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (stateRef.current.startedAt && !stateRef.current.finished) publish()
    }, 1000)
    inputRef.current?.focus()
    return () => {
      window.clearInterval(interval)
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [publish])

  if (gameState !== 'arcade_playing' || playMode !== 'fruit' || !currentWord) return null

  return (
    <div className="typing-words-overlay">
      <div className="typing-words-background" aria-hidden="true" />
      <header className="typing-words-header">
        <div><span className="typing-eyebrow">TYPE WORDS · ARCADE PRACTICE</span><h1>单词键盘练习</h1><p>看释义，输入对应的英文单词</p></div>
        <div className="typing-header-actions"><button type="button" onClick={playCurrentWord} aria-label="播放单词发音">🔊 发音</button><span>按 Esc 返回选模式</span></div>
      </header>

      <main className="typing-words-main">
        <section className="typing-practice-card" aria-label="单词键盘练习">
          <div className="typing-practice-top"><span>单词 {ui.currentIndex + 1} / {sessionTotal}</span><span>{Math.round((completedProgress / sessionTotal) * 100)}%</span></div>
          <div className="typing-progress-track"><i style={{ width: `${(completedProgress / sessionTotal) * 100}%` }} /></div>
          <div className="typing-meaning">{currentWord.meaning}</div>
          <div className="typing-word-guide" aria-label="目标单词">{target.split('').map((letter, index) => <span key={`${currentWord.id}-${index}`} className={index < ui.typed.length ? 'typed' : index === ui.typed.length ? 'next' : ''}>{index < ui.typed.length ? letter : '·'}</span>)}</div>
          <input ref={inputRef} className="typing-input" value={ui.typed} onChange={handleInput} autoComplete="off" autoCapitalize="characters" spellCheck="false" aria-label="输入英文单词" placeholder="在这里输入英文…" />
          <p className="typing-feedback">{ui.status}</p>
          <div className="typing-actions"><button type="button" className="typing-skip" onClick={skipWord}>跳过本词</button><span>输入正确后自动进入下一词</span></div>
        </section>

        <aside className="typing-side-panel">
          <div className="typing-metric"><span>WPM</span><strong>{wpm}</strong><small>每分钟单词</small></div>
          <div className="typing-metric"><span>准确率</span><strong>{accuracy}%</strong><small>{ui.errors} 次错误</small></div>
          <div className="typing-metric"><span>连击</span><strong>{ui.combo}</strong><small>最高 {ui.bestCombo}</small></div>
          <div className="typing-metric score"><span>得分</span><strong>{ui.score}</strong><small>{ui.completedCount} 词完成</small></div>
        </aside>
      </main>

      <section className="typing-keyboard" aria-label="虚拟键盘">{KEYBOARD_ROWS.map((row) => <div className="typing-keyboard-row" key={row.join('')}>{row.map((key) => <span key={key} className={key === nextLetter ? 'active' : ''}>{key}</span>)}</div>)}</section>
      <footer className="typing-words-footer"><span>⌨️ 键盘输入模式</span><span>{Math.floor(ui.elapsedSeconds / 60).toString().padStart(2, '0')}:{(ui.elapsedSeconds % 60).toString().padStart(2, '0')}</span><b>{ui.completedCount} / {sessionTotal} 已完成</b></footer>
    </div>
  )
}

export default TypingWordsOverlay
