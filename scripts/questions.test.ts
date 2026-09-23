// Soru üreticilerinin sözleşmesi: her mod soru üretir, her sorunun cevabı uygulamanın kendi
// denetiminden geçer. ("Kontrol et" düğmesi formu göndermiyordu → bu testler cevap tarafını,
// tarayıcı duman testi ise düğme tarafını korur; ikisi birlikte regresyonu yakalar.)
import { describe, expect, test } from "bun:test";
import { buildQuestions } from "../src/games/questions";
import { checkAnswer } from "../src/lib/srs";
import type { ModeId } from "../src/lib/types";

const MODES: ModeId[] = ["choice", "type", "scramble", "connect", "verbs"];
const SIZE = 10;
/** Arayüzün kullandığı kuralın aynısı: asıl cevap + alternatifler. */
const accepted = (answer: string, alternatives: string[] | undefined) => [
  answer,
  ...(alternatives ?? []),
];

describe("soru üretimi", () => {
  for (const mode of MODES) {
    const questions = buildQuestions(mode, SIZE, {});

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
    for (const q of buildQuestions("choice", SIZE, {})) {
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(q.options?.length ?? 0);
    }
  });

  test("cümle dizme: çipler cümleyi birebir kurar, cümle en az 4 kelime", () => {
    for (const q of buildQuestions("scramble", SIZE, {})) {
      const chips = [...(q.words ?? [])].sort();
      const target = q.answer.split(/\s+/).sort();
      expect(chips).toEqual(target);
      expect(target.length).toBeGreaterThanOrEqual(4);
    }
  });

  test("fiil çekimi: cevap istenen forma ait", () => {
    for (const q of buildQuestions("verbs", SIZE, {})) {
      expect(q.id.startsWith("v:")).toBe(true);
      expect(q.answer.split(/\s+/).length).toBeLessThanOrEqual(3);
    }
  });
});
