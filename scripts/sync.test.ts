// Contract of the merge logic between two devices (see README → "Progress and syncing").
import { describe, expect, test } from "bun:test";
import { emptyCard } from "../src/lib/srs";
import { mergeProgress, newDeckIds, normalizeProgress } from "../src/lib/sync";
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
  test("per card the newest update wins", () => {
    const local = base({ cards: { appel: card(1000, 4) }, updatedAt: 1000 });
    const remote = base({ cards: { appel: card(2000, 9) }, updatedAt: 2000 });
    const merged = mergeProgress(local, remote);
    expect(merged.cards.appel.interval).toBe(9);
    expect(mergeProgress(remote, local).cards.appel.interval).toBe(9); // order-independent
  });
  test("cards that exist on one side only are kept", () => {
    const local = base({ cards: { a: card(1) } });
    const remote = base({ cards: { b: card(2) } });
    expect(Object.keys(mergeProgress(local, remote).cards).sort()).toEqual(["a", "b"]);
  });
  test("counters: max XP, union of days, streak from the newer side", () => {
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
  test("daily XP: the max per day wins, missing days stay missing", () => {
    const local = base({ daily: { "2026-09-20": 40, "2026-09-21": 10 }, updatedAt: 5 });
    const remote = base({ daily: { "2026-09-21": 80, "2026-09-22": 5 }, updatedAt: 9 });
    const merged = mergeProgress(local, remote);
    expect(merged.daily).toEqual({ "2026-09-20": 40, "2026-09-21": 80, "2026-09-22": 5 });
    expect(mergeProgress(remote, local).daily).toEqual(merged.daily); // order-independent
  });
});

describe("newDeckIds", () => {
  test("first launch is silent: with no stamp nothing counts as new", () => {
    expect(newDeckIds(null, ["a", "b"])).toEqual([]);
    expect(newDeckIds(undefined, ["a"])).toEqual([]);
    expect(newDeckIds("bozuk kayıt", ["a"])).toEqual([]);
  });
  test("only later additions are returned, order follows the deck", () => {
    expect(newDeckIds(["a", "b"], ["b", "c", "a", "d"])).toEqual(["c", "d"]);
    expect(newDeckIds(["a", "b"], ["a", "b"])).toEqual([]);
  });
  test("when the deck shrinks the leftovers are not new", () => {
    expect(newDeckIds(["a", "b", "c"], ["a"])).toEqual([]);
  });
});

describe("normalizeProgress", () => {
  test("corrupt/incomplete stamp is rejected", () => {
    expect(normalizeProgress(null)).toBeNull();
    expect(
      normalizeProgress({ version: 2, xp: 1, streak: 0, cards: {}, daysPlayed: [] }),
    ).toBeNull();
    expect(normalizeProgress("ilerleme")).toBeNull();
  });
  test("missing fields get filled in", () => {
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
    expect(normalized?.daily).toEqual({}); // old progress files have no daily XP → empty
  });
  test("daily XP is sanitised: non-numeric and negative entries are dropped", () => {
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
