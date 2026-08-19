export function evaluateJumpLanding({
  airborneMs,
  peakFootLift,
  peakHipLift,
  footThreshold,
  hipThreshold,
  minAirborneMs,
  maxAirborneMs,
}) {
  const enoughAirTime = airborneMs >= minAirborneMs && airborneMs <= maxAirborneMs
  const enoughLift =
    peakFootLift >= footThreshold &&
    (peakHipLift >= hipThreshold * 0.72 || peakFootLift >= footThreshold * 1.32)

  return {
    valid: enoughAirTime && enoughLift,
    reason: !enoughAirTime ? 'airtime' : !enoughLift ? 'height' : 'valid',
  }
}

export function nextJumpCombo(currentCombo, gapMs, maxComboGapMs) {
  return gapMs <= maxComboGapMs ? currentCombo + 1 : 1
}

export function effectiveRoundElapsed(now, roundStartedAt, missingSince = 0) {
  if (!roundStartedAt) return 0
  return Math.max(0, (missingSince || now) - roundStartedAt)
}

export function resumeRoundStart(roundStartedAt, missingSince, now) {
  if (!roundStartedAt || !missingSince) return roundStartedAt
  return roundStartedAt + Math.max(0, now - missingSince)
}
