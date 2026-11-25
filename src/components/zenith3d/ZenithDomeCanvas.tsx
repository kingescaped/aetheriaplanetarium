import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { Star, ObserverLocation, CelestialSettings } from '../../types/celestial';
import type { SkyVisualAttenuation, WeatherSample } from '../../types/weather';
import type { EclipticOverlayData } from '../../types/deepSky';
import type { EquatorialGridData, TwilightState } from '../../types/atmosphere';
import { AtmosphereDome3D } from './AtmosphereDome3D';
import { EquatorialGrid3D } from './EquatorialGrid3D';
import { CanvasCaptureBridge } from './CanvasCaptureBridge';
import { StarPoints3D } from './StarPoints3D';
import { SolarSystem3D } from './SolarSystem3D';
import { DeepSky3D } from './DeepSky3D';
import { EclipticLine3D } from './EclipticLine3D';
import { CloudVeil3D } from './CloudVeil3D';
import { ConstellationLines3D } from './ConstellationLines3D';
import { ConstellationLabels3D } from './ConstellationLabels3D';
import { GroundHorizon3D } from './GroundHorizon3D';
import { HorizonSilhouette3D } from './HorizonSilhouette3D';
import { TargetSimulation3D } from './TargetSimulation3D';
import { DomeLookControls } from './DomeLookControls';
import { getLST } from '../../utils/astronomy';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { Language, TRANSLATIONS } from '../../utils/i18n';
import { soundFx } from '../../utils/audio';
import { Compass, Crosshair, RotateCcw, Smartphone, Play, Square, X, ShieldCheck } from 'lucide-react';

interface ZenithDomeCanvasProps {
  stars: Star[];
  location: ObserverLocation;
  currentDate: Date;
  settings: CelestialSettings;
  selectedStar: Star | null;
  onSelectStar: (star: Star) => void;
  targetAzimuth?: number | null;
  isZenithRequested?: boolean;
  isFocusRequested?: boolean;
  hideHtmlOverlays?: boolean;
  lang?: Language;
  weatherSample?: WeatherSample | null;
  skyAttenuation?: SkyVisualAttenuation;
  solarBodies?: Star[];
  deepSkyBodies?: Star[];
  eclipticData?: EclipticOverlayData | null;
  twilightState?: TwilightState;
  equatorialGridData?: EquatorialGridData | null;
  captureRef?: React.MutableRefObject<(() => HTMLCanvasElement | null) | null>;
}

export const ZenithDomeCanvas: React.FC<ZenithDomeCanvasProps> = ({
  stars,
  location,
  currentDate,
  settings,
  selectedStar,
  onSelectStar,
  targetAzimuth,
  isZenithRequested,
  isFocusRequested,
  hideHtmlOverlays = false,
  lang = 'vi',
  weatherSample,
  skyAttenuation,
  solarBodies = [],
  deepSkyBodies = [],
  eclipticData = null,
  twilightState,
  equatorialGridData = null,
  captureRef,
}) => {
  const t = TRANSLATIONS[lang];

  // Device Orientation Hook (iOS/Android Gyroscope & AR Tracker)
  const {
    isSupported,
    permissionState,
    isEnabled: isGyroEnabled,
    hasSensorData,
    quaternion: gyroQuaternion,
    currentHeading,
    requestPermissionAndEnable,
    toggleEnabled,
    disable: disableGyro,
    isSimulated,
    toggleSimulation,
    errorMessage,
  } = useDeviceOrientation();

  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [showDesktopNotice, setShowDesktopNotice] = useState<boolean>(false);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [cameraHeading, setCameraHeading] = useState<{ az: number; alt: number } | null>(null);
  const displayHeading = cameraHeading || currentHeading;

  // Anchored AR Slot on top of mobile StarBottomSheet ("keo cái AR vào ở trên cái thẻ thông tin")
  const [arSlot, setArSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedStar) {
      setArSlot(null);
      return;
    }
    const checkSlot = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        const el = document.getElementById('star-sheet-ar-slot');
        setArSlot(el);
      } else {
        setArSlot(null);
      }
    };
    checkSlot();
    const timer = setTimeout(checkSlot, 60);
    const observer = new MutationObserver(checkSlot);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [selectedStar]);

  // Compute Local Sidereal Time for constellation labels
  const lst = getLST(currentDate, location.longitude);

  // Handle AR Tracker button click
  const handleARButtonClick = async () => {
    soundFx.playToggle(!isGyroEnabled);

    // If on iOS with permission prompt
    if (permissionState === 'prompt') {
      setShowPermissionModal(true);
      return;
    }

    if (isGyroEnabled) {
      disableGyro();
      return;
    }

    const success = await toggleEnabled();
    if (!success && !isSupported) {
      setShowDesktopNotice(true);
    }
  };

  const handleGrantPermission = async () => {
    setShowPermissionModal(false);
    const success = await requestPermissionAndEnable();
    if (!success) {
      setShowDesktopNotice(true);
    }
  };

  // Cardinal direction label helper
  const getCardinalName = (az: number): string => {
    const deg = (az + 360) % 360;
    if (deg >= 337.5 || deg < 22.5) return 'N (Bắc)';
    if (deg >= 22.5 && deg < 67.5) return 'NE (Đông Bắc)';
    if (deg >= 67.5 && deg < 112.5) return 'E (Đông)';
    if (deg >= 112.5 && deg < 157.5) return 'SE (Đông Nam)';
    if (deg >= 157.5 && deg < 202.5) return 'S (Nam)';
    if (deg >= 202.5 && deg < 247.5) return 'SW (Tây Nam)';
    if (deg >= 247.5 && deg < 292.5) return 'W (Tây)';
    return 'NW (Tây Bắc)';
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-space-950">
      <Canvas
        dpr={[1, typeof window !== 'undefined' && window.innerWidth < 768 ? 1.5 : 2]}
        camera={{
          position: [0, 1.6, 0],
          fov: 65,
          near: 0.1,
          far: 600,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full block touch-none"
      >
        <CanvasCaptureBridge captureRef={captureRef} />
        <AtmosphereDome3D twilightState={twilightState} />

        {/* Soft cosmic ambient illumination */}
        <ambientLight intensity={0.25} />
        <directionalLight position={[0, 50, 0]} intensity={0.4} color="#818cf8" />

        {/* First-Person Dome Look Controls (Zero Jitter, Full Zenith Tilt to 90° Overhead + Unlocked AR Drag) */}
        <DomeLookControls
          selectedStar={selectedStar}
          targetAzimuth={targetAzimuth}
          isZenithRequested={isZenithRequested}
          isFocusRequested={isFocusRequested}
          isGyroEnabled={isGyroEnabled}
          gyroQuaternion={gyroQuaternion}
          stars={stars}
          solarBodies={solarBodies}
          deepSkyBodies={settings.showDeepSky ? deepSkyBodies : undefined}
          magnitudeLimit={settings.magnitudeLimit}
          onSelectStar={onSelectStar}
          recenterTrigger={recenterTrigger}
          onHeadingChange={setCameraHeading}
        />

        {/* 1. Ground Horizon Disc & Compass */}
        <GroundHorizon3D
          showGround={settings.showGroundHorizon}
          showGrid={settings.showGridLines}
          showLabels={!hideHtmlOverlays}
        />

        {/* 1.2. Equatorial Coordinate Grid (RA / Dec) */}
        {settings.showEquatorialGrid && equatorialGridData && (
          <EquatorialGrid3D
            gridData={equatorialGridData}
            showLabels={settings.showConstellationLabels && !hideHtmlOverlays}
            skyAttenuation={skyAttenuation}
          />
        )}

        {/* 1.5. Atmospheric Cloud & Haze Veil */}
        <CloudVeil3D
          cloudCover={weatherSample?.cloudCover ?? 0}
          hazeOpacity={skyAttenuation?.hazeOpacity ?? 0}
        />

        {/* 1.6. Black Horizon Silhouette (Mountains, Hills, Trees, Observatory Dome) */}
        <HorizonSilhouette3D visible={settings.showGroundHorizon} />

        {/* 2. Constellation Lines in 3D */}
        <ConstellationLines3D
          stars={stars}
          visible={settings.showConstellationLines}
          opacityScale={skyAttenuation?.constellationOpacity ?? 1}
        />

        {/* 2.5. Ecliptic Line (Seasons & 30° Longitude Ticks) */}
        {settings.showEclipticLine && eclipticData && (
          <EclipticLine3D
            eclipticData={eclipticData}
            showLabels={settings.showConstellationLabels && !hideHtmlOverlays}
            skyAttenuation={skyAttenuation}
            lang={lang}
          />
        )}

        {/* 3. Constellation Labels in 3D */}
        <ConstellationLabels3D
          location={location}
          lst={lst}
          visible={settings.showConstellationLabels && !hideHtmlOverlays}
        />

        {/* 4. GPU-Accelerated Starfield Points (In-Place Buffers, No Flickering) */}
        <StarPoints3D
          stars={stars}
          settings={settings}
          selectedStar={selectedStar}
          onSelectStar={onSelectStar}
          skyAttenuation={skyAttenuation}
        />

        {/* 4.3. Deep Sky Objects (Messier 110 + NGC Highlights) */}
        {settings.showDeepSky && (
          <DeepSky3D
            bodies={deepSkyBodies}
            showLabels={settings.showStarLabels && !hideHtmlOverlays}
            selectedStar={selectedStar}
            skyAttenuation={skyAttenuation}
          />
        )}

        {/* 4.5. Dynamic Solar System Bodies (Sun, Moon & 7 Planets) */}
        {settings.showSolarSystem && (
          <SolarSystem3D
            bodies={solarBodies}
            showLabels={settings.showStarLabels && !hideHtmlOverlays}
            skyAttenuation={skyAttenuation}
          />
        )}

        {/* 5. Target Simulation (3D Holographic Reticle + Radar Beacon + Flare - Laser Removed) */}
        <TargetSimulation3D selectedStar={selectedStar} showLabel={!hideHtmlOverlays} lang={lang} />
      </Canvas>

      {/* Floating AR Star Tracker Control Widget (Portaled on top of StarBottomSheet when active on mobile) */}
      {arSlot ? (
        createPortal(
          <div className="pointer-events-auto">
            {!isGyroEnabled ? (
              <button
                onClick={handleARButtonClick}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full glass-panel border border-cyan-500/30 hover:border-cyan-400/60 bg-slate-900/90 hover:bg-slate-800/95 text-xs font-mono text-slate-200 hover:text-white transition-all shadow-glow-cyan/20 active:scale-95 group backdrop-blur-xl cursor-pointer"
                title={t.arTrackerDesc}
              >
                <Compass className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform flex-shrink-0" />
                <span className="font-sans font-medium text-[12px]">{t.arTracker}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                  AR
                </span>
              </button>
            ) : (
              <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-slate-950/90 border border-cyan-400/60 shadow-glow-cyan backdrop-blur-xl animate-fade-in">
                <div className="relative flex items-center justify-center w-3 h-3 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-75" />
                  <div className="w-2 h-2 rounded-full bg-cyan-300" />
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold font-mono tracking-widest text-cyan-300">
                      {isSimulated ? (lang === 'vi' ? 'AR MÔ PHỎNG' : 'AR DEMO') : t.arTrackingActive}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
                    <span>{getCardinalName(displayHeading.az)} ({Math.round(displayHeading.az)}°)</span>
                    <span>•</span>
                    <span>Alt: {Math.round(displayHeading.alt)}°</span>
                  </div>
                </div>

                {/* Recenter button */}
                <button
                  onClick={() => {
                    soundFx.playToggle(true);
                    setRecenterTrigger((prev) => prev + 1);
                  }}
                  className="p-1 rounded-full hover:bg-white/10 text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
                  title={lang === 'vi' ? 'Căn lại theo hướng cảm biến la bàn thực' : 'Recenter to device compass'}
                  aria-label={lang === 'vi' ? 'Căn lại theo hướng cảm biến la bàn thực' : 'Recenter to device compass'}
                >
                  <Compass className="w-3.5 h-3.5" />
                </button>

                {/* Turn off AR */}
                <button
                  onClick={() => {
                    soundFx.playToggle(false);
                    disableGyro();
                  }}
                  className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={lang === 'vi' ? 'Tắt chế độ AR' : 'Disable AR'}
                  aria-label={lang === 'vi' ? 'Tắt chế độ AR' : 'Disable AR'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>,
          arSlot
        )
      ) : (
        <div
          className={`absolute z-30 pointer-events-auto flex flex-col items-end md:items-center gap-2 transition-all duration-300 ${selectedStar
            ? 'right-[max(0.875rem,var(--sar))] bottom-32 md:bottom-auto md:right-auto md:top-4 md:left-1/2 md:-translate-x-1/2'
            : 'right-[max(0.875rem,var(--sar))] bottom-12 md:bottom-auto md:right-auto md:top-4 md:left-1/2 md:-translate-x-1/2'
            }`}
        >
          {!isGyroEnabled ? (
            <button
              onClick={handleARButtonClick}
              className="flex items-center space-x-2 px-3.5 py-2 md:py-1.5 rounded-full glass-panel border border-cyan-500/30 hover:border-cyan-400/60 bg-slate-900/85 hover:bg-slate-800/90 text-xs font-mono text-slate-200 hover:text-white transition-all shadow-glow-cyan/20 active:scale-95 group backdrop-blur-xl cursor-pointer"
              title={t.arTrackerDesc}
            >
              <Compass className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform flex-shrink-0" />
              <span className="font-sans font-medium text-[12px]">{t.arTracker}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                AR
              </span>
            </button>
          ) : (
            <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-slate-950/90 border border-cyan-400/60 shadow-glow-cyan backdrop-blur-xl animate-fade-in">
              <div className="relative flex items-center justify-center w-3 h-3 flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-75" />
                <div className="w-2 h-2 rounded-full bg-cyan-300" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold font-mono tracking-widest text-cyan-300">
                    {isSimulated ? (lang === 'vi' ? 'AR MÔ PHỎNG' : 'AR DEMO') : t.arTrackingActive}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
                  <span>{getCardinalName(displayHeading.az)} ({Math.round(displayHeading.az)}°)</span>
                  <span>•</span>
                  <span>Alt: {Math.round(displayHeading.alt)}°</span>
                </div>
              </div>

              {/* Recenter button (Reset manual drag offset to phone heading) */}
              <button
                onClick={() => {
                  soundFx.playToggle(true);
                  setRecenterTrigger((prev) => prev + 1);
                }}
                className="p-1 rounded-full hover:bg-white/10 text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
                title={lang === 'vi' ? 'Căn lại theo hướng cảm biến la bàn thực' : 'Recenter to device compass'}
                aria-label={lang === 'vi' ? 'Căn lại theo hướng cảm biến la bàn thực' : 'Recenter to device compass'}
              >
                <Compass className="w-3.5 h-3.5" />
              </button>

              {/* Turn off AR */}
              <button
                onClick={() => {
                  soundFx.playToggle(false);
                  disableGyro();
                }}
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={lang === 'vi' ? 'Tắt chế độ AR' : 'Disable AR'}
                aria-label={lang === 'vi' ? 'Tắt chế độ AR' : 'Disable AR'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      <div
        className={`absolute bottom-3 md:bottom-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none px-4 py-1.5 rounded-full glass-panel-subtle text-[11px] font-sans text-slate-300 border border-white/5 items-center gap-2 shadow-glass w-max max-w-[calc(100vw-2rem-var(--sal)-var(--sar))] ${selectedStar ? 'hidden md:flex' : 'flex'
          }`}
      >
        <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse flex-shrink-0" />
        <span>
          {isGyroEnabled
            ? (lang === 'vi' ? 'Xoay máy hoặc vuốt kéo tự do để ngắm sao' : 'Tilt device or drag freely to explore night sky')
            : (lang === 'vi' ? 'Kéo ngón tay/chuột để xoay 360° & ngửa 90° thiên đỉnh' : 'Drag to look around 360° & 90° straight up to Zenith')}
        </span>
      </div>

      {showPermissionModal &&
        createPortal(
          <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-sm rounded-3xl glass-panel border border-cyan-500/30 p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mx-auto">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t.arPermissionTitle}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t.arPermissionDesc}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleGrantPermission}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-xs shadow-glow-cyan active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.arGrantPermission}</span>
                </button>
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-medium text-xs transition-colors"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>,
          document.getElementById('aetheria-app-shell') ?? document.body
        )}

      {showDesktopNotice &&
        createPortal(
          <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-sm rounded-3xl glass-panel border border-purple-500/30 p-6 shadow-2xl space-y-4">
              <button
                onClick={() => setShowDesktopNotice(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                aria-label={t.close}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {lang === 'vi' ? 'Thiết bị & Cảm biến' : 'Sensor Compatibility'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t.arDesktopNotice}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowDesktopNotice(false);
                    toggleSimulation();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium text-xs shadow-glow-purple active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>{t.arSimulateDemo}</span>
                </button>
                <button
                  onClick={() => setShowDesktopNotice(false)}
                  className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-medium text-xs transition-colors"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>,
          document.getElementById('aetheria-app-shell') ?? document.body
        )}
    </div>
  );
};
