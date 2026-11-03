// Health camps and events. Server-only, cached.
// Public statuses: verified and awaiting review (clearly labelled), plus cancelled and completed
// on detail pages. "Changes requested" and rejected events are never shown publicly. Organiser contact details never leave here.

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { EventType } from "@prisma/client";

import { tags } from "@/lib/cache-tags";
import { formatLongDay, istDate, istParts } from "@/lib/dates";
import { db } from "@/lib/db";
import { ORGANISER_TYPE_LABELS, PUBLIC_EVENT_STATUSES } from "@/lib/domain";
import { asStringArray } from "@/lib/json-types";

import { eventCardSelect, iso, toEventCard, type EventCard } from "./mappers";

export type { EventCard };

export type EventFilter = {
  locality?: string | null;
  type?: EventType | null;
  freeOnly?: boolean;
  verifiedOnly?: boolean;
  limit?: number;
};

function startOfTodayIst(now: Date): Date {
  const p = istParts(now);
  return istDate(p.year, p.month, p.day);
}

/** Upcoming events (from today, India time), soonest first. "Online" events have locality null;
 * pass locality "online" to get only them. */
export async function getUpcomingEvents(filter: EventFilter = {}): Promise<EventCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.events);
  const now = new Date();
  const rows = await db.event.findMany({
    where: {
      status: filter.verifiedOnly ? "verified" : { in: ["verified", "awaiting_review"] },
      startsAt: { gte: startOfTodayIst(now) },
      ...(filter.locality === "online" ? { isOnline: true } : filter.locality ? { localitySlug: filter.locality } : {}),
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.freeOnly ? { isFree: true } : {}),
    },
    select: eventCardSelect,
    orderBy: [{ startsAt: "asc" }, { title: "asc" }],
    take: filter.limit ?? 100,
  });
  return rows.map(toEventCard);
}

export type CalendarMonth = {
  year: number;
  month: number;
  /** "November 2026" */
  label: string;
  /** Weekday of the 1st, 0 = Sunday (the calendar starts on Sunday). */
  firstWeekday: number;
  daysInMonth: number;
  days: { day: number; events: EventCard[]; hasVerified: boolean }[];
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** One month of the events calendar (verified and awaiting review). Filter the result on the page. */
export async function getEventMonth(year: number, month: number): Promise<CalendarMonth> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.events);
  const start = istDate(year, month, 1);
  const end = month === 12 ? istDate(year + 1, 1, 1) : istDate(year, month + 1, 1);
  const rows = await db.event.findMany({
    where: { status: { in: ["verified", "awaiting_review", "cancelled"] }, startsAt: { gte: start, lt: end } },
    select: eventCardSelect,
    orderBy: [{ startsAt: "asc" }, { title: "asc" }],
  });
  const cards = rows.map(toEventCard);
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return {
    year,
    month,
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    firstWeekday: istParts(start).weekday,
    daysInMonth,
    days: Array.from({ length: daysInMonth }, (_, i) => {
      const events = cards.filter((c) => istParts(new Date(c.startsAt)).day === i + 1);
      return { day: i + 1, events, hasVerified: events.some((e) => e.verified) };
    }),
  };
}

/** The calendar's opening month: the month of the next upcoming event (India time), or this month
 * when nothing is coming up. Computed when the cache fills, so pages don't need "now". */
export async function getDefaultEventMonth(): Promise<{ year: number; month: number }> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.events);
  const now = new Date();
  const next = await db.event.findFirst({
    where: { status: { in: ["verified", "awaiting_review"] }, startsAt: { gte: startOfTodayIst(now) } },
    orderBy: { startsAt: "asc" },
    select: { startsAt: true },
  });
  const p = istParts(next?.startsAt ?? now);
  return { year: p.year, month: p.month };
}

export type EventDetail = EventCard & {
  template: string | null;
  description: string | null;
  bring: string | null;
  organiserType: string;
  organiserTypeLabel: string;
  organiserVerified: boolean;
  organiserNote: string | null;
  society: { slug: string; name: string; shortName: string; badgeText: string; verified: boolean } | null;
  /** "Sunday 15 Nov 2026 · 9 am – 1 pm" */
  whenLabel: string;
  eligibility: string | null;
  registration: string | null;
  capacity: number | null;
  services: string[];
  /** How it was verified: "Called organiser (RWA secretary) on 14 Oct 2026". */
  source: string | null;
  verifiedAt: string | null;
  submittedAt: string | null;
  updatedAt: string;
  reportSummary: string | null;
};

/** /gurgaon/events/<slug>. Null for unknown or rejected events. */
export async function getEvent(slug: string): Promise<EventDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.event(slug), tags.events);
  const e = await db.event.findUnique({
    where: { slug },
    select: {
      ...eventCardSelect,
      template: true,
      description: true,
      bring: true,
      organiserType: true,
      organiserNote: true,
      eligibility: true,
      registration: true,
      capacity: true,
      services: true,
      source: true,
      verifiedAt: true,
      submittedAt: true,
      updatedAt: true,
      reportSummary: true,
      society: { select: { slug: true, name: true, shortName: true, badgeText: true, status: true } },
    },
  });
  if (!e || !(PUBLIC_EVENT_STATUSES as readonly string[]).includes(e.status)) return null;
  return {
    ...toEventCard(e),
    template: e.template,
    description: e.description,
    bring: e.bring,
    organiserType: e.organiserType,
    organiserTypeLabel: ORGANISER_TYPE_LABELS[e.organiserType],
    organiserVerified: e.organiserVerified,
    organiserNote: e.organiserNote,
    society: e.society ? { slug: e.society.slug, name: e.society.name, shortName: e.society.shortName, badgeText: e.society.badgeText, verified: e.society.status === "verified" } : null,
    whenLabel: `${formatLongDay(e.startsAt)} · ${e.timeLabel.replace(/–/g, " – ")}`,
    eligibility: e.eligibility,
    registration: e.registration,
    capacity: e.capacity,
    services: asStringArray(e.services),
    source: e.source,
    verifiedAt: iso(e.verifiedAt),
    submittedAt: iso(e.submittedAt),
    updatedAt: e.updatedAt.toISOString(),
    reportSummary: e.reportSummary,
  };
}

/** Slugs for generateStaticParams on /gurgaon/events/[slug]. */
export async function listEventSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.events);
  const rows = await db.event.findMany({ where: { status: { in: [...PUBLIC_EVENT_STATUSES] } }, select: { slug: true }, orderBy: { startsAt: "desc" } });
  return rows.map((r) => r.slug);
}

/** WhatsApp share text, as the prototype's preview ("Verified by HealthGurgaon"). */
export function eventShareText(e: Pick<EventDetail, "title" | "tile" | "timeLabel" | "venue" | "verified">, url: string): string {
  const day = `${e.tile.dow[0]}${e.tile.dow.slice(1).toLowerCase()} ${Number(e.tile.day)} ${e.tile.mon[0]}${e.tile.mon.slice(1).toLowerCase()}`;
  return [e.title, `${day}, ${e.timeLabel}${e.venue ? ` · ${e.venue.split(",")[0]}` : ""}`, e.verified ? "Verified by HealthGurgaon" : "Awaiting review on HealthGurgaon", url].join("\n");
}
