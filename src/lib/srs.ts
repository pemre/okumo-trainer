// SM-2'den sadeleştirilmiş aralıklı tekrar (okumo'nun "doğru zamanda tekrar" fikri).
import type { CardState, Grade } from "./types";

export const DAY_MS = 86_400_000;

/** Yerel gün anahtarı (YYYY-MM-DD) — saat dilimi kaymasın diye UTC'ye çevrilmiyor. */
export function dayKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function emptyCard(today: string = dayKey(), at = Date.now()): CardState {
  return { ease: 2.3, interval: 0, reps: 0, lapses: 0, due: today, lastSeen: null, at };
}

export function review(card: CardState, grade: Grade, now: Date = new Date()): CardState {
  const today = dayKey(now);
  if (grade === 0) {
    return {
      ...card,
      ease: Math.max(1.3, card.ease - 0.2),
      interval: 0,
      reps: 0,
      lapses: card.lapses + 1,
      due: today, // aynı gün tekrar sorulur
      lastSeen: today,
      at: now.getTime(),
    };
  }
  const ease = clamp(card.ease + (0.1 - (3 - grade) * 0.09), 1.3, 2.8);
  const reps = card.reps + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(Math.max(1, card.interval) * ease);
  return {
    ...card,
    ease,
    reps,
    interval,
    due: dayKey(addDays(now, interval)),
    lastSeen: today,
    at: now.getTime(),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const isDue = (card: CardState | undefined, now: Date = new Date()): boolean =>
  !card || card.due <= dayKey(now);

export function shuffle<T>(list: T[], rand: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Oturum seçimi: vadesi gelmiş kartlar önce, sonra zayıflar (az tekrar / çok hata),
 * sonra hiç görülmemişler. Aynı oturumda tekrar yok.
 */
export function pickSession<T extends { id: string }>(
  items: T[],
  cards: Record<string, CardState>,
  size: number,
  now: Date = new Date(),
  rand: () => number = Math.random,
): T[] {
  const today = dayKey(now);
  const due: T[] = [];
  const weak: T[] = [];
  const fresh: T[] = [];
  for (const item of items) {
    const card = cards[item.id];
    if (!card) fresh.push(item);
    else if (card.due <= today) due.push(item);
    else weak.push(item);
  }
  due.sort(
    (a, b) =>
      cards[b.id].lapses - cards[a.id].lapses || cards[a.id].due.localeCompare(cards[b.id].due),
  );
  weak.sort(
    (a, b) => cards[a.id].reps - cards[b.id].reps || cards[b.id].lapses - cards[a.id].lapses,
  );
  const queue = [...shuffle(due, rand), ...shuffle(fresh, rand), ...weak];
  return queue.slice(0, Math.max(1, Math.min(size, queue.length)));
}

/** Çoktan seçmeli şıklar: doğru cevap + benzerleri. */
export function buildOptions<T>(
  correct: T,
  pool: T[],
  label: (item: T) => string,
  rand: () => number = Math.random,
  count = 4,
): T[] {
  const key = label(correct);
  const others = shuffle(
    pool.filter((p) => label(p) !== key),
    rand,
  ).slice(0, count - 1);
  return shuffle([correct, ...others], rand);
}

/** Yazma alıştırmasında cevabı esnetir: büyük/küçük harf, noktalama, de/het. */
export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,!?;:¿¡"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkTyped(input: string, expected: string): boolean {
  const a = normalizeAnswer(input);
  const b = normalizeAnswer(expected);
  if (!a) return false;
  if (a === b) return true;
  // "de/het/een" iki tarafta da hoşgörülür (kullanıcı fazladan yazmış olabilir)
  const noArticle = (s: string) => s.replace(/^(de|het|een)\s+/, "");
  if (noArticle(a) === noArticle(b)) return true;
  // parantezli ve "/" ayraçlı alternatifler ("(het) aanbod", "klaar / gereed")
  const variants = expected
    .toLowerCase()
    .replace(/[()]/g, "")
    .split(/\s*\/\s*|\s*,\s*(?=[a-z]{3,})/)
    .map(normalizeAnswer)
    .filter(Boolean);
  return variants.includes(a) || variants.map(noArticle).includes(noArticle(a));
}
