import { useMemo, useRef, useState } from "react";
import { BigButton, ProgressBar, Speak } from "../components/ui";
import { feedbackSound, haptic, shake } from "../lib/feedback";
import { getLangs, useT } from "../lib/i18n";
import { checkAnswer } from "../lib/srs";
import { getProgress } from "../lib/store";
import type { Grade } from "../lib/types";
import type { GameResult } from "./MatchGame";
import { buildQuestions, type Question } from "./questions";

const SIZE = 10;

export default function SessionGame({
  mode,
  onFinish,
}: {
  mode: "choice" | "type" | "scramble" | "connect" | "verbs";
  onFinish: (r: GameResult) => void;
}) {
  const { t, langs } = useT();
  // Languages are frozen when a round starts: switching mid-round must not shuffle the questions
  // (texts and detail rows switch instantly, the question flow stays put until the round ends).
  const [turDilleri] = useState(getLangs);
  const questions = useMemo<Question[]>(
    () => buildQuestions(mode, SIZE, getProgress().cards, turDilleri),
    [mode, turDilleri],
  );
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [order, setOrder] = useState<number[]>([]); // scramble: order of the tapped word chips
  const [state, setState] = useState<"asking" | "right" | "wrong">("asking");
  const grades = useRef<Record<string, Grade>>({});
  const card = useRef<HTMLDivElement | null>(null);
  const correctCount = useRef(0);
  const wrongIds = useRef<string[]>([]);

  const q = questions[index];
  const isLast = index === questions.length - 1;

  if (!q) return null;

  function settle(ok: boolean) {
    if (state !== "asking") return;
    grades.current[q.id] = ok ? (mode === "verbs" ? 2 : 3) : 0;
    if (ok) correctCount.current += 1;
    else if (!wrongIds.current.includes(q.id)) wrongIds.current.push(q.id);
    setState(ok ? "right" : "wrong");
    // yap.ev key feel: tone + haptics + short shake (harsher on a wrong answer)
    feedbackSound(ok ? "success" : "error");
    haptic();
    shake(card.current, ok ? "soft" : "hard");
  }

  function submitTyped() {
    settle(checkAnswer(input, [q.answer, ...(q.alternatives ?? [])]));
  }

  function next() {
    if (isLast) {
      const correct = correctCount.current;
      const gradeMap = grades.current;
      const xp = Object.values(gradeMap).reduce<number>((sum, g) => sum + (g === 0 ? 2 : 10), 0);
      // Round finished: closing fanfare + shake the whole page (this screen is about to close)
      feedbackSound("finish");
      haptic();
      shake(document.querySelector("[data-feedback-root]"), "hard");
      onFinish({
        grades: gradeMap,
        xp,
        correct,
        total: questions.length,
        wrongIds: wrongIds.current,
      });
      return;
    }
    setIndex((i) => i + 1);
    setInput("");
    setPicked(null);
    setOrder([]);
    setState("asking");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4">
      <div className="mb-4 flex items-center gap-3">
        {/* The bar and the counter share one base (the question you are on), so "10/10" is a full bar. */}
        <ProgressBar value={index + 1} max={questions.length} />
        <span className="shrink-0 text-sm text-inksoft">
          {index + 1}/{questions.length}
        </span>
      </div>

      <div ref={card} className="rounded-cozy bg-surface p-5 shadow-cozy">
        <div className="flex items-start gap-2">
          <div className="font-display text-2xl font-semibold leading-tight" data-testid="prompt">
            {q.prompt}
          </div>
          {/* Only when the Dutch is already on screen — the speaker never gives the answer away. */}
          {q.speak ? <Speak text={q.speak} className="mt-1" /> : null}
        </div>
        {q.promptSub ? (
          <div className="mt-2 flex items-start gap-2" data-testid="prompt-sub">
            <span className="text-sm text-inksoft">{q.promptSub}</span>
            {/* The sub-line is the Dutch example sentence (not a meaning): reading it is the point. */}
            {q.subNl ? <Speak text={q.promptSub} /> : null}
          </div>
        ) : null}
        {q.hint ? (
          <div className="mt-3 text-xs text-inksoft" data-testid="hint">
            {q.hint}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2" data-testid="answers">
        {q.kind === "choice" ? (
          (q.options ?? []).map((opt) => {
            const chosen = picked === opt;
            const isAnswer = opt === q.answer;
            const tone =
              state === "asking"
                ? "bg-surface hover:brightness-[1.02]"
                : isAnswer
                  ? "bg-good/15 border-good"
                  : chosen
                    ? "bg-danger/10 border-danger"
                    : "bg-surface opacity-60";
            return (
              // Wrapper + inner button: the speaker (Dutch options only) is a real button of its own.
              <div
                key={opt}
                className={`rounded-cozy flex items-center gap-2 border border-transparent px-4 py-3 font-semibold shadow-cozy transition-all ${tone}`}
              >
                <button
                  type="button"
                  data-testid={`option-${opt}`}
                  disabled={state !== "asking"}
                  onClick={() => {
                    setPicked(opt);
                    settle(opt === q.answer);
                  }}
                  className="flex-1 text-left"
                >
                  {opt}
                </button>
                {/* Choice candidates in Dutch (connectives, meaning→Dutch): hear them before picking. */}
                {q.optionsNl ? <Speak text={opt} /> : null}
              </div>
            );
          })
        ) : q.kind === "scramble" ? (
          (() => {
            const chips = q.words ?? [];
            const built = order.map((i) => chips[i]).join(" ");
            return (
              <div className="flex flex-col gap-3">
                <div
                  data-testid="scramble-built"
                  className="rounded-cozy min-h-[3.25rem] bg-surface px-4 py-3 text-lg shadow-cozy"
                >
                  {built || <span className="text-inksoft">{t("Kelimelere sırayla dokun…")}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {chips.map((word, i) => {
                    const used = order.includes(i);
                    return (
                      <button
                        // biome-ignore lint/suspicious/noArrayIndexKey: the same word may appear twice
                        key={`${word}-${i}`}
                        type="button"
                        data-testid={`chip-${word}`}
                        disabled={used || state !== "asking"}
                        onClick={() => setOrder((o) => [...o, i])}
                        className={`rounded-full px-3 py-2 font-semibold shadow-cozy transition-all ${
                          used
                            ? "bg-sand/70 text-inksoft opacity-40"
                            : "bg-surface hover:brightness-[1.03]"
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
                {state === "asking" ? (
                  <div className="flex items-center gap-3">
                    <BigButton onClick={() => settle(checkAnswer(built, [q.answer]))}>
                      {t("Kontrol et")}
                    </BigButton>
                    {order.length ? (
                      <button
                        type="button"
                        onClick={() => setOrder((o) => o.slice(0, -1))}
                        className="text-sm text-inksoft underline"
                      >
                        {t("Geri al")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })()
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (state === "asking") submitTyped();
              else next();
            }}
          >
            <input
              // biome-ignore lint/a11y/noAutofocus: practice screen, keyboard flow is the point
              autoFocus
              value={input}
              data-testid="typed-answer"
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("Hollandacasını yaz…")}
              disabled={state !== "asking"}
              className="rounded-cozy bg-surface px-4 py-3 text-lg shadow-cozy outline-none ring-accent focus:ring-2 disabled:opacity-70"
            />
            {state === "asking" ? (
              <BigButton onClick={submitTyped}>{t("Kontrol et")}</BigButton>
            ) : null}
          </form>
        )}
      </div>

      {state !== "asking" ? (
        <div
          className={`animate-pop mt-4 rounded-cozy border p-4 shadow-cozy ${
            state === "right" ? "border-good/40 bg-good/10" : "border-danger/30 bg-danger/10"
          }`}
          data-testid="feedback"
        >
          <div className="font-display text-lg font-semibold">
            {state === "right" ? t("Doğru!") : t("Yanlış — doğrusu: {cevap}", { cevap: q.answer })}
          </div>
          {/* Meaning explanations: NL always (the target language), then enabled languages in priority order. */}
          <dl className="mt-2 grid grid-cols-1 gap-1 text-sm text-inksoft sm:grid-cols-2">
            <div>
              <dt className="inline font-semibold">NL: </dt>
              <dd className="inline">{q.detail.nl}</dd>
              <Speak text={q.detail.nl} />
            </div>
            {langs.map((l) => (
              <div key={l}>
                <dt className="inline font-semibold">{l.toUpperCase()}: </dt>
                <dd className="inline">{l === "tr" ? q.detail.tr : q.detail.en}</dd>
              </div>
            ))}
            {q.detail.zin ? (
              <div className="sm:col-span-2">
                <dt className="inline font-semibold">{t("Örnek: ")}</dt>
                <dd className="inline italic">
                  {q.detail.zin}
                  {q.zinNl ? <Speak text={q.zinNl} /> : null}
                  {/* The sentence translation exists only in Turkish (`zin_tr`): hidden when TR is off. */}
                  {langs.includes("tr") && q.detail.zin_tr ? ` — ${q.detail.zin_tr}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-3">
            <BigButton onClick={next} testId="next">
              {isLast ? t("Turu bitir") : t("Devam")}
            </BigButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
