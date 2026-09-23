// İki cihazın ilerlemesini birleştirir: kart kart en yeni kazanır, sayaçlar korunur.
// Saf fonksiyon — ağ katmanı store.ts'te.
import type { CardState, Progress } from "./types";

const emptyCards = (): Record<string, CardState> => ({});

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
    streak: newer.streak || older.streak,
    lastDay: newer.lastDay ?? older.lastDay ?? null,
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
  };
}

/** Sunucuya gönderilen gövdenin boyut sınırı (kart sayısı büyürse de küçük kalır). */
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

/** Eksik alanlı eski/bozuk kayıtları oynanabilir hale getirir. */
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
    sessions: value.sessions ?? 0,
    updatedAt: value.updatedAt ?? 0,
  };
}
