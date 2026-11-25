import type { Star } from '../types/celestial.ts';
import type { MoonPhaseName } from '../types/solarSystem.ts';
import { TRANSLATIONS, type Language } from './i18n.ts';

const MOON_PHASE_LABEL_MAP: Record<MoonPhaseName, keyof typeof TRANSLATIONS.vi> = {
  new: 'moonPhaseNew',
  waxing_crescent: 'moonPhaseWaxingCrescent',
  first_quarter: 'moonPhaseFirstQuarter',
  waxing_gibbous: 'moonPhaseWaxingGibbous',
  full: 'moonPhaseFull',
  waning_gibbous: 'moonPhaseWaningGibbous',
  last_quarter: 'moonPhaseLastQuarter',
  waning_crescent: 'moonPhaseWaningCrescent',
};

export function formatCelestialDistance(
  star: Star,
  lang: Language
): { primary: string; secondary: string } {
  const t = TRANSLATIONS[lang];
  const solar = star.solarSystemData;
  if (!solar) {
    return {
      primary: star.dist ? `${star.dist.toLocaleString()} ${t.lightYears}` : 'N/A',
      secondary: star.dist
        ? `${(star.dist / 3.262).toFixed(1)} ${t.parsecs}`
        : t.deepSpace,
    };
  }

  if (solar.kind === 'moon') {
    return {
      primary: `${Math.round(solar.distanceKm).toLocaleString()} km`,
      secondary: `${solar.distanceAu.toFixed(5)} AU`,
    };
  }

  const millionKm = solar.distanceKm / 1_000_000;
  const kmLabel =
    millionKm >= 1000
      ? `${(millionKm / 1000).toFixed(2)} ${lang === 'vi' ? 'tỷ km' : 'B km'}`
      : `${millionKm.toFixed(1)} ${lang === 'vi' ? 'triệu km' : 'M km'}`;

  return {
    primary: `${solar.distanceAu.toFixed(3)} AU`,
    secondary: kmLabel,
  };
}

export function getMoonPhaseLabel(phase: MoonPhaseName, lang: Language): string {
  const key = MOON_PHASE_LABEL_MAP[phase];
  return TRANSLATIONS[lang][key] as string;
}

export function formatRiseSetClock(
  timestampMs: number | null | undefined,
  lang: Language
): string {
  if (timestampMs === null || timestampMs === undefined) {
    return '--:--';
  }
  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
  return new Date(timestampMs).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
