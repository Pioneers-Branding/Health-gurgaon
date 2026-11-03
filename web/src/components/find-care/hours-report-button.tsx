"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { reportWrongHours, type HoursReportData } from "@/app/actions/find-care";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";

/** "These hours are wrong": a one-tap report to the editors (sign-in needed). After it, the
 * confirmation replaces the button and focus moves to it. While a report is open
 * (`underRecheck`) the button is hidden; keep this component mounted so its confirmation
 * survives the refresh that follows the report. */
export function HoursReportButton({
  lang,
  slug,
  underRecheck,
  labels,
  signInHref,
}: {
  lang: Lang;
  slug: string;
  underRecheck: boolean;
  labels: { wrong: string; sending: string; signIn: string };
  signInHref: string;
}) {
  const [state, action, pending] = useActionState<ActionState<HoursReportData>, FormData>(reportWrongHours, idle);
  const doneRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "success") doneRef.current?.focus();
  }, [state.status]);

  if (state.status === "success") {
    return (
      <p ref={doneRef} tabIndex={-1} role="status" className="rounded-14 bg-success-tint px-3.5 py-3 text-13.5 leading-normal text-success">
        {state.message}
      </p>
    );
  }

  if (underRecheck) return null;

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-ink bg-white px-4 text-13.5 text-ink transition-colors hover:bg-cream disabled:opacity-60"
      >
        {pending ? labels.sending : labels.wrong}
      </button>
      {state.status === "error" && (
        <p role="alert" className="text-13 leading-snug font-light text-ink-soft">
          {state.message}{" "}
          {state.code === "sign_in_required" && (
            <Link href={signInHref} className="font-medium">
              {labels.signIn}
            </Link>
          )}
        </p>
      )}
    </form>
  );
}
