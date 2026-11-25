import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BUNDLED_SATELLITE_TLES } from '../src/data/satelliteFallbackTles.ts';
import {
  parseCelesTrakTleResponse,
  isValidTlePair,
} from '../src/services/celestrak.ts';
import {
  computeSatelliteBodies,
  parseTleElements,
  predictNextSatellitePass,
  propagateSatelliteAtDate,
} from '../src/utils/satellites.ts';
import type { ObserverLocation } from '../src/types/celestial.ts';

const HANOI: ObserverLocation = {
  name: 'Hanoi (Vietnam)',
  latitude: 21.0285,
  longitude: 105.8542,
};

describe('Satellite TLE Parser & J2 Orbital Propagator', () => {
  it('parses bundled ISS, Tiangong, and Hubble TLE records cleanly', () => {
    assert.equal(BUNDLED_SATELLITE_TLES.length, 3);
    for (const tle of BUNDLED_SATELLITE_TLES) {
      assert.equal(isValidTlePair(tle.line1, tle.line2), true);
      const el = parseTleElements(tle.line1, tle.line2);
      assert.equal(el.noradId, tle.noradId);
      assert.ok(el.meanMotionRevPerDay > 14 && el.meanMotionRevPerDay < 17);
      assert.ok(el.inclinationDeg > 20 && el.inclinationDeg < 60);
    }
  });

  it('propagates ISS LEO altitude, speed, period, and coordinates without NaN near epoch and +365 days', () => {
    const issTle = BUNDLED_SATELLITE_TLES[0];
    const el = parseTleElements(issTle.line1, issTle.line2);
    const epochDate = new Date(el.epochMs);
    const futureDate = new Date(el.epochMs + 365 * 86400_000);

    for (const d of [epochDate, futureDate]) {
      const state = propagateSatelliteAtDate(issTle, d, HANOI, el);
      assert.ok(Number.isFinite(state.alt) && state.alt >= -90 && state.alt <= 90);
      assert.ok(Number.isFinite(state.az) && state.az >= 0 && state.az < 360);
      assert.ok(state.altitudeKm > 380 && state.altitudeKm < 470, `Unexpected ISS alt ${state.altitudeKm}`);
      assert.ok(state.velocityKms > 7.4 && state.velocityKms < 7.85, `Unexpected ISS vel ${state.velocityKms}`);
      assert.ok(state.periodMin > 90 && state.periodMin < 95, `Unexpected ISS period ${state.periodMin}`);
    }
  });

  it('generates 25-point sky track arcs across [-6m .. +6m] for every tracked spacecraft', () => {
    const testDate = new Date('2026-11-25T12:00:00Z');
    const bodies = computeSatelliteBodies(BUNDLED_SATELLITE_TLES, testDate, HANOI, 'vi');
    assert.equal(bodies.length, 3);

    for (const b of bodies) {
      assert.equal(b.bodyType, 'satellite');
      assert.ok(b.satelliteData);
      assert.equal(b.satelliteData.track.length, 25);
      assert.equal(b.satelliteData.track[0].offsetMin, -6);
      assert.equal(b.satelliteData.track[24].offsetMin, 6);
    }
  });

  it('finds an overhead pass (>= 10 deg) within 24 hours over Hanoi', () => {
    const issTle = BUNDLED_SATELLITE_TLES[0];
    const el = parseTleElements(issTle.line1, issTle.line2);
    const pass = predictNextSatellitePass(issTle, new Date(el.epochMs), HANOI, 24);

    assert.ok(pass !== null, 'Expected at least one ISS pass >= 10 deg over Hanoi within 24h');
    assert.ok(pass.maxAltDeg >= 10 && pass.maxAltDeg <= 90);
    assert.ok(pass.peakTimeMs >= pass.riseTimeMs && pass.setTimeMs >= pass.peakTimeMs);

    const checkPeak = propagateSatelliteAtDate(issTle, new Date(pass.peakTimeMs), HANOI, el);
    assert.ok(Math.abs(checkPeak.alt - pass.maxAltDeg) < 0.25);
  });

  it('parses JSON TLE API and 2-line/3-line response payloads cleanly', () => {
    const raw3Line = `ISS (ZARYA)\n${BUNDLED_SATELLITE_TLES[0].line1}\n${BUNDLED_SATELLITE_TLES[0].line2}\n`;
    const parsedText = parseCelesTrakTleResponse(raw3Line);
    assert.ok(parsedText);
    assert.equal(parsedText.line1, BUNDLED_SATELLITE_TLES[0].line1);

    const rawJson = JSON.stringify({
      satelliteId: 25544,
      line1: BUNDLED_SATELLITE_TLES[0].line1,
      line2: BUNDLED_SATELLITE_TLES[0].line2,
    });
    const parsedJson = parseCelesTrakTleResponse(rawJson);
    assert.ok(parsedJson);
    assert.equal(parsedJson.line2, BUNDLED_SATELLITE_TLES[0].line2);

    assert.equal(parseCelesTrakTleResponse('invalid response'), null);
  });
});
