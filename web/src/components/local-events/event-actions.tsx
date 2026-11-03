"use client";

// The event page's actions (prototype #event aside): "Register with the organiser" (how to
// register: we don't take registrations ourselves), "Add to calendar", "Share on WhatsApp" with
// the message preview, "Save this event" (the account area's toggleSaved, so it shows under
// Saved events) and "Something wrong or cancelled? Report it" (a fact report for the editors).

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { reportEvent, type EventReportData } from "@/app/actions/events";
import { toggleSaved } from "@/app/actions/saved";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";
import type { LocalEventsStrings } from "@/lib/i18n/areas/local-events";
import type { Lang } from "@/lib/i18n/config";

import { AddToCalendar } from "./event-client";
import { fill } from "./format";

type T = LocalEventsStrings["event"];

const half = "inline-flex min-h-11 flex-1 items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-white px-2.5 text-center text-13.5 text-ink hover:border-ink hover:text-ink";

export function EventAside({
  t,
  facts,
  registration,
  organiser,
  calendar,
  share,
  save,
  source,
  report,
}: {
  t: T;
  /** The facts table (server-rendered). */
  facts: ReactNode;
  /** How to register, when the organiser told us; null hides the button. */
  registration: string | null;
  organiser: string;
  calendar: { href: string; fileName: string } | null;
  share: { text: string; href: string };
  /** The Save button (with the session's state, under Suspense). */
  save: ReactNode;
  /** The "VERIFIED: …" line. */
  source: ReactNode;
  report: ReactNode;
}) {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const registerId = useId();
  const shareId = useId();
  return (
    <>
      <div className="overflow-hidden rounded-22 border-[1.5px] border-ink">
        {facts}
        <div className="flex flex-col gap-2 bg-cream px-4.5 py-4">
          {registration && (
            <>
              <button
                type="button"
                aria-expanded={registerOpen}
                aria-controls={registerId}
                onClick={() => setRegisterOpen((o) => !o)}
                className="min-h-12 rounded-pill bg-teal px-4 text-15 font-semibold text-white hover:bg-teal-dark"
              >
                {t.register}
              </button>
              <div id={registerId} hidden={!registerOpen} className="flex flex-col gap-1.5 rounded-16 bg-white p-3.5">
                <span className="text-14.5 font-semibold">{t.registerTitle}</span>
                <span className="text-14 leading-normal">{registration}</span>
                <span className="text-13 leading-normal font-light text-muted">{fill(t.registerNote, { org: organiser })}</span>
              </div>
            </>
          )}
          <div className="flex gap-2">
            {calendar && <AddToCalendar href={calendar.href} fileName={calendar.fileName} label={t.addToCalendar} doneLabel={t.added} size="md" className="flex-1" />}
            <a
              href={share.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-expanded={shareOpen}
              aria-controls={shareId}
              onClick={(e) => {
                // First tap shows the message preview (with its own "Open WhatsApp" link).
                if (!shareOpen) {
                  e.preventDefault();
                  setShareOpen(true);
                }
              }}
              className={half}
            >
              {t.share}
            </a>
          </div>
          {save}
        </div>
      </div>
      <div id={shareId} hidden={!shareOpen} className="flex flex-col gap-2 rounded-18 bg-[#E7F6E9] p-3.5">
        <span className="mono-label text-10.5 text-success">{t.sharePreview}</span>
        <span className="text-13.5 leading-[1.55] whitespace-pre-line [overflow-wrap:anywhere]">{share.text}</span>
        <span className="text-11.5 font-light text-muted">{t.shareNote}</span>
        <a href={share.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center self-start rounded-pill bg-success px-4.5 text-14 font-medium text-white hover:bg-teal-dark hover:text-white">
          {t.openWhatsApp}
        </a>
      </div>
      {source}
      {report}
    </>
  );
}

/** "Save this event" / "✓ Saved". Works without JavaScript (a plain form post). */
export function SaveEvent({ lang, slug, title, initialSaved, t, signInHref }: { lang: Lang; slug: string; title: string; initialSaved: boolean; t: T; signInHref: string }) {
  const [state, action, pending] = useActionState<ActionState<{ saved: boolean }>, FormData>(toggleSaved, idle);
  const saved = state.status === "success" && state.data ? state.data.saved : initialSaved;
  const signIn = state.status === "error" && state.code === "sign_in_required";
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="kind" value="event" />
      <input type="hidden" name="targetId" value={slug} />
      <input type="hidden" name="want" value={saved ? "unsave" : "save"} />
      <button
        type="submit"
        aria-pressed={saved}
        aria-label={saved ? undefined : fill(t.saveAria, { title })}
        disabled={pending}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-center rounded-pill border-[1.5px] px-4 text-13.5 transition-colors disabled:opacity-60",
          saved ? "border-success bg-success-tint font-medium text-success" : "border-line-strong bg-white text-ink hover:border-ink",
        )}
      >
        {saved ? t.saved : t.save}
      </button>
      {signIn && (
        <p role="status" className="text-12.5 leading-snug font-light text-muted">
          {t.signInSave}{" "}
          <Link href={signInHref} className="font-medium">
            {t.signInLink}
          </Link>
        </p>
      )}
      {state.status === "error" && !signIn && (
        <p role="alert" className="text-12.5 font-medium text-emergency">
          {state.message}
        </p>
      )}
    </form>
  );
}

/** "Something wrong or cancelled? Report it": opens a short form; the answer shows the reference. */
export function ReportEvent({ lang, slug, t, signInHref }: { lang: Lang; slug: string; t: T; signInHref: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState<EventReportData>, FormData>(reportEvent, idle);
  const doneRef = useRef<HTMLParagraphElement>(null);
  const fieldId = useId();
  const done = state.status === "success";
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  if (done) {
    return (
      <p ref={doneRef} tabIndex={-1} role="status" className="text-13 leading-normal text-success">
        {state.message}
      </p>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 self-start px-0 text-left text-13 text-subtle underline underline-offset-2 hover:text-ink">
        {t.report}
      </button>
    );
  }
  const signIn = state.status === "error" && state.code === "sign_in_required";
  const fieldError = state.status === "error" ? state.fieldErrors?.details?.[0] : undefined;
  return (
    <form action={action} noValidate className="flex flex-col gap-2 rounded-18 border border-line p-3.5">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="eventSlug" value={slug} />
      <label htmlFor={fieldId} className="text-14 font-medium">
        {t.reportLabel}
      </label>
      <p id={`${fieldId}-help`} className="text-12.5 leading-normal font-light text-muted">
        {t.reportHelp}
      </p>
      <textarea
        id={fieldId}
        name="details"
        required
        minLength={8}
        maxLength={1000}
        rows={3}
        autoFocus
        aria-describedby={`${fieldId}-help${fieldError ? ` ${fieldId}-error` : ""}`}
        aria-invalid={fieldError ? true : undefined}
        className="w-full min-w-0 resize-y rounded-14 border-[1.5px] border-line-strong bg-white px-3 py-2.5 text-15 leading-[1.55] font-light text-ink focus-visible:border-teal aria-[invalid=true]:border-emergency"
      />
      {fieldError && (
        <p id={`${fieldId}-error`} className="text-13 font-medium text-emergency">
          {fieldError}
        </p>
      )}
      {signIn && (
        <p role="status" className="text-13 leading-normal text-muted">
          {t.reportSignIn}{" "}
          <Link href={signInHref} className="font-medium">
            {t.signInLink}
          </Link>
        </p>
      )}
      {state.status === "error" && !signIn && !fieldError && (
        <p role="alert" className="text-13 font-medium text-emergency">
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-pill bg-ink px-4.5 text-13.5 font-medium text-cream hover:bg-ink-soft disabled:opacity-60">
          {pending ? t.reportSending : t.reportSend}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-pill border-[1.5px] border-line-strong bg-white px-4 text-13.5 text-ink hover:border-ink">
          {t.reportCancel}
        </button>
      </div>
    </form>
  );
}
