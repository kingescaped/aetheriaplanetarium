import React, { useState } from 'react';
import { 
  User, 
  X, 
  Bookmark, 
  BookOpen, 
  Settings, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown, 
  Trash2, 
  Moon, 
  Globe, 
  Eye, 
  Mountain, 
  Compass, 
  Volume2, 
  Info, 
  MapPin, 
  Crosshair 
} from 'lucide-react';
import { UserProfile, ObservationLog, UserPreferences } from '../../types/account';
import { Star, CelestialSettings, ObserverLocation } from '../../types/celestial';
import { Language, TRANSLATIONS } from '../../utils/i18n';
import { soundFx } from '../../utils/audio';
import { IOSNavigationBar } from '../layout/IOSNavigationBar';
import { IOSSwitch } from '../layout/IOSSwitch';
import { UsePWAResult } from '../../hooks/usePWA';
import { Download, CheckCircle2 } from 'lucide-react';
import { AetheriaStarLogo } from '../common/AetheriaLogo';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  favorites: string[];
  onToggleFavorite: (starId: string | number) => void;
  onSelectStar: (starId: string | number) => void;
  observationLogs: ObservationLog[];
  onAddLog: (log: Omit<ObservationLog, 'id'>) => void;
  onDeleteLog: (id: string) => void;
  preferences: UserPreferences;
  onUpdatePreferences: (pref: UserPreferences) => void;
  starsCatalog: Star[];
  settings: CelestialSettings;
  onSettingsChange: (settings: CelestialSettings) => void;
  location: ObserverLocation;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  pwa?: UsePWAResult;
}

type SettingSection = 'profile' | 'favorites' | 'journal' | 'display' | 'units' | 'about';

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  favorites,
  onToggleFavorite,
  onSelectStar,
  observationLogs,
  onAddLog,
  onDeleteLog,
  preferences,
  onUpdatePreferences,
  starsCatalog,
  settings,
  onSettingsChange,
  location,
  lang,
  onLanguageChange,
  pwa,
}) => {
  // Mobile Navigation: null means Main Settings Hub, or specific section
  const [activeSection, setActiveSection] = useState<SettingSection | null>(null);
  // Desktop active tab
  const [desktopTab, setDesktopTab] = useState<SettingSection>('profile');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(user.name);
  const [callsignInput, setCallsignInput] = useState<string>(user.callsign);

  // Journal Inputs
  const [newLogNotes, setNewLogNotes] = useState<string>('');
  const [selectedLogStarId, setSelectedLogStarId] = useState<string>('sirius');
  const [equipment, setEquipment] = useState<'Naked Eye' | 'Binoculars' | 'Refractor Telescope' | 'Reflector Telescope'>('Naked Eye');
  const [seeing, setSeeing] = useState<'Pristine' | 'Good' | 'Moderate' | 'Light Pollution'>('Good');

  const t = TRANSLATIONS[lang];

  // Global Escape key listener for desktop
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cử chỉ vuốt mép trái (Edge-swipe to go back) chuẩn iOS:
  // 1. Khi đang ở Root Hub Cài đặt (activeSection === null): Vuốt mép trái sẽ đóng Modal cài đặt
  const { handlers: rootSwipeHandlers, style: rootSwipeStyle, backdropOpacity } = useEdgeSwipeBack({
    onBack: onClose,
    edgeWidth: 32,
    threshold: 60,
    enabled: isOpen && activeSection === null,
  });

  // Mở mục con với animation trượt mượt mà (AnimatePresence)
  const handleOpenSection = (section: SettingSection) => {
    soundFx.playTabClick();
    setActiveSection(section);
  };

  // Đóng mục con khi bấm nút Back (< Cài đặt): AnimatePresence trượt êm ra khỏi màn hình rồi mới unmount
  const handleCloseSection = () => {
    soundFx.playTabClick();
    setActiveSection(null);
  };

  if (!isOpen) return null;

  const handleSaveProfile = () => {
    soundFx.playToggle(true);
    onUpdateUser({
      ...user,
      name: nameInput.trim() || user.name,
      callsign: callsignInput.trim() || user.callsign,
      isGuest: false,
    });
    setIsEditing(false);
  };

  const handleAddJournalEntry = () => {
    const star = starsCatalog.find((s) => s.id === selectedLogStarId);
    if (!star) return;

    soundFx.playToggle(true);
    onAddLog({
      starId: star.id,
      starName: star.name || `Star #${star.id}`,
      date: new Date().toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }),
      locationName: location.name,
      notes: newLogNotes.trim() || (lang === 'vi' ? 'Quan sát rõ nét, khí quyển tĩnh lặng.' : 'Clear observation, steady atmosphere.'),
      altitude: star.alt || 45,
      azimuth: star.az || 180,
      equipment,
      seeingCondition: seeing,
    });
    setNewLogNotes('');
  };

  const favoriteStarsList = starsCatalog.filter((s) => favorites.includes(String(s.id)));

  // Navigation Items Config (Clean without redundant subtitle descriptions)
  const navSections = [
    { id: 'profile' as SettingSection, title: t.profileSection, icon: User, color: 'text-cyan-400', badge: null },
    { id: 'favorites' as SettingSection, title: t.favoritesSection, icon: Bookmark, color: 'text-amber-400', badge: favorites.length },
    { id: 'journal' as SettingSection, title: t.journalSection, icon: BookOpen, color: 'text-purple-400', badge: observationLogs.length },
    { id: 'display' as SettingSection, title: t.displaySection, icon: Eye, color: 'text-emerald-400', badge: null },
    { id: 'units' as SettingSection, title: t.unitsSection, icon: Globe, color: 'text-blue-400', badge: lang.toUpperCase() },
    { id: 'about' as SettingSection, title: t.aboutSection, icon: Info, color: 'text-slate-400', badge: 'v2.5' },
  ];

  const currentSectionMeta = navSections.find((s) => s.id === (activeSection || desktopTab));

  // Render Sub-section Content
  const renderSectionContent = (section: SettingSection) => {
    switch (section) {
      case 'profile':
        return (
          <div className="space-y-4">
            {/* Observer Card */}
            <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-900/60 border border-white/5">
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-950 to-indigo-950 border-2 border-cyan-400/50 flex items-center justify-center text-2xl font-bold font-hud text-cyan-300 shadow-glow-cyan flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-space-950" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white truncate">{user.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-hud bg-purple-950/80 text-purple-300 border border-purple-500/30">
                    {user.rank}
                  </span>
                </div>
                <div className="text-xs text-cyan-400 font-mono mt-0.5">
                  Callsign: @{user.callsign}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{location.name} ({location.latitude.toFixed(1)}°, {location.longitude.toFixed(1)}°)</span>
                </div>
              </div>
            </div>

            {/* Edit Profile Form */}
            {isEditing ? (
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/10 space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-hud uppercase">{t.observerName}</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-hud uppercase">{t.callsign}</label>
                  <input
                    type="text"
                    value={callsignInput}
                    onChange={(e) => setCallsignInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-semibold"
                  >
                    {t.saveProfile}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 rounded-xl glass-panel text-xs text-slate-200 hover:text-white hover:border-cyan-500/40 font-medium transition-all"
              >
                {lang === 'vi' ? 'Chỉnh sửa thông tin hồ sơ' : 'Edit Profile Information'}
              </button>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
                <div className="text-[10px] text-slate-400 font-hud">{t.favoriteObjects}</div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{favorites.length}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
                <div className="text-[10px] text-slate-400 font-hud">{t.loggedObservations}</div>
                <div className="text-xl font-bold font-mono text-purple-400 mt-1">{observationLogs.length}</div>
              </div>
            </div>
          </div>
        );

      case 'favorites':
        return (
          <div className="space-y-3">
            {favoriteStarsList.length > 0 ? (
              <div className="space-y-2">
                {favoriteStarsList.map((star) => (
                  <div
                    key={star.id}
                    className="p-3 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center justify-between group hover:border-cyan-500/30 transition-all"
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span>{star.name || `Star #${star.id}`}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {star.con} • Mag: {star.mag} • {star.dist} ly
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => {
                          soundFx.playTargetRayTrace();
                          onSelectStar(star.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-[10px] font-mono border border-cyan-500/30 flex items-center gap-1"
                      >
                        <Crosshair className="w-3 h-3 text-cyan-400" />
                        <span>Target 3D</span>
                      </button>
                      <button
                        onClick={() => {
                          soundFx.playToggle(false);
                          onToggleFavorite(star.id);
                        }}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                {t.noFavorites}
              </div>
            )}
          </div>
        );

      case 'journal':
        return (
          <div className="space-y-4">
            {/* New Entry Form */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-cyan-400 font-hud block">
                {t.logNewObservation}
              </span>

              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">{t.selectStar}</label>
                  <select
                    value={selectedLogStarId}
                    onChange={(e) => setSelectedLogStarId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                  >
                    {starsCatalog.filter((s) => s.name).map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                        {s.name} ({s.con}) - Mag: {s.mag}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{t.equipmentUsed}</label>
                    <select
                      value={equipment}
                      onChange={(e) => setEquipment(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs"
                    >
                      <option value="Naked Eye" className="bg-slate-900">{t.nakedEye}</option>
                      <option value="Binoculars" className="bg-slate-900">{t.binoculars}</option>
                      <option value="Refractor Telescope" className="bg-slate-900">{t.refractor}</option>
                      <option value="Reflector Telescope" className="bg-slate-900">{t.reflector}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{t.seeingConditions}</label>
                    <select
                      value={seeing}
                      onChange={(e) => setSeeing(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs"
                    >
                      <option value="Pristine" className="bg-slate-900">{t.seeingPristine}</option>
                      <option value="Good" className="bg-slate-900">{t.seeingGood}</option>
                      <option value="Moderate" className="bg-slate-900">{t.seeingModerate}</option>
                    </select>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder={t.fieldNotes}
                  value={newLogNotes}
                  onChange={(e) => setNewLogNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                />
              </div>

              <button
                onClick={handleAddJournalEntry}
                className="w-full py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/40 font-semibold text-xs transition-all shadow-glow-purple"
              >
                {t.recordEntry}
              </button>
            </div>

            {/* Sighting History */}
            <div className="space-y-2">
              {observationLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5 space-y-1.5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-white text-xs">{log.starName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.date} • {log.locationName}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        soundFx.playToggle(false);
                        onDeleteLog(log.id);
                      }}
                      className="text-slate-500 hover:text-red-400 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 italic bg-black/20 p-2 rounded-lg">
                    "{log.notes}"
                  </p>

                  <div className="flex gap-2 text-[10px] font-mono text-cyan-300/80">
                    {log.equipment && <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/5">{log.equipment}</span>}
                    {log.seeingCondition && <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/5">{log.seeingCondition}</span>}
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/5">Alt: {log.altitude.toFixed(1)}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'display':
        return (
          <div className="space-y-3">
            {/* Night Vision Red Mode */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/30">
                  <Moon className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <div className="text-xs text-white font-medium">{t.nightVisionMode}</div>
                  <div className="text-[10px] text-slate-400">{t.nightVisionDesc}</div>
                </div>
              </div>
              <IOSSwitch
                checked={preferences.nightVisionMode}
                color="red"
                onChange={(checked) =>
                  onUpdatePreferences({ ...preferences, nightVisionMode: checked })
                }
              />
            </div>

            {/* Horizon Silhouette */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 hover:bg-slate-800/40 transition-all">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30">
                  <Mountain className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs text-white font-medium">{t.horizonSilhouette}</div>
                  <div className="text-[10px] text-slate-400">{t.horizonSilhouetteDesc}</div>
                </div>
              </div>
              <IOSSwitch
                checked={settings.showGroundHorizon}
                color="cyan"
                onChange={(checked) =>
                  onSettingsChange({ ...settings, showGroundHorizon: checked })
                }
              />
            </div>

            {/* Constellation Lines */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-white font-medium">{t.constellationLines}</span>
              </div>
              <IOSSwitch
                checked={settings.showConstellationLines}
                color="purple"
                onChange={(checked) =>
                  onSettingsChange({ ...settings, showConstellationLines: checked })
                }
              />
            </div>

            {/* Constellation Labels */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-white font-medium">{t.constellationLabels}</span>
              </div>
              <IOSSwitch
                checked={settings.showConstellationLabels}
                color="purple"
                onChange={(checked) =>
                  onSettingsChange({ ...settings, showConstellationLabels: checked })
                }
              />
            </div>

            {/* Prominent Star Labels */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-white font-medium">{t.starLabels}</span>
              </div>
              <IOSSwitch
                checked={settings.showStarLabels}
                color="cyan"
                onChange={(checked) =>
                  onSettingsChange({ ...settings, showStarLabels: checked })
                }
              />
            </div>

            {/* Coordinates Grid */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="flex items-center space-x-3">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-white font-medium">{t.gridLines}</span>
              </div>
              <IOSSwitch
                checked={settings.showGridLines}
                color="cyan"
                onChange={(checked) =>
                  onSettingsChange({ ...settings, showGridLines: checked })
                }
              />
            </div>

            {/* Magnitude Slider */}
            <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="flex justify-between text-slate-300 mb-1.5">
                <span className="text-[10px] text-slate-400 font-hud">{t.magnitudeThreshold}</span>
                <span className="text-xs font-mono text-cyan-400 font-bold">{settings.magnitudeLimit.toFixed(1)} mag</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.5"
                step="0.1"
                value={settings.magnitudeLimit}
                onChange={(e) =>
                  onSettingsChange({ ...settings, magnitudeLimit: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        );

      case 'units':
        return (
          <div className="space-y-4">
            {/* Language Switcher */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="flex items-center space-x-2 text-slate-300">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-xs text-white">{t.languageSwitcher}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    soundFx.playTabClick();
                    onLanguageChange('vi');
                  }}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 font-medium text-xs transition-all ${
                    lang === 'vi'
                      ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-glow-cyan'
                      : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🇻🇳</span>
                  <span>Tiếng Việt</span>
                </button>

                <button
                  onClick={() => {
                    soundFx.playTabClick();
                    onLanguageChange('en');
                  }}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 font-medium text-xs transition-all ${
                    lang === 'en'
                      ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-glow-cyan'
                      : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>English</span>
                </button>
              </div>
            </div>

            {/* Coordinate Format */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white font-medium">{t.coordFormat}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {lang === 'vi' ? 'Độ thập phân hoặc DMS' : 'Decimal vs DMS'}
                </div>
              </div>
              <div className="relative">
                <select
                  value={preferences.coordinateFormat}
                  onChange={(e) => {
                    soundFx.playTabClick();
                    onUpdatePreferences({ ...preferences, coordinateFormat: e.target.value as any });
                  }}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono bg-slate-950/80 border border-white/10 appearance-none cursor-pointer pr-8 text-cyan-300"
                >
                  <option value="DECIMAL" className="bg-slate-900">{t.decimalDeg}</option>
                  <option value="DMS" className="bg-slate-900">{t.dmsDeg}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-cyan-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Distance Unit */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white font-medium">{t.distanceUnit}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {lang === 'vi' ? 'Năm ánh sáng hoặc Parsec' : 'Light-years vs Parsecs'}
                </div>
              </div>
              <div className="relative">
                <select
                  value={preferences.distanceUnit || 'LY'}
                  onChange={(e) => {
                    soundFx.playTabClick();
                    onUpdatePreferences({ ...preferences, distanceUnit: e.target.value as any });
                  }}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono bg-slate-950/80 border border-white/10 appearance-none cursor-pointer pr-8 text-cyan-300"
                >
                  <option value="LY" className="bg-slate-900">{t.lightYears} (ly)</option>
                  <option value="PARSEC" className="bg-slate-900">{t.parsecs} (pc)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-cyan-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Audio Feedback */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
              <div className="flex items-center space-x-2.5">
                <Volume2 className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs text-white font-medium">{t.audioFeedback}</div>
                  <div className="text-[10px] text-slate-400">{t.audioDesc}</div>
                </div>
              </div>
              <IOSSwitch
                checked={preferences.soundEnabled}
                color="purple"
                onChange={(checked) => {
                  soundFx.setEnabled(checked);
                  onUpdatePreferences({ ...preferences, soundEnabled: checked });
                }}
              />
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-3.5">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-400/40 flex items-center justify-center shadow-glow-cyan">
                  <AetheriaStarLogo className="w-6 h-6 animate-pulse-subtle" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Aetheria Planetarium</h4>
                  <p className="text-[10px] text-cyan-400 font-mono">Zenith 3D Edition • v2.5.0</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {lang === 'vi' 
                  ? 'Ứng dụng mô phỏng thiên cầu thế hệ mới lấy cảm hứng từ Starwatch, kết hợp công nghệ WebGL 3D Zenith Dome với độ chính xác cơ học thiên văn quốc tế.'
                  : 'Next-generation planetarium web app inspired by Starwatch, featuring 3D Zenith Dome hemisphere simulation and high-precision celestial mechanics.'}
              </p>
            </div>

            <div className="divide-y divide-white/5 rounded-2xl bg-slate-900/40 border border-white/5 p-3 text-xs space-y-2">
              <div className="pt-1 flex justify-between">
                <span className="text-slate-400">{t.starCatalogInfo}</span>
                <span className="text-slate-200 font-mono">{t.starCatalogDesc}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">{t.graphicsEngine}</span>
                <span className="text-slate-200 font-mono">{t.graphicsEngineDesc}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Build Platform</span>
                <span className="text-slate-200 font-mono">React 18 / Tailwind / Vite</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-400">PWA Offline Cache</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {pwa?.isOfflineReady 
                    ? (lang === 'vi' ? 'Sẵn sàng ngoại tuyến' : 'Offline Ready')
                    : (lang === 'vi' ? 'Đã kích hoạt SW' : 'Active')}
                </span>
              </div>
            </div>

            {/* PWA Install Button inside Settings if available */}
            {pwa && !pwa.isInstalled && pwa.canInstall && (
              <button
                onClick={() => {
                  soundFx.playToggle(true);
                  pwa.promptInstall();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-glow-cyan active:scale-95 hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{t.pwaInstallBtn}</span>
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-40 md:flex md:items-center md:justify-center md:p-4 bg-[#060c1c] md:bg-black/75 backdrop-blur-xl"
    >
      <motion.div 
        {...rootSwipeHandlers}
        style={{ ...rootSwipeStyle }}
        className="relative w-full h-full md:h-[85vh] md:max-w-4xl rounded-none md:rounded-3xl bg-[#060c1c] border-0 md:border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================== MOBILE LAYOUT ===================== */}
        <div className="md:hidden relative w-full h-full flex flex-col overflow-hidden">
          {/* 1. Level 0: Mobile Main Settings Hub (Luôn hiển thị ở lớp nền bên dưới) */}
          <div className="w-full h-full flex flex-col overflow-hidden">
            <IOSNavigationBar
              title={lang === 'vi' ? 'Cài đặt' : 'Settings'}
            />
            <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
              {/* Profile Card Banner */}
              <div 
                onClick={() => handleOpenSection('profile')}
                className="p-4 rounded-3xl glass-panel border border-cyan-500/30 flex items-center space-x-3.5 active:scale-98 transition-all cursor-pointer"
              >
                <div className="w-13 h-13 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-xl font-bold font-hud text-cyan-300 flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white truncate">{user.name}</h3>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-hud bg-purple-950/80 text-purple-300 border border-purple-500/30">
                      {user.rank.split(' ')[0]}
                    </span>
                  </div>
                  <div className="text-[11px] text-cyan-400 font-mono">@{user.callsign}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{location.name}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>

              {/* Grouped Settings List (Clean, Không dấu X trên mobile) */}
              <div className="space-y-1.5">
                <div className="rounded-2xl glass-panel divide-y divide-white/5 overflow-hidden border border-white/5">
                  {navSections.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleOpenSection(item.id)}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/5 active:bg-cyan-500/10 transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <Icon className={`w-4 h-4 ${item.color}`} />
                          </div>
                          <span className="text-sm font-medium text-white">{item.title}</span>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {item.badge !== null && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Level 1: Mobile Detailed Sub-View (AnimatePresence đảm bảo trượt mượt mà 100% không nháy khung hình) */}
          <AnimatePresence>
            {activeSection !== null && (
              <motion.div
                key={activeSection}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0, right: 0.7 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 75 || info.velocity.x > 300) {
                    handleCloseSection();
                  }
                }}
                className="absolute inset-0 z-20 flex flex-col bg-[#060c1c] shadow-2xl"
              >
                <IOSNavigationBar
                  title={currentSectionMeta?.title}
                  backLabel={lang === 'vi' ? 'Cài đặt' : 'Settings'}
                  onBack={handleCloseSection}
                />
                <div className="flex-1 overflow-y-auto p-4 pb-12 overscroll-contain">
                  {renderSectionContent(activeSection)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===================== DESKTOP MASTER-DETAIL LAYOUT ===================== */}
        <div className="hidden md:flex flex-col flex-1 overflow-hidden">
          {/* Desktop Navigation Bar with Close button */}
          <IOSNavigationBar
            title={desktopTab ? navSections.find((s) => s.id === desktopTab)?.title : (lang === 'vi' ? 'Cài đặt' : 'Settings')}
            trailing={
              <button
                onClick={() => {
                  soundFx.playTabClick();
                  onClose();
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:opacity-60 text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                title={lang === 'vi' ? 'Đóng cài đặt (Esc)' : 'Close settings (Esc)'}
              >
                <X className="w-5 h-5" />
              </button>
            }
          />
          <div className="flex flex-1 overflow-hidden">
            {/* Left Category Sidebar */}
            <div className="w-72 border-r border-white/10 bg-slate-950/40 p-3 space-y-1 overflow-y-auto">
              {navSections.map((item) => {
                const Icon = item.icon;
                const isSelected = desktopTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      soundFx.playTabClick();
                      setDesktopTab(item.id);
                    }}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border border-cyan-400/40 text-white shadow-glow-cyan'
                        : 'hover:bg-white/5 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-xs font-semibold">{item.title}</span>
                    </div>

                    {item.badge !== null && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-white/10">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Detailed Settings Pane */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950/20">
              {renderSectionContent(desktopTab)}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
