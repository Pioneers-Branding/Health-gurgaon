import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * "Never a dead end": the no-results / nothing-yet panel (cream, radius 24).
 * Always offer a next step: a nearby locality, "Suggest a listing", "Ask your
 * neighbourhood".
 */
export function EmptyState({
  title,
  kicker,
  actions,
  layout = "stack",
  className,
  children,
}: {
  title: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  /** stack: title, text, then actions · row: actions on the right (wraps on phones) */
  layout?: "stack" | "row";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-5 rounded-24 bg-cream p-6 sm:p-8",
        layout === "row" ? "flex-wrap items-center justify-between" : "flex-col",
        className,
      )}
    >
      <div className="flex max-w-[38.75rem] flex-col gap-1.5">
        {kicker}
        <p className="text-18 font-semibold leading-snug text-ink">{title}</p>
        {children && <div className="text-14.5 font-light leading-[1.55] text-muted">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
