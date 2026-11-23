import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { CelestialSettings, ObserverLocation, Star } from '../../types/celestial';
import { Language, TRANSLATIONS, getConstellationName } from '../../utils/i18n';
import { PROMINENT_STARS } from '../../data/stars';
import { IOSNavigationBar } from './IOSNavigationBar';
import { IOSSwitch } from './IOSSwitch';
import { MobilePageScreen } from './MobilePageScreen';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  location: ObserverLocation;
  onLocationChange: (newLoc: ObserverLocation) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  settings: CelestialSettings;
  onSettingsChange: (settings: CelestialSettings) => void;
  onSelectStar: (star: Star) => void;
  selectedStar: Star | null;
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
  lang = 'vi',
}) => {
  const [activeTab, setActiveTab] = useState<'observation' | 'time' | 'layers' | 'catalog'>('observation');
  const t = TRANSLATIONS[lang];

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
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10.5px] font-medium transition-all ${
            activeTab === 'observation'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 mb-0.5 shrink-0" />
          <span className="truncate max-w-full text-center leading-tight">{t.tabLocation}</span>
        </button>

        <button
          onClick={() => setActiveTab('time')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10.5px] font-medium transition-all ${
            activeTab === 'time'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Clock className="w-3.5 h-3.5 mb-0.5 shrink-0" />
          <span className="truncate max-w-full text-center leading-tight">{t.tabTime}</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10.5px] font-medium transition-all ${
            activeTab === 'layers'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5 mb-0.5 shrink-0" />
          <span className="truncate max-w-full text-center leading-tight">{t.tabLayers}</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10.5px] font-medium transition-all ${
            activeTab === 'catalog'
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
      >
        <X className="w-4 h-4" />
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
                      <label className="block text-[10px] text-slate-400 mb-1 font-hud">{t.latitude}</label>
                      <input
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
                        className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-hud">{t.longitude}</label>
                      <input
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
                        className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
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
                            className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between ${
                              isSelected
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
                      <label className="block text-[10px] text-slate-400 mb-1 font-hud">{t.localTimestamp}</label>
                      <input
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
                        className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
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
                        className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 ${
                          settings.timeSpeed === -3600 ? 'text-cyan-400 bg-cyan-500/20' : ''
                        }`}
                        title={lang === 'vi' ? 'Lùi 1 giờ / giây' : 'Reverse 1 hour / sec'}
                      >
                        <Rewind className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleTimeSpeed(settings.timeSpeed === 0 ? 1 : 0)}
                        className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all shadow-glow-cyan"
                        title={settings.timeSpeed === 0 ? (lang === 'vi' ? 'Tiếp tục thời gian thực' : 'Play Real Time') : (lang === 'vi' ? 'Tạm dừng thời gian' : 'Pause Time')}
                      >
                        {settings.timeSpeed === 0 ? (
                          <Play className="w-4 h-4 fill-cyan-400" />
                        ) : (
                          <Pause className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleTimeSpeed(60)}
                        className={`px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-[11px] font-mono ${
                          settings.timeSpeed === 60 ? 'text-cyan-400 bg-cyan-500/20' : ''
                        }`}
                        title={lang === 'vi' ? 'Tua nhanh 1 phút / giây' : '1 min / sec'}
                      >
                        60x
                      </button>

                      <button
                        onClick={() => handleTimeSpeed(3600)}
                        className={`px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-[11px] font-mono ${
                          settings.timeSpeed === 3600 ? 'text-cyan-400 bg-cyan-500/20' : ''
                        }`}
                        title={lang === 'vi' ? 'Tua nhanh 1 giờ / giây' : '1 hour / sec'}
                      >
                        <FastForward className="w-4 h-4" />
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
                        onChange={(checked) =>
                          onSettingsChange({
                            ...settings,
                            showConstellationLines: checked,
                          })
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
                        onChange={(checked) =>
                          onSettingsChange({
                            ...settings,
                            showConstellationLabels: checked,
                          })
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
                        onChange={(checked) =>
                          onSettingsChange({
                            ...settings,
                            showStarLabels: checked,
                          })
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
                        onChange={(checked) =>
                          onSettingsChange({
                            ...settings,
                            showGridLines: checked,
                          })
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
                        onChange={(checked) =>
                          onSettingsChange({
                            ...settings,
                            showGroundHorizon: checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Magnitude Limit Slider */}
                  <div className="pt-2">
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span className="text-[10px] text-slate-400 font-hud">{t.magnitudeThreshold}</span>
                      <span className="text-[11px] font-mono text-cyan-400 font-bold">
                        {settings.magnitudeLimit.toFixed(1)} mag
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="6.5"
                      step="0.1"
                      value={settings.magnitudeLimit}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          magnitudeLimit: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
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
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between ${
                            isSelected
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
      {/* Mobile Backdrop Overlay (Fades out smoothly in 300ms, no instant flash) */}
      <div
        onClick={onToggle}
        className={`md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Side Drawer Panel (Mobile: sliding left drawer max 88vw | Desktop: left panel) */}
      <aside
        className={`fixed md:absolute top-0 left-0 md:left-4 z-50 md:z-20 transition-all duration-300 ease-in-out flex pointer-events-auto sidebar-mobile-bound md:bottom-14 ${
          isOpen 
            ? 'w-80 sm:w-96 max-w-[88vw] translate-x-0 md:top-16' 
            : '-translate-x-full md:translate-x-0 md:w-11 md:top-16 md:h-auto pointer-events-none md:pointer-events-auto'
        }`}
      >
        {/* Container with Glassmorphism: Luôn giữ h-full trên Mobile trong toàn bộ 300ms trượt ra để triệt tiêu hiện tượng nháy khung hình */}
        <div className={`relative w-full flex flex-col md:rounded-2xl glass-panel overflow-hidden border-r md:border border-white/10 shadow-glass h-full ${!isOpen ? 'md:h-auto' : ''}`}>
          {/* Mobile iOS Navigation Bar (Without Close 'X' Button) */}
          <div className="md:hidden">
            <IOSNavigationBar
              title={t.controlsTitle}
              backLabel={lang === 'vi' ? 'Bản đồ' : 'Map'}
              onBack={onToggle}
            />
          </div>

          {/* Mobile: Luôn giữ nguyên nội dung khi trượt ra ngoài để tránh nháy khung hình */}
          <div className="md:hidden flex flex-col flex-1 overflow-hidden">
            {tabNavigation}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs overscroll-contain">
              {tabContent}
            </div>
          </div>

          {/* Desktop: Chuyển đổi giữa full panel và mini dock */}
          <div className="hidden md:flex flex-col flex-1 overflow-hidden">
            {isOpen ? (
              <>
                {tabNavigation}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs overscroll-contain">
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
                >
                  <MapPin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setActiveTab('time');
                    onToggle();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  title={t.tabTime}
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setActiveTab('layers');
                    onToggle();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  title={t.tabLayers}
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setActiveTab('catalog');
                    onToggle();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  title={t.tabCatalog}
                >
                  <StarIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
