"use client";

// The decision form under a queue item: reason (required, shown in the audit log), an optional
// note, the story fields before publishing, and the prototype's four buttons. Works without
// JavaScript (a plain form post to the Server Action); with it, the result is announced and
// focused, and the page refreshes behind it.

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { decideQueueItem, type DecisionData } from "@/app/actions/admin";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";
import { Callout } from "@/components/ui/callout";
import { cn } from "@/components/ui/cn";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";

export type DecisionLabels = {
  reason: string;
  chooseReason: string;
  note: string;
  optional: string;
  noteHelp: string;
  working: string;
  viewLive: string;
  nextWaiting: string;
  decidedNote: string;
  storyTitle: string;
  storyIntro: string;
  story: {
    title: string;
    category: string;
    chooseCategory: string;
    transcript: string;
    transcriptHelp: string;
    duration: string;
    durationHelp: string;
    meta: string;
    metaHelp: string;
    visitConfirmed: string;
    privacyEdited: string;
    tellerApproved: string;
  };
};

type Option = { value: string; label: string };
type StoryDraft = { title: string; category: string; transcript: string; meta: string; durationLabel: string; format: string; visitConfirmed: boolean; privacyEdited: boolean; categories: Option[] };

const BUTTON: Record<string, string> = {
  approve: "bg-teal text-white hover:bg-teal-dark hover:text-white",
  reject: "bg-emergency text-white hover:bg-[#8f1c13] hover:text-white",
  request_info: "border-[1.5px] border-line-strong bg-white text-ink hover:border-ink hover:text-ink",
  escalate: "bg-ink text-saffron hover:bg-ink-soft hover:text-saffron",
};

function Buttons({ decisions, working }: { decisions: Option[]; working: string }) {
  const { pending, data } = useFormStatus();
  const chosen = pending ? data?.get("decision") : null;
  return (
    <div className="flex flex-wrap gap-2">
      {decisions.map((d) => (
        <button
          key={d.value}
          type="submit"
          name="decision"
          value={d.value}
          disabled={pending}
          aria-busy={chosen === d.value || undefined}
          className={cn(
            "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-pill px-4 text-13.5 leading-tight font-medium whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-60",
            BUTTON[d.value],
          )}
        >
          {chosen === d.value ? working : d.label}
        </button>
      ))}
    </div>
  );
}

export function DecisionPanel({
  lang,
  queue,
  itemId,
  open,
  decisions,
  reasons,
  labels,
  story,
  viewHref,
  nextHref,
  noteOptional = true,
}: {
  lang: Lang;
  queue: string;
  itemId: string;
  open: boolean;
  decisions: Option[];
  reasons: Option[];
  labels: DecisionLabels;
  story: StoryDraft | null;
  viewHref: string | null;
  nextHref: string | null;
  noteOptional?: boolean;
}) {
  const [state, action] = useActionState<ActionState<DecisionData>, FormData>(decideQueueItem, idle);
  // Controlled, so a refused decision ("Choose a reason first") keeps the reason and the typed note
  // (React resets uncontrolled fields after every form action). The panel is keyed by item.
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  // The summary repeats a field's own error: show it once, under the field.
  const repeated = state.status === "error" && Object.values(errors).some((v) => v?.[0] === state.message);
  useEffect(() => {
    if (state.status === "idle") return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid ?? resultRef.current)?.focus();
  }, [state]);

  const id = (name: string) => `decide-${name}`;
  const s = labels.story;

  return (
    <div className="flex flex-col gap-3.5">
      {state.status === "success" && (
        <div ref={resultRef} tabIndex={-1} className="rounded-18 outline-none focus-visible:outline-2">
          <Callout tone="success" live="polite">
            <p className="font-medium text-ink">{state.message}</p>
            <span className="flex flex-wrap gap-x-4">
              {state.data?.publicNow && viewHref ? (
                <Link href={viewHref} className="inline-flex min-h-11 items-center text-14 font-medium">
                  {labels.viewLive}
                </Link>
              ) : null}
              {nextHref ? (
                <Link href={nextHref} className="inline-flex min-h-11 items-center text-14 font-medium">
                  {labels.nextWaiting}
                </Link>
              ) : null}
            </span>
          </Callout>
        </div>
      )}
      {open ? (
        <form ref={formRef} action={action} noValidate className="flex flex-col gap-3.5">
          <input type="hidden" name="queue" value={queue} />
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="lang" value={lang} />
          {story && (
            <fieldset className="m-0 flex flex-col gap-3 rounded-16 border border-line p-4">
              <legend className="mono-label px-1 text-10.5 text-subtle">{labels.storyTitle}</legend>
              <p className="m-0 text-13 leading-normal font-light text-muted">{labels.storyIntro}</p>
              <Field id={id("story-title")} label={s.title} error={errors.storyTitle}>
                <Input name="storyTitle" defaultValue={story.title} maxLength={140} />
              </Field>
              <Field id={id("story-category")} label={s.category} error={errors.storyCategory}>
                <Select name="storyCategory" defaultValue={story.categories.some((c) => c.value === story.category) ? story.category : ""}>
                  <option value="">{s.chooseCategory}</option>
                  {story.categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id={id("story-text")} label={s.transcript} help={s.transcriptHelp} error={errors.storyTranscript}>
                <Textarea name="storyTranscript" defaultValue={story.transcript} maxLength={4000} />
              </Field>
              {story.format === "video" && (
                <Field id={id("story-duration")} label={s.duration} help={s.durationHelp} optional={labels.optional} error={errors.storyDuration}>
                  <Input name="storyDuration" defaultValue={story.durationLabel} inputMode="numeric" placeholder="3:12" className="max-w-40" />
                </Field>
              )}
              <Field id={id("story-meta")} label={s.meta} help={s.metaHelp} optional={labels.optional} error={errors.storyMeta}>
                <Input name="storyMeta" defaultValue={story.meta} maxLength={80} />
              </Field>
              <div className="flex flex-col">
                <Checkbox id={id("story-visit")} name="visitConfirmed" label={s.visitConfirmed} defaultChecked={story.visitConfirmed} error={errors.visitConfirmed} />
                <Checkbox id={id("story-privacy")} name="privacyEdited" label={s.privacyEdited} defaultChecked={story.privacyEdited} error={errors.privacyEdited} />
                <Checkbox id={id("story-teller")} name="tellerApproved" label={s.tellerApproved} error={errors.tellerApproved} />
              </div>
            </fieldset>
          )}
          <Field id={id("reason")} label={labels.reason} error={errors.reason}>
            <Select name="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="text-14">
              <option value="">{labels.chooseReason}</option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id={id("note")} label={labels.note} optional={noteOptional ? labels.optional : undefined} help={labels.noteHelp} error={errors.note}>
            <Textarea name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="min-h-20" />
          </Field>
          {state.status === "error" && !repeated && (
            <div ref={resultRef} tabIndex={-1} role="alert" className="text-13 font-medium text-emergency outline-none">
              {state.message}
            </div>
          )}
          <Buttons decisions={decisions} working={labels.working} />
        </form>
      ) : (
        <p className="m-0 text-13 leading-normal font-light text-muted">{labels.decidedNote}</p>
      )}
    </div>
  );
}
