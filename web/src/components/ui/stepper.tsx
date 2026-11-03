import { fmt, getDictionary, type Lang } from "@/lib/i18n";
import { cn } from "./cn";

/**
 * Multi-step form progress (claim a profile, dispute, submit an event):
 * one 6px bar per step, teal up to the current step, labels underneath.
 * `current` is 1-based. The current step is announced to screen readers.
 */
export function Stepper({
  lang,
  steps,
  current,
  className,
  id,
}: {
  lang: Lang;
  steps: string[];
  current: number;
  className?: string;
  /** Lets a form scroll back to the steps (e.g. id="dispute-steps"). */
  id?: string;
}) {
  const t = getDictionary(lang).stepper;
  return (
    <div id={id} className={className}>
      <p className="sr-only" aria-live="polite">
        {fmt(t.progress, { current, total: steps.length })}: {steps[current - 1]}
      </p>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const isCurrent = n === current;
          return (
            <li key={label} aria-current={isCurrent ? "step" : undefined} className="flex min-w-0 flex-col gap-1.5">
              <span aria-hidden="true" className={cn("h-1.5 rounded-3", n <= current ? "bg-teal" : "bg-line")} />
              <span
                className={cn(
                  "text-12.5 leading-snug",
                  isCurrent ? "font-semibold" : "font-light",
                  n <= current ? "text-ink" : "text-subtle",
                )}
              >
                {label}
                {done && <span className="sr-only"> ({t.done})</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
