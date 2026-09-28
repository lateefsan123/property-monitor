import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const THEME_KEY = "seller-signal-theme";

export function useThemePreference() {
  const [theme, updateTheme] = useState("light");
  const [ready, setReady] = useState(false);
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  const setTheme = useCallback(value => {
    changed.current = true;
    updateTheme(value);
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_KEY).then(stored => {
      if (active && !changed.current && (stored === "dark" || stored === "light")) updateTheme(stored);
    }).catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (ready) writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(THEME_KEY, theme)).catch(() => {});
  }, [theme, ready]);

  return [theme, setTheme];
}
