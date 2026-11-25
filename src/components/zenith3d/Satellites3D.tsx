import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Billboard, Html, Line } from '@react-three/drei';
import type { Star } from '../../types/celestial';
import type { SkyVisualAttenuation } from '../../types/weather';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';

interface Satellites3DProps {
  bodies: Star[];
  showLabels: boolean;
  skyAttenuation?: SkyVisualAttenuation;
}

const SAT_RADIUS = DOME_RADIUS * 0.965;

export const Satellites3D: React.FC<Satellites3DProps> = ({
  bodies,
  showLabels,
  skyAttenuation,
}) => {
  const baseAlpha = Math.max(0.6, skyAttenuation?.starOpacity ?? 1);

  const renderedSatellites = useMemo(() => {
    return bodies.map((sat) => {
      const meta = sat.satelliteData;
      const trackSegments: [number, number, number][][] = [];

      if (meta) {
        let seg: [number, number, number][] = [];
        for (const pt of meta.track) {
          if (pt.alt < -2) {
            if (seg.length >= 2) trackSegments.push(seg);
            seg = [];
            continue;
          }
          seg.push(altAzToVector3(pt.alt, pt.az, SAT_RADIUS));
        }
        if (seg.length >= 2) trackSegments.push(seg);
      }

      const alt = sat.alt ?? -90;
      const az = sat.az ?? 0;
      const visible = alt >= -2;
      const pos = visible ? altAzToVector3(alt, az, SAT_RADIUS) : null;

      return {
        sat,
        meta,
        trackSegments,
        visible,
        pos,
        color: sat.color || '#34d399',
      };
    });
  }, [bodies]);

  return (
    <group>
      {renderedSatellites.map((entry) => (
        <group key={entry.sat.id}>
          {entry.trackSegments.map((pts, idx) => (
            <Line
              key={`${entry.sat.id}-track-${idx}`}
              points={pts}
              color={entry.color}
              lineWidth={1.35}
              dashed
              dashSize={1.1}
              gapSize={0.85}
              transparent
              opacity={0.55 * baseAlpha}
            />
          ))}

          {entry.visible && entry.pos && entry.meta && (
            <group position={entry.pos}>
              <Billboard follow={true}>
                <mesh>
                  <circleGeometry args={[1.65, 24]} />
                  <meshBasicMaterial
                    color={entry.color}
                    transparent={true}
                    opacity={0.22 * baseAlpha}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>

                <mesh rotation={[0, 0, Math.PI / 8]}>
                  <planeGeometry args={[2.1, 0.24]} />
                  <meshBasicMaterial
                    color={entry.color}
                    transparent={true}
                    opacity={0.9 * baseAlpha}
                    depthWrite={false}
                  />
                </mesh>

                <mesh>
                  <circleGeometry args={[0.42, 16]} />
                  <meshBasicMaterial
                    color={entry.meta.isSunlit ? '#f8fafc' : '#94a3b8'}
                    transparent={true}
                    opacity={baseAlpha}
                    depthWrite={false}
                  />
                </mesh>

                {showLabels && entry.sat.name && (
                  <Html
                    position={[0, -1.35, 0]}
                    center
                    zIndexRange={[10, 0]}
                    className="pointer-events-none select-none"
                  >
                    <div
                      className="px-1.5 py-0.5 rounded-md bg-slate-950/85 border text-[10px] font-mono font-semibold whitespace-nowrap shadow-md"
                      style={{ color: entry.color, borderColor: `${entry.color}55` }}
                    >
                      {entry.sat.name}
                    </div>
                  </Html>
                )}
              </Billboard>
            </group>
          )}
        </group>
      ))}
    </group>
  );
};
