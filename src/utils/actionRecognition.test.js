import test from 'node:test'
import assert from 'node:assert/strict'
import { createActionRecognition, updateActionRecognition } from './actionRecognition.js'

function pose({ raised = false, hipY = 0.6 } = {}) {
  const landmarks = []
  for (const [index, x, y] of [[11, 0.4, hipY - 0.3], [12, 0.6, hipY - 0.3], [15, 0.3, raised ? 0.1 : 0.7], [16, 0.7, raised ? 0.1 : 0.7], [23, 0.45, hipY], [24, 0.55, hipY]]) {
    landmarks[index] = { x, y, visibility: 1 }
  }
  return landmarks
}

test('a brief matching frame cannot score, but a sustained gesture can', () => {
  const state = createActionRecognition()
  assert.equal(updateActionRecognition(state, 'round1:word1', 'hands_up', pose({ raised: true }), 0).matched, false)
  assert.equal(updateActionRecognition(state, 'round1:word1', 'hands_up', pose({ raised: true }), 100).phase, 'holding')
  assert.equal(updateActionRecognition(state, 'round1:word1', 'hands_up', pose({ raised: true }), 220).matched, true)
})

test('mismatch, missing tracking, new rounds and long frame gaps reset the hold', () => {
  const state = createActionRecognition()
  const update = (key, landmarks, now) => updateActionRecognition(state, key, 'hands_up', landmarks, now)
  update('1:1', pose({ raised: true }), 0)
  update('1:1', pose(), 100)
  assert.equal(update('1:1', pose({ raised: true }), 220).holdProgress, 0)
  assert.equal(update('2:1', pose({ raised: true }), 440).holdProgress, 0)
  assert.equal(update('2:1', null, 500).phase, 'missing')
  assert.equal(update('2:1', pose({ raised: true }), 600).holdProgress, 0)
  assert.equal(update('2:1', pose({ raised: true }), 1400).holdProgress, 0)
})

test('jump learns a standing baseline then requires an actual upward movement', () => {
  const state = createActionRecognition()
  for (let i = 0; i < 10; i++) {
    const result = updateActionRecognition(state, '1:6', 'jump', pose({ hipY: 0.4 }), i * 70)
    assert.equal(result.matched, false)
  }
  assert.ok(state.baseline)
  const obscured = pose({ hipY: 0.4 })
  obscured[23].visibility = 0.1
  assert.equal(updateActionRecognition(state, '1:6', 'jump', obscured, 660).phase, 'missing')
  assert.equal(state.baseline, null, 'losing the hips must require a new standing baseline')
  for (let i = 0; i < 10; i++) updateActionRecognition(state, '1:6', 'jump', pose({ hipY: 0.4 }), 700 + i * 70)
  assert.equal(updateActionRecognition(state, '1:6', 'jump', pose({ hipY: 0.4 }), 1400).progress, 0)
  assert.equal(updateActionRecognition(state, '1:6', 'jump', pose({ hipY: 0.34 }), 1470).phase, 'holding')
  assert.equal(updateActionRecognition(state, '1:6', 'jump', pose({ hipY: 0.34 }), 1540).matched, true)
  updateActionRecognition(state, '2:6', 'jump', pose({ hipY: 0.34 }), 1610)
  assert.equal(state.baseline, null, 'a new round must recalibrate even for the same word')
})

test('calibration rejects movement and cannot complete from many calls at one instant', () => {
  const state = createActionRecognition()
  for (let i = 0; i < 30; i++) {
    updateActionRecognition(state, '1:6', 'jump', pose(), 0)
  }
  assert.equal(state.samples.length, 1)
  for (let i = 1; i < 15; i++) {
    updateActionRecognition(state, '1:6', 'jump', pose({ hipY: i % 2 ? 0.6 : 0.45 }), i * 70)
  }
  assert.equal(state.baseline, null)
  for (let i = 15; i < 25; i++) {
    updateActionRecognition(state, '1:6', 'jump', pose(), i * 70)
  }
  assert.ok(state.baseline)
})
