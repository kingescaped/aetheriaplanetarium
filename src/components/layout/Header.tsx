import React from 'react';
import {
  Eye,
  Box,
  Search,
  Navigation2,
  Clock,
  User,
  Sliders,
  Camera,
  LogIn,
} from 'lucide-react';
import { AetheriaStarLogo } from '../common/AetheriaLogo';
import { SupremeAdminBadge } from '../common/SupremeAdminBadge';
import { TopSafeBar } from './TopSafeBar';
import { ViewMode, ObserverLocation } from '../../types/celestial';
import { UserProfile } from '../../types/account';
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
  onOpenCapture: () => void;
  user: UserProfile;
  isAdmin: boolean;
  onOpenAuth: () => void;
  weatherSlot?: React.ReactNode;
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
  onOpenCapture,
  user,
  isAdmin,
  onOpenAuth,
  weatherSlot,
  lang = 'vi',
}) => {
  const t = TRANSLATIONS[lang];

  const formattedTime = currentDate.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formattedCompactTime = currentDate.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const gpsTitle = `${t.geoGetCurrentBtn} — ${location.name} (${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°)`;

  return (
    <TopSafeBar bordered={false} padding="compact" innerClassName="md:safe-px">
      <div className="w-full h-[36px] md:h-full px-1.5 md:px-0 rounded-2xl md:rounded-none bg-[#0b1222] md:bg-transparent border border-white/[0.09] md:border-0 shadow-[0_2px_10px_rgba(0,0,0,0.35)] md:shadow-none flex items-center justify-between gap-1 sm:gap-1.5">
        {/* Brand & Title: Clicking 'AETHERIA' triggers the Controls drawer! */}
        <button
          onClick={onOpenControls}
          className="flex items-center space-x-1.5 md:space-x-3 pointer-events-auto text-left group p-0.5 -ml-0.5 md:p-1 md:-ml-1 rounded-xl md:rounded-2xl hover:bg-white/5 active:scale-98 transition-all cursor-pointer shrink-0"
          title={t.tapToOpenControls}
        >
          <div className="relative flex items-center justify-center w-[24px] h-[24px] sm:w-[26px] sm:h-[26px] md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-tr from-cyan-500/20 via-indigo-500/30 to-purple-500/20 border border-cyan-400/40 md:shadow-glow-cyan group-hover:border-cyan-300 transition-all shrink-0">
            <AetheriaStarLogo className="w-4 h-4 md:w-6 md:h-6 animate-pulse-subtle group-hover:scale-110 transition-transform" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-emerald-400 rounded-full border-2 border-space-950 animate-ping" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-emerald-400 rounded-full border-2 border-space-950" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1">
              <h1 className="text-[11px] sm:text-xs md:text-base font-bold tracking-wide md:tracking-wider text-white uppercase font-sans group-hover:text-cyan-300 transition-colors flex items-center gap-1">
                <span>{t.brandTitle}</span>
                <span className="hidden sm:inline-block text-cyan-400 font-light text-[9px] md:text-xs tracking-widest px-1 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  {t.brandSubtitle}
                </span>
              </h1>
              <Sliders className="hidden sm:block w-3 h-3 text-cyan-400/70 group-hover:text-cyan-300 transition-colors shrink-0" />
            </div>
            <p className="hidden sm:flex text-[10px] md:text-[11px] text-slate-400 font-hud tracking-tight items-center gap-1">
              <span>{t.planetariumSim}</span>
            </p>
          </div>
        </button>

        {/* Center: View Switcher (Desktop only, Mobile uses BottomNav) */}
        <div className="hidden md:flex pointer-events-auto items-center p-1 rounded-2xl bg-[#0c1224] shadow-2xl border border-white/10">
          <button
            onClick={() => setViewMode('2D_PLANETARIUM')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 cursor-pointer ${viewMode === '2D_PLANETARIUM'
              ? 'bg-gradient-to-r from-cyan-500/30 to-blue-600/30 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t.mode2D}</span>
          </button>

          <button
            onClick={() => setViewMode('3D_ZENITH_DOME')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 relative cursor-pointer ${viewMode === '3D_ZENITH_DOME'
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

        {/* Right Controls: Admin Badge, Search, Capture, GPS, Weather, Clock HUD & Account */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 pointer-events-auto min-w-0">
          {/* Supreme Admin Pill Badge (visible on BOTH mobile and desktop) */}
          {isAdmin && (
            <SupremeAdminBadge
              variant="pill"
              lang={lang}
              adminTitle={user.adminTitle}
              onClick={onOpenAccount}
            />
          )}

          {/* Search Star/Constellation Button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center justify-center lg:justify-start lg:space-x-1.5 h-[24px] w-[24px] sm:h-[26px] sm:w-[26px] lg:w-auto md:h-auto lg:px-3 md:py-1.5 rounded-lg md:rounded-xl bg-[#121a2f] md:bg-[#0c1224] border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/30 text-xs font-hud transition-all group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 shrink-0"
            title={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
          >
            <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" aria-hidden="true" />
            <span className="sr-only lg:not-sr-only">{lang === 'vi' ? 'Tìm kiếm...' : 'Search...'}</span>
            <kbd className="hidden xl:inline-block px-1 py-0.2 text-[9px] bg-slate-800/80 border border-slate-700 rounded text-slate-400">
              {t.searchKbd}
            </kbd>
          </button>

          {/* Sky Image Capture Button */}
          <button
            type="button"
            onClick={onOpenCapture}
            data-testid="capture-sky-btn"
            className="flex items-center justify-center h-[24px] w-[24px] sm:h-[26px] sm:w-[26px] md:w-8 md:h-8 rounded-lg md:rounded-xl bg-[#121a2f] md:bg-[#0c1224] border border-white/10 text-cyan-300 hover:text-white hover:border-cyan-400/40 hover:shadow-glow-cyan transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 shrink-0"
            title={t.captureSkyButtonAria}
            aria-label={t.captureSkyButtonAria}
          >
            <Camera className="w-3.5 h-3.5 md:w-4 md:h-4" aria-hidden="true" />
          </button>

          {/* GPS Location Button (Visible on BOTH mobile and desktop) */}
          <button
            type="button"
            onClick={onGetGeolocation}
            disabled={isLocating}
            data-testid="header-gps-btn"
            className={`flex items-center justify-center sm:justify-start gap-1.5 h-[24px] w-[24px] sm:h-[26px] sm:w-auto md:h-auto sm:px-2.5 sm:py-1.5 rounded-lg md:rounded-xl bg-[#121a2f] md:bg-[#0c1224] border transition-all font-hud cursor-pointer disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 shrink-0 ${
              isLocating
                ? 'border-cyan-400/60 text-cyan-200 shadow-glow-cyan'
                : 'border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/40'
            }`}
            title={gpsTitle}
            aria-label={t.geoGetCurrentBtn}
          >
            <Navigation2
              className={`w-3.5 h-3.5 text-cyan-400 shrink-0 ${isLocating ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden lg:inline text-[11px] font-sans font-medium text-slate-200 truncate max-w-[132px]">
              {isLocating ? t.geoLocating : location.name}
            </span>
            <span className="hidden sm:inline text-[10px] text-slate-400 font-mono tabular-nums shrink-0">
              {location.latitude.toFixed(1)}°, {location.longitude.toFixed(1)}°
            </span>
          </button>

          {/* Desktop Weather Badge */}
          {weatherSlot && <div className="hidden md:flex items-center">{weatherSlot}</div>}

          {/* Astronomical Clock HUD */}
          <div className="flex items-center space-x-1 h-[24px] sm:h-[26px] md:h-auto px-1.5 md:px-2.5 py-0.5 md:py-1.5 rounded-lg md:rounded-xl bg-[#121a2f] md:bg-[#0c1224] text-xs font-hud text-slate-200 border border-white/10 shrink-0">
            <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 text-purple-400 shrink-0" aria-hidden="true" />
            <span className="sm:hidden text-white font-semibold text-[10px] leading-none tabular-nums">
              {formattedCompactTime}
            </span>
            <span className="hidden sm:inline text-white font-semibold text-[10.5px] md:text-xs leading-none tabular-nums">
              {formattedTime}
            </span>
          </div>

          {/* Guest Quick Sign In Trigger (Mobile & Desktop) */}
          {user.isGuest && (
            <button
              type="button"
              onClick={onOpenAuth}
              data-testid="header-signin-btn"
              className="flex items-center gap-1 h-[26px] md:h-8 px-2 md:px-2.5 rounded-lg md:rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-400/45 text-cyan-200 hover:text-white hover:border-cyan-300 text-[10.5px] md:text-xs font-semibold transition-all cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title={t.authSignInAction}
              aria-label={t.authSignInAction}
            >
              <LogIn className="w-3 h-3 md:w-3.5 md:h-3.5 text-cyan-300 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{t.authSignInTab}</span>
            </button>
          )}

          {/* Account Button (Desktop) */}
          <button
            type="button"
            onClick={onOpenAccount}
            data-testid="header-account-btn"
            className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl overflow-hidden transition-all cursor-pointer focus:outline-none focus-visible:ring-2 ${
              isAdmin
                ? 'bg-gradient-to-br from-amber-500/25 via-purple-900/50 to-amber-600/25 border border-amber-300/85 ring-2 ring-amber-400/35 text-amber-200 shadow-[0_0_16px_rgba(250,204,21,0.45)] focus-visible:ring-amber-300'
                : 'bg-[#0c1224] border border-white/10 text-cyan-400 hover:text-white hover:border-cyan-400/40 hover:shadow-glow-cyan focus-visible:ring-cyan-400'
            }`}
            title={t.account}
            aria-label={t.account}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : !user.isGuest ? (
              <span className="text-xs font-bold font-hud leading-none">
                {user.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </TopSafeBar>
  );
};
