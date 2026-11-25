import * as Astronomy from 'astronomy-engine';
import type { ObserverLocation, Star } from '../types/celestial.ts';
import type {
  MoonPhaseName,
  SolarBodyKind,
  SolarBodyRiseSet,
  SolarSystemBodyId,
  SolarSystemBodyMeta,
} from '../types/solarSystem.ts';

interface SolarBodySpec {
  bodyId: SolarSystemBodyId;
  body: Astronomy.Body;
  kind: SolarBodyKind;
  nameEn: string;
  nameVi: string;
  subtitleEn: string;
  subtitleVi: string;
  accentColor: string;
}

const SYNODIC_MONTH_DAYS = 29.530588;

const SOLAR_BODY_SPECS: SolarBodySpec[] = [
  {
    bodyId: 'sun',
    body: Astronomy.Body.Sun,
    kind: 'sun',
    nameEn: 'Sun',
    nameVi: 'Mặt Trời',
    subtitleEn: 'G2V Star',
    subtitleVi: 'Ngôi sao chủ Hệ Mặt Trời',
    accentColor: '#fde047',
  },
  {
    bodyId: 'moon',
    body: Astronomy.Body.Moon,
    kind: 'moon',
    nameEn: 'Moon',
    nameVi: 'Mặt Trăng',
    subtitleEn: 'Natural Satellite',
    subtitleVi: 'Vệ tinh tự nhiên của Trái Đất',
    accentColor: '#e2e8f0',
  },
  {
    bodyId: 'mercury',
    body: Astronomy.Body.Mercury,
    kind: 'planet',
    nameEn: 'Mercury',
    nameVi: 'Sao Thủy',
    subtitleEn: 'Terrestrial Planet',
    subtitleVi: 'Hành tinh đất đá',
    accentColor: '#cbd5e1',
  },
  {
    bodyId: 'venus',
    body: Astronomy.Body.Venus,
    kind: 'planet',
    nameEn: 'Venus',
    nameVi: 'Sao Kim',
    subtitleEn: 'Terrestrial Planet',
    subtitleVi: 'Hành tinh đất đá',
    accentColor: '#fef3c7',
  },
  {
    bodyId: 'mars',
    body: Astronomy.Body.Mars,
    kind: 'planet',
    nameEn: 'Mars',
    nameVi: 'Sao Hỏa',
    subtitleEn: 'Terrestrial Planet',
    subtitleVi: 'Hành tinh đất đá',
    accentColor: '#fb7185',
  },
  {
    bodyId: 'jupiter',
    body: Astronomy.Body.Jupiter,
    kind: 'planet',
    nameEn: 'Jupiter',
    nameVi: 'Sao Mộc',
    subtitleEn: 'Gas Giant',
    subtitleVi: 'Hành tinh khí khổng lồ',
    accentColor: '#fdba74',
  },
  {
    bodyId: 'saturn',
    body: Astronomy.Body.Saturn,
    kind: 'planet',
    nameEn: 'Saturn',
    nameVi: 'Sao Thổ',
    subtitleEn: 'Ringed Gas Giant',
    subtitleVi: 'Hành tinh có vành đai',
    accentColor: '#fcd34d',
  },
  {
    bodyId: 'uranus',
    body: Astronomy.Body.Uranus,
    kind: 'planet',
    nameEn: 'Uranus',
    nameVi: 'Sao Thiên Vương',
    subtitleEn: 'Ice Giant',
    subtitleVi: 'Hành tinh băng khổng lồ',
    accentColor: '#67e8f9',
  },
  {
    bodyId: 'neptune',
    body: Astronomy.Body.Neptune,
    kind: 'planet',
    nameEn: 'Neptune',
    nameVi: 'Sao Hải Vương',
    subtitleEn: 'Ice Giant',
    subtitleVi: 'Hành tinh băng khổng lồ',
    accentColor: '#60a5fa',
  },
];

export function classifyMoonPhase(phaseAngleDeg: number): MoonPhaseName {
  const norm = ((phaseAngleDeg % 360) + 360) % 360;
  if (norm < 11.25 || norm >= 348.75) return 'new';
  if (norm < 78.75) return 'waxing_crescent';
  if (norm < 101.25) return 'first_quarter';
  if (norm < 168.75) return 'waxing_gibbous';
  if (norm < 191.25) return 'full';
  if (norm < 258.75) return 'waning_gibbous';
  if (norm < 281.25) return 'last_quarter';
  return 'waning_crescent';
}

function buildSolarBody(
  spec: SolarBodySpec,
  date: Date,
  observer: Astronomy.Observer,
  lang: 'vi' | 'en'
): Star {
  const eq = Astronomy.Equator(spec.body, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
  const illum = Astronomy.Illumination(spec.body, date);
  const distanceAu = eq.dist;
  const distanceKm = distanceAu * Astronomy.KM_PER_AU;

  const meta: SolarSystemBodyMeta = {
    bodyId: spec.bodyId,
    kind: spec.kind,
    nameEn: spec.nameEn,
    nameVi: spec.nameVi,
    subtitleEn: spec.subtitleEn,
    subtitleVi: spec.subtitleVi,
    accentColor: spec.accentColor,
    distanceAu,
    distanceKm,
    phaseFraction:
      spec.bodyId === 'sun' ? 1 : Number(illum.phase_fraction.toFixed(4)),
  };

  if (spec.bodyId === 'moon') {
    const moonPhaseAngle = ((Astronomy.MoonPhase(date) % 360) + 360) % 360;
    meta.moonPhaseAngle = Number(moonPhaseAngle.toFixed(2));
    meta.moonAgeDays = Number(
      ((moonPhaseAngle / 360) * SYNODIC_MONTH_DAYS).toFixed(1)
    );
    meta.moonPhaseName = classifyMoonPhase(moonPhaseAngle);
  }

  if (spec.bodyId === 'saturn' && typeof illum.ring_tilt === 'number') {
    meta.ringTiltDeg = Number(illum.ring_tilt.toFixed(1));
  }

  const mag =
    spec.bodyId === 'sun' && !Number.isFinite(illum.mag)
      ? -26.74
      : Number(illum.mag.toFixed(2));

  return {
    id: `solar_${spec.bodyId}`,
    name: lang === 'vi' ? spec.nameVi : spec.nameEn,
    properName: lang === 'vi' ? spec.nameEn : spec.subtitleEn,
    mag,
    ra: Number((((eq.ra * 15) % 360 + 360) % 360).toFixed(4)),
    dec: Number(eq.dec.toFixed(4)),
    alt: Number(hor.altitude.toFixed(4)),
    az: Number(hor.azimuth.toFixed(4)),
    color: spec.accentColor,
    spect: spec.kind === 'sun' ? 'G2V' : undefined,
    bodyType: spec.kind,
    solarSystemData: meta,
  };
}

export function computeSolarSystemBodies(
  date: Date,
  location: ObserverLocation,
  lang: 'vi' | 'en' = 'vi'
): Star[] {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  return SOLAR_BODY_SPECS.map((spec) => buildSolarBody(spec, date, observer, lang));
}

export function computeBodyRiseSet(
  bodyId: SolarSystemBodyId,
  date: Date,
  location: ObserverLocation
): SolarBodyRiseSet {
  const spec = SOLAR_BODY_SPECS.find((item) => item.bodyId === bodyId);
  if (!spec) {
    return { nextRiseMs: null, nextSetMs: null };
  }
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  const rise = Astronomy.SearchRiseSet(spec.body, observer, 1, date, 2);
  const set = Astronomy.SearchRiseSet(spec.body, observer, -1, date, 2);
  return {
    nextRiseMs: rise ? rise.date.getTime() : null,
    nextSetMs: set ? set.date.getTime() : null,
  };
}
