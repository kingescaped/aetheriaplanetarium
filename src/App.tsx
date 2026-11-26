import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { InfoPanel } from './components/layout/InfoPanel';
import { StarBottomSheet } from './components/layout/StarBottomSheet';
import { StarTelemetryHUD } from './components/layout/StarTelemetryHUD';
import { BottomHUD } from './components/layout/BottomHUD';
import { BottomNav } from './components/layout/BottomNav';
import { SkyMap2D } from './components/planetarium/SkyMap2D';
import { WeatherBadge } from './components/weather/WeatherBadge';
import { useAstronomyWeather } from './hooks/useAstronomyWeather';
import { useGeolocation } from './hooks/useGeolocation';
import { AdminLoginEntrance } from './components/auth/AdminLoginEntrance';
import { getFirebaseAuth } from './services/firebase';
import {
  readAdminGodModeEnabled,
  writeAdminGodModeEnabled,
  startSessionKeepAlive,
} from './services/tokenSession';
import {
  subscribeToAuthState,
  signOutUser,
  DEFAULT_USER_PREFERENCES,
} from './services/authService';
import {
  loadUserCloudData,
  saveCloudProfile,
  syncCloudUserData,
  uploadAvatarToCloudflare,
  type CloudUserBundle,
} from './services/profileApi';

const ZenithDomeCanvas = lazy(() =>
  import('./components/zenith3d/ZenithDomeCanvas').then((m) => ({
    default: m.ZenithDomeCanvas,
  }))
);
const SearchBarModal = lazy(() =>
  import('./components/search/SearchBarModal').then((m) => ({
    default: m.SearchBarModal,
  }))
);
const AccountModal = lazy(() =>
  import('./components/account/AccountModal').then((m) => ({
    default: m.AccountModal,
  }))
);
const AuthModal = lazy(() =>
  import('./components/auth/AuthModal').then((m) => ({
    default: m.AuthModal,
  }))
);
const WeatherDetailPanel = lazy(() =>
  import('./components/weather/WeatherDetailPanel').then((m) => ({
    default: m.WeatherDetailPanel,
  }))
);
const SkyCaptureModal = lazy(() =>
  import('./components/capture/SkyCaptureModal').then((m) => ({
    default: m.SkyCaptureModal,
  }))
);
import {
  ViewMode,
  ObserverLocation,
  CelestialSettings,
  Star
} from './types/celestial';
import {
  UserProfile,
  ObservationLog,
  UserPreferences,
  SavedObserverLocation,
  createGuestUserProfile,
  isAdminUser,
} from './types/account';
import { STAR_CATALOG } from './data/stars';
import { getLST, batchComputeHorizontalCoordsInPlace } from './utils/astronomy';
import { computeSolarSystemBodies } from './utils/solarSystem';
import { computeDeepSkyBodies } from './utils/deepSky';
import { computeEclipticOverlay } from './utils/ecliptic';
import { computeTwilightState, combineSkyAttenuation } from './utils/twilight';
import { computeEquatorialGrid } from './utils/equatorialGrid';
import { computeMilkyWayOverlay } from './utils/milkyWay';
import { computeSatelliteBodies } from './utils/satellites';
import { useSatelliteTles } from './hooks/useSatelliteTles';
import type { SkyCaptureMetadata } from './types/atmosphere';
import { Language, TRANSLATIONS } from './utils/i18n';
import { soundFx } from './utils/audio';
import { adminSoundFx } from './utils/adminAudio';
import { usePWA } from './hooks/usePWA';
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner';
import { AetheriaSplashScreen } from './components/common/AetheriaSplashScreen';

const DEFAULT_FAVORITES = ['sirius', 'betelgeuse', 'vega', 'polaris'];

const DEFAULT_GUEST_LOGS: ObservationLog[] = [
  {
    id: 'log_1',
    starId: 'sirius',
    starName: 'Sirius (Dog Star)',
    date: '11/22/2026, 8:45 PM',
    locationName: 'Hanoi Observatory',
    notes: 'Brilliant scintillation in the night sky. Unmistakable blue-white diamond glow.',
    altitude: 42.5,
    azimuth: 145.2,
  },
  {
    id: 'log_2',
    starId: 'betelgeuse',
    starName: 'Betelgeuse',
    date: '11/22/2026, 9:15 PM',
    locationName: 'Hanoi Observatory',
    notes: 'Deep reddish orange hue clearly visible to the naked eye.',
    altitude: 58.1,
    azimuth: 172.0,
  },
];

function readGuestFavorites(): string[] {
  try {
    const saved = localStorage.getItem('aetheria_favorites');
    return saved ? JSON.parse(saved) : DEFAULT_FAVORITES;
  } catch {
    return DEFAULT_FAVORITES;
  }
}

function readGuestLogs(): ObservationLog[] {
  try {
    const saved = localStorage.getItem('aetheria_logs');
    return saved ? JSON.parse(saved) : DEFAULT_GUEST_LOGS;
  } catch {
    return DEFAULT_GUEST_LOGS;
  }
}

function readGuestPreferences(): UserPreferences {
  try {
    const saved = localStorage.getItem('aetheria_prefs');
    return saved
      ? { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(saved) }
      : { ...DEFAULT_USER_PREFERENCES };
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export function App() {
  // PWA Service Worker & Install State
  const pwa = usePWA();

  // App Initialization & Safe Area Calibration Splash Screen
  const [isAppReady, setIsAppReady] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    let timerId = 0;
    let rafId = 0;

    const initApp = async () => {
      try {
        if ('fonts' in document) {
          await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
        }
      } catch {
        // Fallback
      }

      const ua = navigator.userAgent || '';
      const isIOS =
        /iPhone|iPad|iPod/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;

      if (isIOS && isStandalone) {
        timerId = window.setTimeout(() => {
          if (isMounted) setIsAppReady(true);
        }, 850);
      } else {
        rafId = window.requestAnimationFrame(() => {
          if (isMounted) setIsAppReady(true);
        });
      }
    };

    initApp();
    return () => {
      isMounted = false;
      window.clearTimeout(timerId);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Internationalization (Bilingual Vietnamese / English)
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('aetheria_lang');
    return (saved === 'en' || saved === 'vi') ? saved : 'vi';
  });

  useEffect(() => {
    localStorage.setItem('aetheria_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('2D_PLANETARIUM');

  // Observer Location (Default: Hanoi, Vietnam)
  const [location, setLocation] = useState<ObserverLocation>({
    name: 'Hanoi (Vietnam)',
    latitude: 21.0285,
    longitude: 105.8542,
  });
  const {
    locate,
    isLocating,
    error: geoError,
    clearError: clearGeoError,
    lastAccuracy,
  } = useGeolocation(lang);

  // Time Machine Epoch
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Celestial Display Settings
  const [settings, setSettings] = useState<CelestialSettings>({
    showConstellationLines: true,
    showConstellationLabels: true,
    showStarLabels: true,
    showGridLines: true,
    showMilkyWay: true,
    showGroundHorizon: true,
    starGlowIntensity: 1.5,
    magnitudeLimit: 5.5,
    timeSpeed: 1, // 1x normal speed
    simulateSkyWeather: true,
    showSolarSystem: true,
    showDeepSky: false,
    showEclipticLine: false,
    showAtmosphereTwilight: true,
    showEquatorialGrid: false,
    showSatellites: true,
  });

  const satelliteTles = useSatelliteTles(settings.showSatellites);

  const weather = useAstronomyWeather(location, currentDate, settings.simulateSkyWeather);
  const [isWeatherOpen, setIsWeatherOpen] = useState<boolean>(false);
  const [hasOpenedWeather, setHasOpenedWeather] = useState<boolean>(false);

  useEffect(() => {
    if (isWeatherOpen) {
      setHasOpenedWeather(true);
    }
  }, [isWeatherOpen]);

  // Xác định chuẩn xác giao diện Mobile ngay từ frame đầu tiên (tránh độ trễ viewport 980px trên Safari/iOS)
  const checkIsMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    const isSmallScreen = window.innerWidth < 768;
    const isMediaSmall = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches;
    const isMobileUA = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isSmallScreen || isMediaSmall || isMobileUA;
  };

  // UI Panels State (Sidebar starts closed on BOTH desktop and mobile on initial page load)
  const [isMobile, setIsMobile] = useState<boolean>(checkIsMobile);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = checkIsMobile();
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [selectedStarId, setSelectedStarId] = useState<string | number>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAccountOpen, setIsAccountOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [showAdminEntrance, setShowAdminEntrance] = useState<boolean>(false);
  const [adminBadgeJustLanded, setAdminBadgeJustLanded] = useState<boolean>(false);
  const adminLandTimerRef = useRef<number>(0);
  const [isCaptureOpen, setIsCaptureOpen] = useState<boolean>(false);
  const [capturedRawCanvas, setCapturedRawCanvas] = useState<HTMLCanvasElement | null>(null);
  const [capturedMeta, setCapturedMeta] = useState<SkyCaptureMetadata | null>(null);
  const captureSkyFrameRef = useRef<(() => HTMLCanvasElement | null) | null>(null);

  useEffect(() => {
    return () => {
      window.clearTimeout(adminLandTimerRef.current);
    };
  }, []);

  // Preload AccountModal chunk when AuthModal opens so Admin Entrance target mounts immediately
  useEffect(() => {
    if (isAuthModalOpen) {
      void import('./components/account/AccountModal');
    }
  }, [isAuthModalOpen]);

  // Stargazer Account, Auth & Cloud User Preferences (Default: Guest Mode)
  const [user, setUser] = useState<UserProfile>(() => createGuestUserProfile(lang));
  const isAdmin = isAdminUser(user);
  const [godModeEnabled, setGodModeEnabled] = useState<boolean>(readAdminGodModeEnabled);

  const handleCloseAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const handleToggleGodMode = useCallback(
    (next: boolean) => {
      writeAdminGodModeEnabled(next);
      setGodModeEnabled(next);
      if (isAdmin) {
        adminSoundFx.unlock();
        adminSoundFx.playAdminUiClick();
      } else {
        soundFx.playToggle(next);
      }
    },
    [isAdmin]
  );

  // Maintain active Firebase/Worker sessions across token expiry, tab wake, and reconnect
  useEffect(() => {
    return startSessionKeepAlive(() => getFirebaseAuth().currentUser);
  }, []);

  // Sync exclusive Admin audio engine & register one-time gesture unlock when Admin is active
  useEffect(() => {
    adminSoundFx.setAdminActive(isAdmin);
    if (!isAdmin) {
      adminSoundFx.stopAmbient();
      return;
    }

    const handleGestureUnlock = () => {
      adminSoundFx.unlock();
      window.removeEventListener('pointerdown', handleGestureUnlock);
      window.removeEventListener('keydown', handleGestureUnlock);
    };

    window.addEventListener('pointerdown', handleGestureUnlock, { passive: true, once: true });
    window.addEventListener('keydown', handleGestureUnlock, { passive: true, once: true });

    return () => {
      window.removeEventListener('pointerdown', handleGestureUnlock);
      window.removeEventListener('keydown', handleGestureUnlock);
      adminSoundFx.stopAmbient();
    };
  }, [isAdmin]);

  const [favorites, setFavorites] = useState<string[]>(readGuestFavorites);
  const [observationLogs, setObservationLogs] = useState<ObservationLog[]>(readGuestLogs);
  const [preferences, setPreferences] = useState<UserPreferences>(readGuestPreferences);

  const langRef = useRef<Language>(lang);
  langRef.current = lang;
  const isAuthModalOpenRef = useRef<boolean>(isAuthModalOpen);
  isAuthModalOpenRef.current = isAuthModalOpen;
  const hydratedUidRef = useRef<string | null>(null);

  const applyCloudBundle = useCallback((bundle: CloudUserBundle) => {
    hydratedUidRef.current = bundle.profile.id;
    setUser(bundle.profile);
    setFavorites(bundle.favorites);
    setObservationLogs(bundle.observationLogs);
    setPreferences(bundle.preferences);
    if (bundle.profile.savedLocation) {
      setLocation({
        name: bundle.profile.savedLocation.name,
        latitude: bundle.profile.savedLocation.latitude,
        longitude: bundle.profile.savedLocation.longitude,
      });
    }
  }, []);

  const handleAuthSuccess = useCallback(
    (bundle?: CloudUserBundle) => {
      if (!bundle) return;
      applyCloudBundle(bundle);
      if (isAdminUser(bundle.profile) && godModeEnabled) {
        window.clearTimeout(adminLandTimerRef.current);
        setAdminBadgeJustLanded(false);
        setIsAccountOpen(true);
        setShowAdminEntrance(true);
      }
    },
    [applyCloudBundle, godModeEnabled]
  );

  // Subscribe to real Firebase Auth state + hydrate Firestore & Worker verified role
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        hydratedUidRef.current = null;
        window.clearTimeout(adminLandTimerRef.current);
        setShowAdminEntrance(false);
        setAdminBadgeJustLanded(false);
        setUser(createGuestUserProfile(langRef.current));
        setFavorites(readGuestFavorites());
        setObservationLogs(readGuestLogs());
        setPreferences(readGuestPreferences());
        return;
      }

      if (isAuthModalOpenRef.current) {
        return;
      }

      if (hydratedUidRef.current === firebaseUser.uid) {
        return;
      }

      loadUserCloudData(firebaseUser)
        .then((bundle) => {
          if (!active) return;
          applyCloudBundle(bundle);
        })
        .catch((err) => {
          console.warn('Cloud profile hydration error:', err);
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Keep guest display label synchronized with active language
  useEffect(() => {
    setUser((prev) =>
      prev.isGuest && prev.id === 'guest_observer'
        ? { ...prev, name: createGuestUserProfile(lang).name }
        : prev
    );
  }, [lang]);

  // Persist guest data locally only when in guest mode
  useEffect(() => {
    if (user.isGuest) {
      localStorage.setItem('aetheria_favorites', JSON.stringify(favorites));
    }
  }, [favorites, user.isGuest]);

  useEffect(() => {
    if (user.isGuest) {
      localStorage.setItem('aetheria_logs', JSON.stringify(observationLogs));
    }
  }, [observationLogs, user.isGuest]);

  useEffect(() => {
    if (user.isGuest) {
      localStorage.setItem('aetheria_prefs', JSON.stringify(preferences));
    }
    soundFx.setEnabled(preferences.soundEnabled ?? true);
  }, [preferences, user.isGuest]);

  // Telemetry HUD Cursor Coordinates
  const [cursorCoords, setCursorCoords] = useState<{
    ra: number;
    dec: number;
    alt: number;
    az: number;
  }>({
    ra: 101.2,
    dec: -16.7,
    alt: 45.0,
    az: 180.0,
  });

  // Camera orientation trigger for 3D Dome
  const [targetAzimuth, setTargetAzimuth] = useState<number | null>(null);
  const [isZenithRequested, setIsZenithRequested] = useState<boolean>(false);
  const [isFocusRequested, setIsFocusRequested] = useState<boolean>(false);

  // Pre-allocated pool of 5,200+ stars with initial horizontal coordinates
  const starsPoolRef = useRef<Star[]>(
    STAR_CATALOG.map((s) => ({ ...s, alt: 0, az: 0 }))
  );

  // Calculate Local Sidereal Time (LST) and compute dynamic (alt, az) in-place with zero GC overhead
  const calculatedStars = useMemo(() => {
    const lst = getLST(currentDate, location.longitude);
    batchComputeHorizontalCoordsInPlace(starsPoolRef.current, location.latitude, lst);
    return starsPoolRef.current;
  }, [currentDate, location.latitude, location.longitude]);

  const ephemerisSec = Math.floor(currentDate.getTime() / 1000);
  const dsoTickBucket =
    Math.abs(settings.timeSpeed) > 1
      ? ephemerisSec
      : Math.floor(currentDate.getTime() / 60000);

  const solarBodies = useMemo(() => {
    if (!settings.showSolarSystem) return [];
    return computeSolarSystemBodies(new Date(ephemerisSec * 1000), location, lang);
  }, [settings.showSolarSystem, ephemerisSec, location.latitude, location.longitude, lang]);

  const deepSkyBodies = useMemo(() => {
    const tickDate = new Date(
      (Math.abs(settings.timeSpeed) > 1 ? dsoTickBucket * 1000 : dsoTickBucket * 60000)
    );
    return computeDeepSkyBodies(tickDate, location, lang);
  }, [settings.timeSpeed, dsoTickBucket, location.latitude, location.longitude, lang]);

  const eclipticData = useMemo(() => {
    if (!settings.showEclipticLine) return null;
    const tickDate = new Date(
      (Math.abs(settings.timeSpeed) > 1 ? dsoTickBucket * 1000 : dsoTickBucket * 60000)
    );
    return computeEclipticOverlay(tickDate, location);
  }, [settings.showEclipticLine, settings.timeSpeed, dsoTickBucket, location.latitude, location.longitude]);

  const twilightState = useMemo(() => {
    return computeTwilightState(
      new Date(ephemerisSec * 1000),
      location,
      settings.showAtmosphereTwilight
    );
  }, [ephemerisSec, location.latitude, location.longitude, settings.showAtmosphereTwilight]);

  const combinedAttenuation = useMemo(
    () => combineSkyAttenuation(weather.resolved?.attenuation, twilightState),
    [weather.resolved?.attenuation, twilightState]
  );

  const equatorialGridData = useMemo(() => {
    if (!settings.showEquatorialGrid) return null;
    const tickDate = new Date(
      (Math.abs(settings.timeSpeed) > 1 ? dsoTickBucket * 1000 : dsoTickBucket * 60000)
    );
    return computeEquatorialGrid(tickDate, location);
  }, [settings.showEquatorialGrid, settings.timeSpeed, dsoTickBucket, location.latitude, location.longitude]);

  const milkyWayData = useMemo(() => {
    if (!settings.showMilkyWay) return null;
    const tickDate = new Date(
      (Math.abs(settings.timeSpeed) > 1 ? dsoTickBucket * 1000 : dsoTickBucket * 60000)
    );
    return computeMilkyWayOverlay(tickDate, location);
  }, [settings.showMilkyWay, settings.timeSpeed, dsoTickBucket, location.latitude, location.longitude]);

  const satelliteBodies = useMemo(() => {
    if (!settings.showSatellites) return [];
    return computeSatelliteBodies(satelliteTles.tles, new Date(ephemerisSec * 1000), location, lang);
  }, [settings.showSatellites, satelliteTles.tles, ephemerisSec, location.latitude, location.longitude, lang]);

  const selectedStar = useMemo<Star | null>(() => {
    if (selectedStarId === '') return null;
    return (
      satelliteBodies.find((s: Star) => s.id === selectedStarId) ??
      solarBodies.find((b: Star) => b.id === selectedStarId) ??
      deepSkyBodies.find((d: Star) => d.id === selectedStarId) ??
      calculatedStars.find((s: Star) => s.id === selectedStarId) ??
      null
    );
  }, [satelliteBodies, solarBodies, deepSkyBodies, calculatedStars, selectedStarId]);

  const handleSelectCelestial = (star: Star) => {
    if (isAdmin) {
      adminSoundFx.unlock();
      adminSoundFx.playAdminStarSelect();
    } else {
      soundFx.playStarSelect();
    }
    setSelectedStarId(star.id);
    if (star.bodyType === 'dso' && !settings.showDeepSky) {
      setSettings((prev) => ({ ...prev, showDeepSky: true }));
    } else if (star.bodyType === 'satellite' && !settings.showSatellites) {
      setSettings((prev) => ({ ...prev, showSatellites: true }));
    }
  };

  const handleJumpToDate = (nextDate: Date) => {
    soundFx.playTabClick();
    setCurrentDate(nextDate);
    setSettings((prev) => ({ ...prev, timeSpeed: 1 }));
  };

  // Simulation Time Tick
  useEffect(() => {
    if (settings.timeSpeed === 0) return;

    const tickMs = Math.abs(settings.timeSpeed) <= 1 ? 1000 : 100;
    const interval = setInterval(() => {
      setCurrentDate((prevDate) => {
        const incrementMs = settings.timeSpeed * tickMs;
        return new Date(prevDate.getTime() + incrementMs);
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [settings.timeSpeed]);

  // Geolocation detector via useGeolocation hook
  const handleGetGeolocation = async (): Promise<ObserverLocation | null> => {
    clearGeoError();
    const resolved = await locate();
    if (resolved) {
      setLocation(resolved);
    }
    return resolved;
  };

  // Keyboard shortcut Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cloud profile, favorites, logs, preferences synchronization helpers
  const handleUpdateUser = async (updated: UserProfile) => {
    setUser(updated);
    if (!updated.isGuest && updated.id !== 'guest_observer') {
      await saveCloudProfile(updated.id, {
        name: updated.name,
        callsign: updated.callsign,
        avatarUrl: updated.avatarUrl,
        rank: updated.rank,
        savedLocation: updated.savedLocation,
      });
    }
  };

  const handleSaveLocationToProfile = async (loc?: ObserverLocation) => {
    if (user.isGuest || user.id === 'guest_observer') return;
    const target = loc ?? location;
    const savedLocation: SavedObserverLocation = {
      name: target.name,
      latitude: target.latitude,
      longitude: target.longitude,
      updatedAt: new Date().toISOString(),
    };
    await saveCloudProfile(user.id, { savedLocation });
    setUser((prev) => ({ ...prev, savedLocation }));
  };

  const handleUploadAvatar = async (file: File): Promise<string> => {
    const { avatarUrl } = await uploadAvatarToCloudflare(file);
    setUser((prev) => ({ ...prev, avatarUrl }));
    return avatarUrl;
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  const handleToggleFavorite = (starId: string | number) => {
    const strId = String(starId);
    const nextFavorites = favorites.includes(strId)
      ? favorites.filter((id) => id !== strId)
      : [...favorites, strId];
    setFavorites(nextFavorites);
    if (!user.isGuest && user.id !== 'guest_observer') {
      syncCloudUserData(user.id, { favorites: nextFavorites }).catch((err) => {
        console.warn('Cloud favorites sync failed:', err);
      });
    }
  };

  const handleAddLog = (newLog: Omit<ObservationLog, 'id'>) => {
    const nextLogs = [{ ...newLog, id: `log_${Date.now()}` }, ...observationLogs];
    setObservationLogs(nextLogs);
    if (!user.isGuest && user.id !== 'guest_observer') {
      syncCloudUserData(user.id, { observationLogs: nextLogs }).catch((err) => {
        console.warn('Cloud observation logs sync failed:', err);
      });
    }
  };

  const handleDeleteLog = (id: string) => {
    const nextLogs = observationLogs.filter((log) => log.id !== id);
    setObservationLogs(nextLogs);
    if (!user.isGuest && user.id !== 'guest_observer') {
      syncCloudUserData(user.id, { observationLogs: nextLogs }).catch((err) => {
        console.warn('Cloud observation logs sync failed:', err);
      });
    }
  };

  const handleUpdatePreferences = (nextPrefs: UserPreferences) => {
    setPreferences(nextPrefs);
    if (!user.isGuest && user.id !== 'guest_observer') {
      syncCloudUserData(user.id, { preferences: nextPrefs }).catch((err) => {
        console.warn('Cloud preferences sync failed:', err);
      });
    }
  };

  const handleOpenCapture = () => {
    soundFx.playModalTransition();
    const srcCanvas =
      captureSkyFrameRef.current?.() ??
      (document.querySelector('main canvas') as HTMLCanvasElement | null);
    let frozenCanvas: HTMLCanvasElement | null = null;
    if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
      frozenCanvas = document.createElement('canvas');
      frozenCanvas.width = srcCanvas.width;
      frozenCanvas.height = srcCanvas.height;
      frozenCanvas.getContext('2d')?.drawImage(srcCanvas, 0, 0);
    }
    setCapturedRawCanvas(frozenCanvas);
    setCapturedMeta({
      location,
      date: new Date(currentDate.getTime()),
      viewMode,
      selectedStar,
      twilightPhase: twilightState.phase,
      sunAltDeg: twilightState.sunAltDeg,
      showAtmosphereTwilight: settings.showAtmosphereTwilight,
      nightVisionMode: preferences.nightVisionMode,
    });
    setIsWeatherOpen(false);
    setIsCaptureOpen(true);
  };

  // Check if full-screen modal (Settings / Search / Capture / Auth) is open to hide Main Header
  const isAnyModalOpen = isAccountOpen || isSearchOpen || isCaptureOpen || isAuthModalOpen;

  return (
    <>
      <div
        id="aetheria-app-shell"
        className={`fixed top-0 left-0 right-0 overflow-hidden bg-[#030712] text-slate-100 select-none flex flex-col ${preferences.nightVisionMode ? 'night-vision' : ''}`}
        style={{ height: 'var(--app-height, 100vh)' }}
      >
        {/* Row 1: Everything above Mobile BottomNav */}
        <div className="relative flex-1 min-h-0 w-full flex flex-col overflow-hidden">
          {!isAnyModalOpen && (
            <Header
              viewMode={viewMode}
              setViewMode={(mode) => {
                soundFx.playTabClick();
                setViewMode(mode);
                setIsAccountOpen(false);
              }}
              location={location}
              currentDate={currentDate}
              onOpenSearch={() => {
                soundFx.playModalTransition();
                setIsWeatherOpen(false);
                setIsSearchOpen(true);
              }}
              onGetGeolocation={handleGetGeolocation}
              isLocating={isLocating}
              onOpenAccount={() => {
                soundFx.playModalTransition();
                setIsWeatherOpen(false);
                setIsAccountOpen(true);
              }}
              onOpenControls={() => {
                soundFx.playModalTransition();
                setIsSidebarOpen((prev) => !prev);
              }}
              onOpenCapture={handleOpenCapture}
              user={user}
              isAdmin={isAdmin}
              onOpenAuth={() => {
                soundFx.playModalTransition();
                setIsWeatherOpen(false);
                setIsAuthModalOpen(true);
              }}
              weatherSlot={
                <WeatherBadge
                  resolved={weather.resolved}
                  status={weather.status}
                  isStale={weather.isStale}
                  isOpen={isWeatherOpen}
                  onClick={() => {
                    soundFx.playModalTransition();
                    setIsWeatherOpen((prev) => !prev);
                  }}
                  lang={lang}
                />
              }
              lang={lang}
            />
          )}

          {/* Workspace: Bounded below Header and above BottomNav */}
          <div className="relative z-0 isolate flex-1 min-h-0 w-full overflow-hidden">
            <main className="absolute inset-0 z-0 isolate flex items-center justify-center overflow-hidden">
              {viewMode === '2D_PLANETARIUM' ? (
                <SkyMap2D
                  stars={calculatedStars}
                  location={location}
                  currentDate={currentDate}
                  settings={settings}
                  selectedStar={selectedStar}
                  onSelectStar={handleSelectCelestial}
                  onHoverCoords={(coords) => setCursorCoords(coords)}
                  weatherSample={weather.resolved?.sample ?? null}
                  skyAttenuation={combinedAttenuation}
                  solarBodies={solarBodies}
                  deepSkyBodies={deepSkyBodies}
                  satelliteBodies={satelliteBodies}
                  eclipticData={eclipticData}
                  twilightState={twilightState}
                  equatorialGridData={equatorialGridData}
                  milkyWayData={milkyWayData}
                  captureRef={captureSkyFrameRef}
                  isAdmin={isAdmin}
                  godModeEnabled={godModeEnabled}
                  lang={lang}
                />
              ) : (
                <Suspense fallback={<div className="w-full h-full bg-[#030712]" />}>
                  <ZenithDomeCanvas
                    stars={calculatedStars}
                    location={location}
                    currentDate={currentDate}
                    settings={settings}
                    selectedStar={selectedStar}
                    onSelectStar={handleSelectCelestial}
                    targetAzimuth={targetAzimuth}
                    isZenithRequested={isZenithRequested}
                    isFocusRequested={isFocusRequested}
                    hideHtmlOverlays={isAnyModalOpen || (isMobile && (isSidebarOpen || isWeatherOpen))}
                    lang={lang}
                    weatherSample={weather.resolved?.sample ?? null}
                    skyAttenuation={combinedAttenuation}
                    solarBodies={solarBodies}
                    deepSkyBodies={deepSkyBodies}
                    satelliteBodies={satelliteBodies}
                    eclipticData={eclipticData}
                    twilightState={twilightState}
                    equatorialGridData={equatorialGridData}
                    captureRef={captureSkyFrameRef}
                  />
                </Suspense>
              )}
            </main>

            <div className="hidden md:block">
              <InfoPanel
                star={selectedStar}
                onClose={() => setSelectedStarId('')}
                onFocusStar={(star) => {
                  soundFx.playTargetRayTrace();
                  setSelectedStarId(star.id);
                  setViewMode('3D_ZENITH_DOME');
                  setIsFocusRequested(true);
                  setTimeout(() => setIsFocusRequested(false), 400);
                }}
                onJumpToDate={handleJumpToDate}
                location={location}
                currentDate={currentDate}
                lang={lang}
              />
            </div>

            {!isAnyModalOpen && !(isMobile && isSidebarOpen) && (
              <div className="md:hidden absolute top-3 left-[max(0.75rem,var(--sal))] z-20 pointer-events-auto">
                <WeatherBadge
                  resolved={weather.resolved}
                  status={weather.status}
                  isStale={weather.isStale}
                  isOpen={isWeatherOpen}
                  onClick={() => {
                    soundFx.playModalTransition();
                    setIsWeatherOpen((prev) => !prev);
                  }}
                  lang={lang}
                  compact
                />
              </div>
            )}

            {/* Non-intrusive Geolocation Error Toast */}
            {geoError && !isAnyModalOpen && (
              <div
                role="alert"
                className="absolute bottom-3 md:bottom-16 left-[max(0.75rem,var(--sal))] right-[max(0.75rem,var(--sar))] md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-md z-30 pointer-events-auto"
              >
                <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-2xl bg-rose-950/95 border border-rose-400/45 text-rose-100 text-xs shadow-[0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-xl">
                  <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="flex-1 leading-relaxed">{geoError}</span>
                  <button
                    type="button"
                    onClick={clearGeoError}
                    aria-label={TRANSLATIONS[lang].geoDismissError}
                    className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {selectedStar && !isAnyModalOpen && (
              <div
                className="md:hidden absolute top-2.5 z-30 max-w-[210px] pointer-events-auto"
                style={{
                  right: 'max(0.625rem, var(--sar, 0px))',
                }}
              >
                <StarTelemetryHUD star={selectedStar} lang={lang} />
              </div>
            )}

            <StarBottomSheet
              star={selectedStar}
              isOpen={!!selectedStarId && !isAnyModalOpen}
              onClose={() => setSelectedStarId('')}
              onFocusStar={(star) => {
                soundFx.playTargetRayTrace();
                setSelectedStarId(star.id);
                setViewMode('3D_ZENITH_DOME');
                setIsFocusRequested(true);
                setTimeout(() => setIsFocusRequested(false), 400);
              }}
              onJumpToDate={handleJumpToDate}
              isFavorite={selectedStar ? favorites.includes(String(selectedStar.id)) : false}
              onToggleFavorite={handleToggleFavorite}
              onOpenJournal={(star) => {
                soundFx.playTabClick();
                setSelectedStarId(star.id);
                setIsAccountOpen(true);
              }}
              onResetOrientation={() => {
                soundFx.playTabClick();
                setIsZenithRequested(true);
                setTimeout(() => setIsZenithRequested(false), 300);
              }}
              onSetDirection={(azimuth) => {
                soundFx.playTabClick();
                setCursorCoords((prev) => ({ ...prev, az: azimuth }));
                setTargetAzimuth(azimuth);
                setTimeout(() => setTargetAzimuth(null), 300);
              }}
              location={location}
              currentDate={currentDate}
              lang={lang}
            />

            <BottomHUD
              viewMode={viewMode}
              selectedStar={selectedStar}
              cursorCoords={cursorCoords}
              onResetOrientation={() => {
                soundFx.playTabClick();
                setIsZenithRequested(true);
                setTimeout(() => setIsZenithRequested(false), 300);
              }}
              onSetDirection={(azimuth) => {
                soundFx.playTabClick();
                setCursorCoords((prev) => ({ ...prev, az: azimuth }));
                setTargetAzimuth(azimuth);
                setTimeout(() => setTargetAzimuth(null), 300);
              }}
            />

            <PWAInstallBanner pwa={pwa} lang={lang} />

            {hasOpenedWeather && (
              <Suspense fallback={null}>
                <WeatherDetailPanel
                  isOpen={isWeatherOpen && !isAnyModalOpen}
                  onClose={() => setIsWeatherOpen(false)}
                  location={location}
                  currentDate={currentDate}
                  forecast={weather.forecast}
                  resolved={weather.resolved}
                  status={weather.status}
                  isStale={weather.isStale}
                  error={weather.error}
                  simulateSkyWeather={settings.simulateSkyWeather}
                  onToggleSimulateSky={(enabled) =>
                    setSettings((prev) => ({ ...prev, simulateSkyWeather: enabled }))
                  }
                  onSelectHour={(timestampMs) => {
                    soundFx.playTabClick();
                    setCurrentDate(new Date(timestampMs));
                    setSettings((prev) => ({ ...prev, timeSpeed: 0 }));
                  }}
                  onResetToNow={() => {
                    soundFx.playTabClick();
                    setCurrentDate(new Date());
                    setSettings((prev) => ({ ...prev, timeSpeed: 1 }));
                  }}
                  onRefresh={weather.refresh}
                  lang={lang}
                />
              </Suspense>
            )}
          </div>

          <Sidebar
            isOpen={isSidebarOpen}
            onToggle={() => {
              soundFx.playModalTransition();
              setIsSidebarOpen(!isSidebarOpen);
            }}
            location={location}
            onLocationChange={setLocation}
            onGetGeolocation={handleGetGeolocation}
            isLocating={isLocating}
            geoError={geoError}
            geoAccuracy={lastAccuracy}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            settings={settings}
            onSettingsChange={setSettings}
            onSelectStar={handleSelectCelestial}
            selectedStar={selectedStar}
            solarBodies={solarBodies}
            deepSkyBodies={deepSkyBodies}
            satelliteBodies={satelliteBodies}
            twilightState={twilightState}
            lang={lang}
          />

          <AnimatePresence>
            {isAccountOpen && (
              <Suspense fallback={null}>
                <AccountModal
                  isOpen={isAccountOpen}
                  onClose={() => setIsAccountOpen(false)}
                  user={user}
                  isAdmin={isAdmin}
                  godModeEnabled={godModeEnabled}
                  onToggleGodMode={handleToggleGodMode}
                  adminBadgeJustLanded={adminBadgeJustLanded}
                  isAdminEntranceActive={showAdminEntrance}
                  onUpdateUser={handleUpdateUser}
                  onOpenAuth={() => {
                    soundFx.playModalTransition();
                    setIsAuthModalOpen(true);
                  }}
                  onSignOut={handleSignOut}
                  onGetGeolocation={handleGetGeolocation}
                  isLocating={isLocating}
                  geoError={geoError}
                  geoAccuracy={lastAccuracy}
                  onSaveLocationToProfile={handleSaveLocationToProfile}
                  onUploadAvatar={handleUploadAvatar}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectStar={(id) => {
                    setSelectedStarId(id);
                    if (typeof id === 'string' && id.startsWith('dso_') && !settings.showDeepSky) {
                      setSettings((prev) => ({ ...prev, showDeepSky: true }));
                    } else if (typeof id === 'string' && id.startsWith('sat_') && !settings.showSatellites) {
                      setSettings((prev) => ({ ...prev, showSatellites: true }));
                    }
                    setViewMode('3D_ZENITH_DOME');
                  }}
                  observationLogs={observationLogs}
                  onAddLog={handleAddLog}
                  onDeleteLog={handleDeleteLog}
                  preferences={preferences}
                  onUpdatePreferences={handleUpdatePreferences}
                  starsCatalog={[...satelliteBodies, ...solarBodies, ...deepSkyBodies, ...calculatedStars]}
                  settings={settings}
                  onSettingsChange={setSettings}
                  location={location}
                  lang={lang}
                  onLanguageChange={setLang}
                  pwa={pwa}
                />
              </Suspense>
            )}
          </AnimatePresence>
        </div>

        {/* Row 2: Mobile BottomNav in Flex flow */}
        {!isSearchOpen && (
          <BottomNav
            viewMode={viewMode}
            setViewMode={(mode) => {
              setViewMode(mode);
              setIsAccountOpen(false);
              if (isMobile) setIsSidebarOpen(false);
            }}
            onOpenAccount={() => {
              setIsAccountOpen(true);
              if (isMobile) setIsSidebarOpen(false);
            }}
            isAccountOpen={isAccountOpen}
            onCloseAccount={() => setIsAccountOpen(false)}
            hasActiveTarget={!!selectedStar}
            lang={lang}
          />
        )}

        {/* Full-Shell Overlays */}
        {isSearchOpen && (
          <Suspense fallback={null}>
            <SearchBarModal
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              onSelectStar={handleSelectCelestial}
              starsCatalog={[...satelliteBodies, ...solarBodies, ...deepSkyBodies, ...calculatedStars.filter((s: Star) => Boolean(s.name))]}
              lang={lang}
            />
          </Suspense>
        )}

        {isCaptureOpen && capturedMeta && (
          <Suspense fallback={null}>
            <SkyCaptureModal
              isOpen={isCaptureOpen}
              onClose={() => setIsCaptureOpen(false)}
              rawCanvas={capturedRawCanvas}
              metadata={capturedMeta}
              lang={lang}
            />
          </Suspense>
        )}

        <AnimatePresence>
          {isAuthModalOpen && (
            <Suspense fallback={null}>
              <AuthModal
                isOpen={isAuthModalOpen}
                onClose={handleCloseAuthModal}
                lang={lang}
                onSuccess={handleAuthSuccess}
              />
            </Suspense>
          )}
        </AnimatePresence>

        <AdminLoginEntrance
          isOpen={showAdminEntrance}
          lang={lang}
          onLand={() => {
            window.clearTimeout(adminLandTimerRef.current);
            setAdminBadgeJustLanded(true);
            adminLandTimerRef.current = window.setTimeout(() => {
              setAdminBadgeJustLanded(false);
            }, 1200);
          }}
          onComplete={() => setShowAdminEntrance(false)}
        />
      </div>

      <AetheriaSplashScreen isReady={isAppReady} lang={lang} />
    </>
  );
}

export default App;
