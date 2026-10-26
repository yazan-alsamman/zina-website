"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { BackSide, Color, type Mesh, ShaderMaterial, SphereGeometry } from "three";
import { palette } from "./palette";
import { useDisposable } from "./useDisposable";

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uNight;
  uniform vec3 uGlow;
  uniform float uTime;
  varying vec3 vDir;

  void main() {
    float h = vDir.y;
    vec3 col = mix(uDeep, uNight, smoothstep(-0.55, 0.45, h));

    // A warm, slowly breathing studio glow ahead of the camera.
    vec3 glowDir = normalize(vec3(0.08 * sin(uTime * 0.07), 0.28, -1.0));
    float g = pow(max(dot(vDir, glowDir), 0.0), 5.0);
    col = mix(col, uGlow, g * (0.5 + 0.04 * sin(uTime * 0.3)));

    // Soft floor of darkness so objects read against the ground.
    col *= mix(0.72, 1.0, smoothstep(-0.9, -0.1, h));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Huge inverted sphere that travels with the camera: the mocha-to-sand atmosphere. */
export function Backdrop() {
  const ref = useRef<Mesh>(null);
  const geometry = useDisposable(() => new SphereGeometry(80, 48, 24), []);
  const material = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uDeep: { value: new Color(palette.mocha900) },
          uNight: { value: new Color(palette.mocha) },
          uGlow: { value: new Color(palette.sand) },
          uTime: { value: 0 },
        },
      }),
    [],
  );

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.position.copy(state.camera.position);
    (mesh.material as ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      renderOrder={-1}
      frustumCulled={false}
    />
  );
}
