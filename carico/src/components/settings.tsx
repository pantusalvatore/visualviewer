"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { formatWeight, type WeightUnit } from "@/lib/units";

/**
 * Preferenze del dispositivo (tema e unità): restano sul telefono e sono incluse nel backup.
 * Sono uno store esterno letto con useSyncExternalStore: durante l'idratazione React usa
 * i valori del server e aggiorna solo i componenti interessati subito dopo, senza
 * aggiornare un contesto alla radice mentre la pagina sta ancora idratando.
 */

export type ThemePref = "system" | "light" | "dark";
import { THEME_KEY, UNIT_KEY } from "@/lib/settings-keys";

export { THEME_KEY, UNIT_KEY };

const DEFAULTS = { theme: "system" as ThemePref, unit: "kg" as WeightUnit };
const listeners = new Set<() => void>();

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY || e.key === UNIT_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getTheme = () => read(THEME_KEY, ["system", "light", "dark"] as const, DEFAULTS.theme);
const getUnit = () => read(UNIT_KEY, ["kg", "lb"] as const, DEFAULTS.unit);
const noopSubscribe = () => () => {};

export function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0e0f11" : "#f3f1ec");
}

export function useSettings() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => DEFAULTS.theme);
  const unit = useSyncExternalStore(subscribe, getUnit, () => DEFAULTS.unit);
  /** true sul client dopo l'idratazione: le preferenze reali sono disponibili. */
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return {
    theme,
    unit,
    ready,
    setTheme: (t: ThemePref) => write(THEME_KEY, t),
    setUnit: (u: WeightUnit) => write(UNIT_KEY, u),
  };
}

/** Applica il tema scelto e segue il tema di sistema quando è "Automatico". */
function ThemeSync() {
  const { theme } = useSettings();
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);
  return null;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeSync />
      {children}
    </>
  );
}

/** Mostra un peso (salvato in kg) nell'unità scelta dall'utente. */
export function Weight({ kg, fallback = "–" }: { kg: number | null | undefined; fallback?: string }) {
  const { unit } = useSettings();
  // Mai restituire una stringa vuota: un nodo di testo vuoto rompe l'idratazione.
  if (kg === null || kg === undefined) return fallback ? <>{fallback}</> : null;
  return <>{formatWeight(kg, unit)}</>;
}
