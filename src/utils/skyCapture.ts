import type { ObserverLocation, ViewMode } from '../types/celestial.ts';
import type { CaptureWatermarkInfo, SkyCaptureMetadata } from '../types/atmosphere.ts';
import { getTwilightPhaseLabel } from './twilight.ts';

function slugifyAscii(raw: string): string {
  const ascii = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || 'sky';
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function buildCaptureFilename(
  location: ObserverLocation,
  date: Date,
  viewMode: ViewMode
): string {
  const modeSlug = viewMode === '3D_ZENITH_DOME' ? '3d' : '2d';
  const locSlug = slugifyAscii(location.name).slice(0, 28);
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `aetheria-${modeSlug}-${locSlug}-${yyyy}${mm}${dd}-${hh}${min}${ss}.png`;
}

export function formatCaptureWatermarkInfo(
  meta: SkyCaptureMetadata,
  lang: 'vi' | 'en'
): CaptureWatermarkInfo {
  const modeBadge =
    meta.viewMode === '3D_ZENITH_DOME'
      ? lang === 'vi'
        ? 'VÒM 3D'
        : '3D ZENITH DOME'
      : lang === 'vi'
        ? 'BẢN ĐỒ 2D'
        : '2D SKY MAP';

  const lat = meta.location.latitude;
  const lon = meta.location.longitude;
  const coordText = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  const locationLine = `${meta.location.name} • ${coordText}`;

  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
  const dateText = meta.date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  const timeText = meta.date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const phaseLabel = getTwilightPhaseLabel(meta.twilightPhase, lang);
  const timeLine = `${dateText} ${timeText} • ${phaseLabel}`;

  let targetLine: string | null = null;
  if (meta.selectedStar) {
    const s = meta.selectedStar;
    const targetName = s.name || s.properName || `#${s.id}`;
    const prefix = lang === 'vi' ? 'Mục tiêu' : 'Target';
    const altAz =
      s.alt !== undefined && s.az !== undefined
        ? ` • Alt ${s.alt.toFixed(1)}° Az ${s.az.toFixed(1)}°`
        : '';
    targetLine = `${prefix}: ${targetName} • Mag ${s.mag.toFixed(1)}${altAz}`;
  }

  return {
    brand: 'AETHERIA',
    modeBadge,
    locationLine,
    timeLine,
    targetLine,
  };
}

export function canUseWebShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    const probe = new File([new Uint8Array([137, 80, 78, 71])], 'probe.png', {
      type: 'image/png',
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to encode PNG image'));
      }
    }, 'image/png');
  });
}

export function downloadBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareOrDownloadSkyImage(
  blob: Blob,
  filename: string,
  title: string,
  text: string,
  preferShare: boolean
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (preferShare && canUseWebShareFiles()) {
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  downloadBlobAsFile(blob, filename);
  return 'downloaded';
}
