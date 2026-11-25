import React from 'react';
import type { Star } from '../../types/celestial';

function renderMoonDisk(phaseAngle: number, gradId: string, clipId: string) {
  const norm = ((phaseAngle % 360) + 360) % 360;
  const rad = (norm * Math.PI) / 180;
  const rx = Math.max(0.2, Math.abs(Math.cos(rad)) * 10);
  const isWaxing = norm <= 180;
  const sweepTerminator = norm <= 90 || (norm > 180 && norm <= 270) ? 0 : 1;
  const sweepLimb = isWaxing ? 1 : 0;
  const litPath =
    norm < 4 || norm > 356
      ? ''
      : `M 16 6 A 10 10 0 0 ${sweepLimb} 16 26 A ${rx.toFixed(2)} 10 0 0 ${sweepTerminator} 16 6 Z`;

  return (
    <>
      <defs>
        <radialGradient id={gradId} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="16" cy="16" r="10" />
        </clipPath>
      </defs>
      <circle cx="16" cy="16" r="10" fill="#1e293b" stroke="#64748b" strokeWidth="0.7" />
      <g clipPath={`url(#${clipId})`}>
        {litPath && <path d={litPath} fill={`url(#${gradId})`} />}
        <circle cx="12.5" cy="12" r="2.1" fill="#475569" opacity="0.28" />
        <circle cx="19" cy="14.5" r="2.6" fill="#475569" opacity="0.24" />
        <circle cx="15" cy="20" r="1.8" fill="#475569" opacity="0.26" />
      </g>
    </>
  );
}

export function renderSolarGlyph(star: Star, gradId: string, clipId: string): React.ReactNode {
  const meta = star.solarSystemData!;
  if (meta.bodyId === 'sun') {
    return (
      <>
        <defs>
          <radialGradient id={gradId} cx="42%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="55%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>
        <g stroke="#fde047" strokeWidth="1.35" strokeLinecap="round" opacity="0.85">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={16 + Math.cos(rad) * 10.6}
                y1={16 + Math.sin(rad) * 10.6}
                x2={16 + Math.cos(rad) * 13.8}
                y2={16 + Math.sin(rad) * 13.8}
              />
            );
          })}
        </g>
        <circle cx="16" cy="16" r="9.2" fill={`url(#${gradId})`} />
      </>
    );
  }
  if (meta.bodyId === 'moon') {
    return renderMoonDisk(meta.moonPhaseAngle ?? 180, gradId, clipId);
  }
  if (meta.bodyId === 'saturn') {
    const tilt = Math.abs(meta.ringTiltDeg ?? -18);
    const ry = Math.max(2.3, Math.min(4.8, (tilt / 27) * 4.8));
    return (
      <>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <g transform="rotate(-16 16 16)">
          <path d={`M 2 16 A 14 ${ry} 0 0 1 30 16`} fill="none" stroke="#fde68a" strokeWidth="2.4" opacity="0.7" />
        </g>
        <circle cx="16" cy="16" r="7.2" fill={`url(#${gradId})`} />
        <ellipse cx="16" cy="16" rx="7.0" ry="1.4" fill="#d97706" opacity="0.28" />
        <g transform="rotate(-16 16 16)">
          <path d={`M 2 16 A 14 ${ry} 0 0 0 30 16`} fill="none" stroke="#fef3c7" strokeWidth="2.4" opacity="0.92" />
        </g>
      </>
    );
  }
  if (meta.bodyId === 'jupiter') {
    return (
      <>
        <defs>
          <clipPath id={clipId}><circle cx="16" cy="16" r="9.8" /></clipPath>
        </defs>
        <circle cx="16" cy="16" r="9.8" fill="#fed7aa" />
        <g clipPath={`url(#${clipId})`}>
          <rect x="6" y="9.5" width="20" height="2.4" fill="#c2410c" opacity="0.55" />
          <rect x="6" y="14.2" width="20" height="3.0" fill="#9a3412" opacity="0.6" />
          <rect x="6" y="19.8" width="20" height="2.2" fill="#c2410c" opacity="0.48" />
          <ellipse cx="19.5" cy="18.2" rx="2.6" ry="1.6" fill="#ea580c" stroke="#ffedd5" strokeWidth="0.4" />
        </g>
      </>
    );
  }
  if (meta.bodyId === 'mars') {
    return (
      <>
        <defs>
          <radialGradient id={gradId} cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="65%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="9.4" fill={`url(#${gradId})`} />
        <ellipse cx="16" cy="7.9" rx="3.4" ry="1.3" fill="#f8fafc" opacity="0.88" />
        <path d="M 11 16 Q 15 13 20 18 Q 16 21 11 18 Z" fill="#7f1d1d" opacity="0.42" />
      </>
    );
  }
  if (meta.bodyId === 'uranus') {
    return (
      <>
        <ellipse cx="16" cy="16" rx="4.2" ry="13.2" transform="rotate(14 16 16)" fill="none" stroke="#a5f3fc" strokeWidth="1.2" opacity="0.7" />
        <circle cx="16" cy="16" r="8.2" fill="#67e8f9" />
        <circle cx="13.5" cy="13.5" r="3" fill="#cffafe" opacity="0.45" />
      </>
    );
  }
  if (meta.bodyId === 'neptune') {
    return (
      <>
        <defs>
          <radialGradient id={gradId} cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="9.2" fill={`url(#${gradId})`} />
        <path d="M 10 13.5 Q 16 12 22 14" fill="none" stroke="#dbeafe" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="13.5" cy="18.2" rx="2.3" ry="1.2" fill="#172554" opacity="0.55" />
      </>
    );
  }
  const isVenus = meta.bodyId === 'venus';
  return (
    <>
      <defs>
        <radialGradient id={gradId} cx="36%" cy="34%" r="68%">
          <stop offset="0%" stopColor={isVenus ? '#fef9c3' : '#f1f5f9'} />
          <stop offset="70%" stopColor={isVenus ? '#fde047' : '#94a3b8'} />
          <stop offset="100%" stopColor={isVenus ? '#ca8a04' : '#475569'} />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="9.2" fill={`url(#${gradId})`} />
      {!isVenus && (
        <g fill="#475569" opacity="0.35">
          <circle cx="13" cy="13" r="1.8" />
          <circle cx="19" cy="17.5" r="2.1" />
          <circle cx="14.5" cy="20" r="1.3" />
        </g>
      )}
    </>
  );
}
