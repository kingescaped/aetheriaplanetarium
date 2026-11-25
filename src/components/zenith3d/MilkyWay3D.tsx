import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { DOME_RADIUS } from '../../utils/coordinates3D';
import { degToRad } from '../../utils/astronomy';

interface MilkyWay3DProps {
  visible: boolean;
  latitudeDeg: number;
  lstDeg: number;
  visibility: number;
}

const milkyWayVertexShader = `
  varying vec3 vLocalPos;

  void main() {
    vLocalPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const milkyWayFragmentShader = `
  varying vec3 vLocalPos;
  uniform float uLatRad;
  uniform float uLstRad;
  uniform float uVisibility;

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
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p);
      p = p * 2.07 + vec2(13.1, 7.7);
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vLocalPos);
    float horizonFade = smoothstep(-0.02, 0.12, dir.y);
    if (horizonFade <= 0.001 || uVisibility <= 0.02) discard;

    float sinLat = sin(uLatRad);
    float cosLat = cos(uLatRad);
    float sinLst = sin(uLstRad);
    float cosLst = cos(uLstRad);

    // Horizon (East = +x, Up = +y, North = -z) -> Hour Angle & Declination
    float nComp = -dir.z;
    float sinDec = dir.y * sinLat + nComp * cosLat;
    float cosDecCosHa = dir.y * cosLat - nComp * sinLat;
    float cosDecSinHa = -dir.x;

    vec3 eqDir = vec3(
      cosLst * cosDecCosHa + sinLst * cosDecSinHa,
      sinLst * cosDecCosHa - cosLst * cosDecSinHa,
      sinDec
    );

    // IAU J2000 Galactic Matrix A_G * eqDir
    vec3 galDir = vec3(
      dot(eqDir, vec3(-0.0548755604, -0.8734370902, -0.4838350155)),
      dot(eqDir, vec3(0.4941094279, -0.4448296300, 0.7469822445)),
      dot(eqDir, vec3(-0.8676661490, -0.1980763734, 0.4559837762))
    );

    float absB = abs(asin(clamp(galDir.z, -1.0, 1.0)));
    float lon = atan(galDir.y, galDir.x);

    // Broad bulge near Galactic Center (galDir.x > 0, lon ~ 0)
    float bulge = exp(-pow(lon / 0.48, 2.0)) * smoothstep(-0.2, 0.9, galDir.x);
    float bandWidth = 0.17 + bulge * 0.14;
    float planeProfile = exp(-pow(absB / bandWidth, 1.65));
    if (planeProfile < 0.015) discard;

    vec2 galUv = vec2(lon * 3.8, galDir.z * 11.0);
    float cloudNoise = fbm(galUv);
    float fineDust = fbm(galUv * 2.4 + vec2(4.2, -2.1));

    // Great Rift dark dust attenuation along galactic equator between Cygnus and Sagittarius
    float riftZone = smoothstep(-0.65, 0.1, lon) * (1.0 - smoothstep(1.15, 1.75, lon));
    float riftLane = exp(-pow(absB / 0.048, 2.0)) * riftZone * smoothstep(0.32, 0.76, fineDust);

    float intensity = planeProfile * (0.48 + cloudNoise * 0.78) * (1.0 - 0.68 * riftLane);
    intensity += planeProfile * bulge * 0.34;

    vec3 outerArmColor = vec3(0.38, 0.56, 0.92);
    vec3 coreBulgeColor = vec3(0.95, 0.78, 0.56);
    vec3 skyBandColor = mix(outerArmColor, coreBulgeColor, clamp(bulge * 1.15, 0.0, 1.0));

    float alpha = clamp(intensity * 0.42 * horizonFade * uVisibility, 0.0, 0.62);
    gl_FragColor = vec4(skyBandColor * alpha, alpha);
  }
`;

export const MilkyWay3D: React.FC<MilkyWay3DProps> = ({
  visible,
  latitudeDeg,
  lstDeg,
  visibility,
}) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uLatRad: { value: degToRad(latitudeDeg) },
      uLstRad: { value: degToRad(lstDeg) },
      uVisibility: { value: visibility },
    }),
    []
  );

  useEffect(() => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uLatRad.value = degToRad(latitudeDeg);
    mat.uniforms.uLstRad.value = degToRad(lstDeg);
    mat.uniforms.uVisibility.value = visibility;
  }, [latitudeDeg, lstDeg, visibility]);

  if (!visible || visibility <= 0.02) return null;

  return (
    <mesh renderOrder={-5}>
      <sphereGeometry args={[DOME_RADIUS * 1.06, 48, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={milkyWayVertexShader}
        fragmentShader={milkyWayFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
