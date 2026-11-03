import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

/** done (green ✓) · warn (caution !, finished without the hoped-for result) · act (saffron !,
 * waiting for you) · now (saffron ring, in progress) · next (beige ring, not yet). */
export type StepState = "done" | "warn" | "act" | "now" | "next";
export type ProgressStep = { title: ReactNode; detail?: ReactNode; state: StepState };

export type StepLabels = {
  stepTag: { now: string; act: string; next: string };
  stepSr: Record<StepState, string>;
};

const DOT: Record<StepState, string> = {
  done: "bg-success text-white",
  warn: "bg-caution text-white",
  act: "bg-saffron text-ink",
  now: "border-3 border-saffron bg-white",
  next: "border-2 border-phase bg-white",
};
const ICON: Partial<Record<StepState, string>> = { done: "✓", warn: "!", act: "!" };

/** "Received → Checking with the lab → Fixed, or couldn’t verify": the progress of something you
 * sent, with the state spelled out for screen readers. */
export function ProgressSteps({ steps, labels, className }: { steps: ProgressStep[]; labels: StepLabels; className?: string }) {
  return (
    <ol className={cn("flex min-w-0 flex-col", className)}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const tag = s.state === "now" || s.state === "act" || s.state === "next" ? labels.stepTag[s.state] : null;
        return (
          <li key={i} className="flex min-w-0 gap-3">
            <div aria-hidden="true" className="flex w-6 flex-none flex-col items-center">
              <span className={cn("box-border flex size-6 flex-none items-center justify-center rounded-full text-12.5 font-bold", DOT[s.state])}>{ICON[s.state] ?? ""}</span>
              {!last && <span className={cn("my-0.75 min-h-3 w-0.5 flex-1", s.state === "done" || s.state === "warn" ? "bg-success" : "bg-line-strong")} />}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 pb-3">
              <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="sr-only">{labels.stepSr[s.state]}</span>
                <span
                  className={cn(
                    "text-14.5 font-semibold leading-[1.4]",
                    s.state === "next" ? "text-subtle" : s.state === "act" || s.state === "warn" ? "text-caution" : "text-ink",
                  )}
                >
                  {s.title}
                </span>
                {tag && <span className={cn("mono-label text-10 tracking-[.04em]", s.state === "next" ? "text-subtle" : "text-caution")}>{tag}</span>}
              </span>
              {s.detail && <span className="text-13.5 font-light leading-[1.55] text-ink-soft">{s.detail}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** The small status pills: ok (green) · wait (pending, dashed) · warn (caution) · act (saffron) · off. */
export type PillTone = "ok" | "wait" | "warn" | "act" | "off";
const PILL: Record<PillTone, string> = {
  ok: "bg-success-tint text-success",
  wait: "border border-dashed border-sponsored bg-pending-tint text-pending",
  warn: "border border-line-strong bg-cream text-caution",
  act: "bg-saffron text-ink",
  off: "bg-line text-ink-soft",
};

export function StatusPill({ tone, children, className }: { tone: PillTone; children: ReactNode; className?: string }) {
  return <span className={cn("flex-none self-start whitespace-nowrap rounded-pill px-2.75 py-1 text-12.5 font-semibold", PILL[tone], className)}>{children}</span>;
}
