import { THEMES, type ThemeVariables } from "@/lib/themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTheme } from "./ThemeContext";

interface ColorThemeContextValue {
  colorTheme: string;
  setColorTheme: (theme: string) => void;
}

const ColorThemeContext = createContext<ColorThemeContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "esteemed-color-theme";

function getStoredColorTheme(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && THEMES[stored]) {
    return stored;
  }
  return "default";
}

function applyThemeVariables(variables: ThemeVariables): void {
  const root = document.documentElement;

  root.style.setProperty("--background", variables.background);
  root.style.setProperty("--foreground", variables.foreground);
  root.style.setProperty("--card", variables.card);
  root.style.setProperty("--card-foreground", variables.cardForeground);
  root.style.setProperty("--popover", variables.popover);
  root.style.setProperty("--popover-foreground", variables.popoverForeground);
  root.style.setProperty("--primary", variables.primary);
  root.style.setProperty("--primary-foreground", variables.primaryForeground);
  root.style.setProperty("--secondary", variables.secondary);
  root.style.setProperty(
    "--secondary-foreground",
    variables.secondaryForeground,
  );
  root.style.setProperty("--muted", variables.muted);
  root.style.setProperty("--muted-foreground", variables.mutedForeground);
  root.style.setProperty("--accent", variables.accent);
  root.style.setProperty("--accent-foreground", variables.accentForeground);
  root.style.setProperty("--destructive", variables.destructive);
  root.style.setProperty("--border", variables.border);
  root.style.setProperty("--input", variables.input);
  root.style.setProperty("--ring", variables.ring);
  root.style.setProperty("--success", variables.success);
  root.style.setProperty("--warning", variables.warning);
  root.style.setProperty("--radius", variables.radius);
}

export function ColorThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const [colorTheme, setColorThemeState] =
    useState<string>(getStoredColorTheme);

  // Apply theme variables whenever colorTheme or resolvedTheme changes
  useEffect(() => {
    const theme = THEMES[colorTheme] ?? THEMES.default;
    const variables = resolvedTheme === "dark" ? theme.dark : theme.light;
    applyThemeVariables(variables);
  }, [colorTheme, resolvedTheme]);

  const setColorTheme = useCallback((newTheme: string) => {
    if (THEMES[newTheme]) {
      setColorThemeState(newTheme);
      localStorage.setItem(STORAGE_KEY, newTheme);
    }
  }, []);

  const value = useMemo(
    () => ({ colorTheme, setColorTheme }),
    [colorTheme, setColorTheme],
  );

  return (
    <ColorThemeContext.Provider value={value}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (context === undefined) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider");
  }
  return context;
}
