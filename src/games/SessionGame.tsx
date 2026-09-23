import { useMemo, useRef, useState } from "react";
import { BigButton, ProgressBar } from "../components/ui";
import { getProgress } from "../lib/store";
import { checkTyped } from "../lib/srs";
import type { Grade } from "../lib/types";
import { buildQuestions, type Question } from "./questions";
import type { GameResult } from "./MatchGame";

const SIZE = 10;

export default function SessionGame({
  mode,
  onFinish,
}: {
  mode: "choice" | "type" | "connect" | "verbs";
  onFinish: (r: GameResult) => void;
}) {
  const questions = useMemo<Question[]>(
    () => buildQuestions(mode, SIZE, getProgress().cards),
    [mode],
  );
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [state, setState] = useState<"asking" | "right" | "wrong">("asking");
  const grades = useRef<Record<string, Grade>>({});
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
  }

  function submitTyped() {
    const ok =
      checkTyped(input, q.answer) ||
      (q.alternatives ?? []).some((alt) => checkTyped(input, alt));
    settle(ok);
  }

  function next() {
    if (isLast) {
      const correct = correctCount.current;
      const gradeMap = grades.current;
      const xp = Object.values(gradeMap).reduce<number>((sum, g) => sum + (g === 0 ? 2 : 10), 0);
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
    setState("asking");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <ProgressBar value={index + (state === "asking" ? 0 : 1)} max={questions.length} />
        <span className="shrink-0 text-sm text-inksoft">
          {index + 1}/{questions.length}
        </span>
      </div>

      <div className="rounded-cozy bg-surface p-5 shadow-cozy">
        <div className="font-display text-2xl font-semibold leading-tight" data-testid="prompt">
          {q.prompt}
        </div>
        {q.promptSub ? <div className="mt-2 text-sm text-inksoft">{q.promptSub}</div> : null}
        {q.hint ? <div className="mt-3 text-xs text-inksoft">{q.hint}</div> : null}
      </div>

      <div className="mt-4 flex flex-col gap-2" data-testid="answers">
        {q.kind === "choice"
          ? (q.options ?? []).map((opt) => {
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
                <button
                  key={opt}
                  type="button"
                  data-testid={`option-${opt}`}
                  disabled={state !== "asking"}
                  onClick={() => {
                    setPicked(opt);
                    settle(opt === q.answer);
                  }}
                  className={`rounded-cozy border border-transparent px-4 py-3 text-left font-semibold shadow-cozy transition-all ${tone}`}
                >
                  {opt}
                </button>
              );
            })
          : (
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (state === "asking") submitTyped();
                  else next();
                }}
              >
                <input
                  // biome-ignore lint/a11y/noAutofocus: alıştırma ekranı, klavye akışı hedefleniyor
                  autoFocus
                  value={input}
                  data-testid="typed-answer"
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hollandacasını yaz…"
                  disabled={state !== "asking"}
                  className="rounded-cozy bg-surface px-4 py-3 text-lg shadow-cozy outline-none ring-accent focus:ring-2 disabled:opacity-70"
                />
                {state === "asking" ? <BigButton>Kontrol et</BigButton> : null}
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
            {state === "right" ? "Doğru!" : `Yanlış — doğrusu: ${q.answer}`}
          </div>
          <dl className="mt-2 grid grid-cols-1 gap-1 text-sm text-inksoft sm:grid-cols-2">
            <div>
              <dt className="inline font-semibold">NL: </dt>
              <dd className="inline">{q.detail.nl}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">EN: </dt>
              <dd className="inline">{q.detail.en}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">TR: </dt>
              <dd className="inline">{q.detail.tr}</dd>
            </div>
            {q.detail.zin ? (
              <div className="sm:col-span-2">
                <dt className="inline font-semibold">Örnek: </dt>
                <dd className="inline italic">
                  {q.detail.zin}
                  {q.detail.zin_tr ? ` — ${q.detail.zin_tr}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-3">
            <BigButton onClick={next}>{isLast ? "Turu bitir" : "Devam"}</BigButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
