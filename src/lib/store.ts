// Progress: always works locally (localStorage) and syncs with the local server when there is one.
// Without server/internet the game continues unchanged; when it returns, both sides merge.
import { useSyncExternalStore } from "react";
import { dayKey, emptyCard, review } from "./srs";
import { MAX_PROGRESS_BYTES, mergeProgress, newDeckIds, normalizeProgress } from "./sync";
import type { CardState, Grade, Progress } from "./types";

const KEY = "okumo-trainer/v1";
// Relative path: the static site (GitHub Pages) has no such endpoint → falls back to local silently.
const API = "api/progress";
const PUSH_DEBOUNCE = 1500;

const empty = (): Progress => ({
  version: 1,
  cards: {},
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastDay: null,
  daysPlayed: [],
  daily: {},
  sessions: 0,
  updatedAt: 0,
});

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return normalizeProgress(JSON.parse(raw)) ?? empty();
  } catch {
    return empty();
  }
}

let cache: Progress | null = null;
const listeners = new Set<() => void>();
const syncListeners = new Set<() => void>();
export type SyncState = "local" | "synced" | "offline";
let syncState: SyncState = "local";

function setSyncState(next: SyncState) {
  if (syncState === next) return;
  syncState = next;
  for (const l of syncListeners) l();
}

export function getProgress(): Progress {
  cache ??= load();
  return cache;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, getProgress);
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (listener) => {
      syncListeners.add(listener);
      return () => syncListeners.delete(listener);
    },
    () => syncState,
    () => syncState,
  );
}

let timer: ReturnType<typeof setTimeout> | undefined;

function commit(next: Progress, fromSync = false) {
  cache = { ...next, updatedAt: fromSync ? next.updatedAt : Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* kota dolu olsa da oyun devam etsin */
  }
  for (const l of listeners) l();
  if (!fromSync) schedulePush();
}

function schedulePush() {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), PUSH_DEBOUNCE);
}

async function push(progress: Progress): Promise<void> {
  const body = JSON.stringify(progress);
  if (body.length > MAX_PROGRESS_BYTES) return;
  await fetch(API, { method: "PUT", headers: { "content-type": "application/json" }, body });
}

/** Two-way sync with the server: fetch → merge → write back when needed. */
export async function syncNow(): Promise<SyncState> {
  try {
    const res = await fetch(API, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remote = normalizeProgress(await res.json());
    if (!remote) {
      await push(getProgress()); // nothing stored on the server: send the local copy
      setSyncState("synced");
      return syncState;
    }
    const merged = mergeProgress(getProgress(), remote);
    if (JSON.stringify(merged) !== JSON.stringify(getProgress())) commit(merged, true);
    if (JSON.stringify(merged) !== JSON.stringify(remote)) await push(merged);
    setSyncState("synced");
  } catch {
    setSyncState("offline"); // offline: local progress stands
  }
  return syncState;
}

/** Called on load and whenever the connection comes back. */
export function startSync(): () => void {
  void syncNow();
  const onOnline = () => void syncNow();
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}

export function replaceProgress(next: Progress) {
  commit({ ...empty(), ...next });
}

export function resetProgress() {
  commit(empty());
}

/** Applies a round's grades to the card and records XP. */
export function recordSession(grades: Record<string, Grade>, xpGained: number, now = new Date()) {
  const current = getProgress();
  const cards: Record<string, CardState> = { ...current.cards };
  for (const [id, grade] of Object.entries(grades)) {
    const card = cards[id] ?? emptyCard(dayKey(now), now.getTime());
    cards[id] = review(card, grade, now);
  }
  const today = dayKey(now);
  const playedToday = current.lastDay === today;
  const streak = playedToday
    ? current.streak
    : current.lastDay === dayKey(new Date(now.getTime() - 86_400_000))
      ? current.streak + 1
      : 1;
  commit({
    ...current,
    cards,
    xp: current.xp + xpGained,
    streak,
    bestStreak: Math.max(current.bestStreak, streak),
    lastDay: today,
    daysPlayed: current.daysPlayed.includes(today)
      ? current.daysPlayed
      : [...current.daysPlayed, today],
    // Daily XP for the chart and heat map (a round may be +2, hence the addition).
    daily: { ...current.daily, [today]: (current.daily[today] ?? 0) + xpGained },
    sessions: current.sessions + 1,
  });
}

export const levelOf = (xp: number) => Math.floor(xp / 200) + 1;
export const levelProgress = (xp: number) => (xp % 200) / 200;

export function exportProgress(): string {
  return JSON.stringify(getProgress(), null, 2);
}

const DECK_KEY = "okumo-trainer/deck";

/**
 * Returns the records added since the last visit and updates the "last seen deck".
 * Computed once per page: even when StrictMode runs the effect twice the result is the same (the
 * second call does not return an empty list), so the popup never disappears.
 * ponytail: ceiling — the whole id list is kept in localStorage (a few KB); if the deck ever reaches
 * megabytes, switch from ids to a `meta.generated` stamp plus a summary comparison.
 */
let newItems: string[] | undefined;

export function detectNewDeckItems(all: string[]): string[] {
  if (newItems === undefined) {
    let seen: unknown = null;
    try {
      seen = JSON.parse(localStorage.getItem(DECK_KEY) ?? "null");
    } catch {
      /* corrupt stamp: take it as the baseline, no popup */
    }
    newItems = newDeckIds(seen, all);
    try {
      localStorage.setItem(DECK_KEY, JSON.stringify(all));
    } catch {
      /* quota full: detection still works */
    }
  }
  return newItems;
}
