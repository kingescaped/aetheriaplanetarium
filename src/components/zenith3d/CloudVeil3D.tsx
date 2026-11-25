import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DOME_RADIUS } from '../../utils/coordinates3D';

interface CloudVeil3DProps {
  cloudCover: number;
  hazeOpacity: number;
}

const cloudVertexShader = `
  varying vec3 vLocalPos;

  void main() {
    vLocalPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragmentShader = `
  varying vec3 vLocalPos;
  uniform float uTime;
  uniform float uCloudCover;
  uniform float uHazeOpacity;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 3; i++) {
      v += amp * noise(p);
      p *= 2.05;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vLocalPos);
    float horizonFade = smoothstep(-0.04, 0.22, dir.y);
    if (horizonFade <= 0.001) discard;

    vec2 skyUv = dir.xz / (abs(dir.y) + 0.35);
    vec2 drift = vec2(uTime * 0.012, uTime * 0.006);
    float n = fbm(skyUv * 1.4 + drift);
    float cloudMask = smoothstep(0.65 - uCloudCover * 0.45, 0.88 - uCloudCover * 0.2, n);

    float alpha = (uHazeOpacity * 0.35 + cloudMask * uHazeOpacity * 0.78) * horizonFade;
    vec3 color = mix(vec3(0.09, 0.14, 0.26), vec3(0.27, 0.35, 0.50), cloudMask);

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.72));
  }
`;

export const CloudVeil3D: React.FC<CloudVeil3DProps> = ({ cloudCover, hazeOpacity }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCloudCover: { value: Math.min(1, Math.max(0, cloudCover / 100)) },
      uHazeOpacity: { value: hazeOpacity },
    }),
    []
  );

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uCloudCover.value = Math.min(
      1,
      Math.max(0, cloudCover / 100)
    );
    materialRef.current.uniforms.uHazeOpacity.value = hazeOpacity;
  }, [cloudCover, hazeOpacity]);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  if (hazeOpacity <= 0.02) return null;

  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[DOME_RADIUS * 0.92, 48, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={cloudVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
};
