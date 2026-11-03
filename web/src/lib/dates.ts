// Dates in India Standard Time (UTC+05:30, no daylight saving). Pure.
// The database stores UTC instants; everything residents see is IST.

export const IST_TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET_MINUTES = 330;
const DAY_MS = 86_400_000;

const MON_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
const MON_TITLE = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DOW_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const DOW_TITLE = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** The UTC instant of an IST wall-clock time. Months are 1-based. */
export function istDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MINUTES * 60_000);
}

/** Parse "2026-11-15" or "2026-11-15 09:00" as IST wall-clock time. */
export function parseIst(value: string): Date {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
  if (!m) throw new Error(`Not an IST date: ${value}`);
  return istDate(+m[1], +m[2], +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}

/** IST calendar fields of an instant. `weekday` 0 = Sunday (JS convention). */
export function istParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } {
  const t = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
    weekday: t.getUTCDay(),
  };
}

/** "2026-10-16" (IST calendar day). */
export function istDay(date: Date): string {
  const p = istParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Whole IST calendar days from `from` to `to` (0 = same day). */
export function daysBetween(from: Date, to: Date): number {
  const a = parseIst(istDay(from)).getTime();
  const b = parseIst(istDay(to)).getTime();
  return Math.round((b - a) / DAY_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** "12 OCT 2026": the small mono labels ("LAST CHECKED 12 OCT 2026"). */
export function formatDateLabel(date: Date): string {
  const p = istParts(date);
  return `${p.day} ${MON_SHORT[p.month - 1]} ${p.year}`;
}

/** "12 Oct 2026". With lang "hi" uses Intl (hi-IN). */
export function formatDate(date: Date, lang: "en" | "hi" = "en"): string {
  if (lang === "hi") {
    return new Intl.DateTimeFormat("hi-IN", { timeZone: IST_TIMEZONE, day: "numeric", month: "short", year: "numeric" }).format(date);
  }
  const p = istParts(date);
  return `${p.day} ${MON_TITLE[p.month - 1]} ${p.year}`;
}

/** "Sunday 15 Nov 2026". */
export function formatLongDay(date: Date): string {
  const p = istParts(date);
  return `${DOW_TITLE[p.weekday]} ${p.day} ${MON_TITLE[p.month - 1]} ${p.year}`;
}

/** "SEP 2026". */
export function formatMonthLabel(date: Date): string {
  const p = istParts(date);
  return `${MON_SHORT[p.month - 1]} ${p.year}`;
}

/** Calendar tile parts: { dow: "SUN", day: "15", mon: "NOV", year: 2026 }. Days under 10 are
 * zero-padded like the prototype ("09"). */
export function dayTile(date: Date): { dow: string; day: string; mon: string; year: number } {
  const p = istParts(date);
  return { dow: DOW_SHORT[p.weekday], day: String(p.day).padStart(2, "0"), mon: MON_SHORT[p.month - 1], year: p.year };
}

/** "TODAY", "1 DAY AGO", "4 DAYS AGO": the "CHECKED …" label on result cards. */
export function checkedAgoLabel(days: number): string {
  if (days <= 0) return "TODAY";
  return days === 1 ? "1 DAY AGO" : `${days} DAYS AGO`;
}

/** "Checked 6 days ago" (sentence case, locality page lists). */
export function checkedAgoSentence(days: number): string {
  if (days <= 0) return "Checked today";
  return days === 1 ? "Checked 1 day ago" : `Checked ${days} days ago`;
}

/** "40 min ago", "5 hours ago", "3 days ago", "2 weeks ago". */
export function timeAgo(date: Date, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return days === 1 ? "1 day ago" : `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (days < 60) return `${weeks} weeks ago`;
  return formatDate(date);
}

/** `days` working days (Monday–Friday, IST) after `date`, at the same time of day. Public
 * holidays aren't counted. Mon 26 Oct + 3 → Thu 29 Oct; Fri 16 Oct + 3 → Wed 21 Oct. */
export function addWorkingDays(date: Date, days: number): Date {
  let out = date;
  let left = Math.max(0, Math.floor(days));
  while (left > 0) {
    out = addDays(out, 1);
    const weekday = istParts(out).weekday;
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return out;
}

/** "Thu 29 Oct" (the account page's short dates). With `year`: "Mon 26 Oct 2026". */
export function formatShortDay(date: Date, opts: { year?: boolean } = {}): string {
  const p = istParts(date);
  return `${DOW_TITLE[p.weekday].slice(0, 3)} ${p.day} ${MON_TITLE[p.month - 1]}${opts.year ? ` ${p.year}` : ""}`;
}

/** "8:14 pm", "11 am". */
export function formatTime(date: Date): string {
  const p = istParts(date);
  const h = p.hour % 12 || 12;
  const suffix = p.hour >= 12 ? "pm" : "am";
  return p.minute ? `${h}:${String(p.minute).padStart(2, "0")} ${suffix}` : `${h} ${suffix}`;
}

/** "14 OCT 2026, 11:02 AM": the consent record's time stamps. */
export function formatStamp(date: Date): string {
  const p = istParts(date);
  const h = p.hour % 12 || 12;
  return `${formatDateLabel(date)}, ${h}:${String(p.minute).padStart(2, "0")} ${p.hour >= 12 ? "PM" : "AM"}`;
}

/** ISO string or null, for DTOs. */
export function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
