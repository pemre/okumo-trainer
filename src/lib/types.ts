export interface WordItem {
  id: string;
  nl: string;
  en: string;
  tr: string;
  zin: string;
  zin_tr: string;
  synoniem: string;
  type: "woord" | "ifade";
  bron: string;
  eksik: string[];
}

export interface Connective {
  id: string;
  nl: string;
  en: string;
  tr: string;
  functie: string;
  zin: string;
  zin_tr: string;
  auto?: boolean;
}

export interface Verb {
  id: string;
  inf: string;
  vt: string;
  vt_mv: string;
  voltooid: string;
  familie: string;
  familie_adi: string;
  tr: string;
  en: string;
}

export interface CardState {
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  due: string;
  lastSeen: string | null;
  /** Son güncelleme (epoch ms) — cihazlar arası birleştirmede hangi tarafın yeni olduğunu belirler. */
  at: number;
}

export interface Progress {
  version: 1;
  cards: Record<string, CardState>;
  xp: number;
  streak: number;
  bestStreak: number;
  lastDay: string | null;
  daysPlayed: string[];
  /** Gün başına kazanılan XP (YYYY-MM-DD → XP); grafik ve ısı haritası buradan beslenir. */
  daily: Record<string, number>;
  sessions: number;
  /** Son yerel değişiklik zamanı (epoch ms). */
  updatedAt: number;
}

export type ModeId = "match" | "choice" | "type" | "scramble" | "connect" | "verbs";

/** 0 = bilemedim, 1 = zor, 2 = iyi, 3 = kolay */
export type Grade = 0 | 1 | 2 | 3;
