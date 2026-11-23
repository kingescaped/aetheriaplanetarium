import React from 'react';
import { Radio } from 'lucide-react';
import { Star } from '../../types/celestial';
import { Language, TRANSLATIONS, getConstellationName } from '../../utils/i18n';

interface StarTelemetryHUDProps {
  star: Star | null;
  lang?: Language;
  className?: string;
}

/**
 * Star Telemetry HUD Card
 * - Trên giao diện Web (Desktop): Nằm ngay dưới thẻ thông tin sao
 * - Trên giao diện Mobile: Nằm ngay dưới phần đồng hồ giờ ở góc trên bên phải
 * - Đồng bộ ngôn ngữ Tiếng Việt / Tiếng Anh, tên sao giữ nguyên, tên chòm sao dịch chuẩn.
 */
export const StarTelemetryHUD: React.FC<StarTelemetryHUDProps> = ({
  star,
  lang = 'vi',
  className = '',
}) => {
  if (!star) return null;

  const t = TRANSLATIONS[lang];
  const constellationName = getConstellationName(star.con, lang);

  return (
    <div
      className={`rounded-2xl glass-panel border border-cyan-400/40 shadow-glow-cyan text-xs font-mono select-none pointer-events-auto transition-all animate-in fade-in duration-200 ${className}`}
    >
      {/* Header: Star name & Magnitude Badge */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5 bg-slate-950/60">
        <div className="flex items-center gap-1.5 font-bold text-white text-xs truncate">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse flex-shrink-0" />
          <span className="truncate">{star.name || `Star #${star.id}`}</span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 flex-shrink-0 font-bold">
          {star.mag > 0 ? `+${star.mag.toFixed(2)}` : star.mag.toFixed(2)}m
        </span>
      </div>

      {/* Metrics Body */}
      <div className="p-2 space-y-1 text-[10px] text-slate-300">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">{t.constellation}:</span>
          <span className="text-cyan-200 font-semibold">{constellationName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">{t.altitudeH}:</span>
          <span className="text-emerald-400 font-bold font-mono">
            {star.alt !== undefined ? `${star.alt.toFixed(1)}°` : '--'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">{t.azimuthA}:</span>
          <span className="text-cyan-300 font-mono">
            {star.az !== undefined ? `${star.az.toFixed(1)}°` : '--'}
          </span>
        </div>
        {star.dist && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{t.distance}:</span>
            <span className="text-purple-300 font-mono">{star.dist.toLocaleString()} {t.lightYears}</span>
          </div>
        )}
      </div>
    </div>
  );
};
