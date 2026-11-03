// Find care search: the cached catalogue and the request-time search. Server-only.
//
// The search page reads searchParams (request-time), so render results inside <Suspense>:
//   const params = parseSearchParams(await searchParams);
//   const outcome = await runSearch(params);

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";

import { tags } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { asStringArray } from "@/lib/json-types";
import { quickSearch, searchProviders, type SearchCard, type SearchCatalogue, type SearchOutcome, type SearchParams } from "@/lib/search";

import { providerCardSelect, toSearchDoc } from "./mappers";

/** Every published provider in search-ready form, plus specialties and facility types. */
export async function getSearchCatalogue(): Promise<SearchCatalogue> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.providers, tags.specialties, tags.facilityTypes);
  const [providers, specialties, facilityTypes] = await Promise.all([
    db.provider.findMany({ where: { status: "published" }, select: providerCardSelect, orderBy: { name: "asc" } }),
    db.specialty.findMany({ orderBy: { sortOrder: "asc" } }),
    db.facilityType.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);
  return {
    providers: providers.map(toSearchDoc),
    specialties: specialties.map((s) => ({
      slug: s.slug,
      name: s.name,
      doctorNoun: s.doctorNoun,
      doctorNounPlural: s.doctorNounPlural,
      synonyms: asStringArray(s.synonyms),
      conditions: asStringArray(s.conditions),
      relatedSearches: asStringArray(s.relatedSearches),
    })),
    facilityTypes,
  };
}

/** Results, facets and the no-results payload for the search page. Request-time: call it in a
 * component under <Suspense> after reading searchParams. */
export async function runSearch(params: SearchParams): Promise<SearchOutcome> {
  await connection();
  const catalogue = await getSearchCatalogue();
  return searchProviders(catalogue, params, new Date());
}

/** Instant results for the mobile full-screen search (typeahead). */
export async function runQuickSearch(q: string, opts: { locality?: string | null; limit?: number } = {}): Promise<SearchCard[]> {
  await connection();
  const catalogue = await getSearchCatalogue();
  return quickSearch(catalogue, q, new Date(), opts);
}
