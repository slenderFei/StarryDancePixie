/**
 * Pose data used by 星光大冒险. The game only needs a stable upper-body
 * anchor for movement and jumping, so ankles are optional.
 */
export const PLATFORMER_POSE_LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
}

function visible(point, min = 0.44) {
  return point && (point.visibility == null || point.visibility >= min)
}

function mid(a, b) {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function getPlatformerPoseSnapshot(pose) {
  const leftShoulder = pose?.[PLATFORMER_POSE_LM.LEFT_SHOULDER]
  const rightShoulder = pose?.[PLATFORMER_POSE_LM.RIGHT_SHOULDER]
  const leftHip = pose?.[PLATFORMER_POSE_LM.LEFT_HIP]
  const rightHip = pose?.[PLATFORMER_POSE_LM.RIGHT_HIP]
  const leftAnkle = pose?.[PLATFORMER_POSE_LM.LEFT_ANKLE]
  const rightAnkle = pose?.[PLATFORMER_POSE_LM.RIGHT_ANKLE]
  const leftWrist = pose?.[PLATFORMER_POSE_LM.LEFT_WRIST]
  const rightWrist = pose?.[PLATFORMER_POSE_LM.RIGHT_WRIST]
  const shoulder = mid(visible(leftShoulder) ? leftShoulder : null, visible(rightShoulder) ? rightShoulder : null)
  const hip = mid(visible(leftHip) ? leftHip : null, visible(rightHip) ? rightHip : null)
  const foot = mid(visible(leftAnkle) ? leftAnkle : null, visible(rightAnkle) ? rightAnkle : null)
  const visibleCount = [leftShoulder, rightShoulder, leftHip, rightHip].filter((point) => visible(point)).length
  const quality = Math.round((visibleCount / 4) * 100)

  // A shoulder and a hip are enough to estimate the player's center. This
  // keeps close-range play usable when the lower legs are outside the frame.
  if (!shoulder || !hip || visibleCount < 2) {
    return { ok: false, visibleCount, quality }
  }

  const handsUp =
    visible(leftWrist) &&
    visible(rightWrist) &&
    leftWrist.y < shoulder.y - 0.035 &&
    rightWrist.y < shoulder.y - 0.035

  const bodyHeight = foot
    ? Math.max(0.22, foot.y - shoulder.y)
    : Math.max(0.16, Math.abs(hip.y - shoulder.y))

  return {
    ok: true,
    quality,
    visibleCount,
    centerX: 1 - hip.x,
    hipY: hip.y,
    shoulderY: shoulder.y,
    footY: foot?.y,
    // Keep full-body jump scaling when available; fall back to torso height
    // when the lower legs are outside the frame.
    bodyHeight,
    handsUp,
  }
}
