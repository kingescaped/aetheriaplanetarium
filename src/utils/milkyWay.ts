import type { ObserverLocation } from '../types/celestial.ts';
import type {
  MilkyWayOverlayData,
  MilkyWaySample,
  TwilightState,
} from '../types/atmosphere.ts';
import type { SkyVisualAttenuation } from '../types/weather.ts';
import {
  degToRad,
  equatorialToHorizontal,
  getLST,
  normalizeDeg,
  radToDeg,
} from './astronomy.ts';
import { clamp } from './seeingModel.ts';

/**
 * Standard IAU / Hipparcos J2000 Equatorial -> Galactic rotation matrix rows
 * (Galactic Center at RA 266.405 deg, Dec -28.936 deg; NGP at RA 192.8595 deg, Dec +27.1283 deg)
 */
const AG_ROW0 = [-0.0548755604, -0.8734370902, -0.4838350155] as const;
const AG_ROW1 = [0.4941094279, -0.44482963, 0.7469822445] as const;
const AG_ROW2 = [-0.867666149, -0.1980763734, 0.4559837762] as const;

export function galacticToEquatorial(
  lDeg: number,
  bDeg: number
): { ra: number; dec: number } {
  const lRad = degToRad(lDeg);
  const bRad = degToRad(bDeg);

  const cosB = Math.cos(bRad);
  const gx = cosB * Math.cos(lRad);
  const gy = cosB * Math.sin(lRad);
  const gz = Math.sin(bRad);

  const xEq = AG_ROW0[0] * gx + AG_ROW1[0] * gy + AG_ROW2[0] * gz;
  const yEq = AG_ROW0[1] * gx + AG_ROW1[1] * gy + AG_ROW2[1] * gz;
  const zEq = AG_ROW0[2] * gx + AG_ROW1[2] * gy + AG_ROW2[2] * gz;

  const dec = radToDeg(Math.asin(clamp(zEq, -1, 1)));
  const ra = normalizeDeg(radToDeg(Math.atan2(yEq, xEq)));
  return { ra, dec };
}

export function equatorialToGalactic(
  raDeg: number,
  decDeg: number
): { l: number; b: number } {
  const raRad = degToRad(raDeg);
  const decRad = degToRad(decDeg);

  const cosD = Math.cos(decRad);
  const xEq = cosD * Math.cos(raRad);
  const yEq = cosD * Math.sin(raRad);
  const zEq = Math.sin(decRad);

  const gx = AG_ROW0[0] * xEq + AG_ROW0[1] * yEq + AG_ROW0[2] * zEq;
  const gy = AG_ROW1[0] * xEq + AG_ROW1[1] * yEq + AG_ROW1[2] * zEq;
  const gz = AG_ROW2[0] * xEq + AG_ROW2[1] * yEq + AG_ROW2[2] * zEq;

  const b = radToDeg(Math.asin(clamp(gz, -1, 1)));
  const l = normalizeDeg(radToDeg(Math.atan2(gy, gx)));
  return { l, b };
}

export function computeMilkyWayOverlay(
  date: Date,
  location: ObserverLocation
): MilkyWayOverlayData {
  const lst = getLST(date, location.longitude);
  const samples: MilkyWaySample[] = [];

  for (let lDeg = 0; lDeg < 360; lDeg += 5) {
    const lSigned = lDeg > 180 ? lDeg - 360 : lDeg;
    const bulgeFactor = Math.exp(-(lSigned * lSigned) / (2 * 25 * 25));
    const cygnusLobe = 0.28 * Math.exp(-((lSigned - 78) * (lSigned - 78)) / (2 * 20 * 20));
    const carinaLobe = 0.25 * Math.exp(-((lSigned + 72) * (lSigned + 72)) / (2 * 22 * 22));
    const anticenterMod = 0.34 + 0.16 * Math.cos(degToRad(lSigned));
    const intensity = clamp(anticenterMod + bulgeFactor * 0.56 + cygnusLobe + carinaLobe, 0.2, 1.0);
    const widthDeg = Number((8.5 + bulgeFactor * 8.5 + (cygnusLobe + carinaLobe) * 4).toFixed(2));

    const eqCenter = galacticToEquatorial(lDeg, 0);
    const eqNorth = galacticToEquatorial(lDeg, widthDeg);
    const eqSouth = galacticToEquatorial(lDeg, -widthDeg);

    const centerHor = equatorialToHorizontal(eqCenter.ra, eqCenter.dec, location.latitude, lst);
    const northHor = equatorialToHorizontal(eqNorth.ra, eqNorth.dec, location.latitude, lst);
    const southHor = equatorialToHorizontal(eqSouth.ra, eqSouth.dec, location.latitude, lst);

    samples.push({
      lDeg,
      alt: centerHor.alt,
      az: centerHor.az,
      northAlt: northHor.alt,
      northAz: northHor.az,
      southAlt: southHor.alt,
      southAz: southHor.az,
      widthDeg,
      intensity: Number(intensity.toFixed(3)),
      bulgeFactor: Number(bulgeFactor.toFixed(3)),
    });
  }

  return { samples };
}

export function computeMilkyWayVisibility(
  skyAttenuation?: SkyVisualAttenuation,
  twilightState?: TwilightState
): number {
  const weatherOpacity = skyAttenuation?.starOpacity ?? 1;
  const twilightFade = twilightState?.enabled
    ? clamp(1 - twilightState.skyBrightness * 1.45, 0, 1)
    : 1;
  return Number(clamp(weatherOpacity * twilightFade, 0, 1).toFixed(3));
}
