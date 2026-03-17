import { useEffect, useState } from "react";

const DEFAULT_THEME = "light";

export function useThemePreference() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || DEFAULT_THEME);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return [theme, setTheme];
}
