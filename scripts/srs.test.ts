import { describe, expect, test } from "bun:test";
import {
  buildOptions,
  checkTyped,
  dayKey,
  emptyCard,
  normalizeAnswer,
  pickSession,
  review,
} from "../src/lib/srs.ts";
import type { CardState } from "../src/lib/types.ts";

describe("aralıklı tekrar", () => {
  test("doğru cevap aralığı büyütür, yanlış cevap sıfırlar", () => {
    let card = emptyCard("2026-09-23");
    card = review(card, 2, new Date("2026-09-23T10:00:00"));
    expect(card.reps).toBe(1);
    expect(card.interval).toBe(1);
    expect(card.due).toBe("2026-09-24");

    card = review(card, 2, new Date("2026-09-24T10:00:00"));
    expect(card.interval).toBe(3);

    const before = card.interval;
    card = review(card, 2, new Date("2026-09-27T10:00:00"));
    expect(card.interval).toBeGreaterThan(before);

    const lapsed = review(card, 0, new Date("2026-09-30T10:00:00"));
    expect(lapsed.reps).toBe(0);
    expect(lapsed.interval).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.due).toBe("2026-09-30");
    expect(lapsed.ease).toBeLessThan(card.ease);
  });

  test("kolay cevap zoru geçer, ease tabanı 1.3'ün altına inmez", () => {
    let hard = emptyCard("2026-09-23");
    let easy = emptyCard("2026-09-23");
    for (let i = 0; i < 3; i++) {
      hard = review(hard, 1, new Date("2026-09-23T10:00:00"));
      easy = review(easy, 3, new Date("2026-09-23T10:00:00"));
    }
    expect(easy.ease).toBeGreaterThan(hard.ease);
    for (let i = 0; i < 20; i++) hard = review(hard, 0, new Date("2026-09-23T10:00:00"));
    expect(hard.ease).toBe(1.3);
  });
});

describe("oturum seçimi", () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ id: `i${i}` }));

  test("vadesi gelenler öne alınır, istenen sayıda ve tekrarsız döner", () => {
    const cards: Record<string, CardState> = {
      i5: { ...emptyCard("2026-09-20"), reps: 3, due: "2026-09-21", lapses: 2 },
      i6: { ...emptyCard("2026-09-20"), reps: 1, due: "2026-09-22", lapses: 0 },
      i7: { ...emptyCard("2026-09-20"), reps: 4, due: "2026-09-25", lapses: 0 },
    };
    const picked = pickSession(items, cards, 6, new Date("2026-09-23T09:00:00"), () => 0.5);
    expect(picked.length).toBe(6);
    expect(new Set(picked.map((p) => p.id)).size).toBe(6);
    expect(picked[0].id).toBe("i5");
    expect(picked[1].id).toBe("i6");
    expect(picked.some((p) => p.id === "i7")).toBe(false);
  });

  test("havuz küçükse eldeki kadar döner", () => {
    const picked = pickSession(items.slice(0, 2), {}, 10, new Date("2026-09-23T09:00:00"));
    expect(picked.length).toBe(2);
  });
});

describe("yazma cevabı denetimi", () => {
  test("büyük/küçük harf, noktalama ve de/het hoşgörülür", () => {
    expect(checkTyped("  Bereiken. ", "bereiken")).toBe(true);
    expect(checkTyped("het aanbod", "aanbod")).toBe(true);
    expect(checkTyped("aanbod", "het aanbod")).toBe(true);
    expect(checkTyped("bereik", "bereiken")).toBe(false);
    expect(checkTyped("", "bereiken")).toBe(false);
    expect(normalizeAnswer("  Ik  BEN  klaar! ")).toBe("ik ben klaar");
    expect(dayKey(new Date("2026-09-23T23:30:00"))).toBe("2026-09-23");
  });
});

describe("çoktan seçmeli şıklar", () => {
  test("doğru cevap şıkların içinde, şıklar benzersiz", () => {
    const pool = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];
    const opts = buildOptions(
      pool[0],
      pool,
      (x) => x.id,
      () => 0.42,
      4,
    );
    expect(opts.length).toBe(4);
    expect(new Set(opts.map((o) => o.id)).size).toBe(4);
    expect(opts.some((o) => o.id === "a")).toBe(true);
  });
});
