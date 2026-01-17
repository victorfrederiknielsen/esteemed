import { useTilt3D } from "@/hooks/useTilt3D";
import type { ReactNode } from "react";

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

  return (
    <div
      ref={ref}
      className={className}
      style={enabled ? style : undefined}
    >
      {children}
    </div>
  );
}
