import {Canvas, useFrame} from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

export default function BackgroundDot({className}){

    return (
        <Canvas
            className={`!fixed top-0 left-0 ${className}`}
            camera={{ position: [0, 0, 1] }}
        >
            <Particles />
        </Canvas>
    )
}

function Particles() {
  const ref = useRef();

  // Create 5000 random points
  const particles = useMemo(() => {
    const count = 1000;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 4; // Spread out particles
    }

    return positions;
  }, []);

  // Rotate animation
  useFrame((state) => {
    ref.current.rotation.y = state.mouse.x * 0.2;
    ref.current.rotation.x = state.mouse.y * 0.2;

    ref.current.rotation.z += 0.0005;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={particles} stride={3}>
        <PointMaterial
          transparent
          color="rgba(48, 68, 62, 1)"
          size={0.0075}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}