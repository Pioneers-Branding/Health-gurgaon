"use client";

import { cn } from "@/components/ui/cn";
import { setContrast, setTextSize, usePreferences } from "./preferences";

/*
 * "A+ Larger text" and "◐ High contrast" toggles. The pressed look comes from
 * the <html data-text / data-contrast> attributes (set before first paint), via
 * the large-text: and hc: variants, so it never flashes; aria-pressed follows
 * once the client store is read.
 *   strip: text controls in the dark top strip (saffron pill when on)
 *   sheet: big buttons in the phone menu sheet
 */
type Variant = "strip" | "sheet";

const stripBase =
  "inline-flex min-h-11 items-center whitespace-nowrap text-12.5 text-on-dark hover:text-saffron [&>span]:rounded-pill [&>span]:px-2 [&>span]:py-0.75";
const sheetBase = "flex min-h-12 flex-1 items-center justify-center rounded-14 bg-night-raise px-3 text-14 text-cream";

export function TextSizeToggle({ label, variant = "strip", className }: { label: string; variant?: Variant; className?: string }) {
  const { text } = usePreferences();
  const on = text === "large";
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setTextSize(on ? "normal" : "large")}
      className={cn(
        variant === "strip"
          ? cn(stripBase, "large-text:[&>span]:bg-saffron large-text:[&>span]:text-ink")
          : cn(sheetBase, "large-text:bg-saffron large-text:text-ink"),
        className,
      )}
    >
      <span>
        <span aria-hidden="true">A+ </span>
        {label}
      </span>
    </button>
  );
}

export function ContrastToggle({ label, variant = "strip", className }: { label: string; variant?: Variant; className?: string }) {
  const { contrast } = usePreferences();
  const on = contrast === "high";
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setContrast(on ? "normal" : "high")}
      className={cn(
        variant === "strip"
          ? cn(stripBase, "hc:[&>span]:bg-saffron hc:[&>span]:text-ink")
          : cn(sheetBase, "hc:bg-saffron hc:text-ink"),
        className,
      )}
    >
      <span>
        <span aria-hidden="true">◐ </span>
        {label}
      </span>
    </button>
  );
}
