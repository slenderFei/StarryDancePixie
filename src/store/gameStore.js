import { create } from 'zustand'
import wordsData from '../data/words.json'
import grade5bData from '../data/words_grade5b.json'
import { playEncouragementSound, playSuccessTone, playWordPronunciation } from '../utils/soundEffects'

function shuffleWords(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ARCADE_ROUND_SIZE = 60

let latestPose = null

export function getLatestPose() {
  return latestPose
}

// classic: idle -> learning -> action_pending -> action_success ...
// arcade: idle -> arcade_playing -> completed
const useGameStore = create((set, get) => ({
  gameState: 'idle',

  /** classic | balloon | fruit */
  playMode: 'classic',

  /** 体感街机对战：双人时左手侧计 P1、右手侧计 P2（单人摄像头） */
  arcadeVersus: false,

  /** 体感 arcade 一局词表（自五年级词池打乱抽取） */
  arcadeSessionWords: [],

  /** @type {null | { playMode: string, arcadeVersus: boolean, sessionTotal: number, poppedWords: object[], missed: number, player1Hits: number, player2Hits: number }} */
  arcadeResult: null,

  words: wordsData.words,
  currentWordIndex: 0,
  completedWords: [],
  score: 0,
  streak: 0,

  poseDetected: false,
  currentPose: null,
  isActionCorrect: false,

  showStarEffect: false,
  showSuccessAnimation: false,

  cameraReady: false,

  mousePosition: { x: 0, y: 0 },

  lastEncouragementInfo: null,

  /** 摄像头原始分辨率（气球全屏击打与骨架共用） */
  poseVideoIntrinsics: { width: 0, height: 0 },
  setPoseVideoIntrinsics: (width, height) =>
    set({
      poseVideoIntrinsics:
        typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0
          ? { width, height }
          : { width: 0, height: 0 },
    }),

  /** @param {{ mode?: 'classic'|'balloon'|'fruit', versus?: boolean, fruitVersus?: boolean }} [options] — fruitVersus 兼容旧参数，等同 versus */
  startGame: (options = {}) => {
    const mode = options.mode ?? 'classic'
    const arcadeVersus = !!(options.versus ?? options.fruitVersus)

    if (mode === 'classic') {
      set({
        playMode: 'classic',
        arcadeVersus: false,
        arcadeSessionWords: [],
        arcadeResult: null,
        gameState: 'learning',
        currentWordIndex: 0,
        completedWords: [],
        score: 0,
        streak: 0,
        lastEncouragementInfo: null,
        isActionCorrect: false,
        showStarEffect: false,
        showSuccessAnimation: false,
      })
      return
    }

    const pool = shuffleWords(grade5bData.words)
    const take = Math.min(ARCADE_ROUND_SIZE, pool.length)
    const session = pool.slice(0, take)

    set({
      playMode: mode,
      arcadeVersus,
      arcadeSessionWords: session,
      arcadeResult: null,
      gameState: 'arcade_playing',
      currentWordIndex: 0,
      completedWords: [],
      score: 0,
      streak: 0,
      lastEncouragementInfo: null,
      isActionCorrect: false,
      showStarEffect: false,
      showSuccessAnimation: false,
    })
  },

  finishArcade: (result) => {
    if (get().gameState !== 'arcade_playing') return
    set({
      gameState: 'completed',
      arcadeResult: result,
      showSuccessAnimation: false,
      showStarEffect: false,
    })
  },

  getCurrentWord: () => {
    const state = get()
    return state.words[state.currentWordIndex] || null
  },

  setGameState: (state) => set({ gameState: state }),

  startAction: () => set({ gameState: 'action_pending' }),

  completeAction: () => {
    const state = get()
    const currentWord = state.words[state.currentWordIndex]
    const newStreak = state.streak + 1
    const newCompletedWords = [...state.completedWords, currentWord]

    playSuccessTone(newStreak)
    playWordPronunciation(currentWord.word)

    setTimeout(() => {
      const encouragementInfo = playEncouragementSound(
        newStreak,
        newCompletedWords.length,
        state.words.length,
        state.lastEncouragementInfo
      )

      if (encouragementInfo) {
        set({ lastEncouragementInfo: encouragementInfo })
      }
    }, 1000)

    set({
      gameState: 'action_success',
      isActionCorrect: true,
      showSuccessAnimation: true,
      showStarEffect: true,
      score: state.score + 10 * newStreak,
      streak: newStreak,
      completedWords: newCompletedWords,
    })

    setTimeout(() => {
      get().nextWord()
    }, 2500)
  },

  nextWord: () => {
    const state = get()
    const nextIndex = state.currentWordIndex + 1

    if (nextIndex >= state.words.length) {
      set({
        gameState: 'completed',
        showSuccessAnimation: false,
        showStarEffect: false,
        arcadeResult: null,
      })
    } else {
      set({
        currentWordIndex: nextIndex,
        gameState: 'learning',
        isActionCorrect: false,
        showSuccessAnimation: false,
        showStarEffect: false,
      })
    }
  },

  resetGame: () =>
    set({
      gameState: 'idle',
      playMode: 'classic',
      arcadeVersus: false,
      arcadeSessionWords: [],
      arcadeResult: null,
      currentWordIndex: 0,
      completedWords: [],
      score: 0,
      streak: 0,
      isActionCorrect: false,
      showStarEffect: false,
      showSuccessAnimation: false,
      lastEncouragementInfo: null,
    }),

  triggerStarEffect: () => {
    set({ showStarEffect: true })
    setTimeout(() => set({ showStarEffect: false }), 2000)
  },

  setMousePosition: (x, y) => set({ mousePosition: { x, y } }),

  setPose: (pose, options = {}) => {
    latestPose = pose
    if (options.publish === false) return
    set({ currentPose: pose, poseDetected: !!pose })
  },

  setCameraReady: (ready) => set({ cameraReady: ready }),

  playSound: (type) => {
    const sounds = {
      success: '/sounds/success.mp3',
      star: '/sounds/star.mp3',
      complete: '/sounds/complete.mp3',
    }
    try {
      const audio = new Audio(sounds[type])
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch (e) {
      console.log('Sound not available')
    }
  },
}))

export default useGameStore
