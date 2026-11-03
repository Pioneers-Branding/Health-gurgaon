"use client";

// Buttons on a discussion: "▲ Helpful · 14" on each reply, and for the asker only "Mark most
// helpful" and "Mark as resolved" / "Reopen". Each is a small form posting a community Server
// Action (works without JavaScript); the thread is re-read from the server afterwards.

import Link from "next/link";
import { useActionState } from "react";

import { markBestAnswer, setThreadResolved, toggleHelpful, type BestData, type HelpfulData, type ResolvedData } from "@/app/actions/community";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";

import { fill } from "./logic";

function Problem({ state, signInHref, signInLink }: { state: ActionState<unknown>; signInHref: string; signInLink: string }) {
  if (state.status !== "error") return null;
  if (state.code === "sign_in_required") {
    return (
      <p role="status" className="basis-full text-12 leading-snug font-light text-muted">
        {state.message}{" "}
        <Link href={signInHref} className="font-medium">
          {signInLink}
        </Link>
      </p>
    );
  }
  return (
    <p role="alert" className="basis-full text-12 font-medium text-emergency">
      {state.message}
    </p>
  );
}

export type HelpfulLabels = { helpful: string; signInLink: string };

export function HelpfulButton({
  lang,
  postId,
  count,
  on,
  own,
  labels,
  signInHref,
}: {
  lang: Lang;
  postId: string;
  count: number;
  on: boolean;
  /** The viewer wrote this reply: no button, just the count. */
  own: boolean;
  labels: HelpfulLabels;
  signInHref: string;
}) {
  const [state, action, pending] = useActionState<ActionState<HelpfulData>, FormData>(toggleHelpful, idle);
  const pressed = state.status === "success" && state.data ? state.data.on : on;
  const n = state.status === "success" && state.data ? state.data.count : count;
  const text = fill(labels.helpful, { n });
  // "▲ Helpful · 14": the triangle is decoration; the button reads "Helpful · 14, pressed".
  const label = text.startsWith("▲") ? (
    <>
      <span aria-hidden="true">▲&nbsp;</span>
      {text.slice(1).trim()}
    </>
  ) : (
    text
  );
  const cls = (p: boolean) =>
    cn(
      // 32px pill as in the prototype; the hit area extends to 44px.
      "relative inline-flex min-h-8 items-center rounded-pill border-[1.5px] px-3 text-13 leading-tight transition-colors after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
      p ? "border-success bg-success-tint text-success" : "border-line-strong bg-white text-ink",
    );
  if (own) return <span className={cls(false)}>{label}</span>;
  return (
    <form action={action} className="contents">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="want" value={pressed ? "off" : "on"} />
      <button
        type="submit"
        aria-pressed={pressed}
        disabled={pending}
        className={cn(cls(pressed), !pressed && "hover:border-ink", "disabled:opacity-60")}
      >
        {label}
      </button>
      <Problem state={state} signInHref={signInHref} signInLink={labels.signInLink} />
    </form>
  );
}

export function BestButton({ lang, threadId, postId, isBest, labels, signInHref }: { lang: Lang; threadId: string; postId: string; isBest: boolean; labels: { markBest: string; unmarkBest: string; signInLink: string }; signInHref: string }) {
  const [state, action, pending] = useActionState<ActionState<BestData>, FormData>(markBestAnswer, idle);
  return (
    <form action={action} className="contents">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="postId" value={postId} />
      <button type="submit" disabled={pending} className="relative inline-flex min-h-8 items-center px-0.5 text-13 text-teal after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:text-ink disabled:opacity-60">
        {isBest ? labels.unmarkBest : labels.markBest}
      </button>
      <Problem state={state} signInHref={signInHref} signInLink={labels.signInLink} />
    </form>
  );
}

export function ResolveButton({ lang, threadId, resolved, labels, signInHref }: { lang: Lang; threadId: string; resolved: boolean; labels: { markResolved: string; reopen: string; signInLink: string }; signInHref: string }) {
  const [state, action, pending] = useActionState<ActionState<ResolvedData>, FormData>(setThreadResolved, idle);
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="threadId" value={threadId} />
      {!resolved && <input type="hidden" name="resolved" value="on" />}
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-pill bg-ink px-4 text-13.5 text-cream hover:bg-ink-soft disabled:opacity-60">
        {resolved ? labels.reopen : labels.markResolved}
      </button>
      <Problem state={state} signInHref={signInHref} signInLink={labels.signInLink} />
    </form>
  );
}
