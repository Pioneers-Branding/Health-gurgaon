// Pure helpers for the admin pages: links with the queue's own query, time stamps in India
// time, SLA labels. Safe in Server and Client Components (no server imports).

import { istParts } from "@/lib/dates";
import { hoursOrDays, slaState } from "@/lib/data/admin-format";
import type { Lang } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { routes, type AdminQueue } from "@/lib/routes";

const MON_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
const MON_HI = ["जन.", "फ़र.", "मार्च", "अप्रै.", "मई", "जून", "जुला.", "अग.", "सितं.", "अक्टू.", "नवं.", "दिसं."] as const;

/** /admin/<queue> with its own query (filter, item, q, status, page, before, listing). The shared
 * route builder takes no query for admin queues, so it is added here. */
export function adminHref(lang: Lang, queue: AdminQueue, query: Record<string, string | number | null | undefined> = {}, hash?: string): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const qs = sp.toString();
  return `${routes.adminQueue(lang, queue)}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}

/** "16 OCT, 10:12" (the prototype's queue stamps; Hindi "16 अक्टू., 10:12"). India time. */
export function stamp(lang: Lang, isoString: string, opts: { comma?: boolean; year?: boolean } = {}): string {
  const p = istParts(new Date(isoString));
  const mon = lang === "hi" ? MON_HI[p.month - 1] : MON_SHORT[p.month - 1];
  const time = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  return `${p.day} ${mon}${opts.year ? ` ${p.year}` : ""}${opts.comma === false ? " " : ", "}${time}`;
}

/** "16 OCT 2026" (no time). */
export function dayStamp(lang: Lang, isoString: string): string {
  const p = istParts(new Date(isoString));
  return `${p.day} ${lang === "hi" ? MON_HI[p.month - 1] : MON_SHORT[p.month - 1]} ${p.year}`;
}

type SlaStrings = { done: string; due: string; left: string; overdue: string; h: string; d: string };

/** "DUE IN 2H" · "14H LEFT" · "OVERDUE 3D" · "DONE". */
export function slaText(t: SlaStrings, open: boolean, hoursLeft: number): { text: string; urgent: boolean } {
  const s = slaState(open, hoursLeft);
  if (s.kind === "done") return { text: t.done, urgent: false };
  if (s.kind === "due") return { text: fmt(t.due, { n: s.hours }), urgent: true };
  const hd = hoursOrDays(s.hours);
  const u = hd.unit === "h" ? t.h : t.d;
  return s.kind === "overdue" ? { text: fmt(t.overdue, { n: hd.n, u }), urgent: true } : { text: fmt(t.left, { n: hd.n, u }), urgent: false };
}

/** "48h" / "5d" for the OLDEST tile; "5.2h" for the median. */
export function ageText(t: { hours: string; days: string }, hours: number): string {
  const hd = hoursOrDays(hours);
  return fmt(hd.unit === "h" ? t.hours : t.days, { n: hd.n });
}

export const isOpenStatus = (s: string) => s === "waiting" || s === "escalated" || s === "info_requested";

/** Status pill colours (the prototype's stStyle). */
export const STATUS_PILL: Record<string, string> = {
  waiting: "bg-pending-tint text-pending",
  approved: "bg-success-tint text-success",
  rejected: "bg-emergency-tint text-emergency",
  info_requested: "bg-gov-tint text-gov",
  escalated: "bg-ink text-saffron",
};
