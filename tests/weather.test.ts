import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeatherSample,
  CLEAR_SKY_ATTENUATION,
  computeSeeingMetrics,
  computeSkyVisualAttenuation,
  interpolateWeatherAtDate,
} from '../src/utils/seeingModel.ts';
import { parseOpenMeteoResponse } from '../src/services/openMeteo.ts';
import type { WeatherForecastData } from '../src/types/weather.ts';

describe('seeingModel', () => {
  it('scores a pristine clear sky as excellent with sub-arcsecond seeing', () => {
    const metrics = computeSeeingMetrics({
      cloudCover: 0,
      cloudLow: 0,
      cloudMid: 0,
      cloudHigh: 0,
      humidity: 38,
      windSpeedKmh: 5,
      visibilityKm: 30,
      temperatureC: 18,
      dewPointC: 6,
    });

    assert.equal(metrics.seeingScore, 100);
    assert.equal(metrics.seeingGrade, 'excellent');
    assert.equal(metrics.seeingArcsec, 0.8);
    assert.equal(metrics.dewSpreadC, 12);
  });

  it('scores dense low overcast with high wind and mist as poor', () => {
    const metrics = computeSeeingMetrics({
      cloudCover: 100,
      cloudLow: 100,
      cloudMid: 80,
      cloudHigh: 40,
      humidity: 96,
      windSpeedKmh: 45,
      visibilityKm: 2,
      temperatureC: 15,
      dewPointC: 14.5,
    });

    assert.ok(metrics.seeingScore < 20);
    assert.equal(metrics.seeingGrade, 'poor');
    assert.ok(metrics.seeingArcsec >= 3.8);
  });

  it('penalizes low stratus clouds more heavily than high thin cirrus at equal coverage', () => {
    const lowCloud = computeSeeingMetrics({
      cloudCover: 50,
      cloudLow: 80,
      cloudMid: 0,
      cloudHigh: 0,
      humidity: 55,
      windSpeedKmh: 10,
      visibilityKm: 20,
      temperatureC: 20,
      dewPointC: 12,
    });
    const highCloud = computeSeeingMetrics({
      cloudCover: 50,
      cloudLow: 0,
      cloudMid: 0,
      cloudHigh: 80,
      humidity: 55,
      windSpeedKmh: 10,
      visibilityKm: 20,
      temperatureC: 20,
      dewPointC: 12,
    });

    assert.ok(lowCloud.seeingScore < highCloud.seeingScore);
  });

  it('returns neutral attenuation when disabled or missing sample', () => {
    const sample = buildWeatherSample(
      {
        cloudCover: 85,
        cloudLow: 70,
        cloudMid: 40,
        cloudHigh: 10,
        humidity: 90,
        windSpeedKmh: 20,
        visibilityKm: 8,
        temperatureC: 18,
        dewPointC: 16.5,
      },
      1_700_000_000_000
    );

    assert.deepEqual(computeSkyVisualAttenuation(sample, false), CLEAR_SKY_ATTENUATION);
    assert.deepEqual(computeSkyVisualAttenuation(null, true), CLEAR_SKY_ATTENUATION);

    const active = computeSkyVisualAttenuation(sample, true);
    assert.ok(active.starOpacity < 0.45);
    assert.ok(active.magPenalty > 2.5);
    assert.ok(active.hazeOpacity > 0.35);
    assert.ok(active.twinkleBoost > 1.5);
    assert.ok(active.constellationOpacity < 0.5);
  });

  it('interpolates hourly forecast linearly and handles out-of-range dates', () => {
    const t0 = Date.UTC(2026, 10, 25, 18, 0, 0);
    const t1 = Date.UTC(2026, 10, 25, 19, 0, 0);
    const s0 = buildWeatherSample(
      {
        cloudCover: 10,
        cloudLow: 0,
        cloudMid: 10,
        cloudHigh: 20,
        humidity: 50,
        windSpeedKmh: 8,
        visibilityKm: 24,
        temperatureC: 22,
        dewPointC: 12,
      },
      t0
    );
    const s1 = buildWeatherSample(
      {
        cloudCover: 70,
        cloudLow: 40,
        cloudMid: 60,
        cloudHigh: 40,
        humidity: 70,
        windSpeedKmh: 16,
        visibilityKm: 12,
        temperatureC: 20,
        dewPointC: 14,
      },
      t1
    );

    const forecast: WeatherForecastData = {
      latitude: 21.03,
      longitude: 105.85,
      fetchedAtMs: t0,
      timezoneAbbreviation: 'GMT+7',
      current: s0,
      hourly: [s0, s1],
    };

    const atExact = interpolateWeatherAtDate(forecast, new Date(t0), true, t0);
    assert.equal(atExact.isOutOfRange, false);
    assert.equal(atExact.isForecastSynced, false);
    assert.equal(atExact.sample.cloudCover, 10);

    const atMidpoint = interpolateWeatherAtDate(forecast, new Date(t0 + 1_800_000), true, t0);
    assert.equal(atMidpoint.isOutOfRange, false);
    assert.equal(atMidpoint.isForecastSynced, true);
    assert.equal(atMidpoint.sample.cloudCover, 40);
    assert.equal(atMidpoint.sample.humidity, 60);
    assert.equal(atMidpoint.sample.windSpeedKmh, 12);

    const outOfRange = interpolateWeatherAtDate(
      forecast,
      new Date(t1 + 7_200_000),
      true,
      t0
    );
    assert.equal(outOfRange.isOutOfRange, true);
    assert.equal(outOfRange.isForecastSynced, false);
    assert.deepEqual(outOfRange.attenuation, CLEAR_SKY_ATTENUATION);
    assert.equal(outOfRange.sample.cloudCover, s0.cloudCover);
  });
});

describe('openMeteo parser', () => {
  it('parses a valid Open-Meteo response and converts unix seconds & visibility meters', () => {
    const parsed = parseOpenMeteoResponse(
      {
        timezone_abbreviation: 'GMT+7',
        current: {
          time: 1795592700,
          cloud_cover: 25,
          cloud_cover_low: 5,
          cloud_cover_mid: 20,
          cloud_cover_high: 40,
          relative_humidity_2m: 62,
          wind_speed_10m: 9.4,
          visibility: 21500,
          temperature_2m: 21.2,
          dew_point_2m: 13.5,
        },
        hourly: {
          time: [1795590000, 1795593600],
          cloud_cover: [20, 40],
          cloud_cover_low: [0, 10],
          cloud_cover_mid: [10, 30],
          cloud_cover_high: [30, 50],
          relative_humidity_2m: [60, 68],
          wind_speed_10m: [8.0, 12.0],
          visibility: [24000, 18000],
          temperature_2m: [22.0, 20.5],
          dew_point_2m: [13.0, 14.0],
        },
      },
      21.0285,
      105.8542,
      1_795_592_700_000
    );

    assert.equal(parsed.timezoneAbbreviation, 'GMT+7');
    assert.equal(parsed.current.timestampMs, 1795592700 * 1000);
    assert.equal(parsed.current.visibilityKm, 21.5);
    assert.equal(parsed.hourly.length, 2);
    assert.equal(parsed.hourly[1].cloudCover, 40);
    assert.equal(parsed.hourly[1].visibilityKm, 18);
  });

  it('safely defaults null fields inside Open-Meteo arrays', () => {
    const parsed = parseOpenMeteoResponse(
      {
        current: {
          time: 1795592700,
          cloud_cover: null,
          visibility: null,
        },
        hourly: {
          time: [1795590000],
          cloud_cover: [null],
          cloud_cover_low: [null],
          cloud_cover_mid: [null],
          cloud_cover_high: [null],
          relative_humidity_2m: [null],
          wind_speed_10m: [null],
          visibility: [null],
          temperature_2m: [null],
          dew_point_2m: [null],
        },
      },
      0,
      0
    );

    assert.equal(parsed.current.cloudCover, 0);
    assert.equal(parsed.current.visibilityKm, 24);
    assert.equal(parsed.hourly[0].humidity, 60);
    assert.equal(parsed.hourly[0].seeingGrade, 'excellent');
  });

  it('rejects malformed payloads lacking hourly timestamps', () => {
    assert.throws(() => parseOpenMeteoResponse(null, 0, 0));
    assert.throws(() => parseOpenMeteoResponse({}, 0, 0));
    assert.throws(() => parseOpenMeteoResponse({ hourly: { time: [] } }, 0, 0));
  });
});
