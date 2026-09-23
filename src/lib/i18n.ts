/**
 * Interface languages: TR + EN. A tiny layer of our own instead of react-intl — the app is
 * dependency-free and offline, and the ICU/extraction chain is overkill for ~95 lines of text.
 *
 * Rule: **msgid = the original Turkish text**. A missing dictionary entry falls back to Turkish
 * (never a blank screen), so forgetting a translation cannot break the interface.
 *
 * **Order = priority** (changed by dragging or ↑ in the menu): `langs[0]` is the priority language
 * and shows **everywhere** (`translate`, month labels, question direction). The other languages
 * only appear in meaning explanations, listed after the priority one (`ceviri`).
 */
import { useCallback, useSyncExternalStore } from "react";

export type Lang = "tr" | "en";

/** Supported languages (the canonical set; **the order belongs to the user**, see `langs`). */
export const LANGS: Lang[] = ["tr", "en"];

/** Language names in their own language: shows "Türkçe" even in EN mode, so the way back is never lost. */
export const LANG_ADI: Record<Lang, string> = { tr: "Türkçe", en: "English" };

/** Verb family (sound-pattern) code → English name. The data only carries the Turkish name. */
export const FAMILIE_EN: Record<string, string> = {
  UNIEK: "One-off verbs (doen, gaan, staan, slaan)",
  "K4_e-a-e_of_o": "e → a → e/o (spreken/nemen type)",
  "K7_a-ie-a": "a/ou → ie → a (slapen/houden type)",
  "K1_ij-ee-e": "ij → ee → e (blijven type)",
  "K13_aa-o-a": "a/aa → o → a (staan/slaan type)",
  "K2_ie-oo-o": "ie/ui → oo → o (bieden/sluiten type)",
  ZWAK_REGELMATIG: "Weak/regular (-de/-te ending; voltooid may be irregular)",
  "K3_i-o-o": "i/e → o → o (vinden/breken type)",
  "K5_e-ee-o": "e → ee → o (wegen type)",
  "K11_oe-ee-o": "oe/ie → ee/o → o (roepen/genieten type)",
  "K6_a-oe-a": "a → oe → a (dragen type)",
  MODAAL_ONREGELMATIG:
    "Modal/auxiliary verbs (kunnen, mogen, moeten, zijn, hebben, worden, zullen)",
  "K14_e-ie-o": "e → ie → o (rare)",
  "K15_e-ei-e": "e → ei → e (rare pattern)",
  DIGER_zien_zag_gezien: "One-off (zien type)",
};

const EN: Record<string, string> = {
  // --- top bar / menu ---
  "Ana sayfa": "Home",
  "Arayüz dilleri": "Interface languages",
  "Öncelikli dil her yerde, diğeri yalnız anlam açıklamalarında görünür. En az bir dil açık kalır.":
    "The priority language shows everywhere; the other only in meaning descriptions. At least one language stays on.",
  "Öncelikli yap": "Make priority",
  Sırala: "Reorder",
  "Seri (üst üste oynanan gün)": "Streak (consecutive days played)",
  "Toplam XP": "Total XP",
  "İlerleme yerel sunucuyla eşitlendi": "Progress synced with the local server",
  "Sunucuya ulaşılamıyor — ilerleme bu cihazda birikiyor, bağlantı gelince eşitlenir":
    "Server unreachable — progress piles up on this device and syncs when the connection is back",
  "Eşitleme bekleniyor": "Waiting to sync",

  // --- ana sayfa ---
  "Hollandaca alıştırma": "Dutch practice",
  "Sınıf notlarından üretilmiş {kelime} kelime/ifade, {baglac} bağlaç ve {fiil} fiil.":
    "From the class notes: {kelime} words/phrases, {baglac} connectives and {fiil} verbs.",
  "Bugün tekrar edilecek kart:": "Cards due today:",
  "Seviye {n} · {xp} XP": "Level {n} · {xp} XP",
  "{n} tur oynandı": "{n} sessions played",
  Eşleştirme: "Matching",
  "Solda Hollandaca + örnek cümle, sağda çevirisi. 5 çift.":
    "Dutch + example sentence on the left, translations on the right. 5 pairs.",
  "Çoktan seçmeli": "Multiple choice",
  "Hollandacadan çeviriye, çeviriden Hollandacaya 4 şıklı sorular.":
    "Four-option questions from Dutch to a translation and back.",
  Yazma: "Typing",
  "Açık dillerdeki karşılığı verilir, Hollandacasını yazarsın.":
    "You get the meaning in the enabled languages; you type the Dutch.",
  "Cümle dizme": "Sentence building",
  "Çevirisi verilir, karışık kelimeleri doğru sıraya dizip Hollandaca cümleyi kurarsın.":
    "You get the translation; shuffled words go back into a correct Dutch sentence.",
  Bağlaçlar: "Connectives",
  "Bu haftanın bağlaçları: cümle içinde boşluğu doldur, anlamını pekiştir.":
    "This week's connectives: fill the gap and reinforce the meaning.",
  "bu hafta": "this week",
  "Fiil çekimi": "Verb conjugation",
  "215 düzensiz fiil, ses kalıbı ailelerine göre çekim alıştırması.":
    "215 irregular verbs, conjugation practice grouped by vowel-pattern families.",
  "📄 Veri kaynakları ({n})": "📄 Data sources ({n})",
  "İlerlemeyi indir": "Download progress",
  "İçe aktar": "Import",
  Sıfırla: "Reset",
  "Tüm ilerleme (XP, seri, tekrar kartları) sıfırlanacak. Emin misin?":
    "All progress (XP, streak, review cards) will be reset. Are you sure?",
  "Dosya okunamadı.": "Could not read the file.",

  // --- popup'lar ---
  "{n} kayıt": "{n} entries",
  "Veri kaynakları": "Data sources",
  "Uygulamadaki {n} kayıt bu ders notlarından üretilir. Bağlantılar notu Obsidian'da açar (kasa: emre).":
    "The app's {n} entries are generated from these class notes. The links open the note in Obsidian (vault: emre).",
  "· {n} kayıt": "· {n} entries",
  Kapat: "Close",
  Tamam: "OK",
  "🆕 {n} yeni kayıt geldi": "🆕 {n} new entries",
  "Son açılıştan bu yana desteye eklenenler (yeni ders notları):":
    "Added to the deck since your last visit (new class notes):",
  "… ve {n} tane daha": "… and {n} more",
  "📚 {n} kayıt": "📚 {n} entries",
  "Ders notlarından üretilen destenin tamamı. Kelimeler alfabetik, fiiller çekim dizisi (inf · vt · vt_mv · voltooid) ile listelenir; arama çevirilerde de çalışır.":
    "The whole deck, generated from the class notes. Words are alphabetical, verbs are listed with their forms (inf · vt · vt_mv · voltooid); search covers the translations too.",
  "Ara: Hollandaca ya da çeviri (örn. twijfel, şüphe)":
    "Search: Dutch or a translation (e.g. twijfel, şüphe)",
  "Aramayla eşleşen kayıt yok.": "No entries match your search.",
  Kelimeler: "Words",
  Fiiller: "Verbs",

  // --- round summary ---
  "{a}/{b} doğru": "{a}/{b} correct",
  "+{xp} XP · 🔥 {seri} gün seri · toplam {toplam} XP":
    "+{xp} XP · 🔥 {seri}-day streak · {toplam} XP total",
  "Bu turda zorlandıkların": "Tricky ones this round",
  "Bu kartlar tekrar sırasında öne alındı; bir sonraki turda yeniden karşına çıkacak.":
    "These cards were moved up in the review queue; they will come back next round.",
  "Hepsi doğru — tebrikler! 🎉": "All correct — nice! 🎉",
  "Yeni tur": "New round",

  // --- grafikler ---
  "Son {n} gün": "Last {n} days",
  "henüz kayıt yok": "no data yet",
  "günlük XP": "daily XP",
  "7 günlük ortalama": "7-day average",
  "Tekrar takvimi": "Review calendar",
  "Her kare bir gün; koyulaştıkça o gün daha çok XP.":
    "Each square is a day; the darker it is, the more XP you earned that day.",

  // --- oyunlar ---
  "{a}/{b} eşleşti": "{a}/{b} matched",
  "Soldaki Hollandaca kelimeyi, sağdaki çevirisiyle eşleştir.":
    "Match the Dutch word on the left with its translation on the right.",
  "Yanlış deneme: {n}": "Wrong attempts: {n}",
  "Kelimelere sırayla dokun…": "Tap the words in order…",
  "Kontrol et": "Check",
  "Geri al": "Undo",
  "Hollandacasını yaz…": "Type it in Dutch…",
  "Doğru!": "Correct!",
  "Yanlış — doğrusu: {cevap}": "Wrong — the answer is: {cevap}",
  "Örnek: ": "Example: ",
  Devam: "Continue",
  "Turu bitir": "Finish round",
  "(Türkçesi) — Hollandacasını yaz": "(Turkish) — type it in Dutch",
  "(İngilizcesi) — Hollandacasını yaz": "(English) — type it in Dutch",
  "İşlev: {f}": "Function: {f}",
  "Boşluğa uygun bağlacı getir": "Put the right connective in the gap",
  "Kelimeleri doğru sıraya koy": "Put the words in the right order",

  // --- settings menu ---
  Ayarlar: "Settings",
  Tema: "Theme",
  Sistem: "System",
  Açık: "Light",
  Koyu: "Dark",
  "Sesli oku": "Read aloud",
  "Sv {n}": "Lv {n}",
};

const KEY = "okumo-trainer/langs";

function load(): Lang[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(raw)) {
      // The stored order is kept (order = priority); unknown/duplicate entries are dropped.
      const ok = [...new Set(raw)].filter((l) => LANGS.includes(l));
      if (ok.length) return ok;
    }
  } catch {
    /* corrupt record or no localStorage: fall back to the default */
  }
  return LANGS; // default: both on (the app's current trilingual setup)
}

let langs: Lang[] = load();
const listeners = new Set<() => void>();

export function getLangs(): Lang[] {
  return langs;
}

/** At least one language stays on: turning off the last one is silently ignored. */
export function setLangs(next: Lang[]): void {
  // The order is **preserved** (the order of `next` is the priority order); unknown and duplicate entries are dropped.
  const ok = [...new Set(next)].filter((l) => LANGS.includes(l));
  if (!ok.length || ok.join() === langs.join()) return;
  langs = ok;
  try {
    localStorage.setItem(KEY, JSON.stringify(langs));
  } catch {
    /* quota full: the choice stands for this session */
  }
  for (const l of listeners) l();
}

export function toggleLang(l: Lang): void {
  // A newly enabled language is **appended**: the current priority is untouched, it joins as secondary.
  setLangs(langs.includes(l) ? langs.filter((x) => x !== l) : [...langs, l]);
}

/**
 * Priority reorder: moves `kaynak` (source) to `hedef`'s (target) position (`langs[0]` = priority).
 * Both the drag in the menu and the ↑ button go through this single path.
 */
export function dilTasi(kaynak: Lang, hedef: Lang): void {
  if (kaynak === hedef || !langs.includes(kaynak) || !langs.includes(hedef)) return;
  const yeni = langs.filter((l) => l !== kaynak);
  yeni.splice(langs.indexOf(hedef), 0, kaynak);
  setLangs(yeni);
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Fills `{name}` placeholders (so a dictionary entry can hold the whole sentence). */
export function doldur(metin: string, params?: Record<string, string | number>): string {
  if (!params) return metin;
  return metin.replace(/\{(\w+)\}/g, (tam, ad: string) =>
    ad in params ? String(params[ad]) : tam,
  );
}

/**
 * Interface text: **priority language only** (`ls[0]`). Other enabled languages never show up in
 * interface strings — they are listed in meaning explanations (`ceviri`). Missing entry → Turkish.
 */
export function translate(
  ls: Lang[],
  metin: string,
  params?: Record<string, string | number>,
): string {
  const l = ls[0] ?? "tr";
  return doldur(l === "tr" ? metin : (EN[metin] ?? metin), params);
}

/**
 * Data translation (meaning explanation): joins languages **in priority order** → the priority
 * meaning first, then the others. When an enabled language has no field (e.g. only `zin_tr`
 * exists for a sentence) it shows what is there — no invented text, no empty row.
 */
export function ceviri(ls: Lang[], x: { tr?: string; en?: string } | undefined | null): string {
  if (!x) return "";
  const secili = ls.map((l) => (l === "tr" ? x.tr : x.en)).filter((v): v is string => !!v);
  if (secili.length) return secili.join(" · ");
  return x.tr || x.en || "";
}

/** Verb family name: the Turkish name plus (when available) the English counterpart. */
export function aileAdi(ls: Lang[], v: { familie: string; familie_adi: string }): string {
  return ceviri(ls, { tr: v.familie_adi, en: FAMILIE_EN[v.familie] });
}

/** Hooked translation helpers for components. A language change re-renders subscribers. */
export function useT() {
  const ls = useSyncExternalStore(subscribe, getLangs, getLangs);
  const t = useCallback(
    (metin: string, params?: Record<string, string | number>) => translate(ls, metin, params),
    [ls],
  );
  const cevir = useCallback(
    (x: { tr?: string; en?: string } | undefined | null) => ceviri(ls, x),
    [ls],
  );
  return { langs: ls, t, ceviri: cevir };
}
