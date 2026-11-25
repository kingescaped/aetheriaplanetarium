import type { SkyVisualAttenuation } from '../../types/weather';
import type { EclipticOverlayData } from '../../types/deepSky';
import type { Language } from '../../utils/i18n';

export type ProjectAltAzFn = (
  alt: number,
  az: number,
  cx: number,
  cy: number,
  radius: number
) => { x: number; y: number; visible: boolean };

export function drawEclipticOverlay2D(
  ctx: CanvasRenderingContext2D,
  ecliptic: EclipticOverlayData,
  projectAltAzToCanvas: ProjectAltAzFn,
  cx: number,
  cy: number,
  baseRadius: number,
  skyAttenuation: SkyVisualAttenuation | undefined,
  lang: Language
): void {
  const opacity = 0.72 * (skyAttenuation?.constellationOpacity ?? 1);
  if (opacity <= 0.05) return;

  ctx.save();
  ctx.strokeStyle = `rgba(245, 158, 11, ${opacity.toFixed(3)})`;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([6, 6]);

  let inSegment = false;
  ctx.beginPath();
  for (let i = 0; i < ecliptic.points.length; i++) {
    const pt = ecliptic.points[i];
    if (pt.alt < -4) {
      inSegment = false;
      continue;
    }
    const { x, y } = projectAltAzToCanvas(pt.alt, pt.az, cx, cy, baseRadius);
    if (!inSegment) {
      ctx.moveTo(x, y);
      inSegment = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw 30-degree longitude ticks
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const tick of ecliptic.ticks) {
    if (tick.alt < 0 || tick.nextAlt < -5) continue;
    const p1 = projectAltAzToCanvas(tick.alt, tick.az, cx, cy, baseRadius);
    const p2 = projectAltAzToCanvas(tick.nextAlt, tick.nextAz, cx, cy, baseRadius);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) continue;

    const nx = -dy / len;
    const ny = dx / len;
    ctx.strokeStyle = `rgba(251, 191, 36, ${Math.min(1, opacity + 0.1).toFixed(3)})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(p1.x - nx * 4, p1.y - ny * 4);
    ctx.lineTo(p1.x + nx * 4, p1.y + ny * 4);
    ctx.stroke();

    if (tick.lonDeg % 90 !== 0) {
      ctx.fillStyle = `rgba(253, 224, 71, ${Math.max(0.45, opacity).toFixed(3)})`;
      ctx.fillText(`${tick.lonDeg}°`, p1.x + nx * 13, p1.y + ny * 13);
    }
  }

  // Draw 4 seasonal Equinox / Solstice markers
  ctx.font = '600 10px "Inter", sans-serif';
  for (const m of ecliptic.markers) {
    if (m.alt < 1) continue;
    const { x, y } = projectAltAzToCanvas(m.alt, m.az, cx, cy, baseRadius);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(254, 243, 199, ${Math.min(1, opacity + 0.2).toFixed(3)})`;
    ctx.fillText(lang === 'vi' ? m.labelVi : m.labelEn, x, y - 11);
  }

  ctx.restore();
}
