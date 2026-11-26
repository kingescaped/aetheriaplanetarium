import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Star, ObserverLocation, CelestialSettings } from '../../types/celestial';
import type { SkyVisualAttenuation, WeatherSample } from '../../types/weather';
import type { EclipticOverlayData } from '../../types/deepSky';
import type {
  EquatorialGridData,
  MilkyWayOverlayData,
  TwilightState,
} from '../../types/atmosphere';
import type { Language } from '../../utils/i18n';
import { drawTwilightSky2D, drawTwilightHorizonGlow2D } from './twilightSky2D';
import { drawMilkyWay2D } from './milkyWayOverlay2D';
import { computeMilkyWayVisibility } from '../../utils/milkyWay';
import { drawEquatorialGrid2D } from './equatorialGridOverlay2D';
import { drawSkyWeatherOverlay2D } from './skyWeatherOverlay2D';
import { drawSolarSystem2D, type ProjectedSolarBody } from './solarSystemOverlay2D';
import { drawSatellites2D, type ProjectedSatellite } from './satelliteOverlay2D';
import { drawEclipticOverlay2D } from './eclipticOverlay2D';
import { drawDeepSky2D, type ProjectedDeepSky } from './deepSkyOverlay2D';
import {
  drawBlackHoleFront2D,
  drawBlackHoleHorizonShadow2D,
  drawBlackHoleOuter2D,
} from './blackHoleOverlay2D';
import {
  computeSovereignArtworkLayout,
  drawSupremeCultivatorBack2D,
  drawSupremeCultivatorFront2D,
} from './supremeCultivatorOverlay2D';
import { drawSamsaraBackground2D, disposeSamsaraBackground2D } from './samsaraBackground2D';
import { drawSamsaraPlanets2D, PLANET_AUDIO_SLOTS } from './samsaraPlanetsOverlay2D';
import { AdminVfxAudioTracker, adminSoundFx } from '../../utils/adminAudio';
import {
  SHARED_SWORD_POOL,
  computeSwordFormationPoses,
  drawSwordFormationBack2D,
  drawSwordFormationFront2D,
  type FlyingSwordPose,
} from './swordFormation2D';
import type { ThreeSwordFormationRenderer } from './threeSwordFormationRenderer';
import {
  computeSamsaraClockSec,
  computeSamsaraState,
  computeSwordFormationState,
} from '../../utils/samsaraChoreography';
import {
  ADMIN_REFINING_ZOOM,
  applyMultiplicativeZoom,
  clampZoom,
  computeSkyMapLod,
  getAdminQuickZoomTarget,
} from '../../utils/skyMapLod';
import {
  getLST,
  equatorialToHorizontal,
  getSpectralColor,
  getStarVisualRadius,
  degToRad,
  radToDeg,
  normalizeDeg,
} from '../../utils/astronomy';
import { CONSTELLATIONS } from '../../data/constellations';
import { RotateCcw, ZoomIn, ZoomOut, Orbit, Volume2, VolumeX } from 'lucide-react';

export interface SkyMap2DProps {
  stars: Star[];
  location: ObserverLocation;
  currentDate: Date;
  settings: CelestialSettings;
  selectedStar: Star | null;
  onSelectStar: (star: Star) => void;
  onHoverCoords?: (coords: { ra: number; dec: number; alt: number; az: number }) => void;
  weatherSample?: WeatherSample | null;
  skyAttenuation?: SkyVisualAttenuation;
  solarBodies?: Star[];
  deepSkyBodies?: Star[];
  satelliteBodies?: Star[];
  eclipticData?: EclipticOverlayData | null;
  twilightState?: TwilightState;
  equatorialGridData?: EquatorialGridData | null;
  milkyWayData?: MilkyWayOverlayData | null;
  captureRef?: React.MutableRefObject<(() => HTMLCanvasElement | null) | null>;
  lang?: Language;
  isAdmin?: boolean;
  godModeEnabled?: boolean;
}

interface ProjectedStar {
  star: Star;
  x: number;
  y: number;
  alt: number;
  az: number;
  visible: boolean;
}

interface CachedStarProjection {
  stars: Star[];
  effectiveMagLimit: number;
  zoom: number;
  panX: number;
  panY: number;
  width: number;
  height: number;
  projectedList: ProjectedStar[];
  projectedMap: Map<string | number, ProjectedStar>;
}

interface CachedConstellationLabels {
  dateMs: number;
  lat: number;
  lon: number;
  zoom: number;
  panX: number;
  panY: number;
  width: number;
  height: number;
  items: { label: string; x: number; y: number }[];
}

interface RenderParamsSnapshot {
  stars: Star[];
  location: ObserverLocation;
  currentDate: Date;
  settings: CelestialSettings;
  zoom: number;
  pan: { x: number; y: number };
  selectedStar: Star | null;
  hoveredStar: Star | null;
  weatherSample?: WeatherSample | null;
  skyAttenuation?: SkyVisualAttenuation;
  solarBodies: Star[];
  deepSkyBodies: Star[];
  satelliteBodies: Star[];
  eclipticData: EclipticOverlayData | null;
  twilightState?: TwilightState;
  equatorialGridData: EquatorialGridData | null;
  milkyWayData: MilkyWayOverlayData | null;
  lang: Language;
  isAdmin: boolean;
  isGodMode: boolean;
}

function projectPointAltAz(
  alt: number,
  az: number,
  cx: number,
  cy: number,
  radius: number,
  zoom: number,
  panX: number,
  panY: number
): { x: number; y: number; visible: boolean } {
  if (alt < -5) return { x: 0, y: 0, visible: false };
  const r = radius * ((90 - alt) / 90) * zoom;
  const azRad = degToRad(az);
  const x = cx + panX - r * Math.sin(azRad);
  const y = cy + panY - r * Math.cos(azRad);
  return { x, y, visible: alt >= 0 };
}

function readOptionalVfxTimeParam(): number | null {
  if (typeof window === 'undefined') return null;
  const search = window.location.search;
  if (!search || !search.includes('vfxTime=')) return null;
  const raw = new URLSearchParams(search).get('vfxTime');
  if (raw === null || raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export const SkyMap2D: React.FC<SkyMap2DProps> = ({
  stars,
  location,
  currentDate,
  settings,
  selectedStar,
  onSelectStar,
  onHoverCoords,
  weatherSample,
  skyAttenuation,
  solarBodies = [],
  deepSkyBodies = [],
  satelliteBodies = [],
  eclipticData = null,
  twilightState,
  equatorialGridData = null,
  milkyWayData = null,
  captureRef,
  lang = 'vi',
  isAdmin = false,
  godModeEnabled = true,
}) => {
  const isGodMode = isAdmin && godModeEnabled;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fadeScratchCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pan & Zoom view state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredStar, setHoveredStar] = useState<Star | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Cached projected stars, deep sky, Solar System & satellites for hit testing
  const projectedStarsRef = useRef<ProjectedStar[]>([]);
  const projectedSolarRef = useRef<ProjectedSolarBody[]>([]);
  const projectedDeepSkyRef = useRef<ProjectedDeepSky[]>([]);
  const projectedSatRef = useRef<ProjectedSatellite[]>([]);

  const starProjCacheRef = useRef<CachedStarProjection | null>(null);
  const conLabelCacheRef = useRef<CachedConstellationLabels | null>(null);
  const deepZoomEnteredAtRef = useRef<number | null>(null);
  const swordPosesBufferRef = useRef<FlyingSwordPose[]>(SHARED_SWORD_POOL);

  const threeSwordRef = useRef<ThreeSwordFormationRenderer | null>(null);
  const threeSwordStatusRef = useRef<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const isMountedRef = useRef<boolean>(true);
  const audioTrackerRef = useRef<AdminVfxAudioTracker | null>(null);
  const [isAdminAudioMuted, setIsAdminAudioMuted] = useState<boolean>(() =>
    adminSoundFx.isAdminMuted()
  );

  const isGodModeRef = useRef<boolean>(isGodMode);
  isGodModeRef.current = isGodMode;

  const renderDataRef = useRef<RenderParamsSnapshot>({
    stars,
    location,
    currentDate,
    settings,
    zoom,
    pan,
    selectedStar,
    hoveredStar,
    weatherSample,
    skyAttenuation,
    solarBodies,
    deepSkyBodies,
    satelliteBodies,
    eclipticData,
    twilightState,
    equatorialGridData,
    milkyWayData,
    lang,
    isAdmin,
    isGodMode,
  });
  renderDataRef.current = {
    stars,
    location,
    currentDate,
    settings,
    zoom,
    pan,
    selectedStar,
    hoveredStar,
    weatherSample,
    skyAttenuation,
    solarBodies,
    deepSkyBodies,
    satelliteBodies,
    eclipticData,
    twilightState,
    equatorialGridData,
    milkyWayData,
    lang,
    isAdmin,
    isGodMode,
  };

  // Clamp zoom safely and dispose Admin 3D/WebGL/Audio resources when God Mode or admin privileges turn off
  useEffect(() => {
    adminSoundFx.setAdminActive(isAdmin);
    setIsAdminAudioMuted(adminSoundFx.isAdminMuted());
    setZoom((prev) => clampZoom(prev, isGodMode));
    if (!isGodMode) {
      deepZoomEnteredAtRef.current = null;
      if (threeSwordRef.current) {
        threeSwordRef.current.dispose();
        threeSwordRef.current = null;
        threeSwordStatusRef.current = 'idle';
      }
      disposeSamsaraBackground2D();
      adminSoundFx.stopAmbient();
      audioTrackerRef.current?.reset();
    }
  }, [isAdmin, isGodMode]);

  // Dispose Three.js 36-Sword Formation, Samsara WebGL shaders, and Admin Audio cleanly on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (threeSwordRef.current) {
        threeSwordRef.current.dispose();
        threeSwordRef.current = null;
      }
      threeSwordStatusRef.current = 'idle';
      disposeSamsaraBackground2D();
      adminSoundFx.stopAmbient();
      audioTrackerRef.current?.reset();
    };
  }, []);

  // Reset view to default
  const handleResetView = () => {
    if (isGodMode) {
      adminSoundFx.unlock();
      adminSoundFx.playAdminUiClick();
    }
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleToggleAdminRefiningView = () => {
    const target = getAdminQuickZoomTarget(zoom);
    if (isGodMode) {
      adminSoundFx.unlock();
      adminSoundFx.playAdminQuickZoomPortal(target <= 0.36);
    }
    setZoom(target);
    setPan({ x: 0, y: 0 });
  };

  const handleToggleAdminAudioMute = () => {
    adminSoundFx.unlock();
    const next = !isAdminAudioMuted;
    adminSoundFx.setAdminMuted(next);
    setIsAdminAudioMuted(next);
    if (!next) {
      adminSoundFx.playAdminUiClick();
    }
  };

  useEffect(() => {
    if (!captureRef) return;
    const captureFn = () => canvasRef.current;
    captureRef.current = captureFn;
    return () => {
      if (captureRef.current === captureFn) {
        captureRef.current = null;
      }
    };
  }, [captureRef]);

  // Attach non-passive wheel listener for silky multiplicative zoom without passive console warnings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rawDelta = -e.deltaY * 0.0012;
      const factor = Math.max(0.7, Math.min(1.4, 1 + rawDelta));
      setZoom((prev) => {
        const next = applyMultiplicativeZoom(prev, factor, isGodModeRef.current);
        if (isGodModeRef.current && next !== prev) {
          adminSoundFx.unlock();
          adminSoundFx.playAdminZoomTick(next, factor > 1);
        }
        return next;
      });
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  // Inverse project from Canvas (x, y) to (alt, az)
  const inverseProjectCanvas = useCallback(
    (x: number, y: number, cx: number, cy: number, radius: number): { alt: number; az: number } => {
      const dx = x - (cx + pan.x);
      const dy = y - (cy + pan.y);
      const dist = Math.sqrt(dx * dx + dy * dy);

      const alt = 90 - (dist / (radius * zoom)) * 90;
      const azRad = Math.atan2(-dx, -dy);
      const az = normalizeDeg(radToDeg(azRad));

      return { alt, az };
    },
    [pan, zoom]
  );

  // Core Canvas 2D frame renderer (used both on reactive state changes and 60fps admin rAF loop)
  const renderFrame = useCallback((timeSec: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) return;

    const snap = renderDataRef.current;
    const rawDpr = window.devicePixelRatio || 1;
    const dpr = snap.isGodMode ? Math.min(rawDpr, width >= 1024 ? 1.5 : 2) : rawDpr;

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    const lod = computeSkyMapLod(snap.zoom, snap.isGodMode);
    const showAnnotations = lod.annotationsAlpha >= 0.01;
    const showStarsLayer = lod.starsAlpha >= 0.01;

    const vfxOverride = snap.isGodMode ? readOptionalVfxTimeParam() : null;
    const effectiveTimeSec = vfxOverride !== null ? vfxOverride : timeSec;

    // Track deep-zoom entry timestamp strictly in useRef (zero setState inside rAF)
    if (!snap.isGodMode || lod.cultivatorReveal < 0.05) {
      deepZoomEnteredAtRef.current = null;
    } else if (deepZoomEnteredAtRef.current === null) {
      deepZoomEnteredAtRef.current = timeSec;
    }

    const vfxElapsedSec =
      vfxOverride !== null
        ? vfxOverride
        : deepZoomEnteredAtRef.current !== null
          ? Math.max(0, timeSec - deepZoomEnteredAtRef.current)
          : 0;

    const drawWithOpacity = (
      alpha: number,
      drawFn: (targetCtx: CanvasRenderingContext2D) => void
    ) => {
      if (alpha >= 0.99) {
        drawFn(ctx);
        return;
      }
      if (alpha < 0.01) return;

      let scratch = fadeScratchCanvasRef.current;
      if (!scratch) {
        scratch = document.createElement('canvas');
        fadeScratchCanvasRef.current = scratch;
      }
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);
      if (scratch.width !== targetW || scratch.height !== targetH) {
        scratch.width = targetW;
        scratch.height = targetH;
      }
      const sctx = scratch.getContext('2d');
      if (!sctx) {
        drawFn(ctx);
        return;
      }
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.clearRect(0, 0, width, height);
      drawFn(sctx);

      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.drawImage(scratch, 0, 0, width, height);
      ctx.restore();
    };

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const baseRadius = Math.min(width, height) * 0.44;
    const currentRadius = baseRadius * snap.zoom;
    const bhX = cx + snap.pan.x;
    const bhY = cy + snap.pan.y;

    const projectAltAzToCanvas = (
      alt: number,
      az: number,
      projCx: number,
      projCy: number,
      projRadius: number
    ) => projectPointAltAz(alt, az, projCx, projCy, projRadius, snap.zoom, snap.pan.x, snap.pan.y);

    const isDeepCultivatorActive = snap.isGodMode && lod.cultivatorReveal > 0.01;

    // Lazy dynamic import of WebGL ThreeSwordFormationRenderer ONLY when deep cultivator is active
    if (isDeepCultivatorActive && threeSwordStatusRef.current === 'idle') {
      threeSwordStatusRef.current = 'loading';
      import('./threeSwordFormationRenderer')
        .then(({ ThreeSwordFormationRenderer }) => {
          if (!isMountedRef.current || !isGodModeRef.current) {
            threeSwordStatusRef.current = 'idle';
            return;
          }
          try {
            threeSwordRef.current = new ThreeSwordFormationRenderer();
            threeSwordStatusRef.current = 'ready';
          } catch {
            threeSwordStatusRef.current = 'failed';
          }
        })
        .catch(() => {
          threeSwordStatusRef.current = 'failed';
        });
    }

    // Drive Samsara wheel from computeSamsaraClockSec so Taiji wheel & planets start at t=0 only when Sovereign reveals (>= 7.2s)
    const samsara = isDeepCultivatorActive
      ? computeSamsaraState(computeSamsaraClockSec(vfxElapsedSec))
      : null;
    const swordState = isDeepCultivatorActive
      ? computeSwordFormationState(vfxElapsedSec, lod.cultivatorReveal)
      : null;
    const samsaraReveal = swordState ? swordState.samsaraOpacity : 0;
    const sovereignLayout = isDeepCultivatorActive
      ? computeSovereignArtworkLayout({
          width,
          height,
          bhX,
          bhY,
          bhRadius: currentRadius,
          reveal: lod.cultivatorReveal,
          timeSec: effectiveTimeSec,
        })
      : null;
    const swordPoses =
      isDeepCultivatorActive && samsara && swordState && sovereignLayout
        ? computeSwordFormationPoses(
            {
              width,
              height,
              bhX,
              bhY,
              bhRadius: currentRadius,
              layout: sovereignLayout,
              swordState,
              samsara,
              timeSec: effectiveTimeSec,
            },
            swordPosesBufferRef.current
          )
        : null;

    const threeSword = threeSwordRef.current;
    if (
      isDeepCultivatorActive &&
      threeSword &&
      threeSwordStatusRef.current === 'ready' &&
      swordPoses &&
      swordState &&
      sovereignLayout
    ) {
      threeSword.update(
        swordPoses,
        swordState,
        sovereignLayout,
        width,
        height,
        dpr,
        bhX,
        bhY,
        effectiveTimeSec
      );
    }

    if (snap.isGodMode) {
      adminSoundFx.updateAmbient({
        isAdmin: snap.isGodMode,
        hidden: document.hidden || vfxOverride !== null,
        lod,
        samsara,
        swordState,
        timeSec: effectiveTimeSec,
      });
      if (!audioTrackerRef.current) {
        audioTrackerRef.current = new AdminVfxAudioTracker();
      }
      const events = audioTrackerRef.current.step({
        isAdmin: snap.isGodMode,
        isVfxTimeLocked: vfxOverride !== null,
        hidden: document.hidden,
        timeSec: effectiveTimeSec,
        lod,
        samsara,
        swordState,
        swordPoses,
        width,
        planetSlots: PLANET_AUDIO_SLOTS,
      });
      adminSoundFx.dispatchVfxEvents(events);
    }

    // 1. Samsara Volumetric Cloud Taiji Background (hidden while pure #000000 silhouette)
    if (isDeepCultivatorActive && samsara && samsaraReveal > 0.005) {
      drawSamsaraBackground2D(ctx, {
        width,
        height,
        bhX,
        bhY,
        reveal: samsaraReveal,
        samsara,
        timeSec: effectiveTimeSec,
      });
    }

    // 2. 12 Samsara Destroying / Reborn Celestial Planets (hidden while pure #000000 silhouette)
    if (isDeepCultivatorActive && samsara && sovereignLayout && samsaraReveal > 0.005) {
      drawSamsaraPlanets2D(ctx, {
        width,
        height,
        bhX,
        bhY,
        bhRadius: currentRadius,
        layout: sovereignLayout,
        reveal: samsaraReveal,
        samsara,
        timeSec: effectiveTimeSec,
      });
    }

    // 3. Supreme Cultivator Back (Ambient -> GodRays/Burst -> 36-Sword Back z<=0 -> Pure Silhouette / True Form -> Eye Flares)
    if (isDeepCultivatorActive && samsara && swordState) {
      drawSupremeCultivatorBack2D(ctx, {
        width,
        height,
        bhX,
        bhY,
        bhRadius: currentRadius,
        reveal: lod.cultivatorReveal,
        timeSec: effectiveTimeSec,
        samsara,
        swordState,
        onDrawBehindSovereign: swordPoses
          ? () => {
              if (threeSword && threeSwordStatusRef.current === 'ready') {
                ctx.save();
                ctx.globalAlpha *= swordState.swordOpacity;
                threeSword.renderBackTo2D(ctx, width, height);
                ctx.restore();
              } else {
                drawSwordFormationBack2D(ctx, swordPoses, swordState, samsara, effectiveTimeSec);
              }
            }
          : undefined,
      });
    }

    // 4A. Admin Black Hole Outer Layers (Volumetric Corona, Gravitational Lensing, Back Disk)
    if (snap.isGodMode && lod.blackHoleCoronaAlpha > 0.01) {
      drawBlackHoleOuter2D(ctx, {
        cx: bhX,
        cy: bhY,
        radius: currentRadius,
        timeSec: effectiveTimeSec,
        coronaAlpha: lod.blackHoleCoronaAlpha,
        coreDarkness: lod.blackHoleCoreDarkness,
        diskForeground: lod.blackHoleDiskForeground,
      });
    }

    // Project Stars (cached when inputs haven't changed)
    const effectiveMagLimit = Math.max(
      0.5,
      snap.settings.magnitudeLimit - (snap.skyAttenuation?.magPenalty ?? 0)
    );

    let projectedMap: Map<string | number, ProjectedStar>;
    let projectedList: ProjectedStar[];

    if (!showStarsLayer || (snap.isGodMode && lod.blackHoleCoreDarkness >= 0.999)) {
      projectedMap = new Map();
      projectedList = [];
      projectedStarsRef.current = [];
    } else {
      const cached = starProjCacheRef.current;
      if (
        cached &&
        cached.stars === snap.stars &&
        cached.effectiveMagLimit === effectiveMagLimit &&
        cached.zoom === snap.zoom &&
        cached.panX === snap.pan.x &&
        cached.panY === snap.pan.y &&
        cached.width === width &&
        cached.height === height
      ) {
        projectedList = cached.projectedList;
        projectedMap = cached.projectedMap;
      } else {
        projectedMap = new Map<string | number, ProjectedStar>();
        projectedList = [];
        for (let i = 0; i < snap.stars.length; i++) {
          const star = snap.stars[i];
          if (star.mag > effectiveMagLimit) continue;
          const alt = star.alt !== undefined ? star.alt : 0;
          if (alt < -5) continue;
          const az = star.az !== undefined ? star.az : 0;
          const { x, y, visible } = projectAltAzToCanvas(alt, az, cx, cy, baseRadius);
          const proj: ProjectedStar = { star, x, y, alt, az, visible };
          projectedMap.set(star.id, proj);
          projectedList.push(proj);
        }
        starProjCacheRef.current = {
          stars: snap.stars,
          effectiveMagLimit,
          zoom: snap.zoom,
          panX: snap.pan.x,
          panY: snap.pan.y,
          width,
          height,
          projectedList,
          projectedMap,
        };
      }
      projectedStarsRef.current = projectedList;
    }

    // 4B. Celestial Dome Circle Background & Clip -> #000000 Event Horizon Shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(bhX, bhY, currentRadius, 0, Math.PI * 2);
    ctx.closePath();

    const isFullAbyss = snap.isGodMode && lod.blackHoleCoreDarkness >= 0.999;
    if (isFullAbyss) {
      ctx.clip();
      drawBlackHoleHorizonShadow2D(
        ctx,
        bhX,
        bhY,
        currentRadius,
        lod.blackHoleCoreDarkness,
        lod.blackHoleCoronaAlpha
      );
      projectedSolarRef.current = [];
      projectedDeepSkyRef.current = [];
      projectedSatRef.current = [];
    } else {
      drawTwilightSky2D(ctx, bhX, bhY, currentRadius, snap.twilightState);
      ctx.clip();
      drawTwilightHorizonGlow2D(ctx, bhX, bhY, currentRadius, snap.twilightState);

      if (snap.settings.showMilkyWay && snap.milkyWayData && showStarsLayer) {
        drawMilkyWay2D(
          ctx,
          snap.milkyWayData,
          projectAltAzToCanvas,
          cx,
          cy,
          baseRadius,
          currentRadius,
          computeMilkyWayVisibility(snap.skyAttenuation, snap.twilightState) * lod.starsAlpha
        );
      }

      if (snap.settings.showGridLines && showAnnotations) {
        ctx.save();
        ctx.globalAlpha *= lod.annotationsAlpha;
        ctx.lineWidth = 1;

        const altSteps = [30, 60];
        for (const alt of altSteps) {
          const r = currentRadius * ((90 - alt) / 90);
          ctx.beginPath();
          ctx.arc(bhX, bhY, r, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
          ctx.setLineDash([4, 6]);
          ctx.stroke();

          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(`${alt}°`, bhX + 4, bhY - r + 11);
        }

        ctx.setLineDash([2, 6]);
        for (let az = 0; az < 360; az += 45) {
          const rad = degToRad(az);
          const px = bhX - currentRadius * Math.sin(rad);
          const py = bhY - currentRadius * Math.cos(rad);
          ctx.beginPath();
          ctx.moveTo(bhX, bhY);
          ctx.lineTo(px, py);
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
          ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(bhX, bhY, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.fill();
        ctx.restore();
      }

      if (snap.settings.showEquatorialGrid && snap.equatorialGridData && showAnnotations) {
        ctx.save();
        ctx.globalAlpha *= lod.annotationsAlpha;
        drawEquatorialGrid2D(
          ctx,
          snap.equatorialGridData,
          projectAltAzToCanvas,
          cx,
          cy,
          baseRadius,
          currentRadius,
          snap.skyAttenuation,
          snap.settings.showConstellationLabels || snap.settings.showStarLabels
        );
        ctx.restore();
      }

      if (snap.settings.showConstellationLines && showAnnotations && projectedMap.size > 0) {
        const lineScale = (snap.skyAttenuation?.constellationOpacity ?? 1) * lod.annotationsAlpha;
        ctx.save();
        ctx.strokeStyle = `rgba(56, 189, 248, ${(0.35 * lineScale).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.shadowColor = `rgba(56, 189, 248, ${(0.5 * lineScale).toFixed(3)})`;
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

      if (snap.settings.showConstellationLabels && showAnnotations) {
        const dateMs = snap.currentDate.getTime();
        const cachedLabels = conLabelCacheRef.current;
        let labelItems: { label: string; x: number; y: number }[];
        if (
          cachedLabels &&
          cachedLabels.dateMs === dateMs &&
          cachedLabels.lat === snap.location.latitude &&
          cachedLabels.lon === snap.location.longitude &&
          cachedLabels.zoom === snap.zoom &&
          cachedLabels.panX === snap.pan.x &&
          cachedLabels.panY === snap.pan.y &&
          cachedLabels.width === width &&
          cachedLabels.height === height
        ) {
          labelItems = cachedLabels.items;
        } else {
          const lst = getLST(snap.currentDate, snap.location.longitude);
          labelItems = [];
          for (const con of CONSTELLATIONS) {
            const { alt, az } = equatorialToHorizontal(
              con.centerRa,
              con.centerDec,
              snap.location.latitude,
              lst
            );
            if (alt > 5) {
              const { x, y } = projectAltAzToCanvas(alt, az, cx, cy, baseRadius);
              labelItems.push({ label: con.nameVi || con.name, x, y });
            }
          }
          conLabelCacheRef.current = {
            dateMs,
            lat: snap.location.latitude,
            lon: snap.location.longitude,
            zoom: snap.zoom,
            panX: snap.pan.x,
            panY: snap.pan.y,
            width,
            height,
            items: labelItems,
          };
        }

        const labelAlpha =
          Math.max(0.24, 0.75 * (snap.skyAttenuation?.constellationOpacity ?? 1)) *
          lod.annotationsAlpha;
        ctx.save();
        ctx.font = '500 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(56, 189, 248, ${labelAlpha.toFixed(3)})`;
        for (const item of labelItems) {
          ctx.fillText(item.label, item.x, item.y);
        }
        ctx.restore();
      }

      if (snap.settings.showEclipticLine && snap.eclipticData && showAnnotations) {
        ctx.save();
        ctx.globalAlpha *= lod.annotationsAlpha;
        drawEclipticOverlay2D(
          ctx,
          snap.eclipticData,
          projectAltAzToCanvas,
          cx,
          cy,
          baseRadius,
          snap.skyAttenuation,
          snap.lang
        );
        ctx.restore();
      }

      if (snap.settings.showDeepSky && showAnnotations) {
        let nextDeepSky: ProjectedDeepSky[] = [];
        drawWithOpacity(lod.annotationsAlpha, (targetCtx) => {
          nextDeepSky = drawDeepSky2D(
            targetCtx,
            snap.deepSkyBodies,
            projectAltAzToCanvas,
            cx,
            cy,
            baseRadius,
            snap.zoom,
            snap.selectedStar,
            snap.hoveredStar,
            snap.skyAttenuation,
            snap.settings.showStarLabels
          );
        });
        projectedDeepSkyRef.current = nextDeepSky;
      } else {
        projectedDeepSkyRef.current = [];
      }

      if (showStarsLayer) {
        const baseStarOpacity = snap.skyAttenuation?.starOpacity ?? 1;
        const daylightDimming = snap.twilightState?.skyBrightness ?? 0;
        const drawStarNames = snap.settings.showStarLabels && showAnnotations;

        for (const proj of projectedList) {
          if (!proj.visible) continue;

          const star = proj.star;
          const radius = getStarVisualRadius(star.mag);
          const starColor = getSpectralColor(star.spect);
          const brightBoost = star.mag < 1.0 ? 0.12 * (1 - daylightDimming * 0.85) : 0;
          const starAlpha =
            (baseStarOpacity < 0.999 ? Math.min(1, baseStarOpacity + brightBoost) : 1) *
            lod.starsAlpha;
          ctx.globalAlpha = starAlpha;

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

          ctx.beginPath();
          ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = starColor;
          ctx.fill();

          if (drawStarNames && star.name && star.mag <= 2.2) {
            ctx.globalAlpha = starAlpha * lod.annotationsAlpha;
            ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(star.name, proj.x + radius + 4, proj.y + 3);
          }
        }
        ctx.globalAlpha = 1;
      }

      if (snap.settings.showSolarSystem && showStarsLayer) {
        let nextSolar: ProjectedSolarBody[] = [];
        drawWithOpacity(lod.starsAlpha, (targetCtx) => {
          nextSolar = drawSolarSystem2D(
            targetCtx,
            snap.solarBodies,
            projectAltAzToCanvas,
            cx,
            cy,
            baseRadius,
            snap.skyAttenuation,
            snap.settings.showStarLabels && showAnnotations
          );
        });
        projectedSolarRef.current = nextSolar;
      } else {
        projectedSolarRef.current = [];
      }

      if (snap.settings.showSatellites && showAnnotations) {
        let nextSat: ProjectedSatellite[] = [];
        drawWithOpacity(lod.annotationsAlpha, (targetCtx) => {
          nextSat = drawSatellites2D(
            targetCtx,
            snap.satelliteBodies,
            projectAltAzToCanvas,
            cx,
            cy,
            baseRadius,
            currentRadius,
            snap.skyAttenuation,
            snap.settings.showStarLabels
          );
        });
        projectedSatRef.current = nextSat;
      } else {
        projectedSatRef.current = [];
      }

      if (
        snap.weatherSample &&
        snap.skyAttenuation &&
        snap.skyAttenuation.hazeOpacity > 0.02 &&
        showStarsLayer
      ) {
        ctx.save();
        ctx.globalAlpha *= lod.starsAlpha;
        drawSkyWeatherOverlay2D(
          ctx,
          bhX,
          bhY,
          currentRadius,
          snap.weatherSample,
          snap.skyAttenuation
        );
        ctx.restore();
      }

      if (snap.selectedStar) {
        const isAnnotationTarget =
          snap.selectedStar.bodyType === 'dso' || snap.selectedStar.bodyType === 'satellite';
        const reticleAlpha = isAnnotationTarget ? lod.annotationsAlpha : lod.starsAlpha;
        if (reticleAlpha >= 0.05) {
          const selectedProj =
            projectedSatRef.current.find((p) => p.star.id === snap.selectedStar!.id) ??
            projectedSolarRef.current.find((p) => p.star.id === snap.selectedStar!.id) ??
            projectedDeepSkyRef.current.find((p) => p.star.id === snap.selectedStar!.id) ??
            projectedMap.get(snap.selectedStar.id);
          if (selectedProj && selectedProj.visible) {
            ctx.save();
            ctx.globalAlpha *= reticleAlpha;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;

            const reticleRadius = 14;
            ctx.beginPath();
            ctx.arc(selectedProj.x, selectedProj.y, reticleRadius, 0, Math.PI * 2);
            ctx.stroke();

            const len = 4;
            ctx.beginPath();
            ctx.moveTo(selectedProj.x, selectedProj.y - reticleRadius - len);
            ctx.lineTo(selectedProj.x, selectedProj.y - reticleRadius + 2);
            ctx.moveTo(selectedProj.x, selectedProj.y + reticleRadius + len);
            ctx.lineTo(selectedProj.x, selectedProj.y + reticleRadius - 2);
            ctx.moveTo(selectedProj.x - reticleRadius - len, selectedProj.y);
            ctx.lineTo(selectedProj.x - reticleRadius + 2, selectedProj.y);
            ctx.moveTo(selectedProj.x + reticleRadius + len, selectedProj.y);
            ctx.lineTo(selectedProj.x + reticleRadius - 2, selectedProj.y);
            ctx.stroke();

            ctx.restore();
          }
        }
      }

      if (snap.hoveredStar && (!snap.selectedStar || snap.hoveredStar.id !== snap.selectedStar.id)) {
        const isAnnotationTarget =
          snap.hoveredStar.bodyType === 'dso' || snap.hoveredStar.bodyType === 'satellite';
        const hoverAlpha = isAnnotationTarget ? lod.annotationsAlpha : lod.starsAlpha;
        if (hoverAlpha >= 0.05) {
          const hProj =
            projectedSatRef.current.find((p) => p.star.id === snap.hoveredStar!.id) ??
            projectedSolarRef.current.find((p) => p.star.id === snap.hoveredStar!.id) ??
            projectedDeepSkyRef.current.find((p) => p.star.id === snap.hoveredStar!.id) ??
            projectedMap.get(snap.hoveredStar.id);
          if (hProj && hProj.visible) {
            ctx.save();
            ctx.globalAlpha *= hoverAlpha;
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(hProj.x, hProj.y, 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      if (snap.isGodMode) {
        drawBlackHoleHorizonShadow2D(
          ctx,
          bhX,
          bhY,
          currentRadius,
          lod.blackHoleCoreDarkness,
          lod.blackHoleCoronaAlpha
        );
      }
    }

    ctx.restore(); // End circle clipping

    // Horizon Boundary Ring & Cardinal Directions (controlled by annotationsAlpha)
    if (snap.settings.showGroundHorizon && showAnnotations) {
      ctx.save();
      ctx.globalAlpha *= lod.annotationsAlpha;
      ctx.beginPath();
      ctx.arc(bhX, bhY, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.stroke();

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
        const labelR = currentRadius + 16;
        const lx = bhX - labelR * Math.sin(rad);
        const ly = bhY - labelR * Math.cos(rad);

        ctx.fillStyle = card.color;
        ctx.fillText(card.label, lx, ly);
      }
      ctx.restore();
    }

    // 4C. Admin Black Hole Front Layers (Photon Ring, Sweeping Front Accretion Disk, Infalling Embers)
    if (snap.isGodMode && lod.blackHoleCoronaAlpha > 0.01) {
      drawBlackHoleFront2D(ctx, {
        cx: bhX,
        cy: bhY,
        radius: currentRadius,
        timeSec: effectiveTimeSec,
        coronaAlpha: lod.blackHoleCoronaAlpha,
        coreDarkness: lod.blackHoleCoreDarkness,
        diskForeground: lod.blackHoleDiskForeground,
      });
    }

    // 5. Supreme Cultivator Foreground Layers (Palm Seals + Golden Dao Chains + Lotus Ash outside Black Hole)
    if (isDeepCultivatorActive && samsara && swordState) {
      drawSupremeCultivatorFront2D(ctx, {
        width,
        height,
        bhX,
        bhY,
        bhRadius: currentRadius,
        reveal: lod.cultivatorReveal,
        timeSec: effectiveTimeSec,
        samsara,
        swordState,
      });
    }

    // 6. 36-Sword 3D Front Layers (z >= 0)
    if (isDeepCultivatorActive && swordPoses && swordState && samsara) {
      if (threeSword && threeSwordStatusRef.current === 'ready') {
        ctx.save();
        ctx.globalAlpha *= swordState.swordOpacity;
        threeSword.renderFrontTo2D(ctx, width, height);
        ctx.restore();
      } else {
        drawSwordFormationFront2D(ctx, swordPoses, swordState, samsara, effectiveTimeSec);
      }
    }

    ctx.restore();
  }, []);

  // Immediate synchronous render when inputs/view state change
  useEffect(() => {
    renderFrame(performance.now() * 0.001);
  }, [
    renderFrame,
    stars,
    location,
    currentDate,
    settings,
    zoom,
    pan,
    selectedStar,
    hoveredStar,
    weatherSample,
    skyAttenuation,
    solarBodies,
    deepSkyBodies,
    satelliteBodies,
    eclipticData,
    twilightState,
    equatorialGridData,
    milkyWayData,
    lang,
    isGodMode,
  ]);

  // Re-render crisply when container dimensions change (desktop resize or mobile orientation)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      renderFrame(performance.now() * 0.001);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [renderFrame]);

  // Smooth 60 FPS requestAnimationFrame loop for Admin animated Black Hole & Cultivator when God Mode is active
  useEffect(() => {
    if (!isGodMode) return;

    let rafId: number | null = null;
    let active = true;

    const tick = (nowMs: number) => {
      if (!active || document.hidden) {
        rafId = null;
        return;
      }
      renderFrame(nowMs * 0.001);
      rafId = window.requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (!active || document.hidden || rafId !== null) return;
      rafId = window.requestAnimationFrame(tick);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        adminSoundFx.stopAmbient();
        audioTrackerRef.current?.reset();
      } else {
        startLoop();
      }
    };

    startLoop();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isGodMode, renderFrame]);

  // Clear hover tooltip automatically if stars vanish in deep Black Hole zoom-out
  useEffect(() => {
    const lod = computeSkyMapLod(zoom, isGodMode);
    if (lod.starsAlpha < 0.05 && hoveredStar) {
      setHoveredStar(null);
      setTooltipPos(null);
    }
  }, [zoom, isGodMode, hoveredStar]);

  // Mouse Move Event (Hover detection & Alt/Az coordinate reporting)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      setPan({
        x: mouseX - dragStart.x,
        y: mouseY - dragStart.y,
      });
      return;
    }

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

    const lod = computeSkyMapLod(zoom, isGodMode);
    if (lod.starsAlpha < 0.05) {
      if (hoveredStar) {
        setHoveredStar(null);
        setTooltipPos(null);
      }
      return;
    }

    let closest: Star | null = null;
    let minDist = 18;

    for (const proj of projectedSatRef.current) {
      if (!proj.visible) continue;
      const dist = Math.hypot(proj.x - mouseX, proj.y - mouseY);
      if (dist < minDist) {
        minDist = dist;
        closest = proj.star;
      }
    }

    if (!closest) {
      for (const proj of projectedSolarRef.current) {
        if (!proj.visible) continue;
        const dist = Math.hypot(proj.x - mouseX, proj.y - mouseY);
        if (dist < minDist) {
          minDist = dist;
          closest = proj.star;
        }
      }
    }

    if (!closest) {
      minDist = 16;
      for (const proj of projectedDeepSkyRef.current) {
        if (!proj.visible) continue;
        const dist = Math.hypot(proj.x - mouseX, proj.y - mouseY);
        if (dist < minDist) {
          minDist = dist;
          closest = proj.star;
        }
      }
    }

    if (!closest) {
      minDist = 15;
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
    }

    setHoveredStar(closest);
    if (closest) {
      setTooltipPos({ x: mouseX, y: mouseY });
    } else {
      setTooltipPos(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - canvasRef.current!.getBoundingClientRect().left - pan.x,
      y: e.clientY - canvasRef.current!.getBoundingClientRect().top - pan.y,
    });
    if (isGodMode) {
      adminSoundFx.unlock();
      adminSoundFx.playAdminPanStart();
    }
  };

  const handleMouseUp = () => {
    if (isGodMode && isDragging) {
      adminSoundFx.playAdminPanEnd();
    }
    setIsDragging(false);
  };

  const handleClick = () => {
    if (hoveredStar) {
      if (isGodMode) {
        adminSoundFx.unlock();
        adminSoundFx.playAdminStarSelect();
      }
      onSelectStar(hoveredStar);
    }
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

      const lod = computeSkyMapLod(zoom, isGodMode);
      if (lod.starsAlpha < 0.05) {
        if (isGodMode) {
          adminSoundFx.unlock();
          adminSoundFx.playAdminPanStart();
        }
        return;
      }

      let closest: Star | null = null;
      let minDist = 24;
      for (const proj of projectedSatRef.current) {
        if (!proj.visible) continue;
        const dist = Math.hypot(proj.x - mouseX, proj.y - mouseY);
        if (dist < minDist) {
          minDist = dist;
          closest = proj.star;
        }
      }
      if (!closest) {
        for (const proj of projectedSolarRef.current) {
          if (!proj.visible) continue;
          const dist = Math.hypot(proj.x - mouseX, proj.y - mouseY);
          if (dist < minDist) {
            minDist = dist;
            closest = proj.star;
          }
        }
      }
      if (!closest) {
        minDist = 22;
        for (const proj of projectedDeepSkyRef.current) {
          if (!proj.visible) continue;
          const dist = Math.hypot(proj.x - mouseX, proj.y - mouseY);
          if (dist < minDist) {
            minDist = dist;
            closest = proj.star;
          }
        }
      }
      if (!closest) {
        minDist = 22;
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
      }
      if (closest) {
        if (isGodMode) {
          adminSoundFx.unlock();
          adminSoundFx.playAdminStarSelect();
        }
        onSelectStar(closest);
      } else if (isGodMode) {
        adminSoundFx.unlock();
        adminSoundFx.playAdminPanStart();
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
      const prevDist = touchPinchDist.current;
      touchPinchDist.current = currentDist;
      const ratio = prevDist > 0 ? currentDist / prevDist : 1;
      const clampedRatio = Math.max(0.75, Math.min(1.35, ratio));
      setZoom((prev) => {
        const next = applyMultiplicativeZoom(prev, clampedRatio, isGodModeRef.current);
        if (isGodModeRef.current && next !== prev) {
          adminSoundFx.unlock();
          adminSoundFx.playAdminZoomTick(next, clampedRatio > 1);
        }
        return next;
      });
    }
  };

  const handleTouchEnd = () => {
    if (isGodMode && isDragging) {
      adminSoundFx.playAdminPanEnd();
    }
    setIsDragging(false);
    touchPinchDist.current = null;
  };

  const isRefiningView = isGodMode && zoom <= 0.36;

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
        className={`absolute z-20 flex flex-col items-end space-y-2 pointer-events-auto transition-all duration-300 ${selectedStar
          ? 'top-[138px] right-[max(0.625rem,var(--sar))] md:top-4 md:right-[calc(24rem+max(1rem,var(--sar))+12px)]'
          : 'top-3 right-[max(0.875rem,var(--sar))] md:top-4 md:right-[max(1.25rem,var(--sar))]'
          }`}
      >
        {isGodMode && (
          <div
            className="px-2 py-0.5 rounded-lg glass-panel border border-amber-400/45 text-[10px] font-mono font-semibold text-amber-200 tracking-tight shadow-[0_0_12px_rgba(245,158,11,0.28)]"
            aria-label={`Zoom ${zoom.toFixed(2)}x`}
          >
            {zoom.toFixed(2)}×
          </div>
        )}

        <button
          onMouseEnter={() => isGodMode && adminSoundFx.playAdminUiHover()}
          onClick={() => {
            setZoom((z) => {
              const next = applyMultiplicativeZoom(z, 1.25, isGodMode);
              if (isGodMode && next !== z) {
                adminSoundFx.unlock();
                adminSoundFx.playAdminZoomTick(next, true);
              }
              return next;
            });
          }}
          className="p-2 rounded-xl glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 hover:shadow-glow-cyan transition-all cursor-pointer"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onMouseEnter={() => isGodMode && adminSoundFx.playAdminUiHover()}
          onClick={() => {
            setZoom((z) => {
              const next = applyMultiplicativeZoom(z, 0.8, isGodMode);
              if (isGodMode && next !== z) {
                adminSoundFx.unlock();
                adminSoundFx.playAdminZoomTick(next, false);
              }
              return next;
            });
          }}
          className="p-2 rounded-xl glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 hover:shadow-glow-cyan transition-all cursor-pointer"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onMouseEnter={() => isGodMode && adminSoundFx.playAdminUiHover()}
          onClick={handleResetView}
          className="p-2 rounded-xl glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 hover:shadow-glow-cyan transition-all cursor-pointer"
          title="Reset 2D Sky Map View"
          aria-label="Reset 2D Sky Map View"
        >
          <RotateCcw className="w-4 h-4 text-purple-400" />
        </button>

        {isGodMode && (
          <>
            <button
              onMouseEnter={() => adminSoundFx.playAdminUiHover()}
              onClick={handleToggleAdminRefiningView}
              data-testid="admin-blackhole-zoom-toggle"
              className={`px-2 py-1.5 rounded-xl glass-panel border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold ${isRefiningView
                ? 'border-amber-300/80 text-amber-100 bg-amber-500/20 shadow-[0_0_16px_rgba(251,191,36,0.45)]'
                : 'border-amber-400/40 text-amber-300 hover:text-amber-100 hover:border-amber-300/75 hover:shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                }`}
              title={
                isRefiningView
                  ? lang === 'vi'
                    ? 'Trở về góc nhìn bầu trời 1.0×'
                    : 'Switch back to 1.0× Sky View'
                  : lang === 'vi'
                    ? `Pháp Tướng Luyện Hóa Hố Đen (${ADMIN_REFINING_ZOOM}×)`
                    : `Supreme Refining View (${ADMIN_REFINING_ZOOM}×)`
              }
              aria-label={isRefiningView ? 'Switch to 1.0x Sky View' : 'Switch to 0.18x Black Hole Refining View'}
            >
              <Orbit className="w-3.5 h-3.5 text-amber-300" />
              <span>{isRefiningView ? '1.0×' : `${ADMIN_REFINING_ZOOM}×`}</span>
            </button>

            <button
              type="button"
              onMouseEnter={() => adminSoundFx.playAdminUiHover()}
              onClick={handleToggleAdminAudioMute}
              data-testid="admin-audio-toggle"
              aria-pressed={!isAdminAudioMuted}
              aria-label={
                isAdminAudioMuted
                  ? lang === 'vi'
                    ? 'Bật âm thanh Pháp Tướng Admin'
                    : 'Unmute Admin VFX Audio'
                  : lang === 'vi'
                    ? 'Tắt âm thanh Pháp Tướng Admin'
                    : 'Mute Admin VFX Audio'
              }
              title={
                isAdminAudioMuted
                  ? lang === 'vi'
                    ? 'Bật âm thanh Pháp Tướng (Đang tắt)'
                    : 'Unmute Admin VFX Audio (Muted)'
                  : lang === 'vi'
                    ? 'Tắt âm thanh Pháp Tướng (Đang bật)'
                    : 'Mute Admin VFX Audio (Active)'
              }
              className={`p-2 rounded-xl glass-panel border transition-all cursor-pointer ${isAdminAudioMuted
                ? 'border-slate-600/60 text-slate-400 hover:text-slate-200 hover:border-slate-400/60'
                : 'border-amber-400/45 text-amber-300 hover:text-amber-100 hover:border-amber-300/75 hover:shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                }`}
            >
              {isAdminAudioMuted ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-300" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
