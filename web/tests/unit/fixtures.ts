// Test fixtures built from the real sample data (prisma/seed-data), without a database.

import { FACILITY_TYPES, SPECIALTIES } from "../../prisma/seed-data/specialties";
import { PROVIDERS } from "../../prisma/seed-data/providers";
import type { SeedProvider } from "../../prisma/seed-data/types";
import { parseIst } from "../../src/lib/dates";
import type { SearchCatalogue, SearchDoc } from "../../src/lib/search";

function toDoc(p: SeedProvider): SearchDoc {
  return {
    id: p.slug,
    slug: p.slug,
    kind: p.kind,
    name: p.name,
    initials: p.initials ?? "HG",
    headline: p.headline,
    specialtySlug: p.specialty ?? null,
    ownership: p.ownership,
    facilityTypeSlug: p.facilityType ?? null,
    facilityTypeName: FACILITY_TYPES.find((f) => f.slug === p.facilityType)?.name ?? null,
    localitySlug: p.locality ?? null,
    areaLabel: p.area ?? null,
    distanceKm: p.distanceKm ?? null,
    languages: p.languages ?? [],
    fee: p.fee ?? null,
    feeVerified: p.feeVerified ?? false,
    openingHours: p.hours ?? null,
    open24h: p.open24h ?? false,
    hoursSummary: p.hoursSummary ?? null,
    wheelchair: p.wheelchair ?? null,
    gender: p.gender ?? null,
    homeVisits: p.homeVisits ?? false,
    homeCollection: !!p.homeCollection,
    delivery: p.delivery ?? false,
    badge: p.badges[0] ?? null,
    tags: p.tags ?? [],
    keyFact: p.keyFact ?? null,
    departments: (p.departments ?? []).map((d) => d.name),
    services: p.services ?? [],
    keywords: p.keywords ?? "",
    lastCheckedAt: p.checked ? parseIst(p.checked).toISOString() : null,
    sponsored: p.sponsored ?? false,
    sponsorLabel: p.sponsorLabel ?? null,
    sample: true,
  };
}

export const CATALOGUE: SearchCatalogue = {
  providers: PROVIDERS.map(toDoc),
  specialties: SPECIALTIES.map((s) => ({
    slug: s.slug,
    name: s.name,
    doctorNoun: s.doctorNoun,
    doctorNounPlural: s.doctorNounPlural,
    synonyms: s.synonyms,
    conditions: s.conditions,
    relatedSearches: s.relatedSearches ?? [],
  })),
  facilityTypes: FACILITY_TYPES.map((f) => ({ slug: f.slug, name: f.name })),
};

/** Friday 16 Oct 2026, 11:00 India time: the prototype's "today" (it labels the day Thursday). */
export const FRIDAY_11AM = parseIst("2026-10-16 11:00");
/** Friday 16 Oct 2026, 15:00 India time (clinics are closed between their sessions). */
export const FRIDAY_3PM = parseIst("2026-10-16 15:00");
