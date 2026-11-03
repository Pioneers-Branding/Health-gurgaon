"use client";

// The forum's LOCALITY select: a GET form that applies as soon as the choice changes. Without
// JavaScript it's a plain form with a "Show" button; with JavaScript the button hides and the URL
// updates in place (?topic=…&locality=…&sort=…).

import { useRouter } from "next/navigation";
import { useSyncExternalStore, useTransition, type FormEvent } from "react";

import { cn } from "@/components/ui/cn";

const subscribe = () => () => {};

export function LocalityFilter({
  action,
  label,
  allLabel,
  showLabel,
  options,
  value,
  keep,
}: {
  /** The forum path from routes.community(lang), without a query. */
  action: string;
  label: string;
  allLabel: string;
  showLabel: string;
  options: { value: string; label: string }[];
  value: string | null;
  /** Other filters to keep (topic, sort). */
  keep: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const sp = new URLSearchParams();
    for (const [k, v] of new FormData(e.currentTarget).entries()) {
      if (typeof v === "string" && v && v !== "all") sp.append(k, v);
    }
    const qs = sp.toString();
    start(() => router.push(`${action}${qs ? `?${qs}` : ""}`, { scroll: false }));
  }

  return (
    <form method="get" action={action} onSubmit={onSubmit} aria-busy={pending || undefined} className={cn("flex flex-col gap-2", pending && "opacity-80")}>
      <label htmlFor="forum-locality" className="mono-label text-10.5 text-subtle">
        {label}
      </label>
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <select
        id="forum-locality"
        name="locality"
        defaultValue={value ?? "all"}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="min-h-11 w-full cursor-pointer rounded-12 border-[1.5px] border-line-strong bg-white px-2.5 text-14 text-ink hover:border-subtle focus-visible:border-teal"
      >
        <option value="all">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button type="submit" hidden={hydrated} className={cn("min-h-11 items-center justify-center self-start rounded-pill bg-ink px-4 text-13.5 font-medium text-cream", !hydrated && "inline-flex")}>
        {showLabel}
      </button>
    </form>
  );
}
