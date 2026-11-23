import { degToRad } from './astronomy';

export const DOME_RADIUS = 75;

/**
 * Converts Local Horizontal Coordinates (Altitude, Azimuth) to 3D Cartesian (X, Y, Z)
 * on a celestial hemisphere dome of given radius.
 * 
 * Orientation convention:
 * - Zenith (Alt = 90°): +Y axis
 * - Horizon North (Alt = 0°, Az = 0°): -Z axis
 * - Horizon East  (Alt = 0°, Az = 90°): +X axis
 * - Horizon South (Alt = 0°, Az = 180°): +Z axis
 * - Horizon West  (Alt = 0°, Az = 270°): -X axis
 */
export const altAzToVector3 = (
  altDeg: number,
  azDeg: number,
  radius: number = DOME_RADIUS
): [number, number, number] => {
  const altRad = degToRad(altDeg);
  const azRad = degToRad(azDeg);

  const x = radius * Math.cos(altRad) * Math.sin(azRad);
  const y = radius * Math.sin(altRad);
  const z = -radius * Math.cos(altRad) * Math.cos(azRad);

  return [x, y, z];
};
