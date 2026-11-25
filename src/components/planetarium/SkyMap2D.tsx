import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Star, ObserverLocation, CelestialSettings } from '../../types/celestial';
import { 
  getLST, 
  equatorialToHorizontal, 
  getSpectralColor, 
  getStarVisualRadius,
  degToRad,
  radToDeg,
  normalizeDeg
} from '../../utils/astronomy';
import { CONSTELLATIONS } from '../../data/constellations';
import { RotateCcw, ZoomIn, ZoomOut, Crosshair } from 'lucide-react';

interface SkyMap2DProps {
  stars: Star[];
  location: ObserverLocation;
  currentDate: Date;
  settings: CelestialSettings;
  selectedStar: Star | null;
  onSelectStar: (star: Star) => void;
  onHoverCoords?: (coords: { ra: number; dec: number; alt: number; az: number }) => void;
}

interface ProjectedStar {
  star: Star;
  x: number;
  y: number;
  alt: number;
  az: number;
  visible: boolean;
}

export const SkyMap2D: React.FC<SkyMap2DProps> = ({
  stars,
  location,
  currentDate,
  settings,
  selectedStar,
  onSelectStar,
  onHoverCoords,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan & Zoom view state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredStar, setHoveredStar] = useState<Star | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Cached projected stars for hit testing
  const projectedStarsRef = useRef<ProjectedStar[]>([]);

  // Reset view to default
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Convert (alt, az) to 2D Canvas coordinates (North Up, East Left)
  const projectAltAzToCanvas = useCallback(
    (alt: number, az: number, cx: number, cy: number, radius: number): { x: number; y: number; visible: boolean } => {
      // If below horizon by more than 5 degrees, treat as not visible
      if (alt < -5) return { x: 0, y: 0, visible: false };

      // Distance from zenith (90° = center, 0° = radius, -5° = outer edge)
      const r = radius * ((90 - alt) / 90) * zoom;
      const azRad = degToRad(az);

      // East is Left (-X), North is Top (-Y), West is Right (+X), South is Bottom (+Y)
      const x = cx + pan.x - r * Math.sin(azRad);
      const y = cy + pan.y - r * Math.cos(azRad);

      return { x, y, visible: alt >= 0 };
    },
    [pan, zoom]
  );

  // Inverse project from Canvas (x, y) to (alt, az)
  const inverseProjectCanvas = useCallback(
    (x: number, y: number, cx: number, cy: number, radius: number): { alt: number; az: number } => {
      const dx = x - (cx + pan.x);
      const dy = y - (cy + pan.y);
      const dist = Math.sqrt(dx * dx + dy * dy);

      const alt = 90 - (dist / (radius * zoom)) * 90;
      // az: -dx = r * sin(az), -dy = r * cos(az)
      const azRad = Math.atan2(-dx, -dy);
      const az = normalizeDeg(radToDeg(azRad));

      return { alt, az };
    },
    [pan, zoom]
  );

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High-DPI screen clarity
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const baseRadius = Math.min(width, height) * 0.44;
    const currentRadius = baseRadius * zoom;

    // 1. Calculate Local Sidereal Time (LST)
    const lst = getLST(currentDate, location.longitude);

    // 2. Project all stars from equatorial (RA, Dec) to local horizontal (Alt, Az) and canvas (X, Y)
    const projectedMap = new Map<string | number, ProjectedStar>();
    const projectedList: ProjectedStar[] = [];

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      // Filter out stars dimmer than user setting
      if (star.mag > settings.magnitudeLimit) continue;

      const alt = star.alt !== undefined ? star.alt : 0;
      if (alt < -5) continue;
      const az = star.az !== undefined ? star.az : 0;
      const { x, y, visible } = projectAltAzToCanvas(alt, az, cx, cy, baseRadius);

      const proj: ProjectedStar = {
        star,
        x,
        y,
        alt,
        az,
        visible,
      };

      projectedMap.set(star.id, proj);
      projectedList.push(proj);
    }
    projectedStarsRef.current = projectedList;

    // 3. Draw Celestial Dome Circle Background & Horizon Mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + pan.x, cy + pan.y, currentRadius, 0, Math.PI * 2);
    ctx.closePath();

    // Dark celestial sphere gradient
    const skyGrad = ctx.createRadialGradient(
      cx + pan.x, cy + pan.y, 0,
      cx + pan.x, cy + pan.y, currentRadius
    );
    skyGrad.addColorStop(0, '#070f2b');
    skyGrad.addColorStop(0.7, '#04091a');
    skyGrad.addColorStop(1, '#02050f');
    ctx.fillStyle = skyGrad;
    ctx.fill();

    // Clip rendering strictly inside the horizon dome circle
    ctx.clip();

    // 4. Draw Coordinate Grid (Alt-Azimuthal Grid)
    if (settings.showGridLines) {
      ctx.lineWidth = 1;

      // Altitude Circles (30° and 60°)
      const altSteps = [30, 60];
      for (const alt of altSteps) {
        const r = currentRadius * ((90 - alt) / 90);
        ctx.beginPath();
        ctx.arc(cx + pan.x, cy + pan.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.setLineDash([4, 6]);
        ctx.stroke();

        // Label altitude
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`${alt}°`, cx + pan.x + 4, cy + pan.y - r + 11);
      }

      // Azimuth Spoke Lines (every 45°: N, NE, E, SE, S, SW, W, NW)
      ctx.setLineDash([2, 6]);
      for (let az = 0; az < 360; az += 45) {
        const rad = degToRad(az);
        const px = cx + pan.x - currentRadius * Math.sin(rad);
        const py = cy + pan.y - currentRadius * Math.cos(rad);
        ctx.beginPath();
        ctx.moveTo(cx + pan.x, cy + pan.y);
        ctx.lineTo(px, py);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset dashed lines

      // Zenith Center Point (90°)
      ctx.beginPath();
      ctx.arc(cx + pan.x, cy + pan.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.fill();
    }

    // 5. Draw Constellation Lines
    if (settings.showConstellationLines) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
      ctx.shadowBlur = 4;

      for (const con of CONSTELLATIONS) {
        for (const [starAId, starBId] of con.lines) {
          const pA = projectedMap.get(starAId);
          const pB = projectedMap.get(starBId);

          if (pA && pB && (pA.visible || pB.visible)) {
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // 6. Draw Constellation Names (Centroids)
    if (settings.showConstellationLabels) {
      ctx.save();
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const con of CONSTELLATIONS) {
        const { alt, az } = equatorialToHorizontal(con.centerRa, con.centerDec, location.latitude, lst);
        if (alt > 5) {
          const { x, y } = projectAltAzToCanvas(alt, az, cx, cy, baseRadius);

          // Subtle background pill
          ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
          ctx.fillText(con.nameVi || con.name, x, y);
        }
      }
      ctx.restore();
    }

    // 7. Draw Stars with Spectral Colors & Magnitude Glow
    for (const proj of projectedList) {
      if (!proj.visible) continue;

      const star = proj.star;
      const radius = getStarVisualRadius(star.mag);
      const starColor = getSpectralColor(star.spect);

      // Star radial glow for bright stars (mag < 2.5)
      if (star.mag < 2.5) {
        const glowRadius = radius * (star.mag < 0 ? 4.5 : star.mag < 1.5 ? 3.2 : 2.2);
        const glow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, glowRadius);
        glow.addColorStop(0, starColor);
        glow.addColorStop(0.35, `${starColor}66`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Star core
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = starColor;
      ctx.fill();

      // Star Name Label for prominent stars
      if (settings.showStarLabels && star.name && star.mag <= 2.2) {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(star.name, proj.x + radius + 4, proj.y + 3);
      }
    }

    // 8. Draw Highlight Ring for Selected Star
    if (selectedStar) {
      const selectedProj = projectedMap.get(selectedStar.id);
      if (selectedProj && selectedProj.visible) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;

        // Animated or pulsing target reticle
        const reticleRadius = 14;
        ctx.beginPath();
        ctx.arc(selectedProj.x, selectedProj.y, reticleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 4 crosshair dashes
        const len = 4;
        ctx.beginPath();
        // Top
        ctx.moveTo(selectedProj.x, selectedProj.y - reticleRadius - len);
        ctx.lineTo(selectedProj.x, selectedProj.y - reticleRadius + 2);
        // Bottom
        ctx.moveTo(selectedProj.x, selectedProj.y + reticleRadius + len);
        ctx.lineTo(selectedProj.x, selectedProj.y + reticleRadius - 2);
        // Left
        ctx.moveTo(selectedProj.x - reticleRadius - len, selectedProj.y);
        ctx.lineTo(selectedProj.x - reticleRadius + 2, selectedProj.y);
        // Right
        ctx.moveTo(selectedProj.x + reticleRadius + len, selectedProj.y);
        ctx.lineTo(selectedProj.x + reticleRadius - 2, selectedProj.y);
        ctx.stroke();

        ctx.restore();
      }
    }

    // 9. Draw Highlight for Hovered Star
    if (hoveredStar && (!selectedStar || hoveredStar.id !== selectedStar.id)) {
      const hProj = projectedMap.get(hoveredStar.id);
      if (hProj && hProj.visible) {
        ctx.save();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(hProj.x, hProj.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore(); // End clipping

    // 10. Draw Horizon Boundary Ring & Cardinal Directions (outside clip)
    if (settings.showGroundHorizon) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + pan.x, cy + pan.y, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Cardinal points (N, NE, E, SE, S, SW, W, NW)
      const cardinals = [
        { label: 'N', az: 0, color: '#38bdf8' },
        { label: 'NE', az: 45, color: '#94a3b8' },
        { label: 'E', az: 90, color: '#38bdf8' },
        { label: 'SE', az: 135, color: '#94a3b8' },
        { label: 'S', az: 180, color: '#38bdf8' },
        { label: 'SW', az: 225, color: '#94a3b8' },
        { label: 'W', az: 270, color: '#38bdf8' },
        { label: 'NW', az: 315, color: '#94a3b8' },
      ];

      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const card of cardinals) {
        const rad = degToRad(card.az);
        // Just outside the ring
        const labelR = currentRadius + 16;
        const lx = cx + pan.x - labelR * Math.sin(rad);
        const ly = cy + pan.y - labelR * Math.cos(rad);

        ctx.fillStyle = card.color;
        ctx.fillText(card.label, lx, ly);
      }
      ctx.restore();
    }

    ctx.restore();
  }, [
    stars,
    location,
    currentDate,
    settings,
    zoom,
    pan,
    selectedStar,
    hoveredStar,
    projectAltAzToCanvas,
  ]);

  // Mouse Move Event (Hover detection & Alt/Az coordinate reporting)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Handle drag pan
    if (isDragging) {
      setPan({
        x: mouseX - dragStart.x,
        y: mouseY - dragStart.y,
      });
      return;
    }

    // Telemetry altitude & azimuth under mouse
    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const baseRadius = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.44;
    const { alt, az } = inverseProjectCanvas(mouseX, mouseY, cx, cy, baseRadius);

    if (onHoverCoords) {
      onHoverCoords({
        ra: 0,
        dec: 0,
        alt: Math.max(-90, Math.min(90, alt)),
        az,
      });
    }

    // Check hit star
    let closest: Star | null = null;
    let minDist = 15; // 15px hit radius

    for (const proj of projectedStarsRef.current) {
      if (!proj.visible) continue;
      const dx = proj.x - mouseX;
      const dy = proj.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) {
        minDist = dist;
        closest = proj.star;
      }
    }

    setHoveredStar(closest);
    if (closest) {
      setTooltipPos({ x: mouseX, y: mouseY });
    } else {
      setTooltipPos(null);
    }
  };

  // Mouse Down Event
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - canvasRef.current!.getBoundingClientRect().left - pan.x,
      y: e.clientY - canvasRef.current!.getBoundingClientRect().top - pan.y,
    });
  };

  // Mouse Up & Click Event
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (hoveredStar) {
      onSelectStar(hoveredStar);
    }
  };

  // Wheel Zoom Event
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((prev) => Math.max(0.6, Math.min(4.0, prev + delta)));
  };

  // Touch Handlers for Mobile 2D Sky Map
  const touchPinchDist = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      const rect = canvasRef.current!.getBoundingClientRect();
      const mouseX = touch.clientX - rect.left;
      const mouseY = touch.clientY - rect.top;
      setDragStart({
        x: mouseX - pan.x,
        y: mouseY - pan.y,
      });

      // Hit test on touch
      let closest: Star | null = null;
      let minDist = 22; // slightly larger for finger taps
      for (const proj of projectedStarsRef.current) {
        if (!proj.visible) continue;
        const dx = proj.x - mouseX;
        const dy = proj.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          closest = proj.star;
        }
      }
      if (closest) {
        onSelectStar(closest);
      }
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchPinchDist.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const rect = canvasRef.current!.getBoundingClientRect();
      const mouseX = touch.clientX - rect.left;
      const mouseY = touch.clientY - rect.top;
      setPan({
        x: mouseX - dragStart.x,
        y: mouseY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const delta = (currentDist - touchPinchDist.current) * 0.005;
      touchPinchDist.current = currentDist;
      setZoom((prev) => Math.max(0.6, Math.min(4.0, prev + delta)));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchPinchDist.current = null;
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-crosshair touch-none"
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full block touch-none"
      />

      {/* Floating Hover Tooltip */}
      {hoveredStar && tooltipPos && (
        <div
          className="absolute z-30 pointer-events-none px-3 py-2 rounded-xl glass-panel border border-cyan-400/40 text-xs shadow-glow-cyan font-sans animate-in fade-in duration-150"
          style={{
            left: `${tooltipPos.x + 14}px`,
            top: `${tooltipPos.y - 35}px`,
          }}
        >
          <div className="font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{hoveredStar.name || hoveredStar.properName || `Star #${hoveredStar.id}`}</span>
          </div>
          <div className="text-[10px] text-slate-300 font-mono mt-0.5">
            {hoveredStar.con && `${hoveredStar.con} • `}Mag: {hoveredStar.mag} • Alt: {hoveredStar.alt?.toFixed(1)}°
          </div>
        </div>
      )}

      <div
        className={`absolute z-20 flex flex-col space-y-2 pointer-events-auto transition-all duration-300 ${
          selectedStar
            ? 'top-[138px] right-[max(0.625rem,var(--sar))] md:top-4 md:right-[calc(24rem+max(1rem,var(--sar))+12px)]'
            : 'top-3 right-[max(0.875rem,var(--sar))] md:top-4 md:right-[max(1.25rem,var(--sar))]'
        }`}
      >
        <button
          onClick={() => setZoom((z) => Math.min(4.0, z + 0.25))}
          className="p-2 rounded-xl glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 hover:shadow-glow-cyan transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
          className="p-2 rounded-xl glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 hover:shadow-glow-cyan transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={handleResetView}
          className="p-2 rounded-xl glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 hover:shadow-glow-cyan transition-all cursor-pointer"
          title="Reset 2D Sky Map View"
        >
          <RotateCcw className="w-4 h-4 text-purple-400" />
        </button>
      </div>
    </div>
  );
};
