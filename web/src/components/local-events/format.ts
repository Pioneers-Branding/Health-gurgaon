// Pure helpers for localities and events (no React, no server code): safe in Client Components
// and covered by tests/unit/local-events.test.ts.

import type { Lang } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";

/** "{n} doctors" / "1 doctor": picks the template by count and fills {n}. */
export function plural(n: number, one: string, many: string): string {
  return (n === 1 ? one : many).replaceAll("{n}", String(n));
}

/** Fill {placeholders}. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

// ── Event filters in the URL ─────────────────────────────────────────────────

export type EventFilters = {
  /** Event type ("health_camp"), null for all. */
  type: string | null;
  /** Locality slug, "online", or null for all. */
  locality: string | null;
  free: boolean;
  verified: boolean;
  /** "2026-11", or null for the default month. */
  month: string | null;
  /** Day of the month, or null for every date. */
  day: number | null;
};

type RawParams = Record<string, string | string[] | undefined>;

function one(raw: RawParams, key: string): string | null {
  const v = raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
}

const on = (v: string | null) => v === "1" || v === "true" || v === "on";

/** "2026-11" → { year: 2026, month: 11 } (null for anything else). */
export function parseMonth(value: string | null | undefined): { year: number; month: number } | null {
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = +m[1];
  const month = +m[2];
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12 ? { year, month } : null;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** The month `delta` months away. */
export function shiftMonth(m: { year: number; month: number }, delta: number): { year: number; month: number } {
  const index = m.year * 12 + (m.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Whole months from a to b (b later → positive). */
export function monthsBetween(a: { year: number; month: number }, b: { year: number; month: number }): number {
  return b.year * 12 + b.month - (a.year * 12 + a.month);
}

/** The calendar's URL parameters, with anything unknown dropped. `types` and `localities` are the
 * accepted values. */
export function parseEventFilters(raw: RawParams, accept: { types: readonly string[]; localities: readonly string[] }): EventFilters {
  const type = one(raw, "type");
  const locality = one(raw, "locality");
  const month = one(raw, "month");
  const dayRaw = one(raw, "day");
  const day = dayRaw && /^\d{1,2}$/.test(dayRaw) && +dayRaw >= 1 && +dayRaw <= 31 ? +dayRaw : null;
  return {
    type: type && accept.types.includes(type) ? type : null,
    locality: locality && (locality === "online" || accept.localities.includes(locality)) ? locality : null,
    free: on(one(raw, "free")),
    verified: on(one(raw, "verified")),
    month: parseMonth(month) ? month : null,
    day,
  };
}

/** /gurgaon/events with these filters (empty ones dropped). */
export function eventsHref(lang: Lang, f: Partial<EventFilters>): string {
  const query = {
    type: f.type ?? undefined,
    locality: f.locality ?? undefined,
    free: f.free || undefined,
    verified: f.verified || undefined,
    month: f.month ?? undefined,
    day: f.day ?? undefined,
  };
  return routes.events(lang, query);
}

export type FilterableEvent = { type: string; localitySlug: string | null; isOnline: boolean; isFree: boolean; verified: boolean };

/** The calendar's filters (type, locality or online, free only, verified only). */
export function filterEvents<T extends FilterableEvent>(list: T[], f: Pick<EventFilters, "type" | "locality" | "free" | "verified">): T[] {
  return list.filter(
    (e) =>
      (!f.type || e.type === f.type) &&
      (!f.locality || (f.locality === "online" ? e.isOnline : e.localitySlug === f.locality)) &&
      (!f.free || e.isFree) &&
      (!f.verified || e.verified),
  );
}

// ── Submitting an event ──────────────────────────────────────────────────────

/** URL-safe slug from a title: "Free eye check-up camp!" → "free-eye-check-up-camp" (at most 60
 * characters, cut at a hyphen). Empty for titles without Latin letters or digits. */
export function slugBase(title: string): string {
  const s = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length <= 60) return s;
  const cut = s.slice(0, 60);
  const at = cut.lastIndexOf("-");
  return (at > 20 ? cut.slice(0, at) : cut).replace(/-+$/, "");
}

/** The new event's slug: title words plus the reference number ("free-eye-check-up-camp-5191"). */
export function eventSlug(title: string, ref: string): string {
  const digits = ref.replace(/\D/g, "") || "0";
  return `${slugBase(title) || "event"}-${digits}`;
}

/** "09:30" → "9:30 am", "12:00" → "12 pm", "18:00" → "6 pm" (the calendar's time style). */
export function clockLabel(hhmm: string): string {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm;
  const h = +m[1];
  const min = +m[2];
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${min ? `:${String(min).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
}

/** What it costs: "Free", or the amount as typed ("₹200"; bare digits get the rupee sign), or "Paid". */
export function costLabel(cost: "Free" | "Paid", amount?: string | null): { cost: string; isFree: boolean } {
  if (cost === "Free") return { cost: "Free", isFree: true };
  const a = (amount ?? "").trim();
  if (!a) return { cost: "Paid", isFree: false };
  if (/^\d[\d,]*$/.test(a)) return { cost: `₹${a}`, isFree: false };
  if (/^(rs\.?|inr)\s*\d/i.test(a)) return { cost: `₹${a.replace(/^(rs\.?|inr)\s*/i, "")}`, isFree: false };
  return { cost: a, isFree: false };
}

/** Is a typed locality an online event? ("Online", "online / Zoom") */
export function isOnlineText(text: string): boolean {
  return /\bonline\b|\bzoom\b|\bgoogle meet\b|\bwebinar\b|ऑनलाइन/i.test(text);
}

// ── Times in Hindi ───────────────────────────────────────────────────────────

const PERIOD_HI = (h24: number) => (h24 >= 4 && h24 < 12 ? "सुबह" : h24 >= 12 && h24 < 16 ? "दोपहर" : h24 >= 16 && h24 < 19 ? "शाम" : "रात");

/** "9 am–1 pm" → "सुबह 9 – दोपहर 1 बजे", "6 pm" → "शाम 6 बजे", "7–8:30 am" → "सुबह 7 – 8:30 बजे".
 * Anything it can't read comes back unchanged. */
export function timeLabelHi(label: string): string {
  const parts = label.split(/\s*[–-]\s*/);
  if (parts.length < 1 || parts.length > 2) return label;
  const parsed = parts.map((p) => p.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i));
  if (parsed.some((p) => !p)) return label;
  const ms = parsed as RegExpMatchArray[];
  // "7–8:30 am": a part without am/pm takes the next part's.
  const ampm = ms.map((m, i) => (m[3] ?? ms[i + 1]?.[3] ?? "").toLowerCase());
  if (ampm.some((a) => !a)) return label;
  const items = ms.map((m, i) => {
    const h = +m[1];
    const h24 = ampm[i] === "pm" ? (h % 12) + 12 : h % 12;
    return { text: `${h}${m[2] ? `:${m[2]}` : ""}`, period: PERIOD_HI(h24) };
  });
  if (items.length === 1) return `${items[0].period} ${items[0].text} बजे`;
  const second = items[1].period === items[0].period ? items[1].text : `${items[1].period} ${items[1].text}`;
  return `${items[0].period} ${items[0].text} – ${second} बजे`;
}

/** An event's time in the page language: "9 am–1 pm" as stored (cards), "9 am – 1 pm" with
 * `spaced` (event pages), or the Hindi form. */
export function timeText(lang: Lang, label: string, spaced = false): string {
  if (lang === "hi") return timeLabelHi(label);
  return spaced ? label.replace(/\s*–\s*/g, " – ") : label;
}

// ── Organiser tile, calendar file, WhatsApp ─────────────────────────────────

/** The organiser's square tile: a society number ("57" for "Sector 57 RWA") or initials. */
export function organiserTile(name: string, societyShortName?: string | null): string {
  const n = (societyShortName ?? "").match(/\d+/)?.[0];
  if (n) return n;
  const words = name
    .replace(/\(.*?\)/g, "")
    .split(/[\s,]+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(the|of|and|with|for|a|an)$/i.test(w));
  return (words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || name.slice(0, 2)).slice(0, 2);
}

function icsDate(isoTime: string): string {
  return new Date(isoTime).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** A calendar file (.ics) for one event. Nothing is sent to us: the file is made on the page.
 * Events without an end time get two hours. */
export function icsFile(e: { uid: string; title: string; startsAt: string; endsAt: string | null; location: string | null; url: string }): string {
  const end = e.endsAt ?? new Date(new Date(e.startsAt).getTime() + 2 * 3_600_000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HealthGurgaon//Events//EN",
    "BEGIN:VEVENT",
    `UID:${e.uid}@healthgurgaon.in`,
    `DTSTAMP:${icsDate(e.startsAt)}`,
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(e.title)}`,
    e.location ? `LOCATION:${icsText(e.location)}` : "",
    `URL:${e.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function icsHref(e: Parameters<typeof icsFile>[0]): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsFile(e))}`;
}

/** WhatsApp's share link with the text filled in (we never see who it goes to). */
export function whatsappHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Road-name localities read "on" ("Healthcare on Sohna Road"); sectors and areas read "in". */
export function isRoadLocality(name: string): boolean {
  return /\b(road|rd|expressway|highway)\b/i.test(name);
}
