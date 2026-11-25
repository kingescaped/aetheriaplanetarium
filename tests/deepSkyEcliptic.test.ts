import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MESSIER_ENTRIES } from '../src/data/messierCatalog.ts';
import { NGC_HIGHLIGHT_ENTRIES } from '../src/data/ngcHighlights.ts';
import {
  ALL_DEEP_SKY_ENTRIES,
  computeDeepSkyBodies,
  getFeaturedDeepSkyBodies,
} from '../src/utils/deepSky.ts';
import { formatAngularSize, getDeepSkyTypeLabel } from '../src/utils/deepSkyFormat.ts';
import {
  computeEclipticOverlay,
  eclipticToEquatorial,
  equatorialToEclipticLatitude,
  getTrueObliquityDeg,
} from '../src/utils/ecliptic.ts';
import { computeSolarSystemBodies } from '../src/utils/solarSystem.ts';
import { CONSTELLATION_NAMES } from '../src/utils/i18n.ts';

const HANOI = {
  name: 'Hanoi (Vietnam)',
  latitude: 21.0285,
  longitude: 105.8542,
};

describe('deepSky catalog (110 Messier + 15 NGC)', () => {
  it('contains all 110 Messier objects M1..M110 and 15 unique NGC highlights', () => {
    assert.equal(MESSIER_ENTRIES.length, 110);
    assert.equal(NGC_HIGHLIGHT_ENTRIES.length, 15);
    assert.equal(ALL_DEEP_SKY_ENTRIES.length, 125);

    const messierCodes = new Set(MESSIER_ENTRIES.map((m) => m[0]));
    for (let i = 1; i <= 110; i++) {
      assert.ok(messierCodes.has(`M${i}`), `Missing Messier object M${i}`);
    }

    const bodies = computeDeepSkyBodies(new Date('2026-11-25T14:00:00Z'), HANOI, 'vi');
    assert.equal(bodies.length, 125);

    const ids = new Set(bodies.map((b) => b.id));
    assert.equal(ids.size, 125, 'All DSO IDs must be unique');
  });

  it('validates coordinates, magnitudes, sizes, distances, and IAU constellation coverage', () => {
    const bodies = computeDeepSkyBodies(new Date('2026-11-25T14:00:00Z'), HANOI, 'en');
    const featured = getFeaturedDeepSkyBodies(bodies);
    assert.ok(featured.length >= 10, 'Should provide >= 10 featured DSOs');

    for (const body of bodies) {
      assert.equal(body.bodyType, 'dso');
      assert.ok(body.deepSkyData, `Missing deepSkyData for ${body.id}`);
      assert.ok(body.ra >= 0 && body.ra < 360, `Invalid RA on ${body.id}: ${body.ra}`);
      assert.ok(body.dec >= -90 && body.dec <= 90, `Invalid Dec on ${body.id}: ${body.dec}`);
      assert.ok(body.alt !== undefined && body.alt >= -90 && body.alt <= 90);
      assert.ok(body.az !== undefined && body.az >= 0 && body.az < 360);
      assert.ok(Number.isFinite(body.mag));
      assert.ok(body.deepSkyData.sizeArcmin > 0);
      assert.ok((body.dist ?? 0) > 0);
      assert.ok(
        body.con && CONSTELLATION_NAMES[body.con],
        `Missing constellation translation for ${body.con} (${body.id})`
      );
    }

    const m31 = bodies.find((b) => b.deepSkyData?.catalogCode === 'M31');
    const omegaCen = bodies.find((b) => b.deepSkyData?.catalogCode === 'NGC 5139');
    assert.ok(m31 && m31.deepSkyData?.dsoType === 'galaxy' && Math.abs(m31.dec - 41.27) < 0.2);
    assert.ok(omegaCen && omegaCen.deepSkyData?.dsoType === 'globular_cluster');

    assert.equal(getDeepSkyTypeLabel('planetary_nebula', 'vi'), 'Tinh vân hành tinh');
    assert.equal(formatAngularSize(178, 'en'), '3.0° (178′)');
  });
});

describe('ecliptic geometry and solar alignment', () => {
  it('maps cardinal ecliptic longitudes cleanly to equatorial coordinates', () => {
    const eps = getTrueObliquityDeg(new Date('2026-06-21T12:00:00Z'));
    assert.ok(eps > 23.4 && eps < 23.5);

    const vernal = eclipticToEquatorial(0, 0, eps);
    const summer = eclipticToEquatorial(90, 0, eps);
    const autumnal = eclipticToEquatorial(180, 0, eps);
    const winter = eclipticToEquatorial(270, 0, eps);

    assert.ok(vernal.ra < 0.01 && Math.abs(vernal.dec) < 0.01);
    assert.ok(Math.abs(summer.ra - 90) < 0.01 && Math.abs(summer.dec - eps) < 0.01);
    assert.ok(Math.abs(autumnal.ra - 180) < 0.01 && Math.abs(autumnal.dec) < 0.01);
    assert.ok(Math.abs(winter.ra - 270) < 0.01 && Math.abs(winter.dec + eps) < 0.01);
  });

  it('keeps the computed Sun on the ecliptic plane (|beta| < 0.05 deg) across 2026', () => {
    const dates = [
      new Date('2026-03-20T14:46:00Z'),
      new Date('2026-06-21T08:24:00Z'),
      new Date('2026-09-23T00:05:00Z'),
      new Date('2026-11-25T15:00:00Z'),
    ];

    for (const date of dates) {
      const eps = getTrueObliquityDeg(date);
      const sun = computeSolarSystemBodies(date, HANOI, 'en').find(
        (b) => b.solarSystemData?.bodyId === 'sun'
      );
      assert.ok(sun);
      const eclLat = equatorialToEclipticLatitude(sun.ra, sun.dec, eps);
      assert.ok(
        Math.abs(eclLat) < 0.05,
        `Sun ecliptic latitude too high on ${date.toISOString()}: ${eclLat}`
      );
    }

    const overlay = computeEclipticOverlay(dates[3], HANOI);
    assert.equal(overlay.points.length, 73);
    assert.equal(overlay.ticks.length, 12);
    assert.equal(overlay.markers.length, 4);
  });
});
