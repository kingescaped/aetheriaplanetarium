import React from 'react';
import { AlertTriangle, Droplets, Eye, Wind } from 'lucide-react';
import type { WeatherSample } from '../../types/weather';
import { TRANSLATIONS, type Language } from '../../utils/i18n';
import { getSeeingGradeCopy, getSeeingVisualStyle } from './weatherDisplay';

interface WeatherMetricsCardProps {
  sample: WeatherSample;
  lang: Language;
}

interface MetricTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
}

const MetricTile: React.FC<MetricTileProps> = ({ icon, label, value, subtext }) => (
  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10 space-y-1">
    <div className="flex items-center gap-1.5 text-[10px] font-hud uppercase text-slate-300">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-sm font-mono font-bold text-white tabular-nums">{value}</div>
    {subtext && <div className="text-[10px] font-mono text-slate-400">{subtext}</div>}
  </div>
);

export const WeatherMetricsCard: React.FC<WeatherMetricsCardProps> = ({ sample, lang }) => {
  const t = TRANSLATIONS[lang];
  const seeingStyle = getSeeingVisualStyle(sample.seeingGrade);
  const seeingCopy = getSeeingGradeCopy(sample.seeingGrade, lang);
  const layers = [
    { label: t.weatherCloudLow, val: sample.cloudLow, color: 'bg-cyan-400' },
    { label: t.weatherCloudMid, val: sample.cloudMid, color: 'bg-indigo-400' },
    { label: t.weatherCloudHigh, val: sample.cloudHigh, color: 'bg-purple-400' },
  ];

  return (
    <>
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-hud uppercase text-slate-300">
              {t.weatherSeeing}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <span className="text-2xl font-mono font-bold text-white tabular-nums">
                {sample.seeingScore}
              </span>
              <span className="text-xs font-mono text-slate-400">/100</span>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${seeingStyle.pillClass}`}
              >
                {seeingCopy.label} • ~{sample.seeingArcsec.toFixed(1)}"
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] font-hud uppercase text-slate-300">
              {t.weatherCloudCover}
            </div>
            <div className="text-xl font-mono font-bold text-cyan-300 tabular-nums mt-0.5">
              {sample.cloudCover}%
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">{seeingCopy.advice}</p>
      </div>

      <div className="p-3 rounded-xl bg-slate-900/70 border border-white/10 space-y-2">
        <div className="text-[10px] font-hud uppercase text-slate-300">
          {t.weatherCloudLayers}
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
          {layers.map((layer) => (
            <div key={layer.label} className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>{layer.label}</span>
                <span className="text-white font-semibold tabular-nums">{layer.val}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${layer.color}`}
                  style={{ width: `${layer.val}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MetricTile
          icon={<Droplets className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />}
          label={t.weatherHumidity}
          value={`${sample.humidity}%`}
          subtext={`${t.weatherDewPoint}: ${sample.dewPointC}°C`}
        />
        <MetricTile
          icon={<Wind className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />}
          label={t.weatherWind}
          value={`${sample.windSpeedKmh} km/h`}
          subtext={`${sample.temperatureC}°C`}
        />
        <MetricTile
          icon={<Eye className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />}
          label={t.weatherVisibility}
          value={`${sample.visibilityKm} km`}
          subtext={`ΔT ${sample.dewSpreadC}°C`}
        />
      </div>

      {sample.dewSpreadC < 2.5 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/35 text-[11px] text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
          <span>{t.weatherDewWarning}</span>
        </div>
      )}
    </>
  );
};
