import React, { useMemo } from 'react';
import { X, Crosshair, Compass } from 'lucide-react';
import { Star, ObserverLocation } from '../../types/celestial';
import { Language, TRANSLATIONS, getConstellationName } from '../../utils/i18n';
import { computeBodyRiseSet } from '../../utils/solarSystem';
import {
  formatCelestialDistance,
  formatRiseSetClock,
  getMoonPhaseLabel,
} from '../../utils/solarSystemFormat';
import { formatAngularSize, getDeepSkyTypeLabel } from '../../utils/deepSkyFormat';
import { CelestialBodyGlyph } from '../common/CelestialBodyGlyph';
import { StarTelemetryHUD } from './StarTelemetryHUD';

interface InfoPanelProps {
  star: Star | null;
  onClose: () => void;
  onFocusStar: (star: Star) => void;
  location: ObserverLocation;
  currentDate: Date;
  lang?: Language;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  star,
  onClose,
  onFocusStar,
  location,
  currentDate,
  lang = 'vi',
}) => {
  const solar = star?.solarSystemData;
  const dso = star?.deepSkyData;
  const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}-${currentDate.getHours()}`;
  const riseSet = useMemo(() => {
    if (!solar) return null;
    return computeBodyRiseSet(solar.bodyId, currentDate, location);
  }, [solar?.bodyId, dateKey, location.latitude, location.longitude]);

  if (!star) return null;

  const t = TRANSLATIONS[lang];
  const constellationName = getConstellationName(star.con, lang);
  const distInfo = formatCelestialDistance(star, lang);

  // Spectral type color helper
  const getSpectralColor = (spect?: string) => {
    if (!spect) return '#93c5fd';
    const firstChar = spect.charAt(0).toUpperCase();
    switch (firstChar) {
      case 'O': return '#60a5fa'; // Blue
      case 'B': return '#93c5fd'; // Deep Blue-White
      case 'A': return '#f8fafc'; // White (Sirius/Vega)
      case 'F': return '#fef08a'; // Yellow-White (Procyon)
      case 'G': return '#fde047'; // Yellow (Sun/Capella)
      case 'K': return '#fb923c'; // Orange (Arcturus)
      case 'M': return '#f87171'; // Red (Betelgeuse)
      default: return '#38bdf8';
    }
  };

  const spectralColor = star.color || getSpectralColor(star.spect);

  return (
    <div className="absolute top-3 right-[max(1rem,var(--sar))] max-h-[calc(100%-var(--sab)-4.25rem)] overflow-y-auto overscroll-contain touch-manipulation z-20 w-80 md:w-96 space-y-3 pointer-events-auto transition-all animate-in fade-in slide-in-from-right duration-300">
      {/* 1. Main Star Info Card */}
      <div className="rounded-2xl glass-panel border border-white/10 shadow-glass overflow-hidden">
        {/* Header with Celestial Body Glyph */}
        <div className="relative p-4 pb-3 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg shrink-0"
                style={{
                  backgroundColor: `${spectralColor}18`,
                  borderColor: `${spectralColor}66`,
                  boxShadow: `0 0 20px ${spectralColor}44`,
                }}
              >
                <CelestialBodyGlyph star={star} size={32} />
              </div>

              <div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  {star.name || star.properName || `Star #${star.id}`}
                </h2>
                <div className="text-xs text-cyan-400 font-hud">
                  {solar
                    ? lang === 'vi'
                      ? solar.subtitleVi
                      : solar.subtitleEn
                    : dso
                      ? `${dso.catalogCode} • ${getDeepSkyTypeLabel(dso.dsoType, lang)}`
                      : star.con
                        ? `${t.constellation} ${constellationName}`
                        : t.deepSpace}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title={t.close}
              aria-label={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Star Physical Properties */}
        <div className="p-4 space-y-3 text-xs font-sans">
          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Magnitude */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
              <div className="text-[10px] text-slate-400 font-hud uppercase">{t.apparentMagnitude}</div>
              <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
                {star.mag > 0 ? `+${star.mag.toFixed(2)}` : star.mag.toFixed(2)} mag
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                {star.mag < 0 ? (lang === 'vi' ? 'Cực kỳ sáng' : 'Extremely Bright') : star.mag < 2 ? (lang === 'vi' ? 'Sao sáng rõ' : 'Bright Visible') : (lang === 'vi' ? 'Quan sát thiên văn' : 'Astronomical Target')}
              </div>
            </div>

            {/* Distance */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
              <div className="text-[10px] text-slate-400 font-hud uppercase">{t.distance}</div>
              <div className="text-sm font-bold font-mono text-purple-300 mt-0.5">
                {distInfo.primary}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                {distInfo.secondary}
              </div>
            </div>
          </div>

          {solar ? (
            <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-2">
              {solar.moonPhaseName && (
                <div className="flex items-center justify-between text-slate-200">
                  <span className="text-[10px] text-slate-400 font-hud uppercase">{t.moonPhase}</span>
                  <span className="font-sans text-xs font-semibold text-cyan-200">
                    {getMoonPhaseLabel(solar.moonPhaseName, lang)}
                  </span>
                </div>
              )}

              {solar.phaseFraction !== undefined && solar.kind !== 'sun' && (
                <div className="flex items-center justify-between text-slate-200">
                  <span className="text-[10px] text-slate-400 font-hud uppercase">{t.illumination}</span>
                  <span className="font-mono text-xs font-bold text-white">
                    {(solar.phaseFraction * 100).toFixed(1)}%
                    {solar.moonAgeDays !== undefined ? ` • ${solar.moonAgeDays} ${t.daysUnit}` : ''}
                  </span>
                </div>
              )}

              {solar.ringTiltDeg !== undefined && (
                <div className="flex items-center justify-between text-slate-200">
                  <span className="text-[10px] text-slate-400 font-hud uppercase">{t.ringTilt}</span>
                  <span className="font-mono text-xs text-amber-300">{solar.ringTiltDeg}°</span>
                </div>
              )}

              {riseSet && (
                <div className="pt-1.5 border-t border-white/5 grid grid-cols-2 gap-2 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px]">{t.nextRise}: </span>
                    <span className="text-emerald-300 font-semibold">
                      {formatRiseSetClock(riseSet.nextRiseMs, lang)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">{t.nextSet}: </span>
                    <span className="text-purple-300 font-semibold">
                      {formatRiseSetClock(riseSet.nextSetMs, lang)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : dso ? (
            <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-hud uppercase">{t.dsoType}</span>
                <span
                  className="px-2 py-0.5 rounded-md font-sans text-xs font-semibold border truncate"
                  style={{
                    backgroundColor: `${spectralColor}22`,
                    borderColor: `${spectralColor}55`,
                    color: spectralColor,
                  }}
                >
                  {getDeepSkyTypeLabel(dso.dsoType, lang)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[10px] text-slate-400 font-hud uppercase">{t.catalogRef}</span>
                <span className="font-mono text-xs text-white">
                  {dso.catalogCode}{dso.ngcCode ? ` • ${dso.ngcCode}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[10px] text-slate-400 font-hud uppercase">{t.angularSize}</span>
                <span className="font-mono text-xs text-cyan-200">{formatAngularSize(dso.sizeArcmin, lang)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[10px] text-slate-400 font-hud uppercase">{t.constellation}</span>
                <span className="font-sans text-xs text-slate-200">{constellationName}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-hud uppercase">{t.spectralClass}</span>
                <span
                  className="px-2 py-0.5 rounded-md font-mono text-xs font-bold border"
                  style={{
                    backgroundColor: `${spectralColor}22`,
                    borderColor: `${spectralColor}55`,
                    color: spectralColor,
                  }}
                >
                  {star.spect || 'Unknown'}
                </span>
              </div>

              {star.bayerFlamsteed && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[10px] text-slate-400 font-hud uppercase">{t.bayerFlamsteed}</span>
                  <span className="font-mono text-xs text-white">{star.bayerFlamsteed}</span>
                </div>
              )}
            </div>
          )}

          {/* Equatorial & Zenith Coordinates */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-2 font-mono">
            <div className="text-[10px] text-slate-400 font-hud uppercase flex items-center justify-between">
              <span>{t.celestialCoords}</span>
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 text-[10px]">RA (α): </span>
                <span className="text-slate-200">{star.ra.toFixed(2)}°</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">DEC (δ): </span>
                <span className="text-slate-200">{star.dec > 0 ? `+${star.dec.toFixed(2)}` : star.dec.toFixed(2)}°</span>
              </div>
            </div>

            {(star.alt !== undefined && star.az !== undefined) && (
              <div className="pt-1 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px]">{t.altitude}: </span>
                  <span className={star.alt > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {star.alt.toFixed(1)}° {star.alt > 0 ? `(${t.visible})` : `(${t.belowHorizon})`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">{t.azimuth}: </span>
                  <span className="text-slate-200">{star.az.toFixed(1)}°</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button: Target in 3D Zenith Dome */}
          <button
            onClick={() => onFocusStar(star)}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-400/40 text-cyan-200 hover:text-white transition-all shadow-glow-cyan text-xs font-semibold"
          >
            <Crosshair className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>{t.lockCameraRayTrace}</span>
          </button>
        </div>
      </div>

      {/* 2. Web/Desktop Requirement: Thẻ telemetry nằm ngay dưới thẻ thông tin sao */}
      <StarTelemetryHUD star={star} lang={lang} />
    </div>
  );
};
