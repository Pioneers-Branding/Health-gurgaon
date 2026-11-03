"use client";

import Link from "next/link";
import { useActionState } from "react";

import { toggleSaved } from "@/app/actions/saved";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";

export type SaveLabels = { save: string; saved: string; saveLabel: string; signIn: string };

/**
 * "Save" / "✓ Saved" for a provider. Posts toggleSaved (works without JavaScript); a signed-out
 * visitor gets a sign-in link that comes back here.
 */
export function SaveButton({
  lang,
  slug,
  name,
  initialSaved,
  signInHref,
  labels,
  size = "md",
  className,
}: {
  lang: Lang;
  slug: string;
  name: string;
  initialSaved: boolean;
  signInHref: string;
  labels: SaveLabels;
  /** md: 44px, 13.5px (cards) · lg: 48px, 14.5px (profile headers) */
  size?: "md" | "lg";
  className?: string;
}) {
  const [state, action, pending] = useActionState<ActionState<{ saved: boolean }>, FormData>(toggleSaved, idle);
  const saved = state.status === "success" && state.data ? state.data.saved : initialSaved;
  const needsSignIn = state.status === "error" && state.code === "sign_in_required";

  return (
    <form action={action} className={cn("flex flex-col gap-1", className)}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="kind" value="provider" />
      <input type="hidden" name="targetId" value={slug} />
      <button
        type="submit"
        aria-pressed={saved}
        aria-label={saved ? undefined : labels.saveLabel.replace("{name}", name)}
        disabled={pending}
        className={cn(
          "inline-flex w-full items-center justify-center rounded-pill border-[1.5px] px-4 leading-tight transition-colors disabled:opacity-60",
          size === "lg" ? "min-h-12 text-14.5" : "min-h-11 text-13.5",
          saved ? "border-success bg-success-tint text-success" : "border-line-strong bg-white text-ink hover:border-ink",
        )}
      >
        {saved ? labels.saved : labels.save}
      </button>
      {needsSignIn && (
        <p role="status" className="max-w-[16rem] text-12 leading-snug font-light text-muted">
          {state.message}{" "}
          <Link href={signInHref} className="font-medium">
            {labels.signIn}
          </Link>
        </p>
      )}
      {state.status === "error" && !needsSignIn && (
        <p role="alert" className="text-12 font-medium text-emergency">
          {state.message}
        </p>
      )}
    </form>
  );
}
