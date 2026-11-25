import type { ObserverLocation } from '../types/celestial.ts';
import type {
  EquatorialCurvePoint,
  EquatorialGridData,
  EquatorialMeridian,
  EquatorialParallel,
  EquatorialPole,
} from '../types/atmosphere.ts';
import { getLST, equatorialToHorizontal } from './astronomy.ts';

const RA_HOURS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;
const DEC_PARALLELS = [-60, -30, 0, 30, 60] as const;

function pickBestLabelPoint(
  points: EquatorialCurvePoint[],
  preferredDecDeg?: number,
  maxAbsDecForLabel = 90
): EquatorialCurvePoint | null {
  if (preferredDecDeg !== undefined) {
    const equatorCandidate = points.find((pt) => pt.decDeg === preferredDecDeg && pt.alt >= 6);
    if (equatorCandidate) return equatorCandidate;
  }

  let best: EquatorialCurvePoint | null = null;
  for (const pt of points) {
    if (pt.alt < 8 || Math.abs(pt.decDeg) > maxAbsDecForLabel) continue;
    if (!best || pt.alt > best.alt) {
      best = pt;
    }
  }
  return best;
}

export function computeEquatorialGrid(
  date: Date,
  location: ObserverLocation
): EquatorialGridData {
  const lst = getLST(date, location.longitude);

  const meridians: EquatorialMeridian[] = RA_HOURS.map((raHours) => {
    const raDeg = raHours * 15;
    const points: EquatorialCurvePoint[] = [];

    for (let decDeg = -84; decDeg <= 84; decDeg += 6) {
      const { alt, az } = equatorialToHorizontal(raDeg, decDeg, location.latitude, lst);
      points.push({ alt, az, raDeg, decDeg });
    }

    return {
      raHours,
      raDeg,
      label: `${raHours}h`,
      points,
      labelPoint: pickBestLabelPoint(points, 0, 54),
    };
  });

  const parallels: EquatorialParallel[] = DEC_PARALLELS.map((decDeg) => {
    const points: EquatorialCurvePoint[] = [];

    for (let raDeg = 0; raDeg <= 360; raDeg += 5) {
      const { alt, az } = equatorialToHorizontal(raDeg % 360, decDeg, location.latitude, lst);
      points.push({ alt, az, raDeg: raDeg % 360, decDeg });
    }

    const isEquator = decDeg === 0;
    const label = isEquator ? '0° Eq' : decDeg > 0 ? `+${decDeg}°` : `${decDeg}°`;

    return {
      decDeg,
      label,
      isEquator,
      points,
      labelPoint: pickBestLabelPoint(points),
    };
  });

  const ncpHor = equatorialToHorizontal(0, 90, location.latitude, lst);
  const scpHor = equatorialToHorizontal(0, -90, location.latitude, lst);

  const poles: EquatorialPole[] = [
    {
      id: 'NCP',
      label: 'NCP +90°',
      decDeg: 90,
      alt: ncpHor.alt,
      az: ncpHor.az,
    },
    {
      id: 'SCP',
      label: 'SCP -90°',
      decDeg: -90,
      alt: scpHor.alt,
      az: scpHor.az,
    },
  ];

  return { meridians, parallels, poles };
}
