import { MESSIER_ENTRIES } from '../data/messierCatalog.ts';
import { NGC_HIGHLIGHT_ENTRIES } from '../data/ngcHighlights.ts';
import type { ObserverLocation, Star } from '../types/celestial.ts';
import type { DeepSkyTuple, DeepSkyType } from '../types/deepSky.ts';
import { equatorialToHorizontal, getLST } from './astronomy.ts';

export const DEEP_SKY_COLOR_BY_TYPE: Record<DeepSkyType, string> = {
  galaxy: '#c084fc',
  nebula: '#f472b6',
  planetary_nebula: '#2dd4bf',
  supernova_remnant: '#fb7185',
  globular_cluster: '#fbbf24',
  open_cluster: '#38bdf8',
};

export const ALL_DEEP_SKY_ENTRIES: readonly DeepSkyTuple[] = [
  ...MESSIER_ENTRIES,
  ...NGC_HIGHLIGHT_ENTRIES,
];

function buildDeepSkyStar(
  entry: DeepSkyTuple,
  latitude: number,
  lst: number,
  lang: 'vi' | 'en'
): Star {
  const [code, ngc, nameEn, nameVi, dsoType, con, raDeg, decDeg, mag, sizeArcmin, distLy, featured] = entry;
  const { alt, az } = equatorialToHorizontal(raDeg, decDeg, latitude, lst);
  const accentColor = DEEP_SKY_COLOR_BY_TYPE[dsoType];
  const primaryName = lang === 'vi' ? `${code} — ${nameVi}` : `${code} — ${nameEn}`;

  return {
    id: `dso_${code.toLowerCase().replace(/\s+/g, '')}`,
    name: primaryName,
    properName: lang === 'vi' ? `${nameEn} (${ngc})` : `${nameVi} (${ngc})`,
    mag,
    ra: raDeg,
    dec: decDeg,
    dist: distLy,
    con,
    color: accentColor,
    alt: Number(alt.toFixed(4)),
    az: Number(az.toFixed(4)),
    bodyType: 'dso',
    deepSkyData: {
      catalogCode: code,
      ngcCode: ngc,
      dsoType,
      nameEn,
      nameVi,
      sizeArcmin,
      featured: Boolean(featured),
      accentColor,
    },
  };
}

export function computeDeepSkyBodies(
  date: Date,
  location: ObserverLocation,
  lang: 'vi' | 'en' = 'vi'
): Star[] {
  const lst = getLST(date, location.longitude);
  return ALL_DEEP_SKY_ENTRIES.map((entry) =>
    buildDeepSkyStar(entry, location.latitude, lst, lang)
  );
}

export function getFeaturedDeepSkyBodies(bodies: Star[]): Star[] {
  return bodies
    .filter((b) => b.deepSkyData?.featured)
    .sort((a, b) => a.mag - b.mag);
}
