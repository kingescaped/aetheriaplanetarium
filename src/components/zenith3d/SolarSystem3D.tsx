import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Billboard, Html } from '@react-three/drei';
import type { Star } from '../../types/celestial';
import type { SkyVisualAttenuation } from '../../types/weather';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';

interface SolarSystem3DProps {
  bodies: Star[];
  showLabels: boolean;
  skyAttenuation?: SkyVisualAttenuation;
}

const moonVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const moonFragmentShader = `
  varying vec2 vUv;
  uniform float uPhaseAngle;
  uniform float uOpacity;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r2 = dot(p, p);
    if (r2 > 1.0) discard;

    float halfW = sqrt(max(0.0, 1.0 - p.y * p.y));
    float rad = radians(uPhaseAngle);
    float terminator = cos(rad) * halfW;
    float isWaxing = step(uPhaseAngle, 180.0);

    float litWaxing = smoothstep(terminator - 0.06, terminator + 0.06, p.x);
    float litWaning = 1.0 - smoothstep(-terminator - 0.06, -terminator + 0.06, p.x);
    float lit = mix(litWaning, litWaxing, isWaxing);

    float edge = smoothstep(1.0, 0.9, sqrt(r2));
    vec3 color = mix(vec3(0.09, 0.13, 0.22), vec3(0.95, 0.97, 1.0), lit);
    gl_FragColor = vec4(color, edge * uOpacity);
  }
`;

const MoonBillboard: React.FC<{
  phaseAngle: number;
  opacity: number;
}> = ({ phaseAngle, opacity }) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uPhaseAngle: { value: phaseAngle },
      uOpacity: { value: opacity },
    }),
    []
  );

  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.uniforms.uPhaseAngle.value = phaseAngle;
    matRef.current.uniforms.uOpacity.value = opacity;
  }, [phaseAngle, opacity]);

  return (
    <mesh>
      <planeGeometry args={[2.3, 2.3]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={moonVertexShader}
        fragmentShader={moonFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
};

export const SolarSystem3D: React.FC<SolarSystem3DProps> = ({
  bodies,
  showLabels,
  skyAttenuation,
}) => {
  const baseAlpha = skyAttenuation?.starOpacity ?? 1;

  return (
    <group>
      {bodies.map((body) => {
        if (body.alt === undefined || body.az === undefined || body.alt < -5) {
          return null;
        }
        const meta = body.solarSystemData;
        const kind = meta?.kind ?? 'planet';
        const pos = altAzToVector3(body.alt, body.az, DOME_RADIUS * 0.96);
        const alpha = Math.max(
          kind === 'sun' ? 0.94 : kind === 'moon' ? 0.55 : 0.28,
          baseAlpha
        );
        const discSize = kind === 'sun' ? 1.55 : body.mag < -1 ? 0.72 : 0.52;
        const color = body.color || '#fef08a';

        return (
          <group key={body.id} position={pos}>
            <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
              {kind === 'moon' ? (
                <MoonBillboard
                  phaseAngle={meta?.moonPhaseAngle ?? 180}
                  opacity={alpha}
                />
              ) : (
                <>
                  <mesh>
                    <circleGeometry args={[discSize * 2.2, 24]} />
                    <meshBasicMaterial
                      color={color}
                      transparent={true}
                      opacity={alpha * 0.22}
                      blending={THREE.AdditiveBlending}
                      depthWrite={false}
                    />
                  </mesh>
                  <mesh>
                    <circleGeometry args={[discSize, 24]} />
                    <meshBasicMaterial
                      color={color}
                      transparent={true}
                      opacity={alpha}
                      depthWrite={false}
                    />
                  </mesh>
                  {meta?.bodyId === 'saturn' && (
                    <mesh rotation={[0.45, 0.15, -0.35]}>
                      <ringGeometry args={[discSize * 1.45, discSize * 2.35, 36]} />
                      <meshBasicMaterial
                        color="#fde047"
                        transparent={true}
                        opacity={alpha * 0.85}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                      />
                    </mesh>
                  )}
                </>
              )}

              {showLabels && body.name && (
                <Html
                  position={[0, kind === 'sun' || kind === 'moon' ? -1.65 : -1.05, 0]}
                  center
                  zIndexRange={[10, 0]}
                  className="pointer-events-none select-none"
                >
                  <div className="px-1.5 py-0.5 rounded-md bg-slate-950/80 border border-white/15 text-[10px] font-sans font-semibold whitespace-nowrap shadow-md" style={{ color }}>
                    {body.name}
                  </div>
                </Html>
              )}
            </Billboard>
          </group>
        );
      })}
    </group>
  );
};
