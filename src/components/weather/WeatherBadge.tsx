import React from 'react';
import { Cloud, CloudMoon, CloudOff, Clock, Sparkles } from 'lucide-react';
import type { ResolvedSkyWeather, WeatherStatus } from '../../types/weather';
import { TRANSLATIONS, type Language } from '../../utils/i18n';
import { getSeeingGradeCopy, getSeeingVisualStyle } from './weatherDisplay';

interface WeatherBadgeProps {
  resolved: ResolvedSkyWeather | null;
  status: WeatherStatus;
  isStale: boolean;
  isOpen: boolean;
  onClick: () => void;
  lang: Language;
  compact?: boolean;
}

function renderSkyIcon(cloudCover: number) {
  if (cloudCover <= 15) {
    return <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" aria-hidden="true" />;
  }
  if (cloudCover <= 55) {
    return <CloudMoon className="w-3.5 h-3.5 text-cyan-300 shrink-0" aria-hidden="true" />;
  }
  return <Cloud className="w-3.5 h-3.5 text-slate-300 shrink-0" aria-hidden="true" />;
}

export const WeatherBadge: React.FC<WeatherBadgeProps> = ({
  resolved,
  status,
  isStale,
  isOpen,
  onClick,
  lang,
  compact = false,
}) => {
  const t = TRANSLATIONS[lang];

  if (status === 'error' && !resolved) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-expanded={isOpen}
        title={t.weatherBadgeAria}
        className={`flex items-center gap-1.5 rounded-xl bg-[#0c1224] border border-white/10 text-xs text-slate-300 hover:text-white hover:border-cyan-400/40 transition-all cursor-pointer ${
          compact ? 'px-2.5 py-1.5 glass-panel' : 'px-2.5 py-1.5'
        }`}
      >
        <CloudOff className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
        <span className="font-hud text-[11px]">{t.weatherOffline}</span>
        <span className="sr-only"> — {t.weatherBadgeAria}</span>
      </button>
    );
  }

  if (!resolved) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-expanded={isOpen}
        title={t.weatherBadgeAria}
        className={`flex items-center gap-1.5 rounded-xl bg-[#0c1224] border border-white/10 text-xs text-slate-300 transition-all cursor-pointer ${
          compact ? 'px-2.5 py-1.5 glass-panel' : 'px-2.5 py-1.5'
        }`}
      >
        <Cloud className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" aria-hidden="true" />
        <span className="font-hud text-[11px]">{t.weatherLoading}</span>
        <span className="sr-only"> — {t.weatherBadgeAria}</span>
      </button>
    );
  }

  const { sample, isForecastSynced } = resolved;
  const style = getSeeingVisualStyle(sample.seeingGrade);
  const { label } = getSeeingGradeCopy(sample.seeingGrade, lang);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      title={`${t.weatherTitle}: ${sample.cloudCover}% • ${label}`}
      className={`flex items-center gap-1.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
        isOpen
          ? 'bg-cyan-500/20 border-cyan-400/60 text-white shadow-glow-cyan'
          : 'bg-[#0c1224]/95 border-white/10 text-slate-200 hover:border-cyan-400/40 hover:text-white'
      } ${compact ? 'px-2.5 py-1.5 glass-panel max-w-[144px]' : 'px-2.5 py-1.5'}`}
    >
      {renderSkyIcon(sample.cloudCover)}
      <span className="font-mono text-[11px] font-semibold tabular-nums text-white">
        {sample.cloudCover}%
      </span>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dotClass}`} aria-hidden="true" />
      <span className={`font-sans text-[11px] font-medium truncate ${style.accentTextClass}`}>
        {label}
      </span>
      <span className="sr-only"> ({t.weatherTitle})</span>
      {isForecastSynced && (
        <Clock className="w-3 h-3 text-purple-300 shrink-0" aria-hidden="true" />
      )}
      {isStale && !isForecastSynced && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
      )}
    </button>
  );
};
