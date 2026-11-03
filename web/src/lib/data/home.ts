// Everything the city homepage shows, in one cached read. Server-only.
// The locality tabs ("Recently verified near …", "Hospitals serving …") switch on the client,
// so data for every tab locality is included. The per-locality maps also cover every other
// canonical locality (HOME_PLACES), so the hero's locality list and a reader's saved locality
// work too.

import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { tags } from "@/lib/cache-tags";
import { getLocality, LOCALITIES } from "@/lib/localities";

import { getArticles, getGuides, type ArticleCard, type GuideCard } from "./content";
import { getThreads } from "./community";
import { getUpcomingEvents } from "./events";
import type { EventCard, ProviderCard, ThreadCard } from "./mappers";
import { getNeighbourCounts } from "./neighbours";
import { getFeaturedProviders, getRecentlyVerified, type FeaturedProviderCard } from "./providers";
import { getStories, getTopLists, type StoryCard, type TopListCard } from "./top-lists";

/** Tabs on the homepage, in prototype order (default: Sector 56). */
export const HOME_LOCALITY_TABS = ["sector-56", "golf-course-road", "sohna-road", "dlf-phases-1-5", "new-gurgaon"] as const;

/** The hero search's locality list, in prototype order (default: Sector 56). */
export const HOME_SEARCH_LOCALITIES = ["sector-56", "golf-course-road", "golf-course-ext-road", "sohna-road", "dlf-phases-1-5", "new-gurgaon"] as const;

/** Every locality the per-locality maps cover: the tabs first, then the other canonical localities. */
export const HOME_PLACES: readonly string[] = [...HOME_LOCALITY_TABS, ...LOCALITIES.map((l) => l.slug).filter((s) => !(HOME_LOCALITY_TABS as readonly string[]).includes(s))];

/** "Healthcare by locality" tiles: the Homepage's descriptions. */
export const HOME_LOCALITY_TILES = [
  { slug: "golf-course-road", desc: "Large hospitals, specialists, imaging", photo: "Golf Course Rd" },
  { slug: "golf-course-ext-road", desc: "New societies, clinics, chemists", photo: "GCER societies" },
  { slug: "sohna-road", desc: "Clinics, labs, home care", photo: "Sohna Road" },
  { slug: "dlf-phases-1-5", desc: "Established clinics, senior care", photo: "DLF Phase" },
  { slug: "sector-56", desc: "Neighbourhood doctors, labs", photo: "Sector 56 market" },
  { slug: "new-gurgaon", desc: "Growing coverage, new facilities", photo: "New Gurgaon" },
] as const;

export type Homepage = {
  tabs: { slug: string; name: string }[];
  /** Keyed by every slug in HOME_PLACES (the tabs and every other canonical locality). */
  recentlyVerified: Record<string, ProviderCard[]>;
  featuredHospitals: Record<string, (FeaturedProviderCard & { recommendedBy: number })[]>;
  /** The next verified camp per tab locality ("NEXT CAMP NEAR SECTOR 56"), falling back to the next one anywhere. */
  nextCamp: Record<string, EventCard | null>;
  events: EventCard[];
  /** Up to 20 upcoming events (verified and awaiting review), soonest first: the event filter chips pick from these. */
  upcomingEvents: EventCard[];
  localityTiles: { slug: string; name: string; desc: string; photo: string; live: boolean }[];
  questions: ThreadCard[];
  news: ArticleCard[];
  guides: GuideCard[];
  topLists: TopListCard[];
  stories: StoryCard[];
};

export async function getHomepage(): Promise<Homepage> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.providers, tags.featured, tags.events, tags.threads, tags.articles, tags.guides, tags.topLists, tags.stories, tags.mentions);
  const tabs = HOME_LOCALITY_TABS.map((slug) => ({ slug, name: getLocality(slug)?.name ?? slug }));
  const [recent, featured, events, questions, news, guides, lists, stories] = await Promise.all([
    Promise.all(HOME_PLACES.map((slug) => getRecentlyVerified(slug, 4))),
    Promise.all(HOME_PLACES.map((slug) => getFeaturedProviders(slug, "homepage"))),
    getUpcomingEvents({ limit: 20 }),
    getThreads({ sort: "helpful", limit: 3 }),
    getArticles({ includeSponsored: false, limit: 3 }),
    getGuides({ limit: 3 }),
    getTopLists(),
    getStories({ limit: 4 }),
  ]);
  const counts = await getNeighbourCounts(featured.flat().map((f) => f.provider.slug));
  const verifiedEvents = events.filter((e) => e.verified);
  return {
    tabs,
    recentlyVerified: Object.fromEntries(HOME_PLACES.map((slug, i) => [slug, recent[i]])),
    featuredHospitals: Object.fromEntries(HOME_PLACES.map((slug, i) => [slug, featured[i].map((f) => ({ ...f, recommendedBy: counts[f.provider.slug] ?? 0 }))])),
    nextCamp: Object.fromEntries(HOME_PLACES.map((slug) => [slug, verifiedEvents.find((e) => e.localitySlug === slug) ?? verifiedEvents[0] ?? null])),
    events: events.slice(0, 5),
    upcomingEvents: events,
    localityTiles: HOME_LOCALITY_TILES.map((t) => ({ ...t, name: getLocality(t.slug)?.name ?? t.slug, live: getLocality(t.slug)?.live ?? false })),
    questions,
    news,
    guides,
    topLists: [...lists.filter((l) => !l.sourceListSlug).slice(0, 3), ...lists.filter((l) => l.slug === "government")],
    stories,
  };
}
