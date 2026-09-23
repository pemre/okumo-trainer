// Soru üreticilerinin sözleşmesi: her mod soru üretir, her sorunun cevabı uygulamanın kendi
// denetiminden geçer. ("Kontrol et" düğmesi formu göndermiyordu → bu testler cevap tarafını,
// tarayıcı duman testi ise düğme tarafını korur; ikisi birlikte regresyonu yakalar.)
import { describe, expect, test } from "bun:test";
import { buildQuestions } from "../src/games/questions";
import { words } from "../src/lib/data";
import { FAMILIE_EN, type Lang } from "../src/lib/i18n";
import { checkAnswer } from "../src/lib/srs";
import type { ModeId } from "../src/lib/types";

const MODES: ModeId[] = ["choice", "type", "scramble", "connect", "verbs"];
const SIZE = 10;
const TR: Lang[] = ["tr"];
const EN: Lang[] = ["en"];
const IKISI: Lang[] = ["tr", "en"];
/** Arayüzün kullandığı kuralın aynısı: asıl cevap + alternatifler. */
const accepted = (answer: string, alternatives: string[] | undefined) => [
  answer,
  ...(alternatives ?? []),
];
const alan = (k: "nl" | "en" | "tr") => new Set(words.map((w) => w[k]));

describe("soru üretimi", () => {
  for (const mode of MODES) {
    const questions = buildQuestions(mode, SIZE, {}, IKISI);

    test(`${mode}: tur dolu ve kimlikler benzersiz`, () => {
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(SIZE);
      expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    });

    test(`${mode}: her cevap boş değil ve uygulamanın kabul kuralından geçiyor`, () => {
      for (const q of questions) {
        expect(q.answer.trim().length, `${mode} / ${q.id} cevapsız`).toBeGreaterThan(0);
        const acceptedInputs = accepted(q.answer, q.alternatives);
        for (const input of acceptedInputs) {
          expect(
            checkAnswer(input, acceptedInputs),
            `${mode} / ${q.id} kabul edilmiyor: ${input}`,
          ).toBe(true);
        }
        expect(
          checkAnswer("zzzz", acceptedInputs),
          `${mode} / ${q.id} yanlış cevabı kabul etti`,
        ).toBe(false);
      }
    });
  }

  test("çoktan seçmeli: doğru cevap şıkların içinde, şıklar benzersiz", () => {
    for (const q of buildQuestions("choice", SIZE, {}, IKISI)) {
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(q.options?.length ?? 0);
    }
  });

  test("cümle dizme: çipler cümleyi birebir kurar, cümle en az 4 kelime", () => {
    for (const q of buildQuestions("scramble", SIZE, {}, IKISI)) {
      const chips = [...(q.words ?? [])].sort();
      const target = q.answer.split(/\s+/).sort();
      expect(chips).toEqual(target);
      expect(target.length).toBeGreaterThanOrEqual(4);
    }
  });

  test("fiil çekimi: cevap istenen forma ait", () => {
    for (const q of buildQuestions("verbs", SIZE, {}, IKISI)) {
      expect(q.id.startsWith("v:")).toBe(true);
      expect(q.answer.split(/\s+/).length).toBeLessThanOrEqual(3);
    }
  });
});

// Arayüz dilleri kapalıysa o dil sorularda/ipuçlarında hiç görünmemeli (3 dilli sözleşmenin çekirdeği).
describe("dil seçimi", () => {
  test("tek dil TR: sorular yalnız NL ↔ TR yönünde, İngilizce anlam geçmez", () => {
    const sorular = buildQuestions("choice", SIZE, {}, TR);
    const tr = alan("tr");
    const nl = alan("nl");
    const en = alan("en");
    expect(sorular.length).toBeGreaterThan(0);
    for (const q of sorular) {
      expect(tr.has(q.answer) || nl.has(q.answer), `beklenmeyen cevap: ${q.answer}`).toBe(true);
      expect(en.has(q.answer) && !tr.has(q.answer), `İngilizce şık: ${q.answer}`).toBe(false);
    }
    expect(sorular.some((q) => tr.has(q.answer))).toBe(true);
    expect(sorular.some((q) => nl.has(q.answer))).toBe(true);
  });

  test("tek dil EN: sorular yalnız NL ↔ EN yönünde, Türkçe anlam geçmez", () => {
    const sorular = buildQuestions("choice", SIZE, {}, EN);
    const en = alan("en");
    const nl = alan("nl");
    const tr = alan("tr");
    for (const q of sorular) {
      expect(en.has(q.answer) || nl.has(q.answer), `beklenmeyen cevap: ${q.answer}`).toBe(true);
      expect(tr.has(q.answer) && !en.has(q.answer), `Türkçe şık: ${q.answer}`).toBe(false);
    }
    expect(sorular.some((q) => en.has(q.answer))).toBe(true);
  });

  test("EN: yön ipucu İngilizce, arayüz metinleri iki dilli birleşir", () => {
    const sadeceEn = buildQuestions("type", SIZE, {}, EN);
    expect(sadeceEn.every((q) => q.promptSub?.includes("type it in Dutch"))).toBe(true);
    const iki = buildQuestions("type", SIZE, {}, IKISI);
    expect(iki.every((q) => (q.promptSub ?? "").includes(" · "))).toBe(true);
  });

  test("fiil ipucu: EN'de aile adı İngilizce (sözlükte karşılığı olmalı)", () => {
    const aileler = Object.values(FAMILIE_EN);
    for (const q of buildQuestions("verbs", SIZE, {}, EN)) {
      expect(aileler, `çevrilmemiş aile: ${q.hint}`).toContain(q.hint);
    }
  });

  test("bağlaç: işlev ipucu veride yalnız Türkçe → TR kapalıyken gösterilmez", () => {
    const en = buildQuestions("connect", SIZE, {}, EN);
    expect(en.every((q) => q.promptSub === undefined)).toBe(true);
    const tr = buildQuestions("connect", SIZE, {}, TR);
    expect(tr.every((q) => q.promptSub?.startsWith("İşlev: "))).toBe(true);
  });
});
