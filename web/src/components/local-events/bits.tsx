// Small pieces shared by the locality and event pages (Server Components and server-side
// formatting). Copy comes in as `t` (localEventsStrings(lang)).

import { cn } from "@/components/ui/cn";
import { formatDateLabel, istParts } from "@/lib/dates";
import type { EventCard } from "@/lib/data/events";
import { formatDate, type Lang } from "@/lib/i18n";
import type { LocalEventsStrings } from "@/lib/i18n/areas/local-events";

/** "14 OCT 2026" (mono labels) or "14 अक्तूबर 2026". */
export function stampDate(lang: Lang, isoTime: string): string {
  return lang === "hi" ? formatDate("hi", isoTime, "short") : formatDateLabel(new Date(isoTime));
}

/** "14 Oct" (no year): "Submitted … on 14 Oct", "LAST UPDATED 14 OCT". */
export function dayMonth(lang: Lang, t: LocalEventsStrings, isoTime: string): string {
  const p = istParts(new Date(isoTime));
  return lang === "hi" ? `${p.day} ${t.months[p.month - 1]}` : `${p.day} ${t.monthsTitle[p.month - 1]}`;
}

/** Calendar tile parts in the page language: { dow: "SUN", day: "15", mon: "NOV" }. */
export function tileParts(lang: Lang, t: LocalEventsStrings, e: Pick<EventCard, "startsAt" | "tile">): { dow: string; day: string; mon: string } {
  if (lang !== "hi") return { dow: e.tile.dow, day: e.tile.day, mon: e.tile.mon };
  const p = istParts(new Date(e.startsAt));
  return { dow: t.weekdaysShort[p.weekday], day: e.tile.day, mon: t.monthsShort[p.month - 1] };
}

/** "Sunday 15 Nov 2026" / "रविवार, 15 नवंबर 2026". */
export function longDay(lang: Lang, t: LocalEventsStrings, isoTime: string): string {
  const p = istParts(new Date(isoTime));
  return lang === "hi" ? `${t.weekdays[p.weekday]}, ${p.day} ${t.months[p.month - 1]} ${p.year}` : `${t.weekdays[p.weekday]} ${p.day} ${t.monthsTitle[p.month - 1]} ${p.year}`;
}

export type EventStatusKind = "verified" | "awaiting" | "cancelled" | "completed";

export function eventStatusKind(e: Pick<EventCard, "status" | "verified">): EventStatusKind {
  if (e.status === "cancelled") return "cancelled";
  if (e.status === "completed") return "completed";
  return e.verified ? "verified" : "awaiting";
}

/** ✓ Verified (green) · Awaiting review (dashed amber) · Cancelled · Took place. */
export function EventStatusPill({ kind, label, size = "sm", className }: { kind: EventStatusKind; label: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center self-start rounded-pill leading-tight font-semibold whitespace-nowrap",
        size === "md" ? "px-2.75 py-1 text-12" : "px-2.25 py-0.75 text-11.5",
        kind === "verified" && "bg-success-tint text-success",
        kind === "awaiting" && "border border-dashed border-sponsored bg-pending-tint text-pending",
        kind === "cancelled" && "border border-caution bg-white text-caution",
        kind === "completed" && "bg-stone text-muted",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function statusLabel(t: LocalEventsStrings, kind: EventStatusKind): string {
  return kind === "verified" ? t.status.verified : kind === "awaiting" ? t.status.awaiting : kind === "cancelled" ? t.status.cancelled : t.status.completed;
}
