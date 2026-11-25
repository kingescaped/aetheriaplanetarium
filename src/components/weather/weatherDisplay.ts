import type { SeeingGrade } from '../../types/weather';
import { TRANSLATIONS, type Language } from '../../utils/i18n';

export interface SeeingVisualStyle {
  pillClass: string;
  dotClass: string;
  barClass: string;
  accentTextClass: string;
}

const SEEING_STYLES: Record<SeeingGrade, SeeingVisualStyle> = {
  excellent: {
    pillClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
    dotClass: 'bg-emerald-400',
    barClass: 'bg-emerald-400',
    accentTextClass: 'text-emerald-300',
  },
  good: {
    pillClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
    dotClass: 'bg-cyan-400',
    barClass: 'bg-cyan-400',
    accentTextClass: 'text-cyan-300',
  },
  fair: {
    pillClass: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    dotClass: 'bg-amber-400',
    barClass: 'bg-amber-400',
    accentTextClass: 'text-amber-300',
  },
  poor: {
    pillClass: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
    dotClass: 'bg-rose-400',
    barClass: 'bg-rose-400',
    accentTextClass: 'text-rose-300',
  },
};

export function getSeeingVisualStyle(grade: SeeingGrade): SeeingVisualStyle {
  return SEEING_STYLES[grade];
}

export function getSeeingGradeCopy(
  grade: SeeingGrade,
  lang: Language
): { label: string; advice: string } {
  const t = TRANSLATIONS[lang];
  switch (grade) {
    case 'excellent':
      return { label: t.seeingGradeExcellent, advice: t.seeingAdviceExcellent };
    case 'good':
      return { label: t.seeingGradeGood, advice: t.seeingAdviceGood };
    case 'fair':
      return { label: t.seeingGradeFair, advice: t.seeingAdviceFair };
    case 'poor':
      return { label: t.seeingGradePoor, advice: t.seeingAdvicePoor };
  }
}
