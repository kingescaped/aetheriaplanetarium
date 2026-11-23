import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { DOME_RADIUS } from '../../utils/coordinates3D';
import { degToRad } from '../../utils/astronomy';

interface GroundHorizon3DProps {
  showGround: boolean;
  showGrid: boolean;
}

export const GroundHorizon3D: React.FC<GroundHorizon3DProps> = ({
  showGround,
  showGrid,
}) => {
  // Cardinal points along the horizon perimeter (Alt = 0°)
  const cardinalMarkers = useMemo(() => {
    return [
      { label: 'NORTH', short: 'N', az: 0, color: '#38bdf8' },
      { label: 'N-E', short: 'NE', az: 45, color: '#94a3b8' },
      { label: 'EAST', short: 'E', az: 90, color: '#38bdf8' },
      { label: 'S-E', short: 'SE', az: 135, color: '#94a3b8' },
      { label: 'SOUTH', short: 'S', az: 180, color: '#38bdf8' },
      { label: 'S-W', short: 'SW', az: 225, color: '#94a3b8' },
      { label: 'WEST', short: 'W', az: 270, color: '#38bdf8' },
      { label: 'N-W', short: 'NW', az: 315, color: '#94a3b8' },
    ].map((item) => {
      const azRad = degToRad(item.az);
      // North is -Z, East is +X, South is +Z, West is -X
      const x = (DOME_RADIUS + 1.5) * Math.sin(azRad);
      const z = -(DOME_RADIUS + 1.5) * Math.cos(azRad);
      return { ...item, position: [x, 0.4, z] as [number, number, number] };
    });
  }, []);

  // Altitude Rings Geometry (30° and 60°)
  const altRingsGeometry = useMemo(() => {
    if (!showGrid) return null;

    const vertices: number[] = [];
    const segments = 90;
    const altitudes = [30, 60];

    for (const alt of altitudes) {
      const altRad = degToRad(alt);
      const y = DOME_RADIUS * Math.sin(altRad);
      const radiusAtAlt = DOME_RADIUS * Math.cos(altRad);

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = radiusAtAlt * Math.sin(theta);
        const z = -radiusAtAlt * Math.cos(theta);

        vertices.push(x, y, z);
        if (i > 0 && i < segments) {
          vertices.push(x, y, z); // duplicate for line pairs
        }
      }
    }

    // Vertical Meridian Arcs (every 45° of azimuth)
    for (let az = 0; az < 360; az += 45) {
      const azRad = degToRad(az);
      for (let j = 0; j <= 30; j++) {
        const alt = (j / 30) * 90;
        const altRad = degToRad(alt);
        const x = DOME_RADIUS * Math.cos(altRad) * Math.sin(azRad);
        const y = DOME_RADIUS * Math.sin(altRad);
        const z = -DOME_RADIUS * Math.cos(altRad) * Math.cos(azRad);

        vertices.push(x, y, z);
        if (j > 0 && j < 30) {
          vertices.push(x, y, z);
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geom;
  }, [showGrid]);

  return (
    <group>
      {/* 1. Ground Disc with Horizon Glow */}
      {showGround && (
        <group>
          {/* Subtle reflective dark ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
            <circleGeometry args={[DOME_RADIUS, 64]} />
            <meshBasicMaterial
              color="#030713"
              transparent={true}
              opacity={0.88}
              depthWrite={true}
            />
          </mesh>

          {/* Observer Center Platform Rings */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[2.5, 3.2, 48]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent={true}
              opacity={0.3}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[7.8, 8.2, 48]} />
            <meshBasicMaterial
              color="#818cf8"
              transparent={true}
              opacity={0.15}
            />
          </mesh>

          {/* Horizon Rim Glowing Ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[DOME_RADIUS - 0.4, DOME_RADIUS + 0.4, 128]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent={true}
              opacity={0.7}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* 3D Cardinal Labels on Horizon Rim */}
          {cardinalMarkers.map((marker) => (
            <group key={marker.label} position={marker.position}>
              <Html center distanceFactor={45} className="pointer-events-none select-none">
                <div
                  className="px-2 py-0.5 rounded-lg border font-mono font-bold text-xs tracking-wider shadow-lg backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(3, 7, 18, 0.85)',
                    borderColor: `${marker.color}66`,
                    color: marker.color,
                    boxShadow: `0 0 12px ${marker.color}44`,
                  }}
                >
                  {marker.short}
                </div>
              </Html>
            </group>
          ))}
        </group>
      )}

      {/* 2. Hemisphere Wireframe Grid (Altitude Circles & Azimuth Arcs) */}
      {showGrid && altRingsGeometry && (
        <group>
          <lineSegments geometry={altRingsGeometry}>
            <lineBasicMaterial
              color="#818cf8"
              transparent={true}
              opacity={0.16}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </lineSegments>

          {/* Altitude labels hovering on the North meridian */}
          {[30, 60].map((alt) => {
            const altRad = degToRad(alt);
            const y = DOME_RADIUS * Math.sin(altRad);
            const z = -DOME_RADIUS * Math.cos(altRad);
            return (
              <group key={alt} position={[0, y, z]}>
                <Html center distanceFactor={40} className="pointer-events-none">
                  <span className="text-[10px] font-mono text-purple-400 bg-space-950/70 px-1 rounded border border-purple-500/20">
                    Alt {alt}°
                  </span>
                </Html>
              </group>
            );
          })}

          {/* Zenith Beacon at (0, DOME_RADIUS, 0) */}
          <group position={[0, DOME_RADIUS, 0]}>
            <mesh>
              <sphereGeometry args={[0.6, 16, 16]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            <Html center distanceFactor={35} className="pointer-events-none">
              <span className="text-[10px] font-hud font-bold text-cyan-300 bg-space-950/80 px-2 py-0.5 rounded-md border border-cyan-400/40 shadow-glow-cyan">
                ZENITH (90°)
              </span>
            </Html>
          </group>
        </group>
      )}
    </group>
  );
};
