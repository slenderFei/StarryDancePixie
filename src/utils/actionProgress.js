const clamp01 = (value) => Math.max(0, Math.min(1, value))
const atLeast = (value, target, range = target) => clamp01(1 - (target - value) / range)
const atMost = (value, target, range = target) => clamp01(1 - (value - target) / range)

function visible(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
    (point.visibility == null || point.visibility >= 0.42)
}

export function getJumpAnchor(landmarks) {
  const points = [11, 12, 23, 24].map((index) => landmarks?.[index])
  if (!points.every(visible)) return null
  const shoulderY = (points[0].y + points[1].y) / 2
  const hipY = (points[2].y + points[3].y) / 2
  return { hipY, torsoHeight: Math.max(0.12, hipY - shoulderY) }
}

// A score of 1 is also the recognition threshold, so the meter and scoring agree.
export function getActionProgress(landmarks, action, jumpBaseline = null) {
  if (!landmarks) return 0
  const leftShoulder = landmarks[11]
  const rightShoulder = landmarks[12]
  if (action === 'sway') {
    if (![leftShoulder, rightShoulder].every(visible)) return 0
    return atLeast(Math.abs((leftShoulder.x + rightShoulder.x) / 2 - 0.5), 0.05)
  }
  if (action === 'jump') {
    const anchor = getJumpAnchor(landmarks)
    if (!anchor || !jumpBaseline) return 0
    const threshold = Math.max(0.025, jumpBaseline.torsoHeight * 0.14)
    return atLeast(jumpBaseline.hipY - anchor.hipY, threshold)
  }

  const leftWrist = landmarks[15]
  const rightWrist = landmarks[16]
  if (![leftWrist, rightWrist].every(visible)) return 0
  const spread = Math.abs(leftWrist.x - rightWrist.x)
  if (action === 'arms_wave') return atLeast(spread, 0.4)
  if (action === 'wave_motion') return atLeast(spread, 0.5)
  if (action === 'stretch') return atLeast(spread, 0.6)
  if (action === 'arms_triangle') {
    const nose = landmarks[0]
    if (!visible(nose)) return 0
    return Math.min(atMost(leftWrist.y, nose.y, 0.2), atMost(rightWrist.y, nose.y, 0.2), atMost(spread, 0.15))
  }

  if (![leftShoulder, rightShoulder].every(visible)) return 0
  const handsUp = Math.min(atMost(leftWrist.y, leftShoulder.y, 0.2), atMost(rightWrist.y, rightShoulder.y, 0.2))
  switch (action) {
    case 'hands_up':
      return handsUp
    case 'arms_arc':
      return Math.min(handsUp, atLeast(spread, 0.3))
    case 'bloom':
      return Math.min(atLeast(spread, 0.4), atMost(leftWrist.y, leftShoulder.y + 0.1, 0.2), atMost(rightWrist.y, rightShoulder.y + 0.1, 0.2))
    case 'hands_together':
      return Math.min(atMost(spread, 0.1), atLeast(leftWrist.y, leftShoulder.y, 0.2), atLeast(rightWrist.y, rightShoulder.y, 0.2))
    case 'arms_spread':
      return Math.min(atLeast(spread, 0.6), atMost(Math.abs(leftWrist.y - leftShoulder.y), 0.15), atMost(Math.abs(rightWrist.y - rightShoulder.y), 0.15))
    default:
      return 0
  }
}
