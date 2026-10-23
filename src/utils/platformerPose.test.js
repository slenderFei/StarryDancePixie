import assert from 'node:assert/strict'
import test from 'node:test'
import { getPlatformerPoseSnapshot, PLATFORMER_POSE_LM } from './platformerPose.js'

function poseWithTorso({ ankles = false, visibility = 0.9 } = {}) {
  const pose = []
  const point = (x, y) => ({ x, y, visibility })
  pose[PLATFORMER_POSE_LM.LEFT_SHOULDER] = point(0.42, 0.32)
  pose[PLATFORMER_POSE_LM.RIGHT_SHOULDER] = point(0.58, 0.32)
  pose[PLATFORMER_POSE_LM.LEFT_HIP] = point(0.44, 0.58)
  pose[PLATFORMER_POSE_LM.RIGHT_HIP] = point(0.56, 0.58)
  if (ankles) {
    pose[PLATFORMER_POSE_LM.LEFT_ANKLE] = point(0.45, 0.92)
    pose[PLATFORMER_POSE_LM.RIGHT_ANKLE] = point(0.55, 0.92)
  }
  return pose
}

test('allows close-range calibration when ankles are outside the frame', () => {
  const snapshot = getPlatformerPoseSnapshot(poseWithTorso())

  assert.equal(snapshot.ok, true)
  assert.equal(snapshot.visibleCount, 4)
  assert.equal(snapshot.quality, 100)
  assert.equal(snapshot.footY, undefined)
  assert.ok(snapshot.bodyHeight > 0)
})

test('keeps optional foot tracking when the full body is visible', () => {
  const snapshot = getPlatformerPoseSnapshot(poseWithTorso({ ankles: true }))

  assert.equal(snapshot.ok, true)
  assert.equal(snapshot.footY, 0.92)
})

test('accepts a close side-on crop with one visible shoulder and hip', () => {
  const pose = poseWithTorso()
  pose[PLATFORMER_POSE_LM.RIGHT_SHOULDER].visibility = 0.2
  pose[PLATFORMER_POSE_LM.RIGHT_HIP].visibility = 0.2

  const snapshot = getPlatformerPoseSnapshot(pose)

  assert.equal(snapshot.ok, true)
  assert.equal(snapshot.visibleCount, 2)
  assert.equal(snapshot.quality, 50)
})

test('rejects poses without a usable shoulder and hip anchor', () => {
  const pose = poseWithTorso()
  pose[PLATFORMER_POSE_LM.LEFT_HIP].visibility = 0.2
  pose[PLATFORMER_POSE_LM.RIGHT_HIP].visibility = 0.2

  const snapshot = getPlatformerPoseSnapshot(pose)

  assert.equal(snapshot.ok, false)
  assert.equal(snapshot.quality, 50)
})
