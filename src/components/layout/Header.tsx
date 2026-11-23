import React from 'react';
import { Sparkles, Eye, Box, Search, Navigation2, Clock, User, Sliders } from 'lucide-react';
import { AetheriaStarLogo } from '../common/AetheriaLogo';
import { ViewMode, ObserverLocation } from '../../types/celestial';
import { Language, TRANSLATIONS } from '../../utils/i18n';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  location: ObserverLocation;
  currentDate: Date;
  onOpenSearch: () => void;
  onGetGeolocation: () => void;
  isLocating: boolean;
  onOpenAccount: () => void;
  onOpenControls: () => void;
  lang?: Language;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  location,
  currentDate,
  onOpenSearch,
  onGetGeolocation,
  isLocating,
  onOpenAccount,
  onOpenControls,
  lang = 'vi',
}) => {
  const t = TRANSLATIONS[lang];

  const formattedTime = currentDate.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formattedDate = currentDate.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header 
      className="fixed top-0 left-0 right-0 w-full shrink-0 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 z-40"
      style={{ 
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="w-full h-[56px] flex items-center justify-between px-4 relative">
        {/* Brand & Title: Clicking 'AETHERIA' triggers the Controls drawer! */}
        <button
          onClick={onOpenControls}
          className="flex items-center space-x-2 md:space-x-3 pointer-events-auto text-left group p-1.5 -ml-1.5 rounded-2xl hover:bg-white/5 active:scale-98 transition-all cursor-pointer"
          title={t.tapToOpenControls}
        >
          <div className="relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-indigo-500/30 to-purple-500/20 border border-cyan-400/40 shadow-glow-cyan backdrop-blur-md group-hover:border-cyan-300 transition-all">
            <AetheriaStarLogo className="w-5 h-5 md:w-6 md:h-6 animate-pulse-subtle group-hover:scale-110 transition-transform" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-emerald-400 rounded-full border-2 border-space-950 animate-ping" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-emerald-400 rounded-full border-2 border-space-950" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-xs md:text-base font-bold tracking-wider text-white uppercase font-sans group-hover:text-cyan-300 transition-colors flex items-center gap-1">
                <span>{t.brandTitle}</span>
                <span className="text-cyan-400 font-light text-[9px] md:text-xs tracking-widest px-1 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  {t.brandSubtitle}
                </span>
              </h1>
              <Sliders className="w-3 h-3 text-cyan-400/70 group-hover:text-cyan-300 transition-colors" />
            </div>
            <p className="hidden sm:flex text-[10px] md:text-[11px] text-slate-400 font-hud tracking-tight items-center gap-1">
              <span>{t.planetariumSim}</span>
            </p>
          </div>
        </button>

        {/* Center: View Switcher (Desktop only, Mobile uses BottomNav) */}
        <div className="hidden md:flex pointer-events-auto items-center p-1 rounded-2xl glass-panel shadow-2xl border border-white/10">
          <button
            onClick={() => setViewMode('2D_PLANETARIUM')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 ${
              viewMode === '2D_PLANETARIUM'
                ? 'bg-gradient-to-r from-cyan-500/30 to-blue-600/30 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t.mode2D}</span>
          </button>

          <button
            onClick={() => setViewMode('3D_ZENITH_DOME')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 relative ${
              viewMode === '3D_ZENITH_DOME'
                ? 'bg-gradient-to-r from-purple-500/30 via-indigo-500/30 to-cyan-500/30 text-purple-200 border border-purple-500/40 shadow-glow-purple'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-purple-400" />
            <span>{t.mode3D}</span>
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
            </span>
          </button>
        </div>

        {/* Right Controls: Search, Location, Clock HUD & Account Button */}
        <div className="flex items-center space-x-1.5 md:space-x-2.5 pointer-events-auto">
          {/* Search Star/Constellation Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center space-x-1.5 px-2.5 md:px-3 py-1.5 rounded-xl glass-panel text-slate-300 hover:text-white hover:border-cyan-500/30 text-xs font-hud transition-all group"
            title={t.searchPlaceholder}
          >
            <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="hidden lg:inline">{lang === 'vi' ? 'Tìm kiếm...' : 'Search...'}</span>
            <kbd className="hidden xl:inline-block px-1 py-0.2 text-[9px] bg-slate-800/80 border border-slate-700 rounded text-slate-400">
              {t.searchKbd}
            </kbd>
          </button>

          {/* Location Badge */}
          <button
            onClick={onGetGeolocation}
            disabled={isLocating}
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl glass-panel text-xs text-slate-300 hover:text-cyan-300 transition-all font-hud"
            title={t.gpsSync}
          >
            <Navigation2 className={`w-3.5 h-3.5 text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="text-[10px] text-slate-400 font-mono">
              {location.latitude.toFixed(1)}°, {location.longitude.toFixed(1)}°
            </span>
          </button>

          {/* Astronomical Clock HUD */}
          <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl glass-panel text-xs font-hud text-slate-200 border border-slate-700/50">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-white font-semibold text-[11px] md:text-xs">{formattedTime}</span>
          </div>

          {/* Account Button (Desktop) */}
          <button
            onClick={onOpenAccount}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-xl glass-panel text-cyan-400 hover:text-white hover:border-cyan-400/40 hover:shadow-glow-cyan transition-all"
            title={t.account}
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
