import type { ReactNode } from "react";
import { formatDate, isoDate, type DateInput, type Lang } from "@/lib/i18n";
import { cn } from "./cn";

/**
 * The source line under a fact: where it came from and when.
 *   verified: green "✓ Confirmed by clinic, 12 Oct 2026"
 *   stated:   teal "Stated by doctor" (not independently checked)
 *   muted:    grey context ("Source: district health advisory")
 */
export function SourceNote({
  lang,
  source,
  date,
  tone = "verified",
  className,
}: {
  lang: Lang;
  source: ReactNode;
  date?: DateInput;
  tone?: "verified" | "stated" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-11.5 font-light leading-normal",
        tone === "verified" ? "text-success" : tone === "stated" ? "text-teal" : "text-subtle",
        className,
      )}
    >
      {tone === "verified" && <span aria-hidden="true">✓ </span>}
      {source}
      {date !== undefined && (
        <>
          , <time dateTime={isoDate(date)}>{formatDate(lang, date)}</time>
        </>
      )}
    </span>
  );
}
