import test from 'node:test'
import assert from 'node:assert/strict'
import { getActionProgress } from './actionProgress.js'

function pose(overrides = {}) {
  const points = []
  const defaults = {
    0: [0.5, 0.2], 11: [0.4, 0.4], 12: [0.6, 0.4],
    15: [0.46, 0.7], 16: [0.54, 0.7], 23: [0.45, 0.7], 24: [0.55, 0.7],
  }
  for (const [index, [x, y]] of Object.entries({ ...defaults, ...overrides })) {
    points[index] = { x, y, visibility: 1 }
  }
  return points
}

test('all supported gestures reach the same full-progress recognition threshold', () => {
  const examples = {
    hands_up: { 15: [0.3, 0.1], 16: [0.7, 0.1] },
    arms_wave: { 15: [0.2, 0.5], 16: [0.8, 0.5] },
    arms_arc: { 15: [0.2, 0.1], 16: [0.8, 0.1] },
    sway: { 11: [0.5, 0.4], 12: [0.7, 0.4] },
    jump: { 23: [0.45, 0.5], 24: [0.55, 0.5] },
    arms_triangle: { 15: [0.46, 0.1], 16: [0.54, 0.1] },
    wave_motion: { 15: [0.2, 0.5], 16: [0.8, 0.5] },
    bloom: { 15: [0.2, 0.45], 16: [0.8, 0.45] },
    stretch: { 15: [0.1, 0.5], 16: [0.9, 0.5] },
    hands_together: {},
    arms_spread: { 15: [0.1, 0.4], 16: [0.9, 0.4] },
  }
  for (const [action, points] of Object.entries(examples)) {
    assert.equal(getActionProgress(pose(points), action), 1, action)
  }
})

test('hand distance alone cannot pass gestures that also require hand height', () => {
  const lowHands = pose({ 15: [0.1, 0.8], 16: [0.9, 0.8] })
  for (const action of ['hands_up', 'arms_arc', 'bloom', 'arms_spread']) {
    assert.ok(getActionProgress(lowHands, action) < 1, action)
  }
  assert.ok(getActionProgress(pose({ 15: [0.46, 0.1], 16: [0.54, 0.1] }), 'hands_together') < 1)
})

test('low-confidence or absent required landmarks never complete an action', () => {
  const points = pose({ 15: [0.1, 0.1], 16: [0.9, 0.1] })
  points[15].visibility = 0.1
  assert.equal(getActionProgress(points, 'hands_up'), 0)
  assert.equal(getActionProgress(null, 'hands_up'), 0)
  assert.equal(getActionProgress([], 'bloom'), 0)
  assert.equal(getActionProgress(pose(), 'unknown'), 0)
  // Sway only needs the shoulders, so cropped wrists should not block it.
  assert.equal(getActionProgress(pose({ 11: [0.5, 0.4], 12: [0.7, 0.4] }).slice(0, 13), 'sway'), 1)
})

test('partial progress stays below completion immediately before the threshold', () => {
  const almostRaised = pose({ 15: [0.3, 0.4001], 16: [0.7, 0.1] })
  const progress = getActionProgress(almostRaised, 'hands_up')
  assert.ok(progress > 0.99 && progress < 1)
})
