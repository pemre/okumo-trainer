// Contract of the question builders: every mode produces questions and every answer passes the
// app's own acceptance rule. (The "Kontrol et" button did not submit the form → these tests guard
// the answer side, the browser smoke test guards the button side; together they catch regressions.)
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
/** Same rule the interface uses: the answer plus its alternatives. */
const accepted = (answer: string, alternatives: string[] | undefined) => [
  answer,
  ...(alternatives ?? []),
];
const alan = (k: "nl" | "en" | "tr") => new Set(words.map((w) => w[k]));

describe("question generation", () => {
  for (const mode of MODES) {
    const questions = buildQuestions(mode, SIZE, {}, IKISI);

    test(`${mode}: the round is full and the ids are unique`, () => {
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(SIZE);
      expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    });

    test(`${mode}: every answer is non-empty and passes the app's acceptance rule`, () => {
      for (const q of questions) {
        expect(q.answer.trim().length, `${mode} / ${q.id} has no answer`).toBeGreaterThan(0);
        const acceptedInputs = accepted(q.answer, q.alternatives);
        for (const input of acceptedInputs) {
          expect(
            checkAnswer(input, acceptedInputs),
            `${mode} / ${q.id} kabul edilmiyor: ${input}`,
          ).toBe(true);
        }
        expect(
          checkAnswer("zzzz", acceptedInputs),
          `${mode} / ${q.id} accepted a wrong answer`,
        ).toBe(false);
      }
    });
  }

  test("multiple choice: the right answer is among the options, options are unique", () => {
    for (const q of buildQuestions("choice", SIZE, {}, IKISI)) {
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(q.options?.length ?? 0);
    }
  });

  test("scramble: the chips build the sentence exactly, sentence has at least 4 words", () => {
    for (const q of buildQuestions("scramble", SIZE, {}, IKISI)) {
      const chips = [...(q.words ?? [])].sort();
      const target = q.answer.split(/\s+/).sort();
      expect(chips).toEqual(target);
      expect(target.length).toBeGreaterThanOrEqual(4);
    }
  });

  test("verb drilling: the answer belongs to the requested form", () => {
    for (const q of buildQuestions("verbs", SIZE, {}, IKISI)) {
      expect(q.id.startsWith("v:")).toBe(true);
      expect(q.answer.split(/\s+/).length).toBeLessThanOrEqual(3);
    }
  });
});

// A disabled interface language must never appear in questions or hints (core of the 3-language contract).
describe("language selection", () => {
  test("TR only: questions ask NL ↔ TR, no English meaning leaks", () => {
    const sorular = buildQuestions("choice", SIZE, {}, TR);
    const tr = alan("tr");
    const nl = alan("nl");
    const en = alan("en");
    expect(sorular.length).toBeGreaterThan(0);
    for (const q of sorular) {
      expect(tr.has(q.answer) || nl.has(q.answer), `beklenmeyen cevap: ${q.answer}`).toBe(true);
      expect(en.has(q.answer) && !tr.has(q.answer), `English option: ${q.answer}`).toBe(false);
    }
    expect(sorular.some((q) => tr.has(q.answer))).toBe(true);
    expect(sorular.some((q) => nl.has(q.answer))).toBe(true);
  });

  test("EN only: questions ask NL ↔ EN, no Turkish meaning leaks", () => {
    const sorular = buildQuestions("choice", SIZE, {}, EN);
    const en = alan("en");
    const nl = alan("nl");
    const tr = alan("tr");
    for (const q of sorular) {
      expect(en.has(q.answer) || nl.has(q.answer), `beklenmeyen cevap: ${q.answer}`).toBe(true);
      expect(tr.has(q.answer) && !en.has(q.answer), `Turkish option: ${q.answer}`).toBe(false);
    }
    expect(sorular.some((q) => en.has(q.answer))).toBe(true);
  });

  test("EN-only: direction hint is English, no bilingual join", () => {
    const sadeceEn = buildQuestions("type", SIZE, {}, EN);
    expect(sadeceEn.every((q) => q.promptSub?.includes("type it in Dutch"))).toBe(true);
    // Both languages on → the prompt text is the PRIORITY language only (no "TR · EN" chrome).
    const iki = buildQuestions("type", SIZE, {}, IKISI);
    expect(iki.every((q) => (q.promptSub ?? "").includes(" · ") === false)).toBe(true);
    expect(iki.every((q) => q.promptSub?.includes("Hollandacasını yaz"))).toBe(true);
  });

  test("verb hint: the family name is English under EN (must exist in the dictionary)", () => {
    const aileler = Object.values(FAMILIE_EN);
    for (const q of buildQuestions("verbs", SIZE, {}, EN)) {
      expect(aileler, `untranslated family: ${q.hint}`).toContain(q.hint);
    }
  });

  test("connectives: the function hint is Turkish-only data → hidden when TR is off", () => {
    const en = buildQuestions("connect", SIZE, {}, EN);
    expect(en.every((q) => q.promptSub === undefined)).toBe(true);
    const tr = buildQuestions("connect", SIZE, {}, TR);
    expect(tr.every((q) => q.promptSub?.startsWith("İşlev: "))).toBe(true);
  });
});

// Priority (langs[0]) decides everything the learner reads first; the secondary language only
// appears in meaning explanations. Directions are never asked in the secondary language.
describe("language priority", () => {
  const EN_ONCE: Lang[] = ["en", "tr"];

  test("priority EN: questions ask NL ↔ EN, Turkish never the answer", () => {
    const tr = alan("tr");
    const en = alan("en");
    const nl = alan("nl");
    const sorular = buildQuestions("choice", SIZE, {}, EN_ONCE);
    expect(sorular.length).toBeGreaterThan(0);
    for (const q of sorular) {
      expect(en.has(q.answer) || nl.has(q.answer), `unexpected answer: ${q.answer}`).toBe(true);
      expect(tr.has(q.answer) && !en.has(q.answer), `Turkish option: ${q.answer}`).toBe(false);
    }
    expect(sorular.some((q) => en.has(q.answer))).toBe(true);
    expect(sorular.some((q) => nl.has(q.answer))).toBe(true);
  });

  test("priority decides the asked meaning (type mode)", () => {
    const en = alan("en");
    const tr = alan("tr");
    const nl = alan("nl");
    for (const q of buildQuestions("type", SIZE, {}, EN_ONCE)) expect(en.has(q.prompt)).toBe(true);
    for (const q of buildQuestions("type", SIZE, {}, TR)) expect(tr.has(q.prompt)).toBe(true);
    expect(buildQuestions("choice", SIZE, {}, EN_ONCE).length).toBeGreaterThan(0);
    expect(nl.size).toBeGreaterThan(0);
  });

  test("secondary language shows up as the meaning sub-line only", () => {
    const tr = alan("tr");
    const en = alan("en");
    const nl = alan("nl");
    const sorular = buildQuestions("choice", SIZE, {}, EN_ONCE);
    // Asked from the priority meaning (en → nl): sub-line is the secondary (TR) meaning.
    const anlamdan = sorular.filter((q) => en.has(q.prompt));
    expect(anlamdan.length).toBeGreaterThan(0);
    for (const q of anlamdan) expect(tr.has(q.promptSub ?? ""), `${q.promptSub}`).toBe(true);
    // Asked from Dutch (nl → en): sub-line is the Dutch example sentence, never a meaning that
    // would give the answer away.
    const hollandacadan = sorular.filter((q) => nl.has(q.prompt));
    expect(hollandacadan.length).toBeGreaterThan(0);
    for (const q of hollandacadan) expect(tr.has(q.promptSub ?? "")).toBe(false);
  });

  test("single language: no sub-line leak, no second language anywhere", () => {
    const en = alan("en");
    const tr = alan("tr");
    for (const q of buildQuestions("choice", SIZE, {}, EN)) {
      expect(en.has(q.answer) || alan("nl").has(q.answer)).toBe(true);
      expect(q.promptSub === undefined || tr.has(q.promptSub) === false).toBe(true);
    }
  });
});
