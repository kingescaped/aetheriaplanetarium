import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

export interface DeviceOrientationData {
  alpha: number | null; // Rotation around Z axis (0 to 360 deg)
  beta: number | null;  // Rotation around X axis (-180 to 180 deg)
  gamma: number | null; // Rotation around Y axis (-90 to 90 deg)
  absolute: boolean;
  compassHeading: number | null; // iOS webkitCompassHeading if available
}

export interface UseDeviceOrientationResult {
  isSupported: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported';
  isEnabled: boolean;
  hasSensorData: boolean;
  orientationData: DeviceOrientationData;
  quaternion: THREE.Quaternion;
  currentHeading: { az: number; alt: number };
  requestPermissionAndEnable: () => Promise<boolean>;
  toggleEnabled: () => Promise<boolean>;
  disable: () => void;
  isSimulated: boolean;
  toggleSimulation: () => void;
  errorMessage: string | null;
}

const zee = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X

/**
 * Computes camera quaternion from device orientation angles.
 * Uses standard Three.js DeviceOrientationControls mathematical projection.
 */
export function computeDeviceQuaternion(
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenOrientDeg: number = 0
): THREE.Quaternion {
  const alpha = THREE.MathUtils.degToRad(alphaDeg);
  const beta = THREE.MathUtils.degToRad(betaDeg);
  const gamma = THREE.MathUtils.degToRad(gammaDeg);
  const orient = THREE.MathUtils.degToRad(screenOrientDeg);

  // 'YXZ' rotation order for world-space coordinates
  euler.set(beta, alpha, -gamma, 'YXZ');

  const quat = new THREE.Quaternion().setFromEuler(euler);
  quat.multiply(q1); // Camera faces out the back of the device
  quat.multiply(q0.setFromAxisAngle(zee, -orient)); // Screen rotation compensation

  return quat;
}

/**
 * Extracts horizontal Azimuth (0° = N, 90° = E, 180° = S, 270° = W)
 * and Altitude (-90° to +90° Zenith) from a camera orientation quaternion.
 */
export function getAzAltFromQuaternion(quat: THREE.Quaternion): { az: number; alt: number } {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
  const altRad = Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1));
  let azRad = Math.atan2(forward.x, -forward.z);
  if (azRad < 0) azRad += Math.PI * 2;

  return {
    alt: THREE.MathUtils.radToDeg(altRad),
    az: THREE.MathUtils.radToDeg(azRad),
  };
}

export function useDeviceOrientation(): UseDeviceOrientationResult {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [hasSensorData, setHasSensorData] = useState<boolean>(false);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [orientationData, setOrientationData] = useState<DeviceOrientationData>({
    alpha: null,
    beta: null,
    gamma: null,
    absolute: false,
    compassHeading: null,
  });

  const quaternionRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const [currentHeading, setCurrentHeading] = useState<{ az: number; alt: number }>({ az: 0, alt: 25 });

  // 1. Initial support check
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasOrientationEvent = 'DeviceOrientationEvent' in window;
    setIsSupported(hasOrientationEvent);

    if (!hasOrientationEvent) {
      setPermissionState('unsupported');
      return;
    }

    // Check if iOS permission function exists
    const doe = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof doe.requestPermission === 'function') {
      setPermissionState('prompt');
    } else {
      // Android / Desktop default
      setPermissionState('granted');
    }
  }, []);

  // 2. Request permission (Mandatory user gesture for iOS 13+)
  const requestPermissionAndEnable = useCallback(async (): Promise<boolean> => {
    setErrorMessage(null);

    if (typeof window === 'undefined') return false;

    const doe = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof doe.requestPermission === 'function') {
      try {
        const response = await doe.requestPermission();
        if (response === 'granted') {
          setPermissionState('granted');
          setIsEnabled(true);
          return true;
        } else {
          setPermissionState('denied');
          setErrorMessage('Permission to access device orientation was denied.');
          return false;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        setPermissionState('denied');
        return false;
      }
    }

    // Non-iOS: already granted
    setPermissionState('granted');
    setIsEnabled(true);
    return true;
  }, []);

  const disable = useCallback(() => {
    setIsEnabled(false);
    setIsSimulated(false);
  }, []);

  const toggleEnabled = useCallback(async (): Promise<boolean> => {
    if (isEnabled) {
      disable();
      return false;
    }
    return await requestPermissionAndEnable();
  }, [isEnabled, disable, requestPermissionAndEnable]);

  const toggleSimulation = useCallback(() => {
    setIsSimulated((prev) => {
      const next = !prev;
      if (next) {
        setIsEnabled(true);
      }
      return next;
    });
  }, []);

  // 3. Listen to device orientation events when enabled
  useEffect(() => {
    if (!isEnabled || isSimulated || typeof window === 'undefined') return;

    let receivedAnyData = false;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      let alpha = event.alpha;
      const beta = event.beta;
      const gamma = event.gamma;

      if (alpha === null && beta === null && gamma === null) {
        return;
      }

      if (!receivedAnyData) {
        receivedAnyData = true;
        setHasSensorData(true);
      }

      // Check iOS compass heading
      const iosEvent = event as unknown as { webkitCompassHeading?: number };
      const compassHeading = iosEvent.webkitCompassHeading !== undefined ? iosEvent.webkitCompassHeading : null;

      // On iOS, webkitCompassHeading is absolute true north heading (clockwise: 0=N, 90=E, 180=S, 270=W)
      // Convert to counter-clockwise alpha angle:
      if (compassHeading !== null && compassHeading !== undefined) {
        alpha = (360 - compassHeading) % 360;
      }

      const effectiveAlpha = alpha ?? 0;
      const effectiveBeta = beta ?? 0;
      const effectiveGamma = gamma ?? 0;

      // Get screen orientation
      const screenAngle = 
        (window.screen?.orientation?.angle) ?? 
        ((window as unknown as { orientation?: number }).orientation as number) ?? 
        0;

      const newQuat = computeDeviceQuaternion(effectiveAlpha, effectiveBeta, effectiveGamma, screenAngle);
      quaternionRef.current.copy(newQuat);

      const heading = getAzAltFromQuaternion(newQuat);
      setCurrentHeading(heading);

      setOrientationData({
        alpha: effectiveAlpha,
        beta: effectiveBeta,
        gamma: effectiveGamma,
        absolute: event.absolute || compassHeading !== null,
        compassHeading,
      });
    };

    // Prefer deviceorientationabsolute on Android Chrome for True North
    const win = window as any;
    if ('ondeviceorientationabsolute' in win) {
      win.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else {
      win.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if ('ondeviceorientationabsolute' in win) {
        win.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      }
      win.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isEnabled, isSimulated]);

  // 4. Desktop Simulation loop (for testing / development without mobile sensors)
  useEffect(() => {
    if (!isEnabled || !isSimulated) return;

    let animId: number;
    let startTime = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      // Gently sweep azimuth 0 to 360 deg, and pitch between 15° and 60°
      const simAz = (elapsed * 12) % 360;
      const simAlt = 30 + Math.sin(elapsed * 0.5) * 20;

      const quat = computeDeviceQuaternion(360 - simAz, 90 - simAlt, 0, 0);
      quaternionRef.current.copy(quat);
      setCurrentHeading({ az: simAz, alt: simAlt });

      setOrientationData({
        alpha: 360 - simAz,
        beta: 90 - simAlt,
        gamma: 0,
        absolute: true,
        compassHeading: simAz,
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isEnabled, isSimulated]);

  return {
    isSupported,
    permissionState,
    isEnabled,
    hasSensorData,
    orientationData,
    quaternion: quaternionRef.current,
    currentHeading,
    requestPermissionAndEnable,
    toggleEnabled,
    disable,
    isSimulated,
    toggleSimulation,
    errorMessage,
  };
}
