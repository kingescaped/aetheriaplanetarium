import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DOME_RADIUS } from '../../utils/coordinates3D';

interface HorizonSilhouette3DProps {
  visible: boolean;
}

export const HorizonSilhouette3D: React.FC<HorizonSilhouette3DProps> = ({ visible }) => {
  // Generate a procedural 360-degree panoramic skyline texture:
  // Mountains, rolling hills, observatory dome, radio dish, pine trees & cabins
  const silhouetteTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const w = canvas.width;
    const h = canvas.height;

    // Clear transparent
    ctx.clearRect(0, 0, w, h);

    // Baseline ground level (bottom of the texture)
    const groundY = h;

    // 1. Layer 1: Distant Jagged Mountain Ridges
    ctx.fillStyle = '#010207';
    ctx.beginPath();
    ctx.moveTo(0, groundY);

    const mountainPoints = 128;
    const mountainStep = w / mountainPoints;
    for (let i = 0; i <= mountainPoints; i++) {
      const x = i * mountainStep;
      // Perlin-like pseudo noise using multi-frequency sines
      const normX = i / mountainPoints;
      const elevation =
        Math.sin(normX * Math.PI * 8) * 45 +
        Math.sin(normX * Math.PI * 18 + 1.2) * 25 +
        Math.sin(normX * Math.PI * 32 + 2.5) * 15 +
        Math.cos(normX * Math.PI * 4) * 35;
      const y = h - 140 - Math.abs(elevation);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();

    // 2. Layer 2: Rolling Foothills & Closer Dark Terrain
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    const hillPoints = 96;
    const hillStep = w / hillPoints;
    for (let i = 0; i <= hillPoints; i++) {
      const x = i * hillStep;
      const normX = i / hillPoints;
      const elevation =
        Math.sin(normX * Math.PI * 12 + 0.5) * 30 +
        Math.cos(normX * Math.PI * 6 + 1.8) * 20;
      const y = h - 85 - Math.abs(elevation);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();

    // 3. Layer 3: Architectural Landmarks & Pine Forest Silhouettes
    ctx.fillStyle = '#000000';

    // Helper: Draw Pine Tree Silhouette
    const drawPineTree = (x: number, baseY: number, treeHeight: number, width: number) => {
      ctx.beginPath();
      ctx.moveTo(x, baseY - treeHeight);
      ctx.lineTo(x + width * 0.5, baseY - treeHeight * 0.4);
      ctx.lineTo(x + width * 0.35, baseY - treeHeight * 0.45);
      ctx.lineTo(x + width * 0.65, baseY - treeHeight * 0.15);
      ctx.lineTo(x + width * 0.4, baseY - treeHeight * 0.2);
      ctx.lineTo(x + width * 0.8, baseY);
      ctx.lineTo(x - width * 0.8, baseY);
      ctx.lineTo(x - width * 0.4, baseY - treeHeight * 0.2);
      ctx.lineTo(x - width * 0.65, baseY - treeHeight * 0.15);
      ctx.lineTo(x - width * 0.35, baseY - treeHeight * 0.45);
      ctx.lineTo(x - width * 0.5, baseY - treeHeight * 0.4);
      ctx.closePath();
      ctx.fill();
    };

    // Helper: Draw Astronomical Observatory Dome
    const drawObservatory = (centerX: number, baseY: number, domeRadius: number) => {
      // Cylinder base
      ctx.fillRect(centerX - domeRadius * 0.9, baseY - domeRadius * 0.7, domeRadius * 1.8, domeRadius * 0.7);
      // Hemispherical roof
      ctx.beginPath();
      ctx.arc(centerX, baseY - domeRadius * 0.7, domeRadius, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();

      // Slit shutter indicator
      ctx.fillStyle = '#050a18';
      ctx.fillRect(centerX - domeRadius * 0.15, baseY - domeRadius * 1.6, domeRadius * 0.3, domeRadius * 0.9);
      ctx.fillStyle = '#000000';
    };

    // Helper: Draw Parabolic Radio Telescope Dish
    const drawRadioDish = (centerX: number, baseY: number, size: number) => {
      // Pedestal tower
      ctx.fillRect(centerX - 3, baseY - size * 0.8, 6, size * 0.8);
      // Angled Dish
      ctx.beginPath();
      ctx.ellipse(centerX, baseY - size * 0.9, size * 0.8, size * 0.35, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    };

    // Helper: Draw Mountain Cabin / Houses
    const drawCabin = (centerX: number, baseY: number, width: number, height: number) => {
      // House box
      ctx.fillRect(centerX - width / 2, baseY - height * 0.6, width, height * 0.6);
      // Pitched roof
      ctx.beginPath();
      ctx.moveTo(centerX - width * 0.6, baseY - height * 0.6);
      ctx.lineTo(centerX, baseY - height);
      ctx.lineTo(centerX + width * 0.6, baseY - height * 0.6);
      ctx.closePath();
      ctx.fill();
    };

    // Distribute pine forests along the perimeter
    for (let x = 10; x < w; x += 35 + Math.sin(x) * 15) {
      // Skip spots reserved for buildings
      if (Math.abs(x - 500) < 60 || Math.abs(x - 1600) < 60 || Math.abs(x - 2700) < 60) continue;
      const treeH = 30 + (Math.sin(x * 0.05) * 0.5 + 0.5) * 35;
      drawPineTree(x, h - 35, treeH, 16);
    }

    // Place Observatory 1 at North-East (x ≈ 500)
    drawObservatory(500, h - 30, 36);

    // Place Radio Telescope Dish at South-East (x ≈ 1600)
    drawRadioDish(1600, h - 25, 42);

    // Place Mountain Lodge / Cabins at South-West (x ≈ 2700)
    drawCabin(2680, h - 30, 38, 28);
    drawCabin(2730, h - 30, 28, 22);

    // Place Observatory 2 at North-West (x ≈ 3600)
    drawObservatory(3600, h - 35, 45);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return texture;
  }, []);

  if (!visible || !silhouetteTexture) return null;

  // Cylinder radius slightly inside DOME_RADIUS, height spanning from Y = 0 to Y = 6.5
  const cylinderRadius = DOME_RADIUS * 0.994;
  const cylinderHeight = 6.2;

  return (
    <mesh position={[0, cylinderHeight / 2 - 0.05, 0]}>
      <cylinderGeometry
        args={[cylinderRadius, cylinderRadius, cylinderHeight, 96, 1, true]}
      />
      <meshBasicMaterial
        map={silhouetteTexture}
        transparent={true}
        side={THREE.BackSide} // Visible when looking outward from the center
        depthWrite={false}
      />
    </mesh>
  );
};
