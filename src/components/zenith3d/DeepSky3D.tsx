import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Billboard, Html } from '@react-three/drei';
import type { Star } from '../../types/celestial';
import type { DeepSkyType } from '../../types/deepSky';
import type { SkyVisualAttenuation } from '../../types/weather';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';
import { DEEP_SKY_COLOR_BY_TYPE } from '../../utils/deepSky';

interface DeepSky3DProps {
  bodies: Star[];
  showLabels: boolean;
  selectedStar: Star | null;
  skyAttenuation?: SkyVisualAttenuation;
}

const DSO_3D_RADIUS = DOME_RADIUS * 0.985;

function createDeepSkyTexture(type: DeepSkyType, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  const c = 48;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.2;

  if (type === 'galaxy') {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(-0.45);
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 32);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (type === 'planetary_nebula') {
    ctx.beginPath();
    ctx.arc(c, c, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, c);
    ctx.lineTo(82, c);
    ctx.moveTo(c, 14);
    ctx.lineTo(c, 82);
    ctx.stroke();
  } else if (type === 'supernova_remnant') {
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(c, 16);
    ctx.lineTo(80, c);
    ctx.lineTo(c, 80);
    ctx.lineTo(16, c);
    ctx.closePath();
    ctx.stroke();
  } else if (type === 'globular_cluster') {
    const grad = ctx.createRadialGradient(c, c, 2, c, c, 26);
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, c, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c, c, 22, 0, Math.PI * 2);
    ctx.moveTo(c - 22, c);
    ctx.lineTo(c + 22, c);
    ctx.moveTo(c, c - 22);
    ctx.lineTo(c, c + 22);
    ctx.stroke();
  } else if (type === 'open_cluster') {
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(c, c, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    for (const [dx, dy] of [[-7, -5], [6, -7], [0, 3], [-8, 8], [9, 6]]) {
      ctx.beginPath();
      ctx.arc(c + dx, c + dy, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const grad = ctx.createRadialGradient(c, c, 2, c, c, 32);
    grad.addColorStop(0, '#fbcfe8');
    grad.addColorStop(0.55, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, c, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeRect(24, 24, 48, 48);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const DeepSky3D: React.FC<DeepSky3DProps> = ({
  bodies,
  showLabels,
  selectedStar,
  skyAttenuation,
}) => {
  const baseAlpha = skyAttenuation?.starOpacity ?? 1;

  const textures = useMemo(() => {
    const entries = Object.entries(DEEP_SKY_COLOR_BY_TYPE) as [DeepSkyType, string][];
    const map = {} as Record<DeepSkyType, THREE.CanvasTexture>;
    for (const [type, color] of entries) {
      map[type] = createDeepSkyTexture(type, color);
    }
    return map;
  }, []);

  useEffect(() => {
    return () => {
      Object.values(textures).forEach((tex) => tex.dispose());
    };
  }, [textures]);

  return (
    <group>
      {bodies.map((dso) => {
        if (dso.alt === undefined || dso.az === undefined || dso.alt < -2 || !dso.deepSkyData) {
          return null;
        }
        const meta = dso.deepSkyData;
        const pos = altAzToVector3(dso.alt, dso.az, DSO_3D_RADIUS);
        const isSelected = selectedStar?.id === dso.id;
        const scale = Math.max(1.8, Math.min(4.2, 1.5 + Math.log10(meta.sizeArcmin + 1) * 1.1));
        const showThisLabel = showLabels && (meta.featured || dso.mag <= 5.8 || isSelected);

        return (
          <group key={dso.id} position={pos}>
            <Billboard>
              <mesh>
                <planeGeometry args={[scale, scale]} />
                <meshBasicMaterial
                  map={textures[meta.dsoType]}
                  transparent
                  depthWrite={false}
                  opacity={Math.max(0.32, baseAlpha * (isSelected || meta.featured ? 0.95 : 0.78))}
                />
              </mesh>
              {showThisLabel && (
                <Html position={[0, scale * 0.68, 0]} center zIndexRange={[10, 0]}>
                  <span
                    className="pointer-events-none select-none font-mono text-[10px] font-semibold whitespace-nowrap drop-shadow"
                    style={{ color: isSelected ? '#ffffff' : meta.accentColor }}
                  >
                    {meta.catalogCode}
                  </span>
                </Html>
              )}
            </Billboard>
          </group>
        );
      })}
    </group>
  );
};
