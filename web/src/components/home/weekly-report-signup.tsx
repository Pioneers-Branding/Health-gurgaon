"use client";

// "The weekly Gurgaon Health Report, on WhatsApp": +91 number, Subscribe, the consent tick-box.
// No account needed. Posts subscribeWeeklyReport (src/app/actions/consent.ts), which keeps the
// number as an unverified contact and records the tick-box wording in the consent record,
// pending the WhatsApp "YES". `from` says which page the form is on ("homepage" | "news"); it goes
// in a hidden field and into the consent record. Works without JavaScript (the server checks
// everything); with JavaScript the number is cleaned as it's typed or pasted and the prototype's
// messages show before anything is sent.

import { useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";

import { subscribeWeeklyReport } from "@/app/actions/consent";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";
import type { WeeklyReportLabels } from "@/lib/i18n/areas/home";
import type { WeeklySignupPage } from "@/lib/validation/consent";

import { cleanPhoneInput } from "./format";

type Problem = "phone" | "consent" | "failed" | null;

function serverProblem(state: ActionState): Problem {
  if (state.status !== "error") return null;
  if (state.fieldErrors?.phone?.length) return "phone";
  if (state.fieldErrors?.consent?.length) return "consent";
  return "failed";
}

export function WeeklyReportSignup({
  lang,
  from,
  labels,
  tone = "light",
  className,
}: {
  lang: Lang;
  from: WeeklySignupPage;
  labels: WeeklyReportLabels;
  /** "dark" on an ink panel (the news page's "Every Friday" box): light text, saffron button. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  const [state, formAction, pending] = useActionState<ActionState, FormData>(subscribeWeeklyReport, idle);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [local, setLocal] = useState<{ problem: Problem; for: ActionState } | null>(null);
  const id = useId();
  const phoneRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  // A check made in the browser counts until the next server answer replaces it.
  const problem = local && local.for === state ? local.problem : serverProblem(state);
  const done = state.status === "success";

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  useEffect(() => {
    if (state.status === "error") (serverProblem(state) === "consent" ? consentRef : phoneRef).current?.focus();
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const check: Problem = phone.length !== 10 ? "phone" : !consent ? "consent" : null;
    if (check) {
      event.preventDefault();
      setLocal({ problem: check, for: state });
      (check === "consent" ? consentRef : phoneRef).current?.focus();
      return;
    }
    setLocal(null);
  }

  if (done) {
    return (
      <div
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className={cn("flex items-center gap-3 rounded-18 bg-white px-5 py-4.5 text-ink outline-offset-2", className)}
      >
        <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-full bg-success font-bold text-white">
          ✓
        </span>
        <span className="text-14.5">{labels.done}</span>
      </div>
    );
  }

  const errorId = `${id}-error`;
  const message = problem === "phone" ? labels.errorPhone : problem === "consent" ? labels.errorConsent : problem === "failed" ? labels.failed : null;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className={cn("flex flex-col gap-2.5", className)}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="from" value={from} />
      <div
        className={cn(
          "flex overflow-hidden rounded-pill border-[1.5px] bg-white focus-within:outline-3 focus-within:outline-offset-2",
          dark ? "focus-within:outline-saffron" : "focus-within:outline-teal",
          problem === "phone" ? "border-emergency" : dark ? "border-white" : "border-ink",
        )}
      >
        <span aria-hidden="true" className="flex items-center py-3.25 pl-4.5 text-15 text-subtle">
          {labels.prefix}
        </span>
        <label htmlFor={`${id}-phone`} className="sr-only">
          {labels.phoneLabel}
        </label>
        <input
          ref={phoneRef}
          id={`${id}-phone`}
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={labels.phoneLabel}
          value={phone}
          onChange={(e) => {
            setPhone(cleanPhoneInput(e.target.value));
            setLocal(null);
          }}
          aria-invalid={problem === "phone" || undefined}
          aria-describedby={problem === "phone" ? errorId : undefined}
          className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-15 text-ink outline-none placeholder:text-subtle"
        />
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className={cn(
            "min-h-12 flex-none cursor-pointer px-5 text-14.5 transition-colors outline-none disabled:opacity-70",
            dark ? "bg-saffron font-semibold text-ink hover:bg-saffron-soft" : "bg-ink font-medium text-cream hover:bg-ink-soft",
          )}
        >
          {pending ? labels.sending : labels.subscribe}
        </button>
      </div>
      <label
        htmlFor={`${id}-consent`}
        className={cn("flex min-h-11 cursor-pointer items-start gap-2.5 py-1 text-12.5 leading-normal font-light", dark ? "text-on-dark" : "text-muted")}
      >
        <input
          ref={consentRef}
          id={`${id}-consent`}
          name="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            setLocal(null);
          }}
          aria-invalid={problem === "consent" || undefined}
          aria-describedby={problem === "consent" ? errorId : undefined}
          className={cn("mt-0.5 size-4.5 flex-none cursor-pointer", dark ? "accent-saffron" : "accent-teal")}
        />
        <span>{labels.consent}</span>
      </label>
      {/* Always in the page (a live region must exist before it changes); visible only with a message. */}
      <p
        id={errorId}
        role="alert"
        className={message ? cn("text-13 font-medium text-emergency", dark && "rounded-10 bg-emergency-tint px-3 py-2") : "sr-only"}
      >
        {message}
      </p>
    </form>
  );
}
