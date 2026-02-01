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
  const [theme, setTheme] = useState(
    () => localStorage.getItem(storageKey) || defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
