import React, { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import type { EquatorialCurvePoint, EquatorialGridData } from '../../types/atmosphere';
import type { SkyVisualAttenuation } from '../../types/weather';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';

interface EquatorialGrid3DProps {
  gridData: EquatorialGridData | null;
  showLabels: boolean;
  skyAttenuation?: SkyVisualAttenuation;
}

const EQ_GRID_RADIUS = DOME_RADIUS * 0.995;

function buildSegments3D(points: EquatorialCurvePoint[]): [number, number, number][][] {
  const result: [number, number, number][][] = [];
  let current: [number, number, number][] = [];

  for (const pt of points) {
    if (pt.alt < -3) {
      if (current.length >= 2) result.push(current);
      current = [];
      continue;
    }
    current.push(altAzToVector3(pt.alt, pt.az, EQ_GRID_RADIUS));
  }

  if (current.length >= 2) result.push(current);
  return result;
}

export const EquatorialGrid3D: React.FC<EquatorialGrid3DProps> = ({
  gridData,
  showLabels,
  skyAttenuation,
}) => {
  const baseScale = Math.max(0.28, skyAttenuation?.constellationOpacity ?? 1);

  const meridianSegments = useMemo(() => {
    if (!gridData) return [];
    return gridData.meridians.map((meridian) => ({
      raHours: meridian.raHours,
      label: meridian.label,
      segments: buildSegments3D(meridian.points),
      labelPos:
        meridian.labelPoint && meridian.labelPoint.alt >= 8
          ? altAzToVector3(meridian.labelPoint.alt, meridian.labelPoint.az, EQ_GRID_RADIUS)
          : null,
    }));
  }, [gridData]);

  const parallelSegments = useMemo(() => {
    if (!gridData) return [];
    return gridData.parallels.map((parallel) => ({
      decDeg: parallel.decDeg,
      label: parallel.label,
      isEquator: parallel.isEquator,
      segments: buildSegments3D(parallel.points),
      labelPos:
        parallel.labelPoint && parallel.labelPoint.alt >= 8
          ? altAzToVector3(parallel.labelPoint.alt, parallel.labelPoint.az, EQ_GRID_RADIUS)
          : null,
    }));
  }, [gridData]);

  const visiblePoles = useMemo(() => {
    if (!gridData) return [];
    return gridData.poles
      .filter((pole) => pole.alt >= 0)
      .map((pole) => ({
        ...pole,
        pos: altAzToVector3(pole.alt, pole.az, EQ_GRID_RADIUS),
      }));
  }, [gridData]);

  if (!gridData) return null;

  return (
    <group>
      {meridianSegments.map((meridian) => (
        <group key={`eq-ra-${meridian.raHours}`}>
          {meridian.segments.map((pts, idx) => (
            <Line
              key={`eq-ra-seg-${meridian.raHours}-${idx}`}
              points={pts}
              color="#2dd4bf"
              lineWidth={0.9}
              dashed
              dashSize={1.2}
              gapSize={1.0}
              transparent
              opacity={0.26 * baseScale}
            />
          ))}
          {showLabels && meridian.labelPos && (
            <Html position={meridian.labelPos} center zIndexRange={[10, 0]}>
              <span className="pointer-events-none select-none font-mono text-[9px] text-teal-300/80 whitespace-nowrap">
                {meridian.label}
              </span>
            </Html>
          )}
        </group>
      ))}

      {parallelSegments.map((parallel) => (
        <group key={`eq-dec-${parallel.decDeg}`}>
          {parallel.segments.map((pts, idx) => (
            <Line
              key={`eq-dec-seg-${parallel.decDeg}-${idx}`}
              points={pts}
              color={parallel.isEquator ? '#5eead4' : '#2dd4bf'}
              lineWidth={parallel.isEquator ? 1.35 : 0.9}
              dashed={!parallel.isEquator}
              dashSize={1.2}
              gapSize={1.0}
              transparent
              opacity={(parallel.isEquator ? 0.52 : 0.28) * baseScale}
            />
          ))}
          {showLabels && parallel.labelPos && (
            <Html position={parallel.labelPos} center zIndexRange={[10, 0]}>
              <span
                className={`pointer-events-none select-none font-mono text-[9px] whitespace-nowrap ${
                  parallel.isEquator
                    ? 'px-1 py-0.5 rounded bg-slate-950/75 border border-teal-400/40 text-teal-200 font-semibold'
                    : 'text-teal-300/80'
                }`}
              >
                {parallel.label}
              </span>
            </Html>
          )}
        </group>
      ))}

      {visiblePoles.map((pole) => (
        <group key={`eq-pole-${pole.id}`} position={pole.pos}>
          <mesh>
            <sphereGeometry args={[0.35, 12, 12]} />
            <meshBasicMaterial color="#5eead4" transparent opacity={0.9 * baseScale} />
          </mesh>
          {showLabels && (
            <Html position={[0, 1.0, 0]} center zIndexRange={[10, 0]}>
              <span className="pointer-events-none select-none px-1.5 py-0.5 rounded bg-slate-950/80 border border-teal-400/45 font-mono text-[9.5px] font-bold text-teal-200 whitespace-nowrap shadow">
                {pole.label}
              </span>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
};
