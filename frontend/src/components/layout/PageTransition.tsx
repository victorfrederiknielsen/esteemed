import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
    >
      {children}
    </div>
  );
}
