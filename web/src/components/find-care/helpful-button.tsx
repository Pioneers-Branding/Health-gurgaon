"use client";

import Link from "next/link";
import { useActionState } from "react";

import { toggleReviewHelpful, type HelpfulData } from "@/app/actions/find-care";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";

/** "Helpful (12)" under a review. One vote per signed-in person; tapping again removes it. */
export function HelpfulButton({
  lang,
  reviewRef,
  slug,
  count,
  label,
  signInLabel,
  signInHref,
}: {
  lang: Lang;
  reviewRef: string;
  slug: string;
  count: number;
  /** "Helpful ({count})" */
  label: string;
  signInLabel: string;
  signInHref: string;
}) {
  const [state, action, pending] = useActionState<ActionState<HelpfulData>, FormData>(toggleReviewHelpful, idle);
  const data = state.status === "success" ? state.data : undefined;
  const shown = data ? data.count : count;

  return (
    <form action={action} className="flex flex-wrap items-center gap-x-2">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="ref" value={reviewRef} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={data ? data.voted : undefined}
        className="inline-flex min-h-11 items-center text-13 text-teal hover:text-ink disabled:opacity-60 aria-pressed:font-semibold"
      >
        {label.replace("{count}", String(shown))}
      </button>
      {state.status === "error" && state.code === "sign_in_required" && (
        <span role="status" className="text-12 font-light text-muted">
          <Link href={signInHref} className="font-medium">
            {signInLabel}
          </Link>
        </span>
      )}
    </form>
  );
}
