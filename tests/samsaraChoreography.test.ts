import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SAMSARA_CYCLE_DURATION_SEC,
  SAMSARA_HALF_DURATION_SEC,
  SAMSARA_HOLD_DURATION_SEC,
  SAMSARA_REVEAL_DELAY_SEC,
  SAMSARA_REVEAL_START_SEC,
  SAMSARA_TURN_DURATION_SEC,
  SOVEREIGN_REVEAL_START_SEC,
  SWORD_TIER_COUNT,
  SWORD_TOTAL_COUNT,
  computePlanetLifecycleState,
  computeSamsaraClockSec,
  computeSamsaraState,
  computeSwordFormationState,
} from '../src/utils/samsaraChoreography.ts';
import {
  SHARED_SWORD_POOL,
  SWORD_TRAIL_POINTS,
  computeSwordFormationPoses,
  type FlyingSwordPose,
} from '../src/components/planetarium/swordFormation2D.ts';
import { computeSovereignArtworkLayout } from '../src/components/planetarium/supremeCultivatorOverlay2D.ts';

describe('computeSamsaraState 5s hold + alternating CW/CCW 180-deg cycle', () => {
  it('uses exact 5s hold, 2s turn, 7s half, 14s full cycle, and 0.5s Sovereign-first -> Taiji-second stagger constants', () => {
    assert.equal(SAMSARA_HOLD_DURATION_SEC, 5.0);
    assert.equal(SAMSARA_TURN_DURATION_SEC, 2.0);
    assert.equal(SAMSARA_HALF_DURATION_SEC, 7.0);
    assert.equal(SAMSARA_CYCLE_DURATION_SEC, 14.0);
    assert.equal(SOVEREIGN_REVEAL_START_SEC, 7.2);
    assert.equal(SAMSARA_REVEAL_DELAY_SEC, 0.5);
    assert.equal(SAMSARA_REVEAL_START_SEC, 7.7);

    assert.equal(computeSamsaraClockSec(0), 0);
    assert.equal(computeSamsaraClockSec(7.45), 0);
    assert.equal(computeSamsaraClockSec(7.7), 0);
    assert.ok(Math.abs(computeSamsaraClockSec(8.2) - 0.5) < 1e-6);
    assert.ok(Math.abs(computeSamsaraClockSec(12.7) - 5.0) < 1e-6);
    assert.equal(computeSamsaraClockSec(Number.NaN), 0);
  });

  it('holds White TOP during 0..5s, turns CW 0->PI across 5..7s, holds Dark TOP 7..12s, and turns CCW PI->0 across 12..14s', () => {
    const holdWhite0 = computeSamsaraState(0);
    assert.equal(holdWhite0.phase, 'hold_white_top');
    assert.equal(holdWhite0.topRealm, 'white');
    assert.equal(holdWhite0.isTurning, false);
    assert.equal(holdWhite0.turnDirection, 0);
    assert.equal(holdWhite0.angleRad, 0);
    assert.equal(holdWhite0.yangBlend, 0);

    const holdWhite49 = computeSamsaraState(4.9);
    assert.equal(holdWhite49.phase, 'hold_white_top');
    assert.equal(holdWhite49.angleRad, 0);

    const cwMid = computeSamsaraState(6.0);
    assert.equal(cwMid.phase, 'turning_cw');
    assert.equal(cwMid.isTurning, true);
    assert.equal(cwMid.turnDirection, 1);
    assert.ok(Math.abs(cwMid.angleRad - Math.PI * 0.5) < 1e-6);
    assert.ok(Math.abs(cwMid.yangBlend - 0.5) < 1e-6);

    const holdDark = computeSamsaraState(7.5);
    assert.equal(holdDark.phase, 'hold_dark_top');
    assert.equal(holdDark.topRealm, 'dark');
    assert.equal(holdDark.isTurning, false);
    assert.equal(holdDark.turnDirection, 0);
    assert.ok(Math.abs(holdDark.angleRad - Math.PI) < 1e-6);
    assert.equal(holdDark.yangBlend, 1);

    const ccwMid = computeSamsaraState(13.0);
    assert.equal(ccwMid.phase, 'turning_ccw');
    assert.equal(ccwMid.isTurning, true);
    assert.equal(ccwMid.turnDirection, -1);
    assert.ok(Math.abs(ccwMid.angleRad - Math.PI * 0.5) < 1e-6);
    assert.ok(Math.abs(ccwMid.yangBlend - 0.5) < 1e-6);

    const nextCycle = computeSamsaraState(14.0);
    assert.equal(nextCycle.phase, 'hold_white_top');
    assert.equal(nextCycle.angleRad, 0);
    assert.equal(nextCycle.yangBlend, 0);
  });
});

describe('computePlanetLifecycleState forward-only on CW & CCW turns', () => {
  it('runs strictly forward fracturing -> shattering -> absorbing -> reborn on CW half (4.4..7.0s)', () => {
    const order = 0; // windowStart = 4.4, windowDur = 2.15
    assert.equal(computePlanetLifecycleState(computeSamsaraState(2.0), order).phase, 'stable');
    assert.equal(computePlanetLifecycleState(computeSamsaraState(4.5), order).phase, 'fracturing');
    assert.equal(computePlanetLifecycleState(computeSamsaraState(5.1), order).phase, 'shattering');
    assert.equal(computePlanetLifecycleState(computeSamsaraState(5.7), order).phase, 'absorbing');
    assert.equal(computePlanetLifecycleState(computeSamsaraState(6.2), order).phase, 'reborn');
    const post = computePlanetLifecycleState(computeSamsaraState(6.7), order);
    assert.equal(post.phase, 'stable');
    assert.equal(post.realmPolarity, 1);
  });

  it('also runs strictly forward fracturing -> shattering -> absorbing -> reborn during CCW half (11.4..14.0s)', () => {
    const order = 0;
    assert.equal(computePlanetLifecycleState(computeSamsaraState(9.0), order).phase, 'stable');
    assert.equal(computePlanetLifecycleState(computeSamsaraState(11.95), order).phase, 'fracturing');
    assert.equal(computePlanetLifecycleState(computeSamsaraState(12.50), order).phase, 'shattering');
    assert.equal(computePlanetLifecycleState(computeSamsaraState(13.15), order).phase, 'absorbing');
    assert.equal(computePlanetLifecycleState(computeSamsaraState(13.70), order).phase, 'reborn');
    const rebornPolarity = computePlanetLifecycleState(computeSamsaraState(13.70), order).realmPolarity;
    assert.equal(rebornPolarity, 0);
  });
});

describe('computeSwordFormationState 36-sword choreography & pure-black silhouette invariant', () => {
  it('exports exact tier & total sword counts (18 / 36)', () => {
    assert.equal(SWORD_TIER_COUNT, 18);
    assert.equal(SWORD_TOTAL_COUNT, 36);
  });

  it('enforces 4 stagger phases: silhouette (0..7.2s), Sovereign-first (7.2..7.7s), Taiji mid-reveal (7.7..8.5s), full (>=8.5s)', () => {
    for (const t of [0.0, 1.5, 3.1, 3.2, 5.0, 6.4, 7.0, 7.2]) {
      const state = computeSwordFormationState(t, 1.0);
      assert.equal(state.trueFormReveal, 0, `Expected trueFormReveal=0 at t=${t}`);
      assert.equal(state.sovereignOpacity, 0, `Expected sovereignOpacity=0 at t=${t}`);
      assert.equal(state.samsaraOpacity, 0, `Expected samsaraOpacity=0 at t=${t}`);
      assert.ok(state.silhouetteOpacity > 0, `Expected visible silhouette at t=${t}`);
    }

    // Phase 2: 7.45s -> Sovereign reveals while Taiji stays hidden (0.5s stagger)
    const sFirst = computeSwordFormationState(7.45, 1.0);
    assert.ok(sFirst.trueFormReveal > 0 && sFirst.trueFormReveal < 1);
    assert.ok(sFirst.sovereignOpacity > 0 && sFirst.sovereignOpacity < 1);
    assert.equal(sFirst.samsaraOpacity, 0);
    assert.equal(computeSamsaraClockSec(7.45), 0);

    // Phase 3: 8.05s -> Sovereign is 100% revealed while Taiji is mid-reveal (0 < samsaraOpacity < 1)
    const sTaijiMid = computeSwordFormationState(8.05, 1.0);
    assert.equal(sTaijiMid.trueFormReveal, 1.0);
    assert.equal(sTaijiMid.sovereignOpacity, 1.0);
    assert.ok(sTaijiMid.samsaraOpacity > 0 && sTaijiMid.samsaraOpacity < 1);

    // Phase 4: >= 8.5s -> Both Sovereign and Taiji wheel at 100%
    const sFull = computeSwordFormationState(8.5, 1.0);
    assert.equal(sFull.sovereignOpacity, 1.0);
    assert.equal(sFull.samsaraOpacity, 1.0);
  });

  it('progresses blackhole_orbit -> sovereign_coil -> array_expand -> sword_halo and reaches full reveal >= 8.5s', () => {
    const s1 = computeSwordFormationState(1.6, 1.0);
    assert.equal(s1.stage, 'blackhole_orbit');
    assert.ok(Math.abs(s1.orbitAngleRad - Math.PI * 2) < 1e-6);

    const s2 = computeSwordFormationState(4.8, 1.0);
    assert.equal(s2.stage, 'sovereign_coil');
    assert.ok(Math.abs(s2.orbitAngleRad - Math.PI * 6) < 1e-6);

    const s3 = computeSwordFormationState(7.45, 1.0);
    assert.equal(s3.stage, 'array_expand');
    assert.ok(s3.arrayExpandBlend > 0.85);
    assert.ok(s3.trueFormReveal > 0 && s3.trueFormReveal < 0.5);
    assert.equal(s3.samsaraOpacity, 0);

    const sFlash = computeSwordFormationState(7.7, 1.0);
    assert.equal(sFlash.stage, 'sword_halo');
    assert.ok(sFlash.burstFlash > 0.9);
    assert.equal(sFlash.samsaraOpacity, 0);

    const sFull = computeSwordFormationState(8.5, 1.0);
    assert.equal(sFull.stage, 'sword_halo');
    assert.equal(sFull.trueFormReveal, 1.0);
    assert.equal(sFull.sovereignOpacity, 1.0);
    assert.equal(sFull.samsaraOpacity, 1.0);
    assert.equal(sFull.arrayExpandBlend, 1.0);
    assert.ok(sFull.innerTierAngleRad > 0);
    assert.ok(sFull.outerTierAngleRad < 0);
  });
});

describe('computeSwordFormationPoses 36-sword trajectories & counter-rotating halo', () => {
  it('crosses z>0 and z<0 during flight, settles strictly z<0 with outward tips in sword_halo, and counter-rotates CW/CCW', () => {
    const layout = computeSovereignArtworkLayout({
      width: 1280,
      height: 720,
      bhX: 640,
      bhY: 360,
      bhRadius: 57,
      reveal: 1,
      timeSec: 0,
    });
    const buffer: FlyingSwordPose[] = Array.from({ length: SWORD_TOTAL_COUNT }, (_, index) => ({
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
    }));

    assert.equal(SHARED_SWORD_POOL.length, 36);

    // 1. Black Hole orbit crosses both z > 0 and z < 0
    const bhSamsara = computeSamsaraState(computeSamsaraClockSec(1.6));
    const bhSword = computeSwordFormationState(1.6, 1.0);
    const bhPoses = computeSwordFormationPoses(
      {
        width: 1280,
        height: 720,
        bhX: 640,
        bhY: 360,
        bhRadius: 57,
        layout,
        swordState: bhSword,
        samsara: bhSamsara,
        timeSec: 1.6,
      },
      buffer
    );
    assert.equal(bhPoses.length, 36);
    assert.ok(bhPoses.some((p) => p.z > 0) && bhPoses.some((p) => p.z < 0));

    // 2. Sovereign coil crosses both z > 0 and z < 0
    const coilSamsara = computeSamsaraState(computeSamsaraClockSec(4.6));
    const coilSword = computeSwordFormationState(4.6, 1.0);
    const coilPoses = computeSwordFormationPoses(
      {
        width: 1280,
        height: 720,
        bhX: 640,
        bhY: 360,
        bhRadius: 57,
        layout,
        swordState: coilSword,
        samsara: coilSamsara,
        timeSec: 4.6,
      },
      buffer
    );
    assert.ok(coilPoses.some((p) => p.z > 0) && coilPoses.some((p) => p.z < 0));

    // 3. Sword halo strictly z < 0 & strictly outward tips
    const haloPosesA = computeSwordFormationPoses(
      {
        width: 1280,
        height: 720,
        bhX: 640,
        bhY: 360,
        bhRadius: 57,
        layout,
        swordState: computeSwordFormationState(8.0, 1.0),
        samsara: computeSamsaraState(computeSamsaraClockSec(8.0)),
        timeSec: 8.0,
      },
      buffer
    );
    for (const p of haloPosesA) {
      assert.ok(p.z < 0, `Expected sword ${p.index} z < 0 in sword_halo`);
      const dx = p.x - layout.haloX;
      const dy = p.y - layout.haloY;
      const radialLen = Math.hypot(dx, dy) || 1;
      const unitDot = (dx * p.dirX + dy * p.dirY) / radialLen;
      assert.ok(unitDot > 0.9, `Expected outward tip unitDot > 0.9, got ${unitDot}`);
      assert.ok(dx * p.dirX + dy * p.dirY > 0.9, 'Expected positive outward dot product');
    }

    // 4. Explicit directional counter-rotation assertion near 12 o'clock:
    // Tier 1 top sword (#16 at t=8.0) moves RIGHT (CW): x increases
    // Tier 2 top sword (#19 at t=8.0) moves LEFT (CCW): x decreases
    const t1TopA = haloPosesA.find(
      (p) => p.tier === 1 && p.y < layout.haloY && Math.abs(p.x - layout.haloX) < 12
    );
    const t2TopA = haloPosesA.find(
      (p) => p.tier === 2 && p.y < layout.haloY && Math.abs(p.x - layout.haloX) < 12
    );
    assert.ok(t1TopA, 'Expected Tier 1 sword near 12 o-clock at t=8.0');
    assert.ok(t2TopA, 'Expected Tier 2 sword near 12 o-clock at t=8.0');
    const t1Idx = t1TopA.index;
    const t2Idx = t2TopA.index;
    const t1XA = t1TopA.x;
    const t2XA = t2TopA.x;

    const haloPosesB = computeSwordFormationPoses(
      {
        width: 1280,
        height: 720,
        bhX: 640,
        bhY: 360,
        bhRadius: 57,
        layout,
        swordState: computeSwordFormationState(8.3, 1.0),
        samsara: computeSamsaraState(computeSamsaraClockSec(8.3)),
        timeSec: 8.3,
      },
      buffer
    );
    assert.ok(
      haloPosesB[t1Idx].x > t1XA,
      `Expected Tier 1 (CW) top sword #${t1Idx} x to increase: ${t1XA} -> ${haloPosesB[t1Idx].x}`
    );
    assert.ok(
      haloPosesB[t2Idx].x < t2XA,
      `Expected Tier 2 (CCW) top sword #${t2Idx} x to decrease: ${t2XA} -> ${haloPosesB[t2Idx].x}`
    );
  });
});
