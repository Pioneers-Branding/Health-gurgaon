import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

/**
 * Chips and pills.
 *
 * Interactive (44px tall, Find Care filter chips):
 *   ChipButton  toggles state in a Client Component (aria-pressed).
 *   ChipLink    a filter that is a URL (works without JavaScript): aria-current when on.
 *   For form inputs that look like chips use ChoiceChips from ./form.
 *
 * Static:
 *   Tag         non-interactive pill: "cream" (services), "outline" (specialties),
 *               "type" (facility type, bold 11.5px).
 */
export const chipBase =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-pill border-[1.5px] px-3.25 text-13 leading-tight whitespace-nowrap transition-colors";
export const chipOff = "border-line-strong bg-white text-ink hover:border-ink hover:text-ink";
export const chipOn = "border-ink bg-ink text-cream hover:text-cream";

export function chipClasses(selected: boolean, className?: string) {
  return cn(chipBase, selected ? chipOn : chipOff, className);
}

export type ChipButtonProps = Omit<ComponentProps<"button">, "children"> & {
  selected?: boolean;
  children: ReactNode;
};

export function ChipButton({ selected = false, className, type = "button", children, ...rest }: ChipButtonProps) {
  return (
    <button type={type} aria-pressed={selected} className={chipClasses(selected, className)} {...rest}>
      {children}
    </button>
  );
}

export type ChipLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  selected?: boolean;
  children: ReactNode;
};

export function ChipLink({ selected = false, className, children, ...rest }: ChipLinkProps) {
  return (
    <Link aria-current={selected ? "true" : undefined} className={chipClasses(selected, className)} {...rest}>
      {children}
    </Link>
  );
}

export type TagTone = "cream" | "outline" | "type" | "white";

const tagTones: Record<TagTone, string> = {
  cream: "bg-cream px-3.25 py-1.75 text-13.5",
  outline: "border border-line px-2.25 py-0.75 text-11.5",
  type: "bg-cream px-2.5 py-0.75 text-11.5 font-semibold",
  white: "bg-white px-2.75 py-1 text-12 font-medium",
};

export function Tag({
  tone = "cream",
  className,
  children,
}: {
  tone?: TagTone;
  className?: string;
  children: ReactNode;
}) {
  return <span className={cn("inline-flex items-center rounded-pill text-ink leading-tight", tagTones[tone], className)}>{children}</span>;
}

/** Wrapping row of chips/tags with the prototype's 6px gap. */
export function ChipRow({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  return (
    <div role={label ? "group" : undefined} aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {children}
    </div>
  );
}
