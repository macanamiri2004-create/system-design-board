import { useCallback, useEffect, useState } from "react";
import { readPref, writePref } from "../lib/prefs";
import type { ResolvedTheme, ThemePref } from "../types";

const THEME_KEY = "sdb.theme";
const ORDER: ThemePref[] = ["system", "light", "dark"];
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function readThemePref(): ThemePref {
  const stored = readPref(THEME_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function nextThemePref(pref: ThemePref): ThemePref {
  return ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length]!;
}

/** Light, dark, or follow the OS. Sets data-theme on <html> so tokens.css and Excalidraw agree. */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readThemePref);
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches);

  useEffect(() => {
    const query = darkQuery();
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (pref === "system") delete root.dataset.theme;
    else root.dataset.theme = pref;
  }, [pref]);

  const cycle = useCallback(() => {
    setPref((current) => {
      const next = nextThemePref(current);
      writePref(THEME_KEY, next);
      return next;
    });
  }, []);

  const resolved: ResolvedTheme = pref === "system" ? (systemDark ? "dark" : "light") : pref;
  return { pref, resolved, cycle };
}
