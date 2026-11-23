import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import { Star } from '../../types/celestial';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';

interface CameraControllerProps {
  selectedStar: Star | null;
  onControlsReady?: (controls: OrbitControlsImpl) => void;
  isFocusRequested?: boolean;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  selectedStar,
  onControlsReady,
  isFocusRequested,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetLookAt = useRef<THREE.Vector3 | null>(null);
  const [isInterpolating, setIsInterpolating] = useState<boolean>(false);

  useEffect(() => {
    if (controlsRef.current && onControlsReady) {
      onControlsReady(controlsRef.current);
    }
  }, [onControlsReady]);

  // When a star is selected or focus is explicitly requested, compute new look-at target
  useEffect(() => {
    if (selectedStar && selectedStar.alt !== undefined && selectedStar.az !== undefined) {
      // Calculate star position on the dome
      const [x, y, z] = altAzToVector3(
        selectedStar.alt,
        selectedStar.az,
        DOME_RADIUS * 0.65 // Intermediate distance for balanced perspective
      );
      targetLookAt.current = new THREE.Vector3(x, Math.max(2, y), z);
      setIsInterpolating(true);
    }
  }, [selectedStar, isFocusRequested]);

  // Smooth lerp frame loop
  useFrame((_, delta) => {
    if (!controlsRef.current || !isInterpolating || !targetLookAt.current) return;

    const controls = controlsRef.current;
    
    // Smoothly interpolate look-at target
    controls.target.lerp(targetLookAt.current, delta * 3.5);
    controls.update();

    // Check if target has reached within threshold
    if (controls.target.distanceTo(targetLookAt.current) < 0.15) {
      setIsInterpolating(false);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.06}
      rotateSpeed={0.65}
      zoomSpeed={0.8}
      panSpeed={0.6}
      minDistance={2}
      maxDistance={65}
      maxPolarAngle={Math.PI / 2 + 0.02}
      minPolarAngle={0.05}
      onStart={() => {
        // If user manually starts dragging/orbiting, pause automatic interpolation
        setIsInterpolating(false);
      }}
    />
  );
};
