// Top lists (Phase 2) and patient stories. Server-only, cached.
// Scores describe patient experience, not clinical quality; payment, sponsorship and claiming
// a profile have no effect (method: src/lib/ranking.ts).

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { Ownership } from "@prisma/client";

import { tags } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { OWNERSHIP_LABELS } from "@/lib/domain";
import { asStringArray, asSubScores } from "@/lib/json-types";
import { TOP_LIST_METHOD, TOP_LIST_MIN_REVIEWS } from "@/lib/ranking";

import { facilityFacts, sortFacilities } from "@/components/top-lists/format";

import { iso, toProviderLink, type ProviderLink } from "./mappers";

export type TopListCard = {
  slug: string;
  /** "10" in "Top 10" */
  countLabel: string;
  bandGroup: string;
  hubGroup: string;
  title: string;
  hubMeta: string;
  updatedAt: string;
  /** A filtered view of another list (the government list = hospitals, ownership Government). */
  sourceListSlug: string | null;
  presetOwnership: Ownership | null;
  entryCount: number;
};

/** The hub: every published list, in hub order. */
export async function getTopLists(): Promise<TopListCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.topLists);
  const rows = await db.topList.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { entries: true } } } });
  return rows.map((l) => ({
    slug: l.slug,
    countLabel: l.countLabel,
    bandGroup: l.bandGroup,
    hubGroup: l.hubGroup,
    title: l.title,
    hubMeta: l.hubMeta,
    updatedAt: l.listUpdatedAt.toISOString(),
    sourceListSlug: l.sourceListSlug,
    presetOwnership: l.presetOwnership,
    entryCount: l._count.entries,
  }));
}

export type TopListEntryDTO = {
  id: string;
  /** Position by score within the whole list (filters on the page re-number from 1). */
  rank: number;
  name: string;
  provider: ProviderLink | null;
  ownership: Ownership;
  ownershipLabel: string;
  typeLabel: string;
  meta: string;
  quote: string;
  score: number;
  reviewCount: number;
  subScores: { label: string; value: number; weightPct: number }[];
  localitySlug: string | null;
  hasStory: boolean;
  /** "▲ 1 since Sep" | "NEW" | "—" */
  movement: string;
};

export type TopListDetail = {
  slug: string;
  title: string;
  h1: string;
  crumb: string;
  intro: string;
  basis: string;
  updatedAt: string;
  badgeLabel: string;
  presetOwnership: Ownership | null;
  method: { label: string; weightPct: number; detail: string }[];
  minReviews: number;
  /** Category tabs: lists that have entries. */
  tabs: { slug: string; tabLabel: string }[];
  entries: TopListEntryDTO[];
};

/** /gurgaon/top/<list>. Entries are ordered by score; filter by ownership and locality on the page. */
export async function getTopList(slug: string): Promise<TopListDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.topList(slug), tags.topLists);
  const list = await db.topList.findUnique({ where: { slug } });
  if (!list || !list.published) return null;
  const sourceSlug = list.sourceListSlug ?? list.slug;
  const [entries, tabs] = await Promise.all([
    db.topListEntry.findMany({
      where: { listSlug: sourceSlug, ...(list.presetOwnership ? { ownership: list.presetOwnership } : {}) },
      include: { provider: { select: { slug: true, name: true, kind: true, status: true } } },
    }),
    db.topList.findMany({ where: { published: true, sourceListSlug: null, entries: { some: {} } }, orderBy: { sortOrder: "asc" }, select: { slug: true, tabLabel: true } }),
  ]);
  const ordered = entries.sort((a, b) => b.score - a.score || a.sortOrder - b.sortOrder);
  return {
    slug: list.slug,
    title: list.title,
    h1: list.h1,
    crumb: list.crumb,
    intro: list.intro,
    basis: list.basis,
    updatedAt: list.listUpdatedAt.toISOString(),
    badgeLabel: list.badgeLabel,
    presetOwnership: list.presetOwnership,
    method: TOP_LIST_METHOD.map((m) => ({ label: m.label, weightPct: Math.round(m.weight * 100), detail: m.detail })),
    minReviews: TOP_LIST_MIN_REVIEWS,
    tabs,
    entries: ordered.map((e, i) => {
      const sub = asSubScores(e.subScores);
      return {
        id: e.id,
        rank: i + 1,
        name: e.name,
        provider: e.provider && e.provider.status === "published" ? toProviderLink(e.provider) : null,
        ownership: e.ownership,
        ownershipLabel: OWNERSHIP_LABELS[e.ownership],
        typeLabel: e.typeLabel,
        meta: e.meta,
        quote: e.quote,
        score: e.score,
        reviewCount: e.reviewCount,
        subScores: TOP_LIST_METHOD.map((m, k) => ({ label: m.label, value: sub[k], weightPct: Math.round(m.weight * 100) })),
        localitySlug: e.localitySlug,
        hasStory: e.hasStory,
        movement: e.movement,
      };
    }),
  };
}

export async function listTopListSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.topLists);
  return (await db.topList.findMany({ where: { published: true }, select: { slug: true }, orderBy: { sortOrder: "asc" } })).map((l) => l.slug);
}

// ── Stories ─────────────────────────────────────────────────────────────────

export type StoryCard = {
  slug: string;
  title: string;
  /** "Son of a patient, Sector 49" */
  who: string;
  provider: ProviderLink | null;
  providerName: string;
  ownership: Ownership;
  ownershipLabel: string;
  category: string;
  duration: string;
  meta: string;
  transcript: string;
  format: string;
  checks: { consented: boolean; visitConfirmed: boolean; privacyEdited: boolean; notPaid: boolean };
  publishedAt: string | null;
};

/** /gurgaon/stories (filter by category on the page, or pass one). */
export async function getStories(opts: { category?: string | null; provider?: string | null; limit?: number } = {}): Promise<StoryCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.stories);
  const rows = await db.story.findMany({
    where: { status: "published", ...(opts.category ? { category: opts.category } : {}), ...(opts.provider ? { provider: { slug: opts.provider } } : {}) },
    include: { provider: { select: { slug: true, name: true, kind: true, status: true } } },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    take: opts.limit ?? 50,
  });
  return rows.map((s) => ({
    slug: s.slug,
    title: s.title,
    who: s.whoLabel,
    provider: s.provider && s.provider.status === "published" ? toProviderLink(s.provider) : null,
    providerName: s.providerName,
    ownership: s.ownership,
    ownershipLabel: OWNERSHIP_LABELS[s.ownership],
    category: s.category,
    duration: s.durationLabel,
    meta: s.meta,
    transcript: s.transcript,
    format: s.format,
    checks: { consented: s.consented, visitConfirmed: s.visitConfirmed, privacyEdited: s.privacyEdited, notPaid: s.notPaid },
    publishedAt: iso(s.publishedAt),
  }));
}

// ── Hospitals & care centres directory (/gurgaon/facilities) ─────────────────

export type FacilityCard = {
  provider: ProviderLink;
  name: string;
  ownership: Ownership;
  type: { slug: string; name: string };
  /** "Sector 10" (shown as "Sector 10, Gurugram"). */
  place: string | null;
  /** Up to three: "24×7 emergency", "300+ beds", the listing's own tags. */
  facts: string[];
  /** Only when the listing carries a "Facility checked" badge. */
  facilityCheckedAt: string | null;
};

export type FacilityCatalogue = {
  types: { slug: string; name: string; description: string | null }[];
  facilities: FacilityCard[];
  updatedAt: string | null;
};

/** Every published facility in a directory type, labelled by ownership and type, in the
 * prototype's order (government first). Filter and count on the page. */
export async function getFacilityCatalogue(): Promise<FacilityCatalogue> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.providers, tags.facilityTypes);
  const [types, rows] = await Promise.all([
    db.facilityType.findMany({ where: { inDirectory: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, description: true, sortOrder: true } }),
    db.provider.findMany({
      where: { status: "published", facilityType: { inDirectory: true } },
      select: {
        slug: true,
        name: true,
        kind: true,
        ownership: true,
        areaLabel: true,
        sector: true,
        sizeLabel: true,
        emergency: true,
        tags: true,
        badges: true,
        lastCheckedAt: true,
        facilityType: { select: { slug: true, name: true, sortOrder: true } },
      },
    }),
  ]);
  const sorted = sortFacilities(rows.map((r) => ({ ...r, typeOrder: r.facilityType?.sortOrder ?? 99 })));
  const facilities = sorted.map((r) => ({
    provider: toProviderLink(r),
    name: r.name,
    ownership: r.ownership,
    type: { slug: r.facilityType!.slug, name: r.facilityType!.name },
    place: r.sector ?? r.areaLabel ?? null,
    facts: facilityFacts({ emergency: r.emergency, sizeLabel: r.sizeLabel, tags: asStringArray(r.tags) }),
    facilityCheckedAt: asStringArray(r.badges).includes("Facility checked") ? iso(r.lastCheckedAt) : null,
  }));
  const latest = rows.reduce<Date | null>((m, r) => (r.lastCheckedAt && (!m || r.lastCheckedAt > m) ? r.lastCheckedAt : m), null);
  return { types: types.map(({ slug, name, description }) => ({ slug, name, description })), facilities, updatedAt: iso(latest) };
}

// ── Sponsored note on list pages ────────────────────────────────────────────

/** Announcements a sponsor bought for the list pages' "SPONSORED · NOT PART OF THIS RANKING" box
 * (the prototype's text; a sponsor without one is shown by name only). */
const SPONSOR_ANNOUNCEMENTS: Record<string, string> = {
  "aravali-multispeciality-hospital": "Featured: Aravali Hospital's paediatric OPD now open on Sundays.",
};

export type TopListSponsor = { provider: ProviderLink; announcement: string | null };

/** The sponsor shown beside (never inside) every ranking; null when nobody sponsors. */
export async function getTopListSponsor(): Promise<TopListSponsor | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.providers);
  const p = await db.provider.findFirst({ where: { status: "published", sponsored: true }, orderBy: { name: "asc" }, select: { slug: true, name: true, kind: true } });
  return p ? { provider: toProviderLink(p), announcement: SPONSOR_ANNOUNCEMENTS[p.slug] ?? null } : null;
}
