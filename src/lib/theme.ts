/**
 * Theme preference: **the browser/OS decides by default** (`system`); an explicit choice wins and is
 * stored. `system` follows `prefers-color-scheme` live, so the OS can flip at sunset without a reload.
 * The palette itself lives in `styles.css` (`.dark` overrides the same custom properties).
 */
import { useSyncExternalStore } from "react";

export type Tema = "system" | "light" | "dark";

export const TEMALAR: Tema[] = ["system", "light", "dark"];

/** Msgids (Turkish) — the labels are translated through `t()`. */
export const TEMA_ADI: Record<Tema, string> = { system: "Sistem", light: "Açık", dark: "Koyu" };

const KEY = "okumo-trainer/theme";

function load(): Tema {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* no localStorage: follow the system */
  }
  return "system";
}

let tema: Tema = load();
const listeners = new Set<() => void>();

/** Is the dark palette on right now? (`system` asks the browser.) */
export function isDark(): boolean {
  if (tema === "dark") return true;
  if (tema === "light") return false;
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Puts the `dark` class on `<html>`; also tells the UA so form controls follow. */
export function apply(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", isDark());
  document.documentElement.style.colorScheme = isDark() ? "dark" : "light";
}

export function getTema(): Tema {
  return tema;
}

export function setTema(next: Tema): void {
  tema = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* quota full: the choice stands for this session */
  }
  apply();
  for (const l of listeners) l();
}

export function subscribeTema(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTema(): Tema {
  return useSyncExternalStore(subscribeTema, getTema, getTema);
}

/** Resolved palette for the current state: re-renders when the preference (or the OS) changes. */
export function useDark(): boolean {
  useTema();
  return isDark();
}

// Only `system` follows the OS; an explicit light/dark choice ignores the flip.
if (typeof matchMedia === "function") {
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (tema !== "system") return;
    apply();
    for (const l of listeners) l();
  });
}
