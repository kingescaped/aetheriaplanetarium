import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cloud, RefreshCw, RotateCcw, Sparkles, X } from 'lucide-react';
import type { ObserverLocation } from '../../types/celestial';
import type {
  ResolvedSkyWeather,
  WeatherForecastData,
  WeatherStatus,
} from '../../types/weather';
import { TRANSLATIONS, type Language } from '../../utils/i18n';
import { IOSSwitch } from '../layout/IOSSwitch';
import { WeatherHourlyStrip } from './WeatherHourlyStrip';
import { WeatherMetricsCard } from './WeatherMetricsCard';

interface WeatherDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  location: ObserverLocation;
  currentDate: Date;
  forecast: WeatherForecastData | null;
  resolved: ResolvedSkyWeather | null;
  status: WeatherStatus;
  isStale: boolean;
  error: string | null;
  simulateSkyWeather: boolean;
  onToggleSimulateSky: (enabled: boolean) => void;
  onSelectHour: (timestampMs: number) => void;
  onResetToNow: () => void;
  onRefresh: () => void;
  lang: Language;
}

export const WeatherDetailPanel: React.FC<WeatherDetailPanelProps> = ({
  isOpen,
  onClose,
  location,
  currentDate,
  forecast,
  resolved,
  status,
  isStale,
  error,
  simulateSkyWeather,
  onToggleSimulateSky,
  onSelectHour,
  onResetToNow,
  onRefresh,
  lang,
}) => {
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
  const sample = resolved?.sample ?? null;
  const updatedTimeText = forecast
    ? new Date(forecast.fetchedAtMs).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '--:--';
  const targetTimeText = currentDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="weather-detail-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-50 pointer-events-auto"
        >
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/45 md:bg-black/25"
            aria-hidden="true"
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={t.weatherTitle}
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="absolute bottom-0 left-0 right-0 max-h-[82%] rounded-t-3xl md:bottom-auto md:left-auto md:top-3 md:right-[max(1rem,var(--sar))] md:w-[392px] md:max-h-[calc(100%-64px)] md:rounded-2xl glass-panel border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden pl-[var(--sal)] pr-[var(--sar)] md:pl-0 md:pr-0"
          >
            <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-white/10 bg-slate-950/60 shrink-0">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-white truncate">{t.weatherTitle}</h2>
                  {resolved && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        resolved.isOutOfRange
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                          : resolved.isForecastSynced
                            ? 'bg-purple-500/20 text-purple-200 border-purple-400/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      }`}
                    >
                      {resolved.isOutOfRange
                        ? t.weatherLiveBadge
                        : resolved.isForecastSynced
                          ? `${t.weatherSyncedBadge} ${targetTimeText}`
                          : t.weatherLiveBadge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-300 truncate">
                  {location.name} • {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {(resolved?.isForecastSynced || resolved?.isOutOfRange) && (
                  <button
                    type="button"
                    onClick={onResetToNow}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-900 text-[10px] font-mono cursor-pointer"
                    title={t.syncNow}
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    <span>{t.syncNow}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onRefresh}
                  aria-label={t.weatherRefresh}
                  title={t.weatherRefresh}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${status === 'loading' ? 'animate-spin text-cyan-300' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t.weatherCloseAria}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain touch-manipulation">
              {status === 'loading' && !sample && (
                <div className="py-10 text-center space-y-2 text-xs text-slate-300">
                  <Cloud className="w-7 h-7 text-cyan-400 animate-pulse mx-auto" aria-hidden="true" />
                  <p>{t.weatherLoading}</p>
                </div>
              )}

              {status === 'error' && !sample && (
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-rose-500/30 text-center space-y-2.5">
                  <p className="text-xs text-rose-200">{error || t.weatherOffline}</p>
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-medium cursor-pointer"
                  >
                    {t.weatherRetry}
                  </button>
                </div>
              )}

              {sample && (
                <>
                  {resolved?.isOutOfRange && (
                    <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 text-[11px] text-amber-200">
                      {t.weatherOutOfRange}
                    </div>
                  )}

                  <WeatherMetricsCard sample={sample} lang={lang} />

                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/70 border border-white/10">
                    <div className="flex items-start gap-2 min-w-0">
                      <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white">{t.weatherSimulateSky}</div>
                        <div className="text-[11px] text-slate-300 leading-snug">
                          {t.weatherSimulateSkyDesc}
                        </div>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={simulateSkyWeather}
                      onChange={onToggleSimulateSky}
                      color="cyan"
                      ariaLabel={t.weatherSimulateSky}
                    />
                  </div>

                  {forecast && (
                    <WeatherHourlyStrip
                      hourly={forecast.hourly}
                      selectedTimestampMs={currentDate.getTime()}
                      isOutOfRange={Boolean(resolved?.isOutOfRange)}
                      onSelectHour={onSelectHour}
                      lang={lang}
                    />
                  )}
                </>
              )}
            </div>

            <div className="px-4 py-2 border-t border-white/10 bg-slate-950/70 flex items-center justify-between text-[10px] font-mono text-slate-300 shrink-0">
              <span>{t.weatherAttribution}</span>
              <span>
                {isStale ? `${t.weatherCachedBadge} • ` : ''}
                {t.weatherUpdatedAt}: {updatedTimeText} {forecast?.timezoneAbbreviation || ''}
              </span>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
