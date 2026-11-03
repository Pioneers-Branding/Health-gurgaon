// Controlled pill chips and choice cards for the contribution forms. They are real radio inputs
// (so a plain form post carries the value without JavaScript) whose checked state comes from the
// form's own state, so React's automatic form reset after an action never loses an answer.

import type { ReactNode } from "react";

import { chipBase, chipOff } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { FieldError } from "@/components/ui/form";

export type ChipOption = { value: string; label: ReactNode };

export function ChipRadios({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  legendClassName,
  idPrefix,
}: {
  name: string;
  legend: ReactNode;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Replaces the legend's classes. */
  legendClassName?: string;
  idPrefix?: string;
}) {
  const errorId = error ? `${idPrefix ?? name}-error` : undefined;
  return (
    <fieldset className="flex min-w-0 flex-col gap-2" aria-invalid={error ? true : undefined} aria-describedby={errorId}>
      <legend className={legendClassName ?? "mb-2 text-14.5 font-medium text-ink"}>{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              chipBase,
              chipOff,
              "cursor-pointer whitespace-normal has-checked:border-ink has-checked:bg-ink has-checked:text-cream has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal",
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
}

export type CardOption = { value: string; title: ReactNode; detail?: ReactNode; extra?: ReactNode; kicker?: ReactNode };

/** Big selectable cards: 1.5px hairline, selected = 2px teal border on green tint. */
export function CardRadios({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  hideLegend = false,
  minWidth = "13.75rem",
  legendClassName,
  idPrefix,
}: {
  name: string;
  legend: ReactNode;
  options: CardOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hideLegend?: boolean;
  minWidth?: string;
  /** Replaces the legend's classes. */
  legendClassName?: string;
  /** Gives each input an id, `${idPrefix}-${value}` (for CSS :has() switches). */
  idPrefix?: string;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2" aria-invalid={error ? true : undefined}>
      <legend className={hideLegend ? "sr-only" : (legendClassName ?? "mb-2 text-17 font-semibold text-ink")}>{legend}</legend>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minWidth}), 1fr))` }}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer flex-col gap-1 rounded-18 border-[1.5px] border-line bg-white p-4 text-ink transition-colors hover:border-subtle has-checked:border-2 has-checked:border-teal has-checked:bg-success-tint has-checked:p-3.75 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal"
          >
            <input
              type="radio"
              id={idPrefix ? `${idPrefix}-${o.value}` : undefined}
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.kicker}
            <span className="text-15.5 leading-snug font-semibold">{o.title}</span>
            {o.detail && <span className="text-13 leading-[1.45] font-light text-muted">{o.detail}</span>}
            {o.extra}
          </label>
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </fieldset>
  );
}

/** "12 characters · at least 40" under a textarea. */
export function CharCount({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <span id={id} className="text-12 font-light text-subtle">
      {children}
    </span>
  );
}
