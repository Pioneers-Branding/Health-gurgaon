// Opening hours: parsing the way the site prints them ("10 am – 1 pm, 5 – 8 pm") and answering
// "is it open now?" in India time. Pure.
//
// Unknown hours are never assumed: isOpenAt() returns null when a provider has no checked hours,
// and the "Open now" filter treats null as not open.

import { istParts } from "./dates";
import type { OpeningHours, OpeningHoursDay } from "./json-types";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** 0 = Monday … 6 = Sunday, in India time. */
export function istWeekday(date: Date): number {
  return (istParts(date).weekday + 6) % 7;
}

export function istMinutes(date: Date): number {
  const p = istParts(date);
  return p.hour * 60 + p.minute;
}

const TIME_RE = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i;

function toMinutes(h: number, m: number, mer: string | undefined): number {
  let hour = h % 12;
  if (mer?.toLowerCase() === "pm") hour += 12;
  if (!mer && h === 24) hour = 24;
  return hour * 60 + m;
}

/** Parse one printed range: "10 am – 1 pm", "5 – 8 pm", "7 am – 8 pm", "noon – midnight". */
function parseRange(part: string): [number, number] | null {
  const pieces = part.split(/\s*[–—-]\s*|\s+to\s+/i).map((s) => s.trim().toLowerCase());
  if (pieces.length !== 2) return null;
  const word = (s: string) => (s === "noon" ? "12 pm" : s === "midnight" ? "12 am" : s);
  const a = word(pieces[0]).match(TIME_RE);
  const b = word(pieces[1]).match(TIME_RE);
  if (!a || !b) return null;
  const bMer = b[3];
  let end = toMinutes(+b[1], b[2] ? +b[2] : 0, bMer);
  if (end === 0) end = 1440; // "till midnight"
  let start = toMinutes(+a[1], a[2] ? +a[2] : 0, a[3] ?? bMer);
  if (!a[3] && start >= end) start = toMinutes(+a[1], a[2] ? +a[2] : 0, "am");
  return start < end ? [start, end] : null;
}

/** "10 am – 1 pm, 5 – 8 pm" → [[600, 780], [1020, 1200]]; "Closed" → []; "Open 24 hours" → [[0, 1440]]. */
export function parseHoursText(text: string): [number, number][] {
  const t = text.trim().toLowerCase();
  if (!t || t === "closed") return [];
  if (/24\s*hours|24h|24×7|24x7/.test(t)) return [[0, 1440]];
  return t
    .split(",")
    .map((p) => parseRange(p))
    .filter((r): r is [number, number] => !!r);
}

/** Build OpeningHours from printed text per day. Missing days are closed. */
export function weeklyHours(spec: Partial<Record<DayKey, string>>): OpeningHours {
  return DAY_KEYS.map((key, day): OpeningHoursDay => {
    const text = spec[key] ?? "Closed";
    return { day, text, ranges: parseHoursText(text) };
  });
}

/** Same hours every day. */
export function everyDay(text: string): OpeningHours {
  return weeklyHours({ mon: text, tue: text, wed: text, thu: text, fri: text, sat: text, sun: text });
}

/** True/false when hours are known, null when they aren't (never assume). */
export function isOpenAt(hours: OpeningHours | null, open24h: boolean, at: Date): boolean | null {
  if (open24h) return true;
  if (!hours || hours.length === 0) return null;
  const day = istWeekday(at);
  const minutes = istMinutes(at);
  const today = hours.find((d) => d.day === day);
  if (today?.ranges.some(([s, e]) => minutes >= s && minutes < e)) return true;
  // A range that runs past midnight is stored ending at 1440 and the next day starting at 0,
  // so no cross-day check is needed.
  return false;
}

export function formatMinutes(m: number): string {
  if (m === 0 || m === 1440) return "midnight";
  if (m === 720) return "noon";
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  const mer = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min ? `${h12}:${String(min).padStart(2, "0")} ${mer}` : `${h12} ${mer}`;
}

/** "Open now · Closes 8 pm today" style status for a profile. */
export function openStatus(
  hours: OpeningHours | null,
  open24h: boolean,
  at: Date,
): { state: "open" | "closed" | "unknown"; label: string; detail: string } {
  if (open24h) return { state: "open", label: "Open now", detail: "Open 24 hours" };
  const open = isOpenAt(hours, open24h, at);
  if (open === null || !hours) return { state: "unknown", label: "Hours not verified", detail: "Call to confirm" };
  const day = istWeekday(at);
  const minutes = istMinutes(at);
  const today = hours.find((d) => d.day === day);
  if (open && today) {
    const range = today.ranges.find(([s, e]) => minutes >= s && minutes < e)!;
    return { state: "open", label: "Open now", detail: range[1] >= 1440 ? "Open till midnight" : `Closes ${formatMinutes(range[1])} today` };
  }
  const later = today?.ranges.find(([s]) => s > minutes);
  if (later) return { state: "closed", label: "Closed now", detail: `Opens ${formatMinutes(later[0])} today` };
  for (let i = 1; i <= 7; i++) {
    const d = hours.find((x) => x.day === (day + i) % 7);
    if (d && d.ranges.length) {
      const when = i === 1 ? "tomorrow" : WEEKDAYS[(day + i) % 7];
      return { state: "closed", label: "Closed now", detail: `Opens ${formatMinutes(d.ranges[0][0])} ${when}` };
    }
  }
  return { state: "closed", label: "Closed now", detail: "" };
}

/** Rows for the timings table, with today's row flagged (the prototype highlights it). */
export function hoursTable(hours: OpeningHours, at: Date): { day: string; text: string; today: boolean }[] {
  const today = istWeekday(at);
  return hours.map((d) => ({ day: WEEKDAYS[d.day], text: d.text, today: d.day === today }));
}

/** The parts of openStatus(), for pages that word it themselves (Hindi):
 *   open24       open 24 hours
 *   closesToday  open now, closes at `minutes` today
 *   tillMidnight open now until midnight
 *   opensToday   closed now, opens at `minutes` today
 *   opensLater   closed now, opens at `minutes` in `inDays` days (1 = tomorrow) on weekday `day`
 *   closed       closed now, no opening in the coming week
 *   unknown      hours not verified (never assume) */
export type OpenStatusParts =
  | { state: "open"; kind: "open24" | "tillMidnight" }
  | { state: "open"; kind: "closesToday"; minutes: number }
  | { state: "closed"; kind: "opensToday"; minutes: number }
  | { state: "closed"; kind: "opensLater"; minutes: number; inDays: number; day: number }
  | { state: "closed"; kind: "closed" }
  | { state: "unknown"; kind: "unknown" };

export function openStatusParts(hours: OpeningHours | null, open24h: boolean, at: Date): OpenStatusParts {
  if (open24h) return { state: "open", kind: "open24" };
  const open = isOpenAt(hours, open24h, at);
  if (open === null || !hours) return { state: "unknown", kind: "unknown" };
  const day = istWeekday(at);
  const minutes = istMinutes(at);
  const today = hours.find((d) => d.day === day);
  if (open && today) {
    const range = today.ranges.find(([s, e]) => minutes >= s && minutes < e)!;
    return range[1] >= 1440 ? { state: "open", kind: "tillMidnight" } : { state: "open", kind: "closesToday", minutes: range[1] };
  }
  const later = today?.ranges.find(([s]) => s > minutes);
  if (later) return { state: "closed", kind: "opensToday", minutes: later[0] };
  for (let i = 1; i <= 7; i++) {
    const d = hours.find((x) => x.day === (day + i) % 7);
    if (d && d.ranges.length) return { state: "closed", kind: "opensLater", minutes: d.ranges[0][0], inDays: i, day: d.day };
  }
  return { state: "closed", kind: "closed" };
}
