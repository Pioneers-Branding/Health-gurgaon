"use client";

// "+ Compare" on list entries, the sticky "Comparing: A vs B" bar and the side-by-side table.
// Up to two entries (picking a third drops the oldest, as in the prototype). Kept in the page:
// comparing is a moment's tool, not a filter worth a URL.

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export type CompareEntry = {
  id: string;
  name: string;
  ownership: string;
  type: string;
  score: number;
  reviews: string;
  subs: { label: string; value: number }[];
  details: string;
};

export type CompareLabels = {
  add: string;
  on: string;
  addLabel: string;
  comparing: string;
  pickOne: string;
  clear: string;
  show: string;
  hide: string;
  tableLabel: string;
  ownership: string;
  type: string;
  score: string;
  reviews: string;
  details: string;
  scoreValue: string;
};

type Ctx = { picked: string[]; toggle: (id: string) => void; clear: () => void; open: boolean; setOpen: (v: boolean) => void };
const CompareContext = createContext<Ctx | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const value = useMemo<Ctx>(
    () => ({
      picked,
      toggle: (id) => {
        setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));
        setOpen(false);
      },
      clear: () => {
        setPicked([]);
        setOpen(false);
      },
      open,
      setOpen,
    }),
    [picked, open],
  );
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

function useCompare(): Ctx {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("CompareToggle and CompareBar need a CompareProvider");
  return ctx;
}

export function CompareToggle({ id, name, labels }: { id: string; name: string; labels: Pick<CompareLabels, "add" | "on" | "addLabel"> }) {
  const { picked, toggle } = useCompare();
  const on = picked.includes(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={labels.addLabel.replace("{name}", name)}
      onClick={() => toggle(id)}
      className={cn(
        "inline-flex min-h-11 items-center rounded-pill border-[1.5px] px-3.5 text-13",
        on ? "border-success bg-success-tint text-success" : "border-line-strong bg-white text-ink hover:border-ink",
      )}
    >
      {on ? labels.on : labels.add}
    </button>
  );
}

export function CompareBar({ entries, labels }: { entries: CompareEntry[]; labels: CompareLabels }) {
  const { picked, clear, open, setOpen } = useCompare();
  const chosen = picked.map((id) => entries.find((e) => e.id === id)).filter((e): e is CompareEntry => !!e);
  if (chosen.length === 0) return null;
  const names = chosen.map((e) => e.name).join(" vs ") + (chosen.length < 2 ? labels.pickOne : "");
  const rows: { k: string; vals: string[] }[] =
    chosen.length === 2
      ? [
          { k: labels.ownership, vals: chosen.map((e) => e.ownership) },
          { k: labels.type, vals: chosen.map((e) => e.type) },
          { k: labels.score, vals: chosen.map((e) => labels.scoreValue.replace("{score}", String(e.score))) },
          { k: labels.reviews, vals: chosen.map((e) => e.reviews) },
          ...chosen[0].subs.map((s, i) => ({ k: s.label, vals: chosen.map((e) => String(e.subs[i]?.value ?? "")) })),
          { k: labels.details, vals: chosen.map((e) => e.details) },
        ]
      : [];
  return (
    <>
      <div
        role="region"
        aria-label={labels.tableLabel}
        className="on-dark sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-20 bg-ink px-4.5 py-3.5 text-cream shadow-[0_12px_30px_-10px_rgba(0,0,0,.4)]"
      >
        <p aria-live="polite" className="min-w-0 flex-1 text-14.5 font-medium">
          {labels.comparing.replace("{names}", names)}
        </p>
        <button type="button" onClick={clear} className="inline-flex min-h-11 items-center rounded-pill border border-night-edge px-3.5 text-13 text-cream hover:border-cream">
          {labels.clear}
        </button>
        <button
          type="button"
          disabled={chosen.length < 2}
          aria-expanded={chosen.length === 2 ? open : undefined}
          aria-controls="compare-table"
          onClick={() => setOpen(!open)}
          className="inline-flex min-h-11 items-center rounded-pill bg-saffron px-4 text-13.5 font-semibold text-ink hover:bg-saffron-soft disabled:opacity-60"
        >
          {open ? labels.hide : labels.show}
        </button>
      </div>
      {open && chosen.length === 2 && (
        <div id="compare-table" className="overflow-x-auto rounded-22 border-[1.5px] border-ink">
          <table className="w-full min-w-[35rem] border-collapse text-left text-14">
            <caption className="sr-only">{labels.tableLabel}</caption>
            <thead>
              <tr className="bg-cream">
                <td className="w-[9.375rem] px-4.5 py-3" />
                {chosen.map((e) => (
                  <th key={e.id} scope="col" className="px-4.5 py-3 font-semibold">
                    {e.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.k} className="border-t border-line bg-white">
                  <th scope="row" className="px-4.5 py-3 align-top font-mono text-10.5 font-medium text-subtle uppercase">
                    {r.k}
                  </th>
                  {r.vals.map((v, i) => (
                    <td key={i} className="px-4.5 py-3 align-top font-light">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
