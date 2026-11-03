"use client";

// "Share your experience" form (Content and Trust #review): when, type of visit, four guided
// questions, the reviewer's own words with live privacy warnings, the conflict declaration, then
// "Submit for moderation". Thank-you panel with the reference after sending.

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { submitReview, type ReviewData } from "@/app/actions/review";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import { detectMedicalDetails } from "@/lib/content-safety";
import { REVIEW_MIN_LENGTH } from "@/lib/domain";
import { findPersonalData } from "@/lib/redact";

import { WarnBox } from "./bits";
import { CharCount, ChipRadios } from "./form-kit";

export type ReviewFormLabels = {
  guidance: string;
  when: string;
  chooseMonth: string;
  type: string;
  choose: string;
  department: string;
  anyDepartment: string;
  words: string;
  placeholder: string;
  characters: string;
  conflict: string;
  submit: string;
  sending: string;
  errVisit: string;
  errText: string;
  errConflict: string;
  phoneWarning: string;
  medicalWarning: string;
  doneTitle: string;
  doneBody: string;
  redacted: string;
  backToProfile: string;
  trackIt: string;
  signIn: string;
};

type Option = { value: string; label: string };

export type ReviewFormProps = {
  lang: "en" | "hi";
  kind: string;
  slug: string;
  months: Option[];
  visitTypes: Option[];
  departments: Option[] | null;
  questions: { key: string; q: string; options: Option[] }[];
  labels: ReviewFormLabels;
  profileHref: string;
  activityHref: string;
  signInHref: string;
  /** Set when this person already has a review of this listing (shown instead of the form). */
  already?: { title: string; linkLabel: string } | null;
};

export function ReviewForm({
  lang,
  kind,
  slug,
  months,
  visitTypes,
  departments,
  questions,
  labels,
  profileHref,
  activityHref,
  signInHref,
  already,
}: ReviewFormProps) {
  const [state, action] = useActionState<ActionState<ReviewData>, FormData>(submitReview, idle);
  const initial = state.status === "error" ? (state.data?.values ?? {}) : {};
  const [month, setMonth] = useState(initial.visitMonth ?? "");
  const [type, setType] = useState(initial.visitType ?? "");
  const [department, setDepartment] = useState(initial.department ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(questions.map((q) => [q.key, initial[q.key] ?? ""])));
  const [text, setText] = useState(initial.text ?? "");
  const [noConflict, setNoConflict] = useState(initial.noConflict === "on");
  const doneRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const done = state.status === "success" && state.data?.ref ? state.data : null;
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const visitError = fieldErrors.visitMonth || fieldErrors.visitType ? labels.errVisit : undefined;
  const textError = fieldErrors.text ? labels.errText : undefined;
  const conflictError = fieldErrors.noConflict ? labels.errConflict : undefined;
  const summary = state.status === "error" ? (visitError ?? textError ?? conflictError ?? state.message) : null;

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);
  useEffect(() => {
    if (state.status !== "error") return;
    // Focus the first field with an error (else the summary), so keyboard and screen-reader users land on it.
    const invalid = errorRef.current?.closest("form")?.querySelector<HTMLElement>('select[aria-invalid="true"], textarea[aria-invalid="true"], input[aria-invalid="true"]');
    (invalid ?? errorRef.current)?.focus({ preventScroll: true });
    errorRef.current?.scrollIntoView({ block: "center" });
  }, [state]);

  if (done) {
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="flex flex-col gap-2.5 rounded-22 border border-line p-6">
        <p className="text-22 leading-snug font-bold">{labels.doneTitle}</p>
        <p className="text-14.5 leading-[1.6] font-light text-muted">{labels.doneBody.replace("{ref}", done.ref ?? "")}</p>
        {done.redacted && <p className="text-13.5 leading-normal font-light text-muted">{labels.redacted}</p>}
        <div className="flex flex-wrap gap-x-5">
          <Link href={profileHref} className="inline-flex min-h-11 items-center font-medium">
            {labels.backToProfile}
          </Link>
          <Link href={activityHref} className="inline-flex min-h-11 items-center font-medium">
            {labels.trackIt}
          </Link>
        </div>
      </div>
    );
  }

  if (already) {
    return (
      <div role="status" className="flex flex-col gap-1.5 rounded-18 bg-cream px-4.5 py-4 text-13.5 leading-[1.6] font-light text-muted">
        <p className="text-15 leading-snug font-semibold text-ink">{already.title}</p>
        <Link href={activityHref} className="inline-flex min-h-11 items-center self-start font-medium">
          {already.linkLabel}
        </Link>
      </div>
    );
  }

  const pii = findPersonalData(text);
  const warning = pii.phone || pii.email || pii.idNumber ? labels.phoneWarning : detectMedicalDetails(text) ? labels.medicalWarning : null;

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="providerKind" value={kind} />
      <input type="hidden" name="providerSlug" value={slug} />
      <p className="rounded-18 bg-cream px-4.5 py-4 text-13.5 leading-[1.6] font-light text-muted">{labels.guidance}</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.75rem),1fr))] gap-3.5">
        <Field id="review-month" label={labels.when} error={fieldErrors.visitMonth ? labels.errVisit : undefined}>
          <Select name="visitMonth" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">{labels.chooseMonth}</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="review-type" label={labels.type} error={fieldErrors.visitType && !fieldErrors.visitMonth ? labels.errVisit : undefined}>
          <Select name="visitType" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{labels.choose}</option>
            {visitTypes.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        {departments && departments.length > 0 && (
          <Field id="review-department" label={labels.department}>
            <Select name="department" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">{labels.anyDepartment}</option>
              {departments.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      {questions.map((q) => (
        <ChipRadios
          key={q.key}
          name={q.key}
          legend={q.q}
          options={q.options}
          value={answers[q.key] ?? ""}
          onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
        />
      ))}
      <Field id="review-text" label={labels.words} error={textError}>
        <Textarea
          name="text"
          rows={5}
          maxLength={2000}
          placeholder={labels.placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={warning ? "border-sponsored" : undefined}
        />
      </Field>
      <div className="-mt-3.5">
        <CharCount id="review-count">{labels.characters.replace("{count}", String(text.length)).replace("{min}", String(REVIEW_MIN_LENGTH))}</CharCount>
      </div>
      {warning && <WarnBox>{warning}</WarnBox>}
      <Checkbox
        id="review-conflict"
        name="noConflict"
        label={labels.conflict}
        checked={noConflict}
        onChange={(e) => setNoConflict(e.target.checked)}
        error={conflictError}
        className="[&_label]:text-13.5 [&_label]:font-light [&_label]:leading-normal"
      />
      {summary && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="text-13 font-medium text-emergency outline-none">
          {summary}
          {state.status === "error" && state.code === "sign_in_required" && (
            <>
              {" "}
              <Link href={signInHref} className="font-semibold">
                {labels.signIn}
              </Link>
            </>
          )}
        </p>
      )}
      <div>
        <SubmitButton size="lg" pendingLabel={labels.sending}>
          {labels.submit}
        </SubmitButton>
      </div>
    </form>
  );
}
