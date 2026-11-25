import type { ObserverLocation, Star } from '../types/celestial.ts';
import type {
  SatellitePassPrediction,
  SatelliteTrackPoint,
  TleRecord,
} from '../types/satellite.ts';
import {
  computeSunDirectionEci,
  parseTleElements,
  propagateSatelliteAtDate,
  type PropagatedSatelliteState,
} from './satelliteOrbit.ts';

export { parseTleElements, propagateSatelliteAtDate, type PropagatedSatelliteState };

export function computeSatelliteBodies(
  tles: TleRecord[],
  date: Date,
  location: ObserverLocation,
  lang: 'vi' | 'en'
): Star[] {
  const baseMs = date.getTime();
  const sunDir = computeSunDirectionEci(date);
  return tles.map((tle) => {
    const el = parseTleElements(tle.line1, tle.line2);
    const state = propagateSatelliteAtDate(tle, date, location, el, sunDir);
    const track: SatelliteTrackPoint[] = [];

    for (let offsetSec = -360; offsetSec <= 360; offsetSec += 30) {
      const pt = propagateSatelliteAtDate(
        tle,
        new Date(baseMs + offsetSec * 1000),
        location,
        el,
        sunDir
      );
      track.push({ alt: pt.alt, az: pt.az, offsetMin: offsetSec / 60 });
    }

    return {
      id: `sat_${tle.id}`,
      name: lang === 'vi' ? tle.nameVi : tle.nameEn,
      properName: tle.nameEn,
      mag: state.mag,
      ra: state.ra,
      dec: state.dec,
      dist: Number((state.rangeKm / 9.461e12).toFixed(11)),
      con: lang === 'vi' ? 'Vệ tinh LEO' : 'LEO Orbit',
      color: tle.accentColor,
      alt: state.alt,
      az: state.az,
      bodyType: 'satellite',
      satelliteData: {
        id: tle.id,
        noradId: tle.noradId,
        nameEn: tle.nameEn,
        nameVi: tle.nameVi,
        subtitleEn: tle.subtitleEn,
        subtitleVi: tle.subtitleVi,
        altitudeKm: Number(state.altitudeKm.toFixed(1)),
        velocityKms: Number(state.velocityKms.toFixed(2)),
        rangeKm: Math.round(state.rangeKm),
        subLatDeg: Number(state.subLatDeg.toFixed(2)),
        subLonDeg: Number(state.subLonDeg.toFixed(2)),
        periodMin: Number(state.periodMin.toFixed(1)),
        inclinationDeg: Number(state.inclinationDeg.toFixed(2)),
        isSunlit: state.isSunlit,
        source: tle.source,
        tleRecord: tle,
        track,
      },
    };
  });
}

export function predictNextSatellitePass(
  tle: TleRecord,
  startDate: Date,
  location: ObserverLocation,
  maxHours = 24
): SatellitePassPrediction | null {
  const el = parseTleElements(tle.line1, tle.line2);
  const startMs = startDate.getTime();
  const endMs = startMs + maxHours * 3600_000;
  const coarseStepMs = 60_000;

  let inPass = false;
  let passStartMs = startMs;
  let peakMs = startMs;
  let maxAlt = -90;
  let peakAz = 0;
  let riseAz = 0;

  const sunDir = computeSunDirectionEci(startDate);
  for (let t = startMs; t <= endMs; t += coarseStepMs) {
    const s = propagateSatelliteAtDate(tle, new Date(t), location, el, sunDir);
    if (s.alt >= 0) {
      if (!inPass) {
        inPass = true;
        passStartMs = t;
        riseAz = s.az;
        peakMs = t;
        maxAlt = s.alt;
        peakAz = s.az;
      } else if (s.alt > maxAlt) {
        maxAlt = s.alt;
        peakMs = t;
        peakAz = s.az;
      }
    } else if (inPass) {
      if (maxAlt >= 10) {
        let refinedPeakMs = peakMs;
        let refinedMaxAlt = maxAlt;
        let refinedPeakAz = peakAz;
        let refinedSunlit = propagateSatelliteAtDate(tle, new Date(peakMs), location, el, sunDir).isSunlit;

        for (let rt = peakMs - 50_000; rt <= peakMs + 50_000; rt += 10_000) {
          const rs = propagateSatelliteAtDate(tle, new Date(rt), location, el, sunDir);
          if (rs.alt > refinedMaxAlt) {
            refinedMaxAlt = rs.alt;
            refinedPeakMs = rt;
            refinedPeakAz = rs.az;
            refinedSunlit = rs.isSunlit;
          }
        }

        return {
          riseTimeMs: passStartMs,
          riseAzDeg: Number(riseAz.toFixed(1)),
          peakTimeMs: refinedPeakMs,
          maxAltDeg: Number(refinedMaxAlt.toFixed(1)),
          peakAzDeg: Number(refinedPeakAz.toFixed(1)),
          setTimeMs: t,
          setAzDeg: Number(s.az.toFixed(1)),
          isSunlitAtPeak: refinedSunlit,
        };
      }
      inPass = false;
    }
  }

  return null;
}
