"use client";

// "04 · Live demo: Paediatricians, Sohna Road: raw count vs safeguarded". Each safeguard is a
// checkbox; the ranking is recomputed with rankDemo() from lib/ranking (the same arithmetic as the
// prototype). Sample doctors, not listings.

import { useState } from "react";

import { cn } from "@/components/ui/cn";
import { DEMO_SAFEGUARDS, rankDemo, type DemoDoc, type DemoSafeguard } from "@/lib/ranking";

import { demoNotes } from "./format";

export type DemoLabels = {
  rawCount: string;
  allSafeguards: string;
  safeguards: string;
  safeguardText: Record<string, { label: string; detail: string }>;
  demoSub: string;
  demoBelow: string;
  unitScore: string;
  unitRaw: string;
  unitNotRanked: string;
  moveUp: string;
  moveDown: string;
  moveSame: string;
  moveUpLabel: string;
  moveDownLabel: string;
  moveSameLabel: string;
  notes: Record<string, string>;
  demoLabel: string;
  demoStatus: string;
  rank: string;
};

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));
const ALL_ON = Object.fromEntries(DEMO_SAFEGUARDS.map((s) => [s.key, true])) as Record<DemoSafeguard, boolean>;
const ALL_OFF = Object.fromEntries(DEMO_SAFEGUARDS.map((s) => [s.key, false])) as Record<DemoSafeguard, boolean>;

/** `heading` is the section's kicker, h2 and intro, laid out beside the two buttons. */
export function NeighbourDemo({ docs, labels, heading, lang }: { docs: DemoDoc[]; labels: DemoLabels; heading: React.ReactNode; lang: "en" | "hi" }) {
  const [on, setOn] = useState<Record<DemoSafeguard, boolean>>(ALL_ON);
  const anyOn = Object.values(on).some(Boolean);
  const allOn = Object.values(on).every(Boolean);
  const { ranked, unranked } = rankDemo(docs, on);
  const max = Math.max(...ranked.map((r) => r.score), 1);
  const num = (n: number) => new Intl.NumberFormat(lang === "hi" ? "hi-IN" : "en-IN", { minimumFractionDigits: anyOn ? 1 : 0, maximumFractionDigits: 1 }).format(n);

  const pill = (active: boolean) =>
    cn("inline-flex min-h-11 items-center rounded-pill border-[1.5px] px-3.75 text-13.5", active ? "border-ink bg-ink text-cream" : "border-line-strong bg-white text-ink hover:border-ink");

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        {heading}
        <div className="flex gap-1.5">
          <button type="button" aria-pressed={!anyOn} onClick={() => setOn(ALL_OFF)} className={pill(!anyOn)}>
            {labels.rawCount}
          </button>
          <button type="button" aria-pressed={allOn} onClick={() => setOn(ALL_ON)} className={pill(allOn)}>
            {labels.allSafeguards}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <fieldset className="flex max-w-90 min-w-0 flex-[1_1_16.25rem] flex-col gap-2 rounded-22 border border-line p-4.5">
          <legend className="sr-only">{labels.safeguards}</legend>
          <span aria-hidden="true" className="mono-label pb-1 text-10.5 text-subtle">
            {labels.safeguards}
          </span>
          {DEMO_SAFEGUARDS.map((s) => {
            const text = labels.safeguardText[s.key] ?? { label: s.label, detail: s.detail };
            return (
              <label key={s.key} className="flex cursor-pointer items-start gap-3 border-t border-cream-deep py-2">
                <input
                  type="checkbox"
                  checked={on[s.key]}
                  onChange={() => setOn((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                  className="mt-px size-5 flex-none cursor-pointer accent-teal"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-14.5 font-medium">{text.label}</span>
                  <span className="text-12.5 leading-[1.45] font-light text-muted">{text.detail}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <div className="flex min-w-0 flex-[2_1_25rem] flex-col gap-2.5">
          <p role="status" className="sr-only">
            {ranked[0] ? fill(labels.demoStatus, { first: ranked[0].name }) : ""}
          </p>
          <ol aria-label={labels.demoLabel} className="flex flex-col gap-2.5">
            {ranked.map((r, i) => {
              const notes = demoNotes(r.doc, on);
              const width = (anyOn ? r.score / max : r.doc.raw / Math.max(...docs.map((d) => d.raw))) * 100;
              const [move, moveLabel, moveTone] =
                r.delta > 0
                  ? [fill(labels.moveUp, { n: r.delta }), fill(labels.moveUpLabel, { n: r.delta }), "text-success"]
                  : r.delta < 0
                    ? [fill(labels.moveDown, { n: -r.delta }), fill(labels.moveDownLabel, { n: -r.delta }), "text-caution"]
                    : [labels.moveSame, labels.moveSameLabel, "text-subtle"];
              return (
                <li key={r.name} className="flex flex-col gap-2.5 rounded-18 border border-line bg-white p-3.5">
                  <div className="flex flex-wrap items-center gap-3.5">
                    <span className={cn("flex size-10.5 flex-none items-center justify-center rounded-12 text-18 font-bold", i < 3 ? "bg-saffron" : "bg-cream")}>
                      <span aria-hidden="true">{r.rank}</span>
                      <span className="sr-only">{fill(labels.rank, { n: r.rank })}</span>
                    </span>
                    <div className="flex min-w-45 flex-1 flex-col gap-0.75">
                      <span className="text-16.5 font-semibold">{r.name}</span>
                      <span className="text-12.5 font-light text-muted">{fill(labels.demoSub, { raw: r.doc.raw, unique: r.doc.unique, neg: r.doc.neg })}</span>
                    </div>
                    <div className="flex min-w-27.5 flex-col items-end gap-0.5">
                      <span className="text-24 font-bold tracking-h3 text-teal">{num(r.score)}</span>
                      <span className="font-mono text-10 text-subtle uppercase">{anyOn ? labels.unitScore : labels.unitRaw}</span>
                    </div>
                    <span className={cn("min-w-20 text-right font-mono text-11 font-medium", moveTone)}>
                      <span aria-hidden="true">{move}</span>
                      <span className="sr-only">{moveLabel}</span>
                    </span>
                  </div>
                  <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-3 bg-line">
                    <span className={cn("block h-full transition-[width] duration-400", i === 0 ? "bg-saffron" : "bg-teal")} style={{ width: `${Math.max(0, Math.min(100, width))}%` }} />
                  </span>
                  {notes.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {notes.map((n) => (
                        <li key={n.key} className="rounded-pill bg-pending-tint px-2.25 py-0.75 text-11.5 font-medium text-pending">
                          {fill(labels.notes[n.key] ?? n.key, { n: n.n })}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {unranked.map((u) => (
              <li key={u.name} className="flex flex-col gap-2.5 rounded-18 border border-dashed border-line-strong bg-[#FDFAF4] p-3.5">
                <div className="flex flex-wrap items-center gap-3.5">
                  <span aria-hidden="true" className="flex size-10.5 flex-none items-center justify-center rounded-12 bg-cream-deep text-18 font-bold text-subtle">
                    –
                  </span>
                  <div className="flex min-w-45 flex-1 flex-col gap-0.75">
                    <span className="text-16.5 font-semibold">{u.name}</span>
                    <span className="text-12.5 font-light text-muted">{fill(labels.demoBelow, { n: u.residents })}</span>
                  </div>
                  <div className="flex min-w-27.5 flex-col items-end gap-0.5">
                    <span className="text-24 font-bold tracking-h3 text-teal">—</span>
                    <span className="font-mono text-10 text-subtle uppercase">{labels.unitNotRanked}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}
