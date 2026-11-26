export interface ZoomBounds {
  min: number;
  max: number;
}

export interface SkyMapLodState {
  annotationsAlpha: number;
  starsAlpha: number;
  blackHoleCoreDarkness: number;
  blackHoleDiskForeground: number;
  blackHoleCoronaAlpha: number;
  cultivatorReveal: number;
}

export const ADMIN_NORMAL_ZOOM = 1.0;
export const ADMIN_REFINING_ZOOM = 0.18;

const NON_ADMIN_MIN_ZOOM = 0.35;
const ADMIN_MIN_ZOOM = 0.14;
const MAX_ZOOM = 4.0;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function smoothstep01(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Returns valid 2D sky map zoom bounds based on admin privileges.
 */
export function getZoomBounds(isAdmin: boolean): ZoomBounds {
  return {
    min: isAdmin ? ADMIN_MIN_ZOOM : NON_ADMIN_MIN_ZOOM,
    max: MAX_ZOOM,
  };
}

/**
 * Clamps a zoom factor safely into the role-appropriate zoom range.
 */
export function clampZoom(zoom: number, isAdmin: boolean): number {
  const bounds = getZoomBounds(isAdmin);
  if (!Number.isFinite(zoom)) return ADMIN_NORMAL_ZOOM;
  return Math.min(bounds.max, Math.max(bounds.min, zoom));
}

/**
 * Applies a multiplicative zoom step while respecting role zoom bounds.
 */
export function applyMultiplicativeZoom(
  currentZoom: number,
  factor: number,
  isAdmin: boolean
): number {
  const safeCurrent = clampZoom(currentZoom, isAdmin);
  const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return clampZoom(safeCurrent * safeFactor, isAdmin);
}

/**
 * Computes Level-of-Detail and Admin Black Hole / Supreme Cultivator reveal weights.
 */
export function computeSkyMapLod(zoom: number, isAdmin: boolean): SkyMapLodState {
  const safeZoom = Number.isFinite(zoom) ? zoom : ADMIN_NORMAL_ZOOM;

  // Annotations (labels, grids, constellation lines, DSOs, satellites, cardinals):
  // 1 at zoom >= 0.78, smoothly eases to 0 at zoom <= 0.56.
  const annotationsAlpha = smoothstep01((safeZoom - 0.56) / (0.78 - 0.56));

  if (!isAdmin) {
    return {
      annotationsAlpha,
      starsAlpha: 1,
      blackHoleCoreDarkness: 0,
      blackHoleDiskForeground: 0,
      blackHoleCoronaAlpha: 0,
      cultivatorReveal: 0,
    };
  }

  // Stars, Milky Way, Solar System & weather haze:
  // 1 at zoom >= 0.46, smoothly eases to 0 at zoom <= 0.28.
  const starsAlpha = smoothstep01((safeZoom - 0.28) / (0.46 - 0.28));

  // Event Horizon interior pitch-black darkness:
  // 0 at zoom >= 0.50 -> 1.0 at zoom <= 0.28.
  const blackHoleCoreDarkness = smoothstep01((0.50 - safeZoom) / (0.50 - 0.28));

  // Foreground sweeping accretion disk lane across the orb:
  // 0 at zoom >= 0.68 -> 1.0 at zoom <= 0.34.
  const blackHoleDiskForeground = smoothstep01((0.68 - safeZoom) / (0.68 - 0.34));

  // Gravitational lensing, corona, back disk & photon ring:
  // Active 0.85..1.0 at normal zoom (1.0x), intensifying to 1.0 on zoom-out.
  const blackHoleCoronaAlpha =
    0.85 + 0.15 * smoothstep01((0.90 - safeZoom) / (0.90 - 0.35));

  // Supreme Xianxia Cultivator reveal:
  // 0 at zoom >= 0.44 -> 1.0 at zoom <= 0.20.
  const cultivatorReveal = smoothstep01((0.44 - safeZoom) / (0.44 - 0.20));

  return {
    annotationsAlpha,
    starsAlpha,
    blackHoleCoreDarkness,
    blackHoleDiskForeground,
    blackHoleCoronaAlpha,
    cultivatorReveal,
  };
}

/**
 * Returns the 1-click toggle target zoom for admin quick switching (1.0x <-> 0.18x).
 */
export function getAdminQuickZoomTarget(currentZoom: number): number {
  return currentZoom <= 0.36 ? ADMIN_NORMAL_ZOOM : ADMIN_REFINING_ZOOM;
}
