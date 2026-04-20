import { useTheme } from "@frontend/components/theme-provider";
import { Button } from "@frontend/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ModeToggle() {
	const { theme, setTheme } = useTheme();

	const isDark = theme === "dark";

	const toggleTheme = () => {
		setTheme(isDark ? "light" : "dark");
	};

	return (
		<Button
			className="cursor-pointer relative w-9 h-9"
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
		>
			<Sun className="h-[1.2rem] w-[1.2rem]" style={{ display: isDark ? "none" : "block" }} />
			<Moon
				className="h-[1.2rem] w-[1.2rem] absolute inset-0 m-auto"
				style={{ display: isDark ? "block" : "none" }}
			/>
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
