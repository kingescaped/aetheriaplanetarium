import React, { useId } from 'react';
import type { Star } from '../../types/celestial';
import type { DeepSkyType } from '../../types/deepSky';
import { getSpectralColor } from '../../utils/astronomy';
import { renderSolarGlyph } from './solarBodyGlyphs';

interface CelestialBodyGlyphProps {
  star: Star;
  size?: number;
  className?: string;
}

function renderDeepSkyGlyph(type: DeepSkyType, gradId: string): React.ReactNode {
  if (type === 'galaxy') {
    return (
      <>
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5d0fe" />
            <stop offset="45%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform="rotate(-28 16 16)">
          <ellipse cx="16" cy="16" rx="13" ry="5.5" fill={`url(#${gradId})`} />
          <ellipse cx="16" cy="16" rx="11.5" ry="4.4" fill="none" stroke="#e9d5ff" strokeWidth="1" opacity="0.7" />
          <circle cx="16" cy="16" r="2.6" fill="#ffffff" />
        </g>
      </>
    );
  }
  if (type === 'planetary_nebula') {
    return (
      <>
        <circle cx="16" cy="16" r="9.5" fill="#2dd4bf" opacity="0.22" />
        <circle cx="16" cy="16" r="8.4" fill="none" stroke="#2dd4bf" strokeWidth="2.2" />
        <circle cx="16" cy="16" r="5" fill="none" stroke="#a7f3d0" strokeWidth="1" opacity="0.75" />
        <circle cx="16" cy="16" r="1.6" fill="#ffffff" />
      </>
    );
  }
  if (type === 'supernova_remnant') {
    return (
      <>
        <path d="M 7 15 C 8 8, 22 6, 25 14" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
        <path d="M 25 18 C 22 25, 10 25, 7 18" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16" cy="16" r="4.5" fill="#fda4af" opacity="0.35" />
        <circle cx="16" cy="16" r="1.4" fill="#ffffff" />
      </>
    );
  }
  if (type === 'globular_cluster') {
    return (
      <>
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="11.5" fill={`url(#${gradId})`} />
        <g fill="#fef9c3">
          <circle cx="16" cy="16" r="2.3" />
          <circle cx="12" cy="11.5" r="1.1" />
          <circle cx="20.5" cy="12" r="1.0" />
          <circle cx="11.5" cy="20" r="1.0" />
          <circle cx="20" cy="20.5" r="1.1" />
          <circle cx="16" cy="9" r="0.9" />
          <circle cx="22.5" cy="16" r="0.9" />
          <circle cx="9.5" cy="16" r="0.9" />
        </g>
      </>
    );
  }
  if (type === 'open_cluster') {
    return (
      <>
        <circle cx="16" cy="16" r="10.5" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2.5 2.5" opacity="0.7" />
        <g fill="#bae6fd">
          <circle cx="16" cy="14" r="2.0" fill="#ffffff" />
          <circle cx="11.5" cy="12" r="1.4" />
          <circle cx="20.8" cy="12.5" r="1.5" />
          <circle cx="12.5" cy="19.5" r="1.6" />
          <circle cx="19.5" cy="19.8" r="1.3" />
          <circle cx="16" cy="22" r="1.1" />
        </g>
      </>
    );
  }
  return (
    <>
      <ellipse cx="14" cy="15" rx="8.5" ry="6.5" fill="#f472b6" opacity="0.35" />
      <ellipse cx="18.5" cy="17.5" rx="7.5" ry="5.5" fill="#38bdf8" opacity="0.3" />
      <circle cx="16" cy="16" r="3.6" fill="#fbcfe8" opacity="0.6" />
      <circle cx="15" cy="15.5" r="1.1" fill="#ffffff" />
      <circle cx="17.5" cy="16.8" r="0.9" fill="#ffffff" />
    </>
  );
}

function renderSatelliteGlyph(accentColor: string): React.ReactNode {
  return (
    <g>
      <line x1="5" y1="11" x2="27" y2="21" stroke={accentColor} strokeWidth="1.6" opacity="0.65" />
      <rect x="4" y="8" width="6.5" height="9" rx="1.2" transform="rotate(-24 7.25 12.5)" fill="#0284c7" stroke={accentColor} strokeWidth="1.1" />
      <rect x="21.5" y="15" width="6.5" height="9" rx="1.2" transform="rotate(-24 24.75 19.5)" fill="#0284c7" stroke={accentColor} strokeWidth="1.1" />
      <rect x="13" y="13" width="6" height="6" rx="1.5" fill="#f8fafc" stroke={accentColor} strokeWidth="1.3" />
      <circle cx="16" cy="16" r="1.4" fill={accentColor} className="animate-star-twinkle" />
    </g>
  );
}

export const CelestialBodyGlyph: React.FC<CelestialBodyGlyphProps> = ({
  star,
  size = 28,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const gradId = `glyph-g-${uid}`;
  const clipId = `glyph-c-${uid}`;

  let kind = 'fallback-star';
  let content: React.ReactNode;

  if (star.solarSystemData) {
    kind = star.solarSystemData.bodyId;
    content = renderSolarGlyph(star, gradId, clipId);
  } else if (star.satelliteData) {
    kind = 'satellite';
    content = renderSatelliteGlyph(star.color || '#34d399');
  } else if (star.deepSkyData) {
    kind = `dso:${star.deepSkyData.dsoType}`;
    content = renderDeepSkyGlyph(star.deepSkyData.dsoType, gradId);
  } else {
    const hasKnownStarShape = Boolean(star.spect && star.spect.trim().length > 0);
    kind = hasKnownStarShape ? 'star' : 'fallback-star';
    const color = star.color || getSpectralColor(star.spect);
    content = (
      <>
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="animate-star-twinkle">
          <circle cx="16" cy="16" r="11.5" fill={`url(#${gradId})`} />
          <path
            d="M16 3.5 L18.1 13.9 L28.5 16 L18.1 18.1 L16 28.5 L13.9 18.1 L3.5 16 L13.9 13.9 Z"
            fill={color}
            opacity="0.92"
          />
          <circle cx="16" cy="16" r="3.4" fill="#ffffff" />
        </g>
      </>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      data-glyph-kind={kind}
      className={`shrink-0 overflow-visible ${className}`}
    >
      {content}
    </svg>
  );
};
