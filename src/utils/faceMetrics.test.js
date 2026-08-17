import assert from 'node:assert/strict'
import test from 'node:test'
import { challengeProgress, computeFaceMetrics } from './faceMetrics.js'

function faceLandmarks() {
  const points = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
  points[234] = { x: 0.2, y: 0.5 }
  points[454] = { x: 0.8, y: 0.5 }
  points[1] = { x: 0.5, y: 0.5 }
  points[33] = { x: 0.32, y: 0.42 }
  points[133] = { x: 0.44, y: 0.42 }
  points[159] = { x: 0.37, y: 0.405 }
  points[158] = { x: 0.4, y: 0.405 }
  points[145] = { x: 0.37, y: 0.435 }
  points[153] = { x: 0.4, y: 0.435 }
  points[362] = { x: 0.56, y: 0.42 }
  points[263] = { x: 0.68, y: 0.42 }
  points[386] = { x: 0.6, y: 0.405 }
  points[387] = { x: 0.63, y: 0.405 }
  points[374] = { x: 0.6, y: 0.435 }
  points[373] = { x: 0.63, y: 0.435 }
  points[61] = { x: 0.38, y: 0.62 }
  points[291] = { x: 0.62, y: 0.62 }
  points[13] = { x: 0.5, y: 0.61 }
  points[14] = { x: 0.5, y: 0.65 }
  return points
}

test('computes normalized live face controls', () => {
  const metrics = computeFaceMetrics(faceLandmarks())
  assert.ok(metrics)
  assert.ok(metrics.mouthOpen > 0.5)
  assert.ok(metrics.smile > 0.5)
  assert.ok(Math.abs(metrics.yaw) < 1e-10)
})

test('scores challenge directions independently', () => {
  const metrics = {
    smile: 0.9,
    mouthOpen: 0.1,
    leftBlink: 0.8,
    rightBlink: 0.1,
    yaw: -0.3,
  }
  assert.equal(challengeProgress(metrics, 'smile'), 0.9)
  assert.ok(challengeProgress(metrics, 'wink') > 0.7)
  assert.equal(challengeProgress(metrics, 'turn_side'), 1)
})
