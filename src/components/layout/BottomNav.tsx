import React from 'react';
import { Eye, Box, Settings } from 'lucide-react';
import { ViewMode } from '../../types/celestial';
import { Language, TRANSLATIONS } from '../../utils/i18n';
import { soundFx } from '../../utils/audio';

interface BottomNavProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenAccount: () => void;
  isAccountOpen: boolean;
  onCloseAccount?: () => void;
  hasActiveTarget: boolean;
  lang?: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  viewMode,
  setViewMode,
  onOpenAccount,
  isAccountOpen,
  onCloseAccount,
  hasActiveTarget,
  lang = 'vi',
}) => {
  const t = TRANSLATIONS[lang];

  const handleSelectView = (mode: ViewMode) => {
    soundFx.playTabClick();
    setViewMode(mode);
    if (isAccountOpen && onCloseAccount) {
      onCloseAccount();
    }
  };

  const handleToggleAccount = () => {
    soundFx.playTabClick();
    if (isAccountOpen && onCloseAccount) {
      onCloseAccount();
    } else {
      onOpenAccount();
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 w-full z-50 flex flex-col justify-start bg-[#060c1c]/95 backdrop-blur-md border-t border-white/10 md:hidden"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
        minHeight: 'calc(64px + max(env(safe-area-inset-bottom, 0px), 16px))',
        height: 'calc(64px + max(env(safe-area-inset-bottom, 0px), 16px))',
      }}
    >
      <div className="w-full h-[64px] flex items-center justify-around flex-shrink-0">
        {/* 1. 2D Sky Map */}
        <button
          onClick={() => handleSelectView('2D_PLANETARIUM')}
          className={`flex flex-col items-center justify-center py-1 px-4 rounded-2xl transition-all ${viewMode === '2D_PLANETARIUM' && !isAccountOpen
              ? 'text-cyan-300 bg-cyan-500/20 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <Eye className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium tracking-tight">{t.navSky2d}</span>
        </button>

        {/* 2. 3D Zenith Dome */}
        <button
          onClick={() => handleSelectView('3D_ZENITH_DOME')}
          className={`flex flex-col items-center justify-center py-1 px-4 rounded-2xl transition-all relative ${viewMode === '3D_ZENITH_DOME' && !isAccountOpen
              ? 'text-purple-300 bg-purple-500/20 shadow-glow-purple'
              : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <Box className="w-5 h-5 mb-0.5 text-purple-400" />
          <span className="text-[11px] font-medium tracking-tight">{t.navDome3d}</span>
          {hasActiveTarget && (
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          )}
        </button>

        {/* 3. Settings & Account (Always accessible) */}
        <button
          onClick={handleToggleAccount}
          className={`flex flex-col items-center justify-center py-1 px-4 rounded-2xl transition-all ${isAccountOpen
              ? 'text-cyan-300 bg-cyan-500/20 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
            }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium tracking-tight">{t.navAccount}</span>
        </button>
      </div>
    </div>
  );
};
