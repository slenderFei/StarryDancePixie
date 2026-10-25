import { getActionProgress, getJumpAnchor } from './actionProgress.js'

export function createActionRecognition() {
  return { key: null, lastFrameAt: -Infinity, matchedSince: null, samples: [], baseline: null }
}

export function updateActionRecognition(state, key, action, landmarks, now) {
  if (state.key !== key || now - state.lastFrameAt > 750 || !landmarks) {
    Object.assign(state, createActionRecognition(), { key })
  }
  state.lastFrameAt = now
  const feedback = { key, phase: 'tracking', progress: 0, holdProgress: 0, matched: false }
  if (!landmarks) return { ...feedback, phase: 'missing' }

  if (action === 'jump' && !getJumpAnchor(landmarks)) {
    state.baseline = null
    state.samples = []
    state.matchedSince = null
    return { ...feedback, phase: 'missing' }
  }

  if (action === 'jump' && !state.baseline) {
    const anchor = getJumpAnchor(landmarks)
    const previous = state.samples.at(-1)
    if (!previous || now - previous.at >= 60) {
      state.samples.push({ ...anchor, at: now })
      state.samples = state.samples.slice(-10)
    }
    const samples = state.samples
    const hips = samples.map((sample) => sample.hipY)
    const stable = Math.max(...hips) - Math.min(...hips) <= Math.max(0.018, anchor.torsoHeight * 0.08)
    if (samples.length === 10 && stable) {
      const sorted = [...hips].sort((a, b) => a - b)
      state.baseline = { hipY: sorted[5], torsoHeight: anchor.torsoHeight }
    }
    return {
      ...feedback,
      phase: state.baseline ? 'tracking' : 'calibrating',
      progress: state.baseline ? 0 : Math.min(stable ? 0.95 : 0.5, samples.length / 10),
    }
  }

  feedback.progress = getActionProgress(landmarks, action, state.baseline)
  if (feedback.progress < 1) {
    state.matchedSince = null
    return feedback
  }

  if (state.matchedSince == null) state.matchedSince = now
  const holdMs = action === 'jump' ? 60 : 220
  feedback.holdProgress = Math.min(1, (now - state.matchedSince) / holdMs)
  feedback.matched = feedback.holdProgress === 1
  feedback.phase = feedback.matched ? 'complete' : 'holding'
  return feedback
}
