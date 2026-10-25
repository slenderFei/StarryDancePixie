import { create } from 'zustand'
import wordsData from '../data/words.json'
import grade5bData from '../data/words_grade5b.json'
import { playEncouragementSound, playSuccessTone, playWordPronunciation, stopGameSpeech } from '../utils/soundEffects'
import { getSession } from '../utils/auth'
import { saveGameRecord } from '../utils/gameRecords'

function shuffleWords(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ARCADE_ROUND_SIZE_BY_MODE = {
  balloon: 60,
  fruit: 5,
  rope: 0,
  platformer: 15,
  gnm: 0,
  herb: 0,
  catwarrior: 0,
}

let latestPose = null
let latestPoseAt = -Infinity
let latestHands = null
let encouragementTimer = null
let nextWordTimer = null
let starTimer = null

export function getLatestPose(now = performance.now()) {
  return now - latestPoseAt <= 750 ? latestPose : null
}

export function getLatestHands() {
  return latestHands
}

function clearGameTimers() {
  clearTimeout(encouragementTimer)
  clearTimeout(nextWordTimer)
  clearTimeout(starTimer)
  encouragementTimer = nextWordTimer = starTimer = null
  stopGameSpeech()
}

// classic: idle -> learning -> action_pending -> action_success ...
// arcade: idle -> arcade_playing -> completed
const useGameStore = create((set, get) => ({
  gameState: 'idle',
  roundId: 0,

  /** classic | balloon | fruit | rope | platformer | gnm | herb | catwarrior */
  playMode: 'classic',

  /** 体感街机对战：双人时左手侧计 P1、右手侧计 P2（单人摄像头） */
  arcadeVersus: false,

  /** 体感 arcade 一局词表（自五年级词池打乱抽取） */
  arcadeSessionWords: [],

  /** @type {null | { playMode: string, arcadeVersus: boolean, sessionTotal: number, poppedWords: object[], missed: number, player1Hits: number, player2Hits: number, spellingResults?: object[], jumpCount?: number }} */
  arcadeResult: null,

  words: wordsData.words,
  currentWordIndex: 0,
  completedWords: [],
  score: 0,
  streak: 0,

  poseDetected: false,
  currentPose: null,
  currentHands: null,
  currentFace: null,
  isActionCorrect: false,
  actionFeedback: null,

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

  /** @param {{ mode?: 'classic'|'balloon'|'fruit'|'rope'|'platformer'|'gnm', versus?: boolean, fruitVersus?: boolean }} [options] — fruitVersus 兼容旧参数，等同 versus */
  startGame: (options = {}) => {
    clearGameTimers()
    const mode = options.mode ?? 'classic'
    const requestedVersus = !!(options.versus ?? options.fruitVersus)
    const arcadeVersus =
      mode === 'fruit' || mode === 'rope' || mode === 'platformer' || mode === 'gnm' || mode === 'herb' || mode === 'catwarrior'
        ? false
        : requestedVersus

    if (mode === 'classic') {
      set({
        playMode: 'classic',
        arcadeVersus: false,
        arcadeSessionWords: [],
        arcadeResult: null,
        gameState: 'learning',
        roundId: get().roundId + 1,
        actionFeedback: null,
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

    const roundSize = ARCADE_ROUND_SIZE_BY_MODE[mode] ?? ARCADE_ROUND_SIZE_BY_MODE.balloon
    const session =
      roundSize > 0
        ? shuffleWords(grade5bData.words).slice(0, Math.min(roundSize, grade5bData.words.length))
        : []

    set({
      playMode: mode,
      arcadeVersus,
      arcadeSessionWords: session,
      arcadeResult: null,
      gameState: 'arcade_playing',
      roundId: get().roundId + 1,
      actionFeedback: null,
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
    const state = get()
    if (state.gameState !== 'arcade_playing') return
    const hitWordIds = new Set((result.poppedWords || []).map((word) => word.id))
    const allWords = Array.isArray(result.allWords) && result.allWords.length
      ? result.allWords
      : state.arcadeSessionWords
    const missedWords = Array.isArray(result.missedWords)
      ? result.missedWords
      : allWords.filter((word) => !hitWordIds.has(word.id))
    const username = getSession()?.username || 'guest'

    saveGameRecord({
      username,
      playMode: result.playMode,
      arcadeVersus: result.arcadeVersus,
      totalWords: result.sessionTotal,
      hitCount:
        result.playMode === 'rope'
          ? Number(result.jumpCount || result.rankScore || 0)
          : result.playMode === 'gnm'
            ? Number(result.completedChallenges || 0)
            : result.playMode === 'herb'
              ? Number(result.completedHerbs || 0)
            : result.playMode === 'catwarrior'
              ? Number(result.catMissions || 0)
            : (result.poppedWords || []).length,
      missedCount: result.missed,
      allWords,
      hitWords: result.poppedWords || [],
      missedWords,
      spellingResults: result.spellingResults || [],
      jumpCount: result.jumpCount,
      durationSeconds: result.durationSeconds,
      rankScore: result.rankScore,
      score: result.score,
      bestCombo: result.bestCombo,
      pace: result.pace,
      grade: result.grade,
      previousBest: result.previousBest,
      newRecord: result.newRecord,
      player1Score: result.player1Score,
      player2Score: result.player2Score,
      coins: result.coins,
      completed: result.completed,
      damageCount: result.damageCount,
      deathCount: result.deathCount,
      platformerStats: result.platformerStats,
      completedChallenges: result.completedChallenges,
      completedHerbs: result.completedHerbs,
      catMissions: result.catMissions,
      typingAccuracy: result.typingAccuracy,
      typingWpm: result.typingWpm,
    })

    set({
      gameState: 'completed',
      arcadeResult: {
        ...result,
        allWords,
        missedWords,
        username,
      },
      showSuccessAnimation: false,
      showStarEffect: false,
    })
  },

  getCurrentWord: () => {
    const state = get()
    return state.words[state.currentWordIndex] || null
  },

  setGameState: (state) => set({ gameState: state }),

  startAction: () => {
    if (get().playMode === 'classic' && get().gameState === 'learning') {
      set({ gameState: 'action_pending' })
    }
  },

  completeAction: () => {
    const state = get()
    if (state.playMode !== 'classic' || !['learning', 'action_pending'].includes(state.gameState)) return
    const currentWord = state.words[state.currentWordIndex]
    if (!currentWord) return
    const newStreak = state.streak + 1
    const newCompletedWords = [...state.completedWords, currentWord]

    clearGameTimers()
    encouragementTimer = setTimeout(() => {
      encouragementTimer = null
      if (get().roundId !== state.roundId || get().gameState !== 'action_success') return
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

    playSuccessTone(newStreak)
    playWordPronunciation(currentWord.word)

    nextWordTimer = setTimeout(() => {
      nextWordTimer = null
      if (get().roundId === state.roundId) get().nextWord()
    }, 2500)
  },

  nextWord: () => {
    const state = get()
    if (state.playMode !== 'classic' || state.gameState !== 'action_success') return
    clearGameTimers()
    const nextIndex = state.currentWordIndex + 1

    if (nextIndex >= state.words.length) {
      const username = getSession()?.username || 'guest'
      saveGameRecord({
        username,
        playMode: 'classic',
        totalWords: state.words.length,
        hitCount: state.completedWords.length,
        missedCount: Math.max(0, state.words.length - state.completedWords.length),
        score: state.score,
        allWords: state.words,
        hitWords: state.completedWords,
        missedWords: state.words.filter(
          (word) => !state.completedWords.some((completed) => completed.id === word.id),
        ),
      })

      set({
        gameState: 'completed',
        showSuccessAnimation: false,
        showStarEffect: false,
        arcadeResult: null,
        actionFeedback: null,
      })
    } else {
      set({
        currentWordIndex: nextIndex,
        gameState: 'learning',
        isActionCorrect: false,
        showSuccessAnimation: false,
        showStarEffect: false,
        actionFeedback: null,
      })
    }
  },

  resetGame: () => {
    clearGameTimers()
    latestPose = null
    latestPoseAt = -Infinity
    latestHands = null
    set({
      gameState: 'idle',
      roundId: get().roundId + 1,
      actionFeedback: null,
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
      currentPose: null,
      currentHands: null,
      currentFace: null,
      poseDetected: false,
    })
  },

  triggerStarEffect: () => {
    if (get().showStarEffect) return
    set({ showStarEffect: true })
    clearTimeout(starTimer)
    starTimer = setTimeout(() => {
      starTimer = null
      set({ showStarEffect: false })
    }, 2000)
  },

  setMousePosition: (x, y) => set({ mousePosition: { x, y } }),

  setPose: (pose, options = {}) => {
    latestPose = pose
    latestPoseAt = pose ? performance.now() : -Infinity
    if (options.publish === false) return
    set({ currentPose: pose, poseDetected: !!pose })
  },

  setActionFeedback: (actionFeedback) => set({ actionFeedback }),

  setHands: (hands, options = {}) => {
    latestHands = hands
    if (options.publish === false) return
    set({ currentHands: hands })
  },

  setFace: (face, options = {}) => {
    if (options.publish === false) return
    set({ currentFace: face })
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
