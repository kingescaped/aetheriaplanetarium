export const SAMSARA_HOLD_DURATION_SEC = 5.0;
export const SAMSARA_TURN_DURATION_SEC = 2.0;
export const SAMSARA_HALF_DURATION_SEC = 7.0;
export const SAMSARA_CYCLE_DURATION_SEC = 14.0;
export const SOVEREIGN_REVEAL_START_SEC = 7.2;
export const SAMSARA_REVEAL_DELAY_SEC = 0.5;
export const SAMSARA_REVEAL_START_SEC =
  SOVEREIGN_REVEAL_START_SEC + SAMSARA_REVEAL_DELAY_SEC;

export const SWORD_TIER_COUNT = 18;
export const SWORD_TOTAL_COUNT = 36;

export function computeSamsaraClockSec(elapsedSec: number): number {
  return Math.max(
    0,
    (Number.isFinite(elapsedSec) ? elapsedSec : 0) - SAMSARA_REVEAL_START_SEC
  );
}

export type SamsaraPhase =
  | 'hold_white_top'
  | 'turning_cw'
  | 'hold_dark_top'
  | 'turning_ccw';

export interface SamsaraState {
  angleRad: number;
  halfIndex: number;
  halfProgress: number;
  yangBlend: number;
  wipeAngleRad: number;
  phase: SamsaraPhase;
  topRealm: 'white' | 'dark';
  turnDirection: -1 | 0 | 1;
  isTurning: boolean;
  turnProgress: number;
  halfElapsedSec: number;
}

export type SwordFormationStage =
  | 'blackhole_orbit'
  | 'sovereign_coil'
  | 'array_expand'
  | 'sword_halo';

export interface SwordFormationState {
  stage: SwordFormationStage;
  elapsedSec: number;
  lodReveal: number;
  orbitAngleRad: number;
  stageProgress: number;
  swordOpacity: number;
  arrayExpandBlend: number;
  arrayRingOpacity: number;
  trueFormReveal: number;
  silhouetteOpacity: number;
  sovereignOpacity: number;
  samsaraOpacity: number;
  burstFlash: number;
  innerTierAngleRad: number;
  outerTierAngleRad: number;
}

export type PlanetLifecyclePhase =
  | 'stable'
  | 'fracturing'
  | 'shattering'
  | 'absorbing'
  | 'reborn';

export interface PlanetLifecycleState {
  phase: PlanetLifecyclePhase;
  phaseProgress: number;
  cycleProgress: number;
  realmPolarity: number;
  nextPolarity: number;
  tremorAmplitude: number;
  crackGlow: number;
  shatterExpand: number;
  absorbPull: number;
  coreScale: number;
  rebirthFlash: number;
}

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

export function smootherstep(t: number): number {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Computes the 14s Samsara Taiji state (7s per half-turn: 5s hold + 2s alternating CW/CCW 180° turn):
 * - Even half (0..7s):  0..5s holds White TOP (angleRad=0, yangBlend=0); 5..7s turns CW 0->PI (yangBlend 0->1)
 * - Odd half  (7..14s): 0..5s holds Dark-Gold TOP (angleRad=PI, yangBlend=1); 5..7s turns CCW PI->0 (yangBlend 1->0)
 */
export function computeSamsaraState(timeSec: number): SamsaraState {
  const safeTime = Number.isFinite(timeSec) ? timeSec : 0;
  const halfIndex = Math.floor(safeTime / SAMSARA_HALF_DURATION_SEC);
  const halfElapsedSec = Math.max(
    0,
    Math.min(SAMSARA_HALF_DURATION_SEC, safeTime - halfIndex * SAMSARA_HALF_DURATION_SEC)
  );
  const halfProgress = halfElapsedSec / SAMSARA_HALF_DURATION_SEC;
  const isOddHalf = ((halfIndex % 2) + 2) % 2 === 1;

  let phase: SamsaraPhase;
  let topRealm: 'white' | 'dark';
  let turnDirection: -1 | 0 | 1;
  let isTurning: boolean;
  let turnProgress: number;
  let angleRad: number;
  let yangBlend: number;

  if (!isOddHalf) {
    if (halfElapsedSec < SAMSARA_HOLD_DURATION_SEC) {
      phase = 'hold_white_top';
      topRealm = 'white';
      turnDirection = 0;
      isTurning = false;
      turnProgress = 0;
      angleRad = 0;
      yangBlend = 0;
    } else {
      turnProgress = clamp01(
        (halfElapsedSec - SAMSARA_HOLD_DURATION_SEC) / SAMSARA_TURN_DURATION_SEC
      );
      const eased = smootherstep(turnProgress);
      phase = 'turning_cw';
      topRealm = eased < 0.5 ? 'white' : 'dark';
      turnDirection = 1;
      isTurning = true;
      angleRad = eased * Math.PI;
      yangBlend = eased;
    }
  } else if (halfElapsedSec < SAMSARA_HOLD_DURATION_SEC) {
    phase = 'hold_dark_top';
    topRealm = 'dark';
    turnDirection = 0;
    isTurning = false;
    turnProgress = 0;
    angleRad = Math.PI;
    yangBlend = 1;
  } else {
    turnProgress = clamp01(
      (halfElapsedSec - SAMSARA_HOLD_DURATION_SEC) / SAMSARA_TURN_DURATION_SEC
    );
    const eased = smootherstep(turnProgress);
    phase = 'turning_ccw';
    topRealm = eased < 0.5 ? 'dark' : 'white';
    turnDirection = -1;
    isTurning = true;
    angleRad = (1 - eased) * Math.PI;
    yangBlend = 1 - eased;
  }

  return {
    angleRad,
    halfIndex,
    halfProgress,
    yangBlend,
    wipeAngleRad: angleRad + Math.PI * 0.5,
    phase,
    topRealm,
    turnDirection,
    isTurning,
    turnProgress,
    halfElapsedSec,
  };
}

/**
 * Computes the 36-Sword Thanh Truc Phong Van Kiem Tran Formation & Pure-Black Silhouette Choreography:
 * - 0.0..3.2s ('blackhole_orbit'): 36 swords weave 2 loops around Black Hole, pure #000000 silhouette, trueFormReveal = 0
 * - 3.2..6.4s ('sovereign_coil'):  36 swords spiral 2 ascending helical loops around #000000 silhouette, trueFormReveal = 0
 * - 6.4..7.6s ('array_expand'):    Swords blossom behind crown into counter-rotating 2-tier Lotus Wheel; trueFormReveal 0->1 across 7.2..8.0s
 * - >= 7.6s   ('sword_halo'):      Inner 18 rotate CW, outer 18 rotate CCW behind Sovereign head/hair
 */
export function computeSwordFormationState(
  elapsedSec: number,
  lodReveal: number
): SwordFormationState {
  const safeLod = clamp01(lodReveal);
  const safeElapsed = Math.max(0, Number.isFinite(elapsedSec) ? elapsedSec : 0);

  if (safeLod <= 0.001) {
    return {
      stage: 'blackhole_orbit',
      elapsedSec: safeElapsed,
      lodReveal: 0,
      orbitAngleRad: 0,
      stageProgress: 0,
      swordOpacity: 0,
      arrayExpandBlend: 0,
      arrayRingOpacity: 0,
      trueFormReveal: 0,
      silhouetteOpacity: 0,
      sovereignOpacity: 0,
      samsaraOpacity: 0,
      burstFlash: 0,
      innerTierAngleRad: 0,
      outerTierAngleRad: 0,
    };
  }

  const swordOpacity = smoothstep01(safeElapsed / 0.35) * safeLod;
  const arrayExpandBlend =
    safeElapsed < 6.4
      ? 0
      : safeElapsed < 7.6
        ? smootherstep((safeElapsed - 6.4) / 1.2)
        : 1;
  const arrayRingOpacity = smoothstep01((safeElapsed - 6.8) / 0.8) * safeLod;
  const trueFormReveal =
    safeElapsed <= SOVEREIGN_REVEAL_START_SEC
      ? 0
      : safeElapsed < 8.0
        ? smoothstep01((safeElapsed - SOVEREIGN_REVEAL_START_SEC) / 0.8)
        : 1;
  const sovereignOpacity = trueFormReveal * safeLod;
  const samsaraReveal =
    safeElapsed <= SAMSARA_REVEAL_START_SEC
      ? 0
      : safeElapsed < 8.5
        ? smoothstep01((safeElapsed - SAMSARA_REVEAL_START_SEC) / 0.8)
        : 1;
  const samsaraOpacity = samsaraReveal * safeLod;

  const flashPhase = (safeElapsed - 7.2) / 1.0;
  const burstFlash =
    flashPhase > 0 && flashPhase < 1
      ? Math.pow(Math.sin(flashPhase * Math.PI), 1.4) * safeLod
      : 0;

  const spinAge = Math.max(0, safeElapsed - 6.4);
  const innerTierAngleRad = spinAge * 0.44;
  const outerTierAngleRad = -spinAge * 0.32;

  if (safeElapsed < 3.2) {
    const stageProgress = clamp01(safeElapsed / 3.2);
    return {
      stage: 'blackhole_orbit',
      elapsedSec: safeElapsed,
      lodReveal: safeLod,
      orbitAngleRad: stageProgress * Math.PI * 4,
      stageProgress,
      swordOpacity,
      arrayExpandBlend: 0,
      arrayRingOpacity: 0,
      trueFormReveal: 0,
      silhouetteOpacity: (0.35 + 0.65 * smoothstep01(safeElapsed / 2.2)) * safeLod,
      sovereignOpacity: 0,
      samsaraOpacity: 0,
      burstFlash: 0,
      innerTierAngleRad: 0,
      outerTierAngleRad: 0,
    };
  }

  if (safeElapsed < 6.4) {
    const stageProgress = clamp01((safeElapsed - 3.2) / 3.2);
    return {
      stage: 'sovereign_coil',
      elapsedSec: safeElapsed,
      lodReveal: safeLod,
      orbitAngleRad: Math.PI * 4 + stageProgress * Math.PI * 4,
      stageProgress,
      swordOpacity,
      arrayExpandBlend: 0,
      arrayRingOpacity: 0,
      trueFormReveal: 0,
      silhouetteOpacity: safeLod,
      sovereignOpacity: 0,
      samsaraOpacity: 0,
      burstFlash: 0,
      innerTierAngleRad: 0,
      outerTierAngleRad: 0,
    };
  }

  if (safeElapsed < 7.6) {
    const stageProgress = clamp01((safeElapsed - 6.4) / 1.2);
    return {
      stage: 'array_expand',
      elapsedSec: safeElapsed,
      lodReveal: safeLod,
      orbitAngleRad: Math.PI * 8 + stageProgress * Math.PI * 0.6,
      stageProgress,
      swordOpacity,
      arrayExpandBlend,
      arrayRingOpacity,
      trueFormReveal,
      silhouetteOpacity: safeLod,
      sovereignOpacity,
      samsaraOpacity: 0,
      burstFlash,
      innerTierAngleRad,
      outerTierAngleRad,
    };
  }

  return {
    stage: 'sword_halo',
    elapsedSec: safeElapsed,
    lodReveal: safeLod,
    orbitAngleRad: Math.PI * 8.6,
    stageProgress: clamp01((safeElapsed - 7.6) / 1.0),
    swordOpacity,
    arrayExpandBlend: 1,
    arrayRingOpacity,
    trueFormReveal,
    silhouetteOpacity: safeLod,
    sovereignOpacity,
    samsaraOpacity,
    burstFlash,
    innerTierAngleRad,
    outerTierAngleRad,
  };
}

/**
 * Computes strictly forward-only planet destruction & rebirth lifecycle synced to every 5s hold -> 2s turn.
 * Runs forward (fracturing -> shattering -> absorbing -> reborn) on BOTH CW and CCW turns!
 */
export function computePlanetLifecycleState(
  samsara: SamsaraState,
  planetOrderFrac: number
): PlanetLifecycleState {
  const currentPolarity = ((samsara.halfIndex % 2) + 2) % 2;
  const nextPolarity = 1 - currentPolarity;
  const isReverseSweepHalf =
    samsara.turnDirection < 0 || (samsara.turnDirection === 0 && currentPolarity === 1);
  const effectiveOrder = isReverseSweepHalf
    ? 1 - clamp01(planetOrderFrac)
    : clamp01(planetOrderFrac);

  const windowStart = 4.4 + effectiveOrder * 0.45;
  const windowDur = 2.15;
  const t = samsara.halfElapsedSec;

  if (t < windowStart) {
    return {
      phase: 'stable',
      phaseProgress: clamp01(t / windowStart),
      cycleProgress: samsara.halfProgress,
      realmPolarity: currentPolarity,
      nextPolarity,
      tremorAmplitude: 0,
      crackGlow: 0,
      shatterExpand: 0,
      absorbPull: 0,
      coreScale: 1,
      rebirthFlash: 0,
    };
  }

  if (t >= windowStart + windowDur) {
    return {
      phase: 'stable',
      phaseProgress: 1,
      cycleProgress: samsara.halfProgress,
      realmPolarity: nextPolarity,
      nextPolarity,
      tremorAmplitude: 0,
      crackGlow: 0,
      shatterExpand: 0,
      absorbPull: 0,
      coreScale: 1,
      rebirthFlash: 0,
    };
  }

  const w = clamp01((t - windowStart) / windowDur);

  if (w < 0.18) {
    const p = w / 0.18;
    const eased = smoothstep01(p);
    return {
      phase: 'fracturing',
      phaseProgress: p,
      cycleProgress: samsara.halfProgress,
      realmPolarity: currentPolarity,
      nextPolarity,
      tremorAmplitude: 0.25 + 0.75 * eased,
      crackGlow: eased,
      shatterExpand: 0,
      absorbPull: 0,
      coreScale: 1 + 0.06 * Math.sin(p * Math.PI * 3),
      rebirthFlash: 0,
    };
  }

  if (w < 0.44) {
    const p = (w - 0.18) / 0.26;
    const eased = smoothstep01(p);
    return {
      phase: 'shattering',
      phaseProgress: p,
      cycleProgress: samsara.halfProgress,
      realmPolarity: currentPolarity,
      nextPolarity,
      tremorAmplitude: 1 - eased * 0.5,
      crackGlow: 1 - eased * 0.4,
      shatterExpand: eased,
      absorbPull: 0,
      coreScale: 1 - 0.68 * eased,
      rebirthFlash: p < 0.35 ? Math.sin((p / 0.35) * Math.PI) * 0.65 : 0,
    };
  }

  if (w < 0.78) {
    const p = (w - 0.44) / 0.34;
    const eased = smoothstep01(p);
    return {
      phase: 'absorbing',
      phaseProgress: p,
      cycleProgress: samsara.halfProgress,
      realmPolarity: w >= 0.58 ? nextPolarity : currentPolarity,
      nextPolarity,
      tremorAmplitude: 0,
      crackGlow: 0.35 * (1 - eased),
      shatterExpand: 1 - eased,
      absorbPull: eased,
      coreScale: 0.32 + 0.68 * eased,
      rebirthFlash: eased * 0.45,
    };
  }

  const p = clamp01((w - 0.78) / 0.22);
  const eased = smoothstep01(p);
  return {
    phase: 'reborn',
    phaseProgress: p,
    cycleProgress: samsara.halfProgress,
    realmPolarity: nextPolarity,
    nextPolarity,
    tremorAmplitude: 0,
    crackGlow: 0,
    shatterExpand: 0,
    absorbPull: 0,
    coreScale: 1.24 - 0.24 * eased,
    rebirthFlash: Math.sin(p * Math.PI),
  };
}
