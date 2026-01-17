import { useColorTheme } from "@/contexts/ColorThemeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { THEMES, THEME_KEYS, getThemePrimaryColor } from "@/lib/themes";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

function ThemeColorPreview({
  themeKey,
  isDark,
}: {
  themeKey: string;
  isDark: boolean;
}) {
  const primaryColor = getThemePrimaryColor(themeKey, isDark);

  return (
    <span
      className="size-3 rounded-full border border-border/50"
      style={{ backgroundColor: primaryColor }}
      aria-hidden="true"
    />
  );
}

export function AppearanceMenu() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Appearance settings"
          title="Appearance settings"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={colorTheme}
          onValueChange={setColorTheme}
        >
          {THEME_KEYS.map((key) => (
            <DropdownMenuRadioItem key={key} value={key} className="gap-2">
              <ThemeColorPreview themeKey={key} isDark={isDark} />
              {THEMES[key].name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) =>
            setTheme(value as "light" | "dark" | "system")
          }
        >
          <DropdownMenuRadioItem value="light" className="gap-2">
            <Sun className="size-4" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="gap-2">
            <Moon className="size-4" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="gap-2">
            <Monitor className="size-4" />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
