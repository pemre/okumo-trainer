import { type ReactNode, useState } from "react";
import { dilTasi, LANG_ADI, LANGS, type Lang, toggleLang, useT } from "../lib/i18n";
import { setTema, TEMA_ADI, TEMALAR, useTema } from "../lib/theme";
import { speak, speakAvailable } from "../lib/tts";

export function TopBar({ right, onHome }: { right?: ReactNode; onHome?: () => void }) {
  const { t } = useT();
  return (
    <header className="sticky top-0 z-20 flex flex-nowrap items-center gap-2 border-b border-surface2 bg-sand/90 px-3 py-3 backdrop-blur sm:gap-3 sm:px-4">
      {onHome ? (
        <button
          type="button"
          onClick={onHome}
          className="-ml-1 shrink-0 rounded-full px-2 py-1 text-inksoft hover:bg-surface2"
          aria-label={t("Ana sayfa")}
        >
          ←
        </button>
      ) : null}
      {/* min-w-0 + truncate: let the title clip instead of wrapping the chips — but where even a
          clipped title reads as a glitch (game screen, or a 320px phone) hide it on purpose. */}
      <div
        className={`min-w-0 truncate font-display text-base font-semibold tracking-tight sm:text-lg ${
          onHome ? "hidden sm:block" : "hidden min-[360px]:block"
        }`}
      >
        okumo-trainer
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 text-xs sm:gap-2 sm:text-sm">
        {right}
      </div>
    </header>
  );
}

export function Pill({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="shrink-0 whitespace-nowrap rounded-full bg-surface px-2 py-0.5 font-semibold text-inksoft shadow-cozy sm:px-3 sm:py-1"
    >
      {children}
    </span>
  );
}

export function CozyCard({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "button";
  [key: string]: unknown;
}) {
  return (
    <Tag
      className={`rounded-cozy bg-surface p-4 text-left shadow-cozy ${className}`}
      {...(rest as object)}
    >
      {children}
    </Tag>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface2"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BigButton({
  children,
  onClick,
  disabled,
  variant = "accent",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "accent" | "soft";
}) {
  const styles =
    variant === "accent"
      ? "bg-accent text-surface hover:brightness-110"
      : "bg-surface2 text-ink hover:brightness-105";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-6 py-3 font-semibold shadow-cozy transition-all active:scale-95 disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

/**
 * Speaker button: reads Dutch aloud with the browser's own voice (see `src/lib/tts.ts`).
 * Rendered only where the Dutch text is already visible (never to give an answer away), and not at
 * all when the browser has no speech synthesis.
 */
export function Speak({ text, className = "" }: { text: string; className?: string }) {
  const { t } = useT();
  if (!speakAvailable() || !text) return null;
  return (
    <button
      type="button"
      data-testid="speak"
      aria-label={`${t("Sesli oku")}: ${text}`}
      title={t("Sesli oku")}
      onClick={(e) => {
        e.stopPropagation(); // inside a clickable row/card: only speak, do not open/answer
        speak(text);
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full p-1 text-inksoft align-middle transition-colors hover:bg-surface2 hover:text-ink active:scale-90 ${className}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M11 4.5 6.5 8.5H3.5v7h3L11 19.5v-15Z" />
        <path d="M15.2 8.8a4.6 4.6 0 0 1 0 6.4" />
        <path d="M18.1 6.1a8.6 8.6 0 0 1 0 11.8" />
      </svg>
    </button>
  );
}

/**
 * Top-right menu: one general menu for **theme** (light/dark, browser/OS by default, see
 * `src/lib/theme.ts`) and the **interface languages** (TR / EN / both, drag the ⠿ handle or use ↑ to
 * set the priority). Native `<details>`: no JS state, opens on click and stays open when an option is
 * toggled. Turning off the last language is ignored in `toggleLang`.
 * ponytail: known ceiling — clicking outside does not close it (tap the summary again); add a
 * document click listener if that ever matters.
 */
export function SettingsMenu() {
  const { langs, t } = useT();
  const tema = useTema();
  const [cek, setCek] = useState<Lang | null>(null); // language being dragged (null on drop)
  return (
    <details className="relative" data-testid="settings-menu">
      <summary
        title={t("Ayarlar")}
        aria-label={t("Ayarlar")}
        className="cursor-pointer list-none whitespace-nowrap rounded-full bg-surface px-2 py-0.5 font-semibold text-inksoft shadow-cozy sm:px-3 sm:py-1"
      >
        ⚙️
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-64 rounded-cozy bg-surface p-3 text-left shadow-cozy">
        <div className="text-xs font-semibold">{t("Tema")}</div>
        <div className="mt-2 flex gap-1" data-testid="theme-row">
          {TEMALAR.map((x) => (
            <button
              key={x}
              type="button"
              data-testid={`theme-${x}`}
              aria-pressed={tema === x}
              onClick={() => setTema(x)}
              className={`flex-1 rounded-full px-2 py-1 text-xs font-semibold ${
                tema === x ? "bg-ink text-sand" : "bg-surface2 text-inksoft"
              }`}
            >
              {t(TEMA_ADI[x])}
            </button>
          ))}
        </div>
        <div className="mt-3 border-t border-surface2 pt-3 text-xs font-semibold">
          {t("Arayüz dilleri")}
        </div>
        {/* Rows follow the **priority order** (enabled first, in priority order): the top row is the
            priority language, so drag & drop and ↑ are visible in the menu itself. */}
        {[...langs, ...LANGS.filter((l) => !langs.includes(l))].map((l) => {
          const acik = langs.includes(l);
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: drop target for reordering the rows
            <div
              key={l}
              data-testid={`lang-row-${l}`}
              onDragOver={(e) => {
                if (!cek || cek === l) return;
                e.preventDefault(); // allow the drop → live reorder
                dilTasi(cek, l);
              }}
              className={`mt-2 flex items-center gap-2 text-sm ${acik ? "" : "text-inksoft"}`}
            >
              <input
                type="checkbox"
                data-testid={`lang-${l}`}
                checked={acik}
                onChange={() => toggleLang(l)}
              />
              <span className="flex-1">
                {LANG_ADI[l]} <span className="text-inksoft">({l.toUpperCase()})</span>
              </span>
              {acik && (
                <>
                  {/* Native HTML5 drag: mouse. Touch and keyboard use the ↑ button next to it. */}
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: drag handle, ↑ covers a11y */}
                  <span
                    draggable
                    data-testid={`lang-drag-${l}`}
                    title={t("Sırala")}
                    onDragStart={() => setCek(l)}
                    onDragEnd={() => setCek(null)}
                    className="cursor-grab select-none px-1 text-inksoft"
                  >
                    ⠿
                  </span>
                  <button
                    type="button"
                    data-testid={`lang-up-${l}`}
                    aria-label={t("Öncelikli yap")}
                    title={t("Öncelikli yap")}
                    disabled={l === langs[0]}
                    onClick={() => dilTasi(l, langs[langs.indexOf(l) - 1])}
                    className="rounded px-1 text-inksoft disabled:opacity-30"
                  >
                    ↑
                  </button>
                </>
              )}
            </div>
          );
        })}
        <p className="mt-2 text-xs text-inksoft">
          {t(
            "Öncelikli dil her yerde, diğeri yalnız anlam açıklamalarında görünür. En az bir dil açık kalır.",
          )}
        </p>
      </div>
    </details>
  );
}

export function XpBurst({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <span className="animate-rise pointer-events-none absolute -top-1 right-2 text-sm font-bold text-ambertext">
      +{amount} XP
    </span>
  );
}
