import { fmt, formatDate, getDictionary, isoDate, type DateInput, type Lang } from "@/lib/i18n";
import { cn } from "./cn";

/**
 * "CHECKED 12 OCT 2026" / "LAST CHECKED 12 OCT 2026": when a listing was last
 * verified. Trust first: every listing card and profile shows one.
 * Pass the stored date (Date or ISO string); it is formatted in Indian time so
 * server and browser agree. Never pass "now".
 */
export type StampKind = "checked" | "lastChecked" | "updated" | "confirmed";

export function FreshnessStamp({
  date,
  lang,
  kind = "checked",
  tone = "subtle",
  precision = "day",
  size = "11",
  className,
}: {
  date: DateInput;
  lang: Lang;
  kind?: StampKind;
  /** subtle: grey mono text · success: green with ✓ (hospital cards) */
  tone?: "subtle" | "success";
  /** "day" -> 12 Oct 2026 · "month" -> Oct 2026 */
  precision?: "day" | "month";
  size?: "10" | "10.5" | "11";
  className?: string;
}) {
  const formatted = formatDate(lang, date, precision === "month" ? "monthYear" : "short");
  const text = fmt(getDictionary(lang).stamps[kind], { date: formatted });
  return (
    <time
      dateTime={isoDate(date)}
      className={cn(
        "inline-flex items-center gap-1 font-mono font-normal uppercase leading-tight",
        size === "10" ? "text-10" : size === "10.5" ? "text-10.5" : "text-11",
        tone === "success" ? "text-success" : "text-subtle",
        className,
      )}
    >
      {tone === "success" && <span aria-hidden="true">✓</span>}
      {text}
    </time>
  );
}
