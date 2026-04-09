import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const THEME_KEY = "seller-signal-theme";

export function useThemePreference() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === "dark" || stored === "light") setTheme(stored);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return [theme, setTheme];
}
