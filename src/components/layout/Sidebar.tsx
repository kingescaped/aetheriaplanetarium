import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Layers,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Compass,
  Star as StarIcon,
  Sparkles,
  Cloud,
  Sun,
  Sunset,
  Globe2,
  Orbit,
  X
} from 'lucide-react';
import { CelestialSettings, ObserverLocation, Star } from '../../types/celestial';
import type { TwilightState } from '../../types/atmosphere';
import { getTwilightPhaseLabel } from '../../utils/twilight';
import { Language, TRANSLATIONS, getConstellationName } from '../../utils/i18n';
import { PROMINENT_STARS } from '../../data/stars';
import { IOSNavigationBar } from './IOSNavigationBar';
import { IOSSwitch } from './IOSSwitch';
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack';
import { getFeaturedDeepSkyBodies } from '../../utils/deepSky';
import { CelestialBodyGlyph } from '../common/CelestialBodyGlyph';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  location: ObserverLocation;
  onLocationChange: (newLoc: ObserverLocation) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  settings: CelestialSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<CelestialSettings>>;
  onSelectStar: (star: Star) => void;
  selectedStar: Star | null;
  solarBodies?: Star[];
  deepSkyBodies?: Star[];
  twilightState?: TwilightState;
  lang?: Language;
}

const PRESET_OBSERVATORIES: ObserverLocation[] = [
  { name: 'Hanoi (Vietnam)', latitude: 21.0285, longitude: 105.8542 },
  { name: 'Ho Chi Minh City', latitude: 10.8231, longitude: 106.6297 },
  { name: 'Mauna Kea Observatory (Hawaii)', latitude: 19.8206, longitude: -155.4681 },
  { name: 'Atacama Desert (ALMA, Chile)', latitude: -23.029, longitude: -67.755 },
  { name: 'Royal Observatory Greenwich (UK)', latitude: 51.4769, longitude: -0.0005 },
  { name: 'Tokyo National Astronomical Obs', latitude: 35.6762, longitude: 139.6503 },
  { name: 'Sydney Observatory (Australia)', latitude: -33.8596, longitude: 151.2052 },
];

interface MobileSidebarOverlayProps {
  onClose: () => void;
  controlsTitle: string;
  backLabel: string;
  tabNavigation: React.ReactNode;
  tabContent: React.ReactNode;
}

const MobileSidebarOverlay: React.FC<MobileSidebarOverlayProps> = ({
  onClose,
  controlsTitle,
  backLabel,
  tabNavigation,
  tabContent,
}) => {
  const { handlers: swipeHandlers, style: swipeStyle, backdropOpacity } = useEdgeSwipeBack({
    onBack: onClose,
    edge: 'right',
    enabled: true,
  });

  return (
    <motion.div key="sidebar-mobile-overlay" className="md:hidden absolute inset-0 z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
        onClick={onClose}
        className="absolute inset-0 z-0"
      >
        <motion.div
          style={{ opacity: backdropOpacity }}
          className="w-full h-full bg-black/60 backdrop-blur-xs"
        />
      </motion.div>

      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        className="relative z-10 h-full w-80 sm:w-96 max-w-[88vw] flex pointer-events-auto"
      >
        <motion.div
          {...swipeHandlers}
          style={swipeStyle}
          className="relative w-full h-full flex flex-col glass-panel overflow-hidden border-r border-white/10 shadow-glass pl-[var(--sal)]"
        >
          <IOSNavigationBar
            title={controlsTitle}
            backLabel={backLabel}
            onBack={onClose}
          />
          <div className="flex flex-col flex-1 overflow-hidden">
            {tabNavigation}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs overscroll-contain touch-manipulation">
              {tabContent}
            </div>
          </div>
        </motion.div>
      </motion.aside>
    </motion.div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  location,
  onLocationChange,
  currentDate,
  onDateChange,
  settings,
  onSettingsChange,
  onSelectStar,
  selectedStar,
  solarBodies = [],
  deepSkyBodies = [],
  twilightState,
  lang = 'vi',
}) => {
  const [activeTab, setActiveTab] = useState<'observation' | 'time' | 'layers' | 'catalog'>('observation');
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 767px)');
    const handleChange = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    setIsMobileViewport(mql.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  // Time machine controls
  const handleTimeSpeed = (speed: number) => {
    onSettingsChange({ ...settings, timeSpeed: speed });
  };

  const handleResetNow = () => {
    onDateChange(new Date());
    onSettingsChange({ ...settings, timeSpeed: 1 });
  };

  const tabNavigation = (
    <div className="flex items-center justify-between p-1 bg-slate-950/60 border-b border-white/5 select-none shrink-0">
      <div className="grid grid-cols-4 gap-1 flex-1">
        <button
          onClick={() => setActiveTab('observation')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10.5px] font-medium transition-all ${activeTab === 'observation'
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <MapPin className="w-3.5 h-3.5 mb-0.5 shrink-0" />
          <span className="truncate max-w-full text-center leading-tight">{t.tabLocation}</span>
        </button>

        <button
          onClick={() => setActiveTab('time')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10.5px] font-medium transition-all ${activeTab === 'time'
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <Clock className="w-3.5 h-3.5 mb-0.5 shrink-0" />
          <span className="truncate max-w-full text-center leading-tight">{t.tabTime}</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10.5px] font-medium transition-all ${activeTab === 'layers'
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <Layers className="w-3.5 h-3.5 mb-0.5 shrink-0" />
          <span className="truncate max-w-full text-center leading-tight">{t.tabLayers}</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10.5px] font-medium transition-all ${activeTab === 'catalog'
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <StarIcon className="w-3.5 h-3.5 mb-0.5 shrink-0" />
          <span className="truncate max-w-full text-center leading-tight">{t.tabCatalog}</span>
        </button>
      </div>

      {/* Desktop Close Button */}
      <button
        onClick={onToggle}
        className="hidden md:flex p-1.5 ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer items-center justify-center shrink-0"
        title={lang === 'vi' ? 'Đóng bảng điều khiển' : 'Close Controls'}
        aria-label={lang === 'vi' ? 'Đóng bảng điều khiển' : 'Close Controls'}
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );

  const tabContent = (
    <>
      {/* TAB 1: LOCATION */}
      {activeTab === 'observation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-cyan-400 font-hud">
              {t.observerCoords}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">WGS84</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="sidebar-latitude" className="block text-[10px] text-slate-400 mb-1 font-hud">{t.latitude}</label>
              <input
                id="sidebar-latitude"
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                value={location.latitude}
                onChange={(e) =>
                  onLocationChange({
                    ...location,
                    latitude: parseFloat(e.target.value) || 0,
                    name: lang === 'vi' ? 'Tọa độ tùy chỉnh' : 'Custom Coordinates',
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg glass-input text-base md:text-xs font-mono"
              />
            </div>
            <div>
              <label htmlFor="sidebar-longitude" className="block text-[10px] text-slate-400 mb-1 font-hud">{t.longitude}</label>
              <input
                id="sidebar-longitude"
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                value={location.longitude}
                onChange={(e) =>
                  onLocationChange({
                    ...location,
                    longitude: parseFloat(e.target.value) || 0,
                    name: lang === 'vi' ? 'Tọa độ tùy chỉnh' : 'Custom Coordinates',
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg glass-input text-base md:text-xs font-mono"
              />
            </div>
          </div>

          {/* Preset Observatories */}
          <div className="pt-2">
            <label className="block text-[10px] text-slate-400 mb-2 font-hud uppercase">
              {t.worldObservatories}
            </label>
            <div className="space-y-1.5 pr-1">
              {PRESET_OBSERVATORIES.map((obs) => {
                const isSelected =
                  Math.abs(obs.latitude - location.latitude) < 0.01 &&
                  Math.abs(obs.longitude - location.longitude) < 0.01;
                return (
                  <button
                    key={obs.name}
                    onClick={() => onLocationChange(obs)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between ${isSelected
                      ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 shadow-glow-cyan'
                      : 'bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 text-slate-300'
                      }`}
                  >
                    <div>
                      <div className="font-medium text-xs text-white">{obs.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {obs.latitude.toFixed(2)}°, {obs.longitude.toFixed(2)}°
                      </div>
                    </div>
                    {isSelected && <MapPin className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIME MACHINE */}
      {activeTab === 'time' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-cyan-400 font-hud">
              {t.astronomicalEpoch}
            </span>
            <button
              onClick={handleResetNow}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-[10px] hover:bg-cyan-900"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t.syncNow}</span>
            </button>
          </div>

          {/* Date & Time Input */}
          <div className="space-y-2">
            <div>
              <label htmlFor="sidebar-epoch" className="block text-[10px] text-slate-400 mb-1 font-hud">{t.localTimestamp}</label>
              <input
                id="sidebar-epoch"
                type="datetime-local"
                value={new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000)
                  .toISOString()
                  .slice(0, 16)}
                onChange={(e) => {
                  const newD = new Date(e.target.value);
                  if (!isNaN(newD.getTime())) {
                    onDateChange(newD);
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded-lg glass-input text-base md:text-xs font-mono"
              />
            </div>
          </div>

          {/* Playback Controls & Warp Speeds */}
          <div className="pt-2">
            <label className="block text-[10px] text-slate-400 mb-2 font-hud uppercase">
              {t.celestialTimeWarp}
            </label>

            <div className="flex items-center justify-between gap-1 p-1 rounded-xl bg-slate-900/60 border border-white/5">
              <button
                onClick={() => handleTimeSpeed(-3600)}
                className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 ${settings.timeSpeed === -3600 ? 'text-cyan-400 bg-cyan-500/20' : ''
                  }`}
                title={lang === 'vi' ? 'Lùi 1 giờ / giây' : 'Reverse 1 hour / sec'}
                aria-label={lang === 'vi' ? 'Lùi 1 giờ / giây' : 'Reverse 1 hour / sec'}
              >
                <Rewind className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                onClick={() => handleTimeSpeed(settings.timeSpeed === 0 ? 1 : 0)}
                className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all shadow-glow-cyan"
                title={settings.timeSpeed === 0 ? (lang === 'vi' ? 'Tiếp tục thời gian thực' : 'Play Real Time') : (lang === 'vi' ? 'Tạm dừng thời gian' : 'Pause Time')}
                aria-label={settings.timeSpeed === 0 ? (lang === 'vi' ? 'Tiếp tục thời gian thực' : 'Play Real Time') : (lang === 'vi' ? 'Tạm dừng thời gian' : 'Pause Time')}
              >
                {settings.timeSpeed === 0 ? (
                  <Play className="w-4 h-4 fill-cyan-400" aria-hidden="true" />
                ) : (
                  <Pause className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              <button
                onClick={() => handleTimeSpeed(60)}
                className={`px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-[11px] font-mono ${settings.timeSpeed === 60 ? 'text-cyan-400 bg-cyan-500/20' : ''
                  }`}
                title={lang === 'vi' ? 'Tua nhanh 1 phút / giây' : '1 min / sec'}
                aria-label={lang === 'vi' ? 'Tua nhanh 1 phút / giây' : '1 min / sec'}
              >
                60x
              </button>

              <button
                onClick={() => handleTimeSpeed(3600)}
                className={`px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-[11px] font-mono ${settings.timeSpeed === 3600 ? 'text-cyan-400 bg-cyan-500/20' : ''
                  }`}
                title={lang === 'vi' ? 'Tua nhanh 1 giờ / giây' : '1 hour / sec'}
                aria-label={lang === 'vi' ? 'Tua nhanh 1 giờ / giây' : '1 hour / sec'}
              >
                <FastForward className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-2 text-center text-[10px] text-slate-400 font-mono">
              {t.currentRate}{' '}
              <span className="text-cyan-400 font-bold">
                {settings.timeSpeed === 0
                  ? t.paused
                  : settings.timeSpeed === 1
                    ? t.realTimeRate
                    : `${settings.timeSpeed}x ${t.speedUnit}`}
              </span>
            </div>

            {twilightState && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between text-[10.5px] font-mono">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <Sunset className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{getTwilightPhaseLabel(twilightState.phase, lang)}</span>
                </span>
                <span className="text-slate-400">
                  {t.sunAltitudeShort}: {twilightState.sunAltDeg >= 0 ? `+${twilightState.sunAltDeg.toFixed(1)}` : twilightState.sunAltDeg.toFixed(1)}°
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VISUALS & LAYERS */}
      {activeTab === 'layers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-cyan-400 font-hud">
              {t.skyLayersTitle}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Constellation Lines */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-200">{t.constellationLines}</span>
              </div>
              <IOSSwitch
                checked={settings.showConstellationLines}
                color="cyan"
                ariaLabel={t.constellationLines}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    showConstellationLines: checked,
                  }))
                }
              />
            </div>

            {/* Constellation Labels */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-200">{t.constellationLabels}</span>
              </div>
              <IOSSwitch
                checked={settings.showConstellationLabels}
                color="cyan"
                ariaLabel={t.constellationLabels}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    showConstellationLabels: checked,
                  }))
                }
              />
            </div>

            {/* Star Labels */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-200">{t.starLabels}</span>
              </div>
              <IOSSwitch
                checked={settings.showStarLabels}
                color="cyan"
                ariaLabel={t.starLabels}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    showStarLabels: checked,
                  }))
                }
              />
            </div>

            {/* Coordinate Grid Lines */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-slate-200">{t.gridLines}</span>
              </div>
              <IOSSwitch
                checked={settings.showGridLines}
                color="purple"
                ariaLabel={t.gridLines}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    showGridLines: checked,
                  }))
                }
              />
            </div>

            {/* Ground Horizon (Zenith Dome) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-200">{t.groundHorizon}</span>
              </div>
              <IOSSwitch
                checked={settings.showGroundHorizon}
                color="cyan"
                ariaLabel={t.groundHorizon}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    showGroundHorizon: checked,
                  }))
                }
              />
            </div>

            {/* Solar System Ephemeris Layer */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-2">
                <Sun className="w-4 h-4 text-amber-300" aria-hidden="true" />
                <span className="text-xs text-slate-200">{t.showSolarSystem}</span>
              </div>
              <IOSSwitch
                checked={settings.showSolarSystem}
                color="cyan"
                ariaLabel={t.showSolarSystem}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    showSolarSystem: checked,
                  }))
                }
              />
            </div>

            {/* Deep Sky Objects Layer */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-300" aria-hidden="true" />
                <span className="text-xs text-slate-200">{t.showDeepSky}</span>
              </div>
              <IOSSwitch
                checked={settings.showDeepSky}
                color="purple"
                ariaLabel={t.showDeepSky}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    showDeepSky: checked,
                  }))
                }
              />
            </div>

            {/* Ecliptic Line Layer */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-2">
                <Orbit className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span className="text-xs text-slate-200">{t.showEclipticLine}</span>
              </div>
              <IOSSwitch
                checked={settings.showEclipticLine}
                color="cyan"
                ariaLabel={t.showEclipticLine}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    showEclipticLine: checked,
                  }))
                }
              />
            </div>

            {/* Equatorial Coordinate Grid (RA / Dec) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-2">
                <Globe2 className="w-4 h-4 text-teal-400" aria-hidden="true" />
                <span className="text-xs text-slate-200">{t.showEquatorialGrid}</span>
              </div>
              <IOSSwitch
                checked={settings.showEquatorialGrid}
                color="emerald"
                ariaLabel={t.showEquatorialGrid}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    showEquatorialGrid: checked,
                  }))
                }
              />
            </div>

            {/* Daylight & Twilight Atmosphere Simulation */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-2">
                <Sunset className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span className="text-xs text-slate-200">{t.showAtmosphereTwilight}</span>
              </div>
              <IOSSwitch
                checked={settings.showAtmosphereTwilight}
                color="cyan"
                ariaLabel={t.showAtmosphereTwilight}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    showAtmosphereTwilight: checked,
                  }))
                }
              />
            </div>

            {/* Atmospheric Cloud & Haze Simulation */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-2">
                <Cloud className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                <span className="text-xs text-slate-200">{t.weatherSimulateSky}</span>
              </div>
              <IOSSwitch
                checked={settings.simulateSkyWeather}
                color="cyan"
                ariaLabel={t.weatherSimulateSky}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    simulateSkyWeather: checked,
                  }))
                }
              />
            </div>
          </div>

          {/* Magnitude Limit Slider */}
          <div className="pt-2">
            <div className="flex justify-between text-slate-300 mb-1">
              <label htmlFor="sidebar-mag-limit" className="text-[10px] text-slate-400 font-hud">{t.magnitudeThreshold}</label>
              <span className="text-[11px] font-mono text-cyan-400 font-bold">
                {settings.magnitudeLimit.toFixed(1)} mag
              </span>
            </div>
            <input
              id="sidebar-mag-limit"
              type="range"
              min="1.0"
              max="6.5"
              step="0.1"
              value={settings.magnitudeLimit}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                onSettingsChange((prev) => ({
                  ...prev,
                  magnitudeLimit: value,
                }));
              }}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer touch-manipulation"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
              <span>{t.brightestOnly}</span>
              <span>{t.nakedEyeLimit}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STAR CATALOG & QUICK NAV */}
      {activeTab === 'catalog' && (
        <div className="space-y-3">
          {solarBodies.length > 0 && (
            <div className="space-y-2 pb-2 border-b border-white/10">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-300 font-hud block">
                {t.solarSystemCatalogTitle}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {solarBodies.map((body) => {
                  const isSelected = selectedStar?.id === body.id;
                  return (
                    <button
                      key={body.id}
                      onClick={() => onSelectStar(body)}
                      className={`px-2 py-1.5 rounded-xl text-left transition-all border ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400/60 text-white'
                          : 'bg-slate-900/50 hover:bg-slate-800/70 border-white/10 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
                        <CelestialBodyGlyph star={body} size={16} />
                        <span className="truncate">{body.name}</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                        Alt {(body.alt ?? 0).toFixed(0)}°
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {deepSkyBodies.length > 0 && (
            <div className="space-y-2 pb-2 border-b border-white/10">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-purple-300 font-hud block">
                {t.deepSkyCatalogTitle}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {getFeaturedDeepSkyBodies(deepSkyBodies).map((dso) => {
                  const meta = dso.deepSkyData!;
                  const isSelected = selectedStar?.id === dso.id;
                  return (
                    <button
                      key={dso.id}
                      onClick={() => onSelectStar(dso)}
                      className={`px-2 py-1.5 rounded-xl text-left transition-all border ${
                        isSelected
                          ? 'bg-purple-500/20 border-purple-400/60 text-white'
                          : 'bg-slate-900/50 hover:bg-slate-800/70 border-white/10 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
                        <CelestialBodyGlyph star={dso} size={18} />
                        <span className="truncate">{meta.catalogCode}</span>
                      </div>
                      <div className="text-[9px] font-sans text-slate-400 truncate mt-0.5">
                        {lang === 'vi' ? meta.nameVi : meta.nameEn}
                      </div>
                      <div className="text-[9px] font-mono text-purple-300/90 mt-0.5">
                        Mag {dso.mag.toFixed(1)} • Alt {(dso.alt ?? 0).toFixed(0)}°
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-cyan-400 font-hud">
              {t.landmarksTitle}
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            {t.landmarksDesc}
          </p>

          <div className="space-y-1.5 pr-1">
            {PROMINENT_STARS.map((star) => {
              const isSelected = selectedStar?.id === star.id;
              const constellationName = getConstellationName(star.con, lang);
              return (
                <button
                  key={star.id}
                  onClick={() => onSelectStar(star as Star)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between ${isSelected
                    ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-400 text-white shadow-glow-cyan'
                    : 'bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 text-slate-300'
                    }`}
                >
                  <div>
                    <div className="font-semibold text-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                      <span>{star.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {constellationName} • {lang === 'vi' ? 'Cấp sao:' : 'Mag:'}{' '}
                      <span className="text-cyan-300">{star.mag}</span> • {star.dist} {lang === 'vi' ? 'năm as' : 'ly'}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[9px] text-slate-500 shrink-0 ml-2">
                    RA {star.ra.toFixed(1)}°<br />DEC {star.dec > 0 ? `+${star.dec.toFixed(1)}` : star.dec.toFixed(1)}°
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <AnimatePresence>
        {isMobileViewport && isOpen && (
          <MobileSidebarOverlay
            onClose={onToggle}
            controlsTitle={t.controlsTitle}
            backLabel={lang === 'vi' ? 'Bản đồ' : 'Map'}
            tabNavigation={tabNavigation}
            tabContent={tabContent}
          />
        )}
      </AnimatePresence>

      <aside
        className={`hidden md:flex absolute bottom-14 left-[max(1rem,var(--sal))] z-20 transition-all duration-300 ease-in-out pointer-events-auto ${isOpen
            ? 'w-80 sm:w-96 md:top-[calc(var(--header-h)+8px)] md:bottom-14'
            : 'md:w-11 md:top-[calc(var(--header-h)+8px)] md:bottom-auto md:h-auto'
          }`}
      >
        <div
          className={`relative w-full flex flex-col md:rounded-2xl glass-panel overflow-hidden border border-white/10 shadow-glass h-full ${!isOpen ? 'md:h-auto' : ''}`}
        >
          <div className="hidden md:flex flex-col flex-1 overflow-hidden">
            {isOpen ? (
              <>
                {tabNavigation}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs overscroll-contain touch-manipulation">
                  {tabContent}
                </div>
              </>
            ) : (
              /* Mini vertical icon bar when collapsed - Compact Dock (Desktop only) */
              <div className="py-2.5 flex flex-col items-center space-y-2">
                <button
                  onClick={() => {
                    setActiveTab('observation');
                    onToggle();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  title={t.tabLocation}
                  aria-label={t.tabLocation}
                >
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => {
                    setActiveTab('time');
                    onToggle();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  title={t.tabTime}
                  aria-label={t.tabTime}
                >
                  <Clock className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => {
                    setActiveTab('layers');
                    onToggle();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  title={t.tabLayers}
                  aria-label={t.tabLayers}
                >
                  <Layers className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => {
                    setActiveTab('catalog');
                    onToggle();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  title={t.tabCatalog}
                  aria-label={t.tabCatalog}
                >
                  <StarIcon className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
