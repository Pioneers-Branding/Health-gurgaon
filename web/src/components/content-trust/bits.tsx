// Small pieces shared by the content & trust pages. No hooks and no dictionary imports, so both
// Server and Client Components can use them (strings come in as props).

import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

/** Article label pill: Reporting/Roundup green, Opinion saffron, Sponsored ink with saffron text. */
export function ArticleLabelPill({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-6 px-2 py-0.5 font-mono text-10.5 leading-normal font-medium",
        label === "sponsored" ? "bg-ink text-saffron" : label === "opinion" ? "bg-saffron text-ink" : "bg-success-tint text-success",
      )}
    >
      {children}
    </span>
  );
}

/** The prototype's striped picture placeholder (no photos yet). */
export function Stripes({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded-14 bg-stripes", className)} />;
}

/** H1 + one line under it, as on every contribution form. */
export function FormHeader({ title, children, kicker }: { title: string; children?: ReactNode; kicker?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {kicker}
      <h1 className="text-30 leading-[1.1] font-bold tracking-h1 text-balance sm:text-36">{title}</h1>
      {children && <p className="text-15 leading-[1.55] font-light text-muted">{children}</p>}
    </div>
  );
}

/** The amber dashed box for privacy warnings while typing. */
export function WarnBox({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} role="status" className="rounded-14 border-[1.5px] border-dashed border-sponsored bg-pending-tint px-3.5 py-3 text-13.5 leading-normal text-[#5a3d00]">
      {children}
    </p>
  );
}

/** When the error appears, move focus to the first field marked invalid in its form, else to the
 * error itself. Module-level, so React calls it only when the line mounts (not on every render).
 * Only used from Client Components. */
const focusOnError = (el: HTMLParagraphElement | null) => {
  if (!el) return;
  const invalid = el.closest("form")?.querySelector<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]');
  (invalid ?? el).focus({ preventScroll: true });
  (invalid ?? el).scrollIntoView({ block: "center" });
};

/** A red line under a form when something blocks sending. Focus moves to it (or the first invalid
 * field) when it appears. */
export function FormError({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} ref={focusOnError} tabIndex={-1} role="alert" className="text-13 font-medium text-emergency outline-none">
      {children}
    </p>
  );
}

/** One 6px bar per step (claim, dispute). `current` is 1-based; the step is announced. */
export function StepBars({ steps, current, progress, doneLabel, id }: { steps: readonly string[]; current: number; progress: string; doneLabel: string; id?: string }) {
  return (
    <div id={id}>
      <p className="sr-only" aria-live="polite">
        {progress}: {steps[current - 1]}
      </p>
      <ol className="grid grid-cols-4 gap-1.5">
        {steps.map((label, i) => {
          const n = i + 1;
          return (
            <li key={label} aria-current={n === current ? "step" : undefined} className="flex min-w-0 flex-col gap-1.5">
              <span aria-hidden="true" className={cn("h-1.5 rounded-3", n <= current ? "bg-teal" : "bg-line")} />
              <span className={cn("text-12.5 leading-snug", n === current ? "font-semibold" : "font-light", n <= current ? "text-ink" : "text-subtle")}>
                {label}
                {n < current && <span className="sr-only"> ({doneLabel})</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** "PHASE 2" / "PHASE 2B" tag. */
export function PhaseTag({ children, soft = false }: { children: ReactNode; soft?: boolean }) {
  return (
    <span className={cn("inline-flex items-center self-start rounded-pill px-2.25 py-0.75 font-mono text-10.5 font-medium whitespace-nowrap uppercase", soft ? "bg-saffron-soft text-ink" : "bg-saffron text-ink")}>
      {children}
    </span>
  );
}

/** Small cream tile used in policy lists ("Share a patient's name…"). */
export function PolicyTiles({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-2.5">
      {items.map((item) => (
        <li key={item} className="rounded-16 bg-cream p-3.5 text-13.5 leading-normal font-light">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** English data (titles, review text) on a Hindi page: mark it lang="en". */
export function dataLang(lang: "en" | "hi"): "en" | undefined {
  return lang === "hi" ? "en" : undefined;
}
