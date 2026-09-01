import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/** Reads the theme already applied to <html> by the inline anti-flash script in __root.tsx. */
function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* localStorage unavailable (private mode, disabled storage) — theme still applies for this load */
  }
}

/** Client-side dark/light theme state, persisted to localStorage and synced across tabs. */
export function useTheme() {
  // Keep the first render identical on the server and client. The inline
  // anti-flash script may already have changed <html> before hydration, so
  // reading the DOM in the state initializer would produce different markup.
  const [theme, setTheme] = useState<Theme>("light");

  // Pick up the class the anti-flash script already set once we hydrate.
  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  // Keep multiple tabs/windows in sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        applyTheme(e.newValue);
        setTheme(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return { theme, toggleTheme };
}
