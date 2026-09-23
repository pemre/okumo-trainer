// Ayrıştırıcının "sessiz kayıp" dedektörü: kayda dönüşmeyen satırlar sebebiyle raporlanır.
// (Bu dosya tsconfig dışında — src/ dışındaki testler tsc ile denetlenmez.)
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

describe("not ayrıştırıcısı", () => {
  test("tablo ve madde satırları kayda dönüşür", () => {
    const { items } = parseMarkdown(ORNEK);
    expect(items.map((i) => i.nl)).toEqual(["lopen", "fietsen", "stilstaan"]);
    expect(items[0].zin_tr).toBe("Eve yürüyorum.");
  });

  test("kayda dönüşmeyen satırlar sebebiyle listelenir", () => {
    const { atlanan } = parseMarkdown(ORNEK);
    expect(atlanan.map((a) => a.sebep)).toEqual([
      "4 parçalı madde (en çok 3 okunur)",
      "parantezli madde (dipnot sayılır)",
    ]);
    expect(atlanan.map((a) => a.satir)).toEqual([8, 9]);
  });
});
