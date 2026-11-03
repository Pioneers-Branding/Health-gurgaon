// Prisma rows → the plain objects pages receive. Server-only (imported by src/lib/data/*).
// Every DTO is JSON-safe: dates are ISO strings, Json columns are read through json-types.

import "server-only";

import type { Prisma } from "@prisma/client";

import { dayTile, daysBetween } from "@/lib/dates";
import { ARTICLE_LABEL_NAMES, EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, PROFILE_KIND_OF, topicLabel, type ProfileKind } from "@/lib/domain";
import { asObject, asOpeningHours, asStringArray, type HomeCollection } from "@/lib/json-types";
import { getLocality } from "@/lib/localities";
import { toSearchCard, type SearchCard, type SearchDoc } from "@/lib/search";

// ── Providers ───────────────────────────────────────────────────────────────

export const providerCardSelect = {
  id: true,
  slug: true,
  kind: true,
  name: true,
  initials: true,
  headline: true,
  specialtySlug: true,
  ownership: true,
  facilityTypeSlug: true,
  facilityType: { select: { name: true } },
  localitySlug: true,
  areaLabel: true,
  distanceKm: true,
  languages: true,
  consultationFee: true,
  feeVerified: true,
  openingHours: true,
  open24h: true,
  hoursSummary: true,
  wheelchairAccess: true,
  gender: true,
  homeVisits: true,
  homeCollection: true,
  delivery: true,
  badges: true,
  tags: true,
  keyFact: true,
  departments: true,
  services: true,
  keywords: true,
  lastCheckedAt: true,
  sponsored: true,
  sponsorLabel: true,
  sample: true,
} satisfies Prisma.ProviderSelect;

export type ProviderCardRow = Prisma.ProviderGetPayload<{ select: typeof providerCardSelect }>;

export function toSearchDoc(p: ProviderCardRow): SearchDoc {
  const departments = Array.isArray(p.departments)
    ? p.departments.map((d) => (d && typeof d === "object" && "name" in d ? String((d as { name: unknown }).name) : "")).filter(Boolean)
    : [];
  return {
    id: p.id,
    slug: p.slug,
    kind: p.kind,
    name: p.name,
    initials: p.initials,
    headline: p.headline,
    specialtySlug: p.specialtySlug,
    ownership: p.ownership,
    facilityTypeSlug: p.facilityTypeSlug,
    facilityTypeName: p.facilityType?.name ?? null,
    localitySlug: p.localitySlug,
    areaLabel: p.areaLabel,
    distanceKm: p.distanceKm,
    languages: asStringArray(p.languages),
    fee: p.consultationFee,
    feeVerified: p.feeVerified,
    openingHours: asOpeningHours(p.openingHours),
    open24h: p.open24h,
    hoursSummary: p.hoursSummary,
    wheelchair: p.wheelchairAccess,
    gender: p.gender,
    homeVisits: p.homeVisits,
    homeCollection: !!asObject<HomeCollection>(p.homeCollection),
    delivery: p.delivery,
    badge: asStringArray(p.badges)[0] ?? null,
    tags: asStringArray(p.tags),
    keyFact: p.keyFact,
    departments,
    services: asStringArray(p.services),
    keywords: p.keywords,
    lastCheckedAt: p.lastCheckedAt?.toISOString() ?? null,
    sponsored: p.sponsored,
    sponsorLabel: p.sponsorLabel,
    sample: p.sample,
  };
}

/** The provider card used on every list (search results, specialty pages, homepage…). */
export type ProviderCard = SearchCard;

export function toProviderCard(p: ProviderCardRow, now: Date): ProviderCard {
  return toSearchCard(toSearchDoc(p), now);
}

export type ProviderLink = { slug: string; name: string; kind: ProviderCardRow["kind"]; profileKind: ProfileKind };

export function toProviderLink(p: { slug: string; name: string; kind: ProviderCardRow["kind"] }): ProviderLink {
  return { slug: p.slug, name: p.name, kind: p.kind, profileKind: PROFILE_KIND_OF[p.kind] };
}

// ── Events ──────────────────────────────────────────────────────────────────

export const eventCardSelect = {
  slug: true,
  title: true,
  type: true,
  status: true,
  startsAt: true,
  endsAt: true,
  timeLabel: true,
  venue: true,
  localitySlug: true,
  isOnline: true,
  organiserName: true,
  organiserVerified: true,
  cost: true,
  isFree: true,
  audience: true,
  sample: true,
} satisfies Prisma.EventSelect;

export type EventCardRow = Prisma.EventGetPayload<{ select: typeof eventCardSelect }>;

export type EventCard = {
  slug: string;
  title: string;
  type: EventCardRow["type"];
  typeLabel: string;
  status: EventCardRow["status"];
  statusLabel: string;
  verified: boolean;
  startsAt: string;
  endsAt: string | null;
  /** Calendar tile: { dow: "SUN", day: "15", mon: "NOV", year: 2026 } (India time). */
  tile: { dow: string; day: string; mon: string; year: number };
  timeLabel: string;
  venue: string | null;
  localitySlug: string | null;
  /** "Online" for online events. */
  localityName: string | null;
  isOnline: boolean;
  organiserName: string;
  cost: string;
  isFree: boolean;
  audience: string[];
  sample: boolean;
};

export function toEventCard(e: EventCardRow): EventCard {
  return {
    slug: e.slug,
    title: e.title,
    type: e.type,
    typeLabel: EVENT_TYPE_LABELS[e.type].one,
    status: e.status,
    statusLabel: EVENT_STATUS_LABELS[e.status],
    verified: e.status === "verified" || (e.status === "completed" && e.organiserVerified),
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
    tile: dayTile(e.startsAt),
    timeLabel: e.timeLabel,
    venue: e.venue,
    localitySlug: e.localitySlug,
    localityName: e.isOnline ? "Online" : (getLocality(e.localitySlug)?.name ?? null),
    isOnline: e.isOnline,
    organiserName: e.organiserName,
    cost: e.cost,
    isFree: e.isFree,
    audience: asStringArray(e.audience),
    sample: e.sample,
  };
}

// ── Articles ────────────────────────────────────────────────────────────────

export const articleCardSelect = {
  slug: true,
  label: true,
  category: true,
  title: true,
  dek: true,
  sourceNote: true,
  sponsorName: true,
  publishedAt: true,
  sample: true,
} satisfies Prisma.ArticleSelect;

export type ArticleCardRow = Prisma.ArticleGetPayload<{ select: typeof articleCardSelect }>;

export type ArticleCard = {
  slug: string;
  label: ArticleCardRow["label"];
  labelName: string;
  category: string;
  title: string;
  dek: string;
  sourceNote: string;
  sponsorName: string | null;
  publishedAt: string;
  sample: boolean;
};

export function toArticleCard(a: ArticleCardRow): ArticleCard {
  return {
    slug: a.slug,
    label: a.label,
    labelName: ARTICLE_LABEL_NAMES[a.label],
    category: a.category,
    title: a.title,
    dek: a.dek,
    sourceNote: a.sourceNote,
    sponsorName: a.sponsorName,
    publishedAt: a.publishedAt.toISOString(),
    sample: a.sample,
  };
}

// ── Community ───────────────────────────────────────────────────────────────

export const threadCardSelect = {
  id: true,
  title: true,
  topicSlug: true,
  localitySlug: true,
  areaLabel: true,
  authorLabel: true,
  status: true,
  replyCount: true,
  helpfulCount: true,
  answeredBy: true,
  lastActivityAt: true,
  createdAt: true,
  sample: true,
  provider: { select: { slug: true, name: true, kind: true } },
} satisfies Prisma.ThreadSelect;

export type ThreadCardRow = Prisma.ThreadGetPayload<{ select: typeof threadCardSelect }>;

export type ThreadCard = {
  id: string;
  title: string;
  topic: { slug: string; label: string; labelHi: string };
  localitySlug: string | null;
  /** "Sector 65" */
  areaLabel: string | null;
  /** "a resident of Sector 65" */
  askedBy: string;
  status: ThreadCardRow["status"];
  /** Resolved | Pharmacist answered | Hospital answered | Unanswered | Open */
  statusLabel: string;
  replyCount: number;
  helpfulCount: number;
  createdAt: string;
  lastActivityAt: string;
  provider: ProviderLink | null;
  sample: boolean;
};

export function threadStatusLabel(t: { status: string; replyCount: number; answeredBy: string | null }): string {
  if (t.status === "resolved") return "Resolved";
  if (t.answeredBy) return `${t.answeredBy} answered`;
  if (t.replyCount === 0) return "Unanswered";
  return "Open";
}

export function toThreadCard(t: ThreadCardRow): ThreadCard {
  return {
    id: t.id,
    title: t.title,
    topic: { slug: t.topicSlug, label: topicLabel(t.topicSlug), labelHi: topicLabel(t.topicSlug, "hi") },
    localitySlug: t.localitySlug,
    areaLabel: t.areaLabel,
    askedBy: t.authorLabel,
    status: t.status,
    statusLabel: threadStatusLabel(t),
    replyCount: t.replyCount,
    helpfulCount: t.helpfulCount,
    createdAt: t.createdAt.toISOString(),
    lastActivityAt: t.lastActivityAt.toISOString(),
    provider: t.provider ? toProviderLink(t.provider) : null,
    sample: t.sample,
  };
}

// ── Small helpers ───────────────────────────────────────────────────────────

export function daysAgo(date: Date | null | undefined, now: Date): number | null {
  return date ? Math.max(0, daysBetween(date, now)) : null;
}

export function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
