import type { SamsaraState } from '../../utils/samsaraChoreography.ts';
import { SamsaraCloudShaderRenderer } from './samsaraCloudShader2D.ts';

export interface SamsaraBackgroundRenderParams {
  width: number;
  height: number;
  bhX: number;
  bhY: number;
  reveal: number;
  samsara: SamsaraState;
  timeSec: number;
}

interface CloudPuffSeed {
  localX: number;
  localY: number;
  scale: number;
  driftAmp: number;
  speed: number;
  phase: number;
  isWhite: boolean;
}

// 12 gently drifting & orbiting multi-lobe cloud wisps (6 White hemisphere, 6 Gold-Black hemisphere)
const CLOUD_PUFF_SEEDS: CloudPuffSeed[] = [
  // White celestial hemisphere (localY < 0)
  { localX: -0.24, localY: -0.22, scale: 0.44, driftAmp: 0.018, speed: 0.45, phase: 0.0, isWhite: true },
  { localX: 0.22, localY: -0.26, scale: 0.40, driftAmp: 0.016, speed: 0.52, phase: 1.2, isWhite: true },
  { localX: -0.32, localY: -0.06, scale: 0.36, driftAmp: 0.015, speed: 0.40, phase: 2.1, isWhite: true },
  { localX: 0.04, localY: -0.36, scale: 0.42, driftAmp: 0.014, speed: 0.48, phase: 3.4, isWhite: true },
  { localX: -0.14, localY: -0.12, scale: 0.34, driftAmp: 0.012, speed: 0.58, phase: 4.5, isWhite: true },
  { localX: 0.30, localY: -0.11, scale: 0.32, driftAmp: 0.015, speed: 0.49, phase: 5.4, isWhite: true },
  // Gold-obsidian hemisphere (localY > 0)
  { localX: 0.24, localY: 0.22, scale: 0.44, driftAmp: 0.018, speed: 0.44, phase: 0.7, isWhite: false },
  { localX: -0.22, localY: 0.26, scale: 0.40, driftAmp: 0.016, speed: 0.50, phase: 1.9, isWhite: false },
  { localX: 0.32, localY: 0.08, scale: 0.36, driftAmp: 0.015, speed: 0.42, phase: 2.8, isWhite: false },
  { localX: -0.05, localY: 0.35, scale: 0.42, driftAmp: 0.014, speed: 0.47, phase: 3.9, isWhite: false },
  { localX: 0.14, localY: 0.14, scale: 0.34, driftAmp: 0.012, speed: 0.56, phase: 5.1, isWhite: false },
  { localX: -0.30, localY: 0.12, scale: 0.32, driftAmp: 0.015, speed: 0.46, phase: 6.0, isWhite: false },
];

const PUFF_SPRITE_SIZE = 256;

let cachedTaijiCloudsImage: HTMLImageElement | null = null;
let cachedWhiteCloudPuff: HTMLCanvasElement | null = null;
let cachedGoldCloudPuff: HTMLCanvasElement | null = null;
let shaderRenderer: SamsaraCloudShaderRenderer | null = null;
let shaderInitFailed = false;

function resolveAssetBaseUrl(): string {
  const baseUrl = import.meta.env?.BASE_URL ?? '/aetheriaplanetarium/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function getTaijiCloudsImage(): HTMLImageElement | null {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return null;
  }
  if (!cachedTaijiCloudsImage) {
    const img = new Image();
    img.decoding = 'async';
    img.src = `${resolveAssetBaseUrl()}assets/samsara-taiji-clouds.png`;
    cachedTaijiCloudsImage = img;
  }
  return cachedTaijiCloudsImage;
}

function getCloudShaderRenderer(): SamsaraCloudShaderRenderer | null {
  if (shaderInitFailed || typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  if (!shaderRenderer) {
    try {
      shaderRenderer = new SamsaraCloudShaderRenderer();
    } catch {
      shaderInitFailed = true;
      shaderRenderer = null;
    }
  }
  return shaderRenderer;
}

function createMultiLobeCloudPuff(isWhite: boolean): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const size = PUFF_SPRITE_SIZE;
  const half = size * 0.5;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const lobes: readonly { ox: number; oy: number; r: number; a: number }[] = [
    { ox: 0.0, oy: 0.0, r: 0.46, a: 0.24 },
    { ox: -0.14, oy: -0.08, r: 0.34, a: 0.20 },
    { ox: 0.16, oy: -0.06, r: 0.32, a: 0.18 },
    { ox: -0.08, oy: 0.14, r: 0.30, a: 0.16 },
    { ox: 0.12, oy: 0.12, r: 0.28, a: 0.15 },
  ];

  for (const lobe of lobes) {
    const cx = half + lobe.ox * size;
    const cy = half + lobe.oy * size;
    const rad = lobe.r * size;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    if (isWhite) {
      grad.addColorStop(0, `rgba(241, 245, 249, ${lobe.a.toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(186, 230, 253, ${(lobe.a * 0.42).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(241, 245, 249, 0)');
    } else {
      grad.addColorStop(0, `rgba(251, 191, 36, ${lobe.a.toFixed(3)})`);
      grad.addColorStop(0.45, `rgba(180, 83, 9, ${(lobe.a * 0.55).toFixed(3)})`);
      grad.addColorStop(0.75, `rgba(15, 23, 42, ${(lobe.a * 0.45).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

function drawOrganicFallbackVortex(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  diskSize: number,
  angleRad: number,
  alpha: number
): void {
  const halfR = diskSize * 0.44;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angleRad);

  const whiteGrad = ctx.createRadialGradient(0, -halfR * 0.4, 0, 0, -halfR * 0.4, halfR * 0.85);
  whiteGrad.addColorStop(0, `rgba(226, 232, 240, ${(0.24 * alpha).toFixed(3)})`);
  whiteGrad.addColorStop(1, 'rgba(226, 232, 240, 0)');
  ctx.fillStyle = whiteGrad;
  ctx.beginPath();
  ctx.arc(0, -halfR * 0.4, halfR * 0.85, 0, Math.PI * 2);
  ctx.fill();

  const goldGrad = ctx.createRadialGradient(0, halfR * 0.4, 0, 0, halfR * 0.4, halfR * 0.85);
  goldGrad.addColorStop(0, `rgba(245, 158, 11, ${(0.22 * alpha).toFixed(3)})`);
  goldGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.arc(0, halfR * 0.4, halfR * 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function smoothstepEdge(edge0: number, edge1: number, x: number): number {
  const span = edge1 - edge0;
  const t = span > 1e-6 ? Math.max(0, Math.min(1, (x - edge0) / span)) : x >= edge1 ? 1 : 0;
  return t * t * (3 - 2 * t);
}

/**
 * Draws the volumetric 3D cloud Samsara Taiji background using real-time GLSL
 * fluid-advection with Black-Hole-centered radial wave expansion (and 2D fallback)
 * plus 12 softly drifting multi-lobe cloud wisps synced to the radial reveal wave.
 */
export function drawSamsaraBackground2D(
  ctx: CanvasRenderingContext2D,
  params: SamsaraBackgroundRenderParams
): void {
  const { width, height, bhX, bhY, reveal, samsara, timeSec } = params;
  if (reveal <= 0.005 || width <= 0 || height <= 0) return;

  const safeReveal = Math.max(0, Math.min(1, reveal));
  const easeAlpha = safeReveal * safeReveal * (3 - 2 * safeReveal);
  const revealFront = -0.18 + (0.72 - -0.18) * safeReveal;
  const img = getTaijiCloudsImage();
  if (!cachedWhiteCloudPuff) cachedWhiteCloudPuff = createMultiLobeCloudPuff(true);
  if (!cachedGoldCloudPuff) cachedGoldCloudPuff = createMultiLobeCloudPuff(false);

  const diskSize = Math.max(width, height) * 1.15;
  const centerY = bhY - height * 0.04;
  const turnSpeed = samsara.isTurning ? Math.sin(samsara.turnProgress * Math.PI) : 0;

  ctx.save();

  // 1. Real-time GLSL fluid-advected Taiji clouds with uReveal radial wave (full inner opacity)
  let renderedViaShader = false;
  if (img && img.complete && img.naturalWidth > 0) {
    const renderer = getCloudShaderRenderer();
    if (renderer) {
      renderedViaShader = renderer.renderTo2D(
        ctx,
        img,
        bhX,
        centerY,
        diskSize,
        samsara.angleRad,
        timeSec,
        turnSpeed,
        0.88,
        safeReveal
      );
    }

    if (!renderedViaShader) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(bhX, centerY, Math.max(1, diskSize * (0.04 + safeReveal * 0.68)), 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(bhX, centerY);
      ctx.rotate(samsara.angleRad);
      ctx.globalAlpha = easeAlpha * 0.86;
      ctx.drawImage(img, -diskSize * 0.5, -diskSize * 0.5, diskSize, diskSize);
      ctx.restore();
    }
  } else {
    drawOrganicFallbackVortex(ctx, bhX, centerY, diskSize, samsara.angleRad, easeAlpha);
  }

  // 2. 12 gently drifting & orbiting multi-lobe cloud wisps synced to radial reveal wave
  ctx.save();
  ctx.translate(bhX, centerY);
  ctx.rotate(samsara.angleRad);
  ctx.globalCompositeOperation = 'screen';

  for (const seed of CLOUD_PUFF_SEEDS) {
    const puff = seed.isWhite ? cachedWhiteCloudPuff : cachedGoldCloudPuff;
    if (!puff) continue;

    const seedDist = Math.hypot(seed.localX, seed.localY);
    const seedRadialReveal = 1 - smoothstepEdge(revealFront - 0.22, revealFront + 0.04, seedDist);
    if (seedRadialReveal <= 0.01) continue;

    const orbitSpin = Math.sin(timeSec * 0.22 + seed.phase) * 0.012 * diskSize;
    const driftX = Math.sin(timeSec * seed.speed + seed.phase) * seed.driftAmp * diskSize + orbitSpin;
    const driftY = Math.cos(timeSec * seed.speed * 0.8 + seed.phase) * seed.driftAmp * diskSize;
    const px = seed.localX * diskSize + driftX;
    const py = seed.localY * diskSize + driftY;
    const breath = 0.88 + 0.12 * Math.sin(timeSec * 0.95 + seed.phase);
    const drawSize = seed.scale * diskSize * breath;

    ctx.globalAlpha = seedRadialReveal * (0.26 + 0.12 * Math.sin(timeSec * 1.1 + seed.phase));
    ctx.drawImage(puff, px - drawSize * 0.5, py - drawSize * 0.5, drawSize, drawSize);
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Releases WebGL resources held by the Samsara Taiji cloud shader renderer.
 */
export function disposeSamsaraBackground2D(): void {
  if (shaderRenderer) {
    shaderRenderer.dispose();
    shaderRenderer = null;
  }
  shaderInitFailed = false;
}
