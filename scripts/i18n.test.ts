// i18n contract: msgid = Turkish source text, the interface is **priority language only** (`langs[0]`),
// meaning explanations list the other languages after the priority one (`TR · EN`), an unknown key
// falls back to Turkish (never a blank screen), at least one language stays on, **order = priority**.
import { describe, expect, test } from "bun:test";
import {
  aileAdi,
  ceviri,
  dilTasi,
  getLangs,
  setLangs,
  toggleLang,
  translate,
} from "../src/lib/i18n";

describe("translation layer", () => {
  test("single language: TR is the source text, EN comes from the dictionary", () => {
    expect(translate(["tr"], "Kapat")).toBe("Kapat");
    expect(translate(["en"], "Kapat")).toBe("Close");
  });

  test("interface text is priority-language only (order is priority)", () => {
    expect(translate(["tr", "en"], "Kapat")).toBe("Kapat");
    expect(translate(["en", "tr"], "Kapat")).toBe("Close");
  });

  test("text missing from the dictionary falls back to Turkish", () => {
    expect(translate(["en"], "Bu metin henüz çevrilmedi")).toBe("Bu metin henüz çevrilmedi");
  });

  test("placeholders are filled in", () => {
    expect(translate(["tr"], "{n} kayıt", { n: 335 })).toBe("335 kayıt");
    expect(translate(["en"], "{n} kayıt", { n: 335 })).toBe("335 entries");
  });

  test("data translation: priority language first, secondary inside meanings", () => {
    const kayit = { tr: "şüphe", en: "doubt" };
    expect(ceviri(["tr"], kayit)).toBe("şüphe");
    expect(ceviri(["en"], kayit)).toBe("doubt");
    expect(ceviri(["tr", "en"], kayit)).toBe("şüphe · doubt");
    expect(ceviri(["en", "tr"], kayit)).toBe("doubt · şüphe"); // the order belongs to the user
    expect(ceviri(["en"], { tr: "şüphe" })).toBe("şüphe"); // show what exists, never an empty row
    expect(ceviri(["tr"], null)).toBe("");
  });

  test("verb family: the sound-pattern code is translated for EN", () => {
    const fiil = { familie: "K3_i-o-o", familie_adi: "i/e → o → o (vinden/breken tipi)" };
    expect(aileAdi(["tr"], fiil)).toContain("vinden");
    expect(aileAdi(["en"], fiil)).toContain("type");
    expect(aileAdi(["en"], fiil)).not.toContain("tipi");
  });

  // A grammar note, not a meaning list: with both languages on it still prints once (priority only).
  test("verb family: one note, in the priority language", () => {
    const fiil = { familie: "K3_i-o-o", familie_adi: "i/e → o → o (vinden/breken tipi)" };
    expect(aileAdi(["tr", "en"], fiil)).toBe(aileAdi(["tr"], fiil));
    expect(aileAdi(["en", "tr"], fiil)).toBe(aileAdi(["en"], fiil));
    expect(aileAdi(["tr", "en"], fiil)).not.toContain(" · ");
  });

  test("at least one language stays on: turning off the last one is ignored", () => {
    setLangs(["tr"]);
    toggleLang("tr");
    expect(getLangs()).toEqual(["tr"]);
    toggleLang("en");
    expect(getLangs()).toEqual(["tr", "en"]); // enabled languages append → priority intact
    toggleLang("tr");
    expect(getLangs()).toEqual(["en"]);
    setLangs([]);
    expect(getLangs()).toEqual(["en"]); // an empty set is rejected
    setLangs(["en", "tr"]);
    expect(getLangs()).toEqual(["en", "tr"]); // the given order is preserved
  });

  test("dilTasi: reorders the priority", () => {
    setLangs(["tr", "en"]);
    dilTasi("en", "tr");
    expect(getLangs()).toEqual(["en", "tr"]);
    dilTasi("en", "en"); // dropping onto itself: no change
    expect(getLangs()).toEqual(["en", "tr"]);
    dilTasi("tr", "en");
    expect(getLangs()).toEqual(["tr", "en"]);
    dilTasi("tr", "de" as never); // disabled/unknown language: ignored
    expect(getLangs()).toEqual(["tr", "en"]);
    setLangs(["tr", "en"]);
  });
});
