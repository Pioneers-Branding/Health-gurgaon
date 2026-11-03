"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { suggestListing, type SuggestData } from "@/app/actions/find-care";
import { Callout } from "@/components/ui/callout";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";
import { findPersonalData } from "@/lib/redact";

export type SuggestLabels = {
  title: string;
  body: string;
  name: string;
  namePh: string;
  locality: string;
  localityPh: string;
  details: string;
  detailsHelp: string;
  email: string;
  optional: string;
  submit: string;
  sending: string;
  doneTitle: string;
  doneBody: string;
  another: string;
  close: string;
  phoneWarning: string;
};

/** "Suggest a provider we're missing" (Content and Trust #report, "Something is missing"),
 * shown on the search page. Goes to the editors' queue; nothing is published from it. */
export function SuggestListingForm({
  lang,
  labels,
  defaultName,
  defaultLocality,
  closeHref,
}: {
  lang: Lang;
  labels: SuggestLabels;
  defaultName?: string;
  defaultLocality?: string;
  closeHref: string;
}) {
  const [state, action] = useActionState<ActionState<SuggestData>, FormData>(suggestListing, idle);
  const [details, setDetails] = useState("");
  const [dismissed, setDismissed] = useState<ActionState<SuggestData> | null>(null);
  const [round, setRound] = useState(0);
  const doneRef = useRef<HTMLDivElement>(null);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const done = state.status === "success" && !!state.data && state !== dismissed;

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  if (done) {
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="flex flex-col gap-1.5 rounded-20 bg-success-tint p-5">
        <p className="text-17 font-semibold text-success">{labels.doneTitle.replace("{ref}", state.data!.ref)}</p>
        <p className="text-14 leading-[1.55] font-light text-ink">{state.data!.duplicate ? state.message : labels.doneBody}</p>
        <div className="flex flex-wrap gap-x-4">
          <button type="button" onClick={() => {
              setDismissed(state);
              setDetails("");
              setRound((r) => r + 1);
            }} className="inline-flex min-h-11 items-center text-13.5 font-medium text-teal hover:text-ink">
            {labels.another}
          </button>
          <Link href={closeHref} className="inline-flex min-h-11 items-center text-13.5 font-medium">
            {labels.close}
          </Link>
        </div>
      </div>
    );
  }

  const phone = findPersonalData(details).phone;

  return (
    <form key={round} action={action} noValidate className="flex flex-col gap-3.5 rounded-22 border border-line bg-white p-5.5">
      <div className="flex flex-col gap-1">
        <h2 className="text-18 font-semibold">{labels.title}</h2>
        <p className="text-14 leading-[1.55] font-light text-muted">{labels.body}</p>
      </div>
      <input type="hidden" name="lang" value={lang} />
      <Field id="suggest-name" label={labels.name} error={errors?.name}>
        <Input name="name" defaultValue={defaultName} placeholder={labels.namePh} autoComplete="off" maxLength={160} />
      </Field>
      <Field id="suggest-locality" label={labels.locality} error={errors?.locality}>
        <Input name="locality" defaultValue={defaultLocality} placeholder={labels.localityPh} autoComplete="off" maxLength={120} />
      </Field>
      <Field id="suggest-details" label={labels.details} optional={labels.optional} help={labels.detailsHelp} error={errors?.details}>
        <Textarea name="details" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
      </Field>
      {phone && (
        <Callout tone="warning" live="polite">
          {labels.phoneWarning}
        </Callout>
      )}
      <Field id="suggest-email" label={labels.email} optional={labels.optional} error={errors?.email}>
        <Input name="email" type="email" autoComplete="email" maxLength={200} />
      </Field>
      {state.status === "error" && !errors && (
        <Callout tone="danger" live="assertive">
          {state.message}
        </Callout>
      )}
      <div>
        <SubmitButton pendingLabel={labels.sending}>{labels.submit}</SubmitButton>
      </div>
    </form>
  );
}
