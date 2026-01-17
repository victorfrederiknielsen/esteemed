import { useCallback, useEffect, useRef, useState } from "react";

interface TiltState {
  rotateX: number;
  rotateY: number;
}

export function useTilt3D<T extends HTMLElement = HTMLElement>(
  enabled: boolean,
  maxTilt = 15,
) {
  const ref = useRef<T>(null);
  const [tilt, setTilt] = useState<TiltState>({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current || !enabled) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate angle from card center to mouse
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Distance from center (in pixels)
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Normalize direction
      const dirX = distance > 0 ? deltaX / distance : 0;
      const dirY = distance > 0 ? deltaY / distance : 0;

      // Scale factor: more tilt as mouse gets farther, maxes out at ~300px away
      const scale = Math.min(1, distance / 300);

      // RotateY for horizontal movement, rotateX for vertical (inverted)
      setTilt({
        rotateY: dirX * maxTilt * scale,
        rotateX: -dirY * maxTilt * scale,
      });
    },
    [enabled, maxTilt],
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0 });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setTilt({ rotateX: 0, rotateY: 0 });
      return;
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [enabled, handleMouseMove]);

  const style: React.CSSProperties = {
    transform: `perspective(600px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(1.1)`,
    transition: "transform 0.1s ease-out",
  };

  return { ref, style, handleMouseLeave };
}
