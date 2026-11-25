import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { TwilightState } from '../../types/atmosphere';
import { altAzToVector3, DOME_RADIUS } from '../../utils/coordinates3D';
import { NIGHT_TWILIGHT_COLORS } from '../../utils/twilight';

interface AtmosphereDome3DProps {
  twilightState?: TwilightState;
}

const atmosphereVertexShader = `
  varying vec3 vLocalPos;

  void main() {
    vLocalPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  varying vec3 vLocalPos;
  uniform vec3 uZenithColor;
  uniform vec3 uMidColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunGlowColor;
  uniform float uSunGlowOpacity;
  uniform vec3 uSunDir;

  void main() {
    vec3 dir = normalize(vLocalPos);
    float elev = clamp(dir.y, 0.0, 1.0);

    vec3 skyColor = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.35, elev));
    skyColor = mix(skyColor, uZenithColor, smoothstep(0.28, 0.92, elev));

    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float horizonBand = exp(-max(dir.y, 0.0) * 5.2);
    float twilightGlow = pow(sunDot, 2.5) * horizonBand * uSunGlowOpacity * 1.15;
    float solarAureole = pow(sunDot, 20.0) * uSunGlowOpacity * 0.55;

    skyColor += uSunGlowColor * (twilightGlow + solarAureole);

    vec3 groundColor = vec3(0.012, 0.027, 0.071);
    float aboveHorizon = smoothstep(-0.04, 0.015, dir.y);
    vec3 finalColor = mix(groundColor, skyColor, aboveHorizon);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const AtmosphereDome3D: React.FC<AtmosphereDome3DProps> = ({ twilightState }) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uZenithColor: { value: new THREE.Color(NIGHT_TWILIGHT_COLORS.zenith) },
      uMidColor: { value: new THREE.Color(NIGHT_TWILIGHT_COLORS.mid) },
      uHorizonColor: { value: new THREE.Color(NIGHT_TWILIGHT_COLORS.horizon) },
      uSunGlowColor: { value: new THREE.Color(NIGHT_TWILIGHT_COLORS.sunGlow) },
      uSunGlowOpacity: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0, -1, 0) },
    }),
    []
  );

  useEffect(() => {
    const mat = matRef.current;
    if (!mat) return;

    const enabled = twilightState?.enabled ?? false;
    mat.uniforms.uZenithColor.value.set(
      enabled ? twilightState!.zenithColor : NIGHT_TWILIGHT_COLORS.zenith
    );
    mat.uniforms.uMidColor.value.set(
      enabled ? twilightState!.midColor : NIGHT_TWILIGHT_COLORS.mid
    );
    mat.uniforms.uHorizonColor.value.set(
      enabled ? twilightState!.horizonColor : NIGHT_TWILIGHT_COLORS.horizon
    );
    mat.uniforms.uSunGlowColor.value.set(
      enabled ? twilightState!.sunGlowColor : NIGHT_TWILIGHT_COLORS.sunGlow
    );
    mat.uniforms.uSunGlowOpacity.value = enabled ? twilightState!.sunGlowOpacity : 0;

    const [sx, sy, sz] = altAzToVector3(
      twilightState?.sunAltDeg ?? -45,
      twilightState?.sunAzDeg ?? 180,
      1
    );
    mat.uniforms.uSunDir.value.set(sx, sy, sz);
  }, [twilightState]);

  return (
    <mesh renderOrder={-10}>
      <sphereGeometry args={[DOME_RADIUS * 1.18, 48, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
};
