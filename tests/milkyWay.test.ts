import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeMilkyWayOverlay,
  computeMilkyWayVisibility,
  equatorialToGalactic,
  galacticToEquatorial,
} from '../src/utils/milkyWay.ts';
import { computeTwilightState } from '../src/utils/twilight.ts';
import { CLEAR_SKY_ATTENUATION } from '../src/utils/seeingModel.ts';
import type { ObserverLocation } from '../src/types/celestial.ts';

const HANOI: ObserverLocation = {
  name: 'Hanoi (Vietnam)',
  latitude: 21.0285,
  longitude: 105.8542,
};

function angularDiffDeg(a: number, b: number): number {
  const diff = Math.abs(((a - b + 540) % 360) - 180);
  return diff;
}

describe('Milky Way Galactic Coordinate Engine', () => {
  it('maps Galactic Center, North Galactic Pole, and Anticenter to J2000 equatorial positions', () => {
    const gc = galacticToEquatorial(0, 0);
    assert.ok(angularDiffDeg(gc.ra, 266.405) < 0.1, `GC RA expected ~266.405, got ${gc.ra}`);
    assert.ok(Math.abs(gc.dec - -28.936) < 0.1, `GC Dec expected ~-28.936, got ${gc.dec}`);

    const ngp = galacticToEquatorial(0, 90);
    assert.ok(Math.abs(ngp.dec - 27.128) < 0.1, `NGP Dec expected ~27.128, got ${ngp.dec}`);
    assert.ok(angularDiffDeg(ngp.ra, 192.859) < 0.15, `NGP RA expected ~192.859, got ${ngp.ra}`);

    const anti = galacticToEquatorial(180, 0);
    assert.ok(angularDiffDeg(anti.ra, 86.405) < 0.1, `Anticenter RA expected ~86.405, got ${anti.ra}`);
    assert.ok(Math.abs(anti.dec - 28.936) < 0.1, `Anticenter Dec expected ~28.936, got ${anti.dec}`);
  });

  it('maintains sub-0.01 deg round-trip accuracy between Galactic and Equatorial frames', () => {
    const pairs = [
      { l: 35, b: 12 },
      { l: 125, b: -18 },
      { l: 250, b: 42 },
      { l: 315, b: -5 },
    ];
    for (const { l, b } of pairs) {
      const eq = galacticToEquatorial(l, b);
      const back = equatorialToGalactic(eq.ra, eq.dec);
      assert.ok(angularDiffDeg(back.l, l) < 0.01, `Roundtrip l diff for ${l}: ${back.l}`);
      assert.ok(Math.abs(back.b - b) < 0.01, `Roundtrip b diff for ${b}: ${back.b}`);
    }
  });

  it('builds 72 Galactic Plane samples with wider, brighter Sagittarius Bulge', () => {
    const overlay = computeMilkyWayOverlay(new Date('2026-06-21T15:00:00Z'), HANOI);
    assert.equal(overlay.samples.length, 72);

    const gcSample = overlay.samples[0];
    const antiSample = overlay.samples.find((s) => s.lDeg === 180)!;
    assert.ok(gcSample.intensity > antiSample.intensity);
    assert.ok(gcSample.widthDeg > antiSample.widthDeg);
    assert.ok(gcSample.bulgeFactor > 0.95);
    assert.ok(Number.isFinite(gcSample.alt) && Number.isFinite(gcSample.az));
  });

  it('fades Milky Way cleanly in daylight and heavy clouds while keeping full clarity on dark nights', () => {
    const noonTwilight = computeTwilightState(new Date('2026-06-21T05:00:00Z'), HANOI, true);
    const nightTwilight = computeTwilightState(new Date('2026-06-21T17:00:00Z'), HANOI, true);

    assert.equal(computeMilkyWayVisibility(CLEAR_SKY_ATTENUATION, noonTwilight), 0);
    assert.equal(computeMilkyWayVisibility(CLEAR_SKY_ATTENUATION, nightTwilight), 1);

    const heavyCloud = {
      ...CLEAR_SKY_ATTENUATION,
      starOpacity: 0.25,
    };
    assert.equal(computeMilkyWayVisibility(heavyCloud, nightTwilight), 0.25);
  });
});
