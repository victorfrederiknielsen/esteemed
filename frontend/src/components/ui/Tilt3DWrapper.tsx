import { useTilt3D } from "@/hooks/useTilt3D";
import confetti from "canvas-confetti";
import { type ReactNode, useEffect, useRef } from "react";

interface Tilt3DWrapperProps {
  enabled: boolean;
  children: ReactNode;
  className?: string;
}

export function Tilt3DWrapper({
  enabled,
  children,
  className,
}: Tilt3DWrapperProps) {
  const { ref, style } = useTilt3D<HTMLDivElement>(enabled);
  const wasEnabled = useRef(false);

  useEffect(() => {
    if (!enabled) {
      wasEnabled.current = false;
      return;
    }

    const fireConfetti = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 40,
        spread: 80,
        origin: { x, y },
        colors: [
          "#22c55e",
          "#10b981",
          "#06b6d4",
          "#8b5cf6",
          "#ec4899",
          "#f59e0b",
        ],
        startVelocity: 25,
        gravity: 0.8,
        ticks: 120,
        zIndex: 49,
      });
    };

    // Fire initial burst when newly enabled
    if (!wasEnabled.current) {
      wasEnabled.current = true;
      fireConfetti();
    }

    // Periodic confetti
    const interval = setInterval(fireConfetti, 2000);

    return () => clearInterval(interval);
  }, [enabled, ref]);

  return (
    <div ref={ref} className={className} style={enabled ? style : undefined}>
      {enabled && (
        <>
          <span className="consensus-text absolute -top-7 left-1/2 -translate-x-1/2 text-base font-ui font-black tracking-wide z-10">
            CONSENSUS
          </span>
          <span className="consensus-text absolute -bottom-7 left-1/2 -translate-x-1/2 text-base font-ui font-black tracking-wide z-10">
            REACHED
          </span>
        </>
      )}
      {children}
    </div>
  );
}
