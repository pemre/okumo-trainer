import { buildOptions, pickSession, shuffle } from "../lib/srs";
import type { CardState, Connective, ModeId, Verb, WordItem } from "../lib/types";
import { connectives, verbs, words } from "../lib/data";

export interface Question {
  id: string; // SRS kart anahtarı
  kind: "choice" | "type";
  prompt: string;
  promptSub?: string;
  hint?: string;
  answer: string;
  alternatives?: string[];
  options?: string[];
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
  return zin.replace(new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), "____");
};

const wordDetail = (w: WordItem) => ({
  nl: w.nl,
  en: w.en,
  tr: w.tr,
  zin: w.zin,
  zin_tr: w.zin_tr,
});

function choiceQuestion(item: WordItem, direction: "nl-tr" | "nl-en" | "tr-nl"): Question {
  const key = direction === "tr-nl" ? "nl" : direction === "nl-en" ? "en" : "tr";
  const options = buildOptions(item, words, (w) => w[key], Math.random, 4).map((w) => w[key]);
  const prompt = direction === "tr-nl" ? item.tr : item.nl;
  const promptSub = direction === "tr-nl" ? item.en : item.zin;
  return {
    id: item.id,
    kind: "choice",
    prompt,
    promptSub,
    answer: item[key],
    options,
    detail: wordDetail(item),
  };
}

function typeQuestion(item: WordItem, direction: "tr-nl" | "en-nl"): Question {
  return {
    id: item.id,
    kind: "type",
    prompt: direction === "tr-nl" ? item.tr : item.en,
    promptSub: direction === "tr-nl" ? "(Türkçesi) — Hollandacasını yaz" : "(İngilizcesi) — Hollandacasını yaz",
    answer: item.nl,
    alternatives: item.synoniem ? [item.synoniem] : undefined,
    detail: wordDetail(item),
  };
}

function connectiveQuestion(connective: Connective, kind: "choice" | "type"): Question {
  const blanked = blankSentence(connective.zin, connective.nl);
  const distractors = shuffle(connectives.filter((c) => c.id !== connective.id).map((c) => c.nl)).slice(0, 3);
  const options = kind === "choice" ? shuffle([connective.nl, ...distractors]) : undefined;
  return {
    id: `c:${connective.id}`,
    kind,
    prompt: blanked,
    promptSub: `İşlev: ${connective.functie}`,
    hint: "Boşluğa uygun bağlacı getir",
    answer: connective.nl,
    options,
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

function verbQuestion(verb: Verb, form: VerbForm): Question {
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
    promptSub: labels[form],
    hint: verb.familie_adi,
    answer,
    alternatives: form === "voltooid" ? [answer.replace(/^(hebben|heeft|is|zijn)\s+/, "")] : undefined,
    detail: {
      nl: `${verb.inf} · ${verb.vt} · ${verb.vt_mv} · ${verb.voltooid}`,
      en: verb.en,
      tr: verb.tr,
      zin: verb.familie_adi,
    },
  };
}

export function buildQuestions(
  mode: ModeId,
  size: number,
  cards: Record<string, CardState>,
): Question[] {
  if (mode === "connect") {
    const picked = pickSession(connectives, cards, size, new Date(), Math.random);
    return picked.map((c, i) => connectiveQuestion(c, i % 2 === 0 ? "choice" : "type"));
  }
  if (mode === "verbs") {
    const picked = pickSession(
      verbs.map((v) => ({ id: v.id, verb: v })),
      cards,
      size,
      new Date(),
      Math.random,
    );
    return picked.map((p, i) => verbQuestion(p.verb, VERB_FORMS[i % VERB_FORMS.length]));
  }
  const picked = pickSession(words, cards, size, new Date(), Math.random);
  return picked.map((w, i) => {
    if (mode === "choice") {
      const dirs = ["nl-tr", "nl-en", "tr-nl"] as const;
      return choiceQuestion(w, dirs[i % dirs.length]);
    }
    return typeQuestion(w, i % 2 === 0 ? "tr-nl" : "en-nl");
  });
}
