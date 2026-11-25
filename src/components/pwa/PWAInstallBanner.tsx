import React, { useState, useEffect } from 'react';
import { Download, Share, X, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { UsePWAResult } from '../../hooks/usePWA';
import { Language, TRANSLATIONS } from '../../utils/i18n';
import { soundFx } from '../../utils/audio';

interface PWAInstallBannerProps {
  pwa: UsePWAResult;
  lang?: Language;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ pwa, lang = 'vi' }) => {
  const t = TRANSLATIONS[lang];
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if dismissed recently (within 7 days)
    const dismissedTime = localStorage.getItem('aetheria_pwa_dismissed');
    if (dismissedTime) {
      const parsedTime = parseInt(dismissedTime, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsedTime < sevenDays) {
        setIsDismissed(true);
        return;
      }
    }

    // Only show if not installed and can install (or update available)
    if (!pwa.isInstalled && (pwa.canInstall || pwa.needRefresh)) {
      setIsDismissed(false);
    }
  }, [pwa.isInstalled, pwa.canInstall, pwa.needRefresh]);

  const handleDismiss = () => {
    soundFx.playToggle(false);
    setIsDismissed(true);
    localStorage.setItem('aetheria_pwa_dismissed', Date.now().toString());
  };

  const handleInstallClick = async () => {
    soundFx.playToggle(true);
    if (pwa.isIOS) {
      setShowIosGuide((prev) => !prev);
      return;
    }
    await pwa.promptInstall();
  };

  if (isDismissed || pwa.isInstalled) {
    // If update is available, always show update badge
    if (pwa.needRefresh) {
      return (
        <div className="absolute top-2.5 right-[max(1rem,var(--sar))] z-50 animate-fade-in pointer-events-auto">
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-cyan-950/90 border border-cyan-400 text-white shadow-glow-cyan text-xs">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
            <span className="font-mono text-[11px]">{t.pwaUpdateAvailable}</span>
            <button
              onClick={() => pwa.updateServiceWorker()}
              className="ml-2 px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider hover:bg-cyan-400 active:scale-95 transition-all"
            >
              {t.pwaUpdateBtn}
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="absolute bottom-3 md:bottom-6 left-[max(1rem,var(--sal))] right-[max(1rem,var(--sar))] md:left-auto md:right-[max(1.5rem,var(--sar))] md:max-w-md z-40 pointer-events-auto animate-fade-in">
      <div className="relative p-4 rounded-3xl glass-panel border border-cyan-500/30 bg-slate-950/90 shadow-2xl backdrop-blur-2xl space-y-3">
        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start space-x-3 pr-6">
          {/* App Icon */}
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-400/40 p-1 flex-shrink-0 flex items-center justify-center shadow-glow-cyan">
            <img src={`${import.meta.env.BASE_URL}pwa-icon.svg`} alt="Aetheria Star" className="w-7 h-7 object-contain" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs font-bold text-white tracking-tight">
                {t.pwaTitle}
              </h4>
              {pwa.isOfflineReady && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-400">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Offline Ready
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {t.pwaDesc}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-glow-cyan active:scale-95 hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
          >
            {pwa.isIOS ? (
              <>
                <Share className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Xem cách thêm vào MH chính' : 'How to Add to Home Screen'}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{t.pwaInstallBtn}</span>
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors"
          >
            {lang === 'vi' ? 'Để sau' : 'Later'}
          </button>
        </div>

        {/* iOS Step-by-Step Popover Instructions */}
        {showIosGuide && pwa.isIOS && (
          <div className="p-3 rounded-2xl bg-cyan-950/60 border border-cyan-400/30 text-[11px] text-cyan-200 space-y-1.5 animate-fade-in font-sans">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Share className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'vi' ? 'Cách cài đặt trên iPhone / iPad:' : 'How to install on iOS:'}</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
              <li>{lang === 'vi' ? 'Nhấn biểu tượng nút Chia sẻ' : 'Tap the Share button'} <strong className="text-cyan-300">[ ⎋ ]</strong> {lang === 'vi' ? 'ở thanh đáy Safari.' : 'in Safari toolbar.'}</li>
              <li>{lang === 'vi' ? 'Cuộn xuống và chọn' : 'Scroll down and tap'} <strong className="text-white">"{lang === 'vi' ? 'Thêm vào MH chính' : 'Add to Home Screen'}"</strong> (+).</li>
              <li>{lang === 'vi' ? 'Nhấn "Thêm" để hoàn tất.' : 'Tap "Add" in the top right.'}</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
