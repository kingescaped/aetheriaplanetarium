import type { TwilightState } from '../../types/atmosphere';
import { clamp } from '../../utils/seeingModel';
import { degToRad } from '../../utils/astronomy';
import { NIGHT_TWILIGHT_COLORS, hexToRgba } from '../../utils/twilight';

export function drawTwilightSky2D(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  currentRadius: number,
  twilightState: TwilightState | undefined
): void {
  const zenith = twilightState?.enabled ? twilightState.zenithColor : NIGHT_TWILIGHT_COLORS.zenith;
  const mid = twilightState?.enabled ? twilightState.midColor : NIGHT_TWILIGHT_COLORS.mid;
  const horizon = twilightState?.enabled
    ? twilightState.horizonColor
    : NIGHT_TWILIGHT_COLORS.horizon;

  const skyGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, currentRadius);
  skyGrad.addColorStop(0, zenith);
  skyGrad.addColorStop(0.68, mid);
  skyGrad.addColorStop(1, horizon);
  ctx.fillStyle = skyGrad;
  ctx.fill();
}

export function drawTwilightHorizonGlow2D(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  currentRadius: number,
  twilightState: TwilightState | undefined
): void {
  if (!twilightState?.enabled || twilightState.sunGlowOpacity <= 0.01) return;

  const azRad = degToRad(twilightState.sunAzDeg);
  const clampedAlt = clamp(twilightState.sunAltDeg, -2, 52);
  const radialOffset = currentRadius * ((90 - Math.max(0, clampedAlt)) / 90);
  const glowX = centerX - radialOffset * Math.sin(azRad);
  const glowY = centerY - radialOffset * Math.cos(azRad);
  const glowRadius = currentRadius * (twilightState.phase === 'daylight' ? 0.95 : 0.78);

  ctx.save();
  const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);
  glow.addColorStop(0, hexToRgba(twilightState.sunGlowColor, twilightState.sunGlowOpacity));
  glow.addColorStop(
    0.42,
    hexToRgba(twilightState.sunGlowColor, twilightState.sunGlowOpacity * 0.42)
  );
  glow.addColorStop(1, hexToRgba(twilightState.sunGlowColor, 0));

  ctx.fillStyle = glow;
  ctx.fillRect(
    centerX - currentRadius - 2,
    centerY - currentRadius - 2,
    currentRadius * 2 + 4,
    currentRadius * 2 + 4
  );
  ctx.restore();
}
