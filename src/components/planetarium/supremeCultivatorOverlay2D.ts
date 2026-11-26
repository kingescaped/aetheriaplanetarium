import {
  computeSamsaraState,
  type SamsaraState,
  type SwordFormationState,
} from '../../utils/samsaraChoreography.ts';

export interface SupremeCultivatorRenderParams {
  width: number;
  height: number;
  bhX: number;
  bhY: number;
  bhRadius: number;
  reveal: number;
  timeSec: number;
  samsara?: SamsaraState;
  swordState?: SwordFormationState;
  onDrawBehindSovereign?: () => void;
}

export interface SovereignArtworkLayout {
  imgSize: number;
  floatY: number;
  topLeftX: number;
  topLeftY: number;
  haloX: number;
  haloY: number;
  haloR: number;
  leftEyeX: number;
  rightEyeX: number;
  eyeY: number;
  leftSealX: number;
  rightSealX: number;
  sealY: number;
  sealR: number;
}

interface RiftSeed {
  angle: number;
  innerMult: number;
  outerMult: number;
  jagSeed: number;
  phaseOffset: number;
}

interface FractalPoint {
  x: number;
  y: number;
}

interface FractalBoltGeometry {
  main: FractalPoint[];
  forks: FractalPoint[][];
}

interface PetalAshSeed {
  xFrac: number;
  speed: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  size: number;
  isPetal: boolean;
}

// Normalized landmarks measured on 640x640 RGBA supreme-sovereign.png & supreme-sovereign-yang.png
export const SOVEREIGN_ARTWORK_LANDMARKS = {
  haloCenterX: 0.5,
  haloCenterY: 0.225,
  eyeOffsetX: 0.0318,
  eyeY: 0.2435,
  palmCenterY: 0.691,
  palmInnerSealOffsetX: 0.242,
} as const;

const VOID_RIFTS: RiftSeed[] = [
  { angle: -2.62, innerMult: 1.95, outerMult: 3.85, jagSeed: 1.13, phaseOffset: 0.0 },
  { angle: -2.02, innerMult: 2.15, outerMult: 4.1, jagSeed: 2.37, phaseOffset: 0.7 },
  { angle: -1.12, innerMult: 2.08, outerMult: 4.0, jagSeed: 3.71, phaseOffset: 1.3 },
  { angle: -0.52, innerMult: 1.92, outerMult: 3.75, jagSeed: 4.93, phaseOffset: 2.1 },
  { angle: 0.48, innerMult: 1.98, outerMult: 3.85, jagSeed: 5.47, phaseOffset: 2.8 },
  { angle: 2.66, innerMult: 1.98, outerMult: 3.8, jagSeed: 6.29, phaseOffset: 3.5 },
];

const PETAL_ASH_PARTICLES: PetalAshSeed[] = Array.from({ length: 34 }, (_, i) => ({
  xFrac: ((i * 29 + 11) % 94) / 100 + 0.03,
  speed: 0.055 + (i % 6) * 0.016,
  swayAmp: 8 + (i % 5) * 4.5,
  swayFreq: 0.9 + (i % 4) * 0.35,
  phase: (i * 0.273) % 1,
  size: 0.75 + (i % 4) * 0.28,
  isPetal: i % 3 === 0,
}));

const MORPH_SIZE = 512;
const HALO_SPRITE_SIZE = 256;

let cachedYinImage: HTMLImageElement | null = null;
let cachedYangImage: HTMLImageElement | null = null;
let cachedSilhouetteCanvas: HTMLCanvasElement | null = null;
let cachedMorphCanvas: HTMLCanvasElement | null = null;
let cachedYangScratchCanvas: HTMLCanvasElement | null = null;
let lastMorphYangBlend = -1;
let lastMorphWipeAngle = -999;
let lastMorphLoadedMask = -1;

let cachedGodRaysCanvas: HTMLCanvasElement | null = null;
let cachedRadialRevealCanvas: HTMLCanvasElement | null = null;

// Pre-allocated tapered flame ribbon spine buffers (zero per-frame allocations)
const FLAME_SAMPLES = 16;
const FLAME_TOP_X = new Float64Array(FLAME_SAMPLES);
const FLAME_TOP_Y = new Float64Array(FLAME_SAMPLES);
const FLAME_BOT_X = new Float64Array(FLAME_SAMPLES);
const FLAME_BOT_Y = new Float64Array(FLAME_SAMPLES);

function resolveAssetBaseUrl(): string {
  const baseUrl = import.meta.env?.BASE_URL ?? '/aetheriaplanetarium/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function ensureArtworkImages(): {
  yin: HTMLImageElement | null;
  yang: HTMLImageElement | null;
} {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return { yin: null, yang: null };
  }
  const base = resolveAssetBaseUrl();
  if (!cachedYinImage) {
    const img = new Image();
    img.decoding = 'async';
    img.src = `${base}assets/supreme-sovereign.png`;
    cachedYinImage = img;
  }
  if (!cachedYangImage) {
    const img = new Image();
    img.decoding = 'async';
    img.src = `${base}assets/supreme-sovereign-yang.png`;
    cachedYangImage = img;
  }
  return { yin: cachedYinImage, yang: cachedYangImage };
}

function isImageReady(img: HTMLImageElement | null): img is HTMLImageElement {
  return Boolean(img && img.complete && img.naturalWidth > 0);
}

function getPureSilhouetteCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (cachedSilhouetteCanvas) return cachedSilhouetteCanvas;

  const { yin, yang } = ensureArtworkImages();
  const baseImg = isImageReady(yin) ? yin : isImageReady(yang) ? yang : null;
  if (!baseImg) return null;

  const canvas = document.createElement('canvas');
  canvas.width = MORPH_SIZE;
  canvas.height = MORPH_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(baseImg, 0, 0, MORPH_SIZE, MORPH_SIZE);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, MORPH_SIZE, MORPH_SIZE);
  ctx.globalCompositeOperation = 'source-over';

  cachedSilhouetteCanvas = canvas;
  return cachedSilhouetteCanvas;
}

function getMorphedSovereignCanvas(
  yangBlend: number,
  wipeAngleRad: number
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const { yin, yang } = ensureArtworkImages();
  const yinReady = isImageReady(yin);
  const yangReady = isImageReady(yang);
  if (!yinReady && !yangReady) return null;

  const loadedMask = (yinReady ? 1 : 0) | (yangReady ? 2 : 0);
  const shouldUpdate =
    !cachedMorphCanvas ||
    loadedMask !== lastMorphLoadedMask ||
    Math.abs(yangBlend - lastMorphYangBlend) > 0.015 ||
    Math.abs(wipeAngleRad - lastMorphWipeAngle) > 0.05;

  if (!shouldUpdate && cachedMorphCanvas) {
    return cachedMorphCanvas;
  }

  if (!cachedMorphCanvas) {
    cachedMorphCanvas = document.createElement('canvas');
    cachedMorphCanvas.width = MORPH_SIZE;
    cachedMorphCanvas.height = MORPH_SIZE;
  }
  const mctx = cachedMorphCanvas.getContext('2d');
  if (!mctx) return null;

  mctx.globalCompositeOperation = 'source-over';
  mctx.globalAlpha = 1;
  mctx.clearRect(0, 0, MORPH_SIZE, MORPH_SIZE);

  if (yinReady && (!yangReady || yangBlend <= 0.985)) {
    mctx.drawImage(yin, 0, 0, MORPH_SIZE, MORPH_SIZE);
  }

  if (yangReady && (!yinReady || yangBlend >= 0.015)) {
    if (!yinReady || yangBlend >= 0.985) {
      mctx.drawImage(yang, 0, 0, MORPH_SIZE, MORPH_SIZE);
    } else {
      if (!cachedYangScratchCanvas) {
        cachedYangScratchCanvas = document.createElement('canvas');
        cachedYangScratchCanvas.width = MORPH_SIZE;
        cachedYangScratchCanvas.height = MORPH_SIZE;
      }
      const sctx = cachedYangScratchCanvas.getContext('2d');
      if (sctx) {
        sctx.globalCompositeOperation = 'source-over';
        sctx.globalAlpha = 1;
        sctx.clearRect(0, 0, MORPH_SIZE, MORPH_SIZE);
        sctx.drawImage(yang, 0, 0, MORPH_SIZE, MORPH_SIZE);

        sctx.globalCompositeOperation = 'destination-in';
        const half = MORPH_SIZE * 0.5;
        const span = MORPH_SIZE * 0.72;
        const dx = Math.cos(wipeAngleRad);
        const dy = Math.sin(wipeAngleRad);
        const grad = sctx.createLinearGradient(
          half - dx * span,
          half - dy * span,
          half + dx * span,
          half + dy * span
        );

        const feather = 0.24;
        const edge = yangBlend * (1 + feather * 2) - feather;
        const s0 = Math.max(0, Math.min(1, edge - feather));
        const s1 = Math.max(s0, Math.min(1, edge + feather));

        if (s0 > 0) grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(s0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(s1, 'rgba(255, 255, 255, 0)');
        if (s1 < 1) grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, MORPH_SIZE, MORPH_SIZE);

        mctx.drawImage(cachedYangScratchCanvas, 0, 0, MORPH_SIZE, MORPH_SIZE);
      }
    }
  }

  lastMorphYangBlend = yangBlend;
  lastMorphWipeAngle = wipeAngleRad;
  lastMorphLoadedMask = loadedMask;
  return cachedMorphCanvas;
}

/**
 * Computes responsive placement and aligned landmark coordinates for the
 * Supreme Sovereign artwork, Bagua Dao Halo, Eye Flares, and Palm Dharma Seals.
 */
export function computeSovereignArtworkLayout(
  params: Pick<
    SupremeCultivatorRenderParams,
    'width' | 'height' | 'bhX' | 'bhY' | 'bhRadius' | 'reveal' | 'timeSec'
  >
): SovereignArtworkLayout {
  const { width, height, bhX, bhY, bhRadius, reveal, timeSec } = params;
  const ease = reveal * reveal * (3 - 2 * reveal);

  const maxByHeader = Math.max(120, (bhY - 26) / SOVEREIGN_ARTWORK_LANDMARKS.palmCenterY);
  const maxByWidth = width * 0.98;
  const maxAllowed = Math.min(maxByHeader, maxByWidth);
  const minNeeded = bhRadius * 5.2;
  const idealSize = Math.max(bhRadius * 5.8, Math.min(height * 0.64, width * 0.94));
  const imgSize = Math.min(maxAllowed, Math.max(minNeeded, idealSize));

  const floatY =
    Math.sin(timeSec * 1.15) * Math.max(2, imgSize * 0.008) +
    (1 - ease) * imgSize * 0.04;

  const topLeftX = bhX - imgSize * 0.5;
  const topLeftY = bhY - imgSize * SOVEREIGN_ARTWORK_LANDMARKS.palmCenterY + floatY;

  const haloX = bhX;
  const haloY = topLeftY + imgSize * SOVEREIGN_ARTWORK_LANDMARKS.haloCenterY;
  const haloR = Math.min(imgSize * 0.30, Math.max(imgSize * 0.21, haloY - 6));

  const eyeY = topLeftY + imgSize * SOVEREIGN_ARTWORK_LANDMARKS.eyeY;
  const eyeOffset = imgSize * SOVEREIGN_ARTWORK_LANDMARKS.eyeOffsetX;

  const sealOffsetX = imgSize * SOVEREIGN_ARTWORK_LANDMARKS.palmInnerSealOffsetX;
  const sealY = bhY + floatY * 0.5;
  const sealR = Math.max(18, imgSize * 0.068);

  return {
    imgSize,
    floatY,
    topLeftX,
    topLeftY,
    haloX,
    haloY,
    haloR,
    leftEyeX: bhX - eyeOffset,
    rightEyeX: bhX + eyeOffset,
    eyeY,
    leftSealX: bhX - sealOffsetX,
    rightSealX: bhX + sealOffsetX,
    sealY,
    sealR,
  };
}

function deterministicSignedNoise(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return (s - Math.floor(s)) * 2 - 1;
}

function subdivideMidpointLightning(
  start: FractalPoint,
  end: FractalPoint,
  depth: number,
  displaceScale: number,
  seedBase: number
): FractalPoint[] {
  let pts: FractalPoint[] = [start, end];
  let disp = displaceScale;

  for (let level = 0; level < depth; level++) {
    const next: FractalPoint[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const n = deterministicSignedNoise(seedBase + level * 41.3 + i * 17.9);
      const midX = (a.x + b.x) * 0.5 + nx * len * disp * n;
      const midY = (a.y + b.y) * 0.5 + ny * len * disp * n;
      next.push({ x: midX, y: midY }, b);
    }
    pts = next;
    disp *= 0.62;
  }

  return pts;
}

function buildFractalBolt(
  originX: number,
  originY: number,
  rift: RiftSeed,
  rStart: number,
  rEnd: number,
  boltSnap: number
): FractalBoltGeometry {
  const seedBase = boltSnap * 13.7 + rift.jagSeed * 29.1;
  const endAngle = rift.angle + deterministicSignedNoise(seedBase + 1.9) * 0.08;
  const startPt: FractalPoint = {
    x: originX + Math.cos(rift.angle) * rStart,
    y: originY + Math.sin(rift.angle) * rStart,
  };
  const endPt: FractalPoint = {
    x: originX + Math.cos(endAngle) * rEnd,
    y: originY + Math.sin(endAngle) * rEnd,
  };

  const main = subdivideMidpointLightning(startPt, endPt, 4, 0.24, seedBase);
  const forks: FractalPoint[][] = [];
  const forkVertices = [4, 8, 11];
  for (let f = 0; f < forkVertices.length; f++) {
    const idx = forkVertices[f];
    if (idx >= main.length - 1) continue;
    const root = main[idx];
    const sideSign = f % 2 === 0 ? 1 : -1;
    const forkAngle =
      rift.angle + sideSign * (0.34 + 0.16 * Math.abs(deterministicSignedNoise(seedBase + f * 7.1)));
    const forkLen = (rEnd - rStart) * (0.22 + 0.08 * (2 - f));
    const forkEnd: FractalPoint = {
      x: root.x + Math.cos(forkAngle) * forkLen,
      y: root.y + Math.sin(forkAngle) * forkLen,
    };
    forks.push(subdivideMidpointLightning(root, forkEnd, 3, 0.28, seedBase + 100 + f * 23));
  }

  return { main, forks };
}

function strokePolyline(ctx: CanvasRenderingContext2D, pts: FractalPoint[]): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
}

function drawEmperorPressureAndRifts(
  ctx: CanvasRenderingContext2D,
  params: SupremeCultivatorRenderParams,
  layout: SovereignArtworkLayout,
  ambientAlpha: number,
  riftAlphaScale: number
): void {
  const { bhX, bhY, bhRadius, width, height, timeSec } = params;
  const { imgSize, haloY } = layout;
  const maxField = Math.max(width, height) * 0.6;
  const fieldCenterY = (bhY + haloY) * 0.5;

  // Low-intensity ambient dark-violet/amber backlight so pure #000000 silhouette remains visible when Taiji wheel is hidden
  const pressureGlow = ctx.createRadialGradient(
    bhX,
    fieldCenterY,
    bhRadius * 0.85,
    bhX,
    fieldCenterY,
    maxField
  );
  pressureGlow.addColorStop(0, `rgba(124, 58, 237, ${(0.28 * ambientAlpha).toFixed(3)})`);
  pressureGlow.addColorStop(0.36, `rgba(180, 83, 9, ${(0.15 * ambientAlpha).toFixed(3)})`);
  pressureGlow.addColorStop(0.72, `rgba(49, 16, 84, ${(0.075 * ambientAlpha).toFixed(3)})`);
  pressureGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = pressureGlow;
  ctx.fillRect(0, 0, width, height);

  if (riftAlphaScale <= 0.01) return;

  // Expanding concentric Emperor Pressure shockwaves (gated by sovereignAlpha)
  for (let i = 0; i < 3; i++) {
    const t = (timeSec * 0.22 + i / 3) % 1;
    const r = bhRadius * 1.65 + t * Math.min(width, height) * 0.45;
    const waveAlpha = Math.sin(t * Math.PI) * 0.22 * riftAlphaScale;
    if (waveAlpha < 0.01) continue;

    ctx.strokeStyle =
      i % 2 === 0
        ? `rgba(245, 158, 11, ${waveAlpha.toFixed(3)})`
        : `rgba(167, 139, 250, ${waveAlpha.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, (1 - t * 0.6) * 2.0);
    ctx.beginPath();
    ctx.arc(bhX, fieldCenterY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Multi-level midpoint-displacement Fractal Spatial Lightning Rifts (gated by sovereignAlpha)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const boltSnap = Math.floor(timeSec * 7.5);
  const originY = haloY + imgSize * 0.08;
  for (const rift of VOID_RIFTS) {
    const cycle = 0.5 + 0.5 * Math.sin(timeSec * 2.7 + rift.phaseOffset * 2.1);
    const riftAlpha = (0.28 + 0.68 * cycle * cycle) * riftAlphaScale;
    if (riftAlpha < 0.04) continue;

    const rStart = Math.max(bhRadius * rift.innerMult, imgSize * 0.24);
    const rEnd = Math.min(
      Math.max(width, height) * 0.54,
      Math.max(bhRadius * rift.outerMult, imgSize * 0.56)
    );
    const bolt = buildFractalBolt(bhX, originY, rift, rStart, rEnd, boltSnap);

    ctx.strokeStyle = `rgba(168, 85, 247, ${(riftAlpha * 0.46).toFixed(3)})`;
    ctx.lineWidth = 3.6;
    strokePolyline(ctx, bolt.main);

    ctx.lineWidth = 2.1;
    for (const fork of bolt.forks) {
      strokePolyline(ctx, fork);
    }

    ctx.strokeStyle = `rgba(255, 251, 235, ${(riftAlpha * 0.94).toFixed(3)})`;
    ctx.lineWidth = 0.9;
    strokePolyline(ctx, bolt.main);

    ctx.strokeStyle = `rgba(253, 224, 71, ${(riftAlpha * 0.72).toFixed(3)})`;
    ctx.lineWidth = 0.65;
    for (const fork of bolt.forks) {
      strokePolyline(ctx, fork);
    }
  }

  ctx.restore();
}

function createGodRaysSprite(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const size = HALO_SPRITE_SIZE;
  const half = size * 0.5;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.translate(half, half);
  const rayCount = 16;
  const maxR = half * 0.96;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    const rayLen = maxR * (i % 2 === 0 ? 1.0 : 0.78);
    const halfSpread = i % 2 === 0 ? 0.062 : 0.04;
    const grad = ctx.createRadialGradient(0, 0, maxR * 0.12, 0, 0, rayLen);
    grad.addColorStop(
      0,
      i % 2 === 0 ? 'rgba(253, 224, 71, 0.34)' : 'rgba(255, 251, 235, 0.28)'
    );
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle - halfSpread) * rayLen, Math.sin(angle - halfSpread) * rayLen);
    ctx.lineTo(Math.cos(angle + halfSpread) * rayLen, Math.sin(angle + halfSpread) * rayLen);
    ctx.closePath();
    ctx.fill();
  }

  const discGlow = ctx.createRadialGradient(0, 0, maxR * 0.06, 0, 0, maxR * 0.65);
  discGlow.addColorStop(0, 'rgba(254, 243, 199, 0.36)');
  discGlow.addColorStop(0.45, 'rgba(245, 158, 11, 0.20)');
  discGlow.addColorStop(0.85, 'rgba(253, 224, 71, 0.14)');
  discGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = discGlow;
  ctx.beginPath();
  ctx.arc(0, 0, maxR * 0.65, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

function drawGodRaysAndBurst(
  ctx: CanvasRenderingContext2D,
  layout: SovereignArtworkLayout,
  timeSec: number,
  godRaysAlpha: number,
  burstFlash: number
): void {
  if (godRaysAlpha <= 0.01 && burstFlash <= 0.01) return;

  if (!cachedGodRaysCanvas) cachedGodRaysCanvas = createGodRaysSprite();

  const { haloX, haloY, haloR } = layout;
  const rayDrawSize = haloR * 3.7;

  ctx.save();
  ctx.translate(haloX, haloY);

  if (godRaysAlpha > 0.01 && cachedGodRaysCanvas) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = godRaysAlpha;
    ctx.rotate(timeSec * 0.06);
    ctx.drawImage(
      cachedGodRaysCanvas,
      -rayDrawSize * 0.5,
      -rayDrawSize * 0.5,
      rayDrawSize,
      rayDrawSize
    );
    ctx.restore();
  }

  if (burstFlash > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const flashR = haloR * (1.25 + burstFlash * 0.65);
    const flashGrad = ctx.createRadialGradient(0, 0, haloR * 0.15, 0, 0, flashR);
    flashGrad.addColorStop(0, `rgba(255, 255, 255, ${(burstFlash * 0.72).toFixed(3)})`);
    flashGrad.addColorStop(0.35, `rgba(254, 249, 195, ${(burstFlash * 0.45).toFixed(3)})`);
    flashGrad.addColorStop(0.75, `rgba(253, 224, 71, ${(burstFlash * 0.24).toFixed(3)})`);
    flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(0, 0, flashR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawSoftNebulaFallback(
  ctx: CanvasRenderingContext2D,
  layout: SovereignArtworkLayout,
  alpha: number
): void {
  if (alpha <= 0.01) return;
  const { haloX, haloY, imgSize, leftSealX, rightSealX, sealY } = layout;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const bodyAura = ctx.createRadialGradient(
    haloX,
    haloY + imgSize * 0.16,
    imgSize * 0.04,
    haloX,
    haloY + imgSize * 0.16,
    imgSize * 0.34
  );
  bodyAura.addColorStop(0, `rgba(192, 132, 252, ${(0.34 * alpha).toFixed(3)})`);
  bodyAura.addColorStop(0.5, `rgba(245, 158, 11, ${(0.18 * alpha).toFixed(3)})`);
  bodyAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bodyAura;
  ctx.beginPath();
  ctx.arc(haloX, haloY + imgSize * 0.16, imgSize * 0.34, 0, Math.PI * 2);
  ctx.fill();

  for (const sx of [leftSealX, rightSealX]) {
    const palmGlow = ctx.createRadialGradient(sx, sealY, 0, sx, sealY, imgSize * 0.09);
    palmGlow.addColorStop(0, `rgba(186, 230, 253, ${(0.45 * alpha).toFixed(3)})`);
    palmGlow.addColorStop(0.5, `rgba(251, 191, 36, ${(0.25 * alpha).toFixed(3)})`);
    palmGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = palmGlow;
    ctx.beginPath();
    ctx.arc(sx, sealY, imgSize * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function getRadialRevealCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!cachedRadialRevealCanvas) {
    cachedRadialRevealCanvas = document.createElement('canvas');
    cachedRadialRevealCanvas.width = MORPH_SIZE;
    cachedRadialRevealCanvas.height = MORPH_SIZE;
  }
  return cachedRadialRevealCanvas;
}

function drawTaperedFlameRibbon(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  side: -1 | 1,
  len: number,
  liftY: number,
  droopMidY: number,
  baseHalfW: number,
  waveAmp: number,
  timeSec: number,
  phase: number,
  fillStyle: CanvasGradient
): void {
  for (let k = 0; k < FLAME_SAMPLES; k++) {
    const t = k / (FLAME_SAMPLES - 1);
    const waveEnv = Math.pow(Math.max(0, (t - 0.16) / 0.84), 1.15);
    const wave =
      (Math.sin(t * 7.0 - timeSec * 12.5 + phase) * waveAmp +
        Math.sin(t * 13.0 - timeSec * 19.0 + phase * 1.7) * waveAmp * 0.35) *
      waveEnv;

    const cx = startX + side * len * t;
    const cy =
      startY -
      liftY * Math.pow(t, 1.35) +
      droopMidY * Math.sin(t * Math.PI) * (1 - t * 0.4) +
      wave;

    const tx = side * len;
    const ty =
      -liftY * 1.35 * Math.pow(Math.max(0.02, t), 0.35) +
      droopMidY * Math.cos(t * Math.PI) * Math.PI * 0.4;
    const tLen = Math.hypot(tx, ty) || 1;
    let nx = -ty / tLen;
    let ny = tx / tLen;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }

    const baseTaper = Math.pow(Math.min(1, t / 0.2), 0.78);
    const tipTaper = Math.pow(Math.max(0, 1 - t), 1.45);
    const flickerW = 1 + 0.22 * Math.sin(timeSec * 16.5 + t * 8.0 + phase);
    const hw = baseHalfW * baseTaper * tipTaper * flickerW;

    FLAME_TOP_X[k] = cx + nx * hw;
    FLAME_TOP_Y[k] = cy + ny * hw;
    FLAME_BOT_X[k] = cx - nx * hw;
    FLAME_BOT_Y[k] = cy - ny * hw;
  }

  ctx.beginPath();
  ctx.moveTo(FLAME_TOP_X[0], FLAME_TOP_Y[0]);
  for (let k = 1; k < FLAME_SAMPLES; k++) {
    ctx.lineTo(FLAME_TOP_X[k], FLAME_TOP_Y[k]);
  }
  for (let k = FLAME_SAMPLES - 1; k >= 0; k--) {
    ctx.lineTo(FLAME_BOT_X[k], FLAME_BOT_Y[k]);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawSupernovaEyeFlares(
  ctx: CanvasRenderingContext2D,
  layout: SovereignArtworkLayout,
  timeSec: number,
  alpha: number,
  silhouetteIntensity = 0
): void {
  if (alpha <= 0.02) return;
  const { leftEyeX, rightEyeX, eyeY, imgSize } = layout;
  const rx = imgSize * 0.0145;
  const ry = Math.max(1.2, imgSize * 0.0042);

  const primaryLen = imgSize * (0.072 + 0.024 * silhouetteIntensity);
  const secondaryLen = imgSize * (0.056 + 0.016 * silhouetteIntensity);
  const waveAmp = Math.max(1.2, imgSize * 0.0058);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let idx = 0; idx < 2; idx++) {
    const side: -1 | 1 = idx === 0 ? -1 : 1;
    const ex = idx === 0 ? leftEyeX : rightEyeX;
    const eyeTilt = side * -0.14;
    const phase = side * 1.1;

    // 1. Sleek slanted almond phoenix eye-slit with soft horizontal linear gradient (zero outline stroke or glow blobs)
    ctx.save();
    ctx.translate(ex, eyeY);
    ctx.rotate(eyeTilt);
    const slitGrad = ctx.createLinearGradient(-rx, 0, rx, 0);
    slitGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
    slitGrad.addColorStop(0.2, `rgba(254, 240, 138, ${(0.65 * alpha).toFixed(3)})`);
    slitGrad.addColorStop(0.5, `rgba(255, 255, 255, ${(0.95 * alpha).toFixed(3)})`);
    slitGrad.addColorStop(0.8, `rgba(254, 240, 138, ${(0.65 * alpha).toFixed(3)})`);
    slitGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = slitGrad;
    ctx.beginPath();
    ctx.moveTo(-rx, 0);
    ctx.quadraticCurveTo(0, -ry, rx, 0);
    ctx.quadraticCurveTo(0, ry, -rx, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const cosTilt = Math.cos(eyeTilt);
    const sinTilt = Math.sin(eyeTilt);
    // Root primary mantle & core smoothly inside the almond eye so the outer corner never leaves a vertical seam
    const anchorX = ex + cosTilt * (-side * rx * 0.25);
    const anchorY = eyeY + sinTilt * (-side * rx * 0.25);
    const outerCornerX = ex + cosTilt * (side * rx * 0.85);
    const outerCornerY = eyeY + sinTilt * (side * rx * 0.85);

    const mantleTotalLen = primaryLen + rx * 1.1;
    // 2A. Layer 1: Outer Golden-Amber Fire Mantle
    const mantleGrad = ctx.createLinearGradient(
      anchorX,
      anchorY,
      anchorX + side * mantleTotalLen,
      anchorY - imgSize * 0.024
    );
    mantleGrad.addColorStop(0, 'rgba(254, 240, 138, 0)');
    mantleGrad.addColorStop(0.16, `rgba(254, 240, 138, ${(0.86 * alpha).toFixed(3)})`);
    mantleGrad.addColorStop(0.48, `rgba(245, 158, 11, ${(0.52 * alpha).toFixed(3)})`);
    mantleGrad.addColorStop(0.78, `rgba(234, 88, 12, ${(0.18 * alpha).toFixed(3)})`);
    mantleGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    drawTaperedFlameRibbon(
      ctx,
      anchorX,
      anchorY,
      side,
      mantleTotalLen,
      imgSize * 0.024,
      0,
      Math.max(1.8, imgSize * 0.0052),
      waveAmp,
      timeSec,
      phase,
      mantleGrad
    );

    // 2B. Layer 2: Secondary Forked Flame Tongue rooted smoothly inside outer half of eye
    const secStartX = ex + cosTilt * (side * rx * 0.15);
    const secStartY = eyeY + sinTilt * (side * rx * 0.15) + ry * 0.28;
    const forkTotalLen = secondaryLen + rx * 0.7;
    const forkGrad = ctx.createLinearGradient(
      secStartX,
      secStartY,
      secStartX + side * forkTotalLen,
      secStartY - imgSize * 0.011
    );
    forkGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
    forkGrad.addColorStop(0.16, `rgba(253, 224, 71, ${(0.72 * alpha).toFixed(3)})`);
    forkGrad.addColorStop(0.48, `rgba(245, 158, 11, ${(0.42 * alpha).toFixed(3)})`);
    forkGrad.addColorStop(0.78, `rgba(234, 88, 12, ${(0.14 * alpha).toFixed(3)})`);
    forkGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    drawTaperedFlameRibbon(
      ctx,
      secStartX,
      secStartY,
      side,
      forkTotalLen,
      imgSize * 0.012,
      imgSize * 0.0055,
      Math.max(1.3, imgSize * 0.0038),
      waveAmp * 0.85,
      timeSec,
      phase + 2.1,
      forkGrad
    );

    // 2C. Layer 3: Incandescent White-Gold Inner Fire Core
    const coreLen = primaryLen * 0.82 + rx * 0.9;
    const coreGrad = ctx.createLinearGradient(
      anchorX,
      anchorY,
      anchorX + side * coreLen,
      anchorY - imgSize * 0.019
    );
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    coreGrad.addColorStop(0.16, `rgba(255, 255, 255, ${(0.95 * alpha).toFixed(3)})`);
    coreGrad.addColorStop(0.48, `rgba(254, 240, 138, ${(0.62 * alpha).toFixed(3)})`);
    coreGrad.addColorStop(0.78, `rgba(245, 158, 11, ${(0.2 * alpha).toFixed(3)})`);
    coreGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    drawTaperedFlameRibbon(
      ctx,
      anchorX,
      anchorY,
      side,
      coreLen,
      imgSize * 0.019,
      0,
      Math.max(0.85, imgSize * 0.0022),
      waveAmp * 0.75,
      timeSec,
      phase + 0.45,
      coreGrad
    );

    // 3. 4 tiny elongated drifting fire sparks detaching outward & upward along the flame path
    for (let k = 0; k < 4; k++) {
      const age = (timeSec * 1.45 + k * 0.25 + (side > 0 ? 0.13 : 0)) % 1;
      const sparkFade = Math.sin(age * Math.PI) * alpha;
      if (sparkFade <= 0.04) continue;

      const travel = 0.42 + age * 0.78;
      const sx = outerCornerX + side * primaryLen * travel;
      const sy =
        outerCornerY -
        imgSize * (0.012 + age * 0.026) +
        Math.sin(timeSec * 7.5 + k * 2.1 + side) * imgSize * 0.003;
      const fleckLen = Math.max(1.2, (1.8 - age * 0.7) * (imgSize / 460));
      const fleckWid = Math.max(0.45, 0.75 * (1 - age * 0.4));

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(side * -0.45);
      ctx.fillStyle =
        age < 0.45
          ? `rgba(255, 251, 235, ${(0.92 * sparkFade).toFixed(3)})`
          : `rgba(251, 191, 36, ${(0.82 * sparkFade).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(-fleckLen, 0);
      ctx.quadraticCurveTo(0, -fleckWid, fleckLen, 0);
      ctx.quadraticCurveTo(0, fleckWid, -fleckLen, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawPalmSealAndDaoChains(
  ctx: CanvasRenderingContext2D,
  params: SupremeCultivatorRenderParams,
  layout: SovereignArtworkLayout,
  side: -1 | 1,
  alpha: number
): void {
  if (alpha <= 0.01) return;
  const { bhX, bhY, bhRadius, timeSec } = params;
  const { sealR, sealY, leftSealX, rightSealX } = layout;
  const sealX = side < 0 ? leftSealX : rightSealX;

  const targetX = bhX + side * bhRadius * 1.08;
  const targetY = bhY + (side < 0 ? bhRadius * 0.05 : -bhRadius * 0.05);
  const horizonGuardRadius = bhRadius * 1.02;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (let q = 0; q < 2; q++) {
    const ctrlSign = q === 0 ? -1 : 1;
    const wave = Math.sin(timeSec * 2.8 + q * 2.1 + (side < 0 ? 0 : 0.7)) * sealR * 0.24;
    const c1x = sealX + (targetX - sealX) * 0.35;
    const c1y = sealY + ctrlSign * sealR * 0.62 + wave;
    const c2x = sealX + (targetX - sealX) * 0.72;
    const c2y = targetY - ctrlSign * sealR * 0.44 - wave;

    ctx.beginPath();
    ctx.moveTo(sealX, sealY);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, targetX, targetY);
    ctx.strokeStyle =
      q === 0
        ? `rgba(251, 191, 36, ${(0.52 * alpha).toFixed(3)})`
        : `rgba(168, 85, 247, ${(0.48 * alpha).toFixed(3)})`;
    ctx.lineWidth = Math.max(2.2, sealR * 0.16);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 251, 235, ${(0.72 * alpha).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.9, sealR * 0.05);
    ctx.stroke();
  }

  const chainSteps = 20;
  for (let strand = -1; strand <= 1; strand += 2) {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= chainSteps; i++) {
      const t = i / chainSteps;
      const px = sealX + (targetX - sealX) * t;
      const helix =
        Math.sin(t * Math.PI * 4.5 - timeSec * 4.2) *
        sealR *
        0.22 *
        strand *
        Math.sin(t * Math.PI);
      const py = sealY + (targetY - sealY) * t + helix;
      if (Math.hypot(px - bhX, py - bhY) < horizonGuardRadius) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.strokeStyle = `rgba(253, 224, 71, ${(0.88 * alpha).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.2, sealR * 0.065);
    ctx.stroke();
  }

  for (let node = 0; node < 6; node++) {
    const t = (node / 6 + timeSec * 0.42) % 1;
    const bx = sealX + (targetX - sealX) * t;
    const by =
      sealY +
      (targetY - sealY) * t +
      Math.sin(t * Math.PI * 4.5 - timeSec * 4.2) * sealR * 0.2 * Math.sin(t * Math.PI);
    if (Math.hypot(bx - bhX, by - bhY) < horizonGuardRadius) continue;

    const beadAlpha = Math.sin(t * Math.PI) * alpha;
    if (beadAlpha < 0.05) continue;

    ctx.fillStyle = `rgba(255, 255, 255, ${beadAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(bx, by, Math.max(1.6, sealR * 0.085), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(sealX, sealY);
  ctx.rotate(side * -0.14);
  ctx.scale(0.5, 1.0);

  const sealGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, sealR * 1.28);
  sealGlow.addColorStop(0, `rgba(255, 251, 235, ${(0.56 * alpha).toFixed(3)})`);
  sealGlow.addColorStop(0.5, `rgba(245, 158, 11, ${(0.28 * alpha).toFixed(3)})`);
  sealGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sealGlow;
  ctx.beginPath();
  ctx.arc(0, 0, sealR * 1.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(side * timeSec * 0.78);
  ctx.strokeStyle = `rgba(253, 224, 71, ${(0.92 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.4, sealR * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, sealR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 251, 235, ${(0.86 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1, sealR * 0.036);
  ctx.beginPath();
  ctx.arc(0, 0, sealR * 0.74, 0, Math.PI * 2);
  ctx.stroke();

  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const a = (i / 4) * Math.PI * 2 + (pass * Math.PI) / 4;
      const px = Math.cos(a) * sealR * 0.72;
      const py = Math.sin(a) * sealR * 0.72;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

function drawRisingLotusPetalsAndAsh(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bhX: number,
  bhY: number,
  bhRadius: number,
  timeSec: number,
  alpha: number
): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const exclusionRadius = bhRadius * 1.12;

  for (const p of PETAL_ASH_PARTICLES) {
    const progress = (p.phase + timeSec * p.speed) % 1;
    const py = height * (1.04 - progress * 1.08);
    const px =
      p.xFrac * width +
      Math.sin(timeSec * p.swayFreq + p.phase * 12) * p.swayAmp;

    if (Math.hypot(px - bhX, py - bhY) < exclusionRadius) {
      continue;
    }

    const fade = Math.sin(progress * Math.PI);
    const pAlpha = alpha * fade * (p.isPetal ? 0.72 : 0.85);
    if (pAlpha < 0.03) continue;

    if (p.isPetal) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(timeSec * 0.8 + p.phase * 10);
      const len = 5.5 * p.size;
      const wid = 2.6 * p.size;
      ctx.fillStyle = `rgba(253, 224, 71, ${pAlpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(0, -len);
      ctx.quadraticCurveTo(wid, 0, 0, len);
      ctx.quadraticCurveTo(-wid, 0, 0, -len);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = `rgba(254, 243, 199, ${pAlpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.5 * p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draws the back layers of the Endgame Supreme Cultivator:
 * 1) Subtle ambient Emperor Pressure; shockwaves & Fractal Lightning gated by sovereignOpacity
 * 2) Soft God-Rays & burstFlash radial bloom (36-Sword Array replaces the old 2D Bagua rings)
 * 3) Rear 36-Sword 3D Pass (z <= 0) behind Sovereign head & hair
 * 4) Pure-Black Sovereign Silhouette (#000000) during sword orbit/coiling -> smooth True Form Yin/Yang reveal
 * 5) Exact Twin Supernova Eye Flares gated by sovereignOpacity
 */
export function drawSupremeCultivatorBack2D(
  ctx: CanvasRenderingContext2D,
  params: SupremeCultivatorRenderParams
): void {
  if (params.reveal <= 0.01) return;
  const easeReveal = params.reveal * params.reveal * (3 - 2 * params.reveal);
  const layout = computeSovereignArtworkLayout(params);
  const samsara = params.samsara ?? computeSamsaraState(params.timeSec);
  const swordState = params.swordState;

  const trueFormReveal = swordState ? swordState.trueFormReveal : 1;
  const silhouetteOpacity = swordState ? swordState.silhouetteOpacity : 0;
  const godRaysAlpha = swordState ? swordState.trueFormReveal * swordState.lodReveal : easeReveal;
  const sovereignAlpha = swordState ? swordState.sovereignOpacity : easeReveal;
  const burstFlash = swordState ? swordState.burstFlash : 0;
  const ambientAlpha = easeReveal * (0.42 + 0.58 * trueFormReveal);

  ctx.save();
  drawEmperorPressureAndRifts(ctx, params, layout, ambientAlpha, sovereignAlpha);
  drawGodRaysAndBurst(ctx, layout, params.timeSec, godRaysAlpha, burstFlash);

  if (params.onDrawBehindSovereign) {
    params.onDrawBehindSovereign();
  }

  // Pure #000000 Sovereign Silhouette during sword orbit/coiling and outside radial wave edge
  const silhouetteCanvas = getPureSilhouetteCanvas();
  if (silhouetteCanvas && silhouetteOpacity > 0.01 && trueFormReveal < 0.999) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = silhouetteOpacity;
    ctx.drawImage(
      silhouetteCanvas,
      layout.topLeftX,
      layout.topLeftY,
      layout.imgSize,
      layout.imgSize
    );
    ctx.restore();
  }

  // Black-Hole-centered radial gradient bloom reveal (7.2s..8.0s) -> direct full Yin<->Yang Sovereign
  if (trueFormReveal > 0.005) {
    const morphedCanvas = getMorphedSovereignCanvas(samsara.yangBlend, samsara.wipeAngleRad);
    if (morphedCanvas) {
      if (trueFormReveal < 0.995) {
        const radialCanvas = getRadialRevealCanvas();
        const rctx = radialCanvas ? radialCanvas.getContext('2d') : null;
        if (radialCanvas && rctx) {
          rctx.globalCompositeOperation = 'source-over';
          rctx.globalAlpha = 1;
          rctx.clearRect(0, 0, MORPH_SIZE, MORPH_SIZE);
          rctx.drawImage(morphedCanvas, 0, 0, MORPH_SIZE, MORPH_SIZE);

          const cx = MORPH_SIZE * 0.5;
          const cy = MORPH_SIZE * SOVEREIGN_ARTWORK_LANDMARKS.palmCenterY;
          const outerR = (0.06 + 0.99 * trueFormReveal) * MORPH_SIZE;
          const innerR = Math.max(0, outerR - 0.3 * MORPH_SIZE);

          rctx.globalCompositeOperation = 'destination-in';
          const grad = rctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
          grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          rctx.fillStyle = grad;
          rctx.fillRect(0, 0, MORPH_SIZE, MORPH_SIZE);
          rctx.globalCompositeOperation = 'source-over';

          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = swordState ? swordState.lodReveal : easeReveal;
          ctx.drawImage(
            radialCanvas,
            layout.topLeftX,
            layout.topLeftY,
            layout.imgSize,
            layout.imgSize
          );
          ctx.restore();
        }
      } else {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = sovereignAlpha;
        ctx.drawImage(
          morphedCanvas,
          layout.topLeftX,
          layout.topLeftY,
          layout.imgSize,
          layout.imgSize
        );
        ctx.restore();
      }
    } else if (sovereignAlpha > 0.01) {
      drawSoftNebulaFallback(ctx, layout, sovereignAlpha);
    }
  }

  const eyeFlareAlpha = swordState ? Math.max(silhouetteOpacity, sovereignAlpha) : easeReveal;
  const silhouetteIntensity = swordState ? 1 - trueFormReveal : 0;
  drawSupernovaEyeFlares(ctx, layout, params.timeSec, eyeFlareAlpha, silhouetteIntensity);
  ctx.restore();
}

/**
 * Draws the foreground layers of the Endgame Supreme Cultivator framing the Black Hole:
 * Palm Dharma Seals & Golden Dao Chains (strictly gated by sovereignOpacity = 0 during silhouette phase),
 * and Rising Lotus Petals & Ash scaled cleanly with trueFormReveal.
 */
export function drawSupremeCultivatorFront2D(
  ctx: CanvasRenderingContext2D,
  params: SupremeCultivatorRenderParams
): void {
  if (params.reveal <= 0.01) return;
  const easeReveal = params.reveal * params.reveal * (3 - 2 * params.reveal);
  const layout = computeSovereignArtworkLayout(params);
  const swordState = params.swordState;
  const trueFormReveal = swordState ? swordState.trueFormReveal : 1;
  const frontAlpha = swordState ? swordState.sovereignOpacity : easeReveal;
  const ashAlpha = easeReveal * (0.2 + 0.8 * trueFormReveal);

  ctx.save();
  if (frontAlpha > 0.01) {
    drawPalmSealAndDaoChains(ctx, params, layout, -1, frontAlpha);
    drawPalmSealAndDaoChains(ctx, params, layout, 1, frontAlpha);
  }
  drawRisingLotusPetalsAndAsh(
    ctx,
    params.width,
    params.height,
    params.bhX,
    params.bhY,
    params.bhRadius,
    params.timeSec,
    ashAlpha
  );
  ctx.restore();
}
