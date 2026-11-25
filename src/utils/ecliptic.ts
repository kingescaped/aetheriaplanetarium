import * as Astronomy from 'astronomy-engine';
import type { ObserverLocation } from '../types/celestial.ts';
import type {
  EclipticMarker,
  EclipticOverlayData,
  EclipticPoint,
  EclipticTick,
} from '../types/deepSky.ts';
import {
  degToRad,
  equatorialToHorizontal,
  getLST,
  normalizeDeg,
  radToDeg,
} from './astronomy.ts';

const SEASONAL_POINTS: ReadonlyArray<{
  lonDeg: number;
  id: EclipticMarker['id'];
  labelEn: string;
  labelVi: string;
}> = [
  { lonDeg: 0, id: 'vernal', labelEn: 'Vernal Equinox 0°', labelVi: 'Xuân phân 0°' },
  { lonDeg: 90, id: 'summer', labelEn: 'Summer Solstice 90°', labelVi: 'Hạ chí 90°' },
  { lonDeg: 180, id: 'autumnal', labelEn: 'Autumnal Equinox 180°', labelVi: 'Thu phân 180°' },
  { lonDeg: 270, id: 'winter', labelEn: 'Winter Solstice 270°', labelVi: 'Đông chí 270°' },
];

export function getTrueObliquityDeg(date: Date): number {
  const info = Astronomy.e_tilt(Astronomy.MakeTime(date));
  return info.tobl;
}

export function eclipticToEquatorial(
  lonDeg: number,
  latDeg: number,
  obliquityDeg: number
): { ra: number; dec: number } {
  const lam = degToRad(lonDeg);
  const bet = degToRad(latDeg);
  const eps = degToRad(obliquityDeg);

  const sinDec =
    Math.sin(bet) * Math.cos(eps) + Math.cos(bet) * Math.sin(eps) * Math.sin(lam);
  const dec = radToDeg(Math.asin(Math.max(-1, Math.min(1, sinDec))));

  const y = Math.sin(lam) * Math.cos(eps) - Math.tan(bet) * Math.sin(eps);
  const x = Math.cos(lam);
  const ra = normalizeDeg(radToDeg(Math.atan2(y, x)));

  return { ra, dec };
}

export function equatorialToEclipticLatitude(
  raDeg: number,
  decDeg: number,
  obliquityDeg: number
): number {
  const ra = degToRad(raDeg);
  const dec = degToRad(decDeg);
  const eps = degToRad(obliquityDeg);

  const sinLat =
    Math.sin(dec) * Math.cos(eps) - Math.cos(dec) * Math.sin(eps) * Math.sin(ra);
  return radToDeg(Math.asin(Math.max(-1, Math.min(1, sinLat))));
}

function projectEclipticLongitude(
  lonDeg: number,
  obliquityDeg: number,
  latitude: number,
  lst: number
): EclipticPoint {
  const { ra, dec } = eclipticToEquatorial(lonDeg, 0, obliquityDeg);
  const { alt, az } = equatorialToHorizontal(ra, dec, latitude, lst);
  return {
    lonDeg,
    raDeg: ra,
    decDeg: dec,
    alt,
    az,
  };
}

export function computeEclipticOverlay(
  date: Date,
  location: ObserverLocation
): EclipticOverlayData {
  const obliquityDeg = getTrueObliquityDeg(date);
  const lst = getLST(date, location.longitude);

  const points: EclipticPoint[] = [];
  for (let lon = 0; lon <= 360; lon += 5) {
    points.push(projectEclipticLongitude(lon % 360, obliquityDeg, location.latitude, lst));
  }

  const ticks: EclipticTick[] = [];
  for (let lon = 0; lon < 360; lon += 30) {
    const base = projectEclipticLongitude(lon, obliquityDeg, location.latitude, lst);
    const next = projectEclipticLongitude((lon + 3) % 360, obliquityDeg, location.latitude, lst);
    ticks.push({
      ...base,
      nextRaDeg: next.raDeg,
      nextDecDeg: next.decDeg,
      nextAlt: next.alt,
      nextAz: next.az,
    });
  }

  const markers: EclipticMarker[] = SEASONAL_POINTS.map((sp) => ({
    ...projectEclipticLongitude(sp.lonDeg, obliquityDeg, location.latitude, lst),
    id: sp.id,
    labelEn: sp.labelEn,
    labelVi: sp.labelVi,
  }));

  return {
    obliquityDeg,
    points,
    ticks,
    markers,
  };
}
