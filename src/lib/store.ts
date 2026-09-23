// İlerleme tarayıcıda kalır (okumo'daki "verin sende kalsın" yaklaşımı); JSON olarak dışa aktarılabilir.
// ponytail: tek cihaz varsayımı — cihazlar arası senkron istenirse server.mjs'e /api/progress eklenir.
import { useSyncExternalStore } from "react";
import { dayKey, emptyCard, review } from "./srs";
import type { CardState, Grade, Progress } from "./types";

const KEY = "okumo-trainer/v1";

const empty = (): Progress => ({
  version: 1,
  cards: {},
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastDay: null,
  daysPlayed: [],
  sessions: 0,
});

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Progress;
    return { ...empty(), ...parsed, cards: parsed.cards ?? {} };
  } catch {
    return empty();
  }
}

let cache: Progress | null = null;
const listeners = new Set<() => void>();

export function getProgress(): Progress {
  cache ??= load();
  return cache;
}

function commit(next: Progress) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* kota dolu olsa da oyun devam etsin */
  }
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, getProgress);
}

export function replaceProgress(next: Progress) {
  commit({ ...empty(), ...next });
}

export function resetProgress() {
  commit(empty());
}

/** Bir turda verilen notları karta işler ve XP yazar. */
export function recordSession(grades: Record<string, Grade>, xpGained: number, now = new Date()) {
  const current = getProgress();
  const cards: Record<string, CardState> = { ...current.cards };
  for (const [id, grade] of Object.entries(grades)) {
    const card = cards[id] ?? emptyCard(dayKey(now));
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
    daysPlayed: current.daysPlayed.includes(today) ? current.daysPlayed : [...current.daysPlayed, today],
    sessions: current.sessions + 1,
  });
}

export const levelOf = (xp: number) => Math.floor(xp / 200) + 1;
export const levelProgress = (xp: number) => (xp % 200) / 200;

export function exportProgress(): string {
  return JSON.stringify(getProgress(), null, 2);
}
