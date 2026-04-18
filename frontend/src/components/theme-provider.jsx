import { createContext, useContext, useEffect, useState } from "react";

const ThemeProviderContext = createContext(undefined);

/**
 * Provides theme context to descendants and synchronizes the current theme with the document root and localStorage.
 *
 * @param {Object} props - Component props.
 * @param {import('react').ReactNode} props.children - React nodes to render inside the provider.
 * @param {'light'|'dark'|'system'} [props.defaultTheme="system"] - Theme to use when no persisted value exists.
 * @param {string} [props.storageKey="vite-ui-theme"] - localStorage key used to persist the selected theme.
 * @returns {JSX.Element} A Context Provider that supplies `{ theme, setTheme }` to its children.
 */
export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "vite-ui-theme",
	...props
}) {
	const [theme, setTheme] = useState(() => {
		try {
			return localStorage.getItem(storageKey) || defaultTheme;
		} catch (error) {
			console.warn("localStorage is not available:", error);
			return defaultTheme;
		}
	});

	useEffect(() => {
		const root = window.document.documentElement;

		root.classList.remove("light", "dark");

		if (theme === "system") {
			const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";

			root.classList.add(systemTheme);
			return;
		}

		root.classList.add(theme);
	}, [theme]);

	const value = {
		theme,
		/**
		 * Sets the theme to the given value and persists it to localStorage.
		 * If saving to localStorage fails, logs a warning to the console.
		 * @param {string} newTheme - The theme to set. Must be either "light", "dark", or "system".
		 */
		setTheme: (newTheme) => {
			try {
				localStorage.setItem(storageKey, newTheme);
			} catch (error) {
				console.warn("Failed to save theme to localStorage:", error);
			}
			setTheme(newTheme);
		},
	};

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

/**
 * Hook that provides the current theme and a function to set the theme.
 * Throws an error if used outside of a ThemeProvider.
 * @returns {Object} An object with the current theme and a function to set the theme.
 * @property {string} theme - The current theme. Must be either "light", "dark", or "system".
 * @property {function} setTheme - Sets the theme to the given value and persists it to localStorage.
 * If saving to localStorage fails, logs a warning to the console.
 * @param {string} newTheme - The theme to set. Must be either "light", "dark", or "system".
 */
export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

	return context;
};
