// Localities: the index (map + list with coverage) and locality pages. Server-only, cached.
// Coverage numbers come from the Locality.stats snapshot (verified listings, maintained by
// editors; sample values from the prototype). A page is "live" (published and indexable) only
// with at least LOCALITY_MIN_LISTINGS verified listings; others are noindex.

import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { tags } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { asObject, type LocalityStats } from "@/lib/json-types";
import { LOCALITIES, LOCALITY_MIN_LISTINGS, getLocality, type Locality } from "@/lib/localities";

import { getUpcomingEvents } from "./events";
import { iso, providerCardSelect, threadCardSelect, toProviderCard, toThreadCard, type EventCard, type ProviderCard, type ThreadCard } from "./mappers";
import { getFeaturedProviders, type FeaturedProviderCard } from "./providers";

export type LocalityCoverage = {
  doctors: number;
  careFacilities: number;
  pharmaciesLabs: number;
  /** Verified listings in all (doctors + clinics & hospitals + pharmacies & labs). */
  total: number;
  upcomingEvents: number;
  extra: string | null;
  checkedAt: string | null;
};

export type LocalitySummary = Locality & {
  coverage: LocalityCoverage;
  /** Listings still needed before the page goes live (0 when live). */
  listingsNeeded: number;
  description: string | null;
  editorLabel: string | null;
  pageUpdatedAt: string | null;
};

async function loadLocalities(): Promise<{ list: LocalitySummary[]; listCheckedAt: string | null }> {
  const [rows, events] = await Promise.all([db.locality.findMany({ orderBy: { sortOrder: "asc" } }), getUpcomingEvents()]);
  const list = LOCALITIES.map((L) => {
    const row = rows.find((r) => r.slug === L.slug);
    const stats = asObject<LocalityStats>(row?.stats) ?? { doctors: 0, careFacilities: 0, pharmaciesLabs: 0 };
    const total = stats.doctors + stats.careFacilities + stats.pharmaciesLabs;
    const live = row?.live ?? L.live;
    return {
      ...L,
      live,
      coverage: {
        doctors: stats.doctors,
        careFacilities: stats.careFacilities,
        pharmaciesLabs: stats.pharmaciesLabs,
        total,
        upcomingEvents: events.filter((e) => e.localitySlug === L.slug).length,
        extra: stats.extra ?? null,
        checkedAt: iso(row?.statsCheckedAt),
      },
      listingsNeeded: live ? 0 : Math.max(0, LOCALITY_MIN_LISTINGS - total),
      description: row?.description ?? null,
      editorLabel: row?.editorLabel ?? null,
      pageUpdatedAt: iso(row?.pageUpdatedAt),
    };
  });
  const checked = rows.map((r) => r.statsCheckedAt?.getTime() ?? 0).filter(Boolean);
  return { list, listCheckedAt: checked.length ? new Date(Math.max(...checked)).toISOString() : null };
}

/** /gurgaon/localities: every locality with coverage ("9 LOCALITIES · 5 PAGES LIVE · LIST CHECKED 15 OCT 2026"). */
export async function getLocalityIndex(): Promise<{ localities: LocalitySummary[]; liveCount: number; listCheckedAt: string | null; minListings: number }> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.localities, tags.events);
  const { list, listCheckedAt } = await loadLocalities();
  return { localities: list, liveCount: list.filter((l) => l.live).length, listCheckedAt, minListings: LOCALITY_MIN_LISTINGS };
}

export const LOCALITY_CATEGORIES = [
  { key: "clinics", label: "Clinics" },
  { key: "labs", label: "Labs" },
  { key: "chemists", label: "Chemists" },
  { key: "home_care", label: "Home care" },
  { key: "physio", label: "Physio" },
  { key: "hospitals", label: "Hospitals" },
] as const;
export type LocalityCategoryKey = (typeof LOCALITY_CATEGORIES)[number]["key"];

export type LocalityPage = {
  locality: LocalitySummary;
  /** Indexable only when live (the plan: "only indexed when content is sufficient"). */
  indexable: boolean;
  categories: { key: LocalityCategoryKey; label: string; count: number; providers: (ProviderCard & { line: string })[] }[];
  featuredHospitals: FeaturedProviderCard[];
  events: EventCard[];
  questions: ThreadCard[];
  gettingCare: string | null;
};

function categoryOf(p: { kind: string; specialtySlug: string | null }): LocalityCategoryKey | null {
  if (p.specialtySlug === "physiotherapy") return "physio";
  if (p.kind === "lab") return "labs";
  if (p.kind === "pharmacy") return "chemists";
  if (p.kind === "home_care") return "home_care";
  if (p.kind === "hospital" || p.kind === "emergency_dept") return "hospitals";
  if (p.kind === "clinic" || p.kind === "doctor") return "clinics";
  return null;
}

/** /gurgaon/<locality>. Null for unknown slugs (the page calls notFound()). */
export async function getLocalityPage(slug: string): Promise<LocalityPage | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.locality(slug), tags.localities, tags.providers, tags.events, tags.threads, tags.featured);
  if (!getLocality(slug)) return null;
  const now = new Date();
  const { list } = await loadLocalities();
  const locality = list.find((l) => l.slug === slug)!;
  const [row, providers, featuredHospitals, events, threads] = await Promise.all([
    db.locality.findUnique({ where: { slug }, select: { stats: true, gettingCare: true } }),
    db.provider.findMany({ where: { status: "published", localitySlug: slug }, select: { ...providerCardSelect }, orderBy: [{ lastCheckedAt: "desc" }, { name: "asc" }] }),
    getFeaturedProviders(slug, "locality"),
    getUpcomingEvents({ locality: slug, limit: 6 }),
    db.thread.findMany({ where: { localitySlug: slug, status: { in: ["open", "resolved"] } }, select: threadCardSelect, orderBy: { lastActivityAt: "desc" }, take: 3 }),
  ]);
  const serving = await db.provider.findMany({
    where: { status: "published", kind: "hospital", NOT: { localitySlug: slug } },
    select: { ...providerCardSelect, servesLocalities: true },
  });
  const statsCategories = asObject<LocalityStats>(row?.stats)?.categories ?? {};
  const cards = providers.map((p) => ({ p, card: toProviderCard(p, now) }));
  const servingCards = serving
    .filter((p) => Array.isArray(p.servesLocalities) && (p.servesLocalities as unknown[]).includes(slug))
    .map((p) => ({ p, card: toProviderCard(p, now) }));
  const line = (c: ProviderCard) => [c.headline, c.areaLabel].filter(Boolean).join(" · ");
  const categories = LOCALITY_CATEGORIES.map(({ key, label }) => {
    const members = [...cards, ...(key === "hospitals" ? servingCards : [])].filter(({ p }) => categoryOf(p) === key).map(({ card }) => ({ ...card, line: line(card) }));
    return { key, label, count: statsCategories[key] ?? members.length, providers: members };
  });
  return {
    locality,
    indexable: locality.live,
    categories,
    featuredHospitals,
    events,
    questions: threads.map(toThreadCard),
    gettingCare: row?.gettingCare ?? null,
  };
}
