const RECORDS_KEY = 'starryDancePixie.gameRecords.v1'

function readRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY)
    const records = raw ? JSON.parse(raw) : []
    return Array.isArray(records) ? records : []
  } catch {
    return []
  }
}

function writeRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records.slice(0, 300)))
}

function compactWord(word) {
  if (!word) return null
  return {
    id: word.id,
    word: word.word,
    meaning: word.meaning,
    score: Number(word.score || 0),
    balloonType: word.balloonType || '',
    balloonLabel: word.balloonLabel || '',
    hitBy: word.hitBy || '',
    source: word.source || '',
  }
}

function compactPlatformerStats(stats) {
  if (!stats) return null
  return {
    levelId: stats.levelId || '',
    completed: !!stats.completed,
    maxX: Number(stats.maxX || 0),
    levelsCompleted: Number(stats.levelsCompleted || 0),
    totalLevels: Number(stats.totalLevels || 0),
    levelProgress: Array.isArray(stats.levelProgress)
      ? stats.levelProgress.map((progress) => Number(progress || 0))
      : [],
    coinsCollected: Array.isArray(stats.coinsCollected) ? stats.coinsCollected : [],
    enemiesDefeated: Array.isArray(stats.enemiesDefeated) ? stats.enemiesDefeated : [],
    wordBoxResults: Array.isArray(stats.wordBoxResults)
      ? stats.wordBoxResults.map((result) => ({
          id: result.id,
          word: result.word || '',
          learned: !!result.learned,
        }))
      : [],
  }
}

function compactSpellingResult(result) {
  if (!result) return null
  return {
    id: result.id,
    word: result.word || result.targetWord,
    meaning: result.meaning,
    targetWord: result.targetWord || result.word,
    spelledWord: result.spelledWord || '',
    canceledCount: Number(result.canceledCount || 0),
    completedAt: result.completedAt || '',
    attempts: Array.isArray(result.attempts)
      ? result.attempts.map((attempt) => ({
          letterIndex: Number(attempt.letterIndex || 0),
          expectedLetter: attempt.expectedLetter || '',
          recognizedLetter: attempt.recognizedLetter || '',
          bestLetter: attempt.bestLetter || '',
          confidence: Number(attempt.confidence || 0),
          matchedExpected: !!attempt.matchedExpected,
          pointCount: Number(attempt.pointCount || 0),
          pathLength: Number(attempt.pathLength || 0),
          createdAt: attempt.createdAt || '',
        }))
      : [],
  }
}

export function getGameRecords() {
  return readRecords()
}

export function clearGameRecords() {
  writeRecords([])
}

export function getJumpRopeLeaderboard(limit = 5) {
  return readRecords()
    .filter((record) => record.playMode === 'rope')
    .map((record) => ({
      id: record.id,
      username: record.username || 'guest',
      createdAt: record.createdAt,
      jumpCount: Number(record.jumpCount || record.rankScore || record.hitCount || 0),
      durationSeconds: Number(record.durationSeconds || 60),
      rankScore: Number(record.rankScore || record.jumpCount || record.hitCount || 0),
    }))
    .sort((a, b) => b.rankScore - a.rankScore || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
}

export function saveGameRecord(record) {
  const records = readRecords()
  const normalized = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    username: record.username || 'guest',
    playMode: record.playMode || 'classic',
    arcadeVersus: !!record.arcadeVersus,
    totalWords: Number(record.totalWords || 0),
    hitCount: Number(record.hitCount || 0),
    missedCount: Number(record.missedCount || 0),
    score: Number(record.score || 0),
    bestCombo: Number(record.bestCombo || 0),
    player1Score: Number(record.player1Score || 0),
    player2Score: Number(record.player2Score || 0),
    coins: Number(record.coins || 0),
    completed: !!record.completed,
    damageCount: Number(record.damageCount || 0),
    deathCount: Number(record.deathCount || 0),
    platformerStats: compactPlatformerStats(record.platformerStats),
    allWords: (record.allWords || []).map(compactWord).filter(Boolean),
    hitWords: (record.hitWords || []).map(compactWord).filter(Boolean),
    missedWords: (record.missedWords || []).map(compactWord).filter(Boolean),
    spellingResults: (record.spellingResults || []).map(compactSpellingResult).filter(Boolean),
    jumpCount: Number(record.jumpCount || 0),
    durationSeconds: Number(record.durationSeconds || 0),
    rankScore: Number(record.rankScore || record.jumpCount || 0),
  }

  writeRecords([normalized, ...records])
  return normalized
}
