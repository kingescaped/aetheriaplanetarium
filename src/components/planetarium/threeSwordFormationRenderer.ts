import * as THREE from 'three';
import {
  SWORD_TIER_COUNT,
  SWORD_TOTAL_COUNT,
  type SwordFormationState,
} from '../../utils/samsaraChoreography.ts';
import {
  SWORD_TRAIL_POINTS,
  type FlyingSwordPose,
} from './swordFormation2D.ts';
import type { SovereignArtworkLayout } from './supremeCultivatorOverlay2D.ts';

const BOLT_COUNT = 12;
const BOLT_SEGMENTS = 8;
const EMBER_COUNT = 72;

/**
 * Custom 512x256 Sword Formation PMREM environment:
 * deep obsidian-indigo backdrop + blazing Pure Pearl-White & 24K Imperial Gold specular softboxes.
 */
function createSwordArrayEnvMap(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0.0, '#05040a');
  bg.addColorStop(0.45, '#120d1c');
  bg.addColorStop(0.55, '#120d1c');
  bg.addColorStop(1.0, '#05040a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const drawSoftbox = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    inner: string,
    mid: string,
    outer: string
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    grad.addColorStop(0.0, inner);
    grad.addColorStop(0.38, mid);
    grad.addColorStop(1.0, outer);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Pure Pearl-White & blazing 24K Imperial Gold studio softboxes
  drawSoftbox(w * 0.25, h * 0.26, w * 0.16, h * 0.22, 'rgba(255,255,255,1)', 'rgba(241,245,249,0.75)', 'rgba(241,245,249,0)');
  drawSoftbox(w * 0.75, h * 0.24, w * 0.16, h * 0.22, 'rgba(255,249,219,1)', 'rgba(251,191,36,0.8)', 'rgba(251,191,36,0)');
  drawSoftbox(w * 0.5, h * 0.78, w * 0.14, h * 0.15, 'rgba(254,243,199,0.68)', 'rgba(245,158,11,0.36)', 'rgba(245,158,11,0)');

  const envTex = new THREE.CanvasTexture(canvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  envTex.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(envTex);
  envTex.dispose();
  pmrem.dispose();
  return envRT;
}

/**
 * Faceted 4-bevel diamond Chinese Jian blade geometry:
 * guard base at local z = 0, sharp sword point at z = +1.0 along +Z.
 */
function buildJianBladeGeometry(): THREE.BufferGeometry {
  const sections: readonly { z: number; w: number; h: number }[] = [
    { z: 0.0, w: 0.056, h: 0.019 },
    { z: 0.36, w: 0.052, h: 0.017 },
    { z: 0.74, w: 0.044, h: 0.014 },
    { z: 1.0, w: 0.0005, h: 0.0005 },
  ];

  const pos: number[] = [];
  const pushTri = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number
  ) => {
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  };

  for (let s = 0; s < sections.length - 1; s++) {
    const a = sections[s];
    const b = sections[s + 1];

    // 4 diamond corners per section: Top(+Y), Right(+X), Bottom(-Y), Left(-X)
    const aRing: readonly [number, number, number][] = [
      [0, a.h, a.z],
      [a.w, 0, a.z],
      [0, -a.h, a.z],
      [-a.w, 0, a.z],
    ];
    const bRing: readonly [number, number, number][] = [
      [0, b.h, b.z],
      [b.w, 0, b.z],
      [0, -b.h, b.z],
      [-b.w, 0, b.z],
    ];

    for (let f = 0; f < 4; f++) {
      const fNext = (f + 1) % 4;
      const a0 = aRing[f];
      const a1 = aRing[fNext];
      const b0 = bRing[f];
      const b1 = bRing[fNext];

      pushTri(a0[0], a0[1], a0[2], b0[0], b0[1], b0[2], a1[0], a1[1], a1[2]);
      pushTri(a1[0], a1[1], a1[2], b0[0], b0[1], b0[2], b1[0], b1[1], b1[2]);
    }
  }

  // Cap guard base z=0
  const base = sections[0];
  pushTri(0, base.h, 0, -base.w, 0, 0, base.w, 0, 0);
  pushTri(0, -base.h, 0, base.w, 0, 0, -base.w, 0, 0);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Merges 24K gold flanged Jian crossguard (z = 0), grip (-Z), and pommel (-0.23) into 1 indexed geometry.
 */
function buildJianHiltGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Central guard collar
  const guardCore = new THREE.BoxGeometry(0.145, 0.044, 0.045);
  guardCore.translate(0, 0, -0.005);
  parts.push(guardCore.toNonIndexed());
  guardCore.dispose();

  // Upward-swept cloud crossguard wings
  for (const side of [-1, 1]) {
    const wing = new THREE.BoxGeometry(0.055, 0.036, 0.058);
    wing.rotateY(side * -0.45);
    wing.translate(side * 0.088, 0, 0.012);
    parts.push(wing.toNonIndexed());
    wing.dispose();
  }

  // Cylindrical grip extending backward (-Z)
  const grip = new THREE.CylinderGeometry(0.017, 0.019, 0.175, 8);
  grip.rotateX(Math.PI * 0.5);
  grip.translate(0, 0, -0.115);
  parts.push(grip.toNonIndexed());
  grip.dispose();

  // Pommel orb & finial ring
  const pommel = new THREE.OctahedronGeometry(0.032, 0);
  pommel.scale(1.15, 0.88, 1.15);
  pommel.translate(0, 0, -0.22);
  parts.push(pommel.toNonIndexed());
  pommel.dispose();

  let totalFloats = 0;
  for (const p of parts) {
    totalFloats += (p.getAttribute('position') as THREE.BufferAttribute).count * 3;
  }

  const mergedPos = new Float32Array(totalFloats);
  const mergedNorm = new Float32Array(totalFloats);
  let offset = 0;
  for (const p of parts) {
    const pa = p.getAttribute('position') as THREE.BufferAttribute;
    const na = p.getAttribute('normal') as THREE.BufferAttribute;
    mergedPos.set(pa.array as Float32Array, offset);
    mergedNorm.set(na.array as Float32Array, offset);
    offset += pa.count * 3;
    p.dispose();
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  return geom;
}

function createMandalaDiscTexture(): THREE.CanvasTexture {
  const size = 512;
  const half = size * 0.5;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.translate(half, half);

  const glow = ctx.createRadialGradient(0, 0, half * 0.08, 0, 0, half);
  glow.addColorStop(0.0, 'rgba(255, 255, 255, 0.22)');
  glow.addColorStop(0.38, 'rgba(253, 224, 71, 0.18)');
  glow.addColorStop(0.72, 'rgba(245, 158, 11, 0.10)');
  glow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, half, 0, Math.PI * 2);
  ctx.fill();

  // Inner sacred concentric ivory-white & gold runic lotus geometry
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.62)';
  ctx.lineWidth = 2.2;
  for (const frac of [0.34, 0.56, 0.82]) {
    ctx.beginPath();
    ctx.arc(0, 0, half * frac, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 251, 235, 0.56)';
  ctx.lineWidth = 1.6;
  for (let pass = 0; pass < 3; pass++) {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2 + (pass * Math.PI) / 9;
      const r = half * 0.55;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // 18 subtle lotus ray ticks
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.48)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * half * 0.35, Math.sin(a) * half * 0.35);
    ctx.lineTo(Math.cos(a) * half * 0.81, Math.sin(a) * half * 0.81);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createSwordEmberTexture(): THREE.CanvasTexture {
  const size = 64;
  const half = size * 0.5;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  g.addColorStop(0.28, 'rgba(254, 249, 195, 0.92)');
  g.addColorStop(0.65, 'rgba(245, 158, 11, 0.38)');
  g.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function pseudoNoise(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return (s - Math.floor(s)) * 2 - 1;
}

/**
 * Offscreen WebGL 3D Celestial White-Gold 36-Sword Thanh Truc Phong Van Kiem Tran Renderer:
 * - PerspectiveCamera(38) aligned pixel-for-pixel at z=0
 * - 2 InstancedMesh draw calls for 36 pearlescent white-crystal Jian blades + 24K Gold crossguards
 * - Concentric counter-rotating 24K golden binding torus rings + ivory-gold mandala disc strictly z < 0
 * - Dynamic 36 White-Gold Sword-Qi Ribbon Trails, 12 Radial Golden-White lightning bolts, & 72 embers
 * - Global 2-pass z-plane clipping (z <= 0.5 back, z >= 0.0 front)
 */
export class ThreeSwordFormationRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private camDist = 1045;

  private readonly backClipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.5);
  private readonly frontClipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.0);

  private readonly envRT: THREE.WebGLRenderTarget;
  private readonly blackHoleLight: THREE.PointLight;
  private readonly haloLight: THREE.PointLight;

  private readonly bladeGeom: THREE.BufferGeometry;
  private readonly hiltGeom: THREE.BufferGeometry;
  private readonly bladeMat: THREE.MeshPhysicalMaterial;
  private readonly hiltMat: THREE.MeshStandardMaterial;
  private readonly bladeInstancedMesh: THREE.InstancedMesh;
  private readonly hiltInstancedMesh: THREE.InstancedMesh;

  // Concentric Gold Array Rings & Sacred Mandala (z < 0)
  private readonly arrayGroup = new THREE.Group();
  private readonly torusGeom: THREE.TorusGeometry;
  private readonly ringCoreMat: THREE.MeshStandardMaterial;
  private readonly ringTier1Mat: THREE.MeshStandardMaterial;
  private readonly ringTier2Mat: THREE.MeshStandardMaterial;
  private readonly ringCoreMesh: THREE.Mesh;
  private readonly ringTier1Mesh: THREE.Mesh;
  private readonly ringTier2Mesh: THREE.Mesh;
  private readonly ringNotchGeom: THREE.BoxGeometry;
  private readonly ringTier1Notches: THREE.Mesh[] = [];
  private readonly ringTier2Notches: THREE.Mesh[] = [];
  private readonly mandalaGeom: THREE.CircleGeometry;
  private readonly mandalaTex: THREE.CanvasTexture;
  private readonly mandalaMat: THREE.MeshBasicMaterial;
  private readonly mandalaMesh: THREE.Mesh;

  // 36 Dynamic 3D Sword-Qi Ribbon Trails (single draw call)
  private readonly trailGeom: THREE.BufferGeometry;
  private readonly trailPosArr: Float32Array;
  private readonly trailColArr: Float32Array;
  private readonly trailMat: THREE.MeshBasicMaterial;
  private readonly trailMesh: THREE.Mesh;

  // 12 Radial Tich Ta Than Loi Lightning Bolts (single LineSegments)
  private readonly boltGeom: THREE.BufferGeometry;
  private readonly boltPosArr: Float32Array;
  private readonly boltColArr: Float32Array;
  private readonly boltMat: THREE.LineBasicMaterial;
  private readonly boltLines: THREE.LineSegments;

  // 72 Sword-Qi Embers (Points)
  private readonly emberTex: THREE.CanvasTexture;
  private readonly emberGeom: THREE.BufferGeometry;
  private readonly emberPosArr: Float32Array;
  private readonly emberMat: THREE.PointsMaterial;
  private readonly emberPoints: THREE.Points;

  // Pre-allocated math pools (zero per-frame heap allocations)
  private readonly tmpMat4 = new THREE.Matrix4();
  private readonly tmpScaleVec = new THREE.Vector3();
  private readonly tmpQuatA = new THREE.Quaternion();
  private readonly tmpQuatRoll = new THREE.Quaternion();
  private readonly tmpForward = new THREE.Vector3();
  private readonly tmpRight = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3();
  private readonly worldUp = new THREE.Vector3(0, 1, 0);
  private readonly worldZ = new THREE.Vector3(0, 0, 1);

  private lastWidth = 0;
  private lastHeight = 0;
  private lastDpr = 0;
  private minWorldZ = 0;
  private maxWorldZ = 0;
  private disposed = false;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.26;
    this.renderer.localClippingEnabled = true;

    this.scene = new THREE.Scene();
    this.envRT = createSwordArrayEnvMap(this.renderer);
    this.scene.environment = this.envRT.texture;

    this.camera = new THREE.PerspectiveCamera(38, 1280 / 720, 50, 4500);
    this.camera.position.set(0, 0, this.camDist);
    this.camera.lookAt(0, 0, 0);

    // 3-Point Dramatic Lighting + Golden Black Hole Light + Celestial Gold Halo Core Light
    const hemi = new THREE.HemisphereLight('#fffbeb', '#0c0a16', 0.65);
    const keyLight = new THREE.DirectionalLight('#ffffff', 3.0);
    keyLight.position.set(240, 380, 520);
    const rimLight = new THREE.DirectionalLight('#fef9c3', 2.6);
    rimLight.position.set(-400, 220, -260);
    const goldRim = new THREE.DirectionalLight('#fbbf24', 2.4);
    goldRim.position.set(360, -240, -280);
    this.blackHoleLight = new THREE.PointLight('#f59e0b', 4.8, 950, 1.3);
    this.haloLight = new THREE.PointLight('#fde68a', 5.0, 850, 1.35);
    this.scene.add(hemi, keyLight, rimLight, goldRim, this.blackHoleLight, this.haloLight);

    // 1. 36 Celestial White-Silver Crystal Jian Blades + 24K Imperial Gold Hilts (2 InstancedMesh draw calls)
    this.bladeGeom = buildJianBladeGeometry();
    this.hiltGeom = buildJianHiltGeometry();

    this.bladeMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#fffef5'),
      emissive: new THREE.Color('#fef3c7'),
      emissiveIntensity: 0.42,
      metalness: 0.72,
      roughness: 0.18,
      clearcoat: 0.95,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
    });
    this.bladeMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSwordLocalPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSwordLocalPos = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSwordLocalPos;')
        .replace(
          '#include <dithering_fragment>',
          [
            'float bladeCore = exp(-pow(abs(vSwordLocalPos.x) / 0.011, 2.0)) * step(0.02, vSwordLocalPos.z);',
            'float bladeFresnel = pow(clamp(1.0 - abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 2.5);',
            'gl_FragColor.rgb += vec3(1.0, 0.99, 0.94) * bladeCore * 0.55 + vec3(1.0, 0.78, 0.24) * bladeFresnel * 0.65;',
            'gl_FragColor.rgb = clamp(gl_FragColor.rgb, 0.0, 1.0);',
            '#include <dithering_fragment>',
          ].join('\n')
        );
    };
    this.bladeMat.customProgramCacheKey = () => 'celestial-white-gold-jian-v1';

    this.hiltMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#fbbf24'),
      emissive: new THREE.Color('#b45309'),
      emissiveIntensity: 0.22,
      metalness: 0.9,
      roughness: 0.22,
      envMapIntensity: 1.5,
    });

    this.bladeInstancedMesh = new THREE.InstancedMesh(
      this.bladeGeom,
      this.bladeMat,
      SWORD_TOTAL_COUNT
    );
    this.hiltInstancedMesh = new THREE.InstancedMesh(
      this.hiltGeom,
      this.hiltMat,
      SWORD_TOTAL_COUNT
    );
    this.bladeInstancedMesh.frustumCulled = false;
    this.hiltInstancedMesh.frustumCulled = false;
    this.scene.add(this.bladeInstancedMesh, this.hiltInstancedMesh);

    // 2. Concentric Gold Array Binding Rings & Mandala Core (z < 0)
    this.torusGeom = new THREE.TorusGeometry(1, 0.018, 8, 72);
    this.ringNotchGeom = new THREE.BoxGeometry(0.032, 0.075, 0.032);
    this.ringCoreMat = new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#f59e0b',
      emissiveIntensity: 0.7,
      metalness: 0.86,
      roughness: 0.22,
      transparent: true,
      opacity: 1,
    });
    this.ringTier1Mat = this.ringCoreMat.clone();
    this.ringTier2Mat = this.ringCoreMat.clone();

    this.ringCoreMesh = new THREE.Mesh(this.torusGeom, this.ringCoreMat);
    this.ringTier1Mesh = new THREE.Mesh(this.torusGeom, this.ringTier1Mat);
    this.ringTier2Mesh = new THREE.Mesh(this.torusGeom, this.ringTier2Mat);

    for (let i = 0; i < SWORD_TIER_COUNT; i++) {
      const a1 = (i / SWORD_TIER_COUNT) * Math.PI * 2;
      const n1 = new THREE.Mesh(this.ringNotchGeom, this.ringTier1Mat);
      n1.position.set(Math.sin(a1), -Math.cos(a1), 0);
      n1.rotation.z = -a1;
      this.ringTier1Mesh.add(n1);
      this.ringTier1Notches.push(n1);

      const a2 = ((i + 0.5) / SWORD_TIER_COUNT) * Math.PI * 2;
      const n2 = new THREE.Mesh(this.ringNotchGeom, this.ringTier2Mat);
      n2.position.set(Math.sin(a2), -Math.cos(a2), 0);
      n2.rotation.z = -a2;
      this.ringTier2Mesh.add(n2);
      this.ringTier2Notches.push(n2);
    }

    this.mandalaGeom = new THREE.CircleGeometry(1, 64);
    this.mandalaTex = createMandalaDiscTexture();
    this.mandalaMat = new THREE.MeshBasicMaterial({
      map: this.mandalaTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mandalaMesh = new THREE.Mesh(this.mandalaGeom, this.mandalaMat);
    this.mandalaMesh.renderOrder = 1;
    this.ringCoreMesh.renderOrder = 2;
    this.ringTier1Mesh.renderOrder = 2;
    this.ringTier2Mesh.renderOrder = 2;

    this.arrayGroup.add(
      this.mandalaMesh,
      this.ringCoreMesh,
      this.ringTier1Mesh,
      this.ringTier2Mesh
    );
    this.scene.add(this.arrayGroup);

    // 3. 36 Dynamic 3D Sword-Qi Ribbon Trails (single draw call, RGBA per-vertex alpha)
    const totalTrailVerts = SWORD_TOTAL_COUNT * SWORD_TRAIL_POINTS * 2;
    this.trailPosArr = new Float32Array(totalTrailVerts * 3);
    this.trailColArr = new Float32Array(totalTrailVerts * 4);
    const trailIndices = new Uint16Array(SWORD_TOTAL_COUNT * (SWORD_TRAIL_POINTS - 1) * 6);
    let idxPtr = 0;
    for (let s = 0; s < SWORD_TOTAL_COUNT; s++) {
      const baseV = s * SWORD_TRAIL_POINTS * 2;
      for (let t = 0; t < SWORD_TRAIL_POINTS - 1; t++) {
        const a = baseV + t * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        trailIndices[idxPtr++] = a;
        trailIndices[idxPtr++] = c;
        trailIndices[idxPtr++] = b;
        trailIndices[idxPtr++] = b;
        trailIndices[idxPtr++] = c;
        trailIndices[idxPtr++] = d;
      }
    }

    this.trailGeom = new THREE.BufferGeometry();
    const trailPosAttr = new THREE.BufferAttribute(this.trailPosArr, 3);
    const trailColAttr = new THREE.BufferAttribute(this.trailColArr, 4);
    trailPosAttr.setUsage(THREE.DynamicDrawUsage);
    trailColAttr.setUsage(THREE.DynamicDrawUsage);
    this.trailGeom.setAttribute('position', trailPosAttr);
    this.trailGeom.setAttribute('color', trailColAttr);
    this.trailGeom.setIndex(new THREE.BufferAttribute(trailIndices, 1));
    this.trailMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.trailMesh = new THREE.Mesh(this.trailGeom, this.trailMat);
    this.trailMesh.frustumCulled = false;
    this.trailMesh.renderOrder = 3;
    this.scene.add(this.trailMesh);

    // 4. 12 Radial Tich Ta Than Loi Golden-White Lightning Bolts (LineSegments, RGBA per-vertex alpha)
    const boltVerts = BOLT_COUNT * BOLT_SEGMENTS * 2;
    this.boltPosArr = new Float32Array(boltVerts * 3);
    this.boltColArr = new Float32Array(boltVerts * 4);
    this.boltGeom = new THREE.BufferGeometry();
    const boltPosAttr = new THREE.BufferAttribute(this.boltPosArr, 3);
    const boltColAttr = new THREE.BufferAttribute(this.boltColArr, 4);
    boltPosAttr.setUsage(THREE.DynamicDrawUsage);
    boltColAttr.setUsage(THREE.DynamicDrawUsage);
    this.boltGeom.setAttribute('position', boltPosAttr);
    this.boltGeom.setAttribute('color', boltColAttr);
    this.boltMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    this.boltLines = new THREE.LineSegments(this.boltGeom, this.boltMat);
    this.boltLines.frustumCulled = false;
    this.boltLines.renderOrder = 4;
    this.scene.add(this.boltLines);

    // 5. 72 Sword-Qi Embers (Points)
    this.emberTex = createSwordEmberTexture();
    this.emberPosArr = new Float32Array(EMBER_COUNT * 3);
    this.emberGeom = new THREE.BufferGeometry();
    const emberPosAttr = new THREE.BufferAttribute(this.emberPosArr, 3);
    emberPosAttr.setUsage(THREE.DynamicDrawUsage);
    this.emberGeom.setAttribute('position', emberPosAttr);
    this.emberMat = new THREE.PointsMaterial({
      map: this.emberTex,
      color: '#fef9c3',
      size: 13,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    this.emberPoints = new THREE.Points(this.emberGeom, this.emberMat);
    this.emberPoints.frustumCulled = false;
    this.emberPoints.renderOrder = 5;
    this.scene.add(this.emberPoints);
  }

  private syncViewport(width: number, height: number, dpr: number): void {
    if (this.lastWidth === width && this.lastHeight === height && this.lastDpr === dpr) {
      return;
    }
    this.lastWidth = width;
    this.lastHeight = height;
    this.lastDpr = dpr;

    const safeW = Math.max(1, width);
    const safeH = Math.max(1, height);
    this.camDist = (safeH * 0.5) / Math.tan(THREE.MathUtils.degToRad(19));

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(safeW, safeH, false);
    this.camera.aspect = safeW / safeH;
    this.camera.near = Math.max(10, this.camDist * 0.05);
    this.camera.far = this.camDist * 4.5;
    this.camera.position.set(0, 0, this.camDist);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  public update(
    poses: FlyingSwordPose[],
    swordState: SwordFormationState,
    layout: SovereignArtworkLayout,
    width: number,
    height: number,
    dpr: number,
    bhX: number,
    bhY: number,
    timeSec: number
  ): void {
    if (this.disposed || swordState.swordOpacity <= 0.01) return;
    this.syncViewport(width, height, dpr);

    const depthScale = Math.max(135, Math.min(270, layout.imgSize * 0.45));
    this.blackHoleLight.position.set(bhX - width * 0.5, height * 0.5 - bhY, 65);
    this.haloLight.position.set(
      layout.haloX - width * 0.5,
      height * 0.5 - layout.haloY,
      -0.38 * depthScale + 45
    );
    this.haloLight.intensity = 3.2 + swordState.arrayRingOpacity * 3.0 + swordState.burstFlash * 4.5;

    this.minWorldZ = Infinity;
    this.maxWorldZ = -Infinity;

    // 1. Update 36 Instanced Jian blades + gold hilts & 36 Sword-Qi Ribbon Trails
    for (let i = 0; i < SWORD_TOTAL_COUNT; i++) {
      const p = poses[i];
      const worldZ = p.z * depthScale;
      const perspScale = Math.max(0.55, (this.camDist - worldZ) / this.camDist);
      const worldX = (p.x - width * 0.5) * perspScale;
      const worldY = (height * 0.5 - p.y) * perspScale;
      const bladeWorldScale = p.scale * perspScale;

      if (worldZ - bladeWorldScale * 0.35 < this.minWorldZ) {
        this.minWorldZ = worldZ - bladeWorldScale * 0.35;
      }
      if (worldZ + bladeWorldScale * 1.05 > this.maxWorldZ) {
        this.maxWorldZ = worldZ + bladeWorldScale * 1.05;
      }

      // Convert canvas (dirX, dirY_down, dirZ) to Three.js world (dirX, -dirY, dirZ)
      this.tmpForward.set(p.dirX, -p.dirY, p.dirZ).normalize();
      const refAxis = Math.abs(this.tmpForward.dot(this.worldZ)) > 0.95 ? this.worldUp : this.worldZ;
      this.tmpRight.crossVectors(refAxis, this.tmpForward).normalize();
      this.tmpUp.crossVectors(this.tmpForward, this.tmpRight).normalize();

      this.tmpMat4.makeBasis(this.tmpRight, this.tmpUp, this.tmpForward);
      this.tmpQuatA.setFromRotationMatrix(this.tmpMat4);
      if (Math.abs(p.rollRad) > 1e-4) {
        this.tmpQuatRoll.setFromAxisAngle(this.worldZ, p.rollRad);
        this.tmpQuatA.multiply(this.tmpQuatRoll);
      }
      this.tmpScaleVec.setScalar(bladeWorldScale);
      this.tmpMat4.compose(
        this.tmpRight.set(worldX, worldY, worldZ),
        this.tmpQuatA,
        this.tmpScaleVec
      );

      this.bladeInstancedMesh.setMatrixAt(i, this.tmpMat4);
      this.hiltInstancedMesh.setMatrixAt(i, this.tmpMat4);

      // Update trail ribbon strip for sword i
      const trailOpacity = swordState.swordOpacity * (0.65 + swordState.burstFlash * 0.35);
      const baseVert = i * SWORD_TRAIL_POINTS * 2;
      let prevTx = worldX;
      let prevTy = worldY;

      for (let tIdx = 0; tIdx < SWORD_TRAIL_POINTS; tIdx++) {
        const tp = p.trail[tIdx];
        const tWZ = tp.z * depthScale;
        const tPersp = Math.max(0.55, (this.camDist - tWZ) / this.camDist);
        const tx = (tp.x - width * 0.5) * tPersp;
        const ty = (height * 0.5 - tp.y) * tPersp;

        if (tWZ < this.minWorldZ) this.minWorldZ = tWZ;
        if (tWZ > this.maxWorldZ) this.maxWorldZ = tWZ;

        let segDx = tIdx === 0 ? -this.tmpForward.x : prevTx - tx;
        let segDy = tIdx === 0 ? -this.tmpForward.y : prevTy - ty;
        const segLen = Math.hypot(segDx, segDy);
        if (segLen < 1e-4) {
          segDx = -this.tmpForward.x;
          segDy = -this.tmpForward.y;
        } else {
          segDx /= segLen;
          segDy /= segLen;
        }
        const nx = -segDy;
        const ny = segDx;

        const taper = 1 - tIdx / (SWORD_TRAIL_POINTS - 1);
        const halfW = bladeWorldScale * 0.045 * taper;
        const intensity = taper * taper * trailOpacity * p.glowIntensity;

        const rCol = 1.0;
        const gCol = p.tier === 1 ? 0.99 : 0.86;
        const bCol = p.tier === 1 ? 0.94 : 0.38;
        const aCol = Math.max(0, Math.min(1, intensity));

        const vA = (baseVert + tIdx * 2) * 3;
        this.trailPosArr[vA] = tx - nx * halfW;
        this.trailPosArr[vA + 1] = ty - ny * halfW;
        this.trailPosArr[vA + 2] = tWZ;

        const vB = vA + 3;
        this.trailPosArr[vB] = tx + nx * halfW;
        this.trailPosArr[vB + 1] = ty + ny * halfW;
        this.trailPosArr[vB + 2] = tWZ;

        const vA4 = (baseVert + tIdx * 2) * 4;
        this.trailColArr[vA4] = rCol;
        this.trailColArr[vA4 + 1] = gCol;
        this.trailColArr[vA4 + 2] = bCol;
        this.trailColArr[vA4 + 3] = aCol;

        const vB4 = vA4 + 4;
        this.trailColArr[vB4] = rCol;
        this.trailColArr[vB4 + 1] = gCol;
        this.trailColArr[vB4 + 2] = bCol;
        this.trailColArr[vB4 + 3] = aCol;

        prevTx = tx;
        prevTy = ty;
      }
    }

    this.bladeInstancedMesh.instanceMatrix.needsUpdate = true;
    this.hiltInstancedMesh.instanceMatrix.needsUpdate = true;
    this.trailGeom.attributes.position.needsUpdate = true;
    this.trailGeom.attributes.color.needsUpdate = true;

    // 2. Concentric Gold Array Binding Rings & Mandala Core (strictly z < 0)
    const ringAlpha = swordState.arrayRingOpacity;
    if (ringAlpha > 0.01) {
      this.arrayGroup.visible = true;
      const z1 = -0.34 * depthScale;
      const z2 = -0.46 * depthScale;
      const zCore = -0.4 * depthScale;

      const p1 = Math.max(0.55, (this.camDist - z1) / this.camDist);
      const p2 = Math.max(0.55, (this.camDist - z2) / this.camDist);
      const pCore = Math.max(0.55, (this.camDist - zCore) / this.camDist);

      const hOffsetX = layout.haloX - width * 0.5;
      const hOffsetY = height * 0.5 - layout.haloY;

      this.ringCoreMesh.position.set(hOffsetX * pCore, hOffsetY * pCore, zCore);
      this.ringCoreMesh.scale.setScalar(layout.haloR * 0.54 * pCore);
      this.ringCoreMesh.rotation.z = timeSec * 0.35;

      this.ringTier1Mesh.position.set(hOffsetX * p1, hOffsetY * p1, z1);
      this.ringTier1Mesh.scale.setScalar(layout.haloR * 0.78 * p1);
      // Negative rotation around +Z turns screen clockwise matching +innerTierAngleRad
      this.ringTier1Mesh.rotation.z = -swordState.innerTierAngleRad;

      this.ringTier2Mesh.position.set(hOffsetX * p2, hOffsetY * p2, z2);
      this.ringTier2Mesh.scale.setScalar(layout.haloR * 1.18 * p2);
      this.ringTier2Mesh.rotation.z = -swordState.outerTierAngleRad;

      this.mandalaMesh.position.set(hOffsetX * pCore, hOffsetY * pCore, z2 - 6);
      this.mandalaMesh.scale.setScalar(layout.haloR * 1.24 * pCore);
      this.mandalaMesh.rotation.z = timeSec * 0.14;

      this.ringCoreMat.opacity = ringAlpha;
      this.ringTier1Mat.opacity = ringAlpha;
      this.ringTier2Mat.opacity = ringAlpha;
      this.mandalaMat.opacity = ringAlpha * (0.68 + swordState.burstFlash * 0.22);

      if (z2 - 6 < this.minWorldZ) this.minWorldZ = z2 - 6;
    } else {
      this.arrayGroup.visible = false;
    }

    // Keep exact behind-head culling cleanly negative in sword_halo stage
    if (swordState.stage === 'sword_halo') {
      this.maxWorldZ = Math.min(this.maxWorldZ, -12);
    }

    // 3. 12 Radial Tich Ta Than Loi Lightning Bolts during burst & sword_halo
    const lightningActivity = Math.max(swordState.burstFlash, ringAlpha * 0.65);
    if (lightningActivity > 0.02) {
      this.boltLines.visible = true;
      const zBolt = -0.38 * depthScale;
      const pBolt = Math.max(0.55, (this.camDist - zBolt) / this.camDist);
      const bx0 = (layout.haloX - width * 0.5) * pBolt;
      const by0 = (height * 0.5 - layout.haloY) * pBolt;
      const snap = Math.floor(timeSec * 9.0);
      const innerR = layout.haloR * 0.45 * pBolt;
      const outerR = layout.haloR * (1.35 + swordState.burstFlash * 0.65) * pBolt;

      let posPtr = 0;
      let colPtr = 0;
      for (let b = 0; b < BOLT_COUNT; b++) {
        const baseAngle = (b / BOLT_COUNT) * Math.PI * 2 + Math.sin(snap * 1.3 + b) * 0.14;
        const flicker = 0.45 + 0.55 * Math.abs(pseudoNoise(snap * 3.7 + b * 19.1));
        const bGlow = lightningActivity * flicker;
        const rCol = 1.0;
        const gCol = b % 2 === 0 ? 0.9 : 0.99;
        const blCol = b % 2 === 0 ? 0.4 : 0.95;
        const aCol = Math.max(0, Math.min(1, bGlow));

        let prevX = bx0 + Math.sin(baseAngle) * innerR;
        let prevY = by0 + Math.cos(baseAngle) * innerR;

        for (let seg = 1; seg <= BOLT_SEGMENTS; seg++) {
          const frac = seg / BOLT_SEGMENTS;
          const rad = innerR + (outerR - innerR) * frac;
          const jag =
            seg === BOLT_SEGMENTS
              ? 0
              : pseudoNoise(snap * 17.3 + b * 31.7 + seg * 7.9) * (layout.haloR * 0.16 * pBolt);
          const ang = baseAngle + jag / Math.max(1, rad);
          const curX = bx0 + Math.sin(ang) * rad;
          const curY = by0 + Math.cos(ang) * rad;

          this.boltPosArr[posPtr] = prevX;
          this.boltPosArr[posPtr + 1] = prevY;
          this.boltPosArr[posPtr + 2] = zBolt;
          this.boltPosArr[posPtr + 3] = curX;
          this.boltPosArr[posPtr + 4] = curY;
          this.boltPosArr[posPtr + 5] = zBolt;
          posPtr += 6;

          this.boltColArr[colPtr] = rCol;
          this.boltColArr[colPtr + 1] = gCol;
          this.boltColArr[colPtr + 2] = blCol;
          this.boltColArr[colPtr + 3] = aCol;
          this.boltColArr[colPtr + 4] = rCol;
          this.boltColArr[colPtr + 5] = gCol;
          this.boltColArr[colPtr + 6] = blCol;
          this.boltColArr[colPtr + 7] = aCol;
          colPtr += 8;

          prevX = curX;
          prevY = curY;
        }
      }
      this.boltGeom.attributes.position.needsUpdate = true;
      this.boltGeom.attributes.color.needsUpdate = true;
    } else {
      this.boltLines.visible = false;
    }

    // 4. 72 Sword-Qi Embers around blades & counter-rotating array rings
    this.emberMat.size = Math.max(10, layout.imgSize * 0.028);
    this.emberMat.opacity = swordState.swordOpacity * 0.92;
    for (let m = 0; m < EMBER_COUNT; m++) {
      const host = poses[m % SWORD_TOTAL_COUNT];
      const age = (timeSec * 0.95 + m * 0.193) % 1;
      const along = 0.15 + age * 0.95;
      const worldZ = host.z * depthScale;
      const pScale = Math.max(0.55, (this.camDist - worldZ) / this.camDist);
      const sx =
        (host.x + host.dirX * host.scale * along * 0.85 + Math.sin(timeSec * 3.1 + m) * 14) -
        width * 0.5;
      const sy =
        height * 0.5 -
        (host.y + host.dirY * host.scale * along * 0.85 + Math.cos(timeSec * 2.7 + m) * 14);

      const e3 = m * 3;
      this.emberPosArr[e3] = sx * pScale;
      this.emberPosArr[e3 + 1] = sy * pScale;
      this.emberPosArr[e3 + 2] = worldZ + Math.sin(timeSec * 2.5 + m * 1.3) * 18;
    }
    this.emberGeom.attributes.position.needsUpdate = true;
  }

  public renderBackTo2D(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.disposed || this.minWorldZ > 0.5) return;
    this.renderer.clippingPlanes = [this.backClipPlane];
    this.renderer.render(this.scene, this.camera);
    ctx.drawImage(this.renderer.domElement, 0, 0, width, height);
  }

  public renderFrontTo2D(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.disposed || this.maxWorldZ < 0.0) return;
    this.renderer.clippingPlanes = [this.frontClipPlane];
    this.renderer.render(this.scene, this.camera);
    ctx.drawImage(this.renderer.domElement, 0, 0, width, height);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.bladeInstancedMesh.dispose();
    this.hiltInstancedMesh.dispose();
    this.bladeGeom.dispose();
    this.hiltGeom.dispose();
    this.bladeMat.dispose();
    this.hiltMat.dispose();

    this.torusGeom.dispose();
    this.ringNotchGeom.dispose();
    this.ringCoreMat.dispose();
    this.ringTier1Mat.dispose();
    this.ringTier2Mat.dispose();
    this.mandalaGeom.dispose();
    this.mandalaTex.dispose();
    this.mandalaMat.dispose();

    this.trailGeom.dispose();
    this.trailMat.dispose();
    this.boltGeom.dispose();
    this.boltMat.dispose();
    this.emberGeom.dispose();
    this.emberTex.dispose();
    this.emberMat.dispose();

    this.envRT.dispose();
    this.scene.environment = null;
    this.renderer.dispose();
  }
}
