import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AdminVfxAudioTracker,
  type AdminAudioEvent,
  type PlanetAudioSlotInput,
} from '../src/utils/adminAudio.ts';
import { computeSkyMapLod } from '../src/utils/skyMapLod.ts';
import {
  computeSamsaraClockSec,
  computeSamsaraState,
  computeSwordFormationState,
} from '../src/utils/samsaraChoreography.ts';
import {
  computeSwordFormationPoses,
  SHARED_SWORD_POOL,
} from '../src/components/planetarium/swordFormation2D.ts';
import { computeSovereignArtworkLayout } from '../src/components/planetarium/supremeCultivatorOverlay2D.ts';

const TEST_PLANET_SLOTS: PlanetAudioSlotInput[] = Array.from({ length: 12 }, (_, idx) => ({
  id: idx,
  orderFrac: idx / 12,
  stereoPan: Math.max(-0.85, Math.min(0.85, (idx / 11 - 0.5) * 1.7)),
}));

function stepSwordPoses(timeSec: number, swordState: ReturnType<typeof computeSwordFormationState>, samsara: ReturnType<typeof computeSamsaraState>) {
  const width = 1440;
  const height = 900;
  const bhX = 720;
  const bhY = 470;
  const bhRadius = 52;
  const layout = computeSovereignArtworkLayout(width, height, bhX, bhY, bhRadius, timeSec);
  return computeSwordFormationPoses(
    {
      width,
      height,
      bhX,
      bhY,
      bhRadius,
      layout,
      swordState,
      samsara,
      timeSec,
    },
    SHARED_SWORD_POOL
  );
}

describe('AdminVfxAudioTracker (36-Sword Kiem Tran)', () => {
  it('emits no events when isAdmin is false or isVfxTimeLocked is true', () => {
    const tracker = new AdminVfxAudioTracker();
    const lod = computeSkyMapLod(0.18, true);
    const samsara = computeSamsaraState(computeSamsaraClockSec(12.2));
    const swordState = computeSwordFormationState(1.2, lod.cultivatorReveal);
    const swordPoses = stepSwordPoses(1.2, swordState, samsara);

    const nonAdminEvents = tracker.step({
      isAdmin: false,
      isVfxTimeLocked: false,
      hidden: false,
      timeSec: 1.2,
      lod: computeSkyMapLod(0.18, false),
      samsara,
      swordState,
      swordPoses,
      width: 1440,
      planetSlots: TEST_PLANET_SLOTS,
    });
    assert.deepEqual(nonAdminEvents, []);

    const lockedEvents = tracker.step({
      isAdmin: true,
      isVfxTimeLocked: true,
      hidden: false,
      timeSec: 1.2,
      lod,
      samsara,
      swordState,
      swordPoses,
      width: 1440,
      planetSlots: TEST_PLANET_SLOTS,
    });
    assert.deepEqual(lockedEvents, []);
  });

  it('tracks full 0.0s..22.5s choreography with zero Taiji/planet audio <= 7.7s and reset()', () => {
    const tracker = new AdminVfxAudioTracker();
    const deepLod = computeSkyMapLod(0.18, true);
    const emitted: Array<{ t: number; event: AdminAudioEvent }> = [];

    for (let stepIdx = 0; stepIdx <= 225; stepIdx++) {
      const t = Number((stepIdx * 0.1).toFixed(1));
      const samsara = computeSamsaraState(computeSamsaraClockSec(t));
      const swordState = computeSwordFormationState(t, deepLod.cultivatorReveal);
      const swordPoses = stepSwordPoses(t, swordState, samsara);

      const events = tracker.step({
        isAdmin: true,
        isVfxTimeLocked: false,
        hidden: false,
        timeSec: t,
        lod: deepLod,
        samsara,
        swordState,
        swordPoses,
        width: 1440,
        planetSlots: TEST_PLANET_SLOTS,
      });

      for (const ev of events) {
        emitted.push({ t, event: ev });
      }
    }

    const types = new Set(emitted.map((e) => e.event.type));
    assert.ok(types.has('lod_annotations_fade'));
    assert.ok(types.has('blackhole_awaken'));
    assert.ok(types.has('sword_swarm_awaken'));
    assert.ok(types.has('sword_stream_whoosh'));
    assert.ok(types.has('silhouette_manifest'));
    assert.ok(types.has('sword_array_lock'));
    assert.ok(types.has('ascension_reveal_burst'));
    assert.ok(types.has('ember_spark'));
    assert.ok(types.has('petal_twinkle'));
    assert.ok(types.has('lightning_crackle'));
    assert.ok(types.has('palm_seal_chime'));

    // Sovereign reveals cleanly before Taiji (7.2s..7.7s window)
    const ascensionBurst = emitted.find((e) => e.event.type === 'ascension_reveal_burst');
    assert.ok(ascensionBurst && ascensionBurst.t > 7.2 && ascensionBurst.t <= 7.7);

    // Zero Taiji/planet/post-reveal micro-SFX while <= 7.7s (even during 7.2..7.7s Sovereign reveal!)
    const preTaijiBlocked = emitted.filter(
      (e) =>
        e.t <= 7.7 &&
        (e.event.type === 'samsara_turn_start' ||
          e.event.type === 'samsara_turn_lock' ||
          e.event.type === 'robe_morph_shimmer' ||
          e.event.type === 'planet_fracture_tick' ||
          e.event.type === 'planet_shatter_burst' ||
          e.event.type === 'planet_absorb_whoosh' ||
          e.event.type === 'planet_rebirth_chime' ||
          e.event.type === 'lightning_crackle' ||
          e.event.type === 'palm_seal_chime')
    );
    assert.deepEqual(preTaijiBlocked, []);

    // Samsara turn directions (+1 CW and -1 CCW) + locks + robe morph shimmers
    const turnStarts = emitted
      .filter((e) => e.event.type === 'samsara_turn_start')
      .map((e) => (e.event as Extract<AdminAudioEvent, { type: 'samsara_turn_start' }>).direction);
    assert.ok(turnStarts.includes(1));
    assert.ok(turnStarts.includes(-1));

    const morphDirs = emitted
      .filter((e) => e.event.type === 'robe_morph_shimmer')
      .map((e) => (e.event as Extract<AdminAudioEvent, { type: 'robe_morph_shimmer' }>).toYang);
    assert.ok(morphDirs.includes(true));
    assert.ok(morphDirs.includes(false));

    const lockRealms = emitted
      .filter((e) => e.event.type === 'samsara_turn_lock')
      .map((e) => (e.event as Extract<AdminAudioEvent, { type: 'samsara_turn_lock' }>).topRealm);
    assert.ok(lockRealms.includes('dark'));
    assert.ok(lockRealms.includes('white'));

    // All 4 planet destruction/rebirth phases with stereo pan in [-1, 1]
    const planetEventTypes: Array<AdminAudioEvent['type']> = [
      'planet_fracture_tick',
      'planet_shatter_burst',
      'planet_absorb_whoosh',
      'planet_rebirth_chime',
    ];
    for (const pType of planetEventTypes) {
      const matches = emitted.filter((e) => e.event.type === pType);
      assert.ok(matches.length > 0, `Expected ${pType} to emit`);
      for (const m of matches) {
        const pan = (m.event as { pan: number }).pan;
        assert.ok(pan >= -1 && pan <= 1, `Expected pan in [-1, 1], got ${pan}`);
      }
    }

    // Palm seal chimes alternate left (-0.55) and right (+0.55)
    const palmPans = emitted
      .filter((e) => e.event.type === 'palm_seal_chime')
      .map((e) => (e.event as Extract<AdminAudioEvent, { type: 'palm_seal_chime' }>).pan);
    assert.ok(palmPans.includes(-0.55));
    assert.ok(palmPans.includes(0.55));

    // reset() allows clean re-triggering from 0.0s
    tracker.reset();
    const zeroSamsara = computeSamsaraState(computeSamsaraClockSec(0));
    const zeroSword = computeSwordFormationState(0, deepLod.cultivatorReveal);
    const reTriggered = tracker.step({
      isAdmin: true,
      isVfxTimeLocked: false,
      hidden: false,
      timeSec: 0,
      lod: deepLod,
      samsara: zeroSamsara,
      swordState: zeroSword,
      swordPoses: stepSwordPoses(0, zeroSword, zeroSamsara),
      width: 1440,
      planetSlots: TEST_PLANET_SLOTS,
    });
    const reTypes = new Set(reTriggered.map((e) => e.type));
    assert.ok(reTypes.has('lod_annotations_fade'));
    assert.ok(reTypes.has('blackhole_awaken'));
    assert.ok(reTypes.has('sword_swarm_awaken'));
  });
});
