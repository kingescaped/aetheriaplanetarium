import * as Astronomy from 'astronomy-engine';
import type { ObserverLocation } from '../types/celestial.ts';
import type { ParsedTleElements, TleRecord } from '../types/satellite.ts';
import { degToRad, getGMST, getJulianDate, normalizeDeg, radToDeg } from './astronomy.ts';
import { clamp } from './seeingModel.ts';

const MU_EARTH = 398600.4418;
const R_EARTH_EQ = 6378.137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);
const J2_EARTH = 1.08262668e-3;
const AU_KM = 149597870.7;

export interface PropagatedSatelliteState {
  alt: number;
  az: number;
  ra: number;
  dec: number;
  rangeKm: number;
  altitudeKm: number;
  velocityKms: number;
  subLatDeg: number;
  subLonDeg: number;
  periodMin: number;
  inclinationDeg: number;
  isSunlit: boolean;
  mag: number;
}

function tleEpochToMs(year2: number, dayOfYear: number): number {
  const fullYear = year2 >= 57 ? 1900 + year2 : 2000 + year2;
  return Date.UTC(fullYear, 0, 1, 0, 0, 0, 0) + (dayOfYear - 1) * 86400_000;
}

export function parseTleElements(line1: string, line2: string): ParsedTleElements {
  const noradId = parseInt(line1.slice(2, 7).trim(), 10);
  const year2 = parseInt(line1.slice(18, 20).trim(), 10);
  const dayOfYear = parseFloat(line1.slice(20, 32).trim());

  const inclinationDeg = parseFloat(line2.slice(8, 16).trim());
  const raanDeg = parseFloat(line2.slice(17, 25).trim());
  const eccentricity = parseFloat(`0.${line2.slice(26, 33).trim()}`);
  const argPerigeeDeg = parseFloat(line2.slice(34, 42).trim());
  const meanAnomalyDeg = parseFloat(line2.slice(43, 51).trim());
  const meanMotionRevPerDay = parseFloat(line2.slice(52, 63).trim());

  return {
    noradId,
    epochMs: tleEpochToMs(year2, dayOfYear),
    inclinationDeg,
    raanDeg,
    eccentricity,
    argPerigeeDeg,
    meanAnomalyDeg,
    meanMotionRevPerDay,
  };
}

function solveKepler(meanAnomalyRad: number, eccentricity: number): number {
  let m = meanAnomalyRad % (Math.PI * 2);
  if (m > Math.PI) m -= Math.PI * 2;
  if (m < -Math.PI) m += Math.PI * 2;

  let eccAnomaly = m + eccentricity * Math.sin(m);
  for (let i = 0; i < 6; i++) {
    const f = eccAnomaly - eccentricity * Math.sin(eccAnomaly) - m;
    const fp = 1 - eccentricity * Math.cos(eccAnomaly);
    eccAnomaly -= f / fp;
  }
  return eccAnomaly;
}

export function computeSunDirectionEci(date: Date): [number, number, number] {
  const sunAu = Astronomy.GeoVector(Astronomy.Body.Sun, date, true);
  const dist = Math.hypot(sunAu.x, sunAu.y, sunAu.z);
  if (dist <= 0) return [1, 0, 0];
  return [sunAu.x / dist, sunAu.y / dist, sunAu.z / dist];
}

function isEciSunlit(
  rEciKm: [number, number, number],
  sunDirUnit: [number, number, number]
): boolean {
  const dot = rEciKm[0] * sunDirUnit[0] + rEciKm[1] * sunDirUnit[1] + rEciKm[2] * sunDirUnit[2];
  if (dot >= 0) return true;

  const rSq = rEciKm[0] * rEciKm[0] + rEciKm[1] * rEciKm[1] + rEciKm[2] * rEciKm[2];
  return rSq - dot * dot > R_EARTH_EQ * R_EARTH_EQ;
}

export function propagateSatelliteAtDate(
  tle: TleRecord,
  date: Date,
  location: ObserverLocation,
  elementsOverride?: ParsedTleElements,
  sunDirOverride?: [number, number, number]
): PropagatedSatelliteState {
  const el = elementsOverride ?? parseTleElements(tle.line1, tle.line2);
  const n0 = (el.meanMotionRevPerDay * Math.PI * 2) / 86400;
  const a = Math.cbrt(MU_EARTH / (n0 * n0));
  const e = el.eccentricity;
  const p = a * (1 - e * e);

  const inc = degToRad(el.inclinationDeg);
  const cosI = Math.cos(inc);
  const sinI = Math.sin(inc);

  const j2Factor = 0.75 * n0 * J2_EARTH * Math.pow(R_EARTH_EQ / p, 2);
  const raanRate = -2 * j2Factor * cosI;
  const argPRate = j2Factor * (5 * cosI * cosI - 1);

  const dtSec = (date.getTime() - el.epochMs) / 1000;
  const raan = degToRad(el.raanDeg) + raanRate * dtSec;
  const argP = degToRad(el.argPerigeeDeg) + argPRate * dtSec;
  const meanAnomaly = degToRad(el.meanAnomalyDeg) + n0 * dtSec;

  const E = solveKepler(meanAnomaly, e);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const sqrtOneMinusE2 = Math.sqrt(1 - e * e);

  const rMag = a * (1 - e * cosE);
  const xOrb = a * (cosE - e);
  const yOrb = a * sqrtOneMinusE2 * sinE;
  const vFactor = Math.sqrt(MU_EARTH * a) / rMag;
  const velocityKms = Math.hypot(-vFactor * sinE, vFactor * sqrtOneMinusE2 * cosE);

  const cosO = Math.cos(raan);
  const sinO = Math.sin(raan);
  const cosW = Math.cos(argP);
  const sinW = Math.sin(argP);

  const px = cosO * cosW - sinO * sinW * cosI;
  const py = sinO * cosW + cosO * sinW * cosI;
  const pz = sinW * sinI;
  const qx = -cosO * sinW - sinO * cosW * cosI;
  const qy = -sinO * sinW + cosO * cosW * cosI;
  const qz = cosW * sinI;

  const xEci = px * xOrb + qx * yOrb;
  const yEci = py * xOrb + qy * yOrb;
  const zEci = pz * xOrb + qz * yOrb;

  const gmstRad = degToRad(getGMST(getJulianDate(date)));
  const cosG = Math.cos(gmstRad);
  const sinG = Math.sin(gmstRad);

  const xEcef = xEci * cosG + yEci * sinG;
  const yEcef = -xEci * sinG + yEci * cosG;
  const zEcef = zEci;

  const subLatRad = Math.atan2(zEcef, Math.hypot(xEcef, yEcef));
  const subLatDeg = radToDeg(subLatRad);
  const subLonDeg = ((radToDeg(Math.atan2(yEcef, xEcef)) + 540) % 360) - 180;
  const sinSubLat = Math.sin(subLatRad);
  const altitudeKm = rMag - R_EARTH_EQ * (1 - WGS84_F * sinSubLat * sinSubLat);

  const latRad = degToRad(location.latitude);
  const lonRad = degToRad(location.longitude);
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);

  const nPrime = R_EARTH_EQ / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  const obsXEcef = nPrime * cosLat * cosLon;
  const obsYEcef = nPrime * cosLat * sinLon;
  const obsZEcef = nPrime * (1 - WGS84_E2) * sinLat;

  const dx = xEcef - obsXEcef;
  const dy = yEcef - obsYEcef;
  const dz = zEcef - obsZEcef;
  const rangeKm = Math.max(1, Math.hypot(dx, dy, dz));

  const sTopo = sinLat * cosLon * dx + sinLat * sinLon * dy - cosLat * dz;
  const eTopo = -sinLon * dx + cosLon * dy;
  const zTopo = cosLat * cosLon * dx + cosLat * sinLon * dy + sinLat * dz;

  const alt = radToDeg(Math.asin(clamp(zTopo / rangeKm, -1, 1)));
  const az = normalizeDeg(radToDeg(Math.atan2(eTopo, -sTopo)));

  const obsXEci = obsXEcef * cosG - obsYEcef * sinG;
  const obsYEci = obsXEcef * sinG + obsYEcef * cosG;
  const dec = radToDeg(Math.asin(clamp((zEci - obsZEcef) / rangeKm, -1, 1)));
  const ra = normalizeDeg(radToDeg(Math.atan2(yEci - obsYEci, xEci - obsXEci)));

  const isSunlit = isEciSunlit(
    [xEci, yEci, zEci],
    sunDirOverride ?? computeSunDirectionEci(date)
  );
  const mag = Number(
    clamp(tle.baseMag + 5 * Math.log10(rangeKm / 500) + (isSunlit ? 0 : 4.5), -4.2, 6.5).toFixed(2)
  );

  return {
    alt,
    az,
    ra,
    dec,
    rangeKm,
    altitudeKm,
    velocityKms,
    subLatDeg,
    subLonDeg,
    periodMin: 1440 / el.meanMotionRevPerDay,
    inclinationDeg: el.inclinationDeg,
    isSunlit,
    mag,
  };
}
