import { useTheme } from "@/contexts/ThemeContext";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "./button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    // Cycle: light → dark → system → light
    // But skip states that don't produce a visual change
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";

    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      // Skip "system" if it would look the same as dark
      setTheme(systemTheme === "dark" ? "light" : "system");
    } else {
      // theme === "system"
      // Skip "light" if system is already light (would look the same)
      setTheme(systemTheme === "light" ? "dark" : "light");
    }
  };

  const icon = {
    light: <Sun className="h-4 w-4" />,
    dark: <Moon className="h-4 w-4" />,
    system: <Monitor className="h-4 w-4" />,
  }[theme];

  const label = {
    light: "Light mode",
    dark: "Dark mode",
    system: "System theme",
  }[theme];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      title={label}
      aria-label={label}
    >
      {icon}
    </Button>
  );
}
