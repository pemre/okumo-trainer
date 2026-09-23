// Daily series builder for the heat map and the XP chart. Pure functions (test: scripts/history.test.ts).
// Source: Progress.daily (YYYY-MM-DD → XP earned that day). Missing days are filled with 0, because
// both react-activity-calendar and recharts expect a continuous axis.
import { addDays, dayKey } from "./srs";

export const CHART_DAYS = 30;
export const CALENDAR_DAYS = 364; // 52 hafta
const XP_PER_LEVEL = 30;

export interface DayPoint {
  date: string;
  xp: number;
  /** Heat-map colour level (0-4). */
  level: number;
}

/** Daily XP → level 0-4 (30/60/90/120 XP thresholds). */
export function levelFor(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  return Math.min(4, Math.ceil(xp / XP_PER_LEVEL));
}

/**
 * Series for the last `days` days ending today. Dates advance by calendar day (`addDays`);
 * subtracting milliseconds would shift a day across a DST change.
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

/** Trend line: at each point the average of the last `window` days including itself. */
export function movingAverage(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length);
  });
}

/** react-activity-calendar v3 rows: {date, count, level}. */
export function calendarRows(
  daily: Record<string, number>,
  days: number = CALENDAR_DAYS,
  now: Date = new Date(),
): { date: string; count: number; level: number }[] {
  return dailySeries(daily, days, now).map(({ date, xp, level }) => ({ date, count: xp, level }));
}
