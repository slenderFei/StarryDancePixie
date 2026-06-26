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
  }
}

export function getGameRecords() {
  return readRecords()
}

export function clearGameRecords() {
  writeRecords([])
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
    allWords: (record.allWords || []).map(compactWord).filter(Boolean),
    hitWords: (record.hitWords || []).map(compactWord).filter(Boolean),
    missedWords: (record.missedWords || []).map(compactWord).filter(Boolean),
  }

  writeRecords([normalized, ...records])
  return normalized
}
