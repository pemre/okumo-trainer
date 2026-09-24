import { connectives, verbs, words } from "../lib/data";
import { aileAdi, type Lang, translate } from "../lib/i18n";
import { buildOptions, pickSession, shuffle } from "../lib/srs";
import type { CardState, Connective, ModeId, Verb, WordItem } from "../lib/types";

export interface Question {
  id: string; // SRS card key
  kind: "choice" | "type" | "scramble";
  prompt: string;
  promptSub?: string;
  hint?: string;
  answer: string;
  alternatives?: string[];
  options?: string[];
  words?: string[]; // scramble: shuffled word chips
  /** Dutch text that is **already visible in the prompt**: only then may the speaker read it out
   *  (reading the answer would give it away). Set for the Dutch→meaning and verb directions. */
  speak?: string;
  /** The Dutch example sentence, when the card has one — the speaker button next to `Örnek:`. */
  zinNl?: string;
  /** `promptSub` is the Dutch example sentence itself (not a meaning): the speaker may read it too. */
  subNl?: boolean;
  /** The options themselves are Dutch (visible candidates): the speaker may read them out. */
  optionsNl?: boolean;
  detail: { nl: string; en: string; tr: string; zin?: string; zin_tr?: string };
}

const blankSentence = (zin: string, nl: string) => {
  const variants = [nl, nl.replace(/\(.*?\)/g, "").trim()];
  for (const v of variants) {
    if (!v) continue;
    const re = new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (re.test(zin)) return zin.replace(re, "____");
  }
  const first = nl.split(" ")[0];
  return zin.replace(
    new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
    "____",
  );
};

const wordDetail = (w: WordItem) => ({
  nl: w.nl,
  en: w.en,
  tr: w.tr,
  zin: w.zin,
  zin_tr: w.zin_tr,
});

/**
 * Question directions follow the **priority language** (`ls[0]`). The secondary language never
 * asks questions — it only shows up in meaning explanations. Priority TR → NL↔TR, EN → NL↔EN.
 */
type ChoiceDir = "nl-tr" | "nl-en" | "tr-nl" | "en-nl";

function choiceDirs(ls: Lang[]): ChoiceDir[] {
  return ls[0] === "en" ? ["nl-en", "en-nl"] : ["nl-tr", "tr-nl"];
}

function typeDirs(ls: Lang[]): ("tr-nl" | "en-nl")[] {
  return ls[0] === "en" ? ["en-nl"] : ["tr-nl"];
}

function choiceQuestion(item: WordItem, direction: ChoiceDir, ls: Lang[]): Question {
  const key =
    direction === "tr-nl" || direction === "en-nl" ? "nl" : direction === "nl-en" ? "en" : "tr";
  const options = buildOptions(item, words, (w) => w[key], Math.random, 4).map((w) => w[key]);
  const prompt = direction === "tr-nl" ? item.tr : direction === "en-nl" ? item.en : item.nl;
  // Meaning → Dutch: the sub-line is the **secondary** meaning if there is one, else the example sentence.
  // Dutch → meaning keeps the example sentence — printing a meaning would give the answer away.
  const ikincil = ls[1];
  const promptSub =
    direction.endsWith("-nl") && ikincil ? (ikincil === "tr" ? item.tr : item.en) : item.zin;
  const subNl = promptSub === item.zin; // the Dutch sentence is on screen — and only then is it read
  return {
    id: item.id,
    kind: "choice",
    prompt,
    promptSub,
    subNl,
    answer: item[key],
    options,
    speak: prompt === item.nl ? prompt : undefined, // meaning->Dutch: listening would reveal the answer
    zinNl: item.zin,
    optionsNl: direction === "tr-nl" || direction === "en-nl", // the options are the Dutch candidates
    detail: wordDetail(item),
  };
}

function typeQuestion(item: WordItem, direction: "tr-nl" | "en-nl", ls: Lang[]): Question {
  return {
    id: item.id,
    kind: "type",
    prompt: direction === "tr-nl" ? item.tr : item.en,
    promptSub: translate(
      ls,
      direction === "tr-nl"
        ? "(Türkçesi) — Hollandacasını yaz"
        : "(İngilizcesi) — Hollandacasını yaz",
    ),
    answer: item.nl,
    alternatives: item.synoniem ? [item.synoniem] : undefined,
    zinNl: item.zin,
    detail: wordDetail(item),
  };
}

function connectiveQuestion(connective: Connective, kind: "choice" | "type", ls: Lang[]): Question {
  const blanked = blankSentence(connective.zin, connective.nl);
  const distractors = shuffle(
    connectives.filter((c) => c.id !== connective.id).map((c) => c.nl),
  ).slice(0, 3);
  const options = kind === "choice" ? shuffle([connective.nl, ...distractors]) : undefined;
  return {
    id: `c:${connective.id}`,
    kind,
    prompt: blanked,
    // `functie` exists only in Turkish: hidden when TR is off (no invented translations).
    promptSub: ls.includes("tr")
      ? translate(ls, "İşlev: {f}", { f: connective.functie })
      : undefined,
    hint: translate(ls, "Boşluğa uygun bağlacı getir"),
    answer: connective.nl,
    options,
    // The gap is silent: speaking it reads the sentence with a pause where the connective goes.
    speak: kind === "choice" ? blanked.replace(/_{2,}/, "…") : undefined,
    zinNl: connective.zin, // after answering: the full Dutch sentence
    optionsNl: kind === "choice",
    detail: {
      nl: connective.nl,
      en: connective.en,
      tr: connective.tr,
      zin: connective.zin,
      zin_tr: connective.zin_tr,
    },
  };
}

const VERB_FORMS = ["vt", "vt_mv", "voltooid"] as const;
type VerbForm = (typeof VERB_FORMS)[number];

function verbQuestion(verb: Verb, form: VerbForm, ls: Lang[]): Question {
  const labels: Record<VerbForm, string> = {
    vt: "verleden tijd (enkelvoud)",
    vt_mv: "verleden tijd (meervoud)",
    voltooid: "voltooid deelwoord",
  };
  const answer = verb[form];
  return {
    id: `v:${verb.id}:${form}`,
    kind: "type",
    prompt: verb.inf,
    promptSub: translate(ls, labels[form]), // the label is interface text: priority language only
    speak: verb.inf,
    // Family names exist only in Turkish; for EN the sound-pattern code (15 families) is translated.
    hint: aileAdi(ls, verb),
    answer,
    alternatives:
      form === "voltooid" ? [answer.replace(/^(hebben|heeft|is|zijn)\s+/, "")] : undefined,
    detail: {
      nl: `${verb.inf} · ${verb.vt} · ${verb.vt_mv} · ${verb.voltooid}`,
      en: verb.en,
      tr: verb.tr,
      zin: aileAdi(ls, verb),
    },
  };
}

function scrambleQuestion(item: WordItem, ls: Lang[]): Question {
  const words = item.zin.split(/\s+/);
  return {
    id: item.id,
    kind: "scramble",
    // Always the sentence's own translation (`zin_tr`): falling back to the bare word meaning turned
    // the task into a guess ("şiddet" + shuffled words). Cards without it are skipped (see below).
    prompt: item.zin_tr,
    promptSub: translate(ls, "Kelimeleri doğru sıraya koy"),
    hint: item.nl,
    answer: item.zin,
    words: shuffle(words),
    zinNl: item.zin,
    detail: wordDetail(item),
  };
}

// Scrambling needs the sentence **and** its translation: without `zin_tr` the prompt could only
// repeat the word's meaning, which does not tell the learner which sentence to build.
const usableForScramble = (w: WordItem) =>
  w.zin.split(/\s+/).length >= 4 && w.zin.length <= 70 && w.zin_tr.trim() !== "";

export function buildQuestions(
  mode: ModeId,
  size: number,
  cards: Record<string, CardState>,
  ls: Lang[],
): Question[] {
  if (mode === "connect") {
    const picked = pickSession(connectives, cards, size, new Date(), Math.random);
    return picked.map((c, i) => connectiveQuestion(c, i % 2 === 0 ? "choice" : "type", ls));
  }
  if (mode === "verbs") {
    const picked = pickSession(
      verbs.map((v) => ({ id: v.id, verb: v })),
      cards,
      size,
      new Date(),
      Math.random,
    );
    return picked.map((p, i) => verbQuestion(p.verb, VERB_FORMS[i % VERB_FORMS.length], ls));
  }
  const pool = mode === "scramble" ? words.filter(usableForScramble) : words;
  const picked = pickSession(pool, cards, size, new Date(), Math.random);
  const cDirs = choiceDirs(ls);
  const tDirs = typeDirs(ls);
  return picked.map((w, i) => {
    if (mode === "scramble") return scrambleQuestion(w, ls);
    if (mode === "choice") return choiceQuestion(w, cDirs[i % cDirs.length], ls);
    return typeQuestion(w, tDirs[i % tDirs.length], ls);
  });
}
