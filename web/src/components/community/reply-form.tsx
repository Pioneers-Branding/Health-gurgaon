"use client";

// "Add a reply" on a discussion. Warns while typing (a phone number will be removed, dosage advice,
// urgent symptoms), posts postReply (works without JavaScript) and shows that the reply waits for a
// moderator. The server removes personal data again before saving.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { postReply, type ReplyData } from "@/app/actions/community";
import { Callout } from "@/components/ui/callout";
import { FieldError } from "@/components/ui/form";
import { idle, type ActionState } from "@/lib/action-state";
import { detectDosageAdvice, detectUrgency } from "@/lib/content-safety";
import type { Lang } from "@/lib/i18n/config";
import { findPersonalData } from "@/lib/redact";

import { TypingWarning, UrgentBanner } from "./bits";

export type ReplyLabels = {
  addReply: string;
  replyLabel: string;
  replyPlaceholder: string;
  replyNote: string;
  postReply: string;
  posting: string;
  phoneWarning: string;
  dosageWarning: string;
  urgentTitle: string;
  urgentBody: string;
  selfHarm: string;
  replySent: string;
  replyRedacted: string;
  signInLink: string;
  seeActivity: string;
};

function Fields({ labels, error }: { labels: ReplyLabels; error?: string }) {
  const [text, setText] = useState("");
  const urgency = detectUrgency(text);
  const pd = findPersonalData(text);
  const warn = pd.phone || pd.email || pd.idNumber ? labels.phoneWarning : detectDosageAdvice(text) ? labels.dosageWarning : null;
  return (
    <>
      {urgency.urgent && <UrgentBanner title={labels.urgentTitle} body={labels.urgentBody} extra={urgency.selfHarm ? labels.selfHarm : null} />}
      <label htmlFor="reply-body" className="sr-only">
        {labels.replyLabel}
      </label>
      <textarea
        id="reply-body"
        name="body"
        rows={3}
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        placeholder={labels.replyPlaceholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={[warn ? "reply-warning" : null, error ? "reply-error" : null].filter(Boolean).join(" ") || undefined}
        className="min-h-24 w-full resize-y rounded-14 border-[1.5px] border-line-strong bg-white px-3 py-3 text-15 leading-[1.55] font-light text-ink placeholder:text-subtle hover:border-subtle focus-visible:border-teal aria-[invalid=true]:border-emergency"
      />
      {warn && <TypingWarning id="reply-warning">{warn}</TypingWarning>}
      {error && <FieldError id="reply-error">{error}</FieldError>}
    </>
  );
}

export function ReplyForm({ lang, threadId, labels, signInHref, activityHref }: { lang: Lang; threadId: string; labels: ReplyLabels; signInHref: string; activityHref: string }) {
  const [state, action, pending] = useActionState<ActionState<ReplyData>, FormData>(postReply, idle);
  const router = useRouter();
  const sent = state.status === "success" ? state.data : undefined;
  // Show the reply in "waiting for a moderator" (a request-time part of the page).
  useEffect(() => {
    if (sent) router.refresh();
  }, [sent, router]);
  const fieldError = state.status === "error" ? state.fieldErrors?.body?.[0] : undefined;

  return (
    <form action={action} aria-labelledby="add-reply" className="flex flex-col gap-2.5 rounded-20 border-[1.5px] border-ink p-4.5">
      <h2 id="add-reply" className="text-16 font-semibold">
        {labels.addReply}
      </h2>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="threadId" value={threadId} />
      {sent && (
        <Callout tone="success" live="polite" title={labels.replySent}>
          {sent.redacted ? <p>{labels.replyRedacted}</p> : null}
          <Link href={activityHref} className="inline-flex min-h-11 items-center font-medium">
            {labels.seeActivity}
          </Link>
        </Callout>
      )}
      {/* A new key after each sent reply clears the box; errors keep what was typed. */}
      <Fields key={sent?.postId ?? "draft"} labels={labels} error={fieldError} />
      {state.status === "error" && !fieldError && (
        <p role={state.code === "sign_in_required" ? "status" : "alert"} className={state.code === "sign_in_required" ? "text-13 font-light text-muted" : "text-13 font-medium text-emergency"}>
          {state.message}{" "}
          {state.code === "sign_in_required" && (
            <Link href={signInHref} className="inline-flex min-h-11 items-center font-medium">
              {labels.signInLink}
            </Link>
          )}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="max-w-[36rem] flex-1 basis-60 text-12 font-light text-subtle">{labels.replyNote}</span>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className="inline-flex min-h-11 items-center rounded-pill bg-teal px-5 text-14 font-semibold text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {pending ? labels.posting : labels.postReply}
        </button>
      </div>
    </form>
  );
}
