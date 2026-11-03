import { INTL_LOCALE, TIME_ZONE, type Lang } from "./config";

/**
 * Fill {placeholders} in a dictionary string.
 *   fmt(dict.home.nextCampNear, { place: "Sector 56" })
 * Unknown placeholders are left as they are, so a typo is visible on the page.
 */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

export type DateInput = Date | string | number;

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

/** "2026-10-12" in Indian Standard Time, for <time dateTime>. */
export function isoDate(input: DateInput): string {
  const d = toDate(input);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return parts; // en-CA formats as YYYY-MM-DD
}

export type DateStyle = "short" | "long" | "monthYear";

/**
 * Deterministic date formatting (fixed time zone, so server and browser agree).
 *   short:     12 Oct 2026      (Hindi: 12 अक्तूबर 2026)
 *   long:      12 October 2026
 *   monthYear: Oct 2026         (Hindi: अक्तूबर 2026)
 * Never pass "now" from a Server Component: with Cache Components a bare
 * new Date() during prerendering is an error. Format stored dates only.
 */
export function formatDate(lang: Lang, input: DateInput, style: DateStyle = "short"): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return "";
  const month = style === "long" || lang === "hi" ? "long" : "short";
  const options: Intl.DateTimeFormatOptions =
    style === "monthYear"
      ? { timeZone: TIME_ZONE, month, year: "numeric" }
      : { timeZone: TIME_ZONE, day: "numeric", month, year: "numeric" };
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], options).format(d).replace(/\.$/, "").replace("Sept", "Sep");
}

/** 1284 -> "1,284" (Indian grouping: 1,00,000). */
export function formatNumber(lang: Lang, value: number): string {
  return new Intl.NumberFormat(INTL_LOCALE[lang]).format(value);
}

/** ₹1,200 */
export function formatRupees(lang: Lang, value: number): string {
  return `₹${formatNumber(lang, value)}`;
}
