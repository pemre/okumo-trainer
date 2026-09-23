import type { ReactNode } from "react";

export function TopBar({ right, onHome }: { right?: ReactNode; onHome?: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-surface2 bg-sand/90 px-4 py-3 backdrop-blur">
      {onHome ? (
        <button
          type="button"
          onClick={onHome}
          className="rounded-full px-2 py-1 text-inksoft hover:bg-surface2"
          aria-label="Ana sayfa"
        >
          ←
        </button>
      ) : null}
      <div className="font-display text-lg font-semibold tracking-tight">okumo-trainer</div>
      <div className="ml-auto flex items-center gap-2 text-sm">{right}</div>
    </header>
  );
}

export function Pill({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-inksoft shadow-cozy"
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
