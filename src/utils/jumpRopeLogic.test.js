import test from 'node:test'
import assert from 'node:assert/strict'
import {
  effectiveRoundElapsed,
  evaluateJumpLanding,
  nextJumpCombo,
  resumeRoundStart,
} from './jumpRopeLogic.js'

const validLanding = {
  airborneMs: 240,
  peakFootLift: 42,
  peakHipLift: 18,
  footThreshold: 30,
  hipThreshold: 14,
  minAirborneMs: 80,
  maxAirborneMs: 950,
}

test('accepts a valid landing after a long rest and starts a new combo', () => {
  assert.deepEqual(evaluateJumpLanding(validLanding), { valid: true, reason: 'valid' })
  assert.equal(nextJumpCombo(12, 2400, 1600), 1)
})

test('rejects camera noise and low jumps', () => {
  assert.equal(evaluateJumpLanding({ ...validLanding, airborneMs: 40 }).reason, 'airtime')
  assert.equal(
    evaluateJumpLanding({ ...validLanding, peakFootLift: 31, peakHipLift: 3 }).reason,
    'height',
  )
})

test('freezes elapsed time while tracking is lost', () => {
  assert.equal(effectiveRoundElapsed(9000, 1000, 5000), 4000)
  const resumedAt = resumeRoundStart(1000, 5000, 9000)
  assert.equal(resumedAt, 5000)
  assert.equal(effectiveRoundElapsed(10_000, resumedAt), 5000)
})
