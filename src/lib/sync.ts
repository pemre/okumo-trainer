// Merges two devices' progress: per card the newest wins, counters are preserved.
// Pure function — the network layer lives in store.ts.
import type { CardState, Progress } from "./types";

const emptyCards = (): Record<string, CardState> => ({});

/**
 * Daily XP merge: the LARGEST value per day wins (same rule as the XP counter).
 * ponytail: ceiling — XP earned by two devices on the same day is not summed; it under-counts
 * rather than double-counts. Per-device separation would need a device id plus a sum per day.
 */
function mergeDaily(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const merged: Record<string, number> = { ...a };
  for (const [day, xp] of Object.entries(b ?? {})) merged[day] = Math.max(merged[day] ?? 0, xp);
  return merged;
}

export function mergeProgress(local: Progress, remote: Progress): Progress {
  const cards = emptyCards();
  for (const id of new Set([...Object.keys(local.cards), ...Object.keys(remote.cards)])) {
    const a = local.cards[id];
    const b = remote.cards[id];
    if (!a) cards[id] = b;
    else if (!b) cards[id] = a;
    else cards[id] = (a.at ?? 0) >= (b.at ?? 0) ? a : b;
  }
  const localNewer = (local.updatedAt ?? 0) >= (remote.updatedAt ?? 0);
  const newer = localNewer ? local : remote;
  const older = localNewer ? remote : local;
  return {
    ...newer,
    cards,
    xp: Math.max(local.xp, remote.xp),
    bestStreak: Math.max(local.bestStreak, remote.bestStreak),
    sessions: Math.max(local.sessions, remote.sessions),
    daysPlayed: [...new Set([...local.daysPlayed, ...remote.daysPlayed])].sort(),
    daily: mergeDaily(local.daily ?? {}, remote.daily ?? {}),
    streak: newer.streak || older.streak,
    lastDay: newer.lastDay ?? older.lastDay ?? null,
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
  };
}

/**
 * Compares the deck a device last saw with the current one: only later additions are returned.
 * With no stamp (first launch, cleared storage) it is taken as the baseline silently — no popup.
 */
export function newDeckIds(seen: unknown, all: string[]): string[] {
  if (!Array.isArray(seen)) return [];
  const known = new Set(seen as string[]);
  return all.filter((id) => !known.has(id));
}

/** Size limit for the body sent to the server (stays small however the card count grows). */
export const MAX_PROGRESS_BYTES = 512 * 1024;

export function isValidProgress(value: unknown): value is Progress {
  if (!value || typeof value !== "object") return false;
  const p = value as Progress;
  return (
    p.version === 1 &&
    typeof p.xp === "number" &&
    typeof p.streak === "number" &&
    !!p.cards &&
    typeof p.cards === "object" &&
    Array.isArray(p.daysPlayed)
  );
}

/** Sanitises the daily XP record: non-numeric, infinite or negative entries are dropped. */
function sanitizeDaily(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [day, xp] of Object.entries(value as Record<string, unknown>)) {
    if (typeof xp === "number" && Number.isFinite(xp) && xp > 0) out[day] = xp;
  }
  return out;
}

/** Makes old/corrupt progress with missing fields playable again. */
export function normalizeProgress(value: unknown): Progress | null {
  if (!isValidProgress(value)) return null;
  return {
    version: 1,
    cards: value.cards,
    xp: value.xp,
    streak: value.streak,
    bestStreak: value.bestStreak ?? value.streak,
    lastDay: value.lastDay ?? null,
    daysPlayed: value.daysPlayed,
    daily: sanitizeDaily(value.daily),
    sessions: value.sessions ?? 0,
    updatedAt: value.updatedAt ?? 0,
  };
}
