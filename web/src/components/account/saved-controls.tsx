"use client";

// Saved & followed: "Tell me … when something I saved changes" and each follow's alerts.

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";

import { setConsent, type ConsentActionData } from "@/app/actions/consent";
import { setFollowAlert, type FollowAlertData } from "@/app/actions/saved";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";

import { focusElement, useFocusLater, useOnChange } from "./hooks";

/** The switch for "Changes to things I saved" (a message type), from the Saved page. */
export function SavedChangesSwitch({
  lang,
  on,
  title,
  note,
  onLabel,
  offLabel,
  allMessages,
  allMessagesHref,
}: {
  lang: "en" | "hi";
  on: boolean;
  title: string;
  note: string;
  onLabel: string;
  offLabel: string;
  allMessages: string;
  allMessagesHref: string;
}) {
  const [state, action, pending] = useActionState<ActionState<ConsentActionData>, FormData>(setConsent, idle);
  const focusLater = useFocusLater();
  useOnChange(state, () => focusLater("hg-sw-btn"));
  return (
    <form action={action} className="mt-1.5 flex flex-col rounded-16 bg-cream px-3.5 py-1.5">
      <input type="hidden" name="purpose" value="saved_changes" />
      <input type="hidden" name="granted" value={on ? "off" : "on"} />
      <input type="hidden" name="from" value="saved" />
      <input type="hidden" name="lang" value={lang} />
      <div className="flex items-center justify-between gap-3">
        <span id="hg-sw-saved" className="min-w-0 py-2 text-14.5 font-semibold leading-[1.4]">
          {title}
        </span>
        <button
          id="hg-sw-btn"
          type="submit"
          role="switch"
          aria-checked={on}
          aria-labelledby="hg-sw-saved"
          aria-describedby="hg-sw-note"
          disabled={pending}
          className="inline-flex min-h-11 flex-none items-center gap-2.5 px-1 disabled:opacity-70"
        >
          <span aria-hidden="true" className={cn("relative block h-7.5 w-13 flex-none rounded-pill border-2", on ? "border-teal bg-teal" : "border-subtle bg-white")}>
            <span className={cn("absolute top-0.75 block size-5 rounded-full transition-[left]", on ? "left-6.25 bg-white" : "left-0.75 bg-subtle")} />
          </span>
          <span aria-hidden="true" className={cn("min-w-6.5 text-left text-14 font-semibold", on ? "text-teal" : "text-muted")}>
            {on ? onLabel : offLabel}
          </span>
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3.5">
        <span id="hg-sw-note" className="max-w-[40rem] text-13 font-light leading-normal text-muted">
          {note}
        </span>
        <Link href={allMessagesHref} className="inline-flex min-h-11 items-center text-13.5 font-medium">
          {allMessages}
        </Link>
      </div>
      {state.status !== "idle" && (
        <span role={state.status === "error" ? "alert" : "status"} className={cn("pb-2 text-14 leading-normal", state.status === "error" ? "font-medium text-emergency" : "text-success")}>
          {state.message}
        </span>
      )}
    </form>
  );
}

const seg = (on: boolean) =>
  cn(
    "min-h-11 rounded-pill border-[1.5px] px-4 text-14 disabled:opacity-70",
    on ? "border-ink bg-ink font-semibold text-cream" : "border-line-strong bg-white font-normal text-ink hover:border-ink",
  );

/** "WhatsApp alerts about Sohna Road: No alerts | Send alerts", with the "Send alerts about …?"
 * question when its message type is off. */
export function FollowAlerts({
  lang,
  itemKey,
  kind,
  targetId,
  on,
  heading,
  note,
  noteTone,
  ask,
  labels,
  footer,
}: {
  lang: "en" | "hi";
  itemKey: string;
  kind: string;
  targetId: string;
  /** Alerts are actually being sent. */
  on: boolean;
  heading: string;
  note: string;
  noteTone: "on" | "stopped" | "off";
  ask: { title: string; body: string };
  labels: { noAlerts: string; sendAlerts: string; askYes: string; askNo: string };
  footer: ReactNode;
}) {
  const [state, action, pending] = useActionState<ActionState<FollowAlertData>, FormData>(setFollowAlert, idle);
  const [dismissed, setDismissed] = useState<unknown>(null);
  const asking = state.status === "error" && state.code === "consent_required" && dismissed !== state && !on;
  const labelId = `hg-al-${itemKey}`;
  const askId = `hg-ask-f-${itemKey}`;
  const focusLater = useFocusLater();
  useOnChange(state, (s) => {
    if (s.status === "error" && s.code === "consent_required") focusLater(askId);
    else if (s.status === "success") focusLater(s.data?.alert === "whatsapp" || s.data?.alert === "email" ? `hg-on-${itemKey}` : `hg-off-${itemKey}`);
  });
  const hidden = (
    <>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="from" value="saved" />
      <input type="hidden" name="lang" value={lang} />
    </>
  );
  return (
    <div className="mt-1 flex flex-col gap-2 border-t border-line pt-2.5">
      <span id={labelId} className="text-14 font-medium">
        {heading}
      </span>
      <form action={action} role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
        {hidden}
        <button id={`hg-off-${itemKey}`} type="submit" name="alert" value="off" aria-pressed={!on} disabled={pending} className={seg(!on)}>
          {labels.noAlerts}
        </button>
        <button id={`hg-on-${itemKey}`} type="submit" name="alert" value="on" aria-pressed={on} disabled={pending} className={seg(on)}>
          {labels.sendAlerts}
        </button>
      </form>
      <span className={cn("text-13.5 leading-normal", noteTone === "on" ? "font-medium text-success" : noteTone === "stopped" ? "text-caution" : "text-muted")}>{note}</span>
      {asking && (
        <div role="group" aria-labelledby={askId} className="flex flex-col gap-2.5 rounded-16 border-[1.5px] border-teal bg-cream p-3.5">
          <span id={askId} tabIndex={-1} className="text-15 font-semibold leading-[1.4]">
            {ask.title}
          </span>
          <span className="text-14 font-light leading-[1.55] text-ink">{ask.body}</span>
          <div className="flex flex-wrap gap-2">
            <form action={action}>
              {hidden}
              <input type="hidden" name="alert" value="on" />
              <input type="hidden" name="confirm" value="1" />
              <button type="submit" disabled={pending} className="min-h-11 rounded-pill bg-teal px-5 text-14.5 font-semibold text-white hover:bg-teal-dark disabled:opacity-70">
                {labels.askYes}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setDismissed(state);
                focusElement(`hg-on-${itemKey}`);
              }}
              className="min-h-11 rounded-pill border-[1.5px] border-line-strong bg-white px-4.5 text-14.5 text-ink hover:border-ink"
            >
              {labels.askNo}
            </button>
          </div>
        </div>
      )}
      {state.status === "success" && (
        <span role="status" className="text-14 leading-normal text-success">
          {state.message}
        </span>
      )}
      {state.status === "error" && state.code !== "consent_required" && (
        <span role="alert" className="text-14 font-medium leading-normal text-emergency">
          {state.message}
        </span>
      )}
      {footer}
    </div>
  );
}
