import type { Star } from '../../types/celestial';
import type { SkyVisualAttenuation } from '../../types/weather';

export interface ProjectedSatellite {
  star: Star;
  x: number;
  y: number;
  alt: number;
  az: number;
  visible: boolean;
}

type ProjectAltAzFn = (
  alt: number,
  az: number,
  cx: number,
  cy: number,
  radius: number
) => { x: number; y: number; visible: boolean };

function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return `rgba(52, 211, 153, ${alpha.toFixed(3)})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

export function drawSatellites2D(
  ctx: CanvasRenderingContext2D,
  satellites: Star[],
  projectFn: ProjectAltAzFn,
  cx: number,
  cy: number,
  baseRadius: number,
  currentRadius: number,
  skyAttenuation: SkyVisualAttenuation | undefined,
  showLabels: boolean
): ProjectedSatellite[] {
  const projected: ProjectedSatellite[] = [];
  const baseAlpha = Math.max(0.55, skyAttenuation?.starOpacity ?? 1);
  const maxJumpDist = currentRadius * 0.45;

  for (const sat of satellites) {
    const meta = sat.satelliteData;
    if (!meta) continue;
    const alt = sat.alt ?? -90;
    const az = sat.az ?? 0;
    const color = sat.color || '#34d399';

    // 1. Orbital track arc above horizon
    ctx.save();
    ctx.strokeStyle = hexWithAlpha(color, 0.52 * baseAlpha);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    let prevX = 0;
    let prevY = 0;
    let hasPrev = false;

    for (const pt of meta.track) {
      if (pt.alt < -2) {
        hasPrev = false;
        continue;
      }
      const proj = projectFn(pt.alt, pt.az, cx, cy, baseRadius);
      if (!hasPrev || Math.hypot(proj.x - prevX, proj.y - prevY) > maxJumpDist) {
        ctx.moveTo(proj.x, proj.y);
      } else {
        ctx.lineTo(proj.x, proj.y);
      }
      prevX = proj.x;
      prevY = proj.y;
      hasPrev = true;
    }
    ctx.stroke();
    ctx.restore();

    if (alt < -2) continue;

    const { x, y, visible } = projectFn(alt, az, cx, cy, baseRadius);
    projected.push({ star: sat, x, y, alt, az, visible });
    if (!visible) continue;

    ctx.save();
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 16);
    glow.addColorStop(0, hexWithAlpha(color, 0.72 * baseAlpha));
    glow.addColorStop(0.5, hexWithAlpha(color, 0.25 * baseAlpha));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    // Spacecraft solar wings + central module diamond
    ctx.translate(x, y);
    ctx.strokeStyle = hexWithAlpha(color, baseAlpha);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-9, -3);
    ctx.lineTo(9, 3);
    ctx.stroke();

    ctx.fillStyle = meta.isSunlit ? '#f8fafc' : '#94a3b8';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -4.5);
    ctx.lineTo(4.5, 0);
    ctx.lineTo(0, 4.5);
    ctx.lineTo(-4.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (showLabels && sat.name) {
      ctx.save();
      ctx.font = '600 10.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexWithAlpha(color, Math.max(0.75, baseAlpha));
      ctx.fillText(`${sat.name} • ${Math.round(meta.altitudeKm)}km`, x + 11, y);
      ctx.restore();
    }
  }

  return projected;
}
