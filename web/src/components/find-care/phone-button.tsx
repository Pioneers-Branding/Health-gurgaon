"use client";

import { useActionState } from "react";

import { revealProviderPhone, type PhoneData } from "@/app/actions/find-care";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";

export type PhoneLabels = { show: string; loading: string; shown: string; call: string; none: string };

/**
 * "Show clinic phone" → "+91 124 400 1234 (clinic)". The number is fetched by a Server Action on
 * click, so it is never in the page HTML. Once shown it becomes a tel: link.
 *   variant "primary": teal 48px (doctor profile) · "outline": ink border 44px (blood banks)
 */
export function PhoneButton({
  lang,
  slug,
  labels,
  variant = "primary",
  className,
}: {
  lang: Lang;
  slug: string;
  labels: PhoneLabels;
  variant?: "primary" | "outline";
  className?: string;
}) {
  const [state, action, pending] = useActionState<ActionState<PhoneData>, FormData>(revealProviderPhone, idle);
  const done = state.status === "success" && state.data;
  const phone = done ? state.data!.phone : null;

  const base =
    variant === "primary"
      ? "min-h-12 rounded-pill px-5 text-14.5 font-semibold"
      : "min-h-11 rounded-pill px-4 text-13.5";

  if (done && phone) {
    return (
      <a
        href={`tel:${phone.replace(/[^\d+]/g, "")}`}
        aria-label={labels.call.replace("{phone}", phone)}
        className={cn(
          "inline-flex items-center justify-center leading-tight no-underline",
          base,
          variant === "primary" ? "bg-teal text-white hover:bg-teal-dark hover:text-white" : "border-[1.5px] border-ink bg-white text-ink hover:text-ink",
          className,
        )}
      >
        {labels.shown.replace("{phone}", phone)}
      </a>
    );
  }

  if (done && !phone) {
    return (
      <p role="status" className={cn("inline-flex items-center rounded-pill bg-cream text-subtle", base, "font-normal", className)}>
        {labels.none}
      </p>
    );
  }

  return (
    <form action={action} className={className}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className={cn(
          "inline-flex items-center justify-center leading-tight transition-colors disabled:opacity-70",
          base,
          variant === "primary" ? "bg-teal text-white hover:bg-teal-dark" : "border-[1.5px] border-ink bg-white text-ink hover:bg-cream",
        )}
      >
        {pending ? labels.loading : labels.show}
      </button>
      {state.status === "error" && (
        <p role="alert" className="mt-1 text-12 font-medium text-emergency">
          {state.message}
        </p>
      )}
    </form>
  );
}
