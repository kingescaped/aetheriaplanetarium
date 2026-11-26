import {
  computePlanetLifecycleState,
  type SamsaraState,
} from '../../utils/samsaraChoreography.ts';
import type { SovereignArtworkLayout } from './supremeCultivatorOverlay2D.ts';

export interface SamsaraPlanetsRenderParams {
  width: number;
  height: number;
  bhX: number;
  bhY: number;
  bhRadius: number;
  layout: SovereignArtworkLayout;
  reveal: number;
  samsara: SamsaraState;
  timeSec: number;
}

interface PlanetPalette {
  core: string;
  mid: string;
  edge: string;
  glow: string;
  ring: string;
}

interface PlanetSeed {
  id: number;
  normX: number;
  normY: number;
  mobileNormX: number;
  mobileNormY: number;
  baseRadius: number;
  hasRing: boolean;
  ringTilt: number;
  yin: PlanetPalette;
  yang: PlanetPalette;
}

export interface PlanetAudioSlot {
  id: number;
  orderFrac: number;
  stereoPan: number;
}

interface ShardTemplate {
  angle: number;
  distMult: number;
  spinSpeed: number;
  sizeMult: number;
}

const PLANET_SEEDS: PlanetSeed[] = [
  {
    id: 0,
    normX: 0.14,
    normY: 0.22,
    mobileNormX: 0.13,
    mobileNormY: 0.17,
    baseRadius: 18,
    hasRing: true,
    ringTilt: -0.35,
    yin: { core: '#6366f1', mid: '#312e81', edge: '#0f172a', glow: '#818cf8', ring: '#fbbf24' },
    yang: { core: '#fffbeb', mid: '#fde68a', edge: '#b45309', glow: '#fef08a', ring: '#f8fafc' },
  },
  {
    id: 1,
    normX: 0.08,
    normY: 0.44,
    mobileNormX: 0.08,
    mobileNormY: 0.34,
    baseRadius: 13,
    hasRing: false,
    ringTilt: 0,
    yin: { core: '#38bdf8', mid: '#0c4a6e', edge: '#020617', glow: '#7dd3fc', ring: '#bae6fd' },
    yang: { core: '#ffffff', mid: '#bae6fd', edge: '#0369a1', glow: '#e0f2fe', ring: '#fde68a' },
  },
  {
    id: 2,
    normX: 0.12,
    normY: 0.67,
    mobileNormX: 0.11,
    mobileNormY: 0.77,
    baseRadius: 20,
    hasRing: true,
    ringTilt: 0.28,
    yin: { core: '#a855f7', mid: '#4c1d95', edge: '#09051a', glow: '#c084fc', ring: '#f59e0b' },
    yang: { core: '#fef9c3', mid: '#f59e0b', edge: '#78350f', glow: '#fde047', ring: '#ffffff' },
  },
  {
    id: 3,
    normX: 0.22,
    normY: 0.86,
    mobileNormX: 0.24,
    mobileNormY: 0.87,
    baseRadius: 14,
    hasRing: false,
    ringTilt: 0,
    yin: { core: '#14b8a6', mid: '#134e4a', edge: '#041214', glow: '#2dd4bf', ring: '#fde68a' },
    yang: { core: '#f0fdfa', mid: '#5eead4', edge: '#0f766e', glow: '#99f6e4', ring: '#fef08a' },
  },
  {
    id: 4,
    normX: 0.25,
    normY: 0.13,
    mobileNormX: 0.24,
    mobileNormY: 0.11,
    baseRadius: 12,
    hasRing: false,
    ringTilt: 0,
    yin: { core: '#f43f5e', mid: '#881337', edge: '#18050d', glow: '#fb7185', ring: '#fde68a' },
    yang: { core: '#fff1f2', mid: '#fda4af', edge: '#be123c', glow: '#fecdd3', ring: '#fef08a' },
  },
  {
    id: 5,
    normX: 0.75,
    normY: 0.13,
    mobileNormX: 0.76,
    mobileNormY: 0.11,
    baseRadius: 12,
    hasRing: false,
    ringTilt: 0,
    yin: { core: '#60a5fa', mid: '#1e3a8a', edge: '#040b24', glow: '#93c5fd', ring: '#fde68a' },
    yang: { core: '#ffffff', mid: '#e0f2fe', edge: '#0284c7', glow: '#bae6fd', ring: '#fde68a' },
  },
  {
    id: 6,
    normX: 0.86,
    normY: 0.23,
    mobileNormX: 0.87,
    mobileNormY: 0.17,
    baseRadius: 19,
    hasRing: true,
    ringTilt: 0.34,
    yin: { core: '#c084fc', mid: '#3b0764', edge: '#0b0316', glow: '#d8b4fe', ring: '#fbbf24' },
    yang: { core: '#fffbeb', mid: '#fbbf24', edge: '#92400e', glow: '#fde68a', ring: '#f8fafc' },
  },
  {
    id: 7,
    normX: 0.92,
    normY: 0.45,
    mobileNormX: 0.92,
    mobileNormY: 0.34,
    baseRadius: 14,
    hasRing: false,
    ringTilt: 0,
    yin: { core: '#2dd4bf', mid: '#115e59', edge: '#031515', glow: '#5eead4', ring: '#fde68a' },
    yang: { core: '#ffffff', mid: '#99f6e4', edge: '#0d9488', glow: '#ccfbf1', ring: '#fef08a' },
  },
  {
    id: 8,
    normX: 0.88,
    normY: 0.68,
    mobileNormX: 0.89,
    mobileNormY: 0.77,
    baseRadius: 21,
    hasRing: true,
    ringTilt: -0.26,
    yin: { core: '#818cf8', mid: '#1e1b4b', edge: '#030712', glow: '#a5b4fc', ring: '#f59e0b' },
    yang: { core: '#fefce8', mid: '#facc15', edge: '#854d0e', glow: '#fef08a', ring: '#ffffff' },
  },
  {
    id: 9,
    normX: 0.78,
    normY: 0.86,
    mobileNormX: 0.76,
    mobileNormY: 0.87,
    baseRadius: 14,
    hasRing: false,
    ringTilt: 0,
    yin: { core: '#fb923c', mid: '#7c2d12', edge: '#1a0702', glow: '#fdba74', ring: '#fde68a' },
    yang: { core: '#fff7ed', mid: '#fdba74', edge: '#c2410c', glow: '#fed7aa', ring: '#ffffff' },
  },
  {
    id: 10,
    normX: 0.35,
    normY: 0.89,
    mobileNormX: 0.38,
    mobileNormY: 0.91,
    baseRadius: 11,
    hasRing: false,
    ringTilt: 0,
    yin: { core: '#38bdf8', mid: '#1e3a8a', edge: '#030712', glow: '#7dd3fc', ring: '#fde68a' },
    yang: { core: '#ffffff', mid: '#bae6fd', edge: '#0284c7', glow: '#e0f2fe', ring: '#fde68a' },
  },
  {
    id: 11,
    normX: 0.65,
    normY: 0.89,
    mobileNormX: 0.62,
    mobileNormY: 0.91,
    baseRadius: 11,
    hasRing: false,
    ringTilt: 0,
    yin: { core: '#e879f9', mid: '#701a75', edge: '#140318', glow: '#f0abfc', ring: '#fde68a' },
    yang: { core: '#fdf4ff', mid: '#f5d0fe', edge: '#a21caf', glow: '#fae8ff', ring: '#ffffff' },
  },
];

export const PLANET_AUDIO_SLOTS: readonly PlanetAudioSlot[] = PLANET_SEEDS.map((s) => ({
  id: s.id,
  orderFrac: s.id / PLANET_SEEDS.length,
  stereoPan: Math.max(-0.85, Math.min(0.85, (s.normX - 0.5) * 1.85)),
}));

// Pre-allocated fixed 8 shards per planet (zero per-frame allocations)
const SHARD_TEMPLATES: ShardTemplate[] = Array.from({ length: 8 }, (_, i) => ({
  angle: (i / 8) * Math.PI * 2 + (i % 2) * 0.18,
  distMult: 1.55 + (i % 3) * 0.65,
  spinSpeed: (i % 2 === 0 ? 1 : -1) * (2.6 + (i % 4) * 0.7),
  sizeMult: 0.24 + (i % 3) * 0.08,
}));

const CACHED_YIN_SPRITES: (HTMLCanvasElement | null)[] = new Array(PLANET_SEEDS.length).fill(null);
const CACHED_YANG_SPRITES: (HTMLCanvasElement | null)[] = new Array(PLANET_SEEDS.length).fill(null);

function createPlanetSprite(seed: PlanetSeed, isYang: boolean): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const half = size / 2;
  const pal = isYang ? seed.yang : seed.yin;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const sphereR = seed.hasRing ? 13 : 16;

  const halo = ctx.createRadialGradient(half, half, sphereR * 0.4, half, half, half);
  halo.addColorStop(0, `${pal.glow}66`);
  halo.addColorStop(0.5, `${pal.glow}22`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(half, half, half, 0, Math.PI * 2);
  ctx.fill();

  if (seed.hasRing) {
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(seed.ringTilt);
    ctx.strokeStyle = pal.ring;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, sphereR * 1.92, sphereR * 0.55, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const sphereGrad = ctx.createRadialGradient(
    half - sphereR * 0.38,
    half - sphereR * 0.38,
    sphereR * 0.1,
    half,
    half,
    sphereR
  );
  sphereGrad.addColorStop(0, pal.core);
  sphereGrad.addColorStop(0.55, pal.mid);
  sphereGrad.addColorStop(1, pal.edge);

  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(half, half, sphereR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isYang ? 'rgba(255, 255, 255, 0.7)' : 'rgba(253, 224, 71, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (seed.hasRing) {
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(seed.ringTilt);
    ctx.strokeStyle = pal.ring;
    ctx.globalAlpha = 0.88;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, sphereR * 1.92, sphereR * 0.55, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  return canvas;
}

function getPlanetSprite(seed: PlanetSeed, polarity: number): HTMLCanvasElement | null {
  const isYang = polarity === 1;
  const cache = isYang ? CACHED_YANG_SPRITES : CACHED_YIN_SPRITES;
  if (!cache[seed.id]) {
    cache[seed.id] = createPlanetSprite(seed, isYang);
  }
  return cache[seed.id];
}

function computePlanetScreenPosition(
  seed: PlanetSeed,
  params: SamsaraPlanetsRenderParams
): { x: number; y: number; radius: number } {
  const { width, height, bhX, bhY, bhRadius, layout } = params;
  const isMobile = width < 640;
  const nx = isMobile ? seed.mobileNormX : seed.normX;
  const ny = isMobile ? seed.mobileNormY : seed.normY;

  let x = nx * width;
  let y = ny * height;

  const exclRadius = Math.max(bhRadius * 2.55, layout.imgSize * (isMobile ? 0.34 : 0.42));
  const dx = x - bhX;
  const dy = y - (bhY - layout.imgSize * 0.12);
  const dist = Math.hypot(dx, dy) || 1;
  if (dist < exclRadius) {
    const push = exclRadius - dist;
    x += (dx / dist) * push;
    y += (dy / dist) * push;
  }

  const radius = seed.baseRadius * (isMobile ? 0.64 : Math.min(1.15, width / 1280));
  const padX = radius * 2.1;
  const minY = isMobile ? 54 + radius : 66 + radius;
  const maxY = isMobile ? height - 66 - radius : height - 28 - radius;

  x = Math.max(padX, Math.min(width - padX, x));
  y = Math.max(minY, Math.min(maxY, y));

  return { x, y, radius };
}

function smoothstepEdge(edge0: number, edge1: number, x: number): number {
  const span = edge1 - edge0;
  const t = span > 1e-6 ? Math.max(0, Math.min(1, (x - edge0) / span)) : x >= edge1 ? 1 : 0;
  return t * t * (3 - 2 * t);
}

/**
 * Draws 12 celestial Yin/Yang planets & stars across surrounding outer space,
 * cycling strictly forward through fracturing -> shattering -> Qi absorption -> rebirth
 * synced to every 5s hold -> 2s turn, blooming radially outward from (bhX, bhY).
 */
export function drawSamsaraPlanets2D(
  ctx: CanvasRenderingContext2D,
  params: SamsaraPlanetsRenderParams
): void {
  const { reveal, samsara, timeSec, width, height, bhX, bhY } = params;
  if (reveal <= 0.005) return;

  const safeReveal = Math.max(0, Math.min(1, reveal));
  const revealFront = -0.10 + 1.32 * safeReveal;
  const maxCornerDist = Math.max(1, Math.hypot(width * 0.5, height * 0.5));

  ctx.save();
  for (let i = 0; i < PLANET_SEEDS.length; i++) {
    const seed = PLANET_SEEDS[i];
    const life = computePlanetLifecycleState(samsara, seed.id / PLANET_SEEDS.length);
    const pos = computePlanetScreenPosition(seed, params);

    const floatOffset = Math.sin(timeSec * 0.9 + seed.id * 1.4) * 3.5;
    const tremorX =
      life.tremorAmplitude > 0
        ? Math.sin(timeSec * 46 + seed.id) * life.tremorAmplitude * 2.4
        : 0;
    const tremorY =
      life.tremorAmplitude > 0
        ? Math.cos(timeSec * 52 + seed.id * 2) * life.tremorAmplitude * 2.4
        : 0;

    const px = pos.x + tremorX;
    const py = pos.y + floatOffset + tremorY;
    const r = pos.radius;

    const normDist = Math.hypot(px - bhX, py - bhY) / maxCornerDist;
    const planetAlpha =
      safeReveal >= 0.999 ? 1 : 1 - smoothstepEdge(revealFront - 0.20, revealFront + 0.02, normDist);
    if (planetAlpha <= 0.01) continue;

    const sprite = getPlanetSprite(seed, life.realmPolarity);
    if (sprite && life.coreScale > 0.05) {
      const drawSize = r * 4 * life.coreScale;
      ctx.save();
      ctx.globalAlpha = planetAlpha * (life.phase === 'shattering' ? 0.65 : 0.95);
      ctx.drawImage(sprite, px - drawSize * 0.5, py - drawSize * 0.5, drawSize, drawSize);
      ctx.restore();
    }

    if (life.crackGlow > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(254, 240, 138, ${(life.crackGlow * planetAlpha * 0.95).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      for (let c = 0; c < 4; c++) {
        const ca = (c / 4) * Math.PI * 2 + seed.id;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(
          px + Math.cos(ca + 0.25) * r * 0.55,
          py + Math.sin(ca + 0.25) * r * 0.55
        );
        ctx.lineTo(px + Math.cos(ca) * r * 0.98, py + Math.sin(ca) * r * 0.98);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (life.shatterExpand > 0.02 || life.absorbPull > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      if (life.phase === 'shattering') {
        const waveR = r * (0.9 + life.shatterExpand * 2.4);
        const waveAlpha = (1 - life.shatterExpand) * planetAlpha * 0.78;
        ctx.strokeStyle = `rgba(253, 224, 71, ${waveAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(px, py, waveR, 0, Math.PI * 2);
        ctx.stroke();
      }

      const nextPal = life.nextPolarity === 1 ? seed.yang : seed.yin;
      for (let s = 0; s < SHARD_TEMPLATES.length; s++) {
        const tmpl = SHARD_TEMPLATES[s];
        const radialDist = r * tmpl.distMult * life.shatterExpand;
        const spiralTwist = life.absorbPull * 2.4;
        const sa = tmpl.angle + spiralTwist + timeSec * tmpl.spinSpeed * 0.25;
        const sx = px + Math.cos(sa) * radialDist;
        const sy = py + Math.sin(sa) * radialDist;
        const shardR = r * tmpl.sizeMult * (1 - life.absorbPull * 0.55);

        if (life.absorbPull > 0.04) {
          ctx.strokeStyle = `rgba(196, 181, 253, ${(life.absorbPull * planetAlpha * 0.65).toFixed(3)})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(
            px + Math.cos(sa + 0.55) * radialDist * 0.55,
            py + Math.sin(sa + 0.55) * radialDist * 0.55,
            px,
            py
          );
          ctx.stroke();
        }

        ctx.fillStyle = life.absorbPull > 0.45 ? nextPal.glow : '#fde68a';
        ctx.globalAlpha = planetAlpha * (0.9 - life.absorbPull * 0.35);
        ctx.beginPath();
        ctx.moveTo(sx, sy - shardR);
        ctx.lineTo(sx + shardR * 0.75, sy);
        ctx.lineTo(sx, sy + shardR);
        ctx.lineTo(sx - shardR * 0.75, sy);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    if (life.rebirthFlash > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const flashR = r * (1.8 + life.rebirthFlash * 1.4);
      const flashGrad = ctx.createRadialGradient(px, py, 0, px, py, flashR);
      flashGrad.addColorStop(
        0,
        `rgba(255, 255, 255, ${(life.rebirthFlash * planetAlpha * 0.85).toFixed(3)})`
      );
      flashGrad.addColorStop(
        0.45,
        life.nextPolarity === 1
          ? `rgba(186, 230, 253, ${(life.rebirthFlash * planetAlpha * 0.45).toFixed(3)})`
          : `rgba(253, 224, 71, ${(life.rebirthFlash * planetAlpha * 0.45).toFixed(3)})`
      );
      flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(px, py, flashR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}
