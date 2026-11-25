import type { Star } from '../../types/celestial';
import type { SkyVisualAttenuation } from '../../types/weather';

export interface ProjectedSolarBody {
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

function drawSun2D(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number): void {
  const corona = ctx.createRadialGradient(x, y, 0, x, y, 22);
  corona.addColorStop(0, `rgba(254, 249, 195, ${alpha})`);
  corona.addColorStop(0.35, `rgba(253, 224, 71, ${(alpha * 0.65).toFixed(3)})`);
  corona.addColorStop(1, 'rgba(250, 204, 21, 0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, 7.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoon2D(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  phaseAngleDeg: number,
  alpha: number
): void {
  const r = 7.5;
  const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.5);
  halo.addColorStop(0, `rgba(226, 232, 240, ${(alpha * 0.35).toFixed(3)})`);
  halo.addColorStop(1, 'rgba(226, 232, 240, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-r, -r, r * 2, r * 2);

  const rad = ((phaseAngleDeg % 360) * Math.PI) / 180;
  const isWaxing = phaseAngleDeg <= 180;
  const cosP = Math.cos(rad);
  const rx = Math.abs(cosP) * r;

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(0, 0, r, isWaxing ? -Math.PI / 2 : Math.PI / 2, isWaxing ? Math.PI / 2 : -Math.PI / 2);
  ctx.fill();

  ctx.fillStyle = cosP < 0 ? '#f8fafc' : '#1e293b';
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(0.2, rx), r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlanet2D(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  body: Star,
  alpha: number
): number {
  const color = body.color || '#bae6fd';
  const radius = body.mag < -1 ? 4.8 : body.mag < 2 ? 3.8 : 3.0;

  ctx.save();
  ctx.globalAlpha = alpha;
  const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.8);
  halo.addColorStop(0, color);
  halo.addColorStop(0.4, `${color}55`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.8, 0, Math.PI * 2);
  ctx.fill();

  if (body.solarSystemData?.bodyId === 'saturn') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.38);
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 2.4, radius * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  return radius;
}

export function drawSolarSystem2D(
  ctx: CanvasRenderingContext2D,
  bodies: Star[],
  projectFn: ProjectAltAzFn,
  cx: number,
  cy: number,
  baseRadius: number,
  skyAttenuation: SkyVisualAttenuation | undefined,
  showLabels: boolean
): ProjectedSolarBody[] {
  const projected: ProjectedSolarBody[] = [];
  const baseAlpha = skyAttenuation?.starOpacity ?? 1;

  for (const body of bodies) {
    const alt = body.alt ?? -90;
    const az = body.az ?? 0;
    if (alt < -5) continue;

    const { x, y, visible } = projectFn(alt, az, cx, cy, baseRadius);
    const entry: ProjectedSolarBody = { star: body, x, y, alt, az, visible };
    projected.push(entry);
    if (!visible) continue;

    const kind = body.solarSystemData?.kind ?? 'planet';
    const floorAlpha = kind === 'sun' ? 0.92 : kind === 'moon' ? 0.5 : 0.25;
    const alpha = Math.max(floorAlpha, baseAlpha);

    let labelOffset = 9;
    if (kind === 'sun') {
      drawSun2D(ctx, x, y, alpha);
      labelOffset = 11;
    } else if (kind === 'moon') {
      drawMoon2D(ctx, x, y, body.solarSystemData?.moonPhaseAngle ?? 180, alpha);
      labelOffset = 11;
    } else {
      labelOffset = drawPlanet2D(ctx, x, y, body, alpha) + 5;
    }

    if (showLabels && body.name) {
      ctx.save();
      ctx.globalAlpha = Math.max(0.45, alpha);
      ctx.font = '600 10.5px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = body.color || '#fef08a';
      ctx.fillText(body.name, x + labelOffset, y + 3);
      ctx.restore();
    }
  }

  return projected;
}
