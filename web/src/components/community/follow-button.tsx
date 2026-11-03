"use client";

// "+ Follow community / topic", "Follow replies" and a society's "+ Follow". A real form posting
// the account area's toggleFollow (or toggleFollowCommunity for every topic at once), so it works
// without JavaScript; a signed-out visitor gets a sign-in link that comes back here.

import Link from "next/link";
import { useActionState } from "react";

import { toggleFollowCommunity } from "@/app/actions/community";
import { toggleFollow } from "@/app/actions/saved";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";

type Data = { following: boolean };

export type FollowLabels = { follow: string; following: string; signIn: string; signInLink: string; ariaFollow?: string };

const styles = {
  /** Forum: white pill with a hairline; on = green tint. 13px. */
  soft: (on: boolean) =>
    cn("min-h-11 rounded-pill border-[1.5px] px-3.5 text-13", on ? "border-success bg-success-tint text-success" : "border-line-strong bg-white text-ink hover:border-ink"),
  /** Thread: "Follow replies", 13.5px. */
  softLg: (on: boolean) =>
    cn("min-h-11 rounded-pill border-[1.5px] px-3.5 text-13.5", on ? "border-success bg-success-tint text-success" : "border-line-strong bg-white text-ink hover:border-ink"),
  /** Society header: ink pill; on = green tint. */
  dark: (on: boolean) => cn("min-h-12 rounded-pill px-4.5 text-14", on ? "bg-success-tint text-success" : "bg-ink text-cream hover:bg-ink-soft"),
};

export function FollowButton({
  lang,
  kind,
  targetId,
  initial,
  labels,
  signInHref,
  variant = "soft",
  className,
}: {
  lang: Lang;
  /** "community" follows every forum topic. */
  kind: "topic" | "thread" | "society" | "community";
  targetId: string;
  initial: boolean;
  labels: FollowLabels;
  signInHref: string;
  variant?: keyof typeof styles;
  className?: string;
}) {
  const [state, action, pending] = useActionState<ActionState<Data>, FormData>(kind === "community" ? toggleFollowCommunity : (toggleFollow as (s: ActionState<Data>, f: FormData) => Promise<ActionState<Data>>), idle);
  const following = state.status === "success" && state.data ? state.data.following : initial;
  const needsSignIn = state.status === "error" && state.code === "sign_in_required";

  return (
    <form action={action} className={cn("flex flex-col items-start gap-1", className)}>
      <input type="hidden" name="lang" value={lang} />
      {kind !== "community" && <input type="hidden" name="kind" value={kind} />}
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="from" value="page" />
      <input type="hidden" name="want" value={following ? "unfollow" : "follow"} />
      <button
        type="submit"
        aria-pressed={following}
        aria-label={!following && labels.ariaFollow ? labels.ariaFollow : undefined}
        disabled={pending}
        className={cn("inline-flex items-center justify-center leading-tight whitespace-nowrap transition-colors disabled:opacity-60", styles[variant](following))}
      >
        {following ? labels.following : labels.follow}
      </button>
      {needsSignIn && (
        <p role="status" className="max-w-[18rem] text-12 leading-snug font-light text-muted">
          {labels.signIn}{" "}
          <Link href={signInHref} className="font-medium">
            {labels.signInLink}
          </Link>
        </p>
      )}
      {state.status === "error" && !needsSignIn && (
        <p role="alert" className="max-w-[18rem] text-12 font-medium text-emergency">
          {state.message}
        </p>
      )}
    </form>
  );
}
