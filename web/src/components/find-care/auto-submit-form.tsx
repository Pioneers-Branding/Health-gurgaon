"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore, useTransition, type ChangeEvent, type ComponentProps, type FormEvent, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

const subscribe = () => () => {};

/** True once the page is interactive (false on the server and during hydration). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * A GET form whose filters apply as soon as they change (Find care filters, sort, the emergency
 * page's locality). Without JavaScript it is a plain GET form with a visible submit button;
 * with JavaScript the button hides and the URL updates in place, dropping empty values.
 * Text inputs only apply on submit.
 */
export function AutoSubmitForm({
  action,
  id,
  label,
  className,
  children,
  submitLabel,
  submitClassName,
}: {
  /** The page path (from @/lib/routes), without a query. */
  action: string;
  id?: string;
  /** Accessible name, e.g. "Filters". */
  label?: string;
  className?: string;
  children: ReactNode;
  submitLabel: string;
  submitClassName?: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, startTransition] = useTransition();

  function onChange(event: ChangeEvent<HTMLFormElement>) {
    const target = event.target as unknown as HTMLInputElement | HTMLSelectElement;
    if (target instanceof HTMLInputElement && (target.type === "text" || target.type === "search")) return;
    event.currentTarget.requestSubmit();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const sp = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      // "all" is the explicit "no filter" choice of a chip group.
      if (typeof value !== "string" || value.trim() === "" || value === "all" || key === "page") continue;
      sp.append(key, value);
    }
    const qs = sp.toString();
    startTransition(() => router.push(`${action}${qs ? `?${qs}` : ""}`, { scroll: false }));
  }

  return (
    <form
      id={id}
      method="get"
      action={action}
      aria-label={label}
      aria-busy={pending || undefined}
      onChange={onChange}
      onSubmit={onSubmit}
      className={cn(className, pending && "opacity-80 transition-opacity")}
    >
      {children}
      <button
        type="submit"
        hidden={hydrated}
        className={cn(
          "min-h-11 items-center justify-center rounded-pill bg-ink px-4 text-13.5 font-medium text-cream",
          !hydrated && "inline-flex",
          submitClassName,
        )}
      >
        {submitLabel}
      </button>
    </form>
  );
}

/** A select that submits the form it belongs to (it may sit outside the form, with `form`). */
export function SubmitOnChangeSelect({
  className,
  children,
  ...rest
}: Omit<ComponentProps<"select">, "onChange">) {
  return (
    <select
      {...rest}
      className={className}
      onChange={(e) => {
        e.currentTarget.form?.requestSubmit();
      }}
    >
      {children}
    </select>
  );
}
