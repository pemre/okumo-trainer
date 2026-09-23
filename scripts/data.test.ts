// Veri katmanı sözleşmeleri: notlardan üretilen JSON'lar her zaman oyuna hazır olmalı.
// (CI'da vault yok; bu yüzden repodaki üretilmiş veri denetlenir.)
import { describe, expect, test } from "bun:test";
import connectieven from "../src/data/connectieven.json";
import werkwoorden from "../src/data/werkwoorden.json";
import woorden from "../src/data/woorden.json";

describe("woorden.json", () => {
  test("kayıtların hepsi oynanabilir: çeviri var, id benzersiz", () => {
    expect(woorden.items.length).toBeGreaterThan(70);
    const ids = new Set<string>();
    for (const item of woorden.items) {
      expect(item.nl.length).toBeGreaterThan(1);
      expect(item.tr.length + item.en.length).toBeGreaterThan(0);
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
    }
  });

  test("kaynak notların üçü de temsil ediyor ve çoğunun örnek cümlesi var", () => {
    const bronnen = new Set(woorden.items.map((i) => i.bron));
    expect(bronnen.size).toBe(3);
    const withSentence = woorden.items.filter((i) => i.zin.length > 3).length;
    expect(withSentence / woorden.items.length).toBeGreaterThan(0.8);
  });

  test("eksik alan bırakılmamış (notlar tek doğruluk kaynağı)", () => {
    const eksik = woorden.items.filter((i) => i.eksik.length > 0);
    expect(eksik.map((i) => `${i.nl}:${i.eksik}`)).toEqual([]);
  });

  test("her kaynağın, dosyayı açan bir obsidian:// bağlantısı var", () => {
    for (const s of woorden.meta.sources) {
      expect(s.obsidian.startsWith("obsidian://open?vault=")).toBe(true);
      expect(decodeURIComponent(s.obsidian)).toContain(s.file);
    }
  });
});

describe("connectieven.json", () => {
  test("her bağlacın anlamı, işlevi ve onu kullanan bir örnek cümlesi var", () => {
    expect(connectieven.items.length).toBeGreaterThanOrEqual(5);
    for (const c of connectieven.items) {
      expect(c.tr.length).toBeGreaterThan(1);
      expect(c.en.length).toBeGreaterThan(1);
      expect(c.functie.length).toBeGreaterThan(1);
      expect(c.zin.toLowerCase()).toContain(c.nl.toLowerCase().split(" ")[0]);
    }
  });

  test("bu haftanın bağlaçları içeride", () => {
    const ids = connectieven.items.map((c) => c.id);
    for (const want of ["enerzijds", "daardoor", "daarentegen", "bovendien", "daarvoor"]) {
      expect(ids).toContain(want);
    }
  });
});

describe("werkwoorden.json", () => {
  test("fiiller çekimleriyle ve aileleriyle birlikte geldi", () => {
    expect(werkwoorden.items.length).toBeGreaterThan(200);
    const incomplete = werkwoorden.items.filter((v) => !v.vt || !v.voltooid);
    expect(incomplete.map((v) => v.inf)).toEqual([]);
    expect(new Set(werkwoorden.items.map((v) => v.familie)).size).toBeGreaterThanOrEqual(10);
  });
});
