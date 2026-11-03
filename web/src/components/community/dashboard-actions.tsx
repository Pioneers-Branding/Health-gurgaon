"use client";

// Society dashboard decisions: Accept / Decline a volunteer offer, and "Submit report" for a
// completed event (counts only). Real forms posting the RWA Server Actions; the report form opens
// in a <details>, so it works without JavaScript too.

import { useActionState, useState } from "react";

import { decideVolunteerOffer, submitInitiativeReport, type InitiativeData, type OfferData } from "@/app/actions/rwa";
import { FieldError } from "@/components/ui/form";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";

export function OfferDecision({
  lang,
  societySlug,
  offerId,
  labels,
}: {
  lang: Lang;
  societySlug: string;
  offerId: string;
  labels: { accept: string; decline: string; accepted: string; declined: string };
}) {
  const [state, action, pending] = useActionState<ActionState<OfferData>, FormData>(decideVolunteerOffer, idle);
  if (state.status === "success" && state.data) {
    return (
      <span role="status" className="text-12.5 font-semibold text-success">
        {state.data.status === "accepted" ? labels.accepted : labels.declined}
      </span>
    );
  }
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="societySlug" value={societySlug} />
      <input type="hidden" name="offerId" value={offerId} />
      <div className="flex gap-1.5">
        <button type="submit" name="decision" value="accepted" disabled={pending} className="relative inline-flex min-h-8 items-center rounded-pill bg-teal px-3 text-12.5 text-white after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:bg-teal-dark disabled:opacity-60">
          {labels.accept}
        </button>
        <button type="submit" name="decision" value="declined" disabled={pending} className="relative inline-flex min-h-8 items-center rounded-pill border-[1.5px] border-line-strong bg-white px-3 text-12.5 text-ink after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:border-ink disabled:opacity-60">
          {labels.decline}
        </button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-12 font-medium text-emergency">
          {state.message}
        </p>
      )}
    </form>
  );
}

export type ReportLabels = { submitReport: string; reportLabel: string; reportPlaceholder: string; reportHelp: string; publishReport: string; sending: string; submitted: string };

export function InitiativeReport({ lang, societySlug, eventSlug, labels }: { lang: Lang; societySlug: string; eventSlug: string; labels: ReportLabels }) {
  const [state, action, pending] = useActionState<ActionState<InitiativeData>, FormData>(submitInitiativeReport, idle);
  const [text, setText] = useState("");
  if (state.status === "success") {
    return (
      <span role="status" className="rounded-pill bg-success-tint px-2.5 py-1 text-12 font-semibold text-success">
        {labels.submitted}
      </span>
    );
  }
  const error = state.status === "error" ? (state.fieldErrors?.summary?.[0] ?? state.message) : null;
  const id = `report-${eventSlug}`;
  return (
    <details className="group open:basis-full" open={!!error || undefined}>
      <summary className="relative inline-flex min-h-8 w-fit cursor-pointer after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] list-none items-center rounded-pill bg-ink px-3.5 text-12.5 text-cream hover:bg-ink-soft group-open:hidden [&::-webkit-details-marker]:hidden">
        {labels.submitReport}
      </summary>
      <form action={action} className="mt-2 flex flex-col gap-2 rounded-16 bg-cream p-3.5">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="societySlug" value={societySlug} />
        <input type="hidden" name="eventSlug" value={eventSlug} />
        <label htmlFor={id} className="text-13.5 font-medium">
          {labels.reportLabel}
        </label>
        <p id={`${id}-help`} className="text-12 font-light text-subtle">
          {labels.reportHelp}
        </p>
        <textarea
          id={id}
          name="summary"
          rows={2}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder={labels.reportPlaceholder}
          maxLength={300}
          aria-invalid={error ? true : undefined}
          aria-describedby={[`${id}-help`, error ? `${id}-error` : null].filter(Boolean).join(" ")}
          className="w-full resize-y rounded-12 border-[1.5px] border-line-strong bg-white px-3 py-2.5 text-14 font-light text-ink placeholder:text-subtle focus-visible:border-teal aria-[invalid=true]:border-emergency"
        />
        {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center self-start rounded-pill bg-teal px-4 text-13.5 font-medium text-white hover:bg-teal-dark disabled:opacity-60">
          {pending ? labels.sending : labels.publishReport}
        </button>
      </form>
    </details>
  );
}
