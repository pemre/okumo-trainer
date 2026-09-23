// i18n katmanının sözleşmesi: msgid = Türkçe metin, tek dilde o dil, iki dilde `TR · EN`,
// sözlükte olmayan metin Türkçe'ye düşer (ekran asla boş kalmaz), en az bir dil açık kalır.
import { describe, expect, test } from "bun:test";
import { aileAdi, ceviri, getLangs, setLangs, toggleLang, translate } from "../src/lib/i18n";

describe("çeviri katmanı", () => {
  test("tek dil: TR özgün metni, EN sözlükten", () => {
    expect(translate(["tr"], "Kapat")).toBe("Kapat");
    expect(translate(["en"], "Kapat")).toBe("Close");
  });

  test("iki dil açıkken metinler birleşir", () => {
    expect(translate(["tr", "en"], "Kapat")).toBe("Kapat · Close");
  });

  test("sözlükte olmayan metin Türkçe'ye düşer", () => {
    expect(translate(["en"], "Bu metin henüz çevrilmedi")).toBe("Bu metin henüz çevrilmedi");
  });

  test("yer tutucular doldurulur (iki dilde de)", () => {
    expect(translate(["tr"], "{n} kayıt", { n: 335 })).toBe("335 kayıt");
    expect(translate(["en"], "{n} kayıt", { n: 335 })).toBe("335 entries");
    expect(translate(["tr", "en"], "{n} kayıt", { n: 335 })).toBe("335 kayıt · 335 entries");
  });

  test("veri çevirisi açık dillere göre süzülür", () => {
    const kayit = { tr: "şüphe", en: "doubt" };
    expect(ceviri(["tr"], kayit)).toBe("şüphe");
    expect(ceviri(["en"], kayit)).toBe("doubt");
    expect(ceviri(["tr", "en"], kayit)).toBe("şüphe · doubt");
    expect(ceviri(["en"], { tr: "şüphe" })).toBe("şüphe"); // elde olan gösterilir, boş satır yok
    expect(ceviri(["tr"], null)).toBe("");
  });

  test("fiil ailesi: EN'de ses kalıbı kodu çevrilir", () => {
    const fiil = { familie: "K3_i-o-o", familie_adi: "i/e → o → o (vinden/breken tipi)" };
    expect(aileAdi(["tr"], fiil)).toContain("vinden");
    expect(aileAdi(["en"], fiil)).toContain("type");
    expect(aileAdi(["en"], fiil)).not.toContain("tipi");
  });

  test("en az bir dil açık kalır: son dili kapatma denemesi yok sayılır", () => {
    setLangs(["tr"]);
    toggleLang("tr");
    expect(getLangs()).toEqual(["tr"]);
    toggleLang("en");
    expect(getLangs()).toEqual(["tr", "en"]);
    toggleLang("tr");
    expect(getLangs()).toEqual(["en"]);
    setLangs([]);
    expect(getLangs()).toEqual(["en"]); // boş küme kabul edilmez
    setLangs(["en", "tr"]); // kanonik sıra: TR önce
    expect(getLangs()).toEqual(["tr", "en"]);
  });
});
