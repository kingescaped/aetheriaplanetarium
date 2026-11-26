export interface BlackHoleRenderParams {
  cx: number;
  cy: number;
  radius: number;
  timeSec: number;
  coronaAlpha: number;
  coreDarkness: number;
  diskForeground: number;
}

const DISK_TILT = -0.105;
const DISK_RX_MULT = 2.45;
const DISK_RY_MULT = 0.42;
const DISK_ASPECT = DISK_RY_MULT / DISK_RX_MULT;

interface EinsteinArcSeed {
  baseAngle: number;
  span: number;
  radiusMult: number;
  speed: number;
  widthScale: number;
  coolTint: boolean;
}

const EINSTEIN_ARCS: EinsteinArcSeed[] = [
  { baseAngle: 0.25, span: 0.62, radiusMult: 1.16, speed: 0.09, widthScale: 1.0, coolTint: true },
  { baseAngle: 1.35, span: 0.48, radiusMult: 1.34, speed: -0.07, widthScale: 0.85, coolTint: false },
  { baseAngle: 2.45, span: 0.72, radiusMult: 1.24, speed: 0.06, widthScale: 1.15, coolTint: true },
  { baseAngle: 3.45, span: 0.55, radiusMult: 1.48, speed: -0.05, widthScale: 0.9, coolTint: false },
  { baseAngle: 4.35, span: 0.64, radiusMult: 1.19, speed: 0.08, widthScale: 1.05, coolTint: true },
  { baseAngle: 5.30, span: 0.50, radiusMult: 1.62, speed: -0.06, widthScale: 0.8, coolTint: false },
];

interface PlasmaStreakSeed {
  radialU: number;
  angleOffset: number;
  span: number;
  speed: number;
  thicknessMult: number;
  intensity: number;
}

const DISK_STREAKS: PlasmaStreakSeed[] = Array.from({ length: 20 }, (_, i) => ({
  radialU: 0.06 + ((i * 37) % 88) / 100,
  angleOffset: (i * 1.6180339) % (Math.PI * 2),
  span: 0.26 + ((i * 19) % 45) / 100,
  speed: 0.55 + (1 - ((i * 37) % 88) / 100) * 0.95,
  thicknessMult: 0.7 + ((i * 13) % 10) * 0.08,
  intensity: 0.5 + ((i * 23) % 10) * 0.05,
}));

interface PhotonHotspotSeed {
  angleOffset: number;
  speed: number;
  span: number;
  radiusOffset: number;
}

const PHOTON_HOTSPOTS: PhotonHotspotSeed[] = [
  { angleOffset: 0.1, speed: 1.15, span: 0.34, radiusOffset: 1.012 },
  { angleOffset: 1.25, speed: 0.92, span: 0.26, radiusOffset: 1.024 },
  { angleOffset: 2.35, speed: 1.32, span: 0.42, radiusOffset: 1.008 },
  { angleOffset: 3.25, speed: 0.85, span: 0.28, radiusOffset: 1.031 },
  { angleOffset: 4.2, speed: 1.24, span: 0.36, radiusOffset: 1.016 },
  { angleOffset: 5.2, speed: 1.05, span: 0.24, radiusOffset: 1.028 },
];

interface InfallEmberSeed {
  armIndex: number;
  phaseOffset: number;
  speed: number;
  sizeMult: number;
  coolHue: boolean;
}

const INFALL_EMBERS: InfallEmberSeed[] = Array.from({ length: 28 }, (_, i) => ({
  armIndex: i % 5,
  phaseOffset: ((i * 0.381966) % 1),
  speed: 0.19 + (i % 4) * 0.04,
  sizeMult: 0.75 + (i % 5) * 0.22,
  coolHue: i % 3 === 0,
}));

function buildDopplerGradient(
  ctx: CanvasRenderingContext2D,
  outerRx: number,
  alpha: number,
  boost: number
): CanvasGradient {
  const grad = ctx.createLinearGradient(-outerRx, 0, outerRx, 0);
  const brightLeft = Math.min(1, alpha * boost);
  const midAlpha = Math.min(1, alpha * 0.86);
  const redRight = Math.min(1, alpha * 0.72);

  grad.addColorStop(0, `rgba(186, 230, 253, ${(brightLeft * 0.45).toFixed(3)})`);
  grad.addColorStop(0.16, `rgba(255, 251, 235, ${brightLeft.toFixed(3)})`);
  grad.addColorStop(0.34, `rgba(253, 224, 71, ${(brightLeft * 0.94).toFixed(3)})`);
  grad.addColorStop(0.55, `rgba(249, 115, 22, ${midAlpha.toFixed(3)})`);
  grad.addColorStop(0.82, `rgba(220, 38, 38, ${redRight.toFixed(3)})`);
  grad.addColorStop(1, `rgba(127, 29, 29, ${(redRight * 0.35).toFixed(3)})`);
  return grad;
}

function drawHalfAnnulus(
  ctx: CanvasRenderingContext2D,
  rxIn: number,
  rxOut: number,
  aspect: number,
  isFront: boolean
): void {
  const start = isFront ? 0 : Math.PI;
  const end = isFront ? Math.PI : Math.PI * 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, rxOut, rxOut * aspect, 0, start, end, false);
  ctx.ellipse(0, 0, rxIn, rxIn * aspect, 0, end, start, true);
  ctx.closePath();
  ctx.fill();
}

function drawDiskHalfStreaks(
  ctx: CanvasRenderingContext2D,
  rIn: number,
  rOut: number,
  radius: number,
  timeSec: number,
  alpha: number,
  isFront: boolean
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.lineCap = 'round';

  for (const streak of DISK_STREAKS) {
    const r = rIn + (rOut - rIn) * streak.radialU;
    const ry = r * DISK_ASPECT;
    const midAngle =
      (((streak.angleOffset - timeSec * streak.speed) % (Math.PI * 2)) + Math.PI * 2) %
      (Math.PI * 2);

    const inFront = midAngle >= 0 && midAngle <= Math.PI;
    if (inFront !== isFront) continue;

    // Doppler boost: approaching left side (midAngle near PI) shines brighter/whiter
    const doppler = 0.5 - 0.5 * Math.cos(midAngle);
    const localAlpha = alpha * streak.intensity * (0.42 + 0.58 * doppler);
    if (localAlpha < 0.02) continue;

    const aStart = midAngle - streak.span * 0.5;
    const aEnd = midAngle + streak.span * 0.5;
    const clampedStart = isFront ? Math.max(0.02, aStart) : Math.max(Math.PI + 0.02, aStart);
    const clampedEnd = isFront ? Math.min(Math.PI - 0.02, aEnd) : Math.min(Math.PI * 2 - 0.02, aEnd);
    if (clampedEnd <= clampedStart) continue;

    ctx.strokeStyle =
      doppler > 0.68
        ? `rgba(254, 249, 195, ${Math.min(1, localAlpha).toFixed(3)})`
        : doppler > 0.35
          ? `rgba(251, 191, 36, ${Math.min(1, localAlpha * 0.88).toFixed(3)})`
          : `rgba(234, 88, 12, ${Math.min(1, localAlpha * 0.72).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, radius * 0.022 * streak.thicknessMult);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, ry, 0, clampedStart, clampedEnd);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGravitationallyLensedArches(
  ctx: CanvasRenderingContext2D,
  radius: number,
  timeSec: number,
  alpha: number
): void {
  // Upper bent accretion halo (light from back disk bent over north pole: 1.0R -> 1.55R)
  const upperBands = [
    { rxIn: 1.005, rxOut: 1.17, ryIn: 1.005, ryOut: 1.24, op: 0.92, boost: 1.05 },
    { rxIn: 1.13, rxOut: 1.36, ryIn: 1.18, ryOut: 1.43, op: 0.62, boost: 0.95 },
    { rxIn: 1.30, rxOut: 1.54, ryIn: 1.34, ryOut: 1.55, op: 0.28, boost: 0.85 },
  ];

  for (const band of upperBands) {
    ctx.fillStyle = buildDopplerGradient(ctx, radius * band.rxOut, alpha * band.op, band.boost);
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      radius * band.rxOut,
      radius * band.ryOut,
      0,
      Math.PI,
      Math.PI * 2,
      false
    );
    ctx.ellipse(
      0,
      0,
      radius * band.rxIn,
      radius * band.ryIn,
      0,
      Math.PI * 2,
      Math.PI,
      true
    );
    ctx.closePath();
    ctx.fill();
  }

  // Lower bent accretion arch (underside lensed image: 1.0R -> 1.38R, softer)
  const lowerBands = [
    { rxIn: 1.005, rxOut: 1.14, ryIn: 1.005, ryOut: 1.19, op: 0.56, boost: 0.95 },
    { rxIn: 1.10, rxOut: 1.34, ryIn: 1.14, ryOut: 1.38, op: 0.28, boost: 0.85 },
  ];

  for (const band of lowerBands) {
    ctx.fillStyle = buildDopplerGradient(ctx, radius * band.rxOut, alpha * band.op, band.boost);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * band.rxOut, radius * band.ryOut, 0, 0, Math.PI, false);
    ctx.ellipse(0, 0, radius * band.rxIn, radius * band.ryIn, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
  }

  // Flowing bent plasma streaks over the upper lensing arch
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const r = radius * (1.07 + (i % 4) * 0.11);
    const ry = radius * (1.12 + (i % 4) * 0.11);
    const t = ((timeSec * (0.48 + (i % 3) * 0.14) + i * 0.41) % 1);
    const mid = Math.PI * 2 - t * Math.PI;
    const span = 0.24 + (i % 3) * 0.09;
    const doppler = 0.5 - 0.5 * Math.cos(mid);
    const fadeEdge = Math.sin(t * Math.PI);
    const streakAlpha = alpha * fadeEdge * (0.35 + 0.5 * doppler);
    if (streakAlpha < 0.02) continue;

    ctx.strokeStyle =
      doppler > 0.65
        ? `rgba(255, 251, 235, ${streakAlpha.toFixed(3)})`
        : `rgba(251, 146, 60, ${(streakAlpha * 0.82).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, radius * 0.018);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, ry, 0, Math.max(Math.PI, mid - span * 0.5), Math.min(Math.PI * 2, mid + span * 0.5));
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws the outer black hole layers BEFORE the 2D sky circle clip:
 * volumetric corona, Einstein-ring lensing arcs, gravitationally bent upper/lower arches,
 * and the back half of the relativistic accretion disk.
 */
export function drawBlackHoleOuter2D(
  ctx: CanvasRenderingContext2D,
  params: BlackHoleRenderParams
): void {
  const { cx, cy, radius, timeSec, coronaAlpha } = params;
  if (coronaAlpha <= 0.01 || radius <= 2) return;

  const breath = 0.94 + 0.06 * Math.sin(timeSec * 0.9);
  const rxOuter = radius * DISK_RX_MULT;

  ctx.save();
  ctx.translate(cx, cy);

  // 1. Multi-layered Volumetric Corona / Halo
  const outerHaloRadius = radius * 3.1 * breath;
  const violetCrimsonHalo = ctx.createRadialGradient(0, 0, radius * 0.85, 0, 0, outerHaloRadius);
  violetCrimsonHalo.addColorStop(0, `rgba(251, 146, 60, ${(0.34 * coronaAlpha).toFixed(3)})`);
  violetCrimsonHalo.addColorStop(0.24, `rgba(180, 83, 9, ${(0.24 * coronaAlpha).toFixed(3)})`);
  violetCrimsonHalo.addColorStop(0.52, `rgba(127, 29, 29, ${(0.14 * coronaAlpha).toFixed(3)})`);
  violetCrimsonHalo.addColorStop(0.76, `rgba(88, 28, 135, ${(0.08 * coronaAlpha).toFixed(3)})`);
  violetCrimsonHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = violetCrimsonHalo;
  ctx.beginPath();
  ctx.arc(0, 0, outerHaloRadius, 0, Math.PI * 2);
  ctx.fill();

  const innerCoronaRadius = radius * 1.92;
  const moltenCorona = ctx.createRadialGradient(0, 0, radius * 0.92, 0, 0, innerCoronaRadius);
  moltenCorona.addColorStop(0, `rgba(254, 240, 138, ${(0.48 * coronaAlpha).toFixed(3)})`);
  moltenCorona.addColorStop(0.32, `rgba(245, 158, 11, ${(0.28 * coronaAlpha).toFixed(3)})`);
  moltenCorona.addColorStop(0.7, `rgba(234, 88, 12, ${(0.1 * coronaAlpha).toFixed(3)})`);
  moltenCorona.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = moltenCorona;
  ctx.beginPath();
  ctx.arc(0, 0, innerCoronaRadius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Tangentially stretched Einstein-ring background arcs
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.lineCap = 'round';
  for (const arc of EINSTEIN_ARCS) {
    const r = radius * arc.radiusMult;
    const angle = arc.baseAngle + timeSec * arc.speed;
    const pulse = 0.65 + 0.35 * Math.sin(timeSec * 1.4 + arc.baseAngle);
    const arcAlpha = coronaAlpha * 0.36 * pulse;
    ctx.strokeStyle = arc.coolTint
      ? `rgba(186, 230, 253, ${arcAlpha.toFixed(3)})`
      : `rgba(253, 224, 71, ${arcAlpha.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, radius * 0.016 * arc.widthScale);
    ctx.beginPath();
    ctx.arc(0, 0, r, angle, angle + arc.span);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Tilted Gravitational Lensing Arches & Back Relativistic Accretion Disk
  ctx.save();
  ctx.rotate(DISK_TILT);

  drawGravitationallyLensedArches(ctx, radius, timeSec, coronaAlpha * 0.92);

  // Back half of Accretion Disk (drawn behind circle clip)
  const backAlpha = coronaAlpha * 0.92;
  ctx.fillStyle = buildDopplerGradient(ctx, rxOuter * 1.04, backAlpha * 0.28, 0.9);
  drawHalfAnnulus(ctx, radius * 1.92, rxOuter * 1.04, DISK_ASPECT, false);

  ctx.fillStyle = buildDopplerGradient(ctx, rxOuter * 0.96, backAlpha * 0.62, 1.0);
  drawHalfAnnulus(ctx, radius * 1.38, rxOuter * 0.96, DISK_ASPECT, false);

  ctx.fillStyle = buildDopplerGradient(ctx, radius * 1.62, backAlpha * 0.92, 1.12);
  drawHalfAnnulus(ctx, radius * 1.04, radius * 1.62, DISK_ASPECT, false);

  drawDiskHalfStreaks(ctx, radius * 1.06, rxOuter * 0.94, radius, timeSec, backAlpha, false);

  ctx.restore();
  ctx.restore();
}

/**
 * Draws interior Event Horizon limb darkening and pitch-black shadow inside the clipped sky circle.
 */
export function drawBlackHoleHorizonShadow2D(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  coreDarkness: number,
  coronaAlpha: number
): void {
  if (radius <= 1) return;

  if (coreDarkness >= 0.999) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - radius - 2, cy - radius - 2, radius * 2 + 4, radius * 2 + 4);
    return;
  }

  ctx.save();
  if (coronaAlpha > 0.01) {
    // Subtle rim darkening at the horizon boundary even at 1.0x so the Photon Ring integrates cleanly
    const rim = ctx.createRadialGradient(cx, cy, radius * 0.84, cx, cy, radius);
    rim.addColorStop(0, 'rgba(0, 0, 0, 0)');
    rim.addColorStop(0.65, `rgba(0, 0, 0, ${(0.14 * coronaAlpha).toFixed(3)})`);
    rim.addColorStop(1, `rgba(0, 0, 0, ${(0.44 * coronaAlpha).toFixed(3)})`);
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (coreDarkness > 0.01) {
    // Radial Event Horizon abyss swallowing stars outward from center + uniform shadow floor
    const abyss = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    const centerOp = Math.min(1, coreDarkness * 1.25);
    abyss.addColorStop(0, `rgba(0, 0, 0, ${centerOp.toFixed(3)})`);
    abyss.addColorStop(0.7, `rgba(0, 0, 0, ${Math.min(1, coreDarkness * 1.08).toFixed(3)})`);
    abyss.addColorStop(1, `rgba(0, 0, 0, ${coreDarkness.toFixed(3)})`);
    ctx.fillStyle = abyss;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws the front black hole layers AFTER the sky circle and horizon ring:
 * razor-sharp Photon Ring with caustic hot-spots, sweeping foreground accretion disk,
 * and spiraling relativistic infalling matter embers.
 */
export function drawBlackHoleFront2D(
  ctx: CanvasRenderingContext2D,
  params: BlackHoleRenderParams
): void {
  const { cx, cy, radius, timeSec, coronaAlpha, diskForeground } = params;
  if (coronaAlpha <= 0.01 || radius <= 2) return;

  const rxOuter = radius * DISK_RX_MULT;

  ctx.save();
  ctx.translate(cx, cy);

  // 1. Razor-sharp Animated Photon Ring (R to 1.045R)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const ringGlow = ctx.createRadialGradient(0, 0, radius * 0.96, 0, 0, radius * 1.085);
  ringGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
  ringGlow.addColorStop(0.32, `rgba(251, 191, 36, ${(0.42 * coronaAlpha).toFixed(3)})`);
  ringGlow.addColorStop(0.46, `rgba(255, 251, 235, ${(0.95 * coronaAlpha).toFixed(3)})`);
  ringGlow.addColorStop(0.62, `rgba(245, 158, 11, ${(0.55 * coronaAlpha).toFixed(3)})`);
  ringGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ringGlow;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.085, 0, Math.PI * 2);
  ctx.fill();

  // Primary caustic edge ring with subtle Doppler tilt gradient
  ctx.save();
  ctx.rotate(DISK_TILT);
  const photonGrad = ctx.createLinearGradient(-radius * 1.05, 0, radius * 1.05, 0);
  photonGrad.addColorStop(0, `rgba(224, 242, 254, ${Math.min(1, coronaAlpha).toFixed(3)})`);
  photonGrad.addColorStop(0.28, `rgba(255, 255, 255, ${Math.min(1, coronaAlpha).toFixed(3)})`);
  photonGrad.addColorStop(0.62, `rgba(253, 224, 71, ${(0.92 * coronaAlpha).toFixed(3)})`);
  photonGrad.addColorStop(1, `rgba(249, 115, 22, ${(0.82 * coronaAlpha).toFixed(3)})`);

  ctx.strokeStyle = photonGrad;
  ctx.lineWidth = Math.max(1.5, radius * 0.025);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.008, 0, Math.PI * 2);
  ctx.stroke();

  // Outer light-bending caustic shimmer ring
  const shimmerPulse = 0.55 + 0.25 * Math.sin(timeSec * 3.2);
  ctx.strokeStyle = `rgba(254, 243, 199, ${(shimmerPulse * coronaAlpha * 0.55).toFixed(3)})`;
  ctx.lineWidth = Math.max(1, radius * 0.012);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.032, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Caustic hot-spots racing around the photon sphere
  ctx.lineCap = 'round';
  for (const spot of PHOTON_HOTSPOTS) {
    const a = spot.angleOffset - timeSec * spot.speed;
    const r = radius * spot.radiusOffset;
    const pulse = 0.6 + 0.4 * Math.sin(timeSec * 4.5 + spot.angleOffset * 3);
    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.85 * pulse * coronaAlpha).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.4, radius * 0.022);
    ctx.beginPath();
    ctx.arc(0, 0, r, a, a + spot.span);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Sweeping Foreground Accretion Disk Arc crossing in front of the sphere
  if (diskForeground > 0.01) {
    ctx.save();
    ctx.rotate(DISK_TILT);

    // Outer fiery dust ribbon
    ctx.fillStyle = buildDopplerGradient(ctx, rxOuter * 1.03, diskForeground * 0.34, 0.9);
    drawHalfAnnulus(ctx, radius * 1.88, rxOuter * 1.03, DISK_ASPECT, true);

    // Mid molten plasma belt
    ctx.fillStyle = buildDopplerGradient(ctx, rxOuter * 0.95, diskForeground * 0.72, 1.05);
    drawHalfAnnulus(ctx, radius * 1.32, rxOuter * 0.95, DISK_ASPECT, true);

    // Subtle dark dust absorption lane for Interstellar depth
    ctx.strokeStyle = `rgba(12, 4, 2, ${(0.45 * diskForeground).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.2, radius * 0.032);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.84, radius * 1.84 * DISK_ASPECT, 0, 0.08, Math.PI - 0.08);
    ctx.stroke();

    // Blazing inner ISCO relativistic crest
    ctx.fillStyle = buildDopplerGradient(ctx, radius * 1.56, diskForeground * 0.96, 1.2);
    drawHalfAnnulus(ctx, radius * 1.05, radius * 1.56, DISK_ASPECT, true);

    // Inner blinding white-gold photon lip across foreground equator
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const iscoGrad = ctx.createLinearGradient(-radius * 1.35, 0, radius * 1.35, 0);
    iscoGrad.addColorStop(0, `rgba(224, 242, 254, ${(0.95 * diskForeground).toFixed(3)})`);
    iscoGrad.addColorStop(0.28, `rgba(255, 255, 255, ${(0.98 * diskForeground).toFixed(3)})`);
    iscoGrad.addColorStop(0.64, `rgba(253, 224, 71, ${(0.78 * diskForeground).toFixed(3)})`);
    iscoGrad.addColorStop(1, `rgba(249, 115, 22, ${(0.58 * diskForeground).toFixed(3)})`);
    ctx.strokeStyle = iscoGrad;
    ctx.lineWidth = Math.max(1.4, radius * 0.026);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.09, radius * 1.09 * DISK_ASPECT, 0, 0.04, Math.PI - 0.04);
    ctx.stroke();
    ctx.restore();

    // Animated swirling foreground plasma streaks
    drawDiskHalfStreaks(ctx, radius * 1.06, rxOuter * 0.94, radius, timeSec, diskForeground, true);

    ctx.restore();
  }

  // 3. Spiraling Relativistic Infalling Matter Embers
  const emberVisibility = Math.max(coronaAlpha * 0.4, diskForeground);
  if (emberVisibility > 0.04) {
    ctx.save();
    ctx.rotate(DISK_TILT);
    ctx.globalCompositeOperation = 'screen';

    for (const ember of INFALL_EMBERS) {
      const progress = (ember.phaseOffset + timeSec * ember.speed) % 1;
      const rFactor = 2.28 - progress * 1.27; // Pulls from 2.28R inward to 1.01R
      const spiralAngle =
        ember.armIndex * ((Math.PI * 2) / 5) - progress * 5.2 - timeSec * 0.45;
      const ex = Math.cos(spiralAngle) * radius * rFactor;
      const ey = Math.sin(spiralAngle) * radius * rFactor * (0.28 + progress * 0.45);

      const dist = Math.hypot(ex, ey);
      const innerHoleEllipse =
        (ex / (radius * 1.04)) ** 2 + (ey / (radius * 1.04 * DISK_ASPECT)) ** 2;
      // Hide embers passing behind or across any pitch-black Event Horizon region outside the glowing front disk ribbon
      const inFrontDiskBand =
        Math.sin(spiralAngle) >= 0 &&
        ey >= 0 &&
        innerHoleEllipse >= 1 &&
        ey <= radius * DISK_RY_MULT * 1.04;
      if (dist < radius * 1.06 && !inFrontDiskBand) {
        continue;
      }

      // At 1.0x normal stargazing (diskForeground ~ 0), keep embers outside the sky circle
      const insideCircleFactor = dist < radius * 1.06 ? diskForeground : 1;
      const fade = Math.sin(progress * Math.PI);
      const alpha = emberVisibility * fade * 0.85 * insideCircleFactor;
      if (alpha < 0.03) continue;

      const emberSize = Math.max(1.1, radius * 0.018 * ember.sizeMult * (1 - progress * 0.35));
      ctx.fillStyle = ember.coolHue
        ? `rgba(186, 230, 253, ${alpha.toFixed(3)})`
        : progress > 0.72
          ? `rgba(249, 115, 22, ${alpha.toFixed(3)})`
          : `rgba(254, 240, 138, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(ex, ey, emberSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}
