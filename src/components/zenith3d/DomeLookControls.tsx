import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { Star } from '../../types/celestial';
import { degToRad } from '../../utils/astronomy';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';

interface DomeLookControlsProps {
  selectedStar: Star | null;
  targetAzimuth?: number | null;
  isZenithRequested?: boolean;
  isFocusRequested?: boolean;
  isGyroEnabled?: boolean;
  gyroQuaternion?: THREE.Quaternion | null;
  onManualDrag?: () => void;
  stars?: Star[];
  solarBodies?: Star[];
  deepSkyBodies?: Star[];
  satelliteBodies?: Star[];
  magnitudeLimit?: number;
  onSelectStar?: (star: Star) => void;
  recenterTrigger?: number;
  onHeadingChange?: (heading: { az: number; alt: number }) => void;
}

export const DomeLookControls: React.FC<DomeLookControlsProps> = ({
  selectedStar,
  targetAzimuth,
  isZenithRequested,
  isFocusRequested,
  isGyroEnabled = false,
  gyroQuaternion = null,
  onManualDrag,
  stars,
  solarBodies,
  deepSkyBodies,
  satelliteBodies,
  magnitudeLimit = 6.5,
  onSelectStar,
  recenterTrigger = 0,
  onHeadingChange,
}) => {
  const { camera, gl } = useThree();
  const starsRef = useRef<Star[] | undefined>(stars);
  const solarBodiesRef = useRef<Star[] | undefined>(solarBodies);
  const deepSkyBodiesRef = useRef<Star[] | undefined>(deepSkyBodies);
  const satelliteBodiesRef = useRef<Star[] | undefined>(satelliteBodies);
  const magLimitRef = useRef<number>(magnitudeLimit);
  const onSelectStarRef = useRef<((star: Star) => void) | undefined>(onSelectStar);
  starsRef.current = stars;
  solarBodiesRef.current = solarBodies;
  deepSkyBodiesRef.current = deepSkyBodies;
  satelliteBodiesRef.current = satelliteBodies;
  magLimitRef.current = magnitudeLimit;
  onSelectStarRef.current = onSelectStar;

  // Current and target spherical angles (in radians)
  const currentYaw = useRef<number>(0);
  const targetYaw = useRef<number>(0);

  // Pitch: 0 = Horizon level, PI/2 = Straight up at Zenith (90°)
  const currentPitch = useRef<number>(degToRad(25));
  const targetPitch = useRef<number>(degToRad(25));

  // Manual drag offset relative to device orientation during AR mode (never locks camera)
  const manualOffsetYaw = useRef<number>(0);
  const manualOffsetPitch = useRef<number>(0);
  const targetOffsetYaw = useRef<number>(0);
  const targetOffsetPitch = useRef<number>(0);

  // Reset manual drag offset when recenterTrigger fires or when gyro is freshly enabled
  useEffect(() => {
    manualOffsetYaw.current = 0;
    manualOffsetPitch.current = 0;
    targetOffsetYaw.current = 0;
    targetOffsetPitch.current = 0;
  }, [recenterTrigger, isGyroEnabled]);

  // Touch and pointer interaction state
  const isDragging = useRef<boolean>(false);
  const previousPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerDownTime = useRef<number>(0);
  
  // Pinch-to-zoom multi-touch tracking
  const previousPinchDist = useRef<number | null>(null);

  const observerHeight = 1.6;

  // 1. Initial setup
  useEffect(() => {
    camera.position.set(0, observerHeight, 0);
  }, [camera]);

  // 2. Handle Selected Star Target Tracking
  useEffect(() => {
    if (selectedStar && selectedStar.alt !== undefined && selectedStar.az !== undefined) {
      const newTargetYaw = degToRad(selectedStar.az);
      let diff = (newTargetYaw - (targetYaw.current % (Math.PI * 2)));
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      targetYaw.current = targetYaw.current + diff;
      targetPitch.current = Math.max(-0.15, Math.min(Math.PI / 2, degToRad(selectedStar.alt)));
    }
  }, [selectedStar?.id, isFocusRequested]);

  // 3. Handle Cardinal Direction Jump
  useEffect(() => {
    if (targetAzimuth !== undefined && targetAzimuth !== null) {
      const newTargetYaw = degToRad(targetAzimuth);
      let diff = (newTargetYaw - (targetYaw.current % (Math.PI * 2)));
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      targetYaw.current = targetYaw.current + diff;
      targetPitch.current = degToRad(20);
    }
  }, [targetAzimuth]);

  // 4. Handle Zenith Request
  useEffect(() => {
    if (isZenithRequested) {
      targetPitch.current = Math.PI / 2 - 0.001;
    }
  }, [isZenithRequested]);

  // 5. Native Pointer & Multi-Touch Gestures (1-finger rotate, 2-finger pinch zoom)
  useEffect(() => {
    const domElement = gl.domElement;

    // Mouse / Pointer Down
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isDragging.current = true;
      previousPointer.current = { x: e.clientX, y: e.clientY };
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
      pointerDownTime.current = performance.now();
      if (isGyroEnabled && onManualDrag) {
        onManualDrag();
      }
      try {
        domElement.setPointerCapture(e.pointerId);
      } catch {}
    };

    // Mouse / Pointer Move
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - previousPointer.current.x;
      const deltaY = e.clientY - previousPointer.current.y;
      previousPointer.current = { x: e.clientX, y: e.clientY };

      const sensitivity = 0.0035;

      if (isGyroEnabled) {
        // Allow free dragging during AR Tracker mode (never locks camera!)
        targetOffsetYaw.current -= deltaX * sensitivity;
        const maxPitch = Math.PI * 0.48;
        targetOffsetPitch.current = Math.max(-maxPitch, Math.min(maxPitch, targetOffsetPitch.current + deltaY * sensitivity));
      } else {
        targetYaw.current -= deltaX * sensitivity;
        const maxPitch = Math.PI / 2 - 0.0001;
        const minPitch = -0.15;
        targetPitch.current = Math.max(minPitch, Math.min(maxPitch, targetPitch.current + deltaY * sensitivity));
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      isDragging.current = false;
      try {
        domElement.releasePointerCapture(e.pointerId);
      } catch {}

      // Precision Star Selection on Click / Tap (< 9px movement, < 500ms duration)
      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      const dist = Math.hypot(dx, dy);
      const duration = performance.now() - pointerDownTime.current;

      if (dist < 9 && duration < 500 && onSelectStarRef.current) {
        const rect = domElement.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        const rayDir = raycaster.ray.direction.clone().normalize();

        let closestStar: Star | null = null;
        let minAngularDist = Infinity;
        const starVec = new THREE.Vector3();

        const currentSats = satelliteBodiesRef.current ?? [];
        for (let i = 0; i < currentSats.length; i++) {
          const s = currentSats[i];
          if (s.alt !== undefined && s.alt < -2) continue;
          const [sx, sy, sz] = altAzToVector3(s.alt ?? 45, s.az ?? 0, DOME_RADIUS);
          starVec.set(sx - camera.position.x, sy - camera.position.y, sz - camera.position.z).normalize();
          const angle = Math.acos(Math.max(-1, Math.min(1, rayDir.dot(starVec))));
          if (angle < 0.095 && angle < minAngularDist) {
            minAngularDist = angle;
            closestStar = s;
          }
        }

        const currentSolar = solarBodiesRef.current ?? [];
        for (let i = 0; i < currentSolar.length; i++) {
          const s = currentSolar[i];
          if (s.alt !== undefined && s.alt < -5) continue;
          const [sx, sy, sz] = altAzToVector3(s.alt ?? 45, s.az ?? 0, DOME_RADIUS);
          starVec.set(sx - camera.position.x, sy - camera.position.y, sz - camera.position.z).normalize();
          const angle = Math.acos(Math.max(-1, Math.min(1, rayDir.dot(starVec))));
          if (angle < 0.095 && angle < minAngularDist) {
            minAngularDist = angle;
            closestStar = s;
          }
        }

        if (!closestStar && deepSkyBodiesRef.current && deepSkyBodiesRef.current.length > 0) {
          const currentDso = deepSkyBodiesRef.current;
          for (let i = 0; i < currentDso.length; i++) {
            const s = currentDso[i];
            if (s.alt !== undefined && s.alt < -2) continue;
            const [sx, sy, sz] = altAzToVector3(s.alt ?? 45, s.az ?? 0, DOME_RADIUS);
            starVec.set(sx - camera.position.x, sy - camera.position.y, sz - camera.position.z).normalize();
            const angle = Math.acos(Math.max(-1, Math.min(1, rayDir.dot(starVec))));
            if (angle < 0.075 && angle < minAngularDist) {
              minAngularDist = angle;
              closestStar = s;
            }
          }
        }

        if (!closestStar && starsRef.current && starsRef.current.length > 0) {
          const maxHitAngle = 0.06;
          const magLimit = magLimitRef.current ?? 6.5;
          const currentStars = starsRef.current;

          for (let i = 0; i < currentStars.length; i++) {
            const s = currentStars[i];
            if (s.mag > magLimit) continue;
            if (s.alt !== undefined && s.alt < -5) continue;

            const [sx, sy, sz] = altAzToVector3(s.alt ?? 45, s.az ?? 0, DOME_RADIUS);
            starVec.set(sx - camera.position.x, sy - camera.position.y, sz - camera.position.z).normalize();

            const dot = rayDir.dot(starVec);
            const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

            if (angle < maxHitAngle && angle < minAngularDist) {
              minAngularDist = angle;
              closestStar = s;
            }
          }
        }

        if (closestStar) {
          onSelectStarRef.current(closestStar);
        }
      }
    };

    // Touch Event Handlers for 2-finger Pinch-to-Zoom on Mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Initialize pinch distance
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        previousPinchDist.current = Math.hypot(dx, dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && previousPinchDist.current !== null) {
        e.preventDefault(); // Prevent native mobile browser zoom

        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const distDelta = currentDist - previousPinchDist.current;

        previousPinchDist.current = currentDist;

        const persCam = camera as THREE.PerspectiveCamera;
        if (persCam.isPerspectiveCamera) {
          // Pinching in decreases FOV (zooms in), pinching out increases FOV
          const fovChange = -distDelta * 0.12;
          persCam.fov = THREE.MathUtils.clamp(persCam.fov + fovChange, 28, 85);
          persCam.updateProjectionMatrix();
        }
      }
    };

    const handleTouchEnd = () => {
      previousPinchDist.current = null;
    };

    // Mouse wheel for optical FOV zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const persCam = camera as THREE.PerspectiveCamera;
      if (persCam.isPerspectiveCamera) {
        const delta = e.deltaY * 0.05;
        persCam.fov = THREE.MathUtils.clamp(persCam.fov + delta, 28, 85);
        persCam.updateProjectionMatrix();
      }
    };

    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerup', handlePointerUp);
    domElement.addEventListener('pointercancel', handlePointerUp);

    domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    domElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    domElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerup', handlePointerUp);
      domElement.removeEventListener('pointercancel', handlePointerUp);

      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('wheel', handleWheel);
    };
  }, [gl, camera]);

  // 6. Smooth Damped Frame Loop
  useFrame((_, delta) => {
    camera.position.set(0, observerHeight, 0);

    if (isGyroEnabled && gyroQuaternion) {
      // Smoothly interpolate manual offset
      const offsetDamping = Math.min(1.0, delta * 14.0);
      manualOffsetYaw.current += (targetOffsetYaw.current - manualOffsetYaw.current) * offsetDamping;
      manualOffsetPitch.current += (targetOffsetPitch.current - manualOffsetPitch.current) * offsetDamping;

      const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), manualOffsetYaw.current);
      const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), manualOffsetPitch.current);

      // Combine: World Yaw * Device Gyroscope * Local Pitch
      const combinedQuat = qYaw.clone().multiply(gyroQuaternion).multiply(qPitch);

      // Smoothly slerp to avoid noisy sensor jitter (12.0 provides responsive, silky motion)
      const damping = Math.min(1.0, delta * 12.0);
      camera.quaternion.slerp(combinedQuat, damping);

      // Calculate actual camera forward direction
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const camPitch = Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1));
      let camYaw = Math.atan2(forward.x, -forward.z);
      if (camYaw < 0) camYaw += Math.PI * 2;

      // Keep targetYaw and targetPitch synchronized for smooth handoff if AR is toggled off
      targetPitch.current = camPitch;
      targetYaw.current = camYaw;
      currentPitch.current = camPitch;
      currentYaw.current = camYaw;

      if (onHeadingChange) {
        onHeadingChange({
          az: THREE.MathUtils.radToDeg(camYaw),
          alt: THREE.MathUtils.radToDeg(camPitch),
        });
      }
      return;
    }

    const damping = Math.min(1.0, delta * 8.0);

    currentYaw.current += (targetYaw.current - currentYaw.current) * damping;
    currentPitch.current += (targetPitch.current - currentPitch.current) * damping;

    const cosPitch = Math.cos(currentPitch.current);
    const sinPitch = Math.sin(currentPitch.current);

    const dirX = cosPitch * Math.sin(currentYaw.current);
    const dirY = sinPitch;
    const dirZ = -cosPitch * Math.cos(currentYaw.current);

    const targetPos = new THREE.Vector3(
      camera.position.x + dirX * 50,
      camera.position.y + dirY * 50,
      camera.position.z + dirZ * 50
    );

    camera.lookAt(targetPos);

    if (onHeadingChange) {
      let az = THREE.MathUtils.radToDeg(currentYaw.current) % 360;
      if (az < 0) az += 360;
      onHeadingChange({
        az,
        alt: THREE.MathUtils.radToDeg(currentPitch.current),
      });
    }
  });

  return null;
};
