// The parser's "silent loss" detector: lines that produce no record are reported with a reason.
// (This file lives outside tsconfig — tests outside src/ are not type-checked by tsc.)
import { describe, expect, test } from "bun:test";
import { parseMarkdown } from "./import-notes.mjs";

const ORNEK = [
  "",
  "| Hollandaca | İngilizce | Türkçe | Örnek Cümle (NL) |",
  "| --- | --- | --- | --- |",
  "| lopen | to walk | yürümek | Ik loop naar huis. — Eve yürüyorum. |",
  "| fietsen | to cycle | bisiklete binmek |  |",
  "",
  "* stilstaan - durmak - De auto staat stil.",
  "* aankomen - gelmek - bir - iki",
  "* cursus (kurs) vs opleiding (eğitim)",
].join("\n");

describe("notes parser", () => {
  test("table and bullet lines turn into records", () => {
    const { items } = parseMarkdown(ORNEK);
    expect(items.map((i) => i.nl)).toEqual(["lopen", "fietsen", "stilstaan"]);
    expect(items[0].zin_tr).toBe("Eve yürüyorum.");
  });

  test("lines that produce no record are listed with a reason", () => {
    const { atlanan } = parseMarkdown(ORNEK);
    expect(atlanan.map((a) => a.sebep)).toEqual([
      "bullet with 4 parts (at most 3 are read)",
      "parenthesised bullet (treated as a footnote)",
    ]);
    expect(atlanan.map((a) => a.satir)).toEqual([8, 9]);
  });
});
