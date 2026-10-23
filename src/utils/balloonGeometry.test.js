import test from 'node:test'
import assert from 'node:assert/strict'
import { getBalloonGeometry, isBalloonHit } from './balloonGeometry.js'

test('desktop and mobile hit centers match the rendered center at every scale', () => {
  for (const [width, height] of [[118, 140], [109, 130]]) {
    for (const sizeScale of [0.88, 1, 1.12]) {
      const balloon = getBalloonGeometry({ xFrac: 0.5, y: 200, width, height, sizeScale, swayPx: 12 }, 390)
      assert.equal(balloon.cx, 207)
      assert.equal(balloon.cy, 200 + height / 2)
      assert.equal(isBalloonHit({ x: 207, y: balloon.cy }, balloon), true)
      assert.equal(isBalloonHit({ x: balloon.cx + balloon.rx + 1, y: balloon.cy }, balloon), false)
    }
  }
})

test('hit tolerance stays tied to balloon size on a large screen', () => {
  const balloon = getBalloonGeometry({ xFrac: 0.5, y: 200 }, 1920)
  assert.equal(isBalloonHit({ x: balloon.cx + 70, y: balloon.cy }, balloon), true)
  assert.equal(isBalloonHit({ x: balloon.cx + 100, y: balloon.cy }, balloon), false)
})

test('scaled, swaying balloons remain within the viewport at both edges', () => {
  for (const xFrac of [0.01, 0.99]) {
    const balloon = getBalloonGeometry({ xFrac, y: 100, sizeScale: 1.2, swayPx: xFrac < 0.5 ? -50 : 50, wobbleDeg: 5 }, 320)
    const extent = Math.abs(Math.cos(balloon.angle)) * balloon.width * balloon.scale / 2 +
      Math.abs(Math.sin(balloon.angle)) * balloon.height * balloon.scale / 2
    assert.ok(balloon.cx - extent >= 7.99)
    assert.ok(balloon.cx + extent <= 312.01)
  }
})

test('ellipse hit testing follows the visible rotation', () => {
  const balloon = getBalloonGeometry({ xFrac: 0.5, y: 100, wobbleDeg: 90 }, 390)
  assert.equal(isBalloonHit({ x: balloon.cx + balloon.ry - 1, y: balloon.cy }, balloon), true)
  assert.equal(isBalloonHit({ x: balloon.cx, y: balloon.cy + balloon.ry - 1 }, balloon), false)
})
