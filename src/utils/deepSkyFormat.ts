import type { DeepSkyType } from '../types/deepSky.ts';
import { TRANSLATIONS, type Language } from './i18n.ts';

const DSO_TYPE_LABEL_MAP: Record<DeepSkyType, keyof typeof TRANSLATIONS.vi> = {
  galaxy: 'dsoTypeGalaxy',
  nebula: 'dsoTypeNebula',
  planetary_nebula: 'dsoTypePlanetaryNebula',
  supernova_remnant: 'dsoTypeSupernovaRemnant',
  globular_cluster: 'dsoTypeGlobularCluster',
  open_cluster: 'dsoTypeOpenCluster',
};

export function getDeepSkyTypeLabel(type: DeepSkyType, lang: Language): string {
  const key = DSO_TYPE_LABEL_MAP[type];
  return TRANSLATIONS[lang][key] as string;
}

export function formatAngularSize(sizeArcmin: number, lang: Language): string {
  if (sizeArcmin >= 60) {
    const deg = sizeArcmin / 60;
    return `${deg >= 10 ? deg.toFixed(0) : deg.toFixed(1)}° (${Math.round(sizeArcmin)}′)`;
  }
  const unit = lang === 'vi' ? 'phút cung' : 'arcmin';
  return `${sizeArcmin >= 10 ? sizeArcmin.toFixed(0) : sizeArcmin.toFixed(1)}′ (${unit})`;
}
