import React, { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import type { EclipticOverlayData } from '../../types/deepSky';
import type { SkyVisualAttenuation } from '../../types/weather';
import type { Language } from '../../utils/i18n';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';

interface EclipticLine3DProps {
  eclipticData: EclipticOverlayData | null;
  showLabels: boolean;
  skyAttenuation?: SkyVisualAttenuation;
  lang: Language;
}

const ECLIPTIC_RADIUS = DOME_RADIUS * 0.992;

export const EclipticLine3D: React.FC<EclipticLine3DProps> = ({
  eclipticData,
  showLabels,
  skyAttenuation,
  lang,
}) => {
  const opacity = 0.68 * (skyAttenuation?.constellationOpacity ?? 1);

  const segments = useMemo(() => {
    if (!eclipticData) return [];
    const result: [number, number, number][][] = [];
    let current: [number, number, number][] = [];

    for (const pt of eclipticData.points) {
      if (pt.alt < -4) {
        if (current.length >= 2) result.push(current);
        current = [];
        continue;
      }
      current.push(altAzToVector3(pt.alt, pt.az, ECLIPTIC_RADIUS));
    }
    if (current.length >= 2) result.push(current);
    return result;
  }, [eclipticData]);

  const tickMarkers = useMemo(() => {
    if (!eclipticData) return [];
    return eclipticData.ticks
      .filter((t) => t.alt >= 2)
      .map((t) => ({
        lonDeg: t.lonDeg,
        pos: altAzToVector3(t.alt, t.az, ECLIPTIC_RADIUS),
      }));
  }, [eclipticData]);

  const seasonalMarkers = useMemo(() => {
    if (!eclipticData) return [];
    return eclipticData.markers
      .filter((m) => m.alt >= 2)
      .map((m) => ({
        id: m.id,
        label: lang === 'vi' ? m.labelVi : m.labelEn,
        pos: altAzToVector3(m.alt, m.az, ECLIPTIC_RADIUS),
      }));
  }, [eclipticData, lang]);

  if (!eclipticData || opacity <= 0.04) return null;

  return (
    <group>
      {segments.map((pts, idx) => (
        <Line
          key={`ecliptic-seg-${idx}`}
          points={pts}
          color="#f59e0b"
          lineWidth={1.35}
          dashed
          dashSize={1.4}
          gapSize={1.0}
          transparent
          opacity={opacity}
        />
      ))}

      {tickMarkers.map((tick) => (
        <group key={`ecl-tick-${tick.lonDeg}`} position={tick.pos}>
          <mesh>
            <sphereGeometry args={[0.26, 8, 8]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={opacity} />
          </mesh>
          {showLabels && tick.lonDeg % 90 !== 0 && (
            <Html position={[0, 0.7, 0]} center zIndexRange={[10, 0]}>
              <span className="pointer-events-none select-none font-mono text-[9px] text-amber-300/80 whitespace-nowrap">
                {tick.lonDeg}°
              </span>
            </Html>
          )}
        </group>
      ))}

      {seasonalMarkers.map((m) => (
        <group key={`ecl-season-${m.id}`} position={m.pos}>
          <mesh>
            <octahedronGeometry args={[0.48, 0]} />
            <meshBasicMaterial color="#fde047" transparent opacity={Math.min(1, opacity + 0.2)} />
          </mesh>
          {showLabels && (
            <Html position={[0, 1.1, 0]} center zIndexRange={[10, 0]}>
              <span className="pointer-events-none select-none px-1.5 py-0.5 rounded bg-slate-950/75 border border-amber-400/40 font-sans text-[10px] font-semibold text-amber-200 whitespace-nowrap shadow">
                {m.label}
              </span>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
};
