import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "./theme-provider";

/**
 * Render a button that toggles the application theme between "dark" and "light".
 *
 * @returns {JSX.Element} The theme toggle button showing a sun or moon icon and switching the theme on click.
 */
export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      className="cursor-pointer"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
