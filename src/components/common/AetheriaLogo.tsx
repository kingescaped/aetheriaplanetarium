import React, { useId } from 'react';

interface AetheriaLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Official 8-Pointed Celestial Star Logo of Aetheria Planetarium
 * Vector definition matching public/pwa-icon.svg
 */
export const AetheriaStarLogo: React.FC<AetheriaLogoProps> = ({
  className = 'w-5 h-5',
  style,
}) => {
  const uid = useId();
  const glowId = `aetheriaStarGlow-${uid}`;
  const rayId = `aetheriaCrossRay-${uid}`;

  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#7dd3fc" />
          <stop offset="60%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={rayId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>

      {/* Ambient Celestial Flare */}
      <circle cx="256" cy="256" r="140" fill={`url(#${glowId})`} opacity="0.65" />

      {/* 8-Pointed Celestial Star of Aetheria */}
      <g>
        {/* Diagonal Subtle Rays */}
        <path
          d="M256 120 L272 240 L392 256 L272 272 L256 392 L240 272 L120 256 L240 240 Z"
          fill="#38bdf8"
          fillOpacity="0.55"
          transform="rotate(45 256 256)"
        />
        {/* Primary Cardinal Rays */}
        <path
          d="M256 48 L284 228 L464 256 L284 284 L256 464 L228 284 L48 256 L228 228 Z"
          fill={`url(#${rayId})`}
        />
        {/* Radiant White-Hot Core */}
        <circle cx="256" cy="256" r="18" fill="#ffffff" />
      </g>
    </svg>
  );
};
