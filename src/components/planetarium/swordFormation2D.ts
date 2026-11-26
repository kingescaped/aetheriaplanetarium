import {
  SWORD_TIER_COUNT,
  SWORD_TOTAL_COUNT,
  type SamsaraState,
  type SwordFormationState,
} from '../../utils/samsaraChoreography.ts';
import type { SovereignArtworkLayout } from './supremeCultivatorOverlay2D.ts';

export const SWORD_TRAIL_POINTS = 14;
const SWORD_STRAND_LAG_SEC = 0.088;
const TRAIL_TIME_STEP_SEC = 0.022;

export interface SwordTrailPoint {
  x: number;
  y: number;
  z: number;
}

export interface FlyingSwordPose {
  index: number;
  tier: 1 | 2;
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  rollRad: number;
  scale: number;
  glowIntensity: number;
  trail: SwordTrailPoint[];
}

export interface SwordFormationComputeParams {
  width: number;
  height: number;
  bhX: number;
  bhY: number;
  bhRadius: number;
  layout: SovereignArtworkLayout;
  swordState: SwordFormationState;
  samsara: SamsaraState;
  timeSec: number;
}

// Pre-allocated pools (zero per-frame heap allocations)
export const SHARED_SWORD_POOL: FlyingSwordPose[] = Array.from(
  { length: SWORD_TOTAL_COUNT },
  (_, index) => ({
    index,
    tier: index < SWORD_TIER_COUNT ? 1 : 2,
    x: 0,
    y: 0,
    z: 0,
    dirX: 0,
    dirY: -1,
    dirZ: 0,
    rollRad: 0,
    scale: 60,
    glowIntensity: 1,
    trail: Array.from({ length: SWORD_TRAIL_POINTS }, () => ({ x: 0, y: 0, z: 0 })),
  })
);

const TMP_FLIGHT_NOW = { x: 0, y: 0, z: 0 };
const TMP_FLIGHT_PREV = { x: 0, y: 0, z: 0 };
const TMP_TRAIL_POS = { x: 0, y: 0, z: 0 };

function clamp01(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function smoothstep01(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleSwordFlightPos(
  sampleTimeSec: number,
  strand: number,
  params: SwordFormationComputeParams,
  outPos: { x: number; y: number; z: number }
): void {
  const { bhX, bhY, bhRadius, layout } = params;
  const imgSize = layout.imgSize;

  const tilt = -0.22 + (strand - 1) * 0.08;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const phaseOffset = (strand / 3) * (Math.PI * 0.28);

  const bhRx = bhRadius * (2.0 + strand * 0.3);
  const bhRy = bhRadius * (0.64 + strand * 0.14);

  if (sampleTimeSec <= 3.2) {
    // 0..3.2s: 2 full tilted 3D braided loops around Black Hole (0 -> 4*PI)
    const theta = (sampleTimeSec / 3.2) * Math.PI * 4 + phaseOffset;
    const lx = Math.sin(theta) * bhRx;
    const ly = Math.cos(theta) * bhRy;
    outPos.x = bhX + lx * cosT - ly * sinT;
    outPos.y = bhY + lx * sinT + ly * cosT;
    outPos.z = Math.cos(theta);
    return;
  }

  // >= 3.2s: continuous 2 ascending helical loops around Sovereign (#000000 silhouette)
  const dt = sampleTimeSec - 3.2;
  const coilT = clamp01(dt / 3.2);
  const theta = Math.PI * 4 + (dt / 3.2) * Math.PI * 4 + phaseOffset;
  const ascendBlend = smoothstep01(dt / 0.45);

  const lowTorsoY = bhY - imgSize * 0.04;
  const crownY = layout.haloY - imgSize * 0.02;

  const helixRx = imgSize * lerp(0.31 + strand * 0.045, 0.25 + strand * 0.03, coilT);
  const helixRy = imgSize * (0.068 + strand * 0.012);

  const rx = lerp(bhRx, helixRx, ascendBlend);
  const ry = lerp(bhRy, helixRy, ascendBlend);
  const centerY = lerp(bhY, lerp(lowTorsoY, crownY, coilT), ascendBlend);

  const lx = Math.sin(theta) * rx;
  const ly = Math.cos(theta) * ry;
  const curCos = lerp(cosT, 1, ascendBlend);
  const curSin = lerp(sinT, 0, ascendBlend);

  outPos.x = bhX + lx * curCos - ly * curSin;
  outPos.y = centerY + lx * curSin + ly * curCos;
  outPos.z = Math.cos(theta);
}

/**
 * Computes all 36 Jian poses + 14-point speed trails for the
 * Thanh Truc Phong Van Kiem Tran Sword Formation (zero heap allocations).
 */
export function computeSwordFormationPoses(
  params: SwordFormationComputeParams,
  outPoses: FlyingSwordPose[] = SHARED_SWORD_POOL
): FlyingSwordPose[] {
  const { layout, swordState, timeSec } = params;
  const expand = swordState.arrayExpandBlend;
  const isHaloStage = swordState.stage === 'sword_halo';
  const depthScale = Math.max(135, Math.min(270, layout.imgSize * 0.45));
  const flightBladeLen = Math.max(44, Math.min(82, layout.imgSize * 0.165));
  const tier1HaloLen = layout.haloR * 0.62;
  const tier2HaloLen = layout.haloR * 0.84;

  for (let i = 0; i < SWORD_TOTAL_COUNT; i++) {
    const pose = outPoses[i];
    const isInner = i < SWORD_TIER_COUNT;
    const tier: 1 | 2 = isInner ? 1 : 2;
    pose.index = i;
    pose.tier = tier;

    const strand = i % 3;
    const rank = Math.floor(i / 3);
    const sampleT = swordState.elapsedSec - rank * SWORD_STRAND_LAG_SEC;

    // 1. Halo concentric ring target behind Sovereign (z < 0, screen CW angle convention)
    const theta = isInner
      ? (i / SWORD_TIER_COUNT) * Math.PI * 2 + swordState.innerTierAngleRad
      : ((i - SWORD_TIER_COUNT + 0.5) / SWORD_TIER_COUNT) * Math.PI * 2 +
        swordState.outerTierAngleRad;
    const sinA = Math.sin(theta);
    const cosA = Math.cos(theta);
    const r = isInner ? layout.haloR * 0.78 : layout.haloR * 1.18;
    const haloPosX = layout.haloX + sinA * r;
    const haloPosY = layout.haloY - cosA * r;
    const haloPosZ = isInner ? -0.34 : -0.46;
    const haloDirX = sinA;
    const haloDirY = -cosA;
    const haloDirZ = isInner ? 0.02 : -0.02;

    if (expand >= 0.999 || isHaloStage) {
      pose.x = haloPosX;
      pose.y = haloPosY;
      pose.z = haloPosZ;
      const dLen = Math.hypot(haloDirX, haloDirY, haloDirZ) || 1;
      pose.dirX = haloDirX / dLen;
      pose.dirY = haloDirY / dLen;
      pose.dirZ = haloDirZ / dLen;
      pose.rollRad = 0;
      pose.scale = isInner ? tier1HaloLen : tier2HaloLen;
      pose.glowIntensity = 0.85 + 0.15 * Math.sin(timeSec * 3.2 + i * 0.5) + swordState.burstFlash * 0.6;

      // Circular speed-wake arc trails behind each rotating sword guard
      const trailDir = isInner ? 1 : -1; // Tier 1 moves CW (+theta), Tier 2 moves CCW (-theta)
      for (let tIdx = 0; tIdx < SWORD_TRAIL_POINTS; tIdx++) {
        const arcAngle = theta - trailDir * tIdx * 0.045;
        const tp = pose.trail[tIdx];
        tp.x = layout.haloX + Math.sin(arcAngle) * r;
        tp.y = layout.haloY - Math.cos(arcAngle) * r;
        tp.z = haloPosZ;
      }
      continue;
    }

    // 2. Swarm flight position & forward tangent
    sampleSwordFlightPos(sampleT, strand, params, TMP_FLIGHT_NOW);
    sampleSwordFlightPos(sampleT - 0.03, strand, params, TMP_FLIGHT_PREV);

    const rawDx = TMP_FLIGHT_NOW.x - TMP_FLIGHT_PREV.x;
    const rawDy = TMP_FLIGHT_NOW.y - TMP_FLIGHT_PREV.y;
    const rawDz = (TMP_FLIGHT_NOW.z - TMP_FLIGHT_PREV.z) * depthScale * 0.28;
    const rawLen = Math.hypot(rawDx, rawDy, rawDz) || 1;
    const flightDirX = rawDx / rawLen;
    const flightDirY = rawDy / rawLen;
    const flightDirZ = rawDz / rawLen;

    const blendX = lerp(TMP_FLIGHT_NOW.x, haloPosX, expand);
    const blendY = lerp(TMP_FLIGHT_NOW.y, haloPosY, expand);
    const blendZ = lerp(TMP_FLIGHT_NOW.z, haloPosZ, expand);

    pose.x = blendX;
    pose.y = blendY;
    pose.z = expand > 0.001 ? Math.min(blendZ, lerp(TMP_FLIGHT_NOW.z, -0.34, expand)) : blendZ;

    const dirX = lerp(flightDirX, haloDirX, expand);
    const dirY = lerp(flightDirY, haloDirY, expand);
    const dirZ = lerp(flightDirZ, haloDirZ, expand);
    const dirLen = Math.hypot(dirX, dirY, dirZ) || 1;
    pose.dirX = dirX / dirLen;
    pose.dirY = dirY / dirLen;
    pose.dirZ = dirZ / dirLen;

    const flightRoll = timeSec * (1.25 + (strand - 1) * 0.42) + i * 0.35;
    pose.rollRad = flightRoll * (1 - expand);
    pose.scale = lerp(flightBladeLen, isInner ? tier1HaloLen : tier2HaloLen, expand);
    pose.glowIntensity = 0.8 + 0.2 * Math.sin(timeSec * 4.2 + i * 0.7) + swordState.burstFlash * 0.6;

    const trailDir = isInner ? 1 : -1;
    for (let tIdx = 0; tIdx < SWORD_TRAIL_POINTS; tIdx++) {
      sampleSwordFlightPos(sampleT - tIdx * TRAIL_TIME_STEP_SEC, strand, params, TMP_TRAIL_POS);
      const tp = pose.trail[tIdx];
      if (expand <= 0.001) {
        tp.x = TMP_TRAIL_POS.x;
        tp.y = TMP_TRAIL_POS.y;
        tp.z = TMP_TRAIL_POS.z;
      } else {
        const arcAngle = theta - trailDir * tIdx * 0.045;
        const hx = layout.haloX + Math.sin(arcAngle) * r;
        const hy = layout.haloY - Math.cos(arcAngle) * r;
        tp.x = lerp(TMP_TRAIL_POS.x, hx, expand);
        tp.y = lerp(TMP_TRAIL_POS.y, hy, expand);
        tp.z = lerp(TMP_TRAIL_POS.z, haloPosZ, expand);
      }
    }
  }

  return outPoses;
}

// Lightweight 2D Canvas fallback strictly used if WebGL fails to initialize (zero shadow blur)
function drawSwordFormation2DFallbackPass(
  ctx: CanvasRenderingContext2D,
  poses: FlyingSwordPose[],
  swordState: SwordFormationState,
  drawBackHalf: boolean
): void {
  const alpha = swordState.swordOpacity;
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < poses.length; i++) {
    const p = poses[i];
    const isBack = p.z <= 0;
    if (isBack !== drawBackHalf) continue;

    // 1. Speed-wake Sword-Qi ribbon (White-Gold)
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    for (let tIdx = 1; tIdx < p.trail.length; tIdx++) {
      ctx.lineTo(p.trail[tIdx].x, p.trail[tIdx].y);
    }
    ctx.strokeStyle = `rgba(254, 240, 138, ${(alpha * 0.52).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.5, p.scale * 0.055);
    ctx.stroke();

    // 2. Pearlescent White-Gold diamond Jian blade extending outward along (dirX, dirY) from guard anchor
    const angle = Math.atan2(p.dirY, p.dirX);
    const len = p.scale;
    const halfW = Math.max(2.0, len * 0.068);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);

    // 24K Gold Hilt behind guard
    ctx.strokeStyle = `rgba(251, 191, 36, ${(alpha * 0.95).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.6, halfW * 0.72);
    ctx.beginPath();
    ctx.moveTo(-len * 0.22, 0);
    ctx.lineTo(0, 0);
    ctx.moveTo(0, -halfW * 1.9);
    ctx.lineTo(0, halfW * 1.9);
    ctx.stroke();

    // Pearlescent White diamond blade with 24K gold bevel rim
    ctx.fillStyle = `rgba(255, 254, 245, ${(alpha * 0.94).toFixed(3)})`;
    ctx.strokeStyle = `rgba(253, 224, 71, ${(alpha * 0.96).toFixed(3)})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, -halfW);
    ctx.lineTo(len * 0.76, -halfW * 0.65);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.76, halfW * 0.65);
    ctx.lineTo(0, halfW);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

export function drawSwordFormationBack2D(
  ctx: CanvasRenderingContext2D,
  poses: FlyingSwordPose[],
  swordState: SwordFormationState,
  _samsara: SamsaraState,
  _timeSec: number
): void {
  drawSwordFormation2DFallbackPass(ctx, poses, swordState, true);
}

export function drawSwordFormationFront2D(
  ctx: CanvasRenderingContext2D,
  poses: FlyingSwordPose[],
  swordState: SwordFormationState,
  _samsara: SamsaraState,
  _timeSec: number
): void {
  drawSwordFormation2DFallbackPass(ctx, poses, swordState, false);
}
