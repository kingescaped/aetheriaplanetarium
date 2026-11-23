import { Star } from '../types/celestial';

/**
 * High-Precision Astronomical Coordinate & Time Conversion Engine
 * Computes Julian Date, Sidereal Time (LST), and transforms Equatorial (RA, Dec)
 * coordinates to Local Horizontal (Altitude, Azimuth) coordinates.
 */

// Convert degrees to radians
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

// Convert radians to degrees
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

// Normalize angle to [0, 360) range
export const normalizeDeg = (deg: number): number => {
  let result = deg % 360;
  if (result < 0) result += 360;
  return result;
};

/**
 * Calculates Julian Date from standard JavaScript Date (UTC)
 */
export const getJulianDate = (date: Date): number => {
  const time = date.getTime();
  return time / 86400000 + 2440587.5;
};

/**
 * Calculates Greenwich Mean Sidereal Time (GMST) in degrees
 * Formula based on IAU-76 / Astronomical Algorithms (Jean Meeus)
 */
export const getGMST = (jd: number): number => {
  const T = (jd - 2451545.0) / 36525.0; // Julian centuries since J2000.0
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  return normalizeDeg(gmst);
};

/**
 * Calculates Local Sidereal Time (LST) in degrees
 * LST = GMST + Longitude (East is positive)
 */
export const getLST = (date: Date, longitudeDeg: number): number => {
  const jd = getJulianDate(date);
  const gmst = getGMST(jd);
  return normalizeDeg(gmst + longitudeDeg);
};

/**
 * Converts Equatorial Coordinates (Right Ascension RA, Declination Dec)
 * to Local Horizontal Coordinates (Altitude, Azimuth).
 * 
 * @param raDeg Right Ascension in degrees [0, 360)
 * @param decDeg Declination in degrees [-90, +90]
 * @param latDeg Observer's Latitude in degrees [-90, +90]
 * @param lstDeg Local Sidereal Time in degrees [0, 360)
 * 
 * @returns { alt: number, az: number } in degrees
 * Altitude: [-90, +90] (90 = Zenith, 0 = Horizon)
 * Azimuth: [0, 360) (0 = North, 90 = East, 180 = South, 270 = West)
 */
export const equatorialToHorizontal = (
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lstDeg: number
): { alt: number; az: number } => {
  // Local Hour Angle (HA = LST - RA)
  const haDeg = normalizeDeg(lstDeg - raDeg);

  const haRad = degToRad(haDeg);
  const decRad = degToRad(decDeg);
  const latRad = degToRad(latDeg);

  // sin(alt) = sin(dec) * sin(lat) + cos(dec) * cos(lat) * cos(ha)
  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const altDeg = radToDeg(altRad);

  // cos(az) = (sin(dec) - sin(alt) * sin(lat)) / (cos(alt) * cos(lat))
  // sin(az) = -cos(dec) * sin(ha) / cos(alt)
  const cosAlt = Math.cos(altRad);
  let azDeg = 0;

  if (Math.abs(cosAlt) > 1e-6) {
    const cosAz =
      (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) /
      (cosAlt * Math.cos(latRad));
    const sinAz = (-Math.cos(decRad) * Math.sin(haRad)) / cosAlt;

    const azRad = Math.atan2(sinAz, cosAz);
    azDeg = normalizeDeg(radToDeg(azRad));
  }

  return { alt: altDeg, az: azDeg };
};

/**
 * Ultra-fast in-place calculation of horizontal coordinates (Alt, Az)
 * for large star catalogs (5,000+ stars).
 * Reuses existing object references to eliminate 5,000+ object allocations per frame.
 */
export const batchComputeHorizontalCoordsInPlace = (
  stars: Star[],
  latDeg: number,
  lstDeg: number
): void => {
  const latRad = degToRad(latDeg);
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const lstRad = degToRad(lstDeg);

  const count = stars.length;
  for (let i = 0; i < count; i++) {
    const star = stars[i];
    const decRad = degToRad(star.dec);
    const raRad = degToRad(star.ra);
    const haRad = lstRad - raRad;

    const sinDec = Math.sin(decRad);
    const cosDec = Math.cos(decRad);

    const sinAlt = sinDec * sinLat + cosDec * cosLat * Math.cos(haRad);
    const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    const cosAlt = Math.cos(altRad);

    let azDeg = 0;
    if (Math.abs(cosAlt) > 1e-6 && Math.abs(cosLat) > 1e-6) {
      const cosAz = (sinDec - sinAlt * sinLat) / (cosAlt * cosLat);
      const sinAz = (-cosDec * Math.sin(haRad)) / cosAlt;
      const azRad = Math.atan2(sinAz, cosAz);
      azDeg = normalizeDeg(radToDeg(azRad));
    }

    star.alt = radToDeg(altRad);
    star.az = azDeg;
  }
};

/**
 * Returns physical color hex code based on stellar spectral type
 */
export const getSpectralColor = (spect?: string): string => {
  if (!spect) return '#e0f2fe';
  const c = spect.trim().charAt(0).toUpperCase();
  switch (c) {
    case 'O': return '#93c5fd'; // Deep blue (> 30,000 K)
    case 'B': return '#bfdbfe'; // Blue-white (10,000 - 30,000 K)
    case 'A': return '#ffffff'; // Pure white (7,500 - 10,000 K, e.g. Sirius, Vega)
    case 'F': return '#fef08a'; // Yellow-white (6,000 - 7,500 K, e.g. Procyon)
    case 'G': return '#fde047'; // Yellow (5,200 - 6,000 K, e.g. Sun, Capella)
    case 'K': return '#fb923c'; // Orange (3,700 - 5,200 K, e.g. Arcturus, Aldebaran)
    case 'M': return '#f87171'; // Red (< 3,700 K, e.g. Betelgeuse, Antares)
    default: return '#bae6fd';
  }
};

/**
 * Calculates visual radius for rendering on canvas/screen based on magnitude
 */
export const getStarVisualRadius = (mag: number): number => {
  // Human eye sees logarithmic brightness: smaller magnitude = brighter & larger star
  // Magnitude ranges roughly from -1.5 (Sirius) to 6.5 (naked-eye limit)
  if (mag <= -1.0) return 4.5;
  if (mag <= 0.0) return 3.8;
  if (mag <= 1.0) return 3.2;
  if (mag <= 2.0) return 2.6;
  if (mag <= 3.0) return 2.1;
  if (mag <= 4.0) return 1.6;
  if (mag <= 5.0) return 1.2;
  return 0.9;
};
