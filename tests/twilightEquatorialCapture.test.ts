import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyTwilightPhase,
  combineSkyAttenuation,
  computeTwilightState,
  getTwilightPhaseLabel,
} from '../src/utils/twilight.ts';
import { computeEquatorialGrid } from '../src/utils/equatorialGrid.ts';
import {
  buildCaptureFilename,
  formatCaptureWatermarkInfo,
} from '../src/utils/skyCapture.ts';
import { CLEAR_SKY_ATTENUATION } from '../src/utils/seeingModel.ts';
import type { ObserverLocation, Star } from '../src/types/celestial.ts';

const HANOI: ObserverLocation = {
  name: 'Hanoi (Vietnam)',
  latitude: 21.0285,
  longitude: 105.8542,
};

const SYDNEY: ObserverLocation = {
  name: 'Sydney Observatory (Australia)',
  latitude: -33.8596,
  longitude: 151.2052,
};

describe('Atmosphere Twilight Engine', () => {
  it('classifies all 5 solar altitude boundaries accurately', () => {
    assert.equal(classifyTwilightPhase(10), 'daylight');
    assert.equal(classifyTwilightPhase(0.1), 'daylight');
    assert.equal(classifyTwilightPhase(0), 'civil');
    assert.equal(classifyTwilightPhase(-3.5), 'civil');
    assert.equal(classifyTwilightPhase(-6), 'nautical');
    assert.equal(classifyTwilightPhase(-9.5), 'nautical');
    assert.equal(classifyTwilightPhase(-12), 'astronomical');
    assert.equal(classifyTwilightPhase(-15), 'astronomical');
    assert.equal(classifyTwilightPhase(-18), 'night');
    assert.equal(classifyTwilightPhase(-25), 'night');
  });

  it('computes real Hanoi noon (daylight) vs midnight (night) via astronomy-engine', () => {
    const noonUtc = new Date('2026-06-21T05:00:00Z');
    const nightUtc = new Date('2026-06-21T17:00:00Z');

    const noonState = computeTwilightState(noonUtc, HANOI, true);
    const nightState = computeTwilightState(nightUtc, HANOI, true);

    assert.equal(noonState.phase, 'daylight');
    assert.ok(noonState.sunAltDeg > 50, `Expected high noon sun, got ${noonState.sunAltDeg}`);
    assert.ok(noonState.starOpacityFactor < nightState.starOpacityFactor);
    assert.ok(noonState.magPenalty > nightState.magPenalty);
    assert.ok(noonState.skyBrightness > 0.9);

    assert.equal(nightState.phase, 'night');
    assert.ok(nightState.sunAltDeg < -18, `Expected night sun < -18, got ${nightState.sunAltDeg}`);
    assert.equal(nightState.starOpacityFactor, 1);
    assert.equal(nightState.magPenalty, 0);
    assert.equal(nightState.skyBrightness, 0);
  });

  it('returns neutral visual attenuation when atmosphere simulation is disabled', () => {
    const noonUtc = new Date('2026-06-21T05:00:00Z');
    const disabled = computeTwilightState(noonUtc, HANOI, false);

    assert.equal(disabled.enabled, false);
    assert.equal(disabled.phase, 'daylight');
    assert.equal(disabled.starOpacityFactor, 1);
    assert.equal(disabled.magPenalty, 0);
    assert.equal(disabled.sunGlowOpacity, 0);
    assert.equal(disabled.skyBrightness, 0);

    const combined = combineSkyAttenuation(CLEAR_SKY_ATTENUATION, disabled);
    assert.deepEqual(combined, CLEAR_SKY_ATTENUATION);
  });

  it('combines cloud weather attenuation with twilight attenuation cleanly', () => {
    const noonUtc = new Date('2026-06-21T05:00:00Z');
    const daylight = computeTwilightState(noonUtc, HANOI, true);
    const cloudy = {
      starOpacity: 0.4,
      magPenalty: 2.0,
      hazeOpacity: 0.35,
      twinkleBoost: 1.6,
      constellationOpacity: 0.5,
    };

    const combined = combineSkyAttenuation(cloudy, daylight);
    assert.ok(combined.starOpacity >= 0.04 && combined.starOpacity < cloudy.starOpacity);
    assert.ok(combined.magPenalty > cloudy.magPenalty && combined.magPenalty <= 6.0);
    assert.equal(combined.hazeOpacity, cloudy.hazeOpacity);
    assert.equal(combined.twinkleBoost, cloudy.twinkleBoost);
    assert.equal(getTwilightPhaseLabel('civil', 'vi'), 'Chạng vạng dân dụng');
    assert.equal(getTwilightPhaseLabel('nautical', 'en'), 'Nautical Twilight');
  });
});

describe('Equatorial Coordinate Grid Engine', () => {
  it('generates 12 RA meridians, 5 Dec parallels, and accurate celestial pole altitudes', () => {
    const date = new Date('2026-11-25T14:00:00Z');
    const hanoiGrid = computeEquatorialGrid(date, HANOI);

    assert.equal(hanoiGrid.meridians.length, 12);
    assert.equal(hanoiGrid.parallels.length, 5);
    assert.equal(hanoiGrid.parallels.filter((p) => p.isEquator).length, 1);
    assert.equal(hanoiGrid.poles.length, 2);

    const ncpHanoi = hanoiGrid.poles.find((p) => p.id === 'NCP')!;
    const scpHanoi = hanoiGrid.poles.find((p) => p.id === 'SCP')!;
    assert.ok(
      Math.abs(ncpHanoi.alt - HANOI.latitude) < 0.05,
      `Expected NCP alt ~ ${HANOI.latitude}, got ${ncpHanoi.alt}`
    );
    assert.ok(
      Math.abs(scpHanoi.alt + HANOI.latitude) < 0.05,
      `Expected SCP alt ~ ${-HANOI.latitude}, got ${scpHanoi.alt}`
    );

    const sydneyGrid = computeEquatorialGrid(date, SYDNEY);
    const scpSydney = sydneyGrid.poles.find((p) => p.id === 'SCP')!;
    assert.ok(
      Math.abs(scpSydney.alt - Math.abs(SYDNEY.latitude)) < 0.05,
      `Expected Southern SCP alt ~ ${Math.abs(SYDNEY.latitude)}, got ${scpSydney.alt}`
    );
  });
});

describe('Sky Image Capture Helpers', () => {
  it('builds clean ASCII PNG filenames for 2D and 3D views', () => {
    const sampleDate = new Date(2026, 10, 25, 21, 5, 9);
    const vnLoc: ObserverLocation = {
      name: 'Hà Nội — Thiên văn',
      latitude: 21.0285,
      longitude: 105.8542,
    };

    const file2d = buildCaptureFilename(vnLoc, sampleDate, '2D_PLANETARIUM');
    const file3d = buildCaptureFilename(vnLoc, sampleDate, '3D_ZENITH_DOME');

    assert.equal(file2d, 'aetheria-2d-ha-noi-thien-van-20261125-210509.png');
    assert.equal(file3d, 'aetheria-3d-ha-noi-thien-van-20261125-210509.png');
  });

  it('formats bilingual watermark metadata with and without a locked target', () => {
    const star: Star = {
      id: 'sirius',
      name: 'Sirius',
      mag: -1.46,
      ra: 101.28,
      dec: -16.71,
      alt: 42.5,
      az: 145.2,
    };

    const withTarget = formatCaptureWatermarkInfo(
      {
        location: HANOI,
        date: new Date('2026-11-25T14:30:00Z'),
        viewMode: '3D_ZENITH_DOME',
        selectedStar: star,
        twilightPhase: 'night',
        sunAltDeg: -35,
        showAtmosphereTwilight: true,
        nightVisionMode: false,
      },
      'vi'
    );

    assert.equal(withTarget.brand, 'AETHERIA');
    assert.equal(withTarget.modeBadge, 'VÒM 3D');
    assert.ok(withTarget.locationLine.includes('21.03°N'));
    assert.ok(withTarget.timeLine.includes('Đêm thiên văn'));
    assert.ok(withTarget.targetLine?.includes('Mục tiêu: Sirius'));
    assert.ok(withTarget.targetLine?.includes('Alt 42.5°'));

    const noTarget = formatCaptureWatermarkInfo(
      {
        location: SYDNEY,
        date: new Date('2026-11-25T02:00:00Z'),
        viewMode: '2D_PLANETARIUM',
        selectedStar: null,
        twilightPhase: 'daylight',
        sunAltDeg: 62,
        showAtmosphereTwilight: true,
        nightVisionMode: false,
      },
      'en'
    );

    assert.equal(noTarget.modeBadge, '2D SKY MAP');
    assert.ok(noTarget.locationLine.includes('33.86°S'));
    assert.ok(noTarget.timeLine.includes('Daylight'));
    assert.equal(noTarget.targetLine, null);
  });
});
