"use client";

// "Message the organiser" on a society profile: forwarded privately (contactOrganiser), so neither
// side's phone number is shown. Works without JavaScript.

import Link from "next/link";
import { useActionState, useState } from "react";

import { contactOrganiser } from "@/app/actions/rwa";
import { FieldError } from "@/components/ui/form";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";
import { findPersonalData } from "@/lib/redact";

import { TypingWarning } from "./bits";

export type ContactLabels = { messageTitle: string; messageNote: string; messageLabel: string; messagePlaceholder: string; send: string; sent: string; sending: string; phoneWarning: string; signInLink: string };

export function ContactOrganiserForm({ lang, societySlug, labels, signInHref }: { lang: Lang; societySlug: string; labels: ContactLabels; signInHref: string }) {
  const [state, action, pending] = useActionState<ActionState<{ sent: true }>, FormData>(contactOrganiser, idle);
  const [text, setText] = useState("");
  const sent = state.status === "success";
  const error = state.status === "error" ? (state.fieldErrors?.message?.[0] ?? state.message) : null;
  const pd = findPersonalData(text);

  return (
    <form action={action} aria-labelledby="message-title" className="flex flex-col gap-2.5">
      <h2 id="message-title" className="font-semibold">
        {labels.messageTitle}
      </h2>
      <p className="text-13 font-light text-muted">{labels.messageNote}</p>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="societySlug" value={societySlug} />
      <label htmlFor="organiser-message" className="sr-only">
        {labels.messageLabel}
      </label>
      <textarea
        id="organiser-message"
        name="message"
        rows={3}
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        placeholder={labels.messagePlaceholder}
        readOnly={sent}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "organiser-message-error" : undefined}
        className="min-h-24 w-full resize-y rounded-12 border-[1.5px] border-line-strong bg-white px-3 py-3 text-14.5 leading-[1.55] font-light text-ink placeholder:text-subtle hover:border-subtle focus-visible:border-teal aria-[invalid=true]:border-emergency"
      />
      {pd.phone || pd.email ? <TypingWarning>{labels.phoneWarning}</TypingWarning> : null}
      {error && (
        <FieldError id="organiser-message-error">
          {error}{" "}
          {state.status === "error" && state.code === "sign_in_required" && (
            <Link href={signInHref} className="inline-flex min-h-11 items-center font-medium">
              {labels.signInLink}
            </Link>
          )}
        </FieldError>
      )}
      <button
        type="submit"
        disabled={pending || sent}
        aria-live="polite"
        className="inline-flex min-h-11 items-center self-start rounded-pill bg-teal px-4.5 text-14 text-white hover:bg-teal-dark disabled:opacity-80"
      >
        {sent ? labels.sent : pending ? labels.sending : labels.send}
      </button>
    </form>
  );
}
