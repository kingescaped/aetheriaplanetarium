import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  X,
  Crosshair,
  Sparkles,
  Compass,
  Bookmark,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Navigation
} from 'lucide-react';
import { ObserverLocation, Star } from '../../types/celestial';
import { getSpectralColor } from '../../utils/astronomy';
import { Language, TRANSLATIONS, getConstellationName } from '../../utils/i18n';
import { soundFx } from '../../utils/audio';
import { computeBodyRiseSet } from '../../utils/solarSystem';
import {
  formatCelestialDistance,
  formatRiseSetClock,
  getMoonPhaseLabel,
} from '../../utils/solarSystemFormat';
import { formatAngularSize, getDeepSkyTypeLabel } from '../../utils/deepSkyFormat';
import { predictNextSatellitePass } from '../../utils/satellites';
import { CelestialBodyGlyph } from '../common/CelestialBodyGlyph';

interface StarBottomSheetProps {
  star: Star | null;
  isOpen: boolean;
  onClose: () => void;
  onFocusStar: (star: Star) => void;
  onJumpToDate?: (date: Date) => void;
  isFavorite: boolean;
  onToggleFavorite: (starId: string | number) => void;
  onOpenJournal?: (star: Star) => void;
  onResetOrientation?: () => void;
  onSetDirection?: (azimuth: number) => void;
  location?: ObserverLocation;
  currentDate?: Date;
  lang?: Language;
}

export const StarBottomSheet: React.FC<StarBottomSheetProps> = ({
  star,
  isOpen,
  onClose,
  onFocusStar,
  onJumpToDate,
  isFavorite,
  onToggleFavorite,
  onOpenJournal,
  onResetOrientation,
  onSetDirection,
  location,
  currentDate,
  lang = 'vi',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const dragControls = useDragControls();
  const t = TRANSLATIONS[lang];
  const solar = star?.solarSystemData;
  const dso = star?.deepSkyData;
  const sat = star?.satelliteData;
  const dateHourKey = currentDate
    ? `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}-${currentDate.getHours()}`
    : '';
  const riseSet = useMemo(() => {
    if (!solar || !location || !currentDate) return null;
    return computeBodyRiseSet(solar.bodyId, currentDate, location);
  }, [solar?.bodyId, dateHourKey, location?.latitude, location?.longitude]);
  const nextPass = useMemo(() => {
    if (!sat || !location || !currentDate) return null;
    return predictNextSatellitePass(sat.tleRecord, currentDate, location, 24);
  }, [sat?.id, sat?.tleRecord.line1, dateHourKey, location?.latitude, location?.longitude]);

  if (!isOpen || !star) return null;

  const spectralColor = star.color || getSpectralColor(star.spect);
  const constellationName = getConstellationName(star.con, lang);
  const subtitleText = solar
    ? lang === 'vi'
      ? solar.subtitleVi
      : solar.subtitleEn
    : sat
      ? `NORAD ${sat.noradId} • ${Math.round(sat.altitudeKm)} km`
      : dso
        ? `${dso.catalogCode} • ${getDeepSkyTypeLabel(dso.dsoType, lang)}`
        : constellationName;
  const distInfo = formatCelestialDistance(star, lang);

  const handleFocus = () => {
    soundFx.playTargetRayTrace();
    onFocusStar(star);
  };

  const handleToggleFav = () => {
    soundFx.playToggle(!isFavorite);
    onToggleFavorite(star.id);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        drag="y"
        dragControls={dragControls}
        dragListener={!isExpanded}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 60) {
            if (isExpanded) {
              soundFx.playModalTransition();
              setIsExpanded(false);
            } else {
              soundFx.playTabClick();
              onClose();
            }
          } else if (info.offset.y < -30) {
            soundFx.playModalTransition();
            setIsExpanded(true);
          }
        }}
        className="md:hidden absolute bottom-3 left-[max(0.625rem,var(--sal))] right-[max(0.625rem,var(--sar))] z-40 pointer-events-none select-none flex flex-col items-end"
      >
        <div id="star-sheet-ar-slot" className="pointer-events-auto mb-2 flex justify-end" />

        <div className="w-full rounded-2xl glass-panel border border-cyan-500/40 shadow-2xl overflow-hidden pointer-events-auto">
          <div
            onPointerDown={(e) => {
              if (isExpanded) dragControls.start(e);
            }}
            onClick={() => {
              soundFx.playModalTransition();
              setIsExpanded(!isExpanded);
            }}
            className="w-full py-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none"
          >
            <div className="w-9 h-1 rounded-full bg-cyan-400/40 hover:bg-cyan-400 transition-colors" />
          </div>

          <div
            onPointerDown={(e) => {
              if (isExpanded && !(e.target as HTMLElement).closest('button')) {
                dragControls.start(e);
              }
            }}
            className="px-3 py-1 flex items-center justify-between touch-none"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/20 shadow-glow-cyan"
                style={{
                  backgroundColor: `${spectralColor}18`,
                  borderColor: spectralColor
                }}
              >
                <CelestialBodyGlyph star={star} size={24} />
              </div>

              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white truncate font-sans">
                  {star.name || `Star #${star.id}`}
                </h3>
                <p className="text-[10px] text-cyan-400 font-mono truncate">
                  {subtitleText} • Mag {star.mag.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1 flex-shrink-0">
              {/* Nút yêu thích */}
              <button
                onClick={handleToggleFav}
                className={`p-1.5 rounded-lg transition-all ${isFavorite
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>

              {/* Nút thu gọn / mở rộng chi tiết */}
              <button
                onClick={() => {
                  soundFx.playModalTransition();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>

              {/* Nút đóng */}
              <button
                onClick={() => {
                  soundFx.playTabClick();
                  onClose();
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Hàng hành động gộp: La bàn đổi hướng (N, E, S, W, ZENITH) và Nút Chiếu Laser 3D trên cùng một hàng */}
          <div className="px-3 pb-2.5 pt-1 flex items-center justify-between gap-1.5">
            {/* Nhóm điều hướng N, E, S, W, ZENITH */}
            <div className="flex items-center space-x-0.5 p-0.5 rounded-xl bg-slate-900/80 border border-white/5 flex-shrink-0">
              <button
                onClick={() => {
                  soundFx.playTabClick();
                  onSetDirection?.(0);
                }}
                className="px-1.5 py-1 rounded-md text-[10px] font-mono font-bold text-slate-300 hover:text-cyan-300 active:bg-cyan-500/20"
                title="Hướng Bắc (0°)"
              >
                N
              </button>
              <button
                onClick={() => {
                  soundFx.playTabClick();
                  onSetDirection?.(90);
                }}
                className="px-1.5 py-1 rounded-md text-[10px] font-mono font-bold text-slate-300 hover:text-cyan-300 active:bg-cyan-500/20"
                title="Hướng Đông (90°)"
              >
                E
              </button>
              <button
                onClick={() => {
                  soundFx.playTabClick();
                  onSetDirection?.(180);
                }}
                className="px-1.5 py-1 rounded-md text-[10px] font-mono font-bold text-slate-300 hover:text-cyan-300 active:bg-cyan-500/20"
                title="Hướng Nam (180°)"
              >
                S
              </button>
              <button
                onClick={() => {
                  soundFx.playTabClick();
                  onSetDirection?.(270);
                }}
                className="px-1.5 py-1 rounded-md text-[10px] font-mono font-bold text-slate-300 hover:text-cyan-300 active:bg-cyan-500/20"
                title="Hướng Tây (270°)"
              >
                W
              </button>
              {onResetOrientation && (
                <button
                  onClick={() => {
                    soundFx.playTabClick();
                    onResetOrientation();
                  }}
                  className="flex items-center space-x-1 px-1.5 py-1 rounded-md text-[9px] font-hud text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 hover:bg-cyan-900 active:scale-95"
                  title="Ngửa góc nhìn lên đỉnh đầu (Zenith 90°)"
                >
                  <Navigation className="w-2.5 h-2.5 text-cyan-400" />
                  <span>ZENITH</span>
                </button>
              )}
            </div>

            {/* Nút Chiếu Laser 3D (Rút gọn vừa vặn) */}
            <button
              onClick={handleFocus}
              className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl bg-gradient-to-r from-cyan-500/25 via-purple-500/25 to-blue-500/25 border border-cyan-400/50 text-cyan-200 active:scale-98 transition-all shadow-glow-cyan text-[11px] font-semibold truncate"
            >
              <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse flex-shrink-0" />
              <span className="truncate">{t.targetRayTraceShort}</span>
            </button>
          </div>

          {isExpanded && (
            <div className="px-3 pb-3 pt-1 space-y-2 overflow-y-auto max-h-[42vh] text-xs font-sans animate-in fade-in duration-200 border-t border-white/5 touch-pan-y overscroll-contain">
              {/* Grid thông số vật lý */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {solar ? (
                  <div className="p-2 rounded-xl bg-slate-900/70 border border-white/5">
                    <div className="text-[9px] text-slate-400 font-hud uppercase">
                      {solar.moonPhaseName ? t.moonPhase : t.illumination}
                    </div>
                    <div className="text-[11px] font-bold font-mono text-cyan-300 mt-0.5 truncate">
                      {solar.moonPhaseName
                        ? getMoonPhaseLabel(solar.moonPhaseName, lang)
                        : solar.phaseFraction !== undefined
                          ? `${(solar.phaseFraction * 100).toFixed(1)}%`
                          : 'G2V'}
                    </div>
                  </div>
                ) : sat ? (
                  <div className="p-2 rounded-xl bg-slate-900/70 border border-white/5">
                    <div className="text-[9px] text-slate-400 font-hud uppercase">{t.satVelocity}</div>
                    <div className="text-[11px] font-bold font-mono text-emerald-300 mt-0.5 truncate">
                      {sat.velocityKms} km/s
                    </div>
                  </div>
                ) : dso ? (
                  <div className="p-2 rounded-xl bg-slate-900/70 border border-white/5">
                    <div className="text-[9px] text-slate-400 font-hud uppercase">{t.dsoType}</div>
                    <div className="text-[11px] font-semibold font-sans text-purple-200 mt-0.5 truncate">
                      {getDeepSkyTypeLabel(dso.dsoType, lang)}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-slate-900/70 border border-white/5">
                    <div className="text-[9px] text-slate-400 font-hud uppercase">{t.spectralClass}</div>
                    <div className="text-[11px] font-bold font-mono text-cyan-300 mt-0.5 flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: spectralColor }}
                      />
                      <span>{star.spect || 'Unknown'}</span>
                    </div>
                  </div>
                )}

                <div className="p-2 rounded-xl bg-slate-900/70 border border-white/5">
                  <div className="text-[9px] text-slate-400 font-hud uppercase">
                    {sat ? t.satRange : t.distance}
                  </div>
                  <div className="text-[11px] font-bold font-mono text-purple-300 mt-0.5">
                    {sat ? `${sat.rangeKm.toLocaleString()} km` : distInfo.primary}
                  </div>
                </div>
              </div>

              {sat && (
                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-1.5 font-mono text-[10px] text-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <span>{t.satAltitude}: <strong className="text-emerald-300">{sat.altitudeKm} km</strong></span>
                    <span className={sat.isSunlit ? 'text-amber-300' : 'text-slate-400'}>
                      {sat.isSunlit ? t.satSunlit : t.satShadow}
                    </span>
                  </div>
                  {nextPass ? (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                      <span className="text-cyan-200">
                        {formatRiseSetClock(nextPass.peakTimeMs, lang)} • {nextPass.maxAltDeg}°
                      </span>
                      {onJumpToDate && (
                        <button
                          type="button"
                          onClick={() => onJumpToDate(new Date(nextPass.peakTimeMs))}
                          className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-sans font-semibold text-[10px]"
                        >
                          {t.satJumpToPass}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-400 font-sans">{t.satNoPass24h}</div>
                  )}
                </div>
              )}

              {dso && (
                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/5 grid grid-cols-2 gap-1.5 font-mono text-[10px] text-slate-200">
                  <div className="truncate">
                    {t.catalogRef}: <span className="text-white">{dso.ngcCode || dso.catalogCode}</span>
                  </div>
                  <div className="truncate">
                    {t.angularSize}: <span className="text-cyan-300">{formatAngularSize(dso.sizeArcmin, lang)}</span>
                  </div>
                </div>
              )}

              {solar && (
                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/5 grid grid-cols-2 gap-1.5 font-mono text-[10px] text-slate-200">
                  {solar.phaseFraction !== undefined && solar.kind !== 'sun' && (
                    <div>
                      {t.illumination}: <span className="text-white font-bold">{(solar.phaseFraction * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  {solar.moonAgeDays !== undefined && (
                    <div>
                      {t.moonAge}: <span className="text-cyan-300">{solar.moonAgeDays} {t.daysUnit}</span>
                    </div>
                  )}
                  {solar.ringTiltDeg !== undefined && (
                    <div>
                      {t.ringTilt}: <span className="text-amber-300">{solar.ringTiltDeg}°</span>
                    </div>
                  )}
                  {riseSet && (
                    <>
                      <div>
                        {t.nextRise}: <span className="text-emerald-300">{formatRiseSetClock(riseSet.nextRiseMs, lang)}</span>
                      </div>
                      <div>
                        {t.nextSet}: <span className="text-purple-300">{formatRiseSetClock(riseSet.nextSetMs, lang)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tọa độ thiên văn */}
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-1 font-mono text-[10px]">
                <div className="text-[9px] text-slate-400 font-hud uppercase flex items-center justify-between">
                  <span>{t.celestialCoords}</span>
                  <Compass className="w-3 h-3 text-cyan-400" />
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-slate-200">
                  <div>RA: <span className="text-white">{star.ra.toFixed(2)}°</span></div>
                  <div>DEC: <span className="text-white">{star.dec > 0 ? `+${star.dec.toFixed(2)}` : star.dec.toFixed(2)}°</span></div>
                  <div>{t.altitude}: <span className="text-emerald-400 font-bold">{star.alt?.toFixed(1)}°</span></div>
                  <div>{t.azimuth}: <span className="text-cyan-300">{star.az?.toFixed(1)}°</span></div>
                </div>
              </div>

              {/* Ghi nhật ký */}
              {onOpenJournal && (
                <button
                  onClick={() => {
                    soundFx.playTabClick();
                    onOpenJournal(star);
                  }}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[11px] font-medium"
                >
                  <BookOpen className="w-3 h-3 text-purple-400" />
                  <span>{t.logToJournal}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
