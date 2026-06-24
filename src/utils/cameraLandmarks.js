/**
 * MediaPipe Pose 关键点：先按 object-fit: cover 从摄像头帧映射到显示区域，
 * 再按与视频同款「水平居中镜像」对齐（与 selfie 视频的 scaleX(-1) 一致，避免双重镜像错位）。
 */

function coverProjection(lm, viewportW, viewportH, iw, ih) {
  const vw = Math.max(viewportW, 1)
  const vh = Math.max(viewportH, 1)

  const scale = Math.max(vw / iw, vh / ih)
  const dispW = iw * scale
  const dispH = ih * scale
  const ox = (vw - dispW) / 2
  const oy = (vh - dispH) / 2

  const xImg = lm.x * iw
  const yImg = lm.y * ih

  return {
    x: xImg * scale + ox,
    y: yImg * scale + oy,
  }
}

/**
 * @returns { { x:number, y:number } } 顶层叠放层使用的 CSS 像素（与镜面视频画面上的人体重合）
 */
export function lmToOverlayPx(lm, viewportW, viewportH, videoIntrinsicW, videoIntrinsicH) {
  const vw = viewportW || 1
  const vh = viewportH || 1
  const iw = videoIntrinsicW
  const ih = videoIntrinsicH

  if (!iw || !ih || iw < 16 || ih < 16) {
    return {
      x: (1 - lm.x) * vw,
      y: lm.y * vh,
    }
  }

  const p = coverProjection(lm, vw, vh, iw, ih)

  /** 单层水平镜像（与元素的 transform: scaleX(-1) 绕水平中心等价） */
  return {
    x: vw - p.x,
    y: p.y,
  }
}

/**
 * Canvas 上使用 scaleX(-1) 时，在画布**逻辑坐标系**里画未镜像的点（由 CSS 再镜像一次）。
 */
export function lmToCanvasMirroredDrawingPx(lm, viewportW, viewportH, videoIntrinsicW, videoIntrinsicH) {
  const iw = videoIntrinsicW
  const ih = videoIntrinsicH
  const vw = viewportW || 1
  const vh = viewportH || 1

  if (!iw || !ih || iw < 16 || ih < 16) {
    return { x: lm.x * vw, y: lm.y * vh }
  }

  return coverProjection(lm, vw, vh, iw, ih)
}

/** @deprecated 使用 lmToOverlayPx — 兼容旧导入 */
export function lmToViewportCoverMirror(lm, vw, vh, iw, ih) {
  return lmToOverlayPx(lm, vw, vh, iw, ih)
}
