import React, { useEffect, useMemo, useRef } from 'react';
import { Cloud, CloudMoon, Sparkles } from 'lucide-react';
import type { WeatherSample } from '../../types/weather';
import { TRANSLATIONS, type Language } from '../../utils/i18n';
import { getSeeingVisualStyle } from './weatherDisplay';

interface WeatherHourlyStripProps {
  hourly: WeatherSample[];
  selectedTimestampMs: number;
  isOutOfRange: boolean;
  onSelectHour: (timestampMs: number) => void;
  lang: Language;
}

const MAX_STRIP_SLOTS = 36;

function findClosestIndex(hourly: WeatherSample[], targetMs: number): number {
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < hourly.length; i++) {
    const diff = Math.abs(hourly[i].timestampMs - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function getSlotIcon(cloudCover: number) {
  if (cloudCover <= 15) {
    return <Sparkles className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />;
  }
  if (cloudCover <= 55) {
    return <CloudMoon className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />;
  }
  return <Cloud className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />;
}

export const WeatherHourlyStrip: React.FC<WeatherHourlyStripProps> = ({
  hourly,
  selectedTimestampMs,
  isOutOfRange,
  onSelectHour,
  lang,
}) => {
  const t = TRANSLATIONS[lang];
  const stripRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const { visibleSlots, activeTimestampMs } = useMemo(() => {
    if (hourly.length === 0) {
      return { visibleSlots: [] as WeatherSample[], activeTimestampMs: null as number | null };
    }

    const anchorMs = isOutOfRange ? Date.now() : selectedTimestampMs;
    const anchorIdx = findClosestIndex(hourly, anchorMs);
    const maxStart = Math.max(0, hourly.length - MAX_STRIP_SLOTS);
    const startIdx = Math.min(maxStart, Math.max(0, anchorIdx - 4));

    return {
      visibleSlots: hourly.slice(startIdx, startIdx + MAX_STRIP_SLOTS),
      activeTimestampMs: isOutOfRange ? null : hourly[anchorIdx].timestampMs,
    };
  }, [hourly, selectedTimestampMs, isOutOfRange]);

  useEffect(() => {
    const strip = stripRef.current;
    const activeBtn = activeRef.current;
    if (!strip || !activeBtn) return;
    const targetLeft =
      activeBtn.offsetLeft - strip.clientWidth / 2 + activeBtn.clientWidth / 2;
    strip.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: 'smooth',
    });
  }, [activeTimestampMs]);

  if (visibleSlots.length === 0) return null;

  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-hud uppercase tracking-wider text-slate-300">
        {t.weatherHourlyTitle}
      </div>

      <div
        ref={stripRef}
        className="flex items-stretch gap-1.5 overflow-x-auto pb-1.5 overscroll-x-contain"
      >
        {visibleSlots.map((slot, index) => {
          const isSelected = activeTimestampMs === slot.timestampMs;
          const date = new Date(slot.timestampMs);
          const hourLabel = date.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          const showDay = date.getHours() === 0 || index === 0;
          const dayLabel = date.toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
          });
          const style = getSeeingVisualStyle(slot.seeingGrade);

          return (
            <button
              key={slot.timestampMs}
              ref={isSelected ? activeRef : undefined}
              type="button"
              onClick={() => onSelectHour(slot.timestampMs)}
              className={`min-w-[58px] shrink-0 flex flex-col items-center gap-1 px-2 py-2 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-glow-cyan'
                  : 'bg-slate-900/70 border-white/10 text-slate-300 hover:border-white/25 hover:bg-slate-800/80'
              }`}
            >
              <span className="text-[9px] font-mono text-slate-400 leading-none h-2.5">
                {showDay ? dayLabel : ''}
              </span>
              <span className="text-[11px] font-mono font-semibold text-white">
                {hourLabel}
              </span>
              {getSlotIcon(slot.cloudCover)}
              <span className="text-[11px] font-mono tabular-nums text-slate-200">
                {slot.cloudCover}%
              </span>
              <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${style.barClass}`}
                  style={{ width: `${Math.max(8, 100 - slot.cloudCover)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
