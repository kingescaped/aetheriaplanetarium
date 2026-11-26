import React, { useEffect, useRef, useState } from 'react';
import {
  User,
  X,
  Bookmark,
  BookOpen,
  Sparkles,
  ChevronRight,
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
  Crosshair,
  Camera,
  Loader2,
  LogIn,
  LogOut,
  Navigation2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Save,
} from 'lucide-react';
import {
  UserProfile,
  ObservationLog,
  UserPreferences,
} from '../../types/account';
import { Star, CelestialSettings, ObserverLocation } from '../../types/celestial';
import { Language, TRANSLATIONS } from '../../utils/i18n';
import { soundFx } from '../../utils/audio';
import { validateAvatarFile } from '../../utils/avatarResize';
import { IOSNavigationBar } from '../layout/IOSNavigationBar';
import { IOSSwitch } from '../layout/IOSSwitch';
import { SupremeAdminBadge } from '../common/SupremeAdminBadge';
import { UsePWAResult } from '../../hooks/usePWA';
import { AboutSection } from './AboutSection';
import { motion, AnimatePresence } from 'framer-motion';
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  isAdmin: boolean;
  godModeEnabled?: boolean;
  onToggleGodMode?: (enabled: boolean) => void;
  adminBadgeJustLanded?: boolean;
  isAdminEntranceActive?: boolean;
  onUpdateUser: (updated: UserProfile) => Promise<void> | void;
  onOpenAuth: () => void;
  onSignOut: () => Promise<void> | void;
  onGetGeolocation: () => Promise<ObserverLocation | null>;
  isLocating: boolean;
  geoError?: string | null;
  geoAccuracy?: number | null;
  onSaveLocationToProfile: (loc?: ObserverLocation) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<string>;
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
  onSettingsChange: React.Dispatch<React.SetStateAction<CelestialSettings>>;
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
  isAdmin,
  godModeEnabled = true,
  onToggleGodMode,
  adminBadgeJustLanded = false,
  isAdminEntranceActive = false,
  onUpdateUser,
  onOpenAuth,
  onSignOut,
  onGetGeolocation,
  isLocating,
  geoError,
  geoAccuracy,
  onSaveLocationToProfile,
  onUploadAvatar,
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
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileNotice, setProfileNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [isSavingLocation, setIsSavingLocation] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  // Journal Inputs
  const [newLogNotes, setNewLogNotes] = useState<string>('');
  const [selectedLogStarId, setSelectedLogStarId] = useState<string>('sirius');
  const [equipment, setEquipment] = useState<'Naked Eye' | 'Binoculars' | 'Refractor Telescope' | 'Reflector Telescope'>('Naked Eye');
  const [seeing, setSeeing] = useState<'Pristine' | 'Good' | 'Moderate' | 'Light Pollution'>('Good');

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    setNameInput(user.name);
    setCallsignInput(user.callsign);
  }, [user.id, user.name, user.callsign, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setProfileNotice(null);
      setAvatarStatus(null);
      setLocationNotice(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isAdmin && isAdminEntranceActive) {
      setDesktopTab('profile');
      setActiveSection('profile');
    }
  }, [isOpen, isAdmin, isAdminEntranceActive]);

  // Global Escape key listener for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Strict left-edge (28px) swipe-to-back for both Settings root & sub-views
  const handleCloseSection = () => {
    soundFx.playTabClick();
    setActiveSection(null);
  };

  const { handlers: rootSwipeHandlers, style: rootSwipeStyle } = useEdgeSwipeBack({
    onBack: onClose,
    edge: 'left',
    enabled: isOpen && activeSection === null,
  });

  const { handlers: subSwipeHandlers, style: subSwipeStyle } = useEdgeSwipeBack({
    onBack: handleCloseSection,
    edge: 'left',
    enabled: isOpen && activeSection !== null,
  });

  // Mở mục con với animation trượt mượt mà (AnimatePresence)
  const handleOpenSection = (section: SettingSection) => {
    soundFx.playTabClick();
    setActiveSection(section);
  };

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    if (isSavingProfile) return;
    soundFx.playToggle(true);
    setIsSavingProfile(true);
    setProfileNotice(null);
    try {
      await onUpdateUser({
        ...user,
        name: nameInput.trim() || user.name,
        callsign: callsignInput.trim() || user.callsign,
      });
      setIsEditing(false);
      if (!user.isGuest) {
        setProfileNotice({ type: 'success', text: t.profileSaveBtnSuccess });
      }
    } catch {
      setProfileNotice({
        type: 'error',
        text: lang === 'vi' ? 'Không thể lưu hồ sơ lúc này.' : 'Failed to save profile right now.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleTriggerAvatarPicker = () => {
    soundFx.playTabClick();
    if (user.isGuest) {
      setAvatarStatus({ type: 'error', text: t.avatarAuthRequired });
      return;
    }
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (user.isGuest) {
      setAvatarStatus({ type: 'error', text: t.avatarAuthRequired });
      return;
    }

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setAvatarStatus({ type: 'error', text: t.avatarInvalidFile });
      return;
    }

    const localObjectUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(localObjectUrl);
    setAvatarStatus(null);
    setIsUploadingAvatar(true);

    try {
      await onUploadAvatar(file);
      soundFx.playToggle(true);
      setAvatarStatus({ type: 'success', text: t.avatarUploadSuccess });
    } catch {
      setAvatarStatus({ type: 'error', text: t.avatarUploadError });
    } finally {
      setIsUploadingAvatar(false);
      setAvatarPreviewUrl(null);
      URL.revokeObjectURL(localObjectUrl);
    }
  };

  const handleSaveCurrentLocation = async () => {
    if (isSavingLocation) return;
    soundFx.playTabClick();
    if (user.isGuest) {
      onOpenAuth();
      return;
    }
    setIsSavingLocation(true);
    setLocationNotice(null);
    try {
      await onSaveLocationToProfile(location);
      soundFx.playToggle(true);
      setLocationNotice({ type: 'success', text: t.profileLocationSaved });
    } catch {
      setLocationNotice({
        type: 'error',
        text:
          lang === 'vi'
            ? 'Không thể lưu vị trí vào hồ sơ lúc này.'
            : 'Unable to save location to cloud profile.',
      });
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleSignOutClick = async () => {
    if (isSigningOut) return;
    soundFx.playTabClick();
    setIsSigningOut(true);
    try {
      await onSignOut();
      setIsEditing(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  const displayedAvatarUrl = avatarPreviewUrl || user.avatarUrl;

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
            {/* Hidden file input for Avatar upload */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/*"
              onChange={handleAvatarFileChange}
              className="sr-only"
              aria-label={t.avatarChangeBtn}
            />

            {/* Guest Sign In / Register Banner OR Verified Cloud Account Bar */}
            {user.isGuest ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/70 via-slate-900/90 to-indigo-950/70 border border-cyan-400/35 shadow-[0_10px_28px_rgba(2,132,199,0.2)] space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">{t.authSignInBannerTitle}</h3>
                  <p className="text-xs text-cyan-100/80 leading-relaxed">{t.authSignInBannerDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playModalTransition();
                    onOpenAuth();
                  }}
                  data-testid="account-open-auth-btn"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.99] text-white text-xs font-semibold shadow-[0_6px_18px_rgba(14,165,233,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  <span>{t.authSignInAction}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-slate-900/75 border border-emerald-400/25">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider font-hud text-emerald-300">
                      {t.authVerifiedAccount}
                    </div>
                    <div className="text-xs text-white font-mono truncate">{user.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOutClick}
                  disabled={isSigningOut}
                  data-testid="account-signout-btn"
                  className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-400/35 text-rose-100 text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  {isSigningOut ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{t.authSignOut}</span>
                </button>
              </div>
            )}

            {/* Grand Supreme Sovereign Admin Card */}
            {isAdmin && (
              <SupremeAdminBadge
                variant="card"
                lang={lang}
                adminTitle={user.adminTitle}
                justLanded={adminBadgeJustLanded}
                godModeEnabled={godModeEnabled}
                onToggleGodMode={onToggleGodMode}
              />
            )}

            {/* Observer Card with Interactive Avatar Upload */}
            <div
              className={`flex items-center space-x-4 p-4 rounded-2xl border ${
                isAdmin
                  ? 'bg-gradient-to-r from-[#170c33]/85 via-slate-900/80 to-[#1f103d]/85 border-amber-400/40 shadow-[0_8px_24px_rgba(0,0,0,0.45)]'
                  : 'bg-slate-900/60 border-white/10'
              }`}
            >
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={handleTriggerAvatarPicker}
                  disabled={isUploadingAvatar}
                  data-testid="profile-avatar-upload-btn"
                  title={t.avatarChangeBtn}
                  aria-label={t.avatarChangeBtn}
                  className={`group relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold font-hud transition-all cursor-pointer disabled:cursor-wait focus:outline-none focus-visible:ring-2 ${
                    isAdmin
                      ? 'bg-gradient-to-tr from-amber-950 to-purple-950 border-2 border-amber-300/80 text-amber-200 shadow-[0_0_20px_rgba(250,204,21,0.35)] focus-visible:ring-amber-300'
                      : 'bg-gradient-to-tr from-cyan-950 to-indigo-950 border-2 border-cyan-400/50 text-cyan-300 shadow-glow-cyan focus-visible:ring-cyan-400'
                  }`}
                >
                  {displayedAvatarUrl ? (
                    <img
                      src={displayedAvatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{user.name.charAt(0).toUpperCase()}</span>
                  )}

                  <span
                    className={`absolute inset-0 bg-black/55 flex items-center justify-center transition-opacity ${
                      isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" aria-hidden="true" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" aria-hidden="true" />
                    )}
                  </span>
                </button>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-space-950"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white truncate">{user.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-hud border ${
                      isAdmin
                        ? 'bg-amber-950/70 text-amber-200 border-amber-400/40'
                        : 'bg-purple-950/80 text-purple-300 border-purple-500/30'
                    }`}
                  >
                    {user.rank}
                  </span>
                </div>
                <div className="text-xs text-cyan-400 font-mono mt-0.5">
                  Callsign: @{user.callsign}
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTriggerAvatarPicker}
                    disabled={isUploadingAvatar}
                    data-testid="profile-change-avatar-text-btn"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-white/10 text-[11px] text-slate-200 hover:text-white transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-3 h-3 animate-spin text-cyan-300" aria-hidden="true" />
                    ) : (
                      <Camera className="w-3 h-3 text-cyan-300" aria-hidden="true" />
                    )}
                    <span>{isUploadingAvatar ? t.avatarUploading : t.avatarChangeBtn}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Avatar Status Feedback */}
            {avatarStatus && (
              <div
                role={avatarStatus.type === 'error' ? 'alert' : 'status'}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                  avatarStatus.type === 'success'
                    ? 'bg-emerald-950/55 border-emerald-400/35 text-emerald-100'
                    : 'bg-rose-950/60 border-rose-400/40 text-rose-100'
                }`}
              >
                {avatarStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" aria-hidden="true" />
                )}
                <span className="flex-1">{avatarStatus.text}</span>
                {user.isGuest && avatarStatus.type === 'error' && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[11px] font-semibold hover:bg-cyan-500/30 cursor-pointer shrink-0"
                  >
                    {t.authSignInTab}
                  </button>
                )}
              </div>
            )}

            {/* Field 1: Observer Name & Callsign Editor */}
            {isEditing ? (
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/10 space-y-3">
                <div>
                  <label
                    htmlFor="profile-name-input"
                    className="block text-[10px] text-slate-300 mb-1 font-hud uppercase"
                  >
                    {t.observerName}
                  </label>
                  <input
                    id="profile-name-input"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    disabled={isSavingProfile}
                    className="w-full px-3 py-2 rounded-xl glass-input text-base md:text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-callsign-input"
                    className="block text-[10px] text-slate-300 mb-1 font-hud uppercase"
                  >
                    {t.callsign}
                  </label>
                  <input
                    id="profile-callsign-input"
                    type="text"
                    value={callsignInput}
                    onChange={(e) => setCallsignInput(e.target.value)}
                    disabled={isSavingProfile}
                    className="w-full px-3 py-2 rounded-xl glass-input text-base md:text-xs font-mono"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    data-testid="profile-save-btn"
                    className="flex-1 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 border border-cyan-400/40 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isSavingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                    <span>{t.saveProfile}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={isSavingProfile}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                data-testid="profile-edit-btn"
                className="w-full py-2.5 rounded-xl glass-panel text-xs text-slate-100 hover:text-white hover:border-cyan-500/40 font-medium transition-all cursor-pointer"
              >
                {lang === 'vi' ? 'Chỉnh sửa Tên & Hô hiệu' : 'Edit Observer Name & Callsign'}
              </button>
            )}

            {profileNotice && (
              <div
                role={profileNotice.type === 'error' ? 'alert' : 'status'}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                  profileNotice.type === 'success'
                    ? 'bg-emerald-950/55 border-emerald-400/35 text-emerald-100'
                    : 'bg-rose-950/60 border-rose-400/40 text-rose-100'
                }`}
              >
                {profileNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" aria-hidden="true" />
                )}
                <span>{profileNotice.text}</span>
              </div>
            )}

            {/* Field 3: Current Location + GPS + Save Location to Firestore */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold text-white">{t.currentLocation}</span>
                </div>
                {geoAccuracy !== null && geoAccuracy !== undefined && (
                  <span className="text-[10px] font-mono tabular-nums text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/30">
                    {t.geoAccuracyLabel}: ±{geoAccuracy} m
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                <div className="text-xs font-medium text-white">{location.name}</div>
                <div className="text-[11px] font-mono tabular-nums text-cyan-300">
                  {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                </div>
                {user.savedLocation && (
                  <div className="pt-1.5 mt-1.5 border-t border-white/5 text-[11px] text-slate-300 flex items-center justify-between gap-2">
                    <span className="text-slate-400 shrink-0">{t.profileSavedLocationLabel}:</span>
                    <span className="font-mono tabular-nums text-emerald-300 truncate">
                      {user.savedLocation.name} ({user.savedLocation.latitude.toFixed(2)}°, {user.savedLocation.longitude.toFixed(2)}°)
                    </span>
                  </div>
                )}
              </div>

              {geoError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-950/60 border border-rose-400/40 text-rose-100 text-xs"
                >
                  <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{geoError}</span>
                </div>
              )}

              {locationNotice && (
                <div
                  role={locationNotice.type === 'error' ? 'alert' : 'status'}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                    locationNotice.type === 'success'
                      ? 'bg-emerald-950/55 border-emerald-400/35 text-emerald-100'
                      : 'bg-rose-950/60 border-rose-400/40 text-rose-100'
                  }`}
                >
                  {locationNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" aria-hidden="true" />
                  )}
                  <span>{locationNotice.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTabClick();
                    void onGetGeolocation();
                  }}
                  disabled={isLocating}
                  data-testid="profile-gps-btn"
                  className="py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-100 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {isLocating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" aria-hidden="true" />
                  ) : (
                    <Navigation2 className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                  )}
                  <span>{isLocating ? t.geoLocating : t.profileGetGpsBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCurrentLocation}
                  disabled={isSavingLocation}
                  data-testid="profile-save-location-btn"
                  className="py-2.5 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/45 text-indigo-100 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  {isSavingLocation ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-300" aria-hidden="true" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-indigo-300" aria-hidden="true" />
                  )}
                  <span>
                    {isSavingLocation ? t.profileSavingLocation : t.profileSaveLocationBtn}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
                <div className="text-[10px] text-slate-400 font-hud">{t.favoriteObjects}</div>
                <div className="text-xl font-bold font-mono tabular-nums text-cyan-400 mt-1">
                  {favorites.length}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
                <div className="text-[10px] text-slate-400 font-hud">{t.loggedObservations}</div>
                <div className="text-xl font-bold font-mono tabular-nums text-purple-400 mt-1">
                  {observationLogs.length}
                </div>
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
                    className="w-full px-3 py-2 rounded-xl glass-input text-base md:text-xs font-mono"
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
                      className="w-full px-2.5 py-1.5 rounded-xl glass-input text-base md:text-xs"
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
                      className="w-full px-2.5 py-1.5 rounded-xl glass-input text-base md:text-xs"
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
                  className="w-full px-3 py-2 rounded-xl glass-input text-base md:text-xs"
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

            {/* Milky Way Galactic Band */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4 h-4 text-indigo-300" />
                <div>
                  <div className="text-xs text-white font-medium">{t.showMilkyWay}</div>
                  <div className="text-[10px] text-slate-400">{t.showMilkyWayDesc}</div>
                </div>
              </div>
              <IOSSwitch
                checked={settings.showMilkyWay}
                color="purple"
                ariaLabel={t.showMilkyWay}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({ ...prev, showMilkyWay: checked }))
                }
              />
            </div>

            {/* ISS & Satellites Tracker */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="flex items-center space-x-3">
                <Compass className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs text-white font-medium">{t.showSatellites}</div>
                  <div className="text-[10px] text-slate-400">{t.showSatellitesDesc}</div>
                </div>
              </div>
              <IOSSwitch
                checked={settings.showSatellites}
                color="emerald"
                ariaLabel={t.showSatellites}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({ ...prev, showSatellites: checked }))
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
                ariaLabel={t.gridLines}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({ ...prev, showGridLines: checked }))
                }
              />
            </div>

            {/* Equatorial Grid */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="flex items-center space-x-3">
                <Globe className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-white font-medium">{t.showEquatorialGrid}</span>
              </div>
              <IOSSwitch
                checked={settings.showEquatorialGrid}
                color="emerald"
                ariaLabel={t.showEquatorialGrid}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({ ...prev, showEquatorialGrid: checked }))
                }
              />
            </div>

            {/* Daylight & Twilight Atmosphere */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="flex items-center space-x-3">
                <Eye className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs text-white font-medium">{t.showAtmosphereTwilight}</div>
                  <div className="text-[10px] text-slate-400">{t.showAtmosphereTwilightDesc}</div>
                </div>
              </div>
              <IOSSwitch
                checked={settings.showAtmosphereTwilight}
                color="cyan"
                ariaLabel={t.showAtmosphereTwilight}
                onChange={(checked) =>
                  onSettingsChange((prev) => ({ ...prev, showAtmosphereTwilight: checked }))
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
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onChange={(e) =>
                  onSettingsChange({ ...settings, magnitudeLimit: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer touch-pan-x"
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
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 font-medium text-xs transition-all ${lang === 'vi'
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
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 font-medium text-xs transition-all ${lang === 'en'
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
                  className="w-full px-3 py-2 rounded-xl glass-input text-base md:text-xs font-mono bg-slate-950/80 border border-white/10 appearance-none cursor-pointer pr-8 text-cyan-300"
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
                  className="w-full px-3 py-2 rounded-xl glass-input text-base md:text-xs font-mono bg-slate-950/80 border border-white/10 appearance-none cursor-pointer pr-8 text-cyan-300"
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
        return <AboutSection lang={lang} pwa={pwa} installLabel={t.pwaInstallBtn} />;

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
      className="absolute inset-0 z-40 md:flex md:items-center md:justify-center md:p-4 bg-[#030712] md:bg-black/75 backdrop-blur-xl"
    >
      <motion.div
        {...rootSwipeHandlers}
        style={{ ...rootSwipeStyle }}
        className="relative w-full h-full md:h-[85vh] md:max-w-4xl rounded-none md:rounded-3xl bg-[#030712] border-0 md:border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================== MOBILE LAYOUT ===================== */}
        <div className="md:hidden relative w-full h-full flex flex-col overflow-hidden">
          {/* 1. Level 0: Mobile Main Settings Hub (Luôn hiển thị ở lớp nền bên dưới) */}
          <div className="relative z-10 isolate w-full h-full flex flex-col overflow-hidden">
            <IOSNavigationBar
              title={lang === 'vi' ? 'Cài đặt' : 'Settings'}
            />
            <div className="flex-1 overflow-y-auto py-4 safe-px space-y-4 overscroll-contain touch-pan-y">
              {/* Guest Sign In Banner on Mobile Hub */}
              {user.isGuest && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/75 via-slate-900/90 to-indigo-950/75 border border-cyan-400/35 space-y-2.5">
                  <div className="text-sm font-bold text-white">{t.authSignInBannerTitle}</div>
                  <p className="text-xs text-cyan-100/80 leading-relaxed">{t.authSignInBannerDesc}</p>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playModalTransition();
                      onOpenAuth();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" aria-hidden="true" />
                    <span>{t.authSignInAction}</span>
                  </button>
                </div>
              )}

              {/* Grand Supreme Sovereign Badge on Mobile Settings Hub (hidden while sub-view covers it so Entrance fly targets the visible Profile crest) */}
              {isAdmin && activeSection === null && (
                <SupremeAdminBadge
                  variant="card"
                  lang={lang}
                  adminTitle={user.adminTitle}
                  justLanded={adminBadgeJustLanded}
                  godModeEnabled={godModeEnabled}
                  onToggleGodMode={onToggleGodMode}
                />
              )}

              {/* Profile Card Banner */}
              <div
                onClick={() => handleOpenSection('profile')}
                className={`p-4 rounded-3xl glass-panel border flex items-center space-x-3.5 active:scale-98 transition-all cursor-pointer ${
                  isAdmin ? 'border-amber-400/50 shadow-[0_0_20px_rgba(250,204,21,0.22)]' : 'border-cyan-500/30'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-xl font-bold font-hud flex-shrink-0 ${
                    isAdmin
                      ? 'bg-amber-950/80 border-2 border-amber-300/80 text-amber-200'
                      : 'bg-cyan-950/80 border border-cyan-400/50 text-cyan-300'
                  }`}
                >
                  {displayedAvatarUrl ? (
                    <img
                      src={displayedAvatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white truncate">{user.name}</h3>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-hud border ${
                        isAdmin
                          ? 'bg-amber-950/75 text-amber-200 border-amber-400/40'
                          : 'bg-purple-950/80 text-purple-300 border-purple-500/30'
                      }`}
                    >
                      {user.rank.split(' ')[0]}
                    </span>
                  </div>
                  <div className="text-[11px] text-cyan-400 font-mono truncate">
                    @{user.callsign}{!user.isGuest && user.email ? ` • ${user.email}` : ''}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{location.name}</div>
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

              {/* Mobile Sign Out Button when signed in */}
              {!user.isGuest && (
                <button
                  type="button"
                  onClick={handleSignOutClick}
                  disabled={isSigningOut}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-400/35 text-rose-100 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{t.authSignOut}</span>
                </button>
              )}
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
                className="absolute inset-0 z-30 isolate flex flex-col"
              >
                <motion.div
                  {...subSwipeHandlers}
                  style={subSwipeStyle}
                  className="w-full h-full flex flex-col bg-[#030712] shadow-2xl"
                >
                  <IOSNavigationBar
                    title={navSections.find((s) => s.id === activeSection)?.title}
                    backLabel={lang === 'vi' ? 'Cài đặt' : 'Settings'}
                    onBack={handleCloseSection}
                  />
                  <div className="flex-1 overflow-y-auto py-4 safe-px pb-8 overscroll-contain touch-pan-y">
                    {renderSectionContent(activeSection)}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden md:flex flex-col flex-1 overflow-hidden">
          <IOSNavigationBar
            disableDesktopSafeTop
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
                    className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all ${isSelected
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
