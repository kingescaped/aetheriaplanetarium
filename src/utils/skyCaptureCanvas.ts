import type { SkyCaptureMetadata } from '../types/atmosphere.ts';
import { formatCaptureWatermarkInfo } from './skyCapture.ts';

function drawAetheriaEmblemOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
): void {
  ctx.save();
  ctx.translate(cx, cy);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.15);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  glow.addColorStop(0.35, 'rgba(125, 211, 252, 0.55)');
  glow.addColorStop(1, 'rgba(2, 132, 199, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
  ctx.fill();

  const diag = radius * 0.68;
  const diagInner = radius * 0.14;
  ctx.save();
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
  ctx.beginPath();
  ctx.moveTo(0, -diag);
  ctx.lineTo(diagInner, -diagInner);
  ctx.lineTo(diag, 0);
  ctx.lineTo(diagInner, diagInner);
  ctx.lineTo(0, diag);
  ctx.lineTo(-diagInner, diagInner);
  ctx.lineTo(-diag, 0);
  ctx.lineTo(-diagInner, -diagInner);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const cardInner = radius * 0.16;
  const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.5, '#ffffff');
  grad.addColorStop(1, '#818cf8');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(cardInner, -cardInner);
  ctx.lineTo(radius, 0);
  ctx.lineTo(cardInner, cardInner);
  ctx.lineTo(0, radius);
  ctx.lineTo(-cardInner, cardInner);
  ctx.lineTo(-radius, 0);
  ctx.lineTo(-cardInner, -cardInner);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.5, radius * 0.1), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 4 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

export function composeSkySnapshotCanvas(
  sourceCanvas: HTMLCanvasElement | null,
  meta: SkyCaptureMetadata,
  includeWatermark: boolean,
  lang: 'vi' | 'en'
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  const w = sourceCanvas && sourceCanvas.width > 0 ? sourceCanvas.width : 1280;
  const h = sourceCanvas && sourceCanvas.height > 0 ? sourceCanvas.height : 720;
  out.width = w;
  out.height = h;

  const ctx = out.getContext('2d');
  if (!ctx) return out;

  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, w, h);

  if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
    ctx.save();
    if (meta.nightVisionMode && 'filter' in ctx) {
      try {
        ctx.filter = 'hue-rotate(320deg) saturate(2.5) brightness(0.85)';
      } catch {
        // Ignore unsupported Canvas 2D filter fallback
      }
    }
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    ctx.restore();
  }

  if (!includeWatermark) {
    return out;
  }

  const info = formatCaptureWatermarkInfo(meta, lang);
  const compact = w < 820 || w < h;
  const barHeight = Math.max(
    compact ? 112 : 88,
    Math.min(180, Math.round(h * (compact ? 0.115 : 0.145)))
  );
  const barY = h - barHeight;
  const padX = Math.max(20, Math.round(w * 0.032));

  const barGrad = ctx.createLinearGradient(0, barY - 24, 0, h);
  barGrad.addColorStop(0, 'rgba(3, 7, 18, 0)');
  barGrad.addColorStop(0.24, 'rgba(3, 7, 18, 0.82)');
  barGrad.addColorStop(1, 'rgba(3, 7, 18, 0.94)');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, barY - 24, w, barHeight + 24);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = Math.max(1, Math.round(w * 0.0012));
  ctx.beginPath();
  ctx.moveTo(padX, barY);
  ctx.lineTo(w - padX, barY);
  ctx.stroke();

  const scale = compact
    ? Math.max(1.0, Math.min(1.5, w / 520))
    : Math.max(0.85, Math.min(1.55, w / 960));
  const emblemR = Math.round(18 * scale);
  const emblemX = padX + emblemR;
  const emblemY = barY + Math.round(barHeight * 0.48);
  drawAetheriaEmblemOnCanvas(ctx, emblemX, emblemY, emblemR);

  const leftTextX = emblemX + emblemR + Math.round(14 * scale);
  const titleFontPx = Math.round(18 * scale);
  const subFontPx = Math.round(12.5 * scale);
  const badgeFontPx = Math.round(10.5 * scale);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `700 ${titleFontPx}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = '#f8fafc';
  const titleY = barY + Math.round(barHeight * (compact ? 0.28 : 0.36));
  ctx.fillText(info.brand, leftTextX, titleY);

  const brandWidth = ctx.measureText(info.brand).width;
  const badgeX = leftTextX + brandWidth + Math.round(10 * scale);
  ctx.font = `700 ${badgeFontPx}px "JetBrains Mono", monospace`;
  const badgePad = Math.round(8 * scale);
  const badgeW = ctx.measureText(info.modeBadge).width + badgePad * 2;
  const badgeH = Math.round(20 * scale);
  ctx.fillStyle = 'rgba(14, 116, 144, 0.36)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX, titleY - badgeH / 2, badgeW, badgeH, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#67e8f9';
  ctx.fillText(info.modeBadge, badgeX + badgePad, titleY);

  const halfMaxW = compact
    ? w - leftTextX - padX
    : Math.round((w - leftTextX - padX * 2) * 0.52);
  ctx.font = `500 ${subFontPx}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#cbd5e1';
  const locY = barY + Math.round(barHeight * (compact ? 0.54 : 0.68));
  ctx.fillText(fitText(ctx, info.locationLine, halfMaxW), leftTextX, locY);

  if (compact) {
    ctx.font = `500 ${subFontPx}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#94a3b8';
    const thirdY = barY + Math.round(barHeight * 0.79);
    const combinedRight = info.targetLine ? `${info.timeLine} • ${info.targetLine}` : info.timeLine;
    ctx.fillText(fitText(ctx, combinedRight, w - leftTextX - padX), leftTextX, thirdY);
  } else {
    const rightMaxW = Math.round((w - padX * 2) * 0.44);
    ctx.textAlign = 'right';
    ctx.font = `500 ${subFontPx}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(fitText(ctx, info.timeLine, rightMaxW), w - padX, titleY);

    if (info.targetLine) {
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(fitText(ctx, info.targetLine, rightMaxW), w - padX, locY);
    }
  }

  return out;
}
