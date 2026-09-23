// Isı haritası ve XP grafiği için günlük seri üretimi. Saf fonksiyonlar (test: scripts/history.test.ts).
// Kaynak: Progress.daily (YYYY-MM-DD → o gün kazanılan XP). Eksik günler 0 ile doldurulur, çünkü
// hem react-activity-calendar hem recharts sürekli bir eksen bekler.
import { addDays, dayKey } from "./srs";

export const CHART_DAYS = 30;
export const CALENDAR_DAYS = 364; // 52 hafta
const XP_PER_LEVEL = 30;

export interface DayPoint {
  date: string;
  xp: number;
  /** Isı haritası renk seviyesi (0-4). */
  level: number;
}

/** Günlük XP → 0-4 seviye (30/60/90/120 XP eşikleri). */
export function levelFor(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  return Math.min(4, Math.ceil(xp / XP_PER_LEVEL));
}

/**
 * Bugünle biten son `days` günün serisi. Tarihler takvim günü üzerinden yürünür (`addDays`),
 * milisaniye çıkarma yaz saati geçişlerinde günü kaydırabilirdi.
 */
export function dailySeries(
  daily: Record<string, number>,
  days: number,
  now: Date = new Date(),
): DayPoint[] {
  const points: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(addDays(now, -i));
    const xp = daily[date] ?? 0;
    points.push({ date, xp, level: levelFor(xp) });
  }
  return points;
}

/** Grafikteki eğilim çizgisi: her noktada kendisi dâhil son `window` günün ortalaması. */
export function movingAverage(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length);
  });
}

/** react-activity-calendar v3 satırları: {date, count, level}. */
export function calendarRows(
  daily: Record<string, number>,
  days: number = CALENDAR_DAYS,
  now: Date = new Date(),
): { date: string; count: number; level: number }[] {
  return dailySeries(daily, days, now).map(({ date, xp, level }) => ({ date, count: xp, level }));
}
