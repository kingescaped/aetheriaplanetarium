import type React from 'react';
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

interface CanvasCaptureBridgeProps {
  captureRef?: React.MutableRefObject<(() => HTMLCanvasElement | null) | null>;
}

export const CanvasCaptureBridge: React.FC<CanvasCaptureBridgeProps> = ({ captureRef }) => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    if (!captureRef) return;
    const captureFn = () => {
      gl.render(scene, camera);
      return gl.domElement;
    };
    captureRef.current = captureFn;
    return () => {
      if (captureRef.current === captureFn) {
        captureRef.current = null;
      }
    };
  }, [captureRef, gl, scene, camera]);

  return null;
};
