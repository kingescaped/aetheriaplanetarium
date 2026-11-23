export interface UserProfile {
  id: string;
  name: string;
  callsign: string;
  email: string;
  avatarUrl: string;
  rank: 'Apprentice Stargazer' | 'Observer' | 'Senior Astrophotographer' | 'Chief Astronomer';
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
