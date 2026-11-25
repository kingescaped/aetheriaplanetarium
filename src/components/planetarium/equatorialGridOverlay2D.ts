import type { EquatorialCurvePoint, EquatorialGridData } from '../../types/atmosphere';
import type { SkyVisualAttenuation } from '../../types/weather';

export type ProjectAltAzFn = (
  alt: number,
  az: number,
  cx: number,
  cy: number,
  radius: number
) => { x: number; y: number; visible: boolean };

function strokeSplitCurve(
  ctx: CanvasRenderingContext2D,
  points: EquatorialCurvePoint[],
  projectFn: ProjectAltAzFn,
  cx: number,
  cy: number,
  baseRadius: number,
  maxJumpDist: number
): void {
  let prevX = 0;
  let prevY = 0;
  let hasPrev = false;

  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (pt.alt < -3) {
      hasPrev = false;
      continue;
    }

    const { x, y } = projectFn(pt.alt, pt.az, cx, cy, baseRadius);
    if (!hasPrev) {
      ctx.moveTo(x, y);
      prevX = x;
      prevY = y;
      hasPrev = true;
      continue;
    }

    if (Math.hypot(x - prevX, y - prevY) > maxJumpDist) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    prevX = x;
    prevY = y;
  }
  ctx.stroke();
}

export function drawEquatorialGrid2D(
  ctx: CanvasRenderingContext2D,
  grid: EquatorialGridData,
  projectFn: ProjectAltAzFn,
  cx: number,
  cy: number,
  baseRadius: number,
  currentRadius: number,
  skyAttenuation: SkyVisualAttenuation | undefined,
  showLabels: boolean
): void {
  const scale = Math.max(0.28, skyAttenuation?.constellationOpacity ?? 1);
  const maxJumpDist = currentRadius * 0.45;

  ctx.save();

  // 1. Right Ascension Meridians (every 2h = 30 deg)
  ctx.strokeStyle = `rgba(45, 212, 191, ${(0.22 * scale).toFixed(3)})`;
  ctx.lineWidth = 0.9;
  ctx.setLineDash([4, 5]);
  for (const meridian of grid.meridians) {
    strokeSplitCurve(ctx, meridian.points, projectFn, cx, cy, baseRadius, maxJumpDist);
  }

  // 2. Declination Parallels (-60, -30, 0 Eq, +30, +60)
  for (const parallel of grid.parallels) {
    if (parallel.isEquator) {
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(94, 234, 212, ${(0.48 * scale).toFixed(3)})`;
      ctx.lineWidth = 1.35;
    } else {
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = `rgba(45, 212, 191, ${(0.24 * scale).toFixed(3)})`;
      ctx.lineWidth = 0.95;
    }
    strokeSplitCurve(ctx, parallel.points, projectFn, cx, cy, baseRadius, maxJumpDist);
  }

  ctx.setLineDash([]);

  // 3. Celestial Poles (NCP / SCP)
  for (const pole of grid.poles) {
    if (pole.alt < 0) continue;
    const { x, y } = projectFn(pole.alt, pole.az, cx, cy, baseRadius);
    ctx.strokeStyle = `rgba(94, 234, 212, ${(0.85 * scale).toFixed(3)})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 7, y);
    ctx.lineTo(x + 7, y);
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x, y + 7);
    ctx.stroke();

    if (showLabels) {
      ctx.font = '600 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(153, 246, 228, ${Math.min(0.95, 0.85 * scale + 0.1).toFixed(3)})`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(pole.label, x + 8, y);
    }
  }

  // 4. RA & Dec coordinate labels
  if (showLabels) {
    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const meridian of grid.meridians) {
      if (!meridian.labelPoint || meridian.labelPoint.alt < 6) continue;
      const { x, y } = projectFn(
        meridian.labelPoint.alt,
        meridian.labelPoint.az,
        cx,
        cy,
        baseRadius
      );
      ctx.fillStyle = `rgba(94, 234, 212, ${Math.max(0.35, 0.62 * scale).toFixed(3)})`;
      ctx.fillText(meridian.label, x, y - 7);
    }

    for (const parallel of grid.parallels) {
      if (!parallel.labelPoint || parallel.labelPoint.alt < 8) continue;
      const { x, y } = projectFn(
        parallel.labelPoint.alt,
        parallel.labelPoint.az,
        cx,
        cy,
        baseRadius
      );
      ctx.fillStyle = parallel.isEquator
        ? `rgba(153, 246, 228, ${Math.max(0.55, 0.85 * scale).toFixed(3)})`
        : `rgba(94, 234, 212, ${Math.max(0.35, 0.65 * scale).toFixed(3)})`;
      ctx.fillText(parallel.label, x + 12, y - 6);
    }
  }

  ctx.restore();
}
