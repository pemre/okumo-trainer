// İki cihazın ilerlemesini birleştiren mantığın sözleşmesi (bkz. README → "İlerleme ve eşitleme").
import { describe, expect, test } from "bun:test";
import { emptyCard } from "../src/lib/srs";
import { mergeProgress, normalizeProgress } from "../src/lib/sync";
import type { Progress } from "../src/lib/types";

const base = (over: Partial<Progress> = {}): Progress => ({
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
  ...over,
});

const card = (at: number, interval = 1) => ({ ...emptyCard("2026-09-01", at), interval });

describe("mergeProgress", () => {
  test("kart bazında en yeni güncelleme kazanır", () => {
    const local = base({ cards: { appel: card(1000, 4) }, updatedAt: 1000 });
    const remote = base({ cards: { appel: card(2000, 9) }, updatedAt: 2000 });
    const merged = mergeProgress(local, remote);
    expect(merged.cards.appel.interval).toBe(9);
    expect(mergeProgress(remote, local).cards.appel.interval).toBe(9); // sıradan bağımsız
  });
  test("tek tarafta olan kartlar korunur", () => {
    const local = base({ cards: { a: card(1) } });
    const remote = base({ cards: { b: card(2) } });
    expect(Object.keys(mergeProgress(local, remote).cards).sort()).toEqual(["a", "b"]);
  });
  test("sayaçlar: XP en büyük, günler birleşim, seri yeni tarafın", () => {
    const local = base({
      xp: 120,
      streak: 3,
      daysPlayed: ["2026-09-01"],
      lastDay: "2026-09-01",
      updatedAt: 5,
    });
    const remote = base({
      xp: 40,
      streak: 7,
      daysPlayed: ["2026-09-02"],
      lastDay: "2026-09-02",
      updatedAt: 9,
    });
    const merged = mergeProgress(local, remote);
    expect(merged.xp).toBe(120);
    expect(merged.streak).toBe(7);
    expect(merged.daysPlayed).toEqual(["2026-09-01", "2026-09-02"]);
    expect(merged.updatedAt).toBe(9);
  });
  test("günlük XP: gün başına en büyük kazanır, eksik gün korunur", () => {
    const local = base({ daily: { "2026-09-20": 40, "2026-09-21": 10 }, updatedAt: 5 });
    const remote = base({ daily: { "2026-09-21": 80, "2026-09-22": 5 }, updatedAt: 9 });
    const merged = mergeProgress(local, remote);
    expect(merged.daily).toEqual({ "2026-09-20": 40, "2026-09-21": 80, "2026-09-22": 5 });
    expect(mergeProgress(remote, local).daily).toEqual(merged.daily); // sıradan bağımsız
  });
});

describe("normalizeProgress", () => {
  test("bozuk/eksik kayıt reddedilir", () => {
    expect(normalizeProgress(null)).toBeNull();
    expect(
      normalizeProgress({ version: 2, xp: 1, streak: 0, cards: {}, daysPlayed: [] }),
    ).toBeNull();
    expect(normalizeProgress("ilerleme")).toBeNull();
  });
  test("eksik alanlar tamamlanır", () => {
    const normalized = normalizeProgress({
      version: 1,
      xp: 10,
      streak: 2,
      cards: {},
      daysPlayed: [],
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.bestStreak).toBe(2);
    expect(normalized?.sessions).toBe(0);
    expect(normalized?.updatedAt).toBe(0);
    expect(normalized?.daily).toEqual({}); // eski kayıtlarda günlük XP yok → boş
  });
  test("günlük XP temizlenir: sayı olmayan ve negatif girdiler atılır", () => {
    const normalized = normalizeProgress({
      version: 1,
      xp: 10,
      streak: 1,
      cards: {},
      daysPlayed: ["2026-09-20"],
      daily: { "2026-09-20": 40, "2026-09-21": "40", "2026-09-22": -5, "2026-09-23": null },
    });
    expect(normalized?.daily).toEqual({ "2026-09-20": 40 });
  });
});
