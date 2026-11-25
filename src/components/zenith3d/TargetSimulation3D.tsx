import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import { Star } from '../../types/celestial';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';
import { getSpectralColor } from '../../utils/astronomy';
import { Language, TRANSLATIONS } from '../../utils/i18n';

interface TargetSimulation3DProps {
  selectedStar: Star | null;
  showLabel?: boolean;
  lang?: Language;
}

// Delicate calibrated 4-point cross diffraction starburst flare shader
const diffractionFlareShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv - vec2(0.5);
      float dist = length(uv);

      // Thin needle diffraction spikes (horizontal & vertical)
      float spike1 = exp(-abs(uv.y) * 45.0) * exp(-abs(uv.x) * 4.5);
      float spike2 = exp(-abs(uv.x) * 45.0) * exp(-abs(uv.y) * 4.5);
      
      // Secondary diagonal cross spikes
      vec2 diag1 = vec2(uv.x + uv.y, uv.x - uv.y) * 0.7071;
      float diagSpike = (exp(-abs(diag1.y) * 75.0) * exp(-abs(diag1.x) * 7.0) +
                         exp(-abs(diag1.x) * 75.0) * exp(-abs(diag1.y) * 7.0)) * 0.35;

      // Soft radiant corona
      float corona = exp(-dist * 10.0) * 1.2;
      
      // Bright white-hot central core
      float core = exp(-dist * 28.0) * 2.2;

      // Atmospheric twinkle pulse
      float pulse = 0.92 + 0.16 * sin(uTime * 3.5);
      float total = (spike1 + spike2 + diagSpike + corona + core) * uIntensity * pulse;

      // Color tinting: core is white-hot, outer flare is colored by stellar spectrum
      vec3 finalColor = mix(uColor, vec3(1.0, 1.0, 1.0), clamp(core * 0.85, 0.0, 1.0));

      gl_FragColor = vec4(finalColor * total, clamp(total, 0.0, 1.0));
    }
  `,
};

export const TargetSimulation3D: React.FC<TargetSimulation3DProps> = ({
  selectedStar,
  showLabel = true,
  lang = 'vi',
}) => {
  const flareRef = useRef<THREE.ShaderMaterial>(null);
  const outerReticleRef = useRef<THREE.Group>(null);
  const innerRingRef = useRef<THREE.Group>(null);
  const beaconWaveRef = useRef<THREE.Mesh>(null);
  const beaconTimer = useRef<number>(0);

  // Position of target star in 3D dome space
  const starPosition = useMemo(() => {
    if (!selectedStar || selectedStar.alt === undefined || selectedStar.az === undefined) {
      return null;
    }
    const [x, y, z] = altAzToVector3(selectedStar.alt, selectedStar.az, DOME_RADIUS * 0.99);
    return new THREE.Vector3(x, y, z);
  }, [selectedStar?.alt, selectedStar?.az]);

  // Star color from astrophysical spectral type
  const starColor = useMemo(() => {
    return new THREE.Color(getSpectralColor(selectedStar?.spect || 'A'));
  }, [selectedStar?.spect]);

  // Flare size scaled gracefully based on magnitude
  const flareSize = useMemo(() => {
    if (!selectedStar) return 3.2;
    const mag = selectedStar.mag;
    if (mag <= -1.0) return 4.6;
    if (mag <= 0.5) return 3.8;
    if (mag <= 2.0) return 3.0;
    if (mag <= 4.0) return 2.4;
    return 1.8;
  }, [selectedStar?.mag]);

  // Animate reticle rotation, inner gyro ring, and beacon pulse
  useFrame((_, delta) => {
    // 1. Flare twinkle
    if (flareRef.current) {
      flareRef.current.uniforms.uTime.value += delta;
    }

    // 2. Outer tactical reticle: slow clockwise rotation
    if (outerReticleRef.current) {
      outerReticleRef.current.rotation.z += delta * 0.45;
    }

    // 3. Inner gyro ring: counter-clockwise rotation with gentle breathing pulse
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= delta * 0.75;
      const breathing = 1.0 + 0.05 * Math.sin(performance.now() * 0.003);
      innerRingRef.current.scale.set(breathing, breathing, 1);
    }

    // 4. Expanding beacon radar wave (cycles every 1.8 seconds)
    if (beaconWaveRef.current) {
      beaconTimer.current = (beaconTimer.current + delta * 0.55) % 1.0;
      const progress = beaconTimer.current;
      const waveScale = 1.0 + progress * 3.8;
      beaconWaveRef.current.scale.set(waveScale, waveScale, 1);
      const alpha = Math.pow(1.0 - progress, 1.8) * 0.85;
      const mat = beaconWaveRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = alpha;
      }
    }
  });

  if (!selectedStar || !starPosition) return null;

  return (
    <group position={starPosition}>
      {/* Billboard ensures all 3D reticle elements always face the camera directly */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {/* 1. Concentric Expanding Radar Beacon Wave (Radar Ping Effect) */}
        <mesh ref={beaconWaveRef}>
          <ringGeometry args={[0.9, 0.98, 48]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent={true}
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 2. Refined Optical Starburst Flare (Non-blinding, Proportional) */}
        <mesh>
          <planeGeometry args={[flareSize, flareSize]} />
          <shaderMaterial
            ref={flareRef}
            vertexShader={diffractionFlareShader.vertexShader}
            fragmentShader={diffractionFlareShader.fragmentShader}
            uniforms={{
              uColor: { value: starColor },
              uIntensity: { value: 1.6 },
              uTime: { value: 0 },
            }}
            transparent={true}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* 3. Outer Tactical Reticle Group (Clockwise rotation) */}
        <group ref={outerReticleRef}>
          {/* Outer circle */}
          <mesh>
            <ringGeometry args={[2.0, 2.08, 48]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent={true}
              opacity={0.7}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* 4 Cardinal crosshair ticks pointing inward */}
          {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle, idx) => (
            <mesh key={`cardinal-${idx}`} rotation={[0, 0, angle]} position={[0, 0, 0]}>
              <planeGeometry args={[0.07, 0.45]} />
              <meshBasicMaterial
                color="#38bdf8"
                transparent={true}
                opacity={0.85}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>

        {/* 4. Inner Gyroscopic Dashed Ring (Counter-clockwise rotation + pulse) */}
        <group ref={innerRingRef}>
          <mesh>
            <ringGeometry args={[1.35, 1.42, 20]} />
            <meshBasicMaterial
              color="#c084fc"
              transparent={true}
              opacity={0.75}
              blending={THREE.AdditiveBlending}
              wireframe={true}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* 5. 4 Viewfinder Corner Framing Brackets [  ] */}
        {[
          { pos: [1.7, 1.7, 0], rot: [0, 0, 0] },
          { pos: [-1.7, 1.7, 0], rot: [0, 0, Math.PI / 2] },
          { pos: [-1.7, -1.7, 0], rot: [0, 0, Math.PI] },
          { pos: [1.7, -1.7, 0], rot: [0, 0, -Math.PI / 2] },
        ].map((bracket, idx) => (
          <group key={`corner-bracket-${idx}`} position={bracket.pos as any} rotation={bracket.rot as any}>
            {/* Horizontal line */}
            <mesh position={[-0.18, 0, 0]}>
              <planeGeometry args={[0.36, 0.06]} />
              <meshBasicMaterial
                color="#38bdf8"
                transparent={true}
                opacity={0.9}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            {/* Vertical line */}
            <mesh position={[0, -0.18, 0]}>
              <planeGeometry args={[0.06, 0.36]} />
              <meshBasicMaterial
                color="#38bdf8"
                transparent={true}
                opacity={0.9}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}

        {/* 6. Floating 3D Telemetry HUD Label Tag */}
        {showLabel && (
          <Html
            position={[2.4, 1.6, 0]}
            distanceFactor={24}
            zIndexRange={[10, 0]}
            className="pointer-events-none select-none"
          >
            <div className="flex flex-col items-start gap-1 p-2.5 rounded-2xl glass-panel bg-slate-950/90 border border-cyan-400/50 shadow-glow-cyan backdrop-blur-xl min-w-[150px] animate-fade-in font-sans">
              <div className="flex items-center justify-between w-full gap-2">
                <span className="text-[12px] font-bold text-white tracking-wide truncate max-w-[110px]">
                  {selectedStar.name || `Star #${selectedStar.id}`}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  {selectedStar.spect || 'A0'}
                </span>
              </div>

              {selectedStar.properName && selectedStar.properName !== selectedStar.name && (
                <span className="text-[10px] text-cyan-300/80 font-mono italic truncate max-w-[140px]">
                  {selectedStar.properName}
                </span>
              )}

              <div className="text-[9px] text-slate-300 font-mono flex items-center gap-1.5 pt-1 border-t border-white/10 w-full">
                <span>Mag: <strong className="text-white">{selectedStar.mag}</strong></span>
                <span>•</span>
                <span>Alt: <strong className="text-cyan-400">{Math.round(selectedStar.alt ?? 0)}°</strong></span>
                <span>•</span>
                <span>Az: <strong className="text-cyan-400">{Math.round(selectedStar.az ?? 0)}°</strong></span>
              </div>
            </div>
          </Html>
        )}
      </Billboard>
    </group>
  );
};
