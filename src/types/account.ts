export type UserRole = 'observer' | 'supreme_admin';

export type UserRank =
  | 'Apprentice Stargazer'
  | 'Observer'
  | 'Senior Astrophotographer'
  | 'Chief Astronomer'
  | 'Supreme Sovereign';

export interface SavedObserverLocation {
  name: string;
  latitude: number;
  longitude: number;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  callsign: string;
  email: string;
  avatarUrl: string;
  rank: UserRank;
  role: UserRole;
  adminTitle?: string;
  savedLocation?: SavedObserverLocation;
  joinedDate: string;
  isGuest: boolean;
}

export interface ObservationLog {
  id: string;
  starId: string | number;
  starName: string;
  date: string;
  locationName: string;
  notes: string;
  altitude: number;
  azimuth: number;
  equipment?: 'Naked Eye' | 'Binoculars' | 'Refractor Telescope' | 'Reflector Telescope';
  seeingCondition?: 'Pristine' | 'Good' | 'Moderate' | 'Light Pollution';
}

export interface UserPreferences {
  nightVisionMode: boolean;
  soundEnabled: boolean;
  coordinateFormat: 'DECIMAL' | 'DMS';
  distanceUnit: 'LY' | 'PARSEC';
  starGlowIntensity: number;
  fovSpeed: number;
}

/**
 * Returns true only for authenticated, non-guest Supreme Admin accounts.
 */
export function isAdminUser(user: UserProfile | null | undefined): boolean {
  return Boolean(user && !user.isGuest && user.role === 'supreme_admin');
}

/**
 * Creates a clean default guest observer profile.
 */
export function createGuestUserProfile(lang: 'vi' | 'en' = 'vi'): UserProfile {
  return {
    id: 'guest_observer',
    name: lang === 'vi' ? 'Quan sát viên Khách' : 'Guest Observer',
    callsign: 'GUEST_SKY',
    email: '',
    avatarUrl: '',
    rank: 'Observer',
    role: 'observer',
    joinedDate: 'Nov 2026',
    isGuest: true,
  };
}
