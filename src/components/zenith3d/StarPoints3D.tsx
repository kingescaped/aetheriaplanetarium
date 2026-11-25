import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Star, CelestialSettings } from '../../types/celestial';
import type { SkyVisualAttenuation } from '../../types/weather';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';
import { getSpectralColor } from '../../utils/astronomy';

interface StarPoints3DProps {
  stars: Star[];
  settings: CelestialSettings;
  selectedStar: Star | null;
  onSelectStar: (star: Star) => void;
  skyAttenuation?: SkyVisualAttenuation;
}

// Vertex shader with GPU-accelerated magnitude cutoff, twinkling, and distance-based size attenuation
const starVertexShader = `
  attribute float size;
  attribute vec3 customColor;
  attribute float mag;
  varying vec3 vColor;
  varying float vMag;
  uniform float uTime;
  uniform float uGlowIntensity;
  uniform float uMagLimit;
  uniform float uMagPenalty;
  uniform float uTwinkleBoost;

  void main() {
    float effectiveMagLimit = max(0.5, uMagLimit - uMagPenalty);
    // GPU Magnitude Filtering & Horizon Clipping (position.y < -43.5 corresponds to alt < -5°)
    if (mag > effectiveMagLimit || position.y < -43.5) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }

    vColor = customColor;
    vMag = mag;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Natural atmospheric scintillation / twinkle effect
    float twinkle = 1.0 + (0.15 * uTwinkleBoost) * sin(uTime * (2.5 * mix(1.0, uTwinkleBoost, 0.45)) + position.x * 0.15 + position.z * 0.15);
    
    // Size attenuation (stable point size without flickering)
    gl_PointSize = size * twinkle * (280.0 / -mvPosition.z) * uGlowIntensity;
    gl_PointSize = clamp(gl_PointSize, 1.0, 48.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader producing soft antialiased circular stellar discs with luminous stellar core
const starFragmentShader = `
  varying vec3 vColor;
  varying float vMag;
  uniform float uStarOpacity;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Smooth Gaussian-like optical falloff
    float alpha = smoothstep(0.5, 0.06, dist);
    
    // Bright white-hot central core for bright stars (mag < 2.0)
    float core = smoothstep(0.18, 0.0, dist) * (vMag < 2.0 ? 0.8 : 0.25);
    
    float magBoost = uStarOpacity < 0.999 && vMag < 1.0 ? 0.12 : 0.0;
    float visibilityScale = uStarOpacity < 0.999 ? clamp(uStarOpacity + magBoost, 0.08, 1.0) : 1.0;

    vec3 finalColor = vColor + vec3(core);
    gl_FragColor = vec4(finalColor, alpha * visibilityScale);
  }
`;

export const StarPoints3D: React.FC<StarPoints3DProps> = ({
  stars,
  settings,
  onSelectStar,
  skyAttenuation,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial>(null);

  const starLookupRef = useRef<Star[]>([]);
  starLookupRef.current = stars;

  // Initialize BufferGeometry ONCE for the entire star catalog (5,200+ stars)
  const initialGeometry = useMemo(() => {
    const count = stars.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const magnitudes = new Float32Array(count);

    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const star = stars[i];
      const alt = star.alt ?? 45;
      const az = star.az ?? 0;
      const [x, y, z] = altAzToVector3(alt, az, DOME_RADIUS);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color from spectral type
      tempColor.set(getSpectralColor(star.spect));
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;

      // Base size in 3D
      let baseSize = 2.4;
      if (star.mag <= -1.0) baseSize = 5.6;
      else if (star.mag <= 0.0) baseSize = 4.8;
      else if (star.mag <= 1.0) baseSize = 4.0;
      else if (star.mag <= 2.0) baseSize = 3.2;
      else if (star.mag <= 3.0) baseSize = 2.6;
      else if (star.mag <= 4.0) baseSize = 2.0;
      else if (star.mag <= 5.0) baseSize = 1.5;
      else baseSize = 1.1;

      sizes[i] = baseSize;
      magnitudes[i] = star.mag;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('mag', new THREE.BufferAttribute(magnitudes, 1));

    return geom;
  }, [stars.length]);

  // Update existing buffer in-place when stars move with time (0 allocation, zero GC)
  useEffect(() => {
    const geom = pointsRef.current?.geometry;
    if (!geom) return;

    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    if (!posAttr || posAttr.count !== stars.length) return;

    const array = posAttr.array as Float32Array;
    const count = stars.length;
    for (let i = 0; i < count; i++) {
      const star = stars[i];
      const alt = star.alt ?? 45;
      const az = star.az ?? 0;
      const [x, y, z] = altAzToVector3(alt, az, DOME_RADIUS);

      array[i * 3] = x;
      array[i * 3 + 1] = y;
      array[i * 3 + 2] = z;
    }

    posAttr.needsUpdate = true;
  }, [stars]);

  // Uniforms for the star shader
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGlowIntensity: { value: settings.starGlowIntensity || 1.2 },
      uMagLimit: { value: settings.magnitudeLimit || 6.5 },
      uStarOpacity: { value: skyAttenuation?.starOpacity ?? 1 },
      uMagPenalty: { value: skyAttenuation?.magPenalty ?? 0 },
      uTwinkleBoost: { value: skyAttenuation?.twinkleBoost ?? 1 },
    }),
    []
  );

  // Sync uniform values on change without rebuilding geometry
  useEffect(() => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uGlowIntensity.value = settings.starGlowIntensity || 1.2;
      shaderMaterialRef.current.uniforms.uMagLimit.value = settings.magnitudeLimit;
      shaderMaterialRef.current.uniforms.uStarOpacity.value = skyAttenuation?.starOpacity ?? 1;
      shaderMaterialRef.current.uniforms.uMagPenalty.value = skyAttenuation?.magPenalty ?? 0;
      shaderMaterialRef.current.uniforms.uTwinkleBoost.value = skyAttenuation?.twinkleBoost ?? 1;
    }
  }, [settings.starGlowIntensity, settings.magnitudeLimit, skyAttenuation]);

  // Update time uniform smoothly for natural twinkling
  useFrame((_, delta) => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <points
      ref={pointsRef}
      geometry={initialGeometry}
      renderOrder={2}
    >
      <shaderMaterial
        ref={shaderMaterialRef}
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
