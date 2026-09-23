import { useMemo, useRef, useState } from "react";
import { ProgressBar, XpBurst } from "../components/ui";
import { words } from "../lib/data";
import { pickSession, shuffle } from "../lib/srs";
import { getProgress } from "../lib/store";
import type { Grade, WordItem } from "../lib/types";

export interface GameResult {
  grades: Record<string, Grade>;
  xp: number;
  correct: number;
  total: number;
  wrongIds: string[];
}

const PAIRS = 5;

export default function MatchGame({ onFinish }: { onFinish: (r: GameResult) => void }) {
  const left = useMemo<WordItem[]>(() => pickSession(words, getProgress().cards, PAIRS), []);
  const rightOrder = useMemo(() => shuffle(left.map((w) => w.id)), [left]);

  const [selected, setSelected] = useState<string | null>(null);
  const [solved, setSolved] = useState<string[]>([]);
  const [shake, setShake] = useState<string[]>([]);
  const [errors, setErrors] = useState(0);
  const attempted = useRef<Record<string, boolean>>({});
  const [burst, setBurst] = useState(0);

  const locked = (id: string) => solved.includes(id);
  const right = useMemo(
    () => rightOrder.map((id) => left.find((w) => w.id === id)!),
    [rightOrder, left],
  );

  function tapRight(id: string) {
    if (!selected || locked(id) || !right.length) return;
    if (id === selected) {
      const nextSolved = [...solved, id];
      setSolved(nextSolved);
      setSelected(null);
      setBurst((b) => b + 5);
      if (nextSolved.length === left.length) setTimeout(() => finish(nextSolved), 450);
    } else {
      attempted.current[selected] = true;
      setErrors((e) => e + 1);
      setShake([selected, id]);
      setTimeout(() => setShake([]), 350);
    }
  }

  function finish(done: string[]) {
    const grades: Record<string, Grade> = {};
    for (const id of done) grades[id] = attempted.current[id] ? 1 : 2;
    const xp = Math.max(5, done.length * 10 - errors * 2);
    onFinish({ grades, xp, correct: done.length, total: done.length, wrongIds: [] });
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl px-4 pb-16 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <ProgressBar value={solved.length} max={left.length} />
        <span className="shrink-0 text-sm text-inksoft">
          {solved.length}/{left.length} eşleşti
        </span>
      </div>
      <p className="mb-4 text-sm text-inksoft">
        Soldaki Hollandaca kelimeyi, sağdaki İngilizce/Türkçe karşılığıyla eşleştir.
      </p>

      <div className="grid grid-cols-2 gap-3" data-testid="match-board">
        <div className="flex flex-col gap-3">
          {left.map((w) => (
            <button
              key={w.id}
              type="button"
              data-testid={`tile-nl-${w.id}`}
              aria-pressed={selected === w.id}
              disabled={locked(w.id)}
              onClick={() => setSelected(w.id)}
              className={`rounded-cozy border p-3 text-left shadow-cozy transition-all ${
                locked(w.id)
                  ? "border-good/40 bg-good/10 opacity-60"
                  : selected === w.id
                    ? "border-accent bg-accentsoft"
                    : shake.includes(w.id)
                      ? "animate-shake border-danger bg-accentsoft"
                      : "border-transparent bg-surface hover:brightness-[1.02]"
              }`}
            >
              <div className="font-display text-base font-semibold sm:text-lg">
                {locked(w.id) ? "✓ " : ""}
                {w.nl}
              </div>
              {w.zin ? <div className="mt-1 text-xs italic text-inksoft">{w.zin}</div> : null}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {right.map((w) => (
            <button
              key={w.id}
              type="button"
              data-testid={`tile-tr-${w.id}`}
              disabled={locked(w.id)}
              onClick={() => tapRight(w.id)}
              className={`rounded-cozy border p-3 text-left shadow-cozy transition-all ${
                locked(w.id)
                  ? "border-good/40 bg-good/10 opacity-60"
                  : shake.includes(w.id)
                    ? "animate-shake border-danger bg-accentsoft"
                    : "border-transparent bg-surface hover:brightness-[1.02]"
              }`}
            >
              <div className="font-display text-base font-semibold sm:text-lg">{w.en}</div>
              <div className="mt-1 text-xs text-inksoft">{w.tr}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-inksoft">
        <span>Yanlış deneme: {errors}</span>
        <span className="relative">
          <XpBurst amount={burst} />
        </span>
      </div>
    </div>
  );
}
