import * as Astronomy from 'astronomy-engine';
import type { ObserverLocation } from '../types/celestial.ts';
import type { SkyVisualAttenuation } from '../types/weather.ts';
import type { TwilightPhase, TwilightState } from '../types/atmosphere.ts';
import { CLEAR_SKY_ATTENUATION, clamp } from './seeingModel.ts';

export const NIGHT_TWILIGHT_COLORS = {
  zenith: '#070f2b',
  mid: '#04091a',
  horizon: '#02050f',
  sunGlow: '#02050f',
} as const;

interface TwilightStop {
  sunAlt: number;
  zenith: string;
  mid: string;
  horizon: string;
  sunGlow: string;
  glowOpacity: number;
  starOpacity: number;
  magPenalty: number;
  conOpacity: number;
  brightness: number;
}

const TWILIGHT_STOPS: readonly TwilightStop[] = [
  {
    sunAlt: -18,
    zenith: '#070f2b',
    mid: '#04091a',
    horizon: '#02050f',
    sunGlow: '#02050f',
    glowOpacity: 0,
    starOpacity: 1.0,
    magPenalty: 0,
    conOpacity: 1.0,
    brightness: 0,
  },
  {
    sunAlt: -12,
    zenith: '#070f2b',
    mid: '#0b1636',
    horizon: '#1e284b',
    sunGlow: '#7c3aed',
    glowOpacity: 0.16,
    starOpacity: 0.82,
    magPenalty: 0.7,
    conOpacity: 0.85,
    brightness: 0.12,
  },
  {
    sunAlt: -6,
    zenith: '#091538',
    mid: '#16244f',
    horizon: '#6e3952',
    sunGlow: '#ea580c',
    glowOpacity: 0.44,
    starOpacity: 0.45,
    magPenalty: 2.0,
    conOpacity: 0.58,
    brightness: 0.36,
  },
  {
    sunAlt: 0,
    zenith: '#0e2554',
    mid: '#283b6e',
    horizon: '#c75c38',
    sunGlow: '#f97316',
    glowOpacity: 0.68,
    starOpacity: 0.16,
    magPenalty: 3.8,
    conOpacity: 0.32,
    brightness: 0.65,
  },
  {
    sunAlt: 4,
    zenith: '#153e7a',
    mid: '#326296',
    horizon: '#d98752',
    sunGlow: '#fbbf24',
    glowOpacity: 0.58,
    starOpacity: 0.08,
    magPenalty: 4.8,
    conOpacity: 0.22,
    brightness: 0.85,
  },
  {
    sunAlt: 18,
    zenith: '#144a96',
    mid: '#2b72bd',
    horizon: '#7cb5e4',
    sunGlow: '#fef08a',
    glowOpacity: 0.42,
    starOpacity: 0.04,
    magPenalty: 5.5,
    conOpacity: 0.16,
    brightness: 1.0,
  },
];

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function toHex(r: number, g: number, b: number): string {
  const rr = Math.round(clamp(r, 0, 255)).toString(16).padStart(2, '0');
  const gg = Math.round(clamp(g, 0, 255)).toString(16).padStart(2, '0');
  const bb = Math.round(clamp(b, 0, 255)).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpHex(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = parseHexRgb(hexA);
  const [r2, g2, b2] = parseHexRgb(hexB);
  return toHex(lerpNum(r1, r2, t), lerpNum(g1, g2, t), lerpNum(b1, b2, t));
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHexRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

export function computeSunHorizontal(
  date: Date,
  location: ObserverLocation
): { alt: number; az: number } {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  const eq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
  const az = ((hor.azimuth % 360) + 360) % 360;
  return { alt: hor.altitude, az };
}

export function classifyTwilightPhase(sunAltDeg: number): TwilightPhase {
  if (sunAltDeg > 0) return 'daylight';
  if (sunAltDeg > -6) return 'civil';
  if (sunAltDeg > -12) return 'nautical';
  if (sunAltDeg > -18) return 'astronomical';
  return 'night';
}

function interpolateStops(sunAltDeg: number): TwilightStop {
  if (sunAltDeg <= TWILIGHT_STOPS[0].sunAlt) return TWILIGHT_STOPS[0];
  const last = TWILIGHT_STOPS[TWILIGHT_STOPS.length - 1];
  if (sunAltDeg >= last.sunAlt) return last;

  for (let i = 0; i < TWILIGHT_STOPS.length - 1; i++) {
    const a = TWILIGHT_STOPS[i];
    const b = TWILIGHT_STOPS[i + 1];
    if (sunAltDeg >= a.sunAlt && sunAltDeg <= b.sunAlt) {
      const span = b.sunAlt - a.sunAlt;
      const t = span > 0 ? (sunAltDeg - a.sunAlt) / span : 0;
      return {
        sunAlt: sunAltDeg,
        zenith: lerpHex(a.zenith, b.zenith, t),
        mid: lerpHex(a.mid, b.mid, t),
        horizon: lerpHex(a.horizon, b.horizon, t),
        sunGlow: lerpHex(a.sunGlow, b.sunGlow, t),
        glowOpacity: Number(lerpNum(a.glowOpacity, b.glowOpacity, t).toFixed(3)),
        starOpacity: Number(lerpNum(a.starOpacity, b.starOpacity, t).toFixed(3)),
        magPenalty: Number(lerpNum(a.magPenalty, b.magPenalty, t).toFixed(2)),
        conOpacity: Number(lerpNum(a.conOpacity, b.conOpacity, t).toFixed(3)),
        brightness: Number(lerpNum(a.brightness, b.brightness, t).toFixed(3)),
      };
    }
  }
  return last;
}

export function computeTwilightState(
  date: Date,
  location: ObserverLocation,
  enabled: boolean
): TwilightState {
  const sun = computeSunHorizontal(date, location);
  const phase = classifyTwilightPhase(sun.alt);

  if (!enabled) {
    return {
      enabled: false,
      phase,
      sunAltDeg: sun.alt,
      sunAzDeg: sun.az,
      zenithColor: NIGHT_TWILIGHT_COLORS.zenith,
      midColor: NIGHT_TWILIGHT_COLORS.mid,
      horizonColor: NIGHT_TWILIGHT_COLORS.horizon,
      sunGlowColor: NIGHT_TWILIGHT_COLORS.sunGlow,
      sunGlowOpacity: 0,
      starOpacityFactor: 1,
      magPenalty: 0,
      constellationOpacityFactor: 1,
      skyBrightness: 0,
    };
  }

  const stop = interpolateStops(sun.alt);
  return {
    enabled: true,
    phase,
    sunAltDeg: sun.alt,
    sunAzDeg: sun.az,
    zenithColor: stop.zenith,
    midColor: stop.mid,
    horizonColor: stop.horizon,
    sunGlowColor: stop.sunGlow,
    sunGlowOpacity: stop.glowOpacity,
    starOpacityFactor: stop.starOpacity,
    magPenalty: stop.magPenalty,
    constellationOpacityFactor: stop.conOpacity,
    skyBrightness: stop.brightness,
  };
}

export function combineSkyAttenuation(
  weather: SkyVisualAttenuation | undefined,
  twilight: TwilightState
): SkyVisualAttenuation {
  const base = weather ?? CLEAR_SKY_ATTENUATION;
  if (!twilight.enabled) return base;

  return {
    starOpacity: Number(clamp(base.starOpacity * twilight.starOpacityFactor, 0.04, 1).toFixed(3)),
    magPenalty: Number(clamp(base.magPenalty + twilight.magPenalty, 0, 6.0).toFixed(2)),
    hazeOpacity: base.hazeOpacity,
    twinkleBoost: base.twinkleBoost,
    constellationOpacity: Number(
      clamp(base.constellationOpacity * twilight.constellationOpacityFactor, 0.12, 1).toFixed(3)
    ),
  };
}

export function getTwilightPhaseLabel(phase: TwilightPhase, lang: 'vi' | 'en'): string {
  switch (phase) {
    case 'daylight':
      return lang === 'vi' ? 'Ban ngày' : 'Daylight';
    case 'civil':
      return lang === 'vi' ? 'Chạng vạng dân dụng' : 'Civil Twilight';
    case 'nautical':
      return lang === 'vi' ? 'Chạng vạng hàng hải' : 'Nautical Twilight';
    case 'astronomical':
      return lang === 'vi' ? 'Chạng vạng thiên văn' : 'Astronomical Twilight';
    case 'night':
    default:
      return lang === 'vi' ? 'Đêm thiên văn' : 'Astronomical Night';
  }
}
