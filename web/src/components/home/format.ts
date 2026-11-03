// Pure helpers for the homepage: wording that depends on data (listing card lines, the next
// camp's date, Hindi forms of stored place and meta text), event filter groups and the WhatsApp
// number clean-up. No React and no server-only imports, so they are unit-tested
// (tests/unit/home.test.ts) and safe in Client Components.

import { istParts } from "@/lib/dates";
import type { Lang } from "@/lib/i18n/config";
import { fmt, formatNumber, formatRupees } from "@/lib/i18n/format";

/** Add query parameters to a path from @/lib/routes (empty values dropped). */
export function withQuery(href: string, params: Record<string, string | number | boolean | null | undefined>): string {
  const [path, existing = ""] = href.split("?");
  const sp = new URLSearchParams(existing);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) sp.delete(key);
    else sp.set(key, value === true ? "1" : String(value));
  }
  const qs = sp.toString();
  return `${path}${qs ? `?${qs}` : ""}`;
}

/**
 * What someone typed or pasted into "WhatsApp number", as the 10 digits we keep in the field:
 * spaces, dashes and brackets go; a leading +91 / 91 (12 digits) or 0 (11 digits) is dropped
 * before the 10-digit limit, so "+91 98765 43210" and "098765 43210" both work.
 */
export function cleanPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** A stored place name in the page language: "Sector 51" → "सेक्टर 51", "DLF Phase 2" →
 * "DLF फ़ेज़ 2" (Hindi only, whole names only: "Near Sector 56 metro" stays as stored). */
export function placeText(lang: Lang, text: string): string {
  if (lang !== "hi") return text;
  const t = text.trim();
  const sector = t.match(/^Sectors? (\d+[A-Z]?(?:\s*[–-]\s*\d+)?)$/);
  if (sector) return `सेक्टर ${sector[1]}`;
  const dlf = t.match(/^DLF Phases? (\d+(?:\s*[–-]\s*\d+)?)$/);
  if (dlf) return `DLF फ़ेज़ ${dlf[1]}`;
  return text;
}

const META_HI: [RegExp, string][] = [
  [/^([\d.]+) km$/, "$1 किमी"],
  [/^([\d,]+\+?) beds$/, "$1 बेड"],
  [/^free \/ low-cost$/i, "मुफ़्त / कम ख़र्च"],
  [/^free consultations$/i, "मुफ़्त परामर्श"],
  [/^subsidised rates$/i, "रियायती दरें"],
  [/^home visits$/i, "घर पर विज़िट"],
  [/^ICU step-down$/i, "ICU के बाद देखभाल"],
];

/** A stored "4.0 km · Sector 51 · 200+ beds" line in the page language, part by part. */
export function metaText(lang: Lang, meta: string): string {
  if (lang !== "hi" || !meta) return meta;
  return meta
    .split(" · ")
    .map((part) => {
      const p = part.trim();
      for (const [re, out] of META_HI) if (re.test(p)) return p.replace(re, out);
      return placeText(lang, p);
    })
    .join(" · ");
}

/** The place in a story's "who" line: "Son of a patient, Sector 49" → "Sector 49". */
export function storyPlace(who: string): string {
  const i = who.lastIndexOf(",");
  return i >= 0 ? who.slice(i + 1).trim() : who.trim();
}

/** "TRANSITION CARE · OCT 2026" → "Transition care" (the kind of care a story is about). */
export function storyKind(meta: string): string | null {
  const first = meta.split(" · ")[0]?.trim();
  if (!first || /^\w{3} \d{4}$/.test(first)) return null;
  return first.charAt(0) + first.slice(1).toLowerCase();
}

/** The first time in an event's time label: "9 am–1 pm" → "9 am", "7–8:30 am" → "7 am". */
export function startTime(label: string): string {
  const parts = label.split(/\s*[–-]\s*/);
  const first = parts[0]?.trim() ?? "";
  if (/\b(am|pm)$/i.test(first) || parts.length < 2) return first;
  const ampm = parts[1].match(/\b(am|pm)$/i)?.[1];
  return ampm ? `${first} ${ampm}` : first;
}

/** Hindi clock time for a start time: "9 am" → "सुबह 9 बजे", "6 pm" → "शाम 6 बजे". */
export function startTimeHi(time: string): string {
  const m = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!m) return time;
  const h = Number(m[1]);
  const h24 = m[3].toLowerCase() === "pm" ? (h % 12) + 12 : h % 12;
  const period = h24 >= 4 && h24 < 12 ? "सुबह" : h24 >= 12 && h24 < 16 ? "दोपहर" : h24 >= 16 && h24 < 19 ? "शाम" : "रात";
  return `${period} ${h}${m[2] ? `:${m[2]}` : ""} बजे`;
}

/** "Sun 26 Oct, 9 am" (Hindi "रवि 26 अक्तू॰, सुबह 9 बजे") for the hero's next camp. */
export function heroWhen(
  lang: Lang,
  t: { heroWhen: string; weekdaysShort: string[]; monthsShort: string[] },
  startsAt: string,
  timeLabel: string,
): string {
  const p = istParts(new Date(startsAt));
  const day = `${t.weekdaysShort[p.weekday]} ${p.day} ${t.monthsShort[p.month - 1]}`;
  const start = startTime(timeLabel);
  if (!start) return day;
  return fmt(t.heroWhen, { day, time: lang === "hi" ? startTimeHi(start) : start });
}

/** Event filter chips on the homepage (prototype: All, Camps, Blood drives, Workshops, Free). */
export const EVENT_FILTERS = ["all", "camps", "bloodDrives", "workshops", "free"] as const;
export type EventFilter = (typeof EVENT_FILTERS)[number];

const EVENT_GROUP: Record<string, EventFilter> = {
  health_camp: "camps",
  screening: "camps",
  vaccination: "camps",
  senior_activity: "camps",
  blood_drive: "bloodDrives",
  workshop: "workshops",
  talk: "workshops",
};

/** Does an event show under a filter chip? */
export function eventMatches(filter: EventFilter, e: { type: string; isFree: boolean }): boolean {
  if (filter === "all") return true;
  if (filter === "free") return e.isFree;
  return EVENT_GROUP[e.type] === filter;
}

export type CardFactsInput = {
  kind: string;
  areaLabel: string | null;
  localityName: string | null;
  distanceKm: number | null;
  languages: string[];
  fee: number | null;
  feeVerified: boolean;
  hoursSummary: string | null;
  keyFact: string | null;
};

export type CardFactsStrings = { km: string; fee: string; freeConsult: string; hoursChecked: string };

/**
 * The three short lines on a "Recently verified" card, as the prototype words them:
 *   doctors and clinics: place · km / languages / key fact or verified fee
 *   labs, chemists, home care: place · km / key fact or languages / checked hours or fee
 */
export function cardFacts(lang: Lang, t: CardFactsStrings, card: CardFactsInput): string[] {
  const km = card.distanceKm !== null && card.distanceKm !== undefined ? fmt(t.km, { km: formatNumber(lang, Math.round(card.distanceKm * 10) / 10) }) : null;
  const place = card.areaLabel ?? card.localityName;
  const where = [place ? placeText(lang, place) : null, km].filter(Boolean).join(" · ");
  const langs = card.languages.length ? card.languages.join(", ") : null;
  const fee = card.feeVerified && card.fee === 0 ? t.freeConsult : card.feeVerified && card.fee ? fmt(t.fee, { fee: formatRupees(lang, card.fee) }) : null;
  const hours = card.hoursSummary ? fmt(t.hoursChecked, { hours: card.hoursSummary }) : null;
  const person = card.kind === "doctor" || card.kind === "clinic";
  const lines = person ? [where, langs, card.keyFact ?? fee] : [where, card.keyFact ?? langs, hours ?? fee ?? (card.keyFact ? langs : null)];
  return lines.filter((l): l is string => !!l);
}
