import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { InfoPanel } from './components/layout/InfoPanel';
import { StarBottomSheet } from './components/layout/StarBottomSheet';
import { StarTelemetryHUD } from './components/layout/StarTelemetryHUD';
import { BottomHUD } from './components/layout/BottomHUD';
import { BottomNav } from './components/layout/BottomNav';
import { SearchBarModal } from './components/search/SearchBarModal';
import { AccountModal } from './components/account/AccountModal';
import { SkyMap2D } from './components/planetarium/SkyMap2D';
import { ZenithDomeCanvas } from './components/zenith3d/ZenithDomeCanvas';
import { 
  ViewMode, 
  ObserverLocation, 
  CelestialSettings, 
  Star 
} from './types/celestial';
import { UserProfile, ObservationLog, UserPreferences } from './types/account';
import { STAR_CATALOG } from './data/stars';
import { getLST, equatorialToHorizontal, batchComputeHorizontalCoordsInPlace } from './utils/astronomy';
import { Language } from './utils/i18n';
import { soundFx } from './utils/audio';
import { usePWA } from './hooks/usePWA';
import { useSafeAreaCalibration } from './hooks/useSafeAreaCalibration';
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner';
import { AetheriaSplashScreen } from './components/common/AetheriaSplashScreen';

export function App() {
  // PWA Service Worker & Install State
  const pwa = usePWA();

  // JS-based Safe Area calibration: overrides frozen CSS env() values on iOS PWA
  useSafeAreaCalibration();

  // App Initialization & Safe Area Calibration Splash Screen
  const [isAppReady, setIsAppReady] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const initApp = async () => {
      // 1. Chờ font nạp hoàn tất
      try {
        if ('fonts' in document) {
          await (document as any).fonts.ready;
        }
      } catch (err) {
        // Fallback
      }

      // 2. Đệm an toàn ~850ms để Safe Area iOS và ma trận 5.200 sao hoàn tất ngầm
      setTimeout(() => {
        if (isMounted) {
          setIsAppReady(true);
        }
      }, 850);
    };

    initApp();
    return () => {
      isMounted = false;
    };
  }, []);

  // Internationalization (Bilingual Vietnamese / English)
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('aetheria_lang');
    return (saved === 'en' || saved === 'vi') ? saved : 'vi';
  });

  useEffect(() => {
    localStorage.setItem('aetheria_lang', lang);
  }, [lang]);

  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('2D_PLANETARIUM');
  
  // Observer Location (Default: Hanoi, Vietnam)
  const [location, setLocation] = useState<ObserverLocation>({
    name: 'Hanoi (Vietnam)',
    latitude: 21.0285,
    longitude: 105.8542,
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);

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
  });

  // Xác định chuẩn xác giao diện Mobile ngay từ frame đầu tiên (tránh độ trễ viewport 980px trên Safari/iOS)
  const checkIsMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    const isSmallScreen = window.innerWidth < 768;
    const isMediaSmall = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches;
    const isMobileUA = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isSmallScreen || isMediaSmall || isMobileUA;
  };

  // UI Panels State (Sidebar LUÔN đóng mặc định trên Mobile ngay từ đầu)
  const [isMobile, setIsMobile] = useState<boolean>(checkIsMobile);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => !checkIsMobile());

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

  // Stargazer Account & User Preferences
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('aetheria_user');
    return saved ? JSON.parse(saved) : {
      id: 'usr_stargazer_1',
      name: 'Stargazer Leo',
      callsign: 'LeoCosmos',
      email: 'leo@stargazer.space',
      avatarUrl: '',
      rank: 'Senior Astrophotographer',
      joinedDate: 'Nov 2026',
      isGuest: false,
    };
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('aetheria_favorites');
    return saved ? JSON.parse(saved) : ['sirius', 'betelgeuse', 'vega', 'polaris'];
  });

  const [observationLogs, setObservationLogs] = useState<ObservationLog[]>(() => {
    const saved = localStorage.getItem('aetheria_logs');
    return saved ? JSON.parse(saved) : [
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
      }
    ];
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('aetheria_prefs');
    return saved ? JSON.parse(saved) : {
      nightVisionMode: false,
      soundEnabled: true,
      coordinateFormat: 'DECIMAL',
      fovSpeed: 1.0,
    };
  });

  // Persist user data
  useEffect(() => {
    localStorage.setItem('aetheria_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('aetheria_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('aetheria_logs', JSON.stringify(observationLogs));
  }, [observationLogs]);

  useEffect(() => {
    localStorage.setItem('aetheria_prefs', JSON.stringify(preferences));
    soundFx.setEnabled(preferences.soundEnabled ?? true);
  }, [preferences]);

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

  // Selected Star with live calculated alt & az
  const selectedStar = useMemo(() => {
    return calculatedStars.find((s: Star) => s.id === selectedStarId) || calculatedStars[0];
  }, [calculatedStars, selectedStarId]);

  // Simulation Time Tick
  useEffect(() => {
    if (settings.timeSpeed === 0) return;

    const interval = setInterval(() => {
      setCurrentDate((prevDate) => {
        const incrementMs = settings.timeSpeed * 100;
        return new Date(prevDate.getTime() + incrementMs);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [settings.timeSpeed]);

  // Geolocation detector
  const handleGetGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          name: 'My GPS Location',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
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

  // Handle Favorites toggle
  const handleToggleFavorite = (starId: string | number) => {
    const strId = String(starId);
    setFavorites((prev) =>
      prev.includes(strId) ? prev.filter((id) => id !== strId) : [...prev, strId]
    );
  };

  // Check if full-screen modal (Settings / Search) is open to hide Main Header
  const isAnyModalOpen = isAccountOpen || isSearchOpen;

  return (
    <div className={`fixed inset-0 w-full h-full overflow-hidden text-slate-100 select-none ${preferences.nightVisionMode ? 'night-vision' : ''}`}>
      {/* Màn hình khởi tạo hệ thống thiên văn học & hiệu chuẩn Safe Area iOS */}
      <AetheriaSplashScreen isReady={isAppReady} lang={lang} />

      {/* Top Header: Chỉ hiển thị ở Bản đồ 2D và Vòm 3D khi không mở Cài đặt, Tìm kiếm hoặc Bảng điều khiển Mobile */}
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
            setIsSearchOpen(true);
          }}
          onGetGeolocation={handleGetGeolocation}
          isLocating={isLocating}
          onOpenAccount={() => {
            soundFx.playModalTransition();
            setIsAccountOpen(true);
          }}
          onOpenControls={() => {
            soundFx.playModalTransition();
            setIsSidebarOpen((prev) => !prev);
          }}
          lang={lang}
        />
      )}

      {/* Main Viewport Area (Container for 2D Sky Map & 3D Zenith Dome) */}
      <main className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        {viewMode === '2D_PLANETARIUM' ? (
          /* 2D Interactive Celestial Sky Map */
          <SkyMap2D
            stars={calculatedStars}
            location={location}
            currentDate={currentDate}
            settings={settings}
            selectedStar={selectedStar}
            onSelectStar={(star) => {
              soundFx.playStarSelect();
              setSelectedStarId(star.id);
            }}
            onHoverCoords={(coords) => setCursorCoords(coords)}
          />
        ) : (
          /* 3D Zenith Dome Viewport (Three.js WebGL - Nạp sẵn 100% trong RAM ngay từ đầu) */
          <ZenithDomeCanvas
            stars={calculatedStars}
            location={location}
            currentDate={currentDate}
            settings={settings}
            selectedStar={selectedStar}
            onSelectStar={(star) => {
              soundFx.playStarSelect();
              setSelectedStarId(star.id);
            }}
            targetAzimuth={targetAzimuth}
            isZenithRequested={isZenithRequested}
            isFocusRequested={isFocusRequested}
            lang={lang}
          />
        )}
      </main>

      {/* Left Collapsible Sidebar (Control Panel) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => {
          soundFx.playModalTransition();
          setIsSidebarOpen(!isSidebarOpen);
        }}
        location={location}
        onLocationChange={setLocation}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        settings={settings}
        onSettingsChange={setSettings}
        onSelectStar={(star) => {
          soundFx.playStarSelect();
          setSelectedStarId(star.id);
        }}
        selectedStar={selectedStar}
        lang={lang}
      />

      {/* Right Info Panel (Star Details Inspector - Desktop) */}
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
          location={location}
          currentDate={currentDate}
          lang={lang}
        />
      </div>

      {/* Mobile Telemetry HUD Card: Nằm ngay dưới phần đồng hồ giờ khi không mở Modal */}
      {selectedStar && !isAnyModalOpen && (
        <div 
          className="md:hidden fixed right-2.5 z-30 max-w-[210px] pointer-events-auto"
          style={{ top: 'calc(var(--sat, 47px) + 62px)' }}
        >
          <StarTelemetryHUD star={selectedStar} lang={lang} />
        </div>
      )}

      {/* Mobile Star Bottom Sheet (Draggable & Swipeable - Mobile) */}
      {/* Tab này chỉ hiện ở Bản đồ 2D và Vòm 3D, khi vào Cài đặt hoặc Tìm kiếm thì ẩn hoàn toàn */}
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
        lang={lang}
      />

      {/* Bottom HUD Bar */}
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

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        viewMode={viewMode}
        setViewMode={(mode) => {
          setViewMode(mode);
          setIsAccountOpen(false);
        }}
        onOpenAccount={() => setIsAccountOpen(true)}
        isAccountOpen={isAccountOpen}
        onCloseAccount={() => setIsAccountOpen(false)}
        hasActiveTarget={!!selectedStar}
        lang={lang}
      />

      {/* Search Modal (Ctrl+K) */}
      <SearchBarModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStar={(star) => {
          soundFx.playStarSelect();
          setSelectedStarId(star.id);
        }}
        starsCatalog={calculatedStars.filter((s: Star) => Boolean(s.name))}
        lang={lang}
      />

      {/* Stargazer Account & Observation Log Modal */}
      <AnimatePresence>
        {isAccountOpen && (
          <AccountModal
            isOpen={isAccountOpen}
            onClose={() => setIsAccountOpen(false)}
            user={user}
            onUpdateUser={setUser}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectStar={(id) => {
              setSelectedStarId(id);
              setViewMode('3D_ZENITH_DOME');
            }}
            observationLogs={observationLogs}
            onAddLog={(newLog) => {
              setObservationLogs((prev) => [
                { ...newLog, id: `log_${Date.now()}` },
                ...prev,
              ]);
            }}
            onDeleteLog={(id) => {
              setObservationLogs((prev) => prev.filter((log) => log.id !== id));
            }}
            preferences={preferences}
            onUpdatePreferences={setPreferences}
            starsCatalog={calculatedStars}
            settings={settings}
            onSettingsChange={setSettings}
            location={location}
            lang={lang}
            onLanguageChange={setLang}
            pwa={pwa}
          />
        )}
      </AnimatePresence>

      {/* PWA Home Screen Install Banner & Offline Cache Indicator */}
      <PWAInstallBanner pwa={pwa} lang={lang} />
    </div>
  );
}

export default App;
