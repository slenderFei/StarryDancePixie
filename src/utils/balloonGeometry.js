export function getBalloonGeometry(item, viewportWidth) {
  const width = item.width || 118
  const height = item.height || 140
  const scale = item.sizeScale ?? 1
  const angle = (item.wobbleDeg || 0) * Math.PI / 180
  const halfWidth = width * scale / 2
  const halfHeight = height * scale / 2
  const inset = Math.abs(Math.cos(angle)) * halfWidth + Math.abs(Math.sin(angle)) * halfHeight + 8
  const cx = viewportWidth < inset * 2
    ? viewportWidth / 2
    : Math.max(inset, Math.min(viewportWidth - inset, item.xFrac * viewportWidth + (item.swayPx || 0)))
  return {
    cx,
    cy: item.y + height / 2,
    width,
    height,
    scale,
    angle,
    rx: halfWidth + 14,
    ry: halfHeight + 14,
  }
}

export function isBalloonHit(point, balloon) {
  const dx = point.x - balloon.cx
  const dy = point.y - balloon.cy
  const x = dx * Math.cos(balloon.angle) + dy * Math.sin(balloon.angle)
  const y = -dx * Math.sin(balloon.angle) + dy * Math.cos(balloon.angle)
  return (x / balloon.rx) ** 2 + (y / balloon.ry) ** 2 <= 1
}
