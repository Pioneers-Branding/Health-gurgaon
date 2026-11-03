// Small presentational pieces shared by the community pages. Server-Component friendly (no hooks);
// the form helpers are controlled inputs used inside the community Client Components.

import Link from "next/link";
import type { ReactNode } from "react";

import { chipBase, chipOff } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { FieldError } from "@/components/ui/form";
import type { Lang } from "@/lib/i18n/config";

/** English sample data inside a Hindi page is marked lang="en". */
export function dataLang(lang: Lang): "en" | undefined {
  return lang === "hi" ? "en" : undefined;
}

/** The numbered saffron circles of "How verification works" and "How it works". */
export function NumberedSteps({ steps, descClassName }: { steps: { t: string; d: string }[]; descClassName?: string }) {
  return (
    <ol className="flex flex-col gap-3.5">
      {steps.map((s, i) => (
        <li key={s.t} className="flex items-start gap-3">
          <span aria-hidden="true" className="flex size-7.5 flex-none items-center justify-center rounded-full bg-saffron font-bold text-ink">
            {i + 1}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">{s.t}</span>
            <span className={cn("text-13.5 font-light text-muted", descClassName)}>{s.d}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** "Sign in to … It only takes your phone number. Sign in →" */
export function SignInNote({ text, href, linkLabel, className }: { text: string; href: string; linkLabel: string; className?: string }) {
  return (
    <p role="status" className={cn("text-13 leading-normal font-light text-muted", className)}>
      {text}{" "}
      {/* An inline link inside a sentence (the 44px target rule's inline exception). */}
      <Link href={href} className="font-medium whitespace-nowrap">
        {linkLabel}
      </Link>
    </p>
  );
}

// ── Controlled form pieces (real inputs, so plain form posts work without JavaScript) ──────────

export type ChipChoice = { value: string; label: ReactNode };

const chipInput =
  "cursor-pointer whitespace-normal has-checked:border-ink has-checked:bg-ink has-checked:text-cream has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal";

/** Pill radios ("Registered RWA / Apartment association / …"). */
export function RadioChips({ name, legend, options, value, onChange, error, id }: { name: string; legend: ReactNode; options: ChipChoice[]; value: string; onChange: (v: string) => void; error?: string; id: string }) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <fieldset className="flex min-w-0 flex-col" aria-invalid={error ? true : undefined} aria-describedby={errorId}>
      <legend className="mb-1.5 text-14 font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o.value} className={cn(chipBase, chipOff, chipInput)}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <div className="mt-1.5">
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      )}
    </fieldset>
  );
}

/** Pill checkboxes ("Weekdays · Weekday evenings · Weekends · Online only"). */
export function CheckChips({ name, legend, options, values, onChange, error, id }: { name: string; legend: ReactNode; options: ChipChoice[]; values: string[]; onChange: (v: string[]) => void; error?: string; id: string }) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <fieldset className="flex min-w-0 flex-col" aria-invalid={error ? true : undefined} aria-describedby={errorId}>
      <legend className="mb-1.5 text-14 font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <label key={o.value} className={cn(chipBase, chipOff, chipInput)}>
              <input
                type="checkbox"
                name={name}
                value={o.value}
                checked={on}
                onChange={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
      {error && (
        <div className="mt-1.5">
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      )}
    </fieldset>
  );
}

/** A controlled tick box with its label on the right (18px, teal tick). */
export function TickBox({ id, name, checked, onChange, children, error, small = true }: { id: string; name: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode; error?: string; small?: boolean }) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={cn("flex min-h-11 cursor-pointer items-start gap-2.5 py-2 leading-normal font-light", small ? "text-13" : "text-13.5")}>
        <input
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.currentTarget.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="mt-0.5 size-4.5 flex-none cursor-pointer accent-teal"
        />
        <span>{children}</span>
      </label>
      {error && (
        <div className="pl-7">
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      )}
    </div>
  );
}

/** The amber "while you type" warning (#FFF4D6, radius 12). */
export function TypingWarning({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} role="status" className="rounded-12 bg-pending-tint px-3 py-2.5 text-13 leading-normal text-[#5a3d00]">
      {children}
    </p>
  );
}

/** "This sounds urgent. Please don't wait for replies." (emergency red: a real emergency). */
export function UrgentBanner({ title, body, extra }: { title: string; body: string; extra?: string | null }) {
  return (
    <div role="alert" className="flex flex-col gap-1 rounded-18 bg-emergency px-4.5 py-4 text-white">
      <span className="text-17 font-bold">{title}</span>
      <span className="text-14 font-light">{body}</span>
      {extra && <span className="text-14 font-light">{extra}</span>}
    </div>
  );
}
