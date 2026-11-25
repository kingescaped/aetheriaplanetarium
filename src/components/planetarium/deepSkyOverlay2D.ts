import type { Star } from '../../types/celestial';
import type { DeepSkyType } from '../../types/deepSky';
import type { SkyVisualAttenuation } from '../../types/weather';
import type { ProjectAltAzFn } from './eclipticOverlay2D';

export interface ProjectedDeepSky {
  star: Star;
  x: number;
  y: number;
  visible: boolean;
}

function drawSymbolForType(
  ctx: CanvasRenderingContext2D,
  type: DeepSkyType,
  x: number,
  y: number,
  r: number,
  color: string
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.25;

  if (type === 'galaxy') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.45);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.45, r * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha *= 0.25;
    ctx.fill();
    ctx.restore();
    return;
  }

  if (type === 'planetary_nebula') {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 1.35, y);
    ctx.lineTo(x + r * 1.35, y);
    ctx.moveTo(x, y - r * 1.35);
    ctx.lineTo(x, y + r * 1.35);
    ctx.stroke();
    return;
  }

  if (type === 'supernova_remnant') {
    ctx.save();
    ctx.setLineDash([2.5, 2]);
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.2);
    ctx.lineTo(x + r * 1.2, y);
    ctx.lineTo(x, y + r * 1.2);
    ctx.lineTo(x - r * 1.2, y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (type === 'globular_cluster') {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r);
    ctx.lineTo(x, y + r);
    ctx.stroke();
    return;
  }

  if (type === 'open_cluster') {
    ctx.save();
    ctx.setLineDash([2, 2.2]);
    ctx.beginPath();
    ctx.arc(x, y, r * 1.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Diffuse nebula: rounded glowing box outline
  const half = r * 0.95;
  ctx.strokeRect(x - half, y - half, half * 2, half * 2);
}

export function drawDeepSky2D(
  ctx: CanvasRenderingContext2D,
  bodies: Star[],
  projectAltAzToCanvas: ProjectAltAzFn,
  cx: number,
  cy: number,
  baseRadius: number,
  zoom: number,
  selectedStar: Star | null,
  hoveredStar: Star | null,
  skyAttenuation: SkyVisualAttenuation | undefined,
  showLabels: boolean
): ProjectedDeepSky[] {
  const projected: ProjectedDeepSky[] = [];
  const starOpacity = skyAttenuation?.starOpacity ?? 1;

  ctx.save();
  ctx.font = '500 9.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (const dso of bodies) {
    if (dso.alt === undefined || dso.az === undefined || dso.alt < -5 || !dso.deepSkyData) {
      continue;
    }
    const { x, y, visible } = projectAltAzToCanvas(dso.alt, dso.az, cx, cy, baseRadius);
    const proj: ProjectedDeepSky = { star: dso, x, y, visible };
    projected.push(proj);
    if (!visible) continue;

    const meta = dso.deepSkyData;
    const isSelected = selectedStar?.id === dso.id;
    const isHovered = hoveredStar?.id === dso.id;
    const symbolRadius = Math.max(4.5, Math.min(9.5, 4 + Math.log10(meta.sizeArcmin + 1) * 2.2));
    ctx.globalAlpha = Math.max(0.28, starOpacity * (isSelected || meta.featured ? 0.96 : 0.78));

    drawSymbolForType(ctx, meta.dsoType, x, y, symbolRadius, meta.accentColor);

    if (showLabels && (meta.featured || dso.mag <= 5.8 || zoom >= 1.45 || isSelected || isHovered)) {
      ctx.fillStyle = isSelected ? '#ffffff' : meta.accentColor;
      ctx.fillText(meta.catalogCode, x + symbolRadius + 5, y);
    }
  }

  ctx.restore();
  return projected;
}
