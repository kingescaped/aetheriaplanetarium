import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Star } from '../../types/celestial';
import { CONSTELLATIONS } from '../../data/constellations';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';

interface ConstellationLines3DProps {
  stars: Star[];
  visible: boolean;
}

export const ConstellationLines3D: React.FC<ConstellationLines3DProps> = ({
  stars,
  visible,
}) => {
  const lineRef = useRef<THREE.LineSegments>(null);

  // Map stars by ID for quick coordinate lookup
  const starCoordMap = useMemo(() => {
    const map = new Map<string | number, [number, number, number]>();
    for (const star of stars) {
      if (star.alt !== undefined && star.az !== undefined && star.alt >= -5) {
        const vec = altAzToVector3(star.alt, star.az, DOME_RADIUS * 0.998);
        map.set(star.id, vec);
      }
    }
    return map;
  }, [stars]);

  // Initial geometry allocation
  const initialGeometry = useMemo(() => {
    if (!visible) return null;

    const vertices: number[] = [];
    for (const con of CONSTELLATIONS) {
      for (const [starAId, starBId] of con.lines) {
        const posA = starCoordMap.get(starAId);
        const posB = starCoordMap.get(starBId);

        if (posA && posB) {
          vertices.push(posA[0], posA[1], posA[2]);
          vertices.push(posB[0], posB[1], posB[2]);
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geom;
  }, [visible]);

  // Update line positions in-place
  useEffect(() => {
    if (!visible || !lineRef.current) return;
    const geom = lineRef.current.geometry;
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    if (!posAttr) return;

    const array = posAttr.array as Float32Array;
    let idx = 0;

    for (const con of CONSTELLATIONS) {
      for (const [starAId, starBId] of con.lines) {
        const posA = starCoordMap.get(starAId);
        const posB = starCoordMap.get(starBId);

        if (posA && posB && idx + 6 <= array.length) {
          array[idx++] = posA[0];
          array[idx++] = posA[1];
          array[idx++] = posA[2];
          array[idx++] = posB[0];
          array[idx++] = posB[1];
          array[idx++] = posB[2];
        }
      }
    }

    posAttr.needsUpdate = true;
  }, [starCoordMap, visible]);

  if (!visible || !initialGeometry) return null;

  return (
    <lineSegments ref={lineRef} geometry={initialGeometry}>
      <lineBasicMaterial
        color="#38bdf8"
        transparent={true}
        opacity={0.45}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
};
