export interface TouchPoint2D {
  x: number;
  y: number;
}

export interface PinchAnchoredPanParams {
  pan: TouchPoint2D;
  center: TouchPoint2D;
  prevMid: TouchPoint2D;
  currMid: TouchPoint2D;
  prevZoom: number;
  nextZoom: number;
  width: number;
  height: number;
  isGodMode: boolean;
}

const MIN_PINCH_DIST_PX = 10;
const MIN_PINCH_RATIO = 0.78;
const MAX_PINCH_RATIO = 1.28;
const MAX_TAP_DURATION_MS = 350;
const MAX_TAP_MOVEMENT_PX = 10;

/**
 * Returns Euclidean distance in pixels between two touch points.
 */
export function computeTouchDistance(a: TouchPoint2D, b: TouchPoint2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Returns the canvas-relative midpoint between two touch points.
 */
export function computeTouchMidpoint(a: TouchPoint2D, b: TouchPoint2D): TouchPoint2D {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
  };
}

/**
 * Computes a bounded per-frame pinch scale ratio from consecutive finger distances.
 */
export function computePinchZoomRatio(prevDist: number, currentDist: number): number {
  if (
    !Number.isFinite(prevDist) ||
    !Number.isFinite(currentDist) ||
    prevDist < MIN_PINCH_DIST_PX ||
    currentDist < MIN_PINCH_DIST_PX
  ) {
    return 1;
  }
  const ratio = currentDist / prevDist;
  return Math.max(MIN_PINCH_RATIO, Math.min(MAX_PINCH_RATIO, ratio));
}

/**
 * Bounds sky-map panning inside the viewport and keeps God Mode deep-zoom
 * Black Hole & Sovereign art cleanly framed on narrow mobile screens.
 */
export function clampSkyMapPan(
  pan: TouchPoint2D,
  width: number,
  height: number,
  zoom: number,
  isGodMode: boolean
): TouchPoint2D {
  if (width <= 0 || height <= 0 || !Number.isFinite(pan.x) || !Number.isFinite(pan.y)) {
    return { x: 0, y: 0 };
  }

  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const baseLimit = Math.max(width, height) * Math.max(0.55, safeZoom * 0.85);
  const maxPan =
    isGodMode && safeZoom <= 0.36
      ? Math.min(baseLimit, Math.min(width, height) * 0.28)
      : baseLimit;

  return {
    x: Math.max(-maxPan, Math.min(maxPan, pan.x)),
    y: Math.max(-maxPan, Math.min(maxPan, pan.y)),
  };
}

/**
 * Keeps the celestial point beneath the pinch midpoint anchored while zooming,
 * gently centering God Mode visuals as the user pinches out into deep zoom.
 */
export function computePinchAnchoredPan(params: PinchAnchoredPanParams): TouchPoint2D {
  const { pan, center, prevMid, currMid, prevZoom, nextZoom, width, height, isGodMode } = params;
  const scaleRatio = prevZoom > 0 && Number.isFinite(nextZoom / prevZoom) ? nextZoom / prevZoom : 1;

  let nextX = currMid.x - center.x - (prevMid.x - center.x - pan.x) * scaleRatio;
  let nextY = currMid.y - center.y - (prevMid.y - center.y - pan.y) * scaleRatio;

  if (isGodMode && nextZoom < prevZoom && nextZoom <= 0.45) {
    const deepProgress = Math.max(0, Math.min(1, (0.45 - nextZoom) / 0.27));
    const damp = 1 - 0.18 * (0.35 + 0.65 * deepProgress);
    nextX *= damp;
    nextY *= damp;
  }

  return clampSkyMapPan({ x: nextX, y: nextY }, width, height, nextZoom, isGodMode);
}

/**
 * Classifies a completed touch interaction as a clean star-selection tap.
 */
export function isTapGesture(
  startPos: TouchPoint2D,
  endPos: TouchPoint2D,
  durationMs: number,
  wasPinch: boolean
): boolean {
  if (wasPinch || !Number.isFinite(durationMs) || durationMs < 0 || durationMs > MAX_TAP_DURATION_MS) {
    return false;
  }
  return Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y) <= MAX_TAP_MOVEMENT_PX;
}
