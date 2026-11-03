"use client";

// "Ask your neighbourhood": the question form. Shows the emergency message as soon as urgent
// symptoms are typed, warns about medical-advice questions (which the server refuses) and phone
// numbers, and posts askQuestion (works without JavaScript). The question waits for a moderator.

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { askQuestion, type AskData } from "@/app/actions/community";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { idle, type ActionState } from "@/lib/action-state";
import { detectAdviceRequest, detectUrgency } from "@/lib/content-safety";
import type { Lang } from "@/lib/i18n/config";
import { findPersonalData } from "@/lib/redact";

import { TickBox, TypingWarning, UrgentBanner } from "./bits";
import { fill } from "./logic";

export type AskLabels = {
  question: string;
  questionPlaceholder: string;
  detail: string;
  detailPlaceholder: string;
  optional: string;
  advice: string;
  adviceLink: string;
  topic: string;
  locality: string;
  anonymous: string;
  signedAs: string;
  changeLabel: string;
  post: string;
  posting: string;
  postedTitle: string;
  postedFirst: string;
  postedReturning: string;
  postedRedacted: string;
  backToCommunity: string;
  seeActivity: string;
  urgentTitle: string;
  urgentBody: string;
  selfHarm: string;
  phoneWarning: string;
  signInLink: string;
};

type Option = { value: string; label: string };

export function AskForm({
  lang,
  labels,
  topics,
  localities,
  defaultTopic,
  defaultLocality,
  signedAs,
  hrefs,
}: {
  lang: Lang;
  labels: AskLabels;
  topics: Option[];
  localities: Option[];
  defaultTopic: string;
  defaultLocality: string;
  /** How the person's posts are signed ("Parent · Sector 57"); null before the session is known. */
  signedAs: string | null;
  hrefs: { findDoctor: string; community: string; activity: string; consent: string; signIn: string };
}) {
  const [state, action, pending] = useActionState<ActionState<AskData>, FormData>(askQuestion, idle);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState(defaultTopic);
  const [locality, setLocality] = useState(defaultLocality);
  const [anonymous, setAnonymous] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  // A refused question ("Please rephrase…", a missing topic): focus the field to fix, else the message.
  useEffect(() => {
    if (state.status !== "error") return;
    const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? formRef.current?.querySelector<HTMLElement>('[role="alert"]');
    if (el && !el.matches("input, select, textarea")) el.tabIndex = -1;
    el?.focus();
  }, [state]);

  if (state.status === "success" && state.data) {
    return (
      <div role="status" tabIndex={-1} ref={(el) => el?.focus()} className="flex flex-col gap-2 rounded-22 border border-line p-5.5 outline-offset-4">
        <p className="text-20 font-bold">{labels.postedTitle}</p>
        <p className="text-14.5 leading-[1.55] font-light text-muted">{state.data.firstTime ? labels.postedFirst : labels.postedReturning}</p>
        {state.data.redacted && <p className="text-13.5 font-light text-muted">{labels.postedRedacted}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Link href={hrefs.community} className="inline-flex min-h-11 items-center rounded-pill bg-ink px-4.5 text-14 text-cream hover:bg-ink-soft hover:text-cream">
            {labels.backToCommunity}
          </Link>
          <Link href={hrefs.activity} className="inline-flex min-h-11 items-center text-14 font-medium">
            {labels.seeActivity}
          </Link>
        </div>
      </div>
    );
  }

  const text = `${title} ${body}`;
  const urgency = detectUrgency(text);
  const advice = detectAdviceRequest(text) && !urgency.urgent;
  const pd = findPersonalData(text);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const place = localities.find((l) => l.value === locality)?.label ?? "";
  const otherError = state.status === "error" && !Object.values(errors).some((v) => v?.length) ? state : null;

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4.5">
      <input type="hidden" name="lang" value={lang} />
      {urgency.urgent && <UrgentBanner title={labels.urgentTitle} body={labels.urgentBody} extra={urgency.selfHarm ? labels.selfHarm : null} />}
      <Field id="ask-title" label={labels.question} error={errors.title}>
        <Input name="title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} placeholder={labels.questionPlaceholder} maxLength={200} className="py-3 text-15.5" required />
      </Field>
      <Field id="ask-body" label={labels.detail} optional={labels.optional} error={errors.body}>
        <Textarea name="body" rows={4} value={body} onChange={(e) => setBody(e.currentTarget.value)} placeholder={labels.detailPlaceholder} maxLength={2000} className="rounded-12 py-3" />
      </Field>
      {advice && (
        <p role="status" className="rounded-14 border-[1.5px] border-dashed border-sponsored bg-pending-tint px-3.5 py-3 text-13.5 leading-[1.55] text-[#5a3d00]">
          {labels.advice}{" "}
          <Link href={hrefs.findDoctor} className="font-medium">
            {labels.adviceLink}
          </Link>
          .
        </p>
      )}
      {pd.phone || pd.email || pd.idNumber ? <TypingWarning>{labels.phoneWarning}</TypingWarning> : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-3.5">
        <Field id="ask-topic" label={labels.topic} error={errors.topic}>
          <Select name="topic" value={topic} onChange={(e) => setTopic(e.currentTarget.value)}>
            {topics.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="ask-locality" label={labels.locality} error={errors.locality}>
          <Select name="locality" value={locality} onChange={(e) => setLocality(e.currentTarget.value)}>
            {localities.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-col">
        <TickBox id="ask-anonymous" name="anonymous" checked={anonymous} onChange={setAnonymous} small={false}>
          {fill(labels.anonymous, { place })}
        </TickBox>
        {signedAs && (
          <p className="pl-7 text-12.5 font-light text-subtle">
            {fill(labels.signedAs, { label: signedAs })}{" "}
            <Link href={hrefs.consent} className="font-normal">
              {labels.changeLabel}
            </Link>
          </p>
        )}
      </div>
      {otherError && (
        <p role={otherError.code === "sign_in_required" ? "status" : "alert"} className="text-13 font-medium text-emergency">
          {otherError.message}{" "}
          {otherError.code === "sign_in_required" && (
            <Link href={hrefs.signIn} className="inline-flex min-h-11 items-center">
              {labels.signInLink}
            </Link>
          )}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="inline-flex min-h-12 items-center self-start rounded-pill bg-teal px-6 text-15 font-semibold text-white hover:bg-teal-dark disabled:opacity-60"
      >
        {pending ? labels.posting : labels.post}
      </button>
    </form>
  );
}
