import { useTheme } from "@/contexts/ThemeContext";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "./button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
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
