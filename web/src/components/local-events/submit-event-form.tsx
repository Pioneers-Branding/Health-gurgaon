"use client";

// "Submit a health event" (prototype #submit): Template → Details → Organiser → Review, then the
// confirmation with the reference and what happens next. One form holds every step (the hidden
// steps stay in the form), each step is checked with the shared zod schemas before moving on,
// and "Submit for review" posts everything to the submitEvent Server Action, which checks it all
// again. Server errors send the reader back to the first step with a problem.

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import { submitEvent, type SubmitEventData } from "@/app/actions/events";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";
import { EVENT_TEMPLATES, ORGANISER_TYPES } from "@/lib/domain";
import type { LocalEventsStrings } from "@/lib/i18n/areas/local-events";
import type { Lang } from "@/lib/i18n/config";
import { eventDetailsSchema, eventOrganiserSchema } from "@/lib/validation/event";

import { fill } from "./format";

type S = LocalEventsStrings["submit"];

type Values = {
  template: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  locality: string;
  eligibility: string;
  cost: "Free" | "Paid";
  costAmount: string;
  orgType: (typeof ORGANISER_TYPES)[number];
  org: string;
  contact: string;
  role: string;
  phone: string;
  registration: string;
};

const EMPTY: Values = {
  template: "",
  title: "",
  date: "",
  time: "",
  venue: "",
  locality: "",
  eligibility: "",
  cost: "Free",
  costAmount: "",
  orgType: "rwa",
  org: "",
  contact: "",
  role: "",
  phone: "",
  registration: "",
};

const STEP_OF: Record<string, number> = {
  template: 1,
  title: 2,
  date: 2,
  time: 2,
  venue: 2,
  locality: 2,
  eligibility: 2,
  cost: 2,
  costAmount: 2,
  orgType: 3,
  org: 3,
  contact: 3,
  role: 3,
  phone: 3,
  consent1: 4,
  consent2: 4,
  consent3: 4,
  registration: 4,
};

const pill = (on: boolean) =>
  cn(
    "inline-flex min-h-11 cursor-pointer items-center rounded-pill border-[1.5px] px-3.25 text-13 transition-colors has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal",
    on ? "border-ink bg-ink text-cream" : "border-line-strong bg-white text-ink hover:border-ink",
  );

const inputClass = (err: boolean) =>
  cn(
    "w-full min-w-0 rounded-12 border-[1.5px] bg-white px-3 py-2.75 text-15 font-light text-ink placeholder:text-subtle focus-visible:border-teal",
    err ? "border-emergency" : "border-line-strong",
  );

export function SubmitEventForm({ lang, s, templates, organiserTypes, calendarHref, activityHref, eventHref }: {
  lang: Lang;
  s: S;
  /** Template names and details in the page language, in EVENT_TEMPLATES order. */
  templates: { name: string; detail: string }[];
  organiserTypes: Record<string, string>;
  calendarHref: string;
  activityHref: string;
  /** The event page path for a slug ("/gurgaon/events/" + slug): the routes builder output with a placeholder. */
  eventHref: string;
}) {
  const [state, action, pending] = useActionState<ActionState<SubmitEventData>, FormData>(submitEvent, idle);
  const [step, setStep] = useState(1);
  const [v, setV] = useState<Values>(EMPTY);
  const [consent, setConsent] = useState([false, false, false]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consentError, setConsentError] = useState(false);
  const [doneKey, setDoneKey] = useState<unknown>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const handled = useRef<unknown>(null);

  const submitted = state.status === "success" && state.data && doneKey !== state;

  // Server answers: back to the first step with a problem, or the confirmation.
  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.status === "error") {
      const keys = Object.keys(state.fieldErrors ?? {});
      if (keys.length) {
        const first = Math.min(...keys.map((k) => STEP_OF[k] ?? 4));
        const next: Record<string, string> = {};
        for (const k of keys) next[k] = s.errors[k] ?? state.fieldErrors?.[k]?.[0] ?? s.errorSummary;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setErrors(next);
        setConsentError(keys.some((k) => k.startsWith("consent")));
        setStep(first);
      }
    } else if (state.status === "success") {
      requestAnimationFrame(() => doneRef.current?.focus());
    }
  }, [state, s]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setV((old) => ({ ...old, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  function focusFirst() {
    requestAnimationFrame(() => {
      const el = cardRef.current?.querySelector<HTMLElement>("[aria-invalid='true']") ?? cardRef.current?.querySelector<HTMLElement>("h2");
      el?.focus();
    });
  }

  function validate(n: number): boolean {
    const result =
      n === 2
        ? eventDetailsSchema.safeParse({ ...v, eligibility: v.eligibility, costAmount: v.costAmount })
        : n === 3
          ? eventOrganiserSchema.safeParse({ orgType: v.orgType, org: v.org, contact: v.contact, role: v.role, phone: v.phone })
          : null;
    if (!result || result.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !next[key]) next[key] = s.errors[key] ?? issue.message;
    }
    setErrors(next);
    focusFirst();
    return false;
  }

  function go(n: number) {
    setStep(n);
    requestAnimationFrame(() => cardRef.current?.querySelector<HTMLElement>("h2")?.focus());
  }

  function chooseTemplate(i: number) {
    const name = EVENT_TEMPLATES[i].name;
    setV((old) => ({ ...old, template: name, title: old.title || (i === 0 ? (lang === "hi" ? "मुफ़्त स्वास्थ्य जाँच कैंप" : "Free health check-up camp") : templates[i].name) }));
    go(2);
  }

  function next() {
    if (step === 1) {
      if (!v.template) setV((old) => ({ ...old, template: EVENT_TEMPLATES[0].name, title: old.title || (lang === "hi" ? "मुफ़्त स्वास्थ्य जाँच कैंप" : "Free health check-up camp") }));
      go(2);
      return;
    }
    if (validate(step)) go(step + 1);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    // Enter in a field on steps 1–3 means "Continue"; only step 4 posts.
    if (step < 4) {
      e.preventDefault();
      next();
      return;
    }
    if (!consent.every(Boolean)) {
      e.preventDefault();
      setConsentError(true);
      requestAnimationFrame(() => document.getElementById("ev-consent-error")?.focus());
    }
  }

  function reset() {
    setDoneKey(state);
    setV(EMPTY);
    setConsent([false, false, false]);
    setErrors({});
    setConsentError(false);
    setStep(1);
  }

  if (submitted && state.status === "success" && state.data) {
    const d = state.data;
    return (
      <div className="flex flex-col gap-5 rounded-24 border border-line p-7">
        <div className="flex items-center gap-3.5">
          <span aria-hidden="true" className="flex size-12 flex-none items-center justify-center rounded-full bg-success text-22 font-bold text-white">
            ✓
          </span>
          <div className="flex min-w-0 flex-col gap-0.75">
            <h2 ref={doneRef} tabIndex={-1} className="text-22 font-bold tracking-title [overflow-wrap:anywhere]">
              {fill(s.doneTitle, { title: d.title })}
            </h2>
            <span className="font-mono text-11.5 text-subtle uppercase">{fill(s.doneRef, { ref: d.ref })}</span>
          </div>
        </div>
        <p role="status" className="sr-only">
          {state.message}
        </p>
        <ol className="flex flex-col">
          {s.tracker.map((tr, i) => (
            <li key={tr.title} className="flex gap-3.5 py-3">
              <span aria-hidden="true" className={cn("mt-0.75 size-4 flex-none rounded-full", i === 0 ? "bg-success" : i === 1 ? "bg-saffron" : "bg-line")} />
              <div className="flex flex-col gap-0.5">
                <span className="text-15 font-semibold">{tr.title}</span>
                <span className="text-13.5 font-light text-muted">{tr.body}</span>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Link href={calendarHref} className="inline-flex min-h-11 items-center rounded-pill bg-ink px-4.5 text-14 text-cream hover:bg-ink-soft hover:text-cream">
            {s.backToCalendar}
          </Link>
          <button type="button" onClick={reset} className="min-h-11 rounded-pill border-[1.5px] border-line-strong bg-white px-4.5 text-14 text-ink hover:border-ink">
            {s.another}
          </button>
        </div>
        <div className="flex flex-wrap gap-x-5">
          <Link href={activityHref} className="inline-flex min-h-11 items-center text-14 font-medium">
            {s.seeActivity}
          </Link>
          <Link href={eventHref.replace("__slug__", d.slug)} className="inline-flex min-h-11 items-center text-14 font-medium">
            {s.seeEvent}
          </Link>
        </div>
      </div>
    );
  }

  const field = (key: keyof Values, label: string, opts: { ph?: string; type?: string; inputMode?: "numeric" | "tel" | "text"; autoComplete?: string; required?: boolean } = {}) => {
    const id = `ev-${key}`;
    const err = errors[key];
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-14 font-medium">
          {label}
        </label>
        <input
          id={id}
          name={key}
          type={opts.type ?? "text"}
          value={v[key]}
          onChange={(e) => set(key, e.target.value as never)}
          placeholder={opts.ph}
          inputMode={opts.inputMode}
          autoComplete={opts.autoComplete ?? "off"}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${id}-error` : undefined}
          aria-required={opts.required || undefined}
          className={inputClass(!!err)}
        />
        {err && (
          <span id={`${id}-error`} className="text-12.5 font-medium text-emergency">
            {err}
          </span>
        )}
      </div>
    );
  };

  const summary: [string, string][] = [
    [s.summary.template, templates[EVENT_TEMPLATES.findIndex((x) => x.name === v.template)]?.name ?? "—"],
    [s.summary.title, v.title],
    [s.summary.when, `${v.date} · ${v.time}`],
    [s.summary.where, [v.venue, v.locality].filter(Boolean).join(", ")],
    [s.summary.cost, v.cost === "Free" ? s.costFree : [s.costPaid, v.costAmount].filter(Boolean).join(" · ")],
    [s.summary.organiser, `${v.org} (${organiserTypes[v.orgType] ?? v.orgType})`],
    [s.summary.contact, fill(s.contactPrivate, { name: v.contact })],
  ];

  return (
    <>
      <div>
        <p className="sr-only" aria-live="polite">
          {fill(s.progress, { n: step, name: s.steps[step - 1] })}
        </p>
        <ol className="grid grid-cols-4 gap-1.5">
          {s.steps.map((name, i) => (
            <li key={name} aria-current={i + 1 === step ? "step" : undefined} className="flex min-w-0 flex-col gap-1.5">
              <span aria-hidden="true" className={cn("h-1.5 rounded-3", i + 1 <= step ? "bg-teal" : "bg-line")} />
              <span className={cn("text-12.5", i + 1 === step ? "font-semibold" : "font-light", i + 1 <= step ? "text-ink" : "text-subtle")}>
                {i + 1} · {name}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <form action={action} onSubmit={onSubmit} noValidate ref={undefined}>
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="template" value={v.template} />
        <div ref={cardRef} className="flex flex-col gap-4.5 rounded-24 border border-line p-6.5">
          <div hidden={step !== 1} className="flex flex-col gap-4.5">
            <h2 tabIndex={-1} className="text-19 font-semibold">
              {s.templateTitle}
            </h2>
            <div role="group" aria-label={s.templateLegend} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,11.25rem),1fr))] gap-2.5">
              {templates.map((tp, i) => {
                const on = v.template === EVENT_TEMPLATES[i].name;
                return (
                  <button
                    key={tp.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => chooseTemplate(i)}
                    className={cn(
                      "flex min-h-24 flex-col gap-1 rounded-18 p-4 text-left text-ink",
                      on ? "border-2 border-teal bg-success-tint p-3.75" : "border-[1.5px] border-line bg-white hover:border-subtle",
                    )}
                  >
                    <span className="text-15 font-semibold">{tp.name}</span>
                    <span className="text-12.5 leading-[1.4] font-light text-muted">{tp.detail}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div hidden={step !== 2} className="flex flex-col gap-4.5">
            <h2 tabIndex={-1} className="text-19 font-semibold">
              {s.detailsTitle}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.75rem),1fr))] gap-3.5">
              {field("title", s.title, { ph: s.titlePh, required: true })}
              {field("date", s.date, { type: "date", required: true })}
              {field("time", s.time, { type: "time", required: true })}
              {field("venue", s.venue, { ph: s.venuePh, required: true })}
              {field("locality", s.locality, { ph: s.localityPh, required: true })}
              {field("eligibility", s.eligibility, { ph: s.eligibilityPh })}
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-14 font-medium">{s.cost}</legend>
              <div className="flex flex-wrap gap-1.5">
                {(["Free", "Paid"] as const).map((c) => (
                  <label key={c} className={pill(v.cost === c)}>
                    <input type="radio" name="cost" value={c} checked={v.cost === c} onChange={() => set("cost", c)} className="sr-only" />
                    {c === "Free" ? s.costFree : s.costPaid}
                  </label>
                ))}
              </div>
            </fieldset>
            {v.cost === "Paid" ? (
              <div className="max-w-[16rem]">{field("costAmount", s.amount, { ph: s.amountPh })}</div>
            ) : (
              <input type="hidden" name="costAmount" value="" />
            )}
          </div>

          <div hidden={step !== 3} className="flex flex-col gap-4.5">
            <h2 tabIndex={-1} className="text-19 font-semibold">
              {s.organiserTitle}
            </h2>
            <fieldset>
              <legend className="sr-only">{s.orgTypeLegend}</legend>
              <div className="flex flex-wrap gap-1.5">
                {ORGANISER_TYPES.map((o) => (
                  <label key={o} className={pill(v.orgType === o)}>
                    <input type="radio" name="orgType" value={o} checked={v.orgType === o} onChange={() => set("orgType", o)} className="sr-only" />
                    {organiserTypes[o] ?? o}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.75rem),1fr))] gap-3.5">
              {field("org", s.org, { ph: s.orgPh, required: true, autoComplete: "organization" })}
              {field("contact", s.contact, { ph: s.contactPh, required: true, autoComplete: "name" })}
              {field("role", s.role, { ph: s.rolePh, autoComplete: "organization-title" })}
              {field("phone", s.phone, { ph: s.phonePh, type: "tel", inputMode: "tel", required: true, autoComplete: "tel-national" })}
            </div>
            <p className="rounded-16 bg-cream px-4 py-3.5 text-13.5 leading-[1.55] font-light text-muted">
              {s.phoneNote1}
              <b className="font-semibold">{s.phoneNoteBold}</b>
              {s.phoneNote2}
            </p>
          </div>

          <div hidden={step !== 4} className="flex flex-col gap-4.5">
            <h2 tabIndex={-1} className="text-19 font-semibold">
              {s.reviewTitle}
            </h2>
            <dl className="overflow-hidden rounded-18 border border-line">
              {summary.map(([k, val], i) => (
                <div key={k} className={cn("grid grid-cols-[minmax(0,8.75rem)_minmax(0,1fr)] gap-3 px-4 py-2.75 text-14", i > 0 && "border-t border-line")}>
                  <dt className="mono-label pt-0.5 text-10.5 text-subtle">{k}</dt>
                  <dd className="[overflow-wrap:anywhere]">{val}</dd>
                </div>
              ))}
            </dl>
            <div className="max-w-[30rem]">{field("registration", s.registration, { ph: s.registrationPh })}</div>
            <fieldset className="flex flex-col gap-1" aria-describedby={consentError ? "ev-consent-error" : undefined}>
              <legend className="sr-only">{s.consentsLegend}</legend>
              {s.consents.map((label, i) => (
                <label key={i} className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1.5 text-13.5 leading-normal font-light">
                  <input
                    type="checkbox"
                    name={`consent${i + 1}`}
                    checked={consent[i]}
                    onChange={() => {
                      setConsent((c) => c.map((x, j) => (j === i ? !x : x)));
                      setConsentError(false);
                    }}
                    className="mt-0.5 size-4.5 flex-none accent-teal"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {consentError && (
              <p id="ev-consent-error" tabIndex={-1} role="alert" className="text-13 font-medium text-emergency">
                {s.consentError}
              </p>
            )}
            {state.status === "error" && !Object.keys(state.fieldErrors ?? {}).length && (
              <p role="alert" className="text-13.5 font-medium text-emergency">
                {state.message}
              </p>
            )}
          </div>

          <div className="flex justify-between gap-2.5 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => go(Math.max(1, step - 1))}
              className={cn("min-h-11 rounded-pill border-[1.5px] border-line-strong bg-white px-4.5 text-14 text-ink hover:border-ink", step === 1 && "invisible")}
              tabIndex={step === 1 ? -1 : undefined}
              aria-hidden={step === 1 || undefined}
            >
              {s.back}
            </button>
            {step < 4 ? (
              <button type="button" onClick={next} className="min-h-12 rounded-pill bg-teal px-6 text-15 font-semibold text-white hover:bg-teal-dark">
                {s.next}
              </button>
            ) : (
              <button type="submit" disabled={pending} aria-busy={pending || undefined} className="min-h-12 rounded-pill bg-teal px-6 text-15 font-semibold text-white hover:bg-teal-dark disabled:opacity-60">
                {pending ? s.sending : s.send}
              </button>
            )}
          </div>
        </div>
      </form>
    </>
  );
}
