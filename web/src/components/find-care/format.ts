// Pure helpers for Find care pages: wording that depends on data (fees, "checked 4 days ago",
// open-now status), URL query helpers and the Google Maps link. No React, no server-only
// imports, so they are unit-tested (tests/unit/find-care.test.ts).

import type { OpenStatusParts } from "@/lib/hours";
import type { Lang } from "@/lib/i18n/config";
import { fmt, formatNumber, formatRupees } from "@/lib/i18n/format";
import type { FindCareStrings } from "@/lib/i18n/areas/find-care";

/** Add query parameters to a path from @/lib/routes (empty values dropped). */
export function withParams(href: string, params: Record<string, string | number | boolean | null | undefined>, hash?: string): string {
  const [path, existing = ""] = href.split("?");
  const sp = new URLSearchParams(existing);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) sp.delete(key);
    else sp.set(key, value === true ? "1" : String(value));
  }
  const qs = sp.toString();
  return `${path}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}

/** Google Maps search for a place (no personal data). */
export function directionsUrl(parts: (string | null | undefined)[]): string {
  const query = [...parts.filter((p): p is string => !!p && p.trim() !== ""), "Gurugram"].join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** "Checked 4 days ago" / "Checked today" (null when never checked). */
export function checkedAgo(t: FindCareStrings["card"], days: number | null): string | null {
  if (days === null) return null;
  if (days <= 0) return t.checkedToday;
  if (days === 1) return t.checkedOneDayAgo;
  return fmt(t.checkedDaysAgo, { days });
}

/** The fee or open-now line on a result card, as the prototype words it. */
export function feeLine(
  lang: Lang,
  t: FindCareStrings["card"],
  card: { fee: number | null; feeVerified: boolean; openNow: boolean | null },
): string | null {
  if (card.feeVerified && card.fee === 0) return t.free;
  if (card.feeVerified && card.fee) return fmt(t.fee, { amount: formatRupees(lang, card.fee) });
  if (card.openNow === true) return t.openNow;
  if (card.openNow === false) return t.closedNow;
  return null;
}

/** "0.8 km" (Hindi: "0.8 किमी"). */
export function kmLabel(lang: Lang, template: string, km: number | null): string | null {
  if (km === null || km === undefined) return null;
  return fmt(template, { km: formatNumber(lang, Math.round(km * 10) / 10) });
}

/** Clock time for open-now lines: "8 pm", "7:30 am" (Hindi: "शाम 8", "सुबह 7:30"). */
export function clockTime(lang: Lang, minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = min ? `:${String(min).padStart(2, "0")}` : "";
  if (lang === "hi") {
    const part = h < 4 ? "रात" : h < 12 ? "सुबह" : h < 16 ? "दोपहर" : h < 20 ? "शाम" : "रात";
    return `${part} ${h12}${mm}`;
  }
  if (m === 0) return "midnight";
  if (m === 720) return "noon";
  return `${h12}${mm} ${h >= 12 ? "pm" : "am"}`;
}

/** Headline and detail for the open-now pill. */
export function openStatusText(
  lang: Lang,
  t: FindCareStrings["hours"],
  weekdays: readonly string[],
  parts: OpenStatusParts,
): { state: OpenStatusParts["state"]; label: string; detail: string } {
  switch (parts.kind) {
    case "open24":
      return { state: "open", label: t.open, detail: t.open24 };
    case "tillMidnight":
      return { state: "open", label: t.open, detail: t.tillMidnight };
    case "closesToday":
      return { state: "open", label: t.open, detail: fmt(t.closesToday, { time: clockTime(lang, parts.minutes) }) };
    case "opensToday":
      return { state: "closed", label: t.closedNow, detail: fmt(t.opensToday, { time: clockTime(lang, parts.minutes) }) };
    case "opensLater":
      return {
        state: "closed",
        label: t.closedNow,
        detail:
          parts.inDays === 1
            ? fmt(t.opensTomorrow, { time: clockTime(lang, parts.minutes) })
            : fmt(t.opensOn, { time: clockTime(lang, parts.minutes), day: weekdays[parts.day] ?? "" }),
      };
    case "closed":
      return { state: "closed", label: t.closedNow, detail: "" };
    default:
      return { state: "unknown", label: t.unknown, detail: t.callToConfirm };
  }
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTHS_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्तूबर", "नवंबर", "दिसंबर"];

/** A review's visit month as the prototype prints it: "September 2026" → "SEP 2026"
 * (Hindi "सितंबर 2026"). Anything else ("Earlier in 2026") is returned as stored. */
export function visitMonthLabel(lang: Lang, visitMonth: string): string {
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(visitMonth.trim());
  const idx = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
  if (!m || idx < 0) return visitMonth;
  return lang === "hi" ? `${MONTHS_HI[idx]} ${m[2]}` : `${m[1].slice(0, 3).toUpperCase()} ${m[2]}`;
}

/** Split a specialty's emergency note into the card title and body the way the prototype lays
 * it out: "Go to emergency, …, if your child" + "has trouble breathing, …". */
export function splitEmergencyNote(note: string): { title: string; body: string } | null {
  const m = /^(.*?\bif (?:your|a|the|someone)\b(?: \w+)?)\s+(.+)$/i.exec(note.trim());
  if (!m) return null;
  return { title: m[1], body: m[2] };
}

/** The resident-facing date of a fact ("12 Oct 2026") is formatted by the page; this turns a
 * stored source label to upper case for the mono stamps ("HOURS CONFIRMED BY CLINIC"). */
export function stampText(text: string): string {
  return text.toUpperCase();
}
