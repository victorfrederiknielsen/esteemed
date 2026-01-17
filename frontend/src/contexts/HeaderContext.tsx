import { type ReactNode, createContext, useContext, useState } from "react";

export interface Breadcrumb {
  label: string;
  href?: string;
  element?: ReactNode;
}

interface HeaderContextValue {
  breadcrumbs: Breadcrumb[];
  setBreadcrumbs: (crumbs: Breadcrumb[]) => void;
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
}

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [actions, setActions] = useState<ReactNode>(null);

  return (
    <HeaderContext.Provider
      value={{ breadcrumbs, setBreadcrumbs, actions, setActions }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}
