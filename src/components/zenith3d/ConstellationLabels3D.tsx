import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { CONSTELLATIONS } from '../../data/constellations';
import { equatorialToHorizontal } from '../../utils/astronomy';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';
import { ObserverLocation } from '../../types/celestial';

interface ConstellationLabels3DProps {
  location: ObserverLocation;
  lst: number;
  visible: boolean;
}

export const ConstellationLabels3D: React.FC<ConstellationLabels3DProps> = ({
  location,
  lst,
  visible,
}) => {
  const visibleConstellations = useMemo(() => {
    if (!visible) return [];

    return CONSTELLATIONS.map((con) => {
      const { alt, az } = equatorialToHorizontal(con.centerRa, con.centerDec, location.latitude, lst);
      const position = altAzToVector3(alt, az, DOME_RADIUS * 0.95);

      return {
        ...con,
        alt,
        az,
        position,
        isVisible: alt > 8, // Only display when nicely above horizon
      };
    }).filter((c) => c.isVisible);
  }, [location.latitude, lst, visible]);

  if (!visible) return null;

  return (
    <group>
      {visibleConstellations.map((con) => (
        <group key={con.id} position={con.position}>
          <Html
            center
            distanceFactor={50}
            zIndexRange={[10, 0]}
            className="pointer-events-none select-none transition-opacity duration-300"
          >
            <div className="px-2 py-0.5 rounded-md bg-slate-950/70 border border-cyan-500/20 backdrop-blur-xs text-[10px] font-sans font-medium text-cyan-300 shadow-glow-cyan whitespace-nowrap">
              {con.nameVi || con.name}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
};
