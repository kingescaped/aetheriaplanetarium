import type { SkyVisualAttenuation, WeatherSample } from '../../types/weather';

const CLOUD_PUFFS = [
  { angle: 0.35, dist: 0.28, rx: 0.34, ry: 0.16, rot: -0.25 },
  { angle: 1.45, dist: 0.42, rx: 0.38, ry: 0.18, rot: 0.35 },
  { angle: 2.35, dist: 0.56, rx: 0.44, ry: 0.19, rot: -0.18 },
  { angle: 3.3, dist: 0.36, rx: 0.32, ry: 0.15, rot: 0.42 },
  { angle: 4.25, dist: 0.62, rx: 0.46, ry: 0.2, rot: -0.3 },
  { angle: 5.15, dist: 0.46, rx: 0.36, ry: 0.17, rot: 0.15 },
  { angle: 0.85, dist: 0.72, rx: 0.42, ry: 0.16, rot: 0.6 },
  { angle: 2.85, dist: 0.78, rx: 0.48, ry: 0.18, rot: -0.5 },
  { angle: 4.75, dist: 0.74, rx: 0.4, ry: 0.15, rot: 0.28 },
];

export function drawSkyWeatherOverlay2D(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sample: WeatherSample,
  attenuation: SkyVisualAttenuation
): void {
  if (attenuation.hazeOpacity <= 0.02 || radius <= 0) return;

  ctx.save();

  const horizonHaze = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
  horizonHaze.addColorStop(0, `rgba(15, 28, 56, ${(attenuation.hazeOpacity * 0.35).toFixed(3)})`);
  horizonHaze.addColorStop(0.7, `rgba(24, 41, 74, ${(attenuation.hazeOpacity * 0.55).toFixed(3)})`);
  horizonHaze.addColorStop(1, `rgba(38, 60, 102, ${(attenuation.hazeOpacity * 0.85).toFixed(3)})`);
  ctx.fillStyle = horizonHaze;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  const cloudRatio = Math.min(1, Math.max(0, sample.cloudCover / 100));
  const activePuffs = Math.round(cloudRatio * CLOUD_PUFFS.length);

  for (let i = 0; i < activePuffs; i++) {
    const puff = CLOUD_PUFFS[i];
    const px = cx + Math.cos(puff.angle) * radius * puff.dist;
    const py = cy + Math.sin(puff.angle) * radius * puff.dist;
    const pr = radius * puff.rx;
    const wispAlpha = Math.min(0.42, attenuation.hazeOpacity * (0.45 + cloudRatio * 0.35));

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(puff.rot);
    ctx.scale(1, puff.ry / puff.rx);

    const wispGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, pr);
    wispGrad.addColorStop(0, `rgba(148, 163, 184, ${wispAlpha.toFixed(3)})`);
    wispGrad.addColorStop(0.55, `rgba(71, 85, 105, ${(wispAlpha * 0.5).toFixed(3)})`);
    wispGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');

    ctx.fillStyle = wispGrad;
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
