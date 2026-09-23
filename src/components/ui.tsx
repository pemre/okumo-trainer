import type { ReactNode } from "react";

export function TopBar({ right, onHome }: { right?: ReactNode; onHome?: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex flex-nowrap items-center gap-2 border-b border-surface2 bg-sand/90 px-3 py-3 backdrop-blur sm:gap-3 sm:px-4">
      {onHome ? (
        <button
          type="button"
          onClick={onHome}
          className="-ml-1 shrink-0 rounded-full px-2 py-1 text-inksoft hover:bg-surface2"
          aria-label="Ana sayfa"
        >
          ←
        </button>
      ) : null}
      {/* min-w-0 + truncate: dar ekranda kırpılan başlık olsun, chip'ler alt satıra kaymasın */}
      <div className="min-w-0 truncate font-display text-base font-semibold tracking-tight sm:text-lg">
        okumo-trainer
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 text-xs sm:gap-2 sm:text-sm">{right}</div>
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

export function XpBurst({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <span className="animate-rise pointer-events-none absolute -top-1 right-2 text-sm font-bold text-ambertext">
      +{amount} XP
    </span>
  );
}
