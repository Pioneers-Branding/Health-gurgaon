"use client";

// "Was this guide useful?" and "Suggest a correction" under a guide. The correction is a fact
// report about the guide (submitFactReport, kind "guide"): it goes to the editors' reports queue
// with a reference. "Not really" opens the correction form, as the prototype's note suggests.

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { submitFactReport, type ReportData } from "@/app/actions/report";
import { ChipButton } from "@/components/ui/chip";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import { findPersonalData } from "@/lib/redact";

import { FormError, WarnBox } from "./bits";

export type GuideFooterLabels = {
  useful: string;
  yes: string;
  notReally: string;
  thanksYes: string;
  thanksNo: string;
  disclaimer: string;
  suggest: string;
  correctionTitle: string;
  correctionBody: string;
  details: string;
  detailsPlaceholder: string;
  email: string;
  emailNote: string;
  emailPlaceholder: string;
  send: string;
  sending: string;
  doneTitle: string;
  doneBody: string;
  errDetails: string;
  emailInvalid: string;
  phoneWarning: string;
};

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function GuideFooter({ lang, slug, title, labels }: { lang: "en" | "hi"; slug: string; title: string; labels: GuideFooterLabels }) {
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const [userOpen, setOpen] = useState(false);
  // "#suggest-correction" in the address opens the form.
  const hashOpen = useSyncExternalStore(subscribeHash, () => window.location.hash === "#suggest-correction", () => false);
  const open = userOpen || hashOpen;
  const [details, setDetails] = useState("");
  const [state, action] = useActionState<ActionState<ReportData>, FormData>(submitFactReport, idle);
  const doneRef = useRef<HTMLDivElement>(null);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const done = state.status === "success" && state.data ? { ...state.data, message: state.message } : null;

  useEffect(() => {
    if (state.status === "success") doneRef.current?.focus();
  }, [state]);

  const pii = findPersonalData(details);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4.5">
        <span id="guide-useful" className="font-medium">
          {labels.useful}
        </span>
        <div role="group" aria-labelledby="guide-useful" className="flex flex-wrap gap-1.5">
          <ChipButton selected={feedback === "yes"} onClick={() => setFeedback("yes")}>
            {labels.yes}
          </ChipButton>
          <ChipButton
            selected={feedback === "no"}
            onClick={() => {
              setFeedback("no");
              setOpen(true);
            }}
          >
            {labels.notReally}
          </ChipButton>
        </div>
        <span role="status" className="text-13 font-light text-success">
          {feedback === "yes" ? labels.thanksYes : feedback === "no" ? labels.thanksNo : ""}
        </span>
      </div>
      <details
        id="suggest-correction"
        open={open}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="group flex flex-col gap-3"
      >
        <summary className="cursor-pointer list-none text-12.5 leading-[1.6] font-light text-subtle [&::-webkit-details-marker]:hidden">
          {labels.disclaimer} <span className="inline-flex min-h-11 items-center font-normal text-teal underline-offset-4 group-open:underline hover:text-ink">{labels.suggest}</span>
        </summary>
        {done ? (
          <div ref={doneRef} tabIndex={-1} role="status" className="mt-3 flex flex-col gap-1.5 rounded-20 bg-success-tint p-5">
            <p className="text-17 font-semibold text-success">{labels.doneTitle.replace("{ref}", done.ref ?? "")}</p>
            <p className="text-14 leading-[1.55] font-light">{done.duplicate ? done.message : labels.doneBody}</p>
          </div>
        ) : (
          <form action={action} noValidate className="mt-3 flex flex-col gap-3.5 rounded-22 border border-line p-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-17 font-semibold">{labels.correctionTitle}</h2>
              <p className="text-13.5 leading-[1.55] font-light text-muted">{labels.correctionBody}</p>
            </div>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="kind" value="guide" />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="item" value={title} />
            <Field id="guide-correction-details" label={labels.details} error={errors?.details ? labels.errDetails : undefined}>
              <Textarea name="details" rows={3} maxLength={1500} placeholder={labels.detailsPlaceholder} value={details} onChange={(e) => setDetails(e.target.value)} />
            </Field>
            {(pii.phone || pii.email) && <WarnBox>{labels.phoneWarning}</WarnBox>}
            <Field id="guide-correction-email" label={labels.email} help={labels.emailNote} error={errors?.email ? labels.emailInvalid : undefined}>
              <Input name="email" type="email" autoComplete="email" maxLength={200} placeholder={labels.emailPlaceholder} />
            </Field>
            {state.status === "error" && !errors && <FormError>{state.message}</FormError>}
            <div>
              <SubmitButton pendingLabel={labels.sending}>{labels.send}</SubmitButton>
            </div>
          </form>
        )}
      </details>
    </>
  );
}
