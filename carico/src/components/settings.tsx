"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatWeight, type WeightUnit } from "@/lib/units";

export type ThemePref = "system" | "light" | "dark";

interface Settings {
  theme: ThemePref;
  unit: WeightUnit;
  /** true dopo aver letto le preferenze dal dispositivo. */
  ready: boolean;
  setTheme: (t: ThemePref) => void;
  setUnit: (u: WeightUnit) => void;
}

export const THEME_KEY = "carico:theme";
export const UNIT_KEY = "carico:unit";

const SettingsContext = createContext<Settings | null>(null);

function readStorage<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0e0f11" : "#f3f1ec");
}

/** Preferenze del dispositivo (tema e unità): restano sul telefono, ma sono incluse nel backup. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [unit, setUnitState] = useState<WeightUnit>("kg");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Lettura iniziale da localStorage (non disponibile durante il rendering lato server).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(readStorage(THEME_KEY, ["system", "light", "dark"] as const, "system"));
    setUnitState(readStorage(UNIT_KEY, ["kg", "lb"] as const, "kg"));
    setReady(true);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  }, []);
  const setUnit = useCallback((u: WeightUnit) => {
    setUnitState(u);
    try {
      localStorage.setItem(UNIT_KEY, u);
    } catch {}
  }, []);

  const value = useMemo(() => ({ theme, unit, ready, setTheme, setUnit }), [theme, unit, ready, setTheme, setUnit]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings va usato dentro SettingsProvider");
  return ctx;
}

/** Mostra un peso (salvato in kg) nell'unità scelta dall'utente. */
export function Weight({ kg, fallback = "–" }: { kg: number | null | undefined; fallback?: string }) {
  const { unit } = useSettings();
  if (kg === null || kg === undefined) return <>{fallback}</>;
  return <>{formatWeight(kg, unit)}</>;
}

/** Script inline eseguito prima del rendering per evitare il lampo di tema sbagliato. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;
