"use client";

// Small client pieces of the events calendar and event pages: the filter form that applies as
// soon as a filter changes, and "Add to calendar" (a calendar file made on the page).

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

const subscribe = () => () => {};

/** True once the page is interactive (false on the server and while hydrating). */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * The calendar's locality / Free only / Verified only filters: a GET form. Without JavaScript it
 * has a visible "Apply filters" button; with JavaScript the button hides and the URL updates in
 * place as soon as a filter changes (empty values and "all" dropped, the selected day cleared).
 */
export function EventFilterForm({ action, label, applyLabel, children }: { action: string; label: string; applyLabel: string; children: ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, startTransition] = useTransition();

  function onChange(event: ChangeEvent<HTMLFormElement>) {
    event.currentTarget.requestSubmit();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sp = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget).entries()) {
      if (typeof value !== "string" || !value.trim() || value === "all") continue;
      sp.append(key, value);
    }
    const qs = sp.toString();
    startTransition(() => router.push(`${action}${qs ? `?${qs}` : ""}`, { scroll: false }));
  }

  return (
    <form method="get" action={action} aria-label={label} aria-busy={pending || undefined} onChange={onChange} onSubmit={onSubmit} className={cn("contents", pending && "opacity-80")}>
      {children}
      <button type="submit" hidden={hydrated} className={cn("min-h-11 items-center rounded-pill bg-ink px-4 text-13.5 font-medium text-cream", !hydrated && "inline-flex")}>
        {applyLabel}
      </button>
    </form>
  );
}

/** "Add to calendar": downloads a calendar file for the event, then reads "✓ In calendar". */
export function AddToCalendar({ href, fileName, label, doneLabel, size = "sm", className }: { href: string; fileName: string; label: string; doneLabel: string; size?: "sm" | "md"; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <a
      href={href}
      download={fileName}
      onClick={() => setDone(true)}
      aria-live="polite"
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-pill border-[1.5px] text-center transition-colors",
        size === "md" ? "px-2.5 text-13.5" : "px-3 text-13",
        done ? "border-success bg-success-tint text-success hover:text-success" : "border-line-strong bg-white text-ink hover:border-ink hover:text-ink",
        className,
      )}
    >
      {done ? doneLabel : label}
    </a>
  );
}
