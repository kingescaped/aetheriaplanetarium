import type { MilkyWayOverlayData } from '../../types/atmosphere';

type ProjectAltAzFn = (
  alt: number,
  az: number,
  cx: number,
  cy: number,
  radius: number
) => { x: number; y: number; visible: boolean };

export function drawMilkyWay2D(
  ctx: CanvasRenderingContext2D,
  milkyWay: MilkyWayOverlayData,
  projectFn: ProjectAltAzFn,
  cx: number,
  cy: number,
  baseRadius: number,
  currentRadius: number,
  visibility: number
): void {
  if (visibility <= 0.04) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const degPxScale = currentRadius / 90;
  for (let i = 0; i < milkyWay.samples.length; i++) {
    const s = milkyWay.samples[i];
    if (s.alt < -10) continue;

    const cPt = projectFn(s.alt, s.az, cx, cy, baseRadius);
    const nPt =
      s.northAlt >= -4
        ? projectFn(s.northAlt, s.northAz, cx, cy, baseRadius)
        : null;
    const sPt =
      s.southAlt >= -4
        ? projectFn(s.southAlt, s.southAz, cx, cy, baseRadius)
        : null;

    const distNorth = nPt ? Math.hypot(nPt.x - cPt.x, nPt.y - cPt.y) : s.widthDeg * degPxScale;
    const distSouth = sPt ? Math.hypot(sPt.x - cPt.x, sPt.y - cPt.y) : s.widthDeg * degPxScale;
    const bandRadius = Math.max(12, Math.min(currentRadius * 0.28, (distNorth + distSouth) * 0.52));

    const alphaOuter = (0.095 + s.intensity * 0.09) * visibility;
    const r = Math.round(135 + s.bulgeFactor * 95);
    const g = Math.round(168 + s.bulgeFactor * 42);
    const b = Math.round(238 - s.bulgeFactor * 52);

    const outerGrad = ctx.createRadialGradient(
      cPt.x,
      cPt.y,
      bandRadius * 0.08,
      cPt.x,
      cPt.y,
      bandRadius * 1.45
    );
    outerGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alphaOuter.toFixed(3)})`);
    outerGrad.addColorStop(
      0.55,
      `rgba(96, 138, 214, ${(alphaOuter * 0.42).toFixed(3)})`
    );
    outerGrad.addColorStop(1, 'rgba(30, 58, 138, 0)');

    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(cPt.x, cPt.y, bandRadius * 1.45, 0, Math.PI * 2);
    ctx.fill();

    // Luminous star-cloud core ridge
    const coreAlpha = (0.045 + s.bulgeFactor * 0.1) * visibility;
    const coreGrad = ctx.createRadialGradient(cPt.x, cPt.y, 0, cPt.x, cPt.y, bandRadius * 0.72);
    coreGrad.addColorStop(
      0,
      `rgba(${Math.min(255, r + 25)}, ${Math.min(255, g + 22)}, ${Math.min(255, b + 12)}, ${coreAlpha.toFixed(3)})`
    );
    coreGrad.addColorStop(1, 'rgba(147, 197, 253, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cPt.x, cPt.y, bandRadius * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle dark Great Rift dust lane along inner Milky Way (Cygnus to Sagittarius)
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < milkyWay.samples.length; i++) {
    const s = milkyWay.samples[i];
    if (s.alt < -4) continue;
    const lSigned = s.lDeg > 180 ? s.lDeg - 360 : s.lDeg;
    if (lSigned < -35 || lSigned > 85) continue;

    const cPt = projectFn(s.alt, s.az, cx, cy, baseRadius);
    const riftRadius = Math.max(6, s.widthDeg * degPxScale * 0.24);
    const riftAlpha = 0.22 * visibility;
    const riftGrad = ctx.createRadialGradient(cPt.x, cPt.y, 0, cPt.x, cPt.y, riftRadius);
    riftGrad.addColorStop(0, `rgba(2, 6, 20, ${riftAlpha.toFixed(3)})`);
    riftGrad.addColorStop(1, 'rgba(2, 6, 20, 0)');

    ctx.fillStyle = riftGrad;
    ctx.beginPath();
    ctx.arc(cPt.x, cPt.y, riftRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
