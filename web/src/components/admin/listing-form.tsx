"use client";

// Listings editor form: status, hours, fee, key fact, with a required reason and the source.
// The Server Action records what changed for residents who saved the listing.

import { useActionState, useEffect, useRef } from "react";

import { updateListing, type ListingData } from "@/app/actions/admin";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";
import { Callout } from "@/components/ui/callout";
import { Checkbox, Field, Input, RadioGroup, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

type Labels = {
  status: string;
  hoursSummary: string;
  hoursSummaryHelp: string;
  hoursSource: string;
  fee: string;
  feeHelp: string;
  feeVerified: string;
  keyFact: string;
  keyFactHelp: string;
  reason: string;
  source: string;
  sourceHelp: string;
  save: string;
  saving: string;
  choose: string;
  optional: string;
};

type Listing = { slug: string; status: string; hoursSummary: string; hoursSource: string; consultationFee: string; feeVerified: boolean; keyFact: string };
type Option = { value: string; label: string };

export function ListingForm({ lang, listing, statuses, reasons, labels }: { lang: Lang; listing: Listing; statuses: Option[]; reasons: Option[]; labels: Labels }) {
  const [state, action] = useActionState<ActionState<ListingData>, FormData>(updateListing, idle);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "success") doneRef.current?.focus();
    if (state.status === "error") formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
  }, [state]);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const repeated = state.status === "error" && Object.values(errors).some((v) => v?.[0] === state.message);
  const id = (n: string) => `listing-${n}`;

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-3.5">
      <input type="hidden" name="slug" value={listing.slug} />
      <input type="hidden" name="lang" value={lang} />
      {state.status === "success" && (
        <div ref={doneRef} tabIndex={-1} className="rounded-18 outline-none">
          <Callout tone="success" live="polite">
            <p className="m-0 font-medium text-ink">{state.message}</p>
          </Callout>
        </div>
      )}
      <RadioGroup name="status" legend={labels.status} options={statuses} defaultValue={listing.status} error={errors.status} />
      <Field id={id("hours")} label={labels.hoursSummary} help={labels.hoursSummaryHelp} optional={labels.optional} error={errors.hoursSummary}>
        <Input name="hoursSummary" defaultValue={listing.hoursSummary} maxLength={120} />
      </Field>
      <Field id={id("hours-source")} label={labels.hoursSource} optional={labels.optional} error={errors.hoursSource}>
        <Input name="hoursSource" defaultValue={listing.hoursSource} maxLength={160} />
      </Field>
      <Field id={id("fee")} label={labels.fee} help={labels.feeHelp} optional={labels.optional} error={errors.consultationFee}>
        <Input name="consultationFee" defaultValue={listing.consultationFee} inputMode="numeric" className="max-w-40" />
      </Field>
      <Checkbox id={id("fee-verified")} name="feeVerified" label={labels.feeVerified} defaultChecked={listing.feeVerified} />
      <Field id={id("key-fact")} label={labels.keyFact} help={labels.keyFactHelp} optional={labels.optional} error={errors.keyFact}>
        <Input name="keyFact" defaultValue={listing.keyFact} maxLength={80} />
      </Field>
      <Field id={id("reason")} label={labels.reason} error={errors.reason}>
        <Select name="reason" defaultValue="" className="text-14">
          <option value="">{labels.choose}</option>
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field id={id("source")} label={labels.source} help={labels.sourceHelp} optional={labels.optional} error={errors.source}>
        <Input name="source" maxLength={200} />
      </Field>
      {state.status === "error" && !repeated && (
        <p tabIndex={-1} role="alert" className="m-0 text-13 font-medium text-emergency outline-none">
          {state.message}
        </p>
      )}
      <SubmitButton variant="primary" size="sm" pendingLabel={labels.saving} className="self-start">
        {labels.save}
      </SubmitButton>
    </form>
  );
}
