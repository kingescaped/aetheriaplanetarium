import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyMoonPhase,
  computeBodyRiseSet,
  computeSolarSystemBodies,
} from '../src/utils/solarSystem.ts';
import {
  formatCelestialDistance,
  formatRiseSetClock,
  getMoonPhaseLabel,
} from '../src/utils/solarSystemFormat.ts';

const HANOI = {
  name: 'Hanoi (Vietnam)',
  latitude: 21.0285,
  longitude: 105.8542,
};

describe('solarSystem ephemeris', () => {
  it('computes all 9 Solar System bodies within valid celestial coordinate bounds', () => {
    const bodies = computeSolarSystemBodies(new Date('2026-11-25T15:00:00Z'), HANOI, 'vi');
    assert.equal(bodies.length, 9);

    const ids = bodies.map((b) => b.solarSystemData?.bodyId);
    assert.deepEqual(ids, [
      'sun',
      'moon',
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ]);

    for (const body of bodies) {
      assert.ok(body.ra >= 0 && body.ra < 360);
      assert.ok(body.dec >= -90 && body.dec <= 90);
      assert.ok(body.alt !== undefined && body.alt >= -90 && body.alt <= 90);
      assert.ok(body.az !== undefined && body.az >= 0 && body.az < 360);
      assert.ok((body.solarSystemData?.distanceAu ?? 0) > 0);
    }

    const neptune = bodies.find((b) => b.solarSystemData?.bodyId === 'neptune')!;
    const venus = bodies.find((b) => b.solarSystemData?.bodyId === 'venus')!;
    const saturn = bodies.find((b) => b.solarSystemData?.bodyId === 'saturn')!;
    assert.ok((neptune.solarSystemData?.distanceAu ?? 0) > 28);
    assert.ok(venus.mag < neptune.mag);
    assert.ok(typeof saturn.solarSystemData?.ringTiltDeg === 'number');
  });

  it('tracks Sun declination accurately at 2026 Vernal Equinox and June Solstice', () => {
    const equinoxBodies = computeSolarSystemBodies(
      new Date('2026-03-20T14:46:00Z'),
      HANOI,
      'en'
    );
    const equinoxSun = equinoxBodies.find((b) => b.solarSystemData?.bodyId === 'sun')!;
    assert.ok(Math.abs(equinoxSun.dec) < 0.5);
    assert.ok(equinoxSun.ra < 1 || equinoxSun.ra > 359);
    assert.ok(equinoxSun.mag < -26);

    const solsticeBodies = computeSolarSystemBodies(
      new Date('2026-06-21T08:24:00Z'),
      HANOI,
      'en'
    );
    const solsticeSun = solsticeBodies.find((b) => b.solarSystemData?.bodyId === 'sun')!;
    assert.ok(Math.abs(solsticeSun.dec - 23.44) < 0.3);
    assert.ok(Math.abs(solsticeSun.ra - 90) < 1);
  });

  it('computes accurate lunar phases, illumination, and distance for New & Full Moon', () => {
    const fullMoon = computeSolarSystemBodies(
      new Date('2026-11-24T14:54:00Z'),
      HANOI,
      'vi'
    ).find((b) => b.solarSystemData?.bodyId === 'moon')!;

    assert.ok((fullMoon.solarSystemData?.phaseFraction ?? 0) >= 0.99);
    assert.equal(fullMoon.solarSystemData?.moonPhaseName, 'full');
    assert.ok(
      (fullMoon.solarSystemData?.distanceKm ?? 0) >= 350_000 &&
        (fullMoon.solarSystemData?.distanceKm ?? 0) <= 415_000
    );

    const newMoon = computeSolarSystemBodies(
      new Date('2026-11-09T07:03:00Z'),
      HANOI,
      'vi'
    ).find((b) => b.solarSystemData?.bodyId === 'moon')!;

    assert.ok((newMoon.solarSystemData?.phaseFraction ?? 1) <= 0.02);
    assert.equal(newMoon.solarSystemData?.moonPhaseName, 'new');

    assert.equal(classifyMoonPhase(0), 'new');
    assert.equal(classifyMoonPhase(90), 'first_quarter');
    assert.equal(classifyMoonPhase(180), 'full');
    assert.equal(classifyMoonPhase(270), 'last_quarter');
  });

  it('finds next rise and set events within 24 hours for Hanoi', () => {
    const refDate = new Date('2026-11-25T15:00:00Z');
    const riseSet = computeBodyRiseSet('sun', refDate, HANOI);

    assert.ok(riseSet.nextRiseMs !== null);
    assert.ok(riseSet.nextSetMs !== null);
    assert.ok(riseSet.nextRiseMs > refDate.getTime());
    assert.ok(riseSet.nextSetMs > refDate.getTime());
    assert.ok(riseSet.nextRiseMs - refDate.getTime() < 25 * 3600_000);
    assert.ok(riseSet.nextSetMs - refDate.getTime() < 25 * 3600_000);
  });

  it('formats distances, lunar phase names, and clock times bilingually', () => {
    const bodies = computeSolarSystemBodies(new Date('2026-11-24T14:54:00Z'), HANOI, 'vi');
    const moon = bodies.find((b) => b.solarSystemData?.bodyId === 'moon')!;
    const neptune = bodies.find((b) => b.solarSystemData?.bodyId === 'neptune')!;

    const moonDist = formatCelestialDistance(moon, 'vi');
    assert.ok(moonDist.primary.endsWith('km'));
    assert.ok(moonDist.secondary.endsWith('AU'));

    const neptuneDist = formatCelestialDistance(neptune, 'en');
    assert.ok(neptuneDist.primary.endsWith('AU'));
    assert.ok(neptuneDist.secondary.includes('B km'));

    assert.equal(getMoonPhaseLabel('full', 'en'), 'Full Moon');
    assert.equal(getMoonPhaseLabel('full', 'vi'), 'Trăng tròn (Vọng)');
    assert.equal(formatRiseSetClock(null, 'vi'), '--:--');
  });
});
