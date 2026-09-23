// İki cihazın ilerlemesini birleştirir: kart kart en yeni kazanır, sayaçlar korunur.
// Saf fonksiyon — ağ katmanı store.ts'te.
import type { CardState, Progress } from "./types";

const emptyCards = (): Record<string, CardState> => ({});

/**
 * Gün başına XP birleşimi: gün başına EN BÜYÜK değer kazanır (XP sayacıyla aynı kural).
 * ponytail: tavan — iki cihazın aynı gün kazandığı XP toplanmaz, çift saymak yerine eksik sayar.
 * Cihaz başına ayrım gerekirse kayda cihaz kimliği eklenmeli; o zaman toplam gün bazında alınır.
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
 * Cihazın son gördüğü deste ile şimdiki desteyi karşılaştırır: yalnız sonradan eklenenler döner.
 * Kayıt yoksa (ilk açılış, temizlenmiş depo) sessizce temel alınır — popup çıkmaz.
 */
export function newDeckIds(seen: unknown, all: string[]): string[] {
  if (!Array.isArray(seen)) return [];
  const known = new Set(seen as string[]);
  return all.filter((id) => !known.has(id));
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

/** Günlük XP kaydını temizler: sayı olmayan, sonsuz ya da negatif girdiler atılır. */
function sanitizeDaily(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [day, xp] of Object.entries(value as Record<string, unknown>)) {
    if (typeof xp === "number" && Number.isFinite(xp) && xp > 0) out[day] = xp;
  }
  return out;
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
    daily: sanitizeDaily(value.daily),
    sessions: value.sessions ?? 0,
    updatedAt: value.updatedAt ?? 0,
  };
}
