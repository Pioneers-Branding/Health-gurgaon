"use client";

// "Report incorrect information" (Content and Trust #report): three cards (a fact is wrong, a
// concern about care or conduct, something is missing), each with its own form. The cards are
// radio inputs and the panels switch with CSS (:has), so this works without JavaScript too.
// ReviewFlagForm is "Report" under a single review (checked against the review policy).

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { suggestListing, type SuggestData } from "@/app/actions/find-care";
import { flagReview, submitConcern, submitFactReport, type ReportData } from "@/app/actions/report";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import { detectMedicalDetails } from "@/lib/content-safety";
import type { ContentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { findPersonalData } from "@/lib/redact";

import { FormError, WarnBox } from "./bits";
import { CardRadios, ChipRadios } from "./form-kit";

export type ReportLabels = ContentTrustStrings["report"];
export type ReportCommon = {
  optional: string;
  sending: string;
  trackIt: string;
  emailPlaceholder: string;
  emailInvalid: string;
  phoneWarning: string;
  medicalWarning: string;
};

type ReportState = ActionState<ReportData>;
type Option = { value: string; label: string };

const errValues = (state: ReportState) => (state.status === "error" ? (state.data?.values ?? {}) : {});

function Done({ title, body, links }: { title: string; body: ReactNode; links?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div ref={ref} tabIndex={-1} role="status" className="flex flex-col gap-1.5 rounded-20 bg-success-tint p-5">
      <p className="text-17 font-semibold text-success">{title}</p>
      <div className="text-14 leading-[1.55] font-light">{body}</div>
      {links && <div className="flex flex-wrap gap-x-5 pt-1">{links}</div>}
    </div>
  );
}

function TextWarnings({ text, common }: { text: string; common: ReportCommon }) {
  const pii = findPersonalData(text);
  if (pii.phone || pii.email || pii.idNumber) return <WarnBox>{common.phoneWarning}</WarnBox>;
  if (detectMedicalDetails(text)) return <WarnBox>{common.medicalWarning}</WarnBox>;
  return null;
}

export function ReportForms({
  lang,
  kind,
  slug,
  itemLabel,
  fields,
  initialType,
  initialField,
  labels,
  common,
  backHref,
  backLabel,
  activityHref,
}: {
  lang: "en" | "hi";
  kind: string;
  slug: string;
  itemLabel: string;
  fields: Option[];
  initialType: "fact" | "complaint" | "missing";
  initialField: string;
  labels: ReportLabels;
  common: ReportCommon;
  backHref: string;
  backLabel: string;
  activityHref: string;
}) {
  // The three forms' results live here, so after a post without JavaScript the page opens on the
  // form that was sent (its answer would otherwise sit in a hidden panel).
  const fact = useActionState<ReportState, FormData>(submitFactReport, idle);
  const concern = useActionState<ReportState, FormData>(submitConcern, idle);
  const missing = useActionState<ActionState<SuggestData>, FormData>(suggestListing, idle);
  const [type, setType] = useState<string>(() => (missing[0].status !== "idle" ? "missing" : concern[0].status !== "idle" ? "complaint" : initialType));
  return (
    <div className="group/rt flex flex-col gap-5">
      {/* Its own (never submitted) form, so these radios are one group per page copy. */}
      <form onSubmit={(e) => e.preventDefault()}>
        <CardRadios
          name="report-type"
          idPrefix="report-type"
          legend={labels.what}
          options={(["fact", "complaint", "missing"] as const).map((k) => ({ value: k, title: labels.types[k].title, detail: labels.types[k].detail }))}
          value={type}
          onChange={setType}
        />
      </form>
      <div className="hidden flex-col group-has-[#report-type-fact:checked]/rt:flex">
        <FactPanel actionState={fact} lang={lang} kind={kind} slug={slug} itemLabel={itemLabel} fields={fields} initialField={initialField} labels={labels} common={common} backHref={backHref} backLabel={backLabel} activityHref={activityHref} />
      </div>
      <div className="hidden flex-col group-has-[#report-type-complaint:checked]/rt:flex">
        <ConcernPanel actionState={concern} lang={lang} kind={kind} slug={slug} itemLabel={itemLabel} labels={labels} common={common} activityHref={activityHref} />
      </div>
      <div className="hidden flex-col group-has-[#report-type-missing:checked]/rt:flex">
        <MissingPanel actionState={missing} lang={lang} labels={labels} common={common} />
      </div>
    </div>
  );
}

function FactPanel({
  actionState,
  lang,
  kind,
  slug,
  itemLabel,
  fields,
  initialField,
  labels,
  common,
  backHref,
  backLabel,
  activityHref,
}: {
  actionState: [ReportState, (payload: FormData) => void, boolean];
  lang: "en" | "hi";
  kind: string;
  slug: string;
  itemLabel: string;
  fields: Option[];
  initialField: string;
  labels: ReportLabels;
  common: ReportCommon;
  backHref: string;
  backLabel: string;
  activityHref: string;
}) {
  const [state, action] = actionState;
  const v = errValues(state);
  const [item, setItem] = useState(v.item ?? itemLabel);
  const [field, setField] = useState(v.field ?? (fields.some((f) => f.value === initialField) ? initialField : (fields[0]?.value ?? "")));
  const [details, setDetails] = useState(v.details ?? "");
  const [firsthand, setFirsthand] = useState(v.firsthand === "on");
  const [email, setEmail] = useState(v.email ?? "");
  const fe = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const done = state.status === "success" && state.data?.ref ? state.data : null;

  if (done) {
    return (
      <Done
        title={labels.doneTitle.replace("{ref}", done.ref ?? "")}
        body={done.duplicate && state.status === "success" ? state.message : labels.doneBody}
        links={
          <>
            <Link href={backHref} className="inline-flex min-h-11 items-center font-medium">
              {backLabel}
            </Link>
            {done.signedIn && (
              <Link href={activityHref} className="inline-flex min-h-11 items-center font-medium">
                {common.trackIt}
              </Link>
            )}
          </>
        }
      />
    );
  }

  const summary = state.status === "error" ? (fe.item ? labels.errItem : fe.field ? labels.errField : fe.details ? labels.errDetails : fe.email ? common.emailInvalid : state.message) : null;

  return (
    <form action={action} noValidate className="flex flex-col gap-3.5 rounded-22 border border-line p-5 sm:p-5.5">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="slug" value={slug} />
      <Field id="report-item" label={labels.item} error={fe.item ? labels.errItem : undefined}>
        <Input name="item" value={item} onChange={(e) => setItem(e.target.value)} placeholder={labels.itemPlaceholder} maxLength={200} autoComplete="off" />
      </Field>
      {fields.length > 0 && (
        <ChipRadios name="field" legend={labels.field} legendClassName="mb-2 text-14 font-medium text-ink" options={fields} value={field} onChange={setField} error={fe.field ? labels.errField : undefined} />
      )}
      <Field id="report-details" label={labels.details} error={fe.details ? labels.errDetails : undefined}>
        <Textarea name="details" rows={3} maxLength={1500} placeholder={labels.detailsPlaceholder} value={details} onChange={(e) => setDetails(e.target.value)} />
      </Field>
      <TextWarnings text={details} common={common} />
      <Checkbox id="report-firsthand" name="firsthand" label={labels.firsthand} checked={firsthand} onChange={(e) => setFirsthand(e.target.checked)} />
      <Field id="report-email" label={labels.email} help={labels.emailNote} error={fe.email ? common.emailInvalid : undefined}>
        <Input name="email" type="email" autoComplete="email" maxLength={200} placeholder={common.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {summary && <FormError>{summary}</FormError>}
      <div>
        <SubmitButton pendingLabel={common.sending}>{labels.send}</SubmitButton>
      </div>
    </form>
  );
}

function ConcernPanel({
  actionState,
  lang,
  kind,
  slug,
  itemLabel,
  labels,
  common,
  activityHref,
}: {
  actionState: [ReportState, (payload: FormData) => void, boolean];
  lang: "en" | "hi";
  kind: string;
  slug: string;
  itemLabel: string;
  labels: ReportLabels;
  common: ReportCommon;
  activityHref: string;
}) {
  const [state, action] = actionState;
  const v = errValues(state);
  const [topic, setTopic] = useState(v.topic ?? "");
  const [details, setDetails] = useState(v.details ?? "");
  const [email, setEmail] = useState(v.email ?? "");
  const fe = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const done = state.status === "success" && state.data?.ref ? state.data : null;

  return (
    <div className="flex flex-col gap-3 rounded-22 border-[1.5px] border-ink p-5 sm:p-5.5">
      <h2 className="text-18 font-semibold">{labels.concernTitle}</h2>
      <p className="text-14.5 leading-[1.6] font-light text-muted">{labels.concernBody}</p>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-2.5">
        {labels.routes.map((r) => (
          <li key={r.title} className="rounded-16 bg-cream p-3.5 text-13.5 leading-normal">
            <b className="font-semibold">{r.title}</b>
            <br />
            <span className="font-light">{r.body}</span>
          </li>
        ))}
      </ul>
      <p className="font-mono text-11 text-caution uppercase">{labels.legalNote}</p>
      {done ? (
        <Done
          title={labels.concernDoneTitle.replace("{ref}", done.ref ?? "")}
          body={labels.concernDoneBody}
          links={
            done.signedIn ? (
              <Link href={activityHref} className="inline-flex min-h-11 items-center font-medium">
                {common.trackIt}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <details className="group/cf flex flex-col gap-3" open={state.status === "error" || undefined}>
          <summary className="inline-flex min-h-11 w-fit cursor-pointer list-none items-center rounded-pill bg-ink px-5 text-14 text-cream hover:bg-ink-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal [&::-webkit-details-marker]:hidden">
            {labels.confidential}
          </summary>
          <form action={action} noValidate className="mt-3 flex flex-col gap-3.5">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="item" value={itemLabel} />
            <ChipRadios
              name="topic"
              legend={labels.concernTopic}
              legendClassName="mb-2 text-14 font-medium text-ink"
              options={Object.entries(labels.topics).map(([value, label]) => ({ value, label }))}
              value={topic}
              onChange={setTopic}
            />
            <Field id="concern-details" label={labels.concernDetails} error={fe.details ? labels.errConcern : undefined}>
              <Textarea name="details" rows={4} maxLength={3000} placeholder={labels.concernPlaceholder} value={details} onChange={(e) => setDetails(e.target.value)} />
            </Field>
            <TextWarnings text={details} common={common} />
            <Field id="concern-email" label={labels.email} help={labels.emailNote} error={fe.email ? common.emailInvalid : undefined}>
              <Input name="email" type="email" autoComplete="email" maxLength={200} placeholder={common.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {state.status === "error" && <FormError>{fe.details ? labels.errConcern : fe.email ? common.emailInvalid : state.message}</FormError>}
            <div>
              <SubmitButton variant="dark" pendingLabel={common.sending}>
                {labels.concernSend}
              </SubmitButton>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}

function MissingPanel({
  actionState,
  lang,
  labels,
  common,
  defaultLocality = "",
  standalone = false,
}: {
  actionState: [ActionState<SuggestData>, (payload: FormData) => void, boolean];
  lang: "en" | "hi";
  labels: ReportLabels;
  common: ReportCommon;
  /** Pre-filled locality ("Sohna Road"), e.g. from a locality page's "Suggest a listing". */
  defaultLocality?: string;
  /** On its own page (/report/missing), whose h1 and intro already say what this is. */
  standalone?: boolean;
}) {
  const [state, action] = actionState;
  const [name, setName] = useState("");
  const [locality, setLocality] = useState(defaultLocality);
  const fe = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const done = state.status === "success" && state.data ? state.data : null;
  return (
    <div className="flex flex-col gap-3 rounded-22 border border-line p-5 sm:p-5.5">
      {!standalone && <h2 className="text-18 font-semibold">{labels.missingTitle}</h2>}
      {!standalone && <p className="text-14 leading-[1.55] font-light text-muted">{labels.missingBody}</p>}
      {done ? (
        <Done title={labels.missingDone.replace("{ref}", done.ref)} body={done.duplicate && state.status === "success" ? state.message : null} />
      ) : (
        <form action={action} noValidate className="flex flex-col gap-3">
          <input type="hidden" name="lang" value={lang} />
          <Field id="missing-name" label={labels.missingName} hideLabel error={fe.name ? labels.errName : undefined}>
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.missingNamePlaceholder} maxLength={160} autoComplete="off" />
          </Field>
          <Field id="missing-locality" label={labels.missingLocality} hideLabel error={fe.locality ? labels.errLocality : undefined}>
            <Input name="locality" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder={labels.missingLocalityPlaceholder} maxLength={120} autoComplete="off" />
          </Field>
          {state.status === "error" && !Object.keys(fe).length && <FormError>{state.message}</FormError>}
          <div>
            <SubmitButton pendingLabel={common.sending}>{labels.missingSend}</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

/** "Suggest a listing" on its own page (/report/missing): the "Something is missing" form. */
export function SuggestListingForm({ lang, labels, common, defaultLocality }: { lang: "en" | "hi"; labels: ReportLabels; common: ReportCommon; defaultLocality?: string }) {
  const missing = useActionState<ActionState<SuggestData>, FormData>(suggestListing, idle);
  return <MissingPanel actionState={missing} lang={lang} labels={labels} common={common} defaultLocality={defaultLocality} standalone />;
}

// ── "Report" under a single review ──────────────────────────────────────────

export function ReviewFlagForm({
  lang,
  providerSlug,
  review,
  labels,
  common,
  rankingHref,
  policyHref,
  reviewsHref,
  activityHref,
}: {
  lang: "en" | "hi";
  providerSlug: string;
  review: { ref: string; byline: string; text: string };
  labels: ReportLabels;
  common: ReportCommon;
  rankingHref: string;
  policyHref: string;
  reviewsHref: string;
  activityHref: string;
}) {
  const [state, action] = useActionState<ReportState, FormData>(flagReview, idle);
  const v = errValues(state);
  const [reason, setReason] = useState(v.reason ?? "");
  const [details, setDetails] = useState(v.details ?? "");
  const fe = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const done = state.status === "success" && state.data?.ref ? state.data : null;

  return (
    <div className="flex flex-col gap-4">
      <figure className="flex flex-col gap-1.5 rounded-20 border border-line p-4.5">
        <figcaption className="font-mono text-10.5 text-subtle uppercase">{review.byline}</figcaption>
        <blockquote lang={lang === "hi" ? "en" : undefined} className="line-clamp-6 text-14.5 leading-[1.6] font-light">
          “{review.text}”
        </blockquote>
      </figure>
      {done ? (
        <Done
          title={labels.reviewDoneTitle.replace("{ref}", done.ref ?? "")}
          body={done.duplicate && state.status === "success" ? state.message : labels.reviewDoneBody}
          links={
            <>
              <Link href={reviewsHref} className="inline-flex min-h-11 items-center font-medium">
                {labels.backToReviews}
              </Link>
              {done.signedIn && (
                <Link href={activityHref} className="inline-flex min-h-11 items-center font-medium">
                  {common.trackIt}
                </Link>
              )}
            </>
          }
        />
      ) : (
        <form action={action} noValidate className="flex flex-col gap-3.5 rounded-22 border border-line p-5 sm:p-5.5">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="providerSlug" value={providerSlug} />
          <input type="hidden" name="reviewRef" value={review.ref} />
          <CardRadios
            name="reason"
            legend={labels.reviewReason}
            legendClassName="mb-2 text-15.5 font-semibold text-ink"
            minWidth="15rem"
            options={Object.entries(labels.reviewReasons).map(([value, title]) => ({ value, title }))}
            value={reason}
            onChange={setReason}
            error={fe.reason ? labels.errReviewReason : undefined}
          />
          <Field id="flag-details" label={labels.reviewDetails} optional={reason === "other" ? undefined : common.optional} error={fe.details ? labels.errReviewDetails : undefined}>
            <Textarea name="details" rows={3} maxLength={500} placeholder={labels.reviewDetailsPlaceholder} value={details} onChange={(e) => setDetails(e.target.value)} />
          </Field>
          <TextWarnings text={details} common={common} />
          {state.status === "error" && <FormError>{fe.reason ? labels.errReviewReason : fe.details ? labels.errReviewDetails : state.message}</FormError>}
          <div>
            <SubmitButton pendingLabel={common.sending}>{labels.reviewSend}</SubmitButton>
          </div>
        </form>
      )}
      <div className="flex flex-col gap-1 rounded-18 bg-cream px-4.5 py-4 text-13.5 leading-[1.6] font-light text-muted">
        <p>{labels.reviewProvider}</p>
        <p>
          {labels.reviewRanking}{" "}
          <Link href={rankingHref} className="font-medium">
            {labels.reviewRankingLink}
          </Link>
        </p>
        <Link href={policyHref} className="inline-flex min-h-11 items-center self-start font-medium">
          {labels.reviewPolicy}
        </Link>
      </div>
    </div>
  );
}
