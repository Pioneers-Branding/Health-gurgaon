// Pure helpers for the account pages: dates in the reader's language, lists, the sign-in
// field clean-up, the review checks a moderator applies, and the consent record in Hindi.
// No server-only imports: client components use these too. Unit tests: tests/unit/account-format.test.ts.

import { daysBetween, formatShortDay, istParts } from "@/lib/dates";
import { fmt, formatDate } from "@/lib/i18n/format";

export type Lang = "en" | "hi";

const TZ = "Asia/Kolkata";
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const toDate = (v: string | Date) => (v instanceof Date ? v : new Date(v));

/** "12 Oct 2026" · "12 अक्तूबर 2026". */
export function dateShort(lang: Lang, value: string | Date): string {
  return formatDate(lang, toDate(value), "short");
}

/** "Thu 29 Oct" · "गुरुवार, 29 अक्टूबर" (with `year`: "Mon 26 Oct 2026"). */
export function dayShort(lang: Lang, value: string | Date, opts: { year?: boolean } = {}): string {
  const d = toDate(value);
  if (lang === "en") return formatShortDay(d, opts);
  return new Intl.DateTimeFormat("hi-IN", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", ...(opts.year ? { year: "numeric" } : {}) }).format(d);
}

/** "Sunday 15 Nov 2026" · "रविवार, 15 नवंबर 2026". */
export function dayLong(lang: Lang, value: string | Date): string {
  const d = toDate(value);
  if (lang === "en") {
    const p = istParts(d);
    return `${DOW_LONG[p.weekday]} ${p.day} ${MON_SHORT[p.month - 1]} ${p.year}`;
  }
  return new Intl.DateTimeFormat("hi-IN", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** "14 Oct" · "14 अक्टूबर". */
export function dayMonth(lang: Lang, value: string | Date): string {
  const d = toDate(value);
  if (lang === "en") {
    const p = istParts(d);
    return `${p.day} ${MON_SHORT[p.month - 1]}`;
  }
  return new Intl.DateTimeFormat("hi-IN", { timeZone: TZ, day: "numeric", month: "long" }).format(d);
}

/** The dark date tile on an event card: SUN · 15 · NOV (Hindi: रवि · 15 · नव॰). */
export function dateTile(lang: Lang, value: string | Date): { dow: string; day: string; mon: string } {
  const d = toDate(value);
  const p = istParts(d);
  if (lang === "en") return { dow: DOW_LONG[p.weekday].slice(0, 3), day: String(p.day).padStart(2, "0"), mon: MON_SHORT[p.month - 1] };
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("hi-IN", { timeZone: TZ, ...o }).format(d);
  return { dow: f({ weekday: "short" }), day: String(p.day).padStart(2, "0"), mon: f({ month: "short" }) };
}

/** "8:14 pm" (both languages). */
export function timeOfDay(value: string | Date): string {
  const p = istParts(toDate(value));
  const h = p.hour % 12 || 12;
  return `${h}:${String(p.minute).padStart(2, "0")} ${p.hour >= 12 ? "pm" : "am"}`;
}

/** "Mon 26 Oct 2026, 7:40 pm". */
export function dayTime(lang: Lang, value: string | Date): string {
  return `${dayShort(lang, value, { year: true })}, ${timeOfDay(value)}`;
}

/** The consent record's stamp: "14 Oct 2026, 11:02 am" (mono labels uppercase it in CSS). */
export function stampLabel(lang: Lang, value: string | Date): string {
  return `${dateShort(lang, value)}, ${timeOfDay(value)}`;
}

/** "October 2026" (as stored for a visit) → "Oct 2026" · "अक्तूबर 2026". Anything else unchanged. */
export function visitMonthLabel(lang: Lang, value: string): string {
  const m = value.match(/^([A-Z][a-z]+) (\d{4})$/);
  const i = m ? MON_LONG.indexOf(m[1]) : -1;
  if (!m || i < 0) return value;
  if (lang === "en") return `${MON_SHORT[i]} ${m[2]}`;
  return new Intl.DateTimeFormat("hi-IN", { timeZone: TZ, month: "long", year: "numeric" }).format(new Date(Date.UTC(+m[2], i, 15)));
}

/** Whole IST calendar days from now until the date (negative when past). */
export function daysUntil(nowIso: string, value: string | Date): number {
  return daysBetween(new Date(nowIso), toDate(value));
}

/** "a, b and c". */
export function listText(items: string[], and: string): string {
  const xs = items.filter(Boolean);
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")}${and}${xs[xs.length - 1]}`;
}

/** Pick "{n} place" / "{n} places" and fill it. */
export function countText(n: number, forms: readonly [string, string]): string {
  return fmt(n === 1 ? forms[0] : forms[1], { n });
}

/** Shorten a title at a word boundary: "Any 24-hour chemist near Golf Course Ext. Road…". */
export function shortTitle(title: string, max = 48): string {
  if (title.length <= max) return title;
  const cut = title.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > 20 ? cut.slice(0, at) : title.slice(0, max)).replace(/[\s,.;:–-]+$/, "")}…`;
}

// ── Sign-in fields ───────────────────────────────────────────────────────────

/** What the phone field keeps from what was typed or pasted: digits only, a leading 91 or 0
 * dropped from longer numbers, at most 10 digits. */
export function cleanPhoneInput(value: string): string {
  let v = value.replace(/\D/g, "");
  if (v.length > 10 && v.startsWith("91")) v = v.slice(2);
  if (v.length > 10 && v.startsWith("0")) v = v.slice(1);
  return v.slice(0, 10);
}

export type PhoneProblem = { kind: "empty" } | { kind: "first" } | { kind: "count"; n: number } | null;

/** The sign-in page's three problems with a typed number (null when it's a valid Indian mobile). */
export function phoneProblem(value: string): PhoneProblem {
  let d = value.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  if (!d) return { kind: "empty" };
  if (!/^[6-9]/.test(d)) return { kind: "first" };
  if (d.length !== 10) return { kind: "count", n: d.length };
  return null;
}

/** A pasted "123 456" or "123-456" works: strip everything but digits first, then keep six. */
export function cleanCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

// ── What a moderator looks for in a review ─────────────────────────────────────
// Medicine and condition words only get a warning (naming a service, "the diabetes clinic", is
// fine). A dose, such as "40 mg", always has to come out. Phone numbers are replaced on the server.

const MED_WORDS = /blood pressure|\bBP\b|\bdiabet(?:es|ic)\b|\binsulin\b|\btablets?\b|\bcapsules?\b|\bsyrups?\b|\binjections?\b|\binhalers?\b|\bprescri\w*|\bdiagnos(?:e|es|ed|is)\b|\bdos(?:e|es|age)\b|\bCOPD\b|\basthma\b/gi;
const DOSE = /\b\d+(?:\.\d+)?\s?(?:mg|mcg|ml)\b/gi;
const PHONE = /(?:\+91[\s-]?)?\b\d{5}[\s-]?\d{5}\b/;

function uniqueHits(re: RegExp, text: string): string[] {
  const seen = new Map<string, string>();
  for (const m of text.match(new RegExp(re.source, "gi")) ?? []) {
    const k = m.toLowerCase();
    if (!seen.has(k)) seen.set(k, m);
  }
  return [...seen.values()];
}

/** "40 mg", "2.5 ml": must come out before a review is sent. */
export const doseHits = (text: string) => uniqueHits(DOSE, text);
/** "blood pressure", "tablets": the moderator checks they describe the service. */
export const medicineWordHits = (text: string) => uniqueHits(MED_WORDS, text);
/** Both, in the order a moderator lists them. */
export const medicalHits = (text: string) => uniqueHits(new RegExp(`${MED_WORDS.source}|${DOSE.source}`, "gi"), text);
export const hasPhoneNumber = (text: string) => PHONE.test(text);

export type TextSegment = { text: string; mark: "number" | "medical" | null };

/** The review text with "[number removed]" and medical words marked, for the "sent back" view. */
export function reviewSegments(text: string): TextSegment[] {
  const re = new RegExp(`\\[number removed\\]|${MED_WORDS.source}|${DOSE.source}`, "gi");
  const out: TextSegment[] = [];
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), mark: null });
    out.push({ text: m[0], mark: m[0] === "[number removed]" ? "number" : "medical" });
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex += 1;
  }
  if (last < text.length) out.push({ text: text.slice(last), mark: null });
  return out;
}

export type DraftCheck = { tone: "warn" | "short" | "ok"; key: "dose" | "words" | "short" | "phone" | "ok"; dose: string[]; words: string[]; phone: boolean };

/** The live check under "Edit your review", as the prototype words it. */
export function checkDraft(text: string): DraftCheck {
  const dose = doseHits(text);
  const words = medicineWordHits(text);
  const phone = hasPhoneNumber(text);
  const short = text.trim().length < 40;
  if (dose.length) return { tone: "warn", key: "dose", dose, words, phone };
  if (words.length) return { tone: "warn", key: "words", dose, words, phone };
  if (short) return { tone: "short", key: "short", dose, words, phone };
  if (phone) return { tone: "warn", key: "phone", dose, words, phone };
  return { tone: "ok", key: "ok", dose, words, phone };
}

// ── The consent record in Hindi ────────────────────────────────────────────────

/** Translate a stored record line with [pattern, replacement] pairs; unknown lines stay English
 * (`translated: false`, so the page can mark them lang="en"). */
export function translateLine(text: string, patterns: readonly (readonly [string, string])[]): { text: string; translated: boolean } {
  for (const [pattern, replacement] of patterns) {
    const re = new RegExp(pattern);
    if (re.test(text)) return { text: text.replace(re, replacement), translated: true };
  }
  return { text, translated: false };
}
