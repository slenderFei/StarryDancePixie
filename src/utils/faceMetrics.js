const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

function distance(a, b) {
  if (!a || !b) return 0
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function eyeAspectRatio(landmarks, outer, inner, upperA, upperB, lowerA, lowerB) {
  const width = distance(landmarks[outer], landmarks[inner])
  if (width === 0) return 0
  const height =
    (distance(landmarks[upperA], landmarks[lowerA]) +
      distance(landmarks[upperB], landmarks[lowerB])) /
    2
  return height / width
}

export function computeFaceMetrics(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 468) return null

  const faceWidth = distance(landmarks[234], landmarks[454])
  if (faceWidth === 0) return null

  const leftEyeRatio = eyeAspectRatio(landmarks, 33, 133, 159, 158, 145, 153)
  const rightEyeRatio = eyeAspectRatio(landmarks, 362, 263, 386, 387, 374, 373)
  const mouthGap = distance(landmarks[13], landmarks[14]) / faceWidth
  const mouthWidth = distance(landmarks[61], landmarks[291]) / faceWidth
  const leftSide = distance(landmarks[1], landmarks[234])
  const rightSide = distance(landmarks[1], landmarks[454])
  const eyeLineX = landmarks[263].x - landmarks[33].x
  const eyeLineY = landmarks[263].y - landmarks[33].y

  return {
    smile: clamp((mouthWidth - 0.3) / 0.16),
    mouthOpen: clamp((mouthGap - 0.018) / 0.085),
    leftBlink: clamp((0.24 - leftEyeRatio) / 0.16),
    rightBlink: clamp((0.24 - rightEyeRatio) / 0.16),
    yaw: clamp((leftSide - rightSide) / Math.max(leftSide + rightSide, 0.001), -1, 1),
    roll: Math.atan2(eyeLineY, eyeLineX),
  }
}

export function challengeProgress(metrics, challengeId) {
  if (!metrics) return 0

  switch (challengeId) {
    case 'smile':
      return metrics.smile
    case 'mouth_open':
      return metrics.mouthOpen
    case 'blink_both':
      return Math.min(metrics.leftBlink, metrics.rightBlink)
    case 'wink':
      return Math.max(
        metrics.leftBlink * (1 - metrics.rightBlink),
        metrics.rightBlink * (1 - metrics.leftBlink),
      )
    case 'turn_side':
      return clamp(Math.abs(metrics.yaw) * 4)
    case 'tilt':
      return clamp(Math.abs(metrics.roll) * 3.5)
    default:
      return 0
  }
}
