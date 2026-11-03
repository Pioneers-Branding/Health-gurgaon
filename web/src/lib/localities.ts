// The canonical Gurugram locality list: names, the aliases residents actually type, sector ranges
// (no sector belongs to two localities) and positions on the schematic map. Source: the
// prototype's LOCALITIES ("Health Gurgaon Local and Events.dc.html").
//
// This list is code-owned. To add or rename a locality, edit it here and run `npm run db:seed`
// (the seed copies it into the Locality table). Coverage numbers and the `live` flag of the
// database row are what pages show; `live` here mirrors the seeded value for the locality picker.
//
// Pure module: safe in client components (the shell's locality picker imports LOCALITIES).

export type MapLabelSide = "l" | "r" | "t" | "b";

export type Locality = {
  slug: string;
  name: string;
  /** Has a published locality page (enough verified information). */
  live: boolean;
  covers: string;
  aliases: string[];
  nameHi: string;
  /** Inclusive sector ranges, e.g. [[47, 50]]. Empty when the locality isn't defined by sectors. */
  sectors: [number, number][];
  /** Marker on the 520×440 schematic map; `short` is used when the map is under 340px wide. */
  map: { x: number; y: number; label: MapLabelSide; short?: string };
};

export const LOCALITIES: Locality[] = [
  {
    slug: "sohna-road",
    name: "Sohna Road",
    nameHi: "सोहना रोड",
    live: true,
    covers: "Sectors 47–50, Malibu Town, Nirvana Country and the Sohna Road corridor",
    aliases: ["Sohna Rd", "Malibu Town", "Nirvana Country", "सोहना रोड"],
    sectors: [[47, 50]],
    map: { x: 300, y: 270, label: "l" },
  },
  {
    slug: "sector-56",
    name: "Sector 56",
    nameHi: "सेक्टर 56",
    live: true,
    covers: "Sectors 55–57, including Sushant Lok 2 and 3",
    aliases: ["Sec 56", "Sushant Lok 2", "Sushant Lok 3", "सेक्टर 56"],
    sectors: [[55, 57]],
    map: { x: 476, y: 258, label: "l" },
  },
  {
    slug: "golf-course-road",
    name: "Golf Course Road",
    nameHi: "गोल्फ कोर्स रोड",
    live: true,
    covers: "Sikanderpur to Sector 54, including Sectors 42 and 53",
    aliases: ["Golf Course Rd", "GC Road", "Sikanderpur", "गोल्फ कोर्स रोड"],
    sectors: [
      [42, 42],
      [53, 54],
    ],
    map: { x: 449, y: 160, label: "l", short: "Golf Course Rd" },
  },
  {
    slug: "golf-course-ext-road",
    name: "Golf Course Ext. Road",
    nameHi: "गोल्फ कोर्स एक्सटेंशन रोड",
    live: true,
    covers: "Sectors 58–65 along the extension road",
    aliases: ["GCER", "Golf Course Extension Road", "Golf Course Ext Rd"],
    sectors: [[58, 65]],
    map: { x: 423, y: 340, label: "l", short: "Golf Course\nExt. Road" },
  },
  {
    slug: "dlf-phases-1-5",
    name: "DLF Phases 1–5",
    nameHi: "डीएलएफ फ़ेज़ 1–5",
    live: true,
    covers: "DLF Phases 1, 2, 3, 4 and 5",
    aliases: ["DLF Phase 1", "DLF Phase 2", "DLF Phase 3", "DLF Phase 4", "DLF Phase 5", "DLF 1", "DLF 2", "DLF 3", "DLF 4", "DLF 5"],
    sectors: [],
    map: { x: 372, y: 110, label: "l" },
  },
  {
    slug: "new-gurgaon",
    name: "New Gurgaon",
    nameHi: "न्यू गुड़गांव",
    live: false,
    covers: "Sectors 76–95",
    aliases: ["New Gurugram"],
    sectors: [[76, 95]],
    map: { x: 100, y: 352, label: "t" },
  },
  {
    slug: "sushant-lok-1",
    name: "Sushant Lok 1",
    nameHi: "सुशांत लोक 1",
    live: false,
    covers: "Sushant Lok Phase 1",
    aliases: ["Sushant Lok Phase 1", "Sushant Lok I"],
    sectors: [],
    map: { x: 375, y: 206, label: "l" },
  },
  {
    slug: "palam-vihar",
    name: "Palam Vihar",
    nameHi: "पालम विहार",
    live: false,
    covers: "Palam Vihar and Palam Vihar Extension",
    aliases: ["Palam Vihar Ext.", "Palam Vihar Extension", "पालम विहार"],
    sectors: [],
    map: { x: 262, y: 56, label: "r" },
  },
  {
    slug: "dwarka-expressway",
    name: "Dwarka Expressway",
    nameHi: "द्वारका एक्सप्रेसवे",
    live: false,
    covers: "Sectors 99–113 along the expressway",
    aliases: ["Dwarka Expy", "Dwarka Expwy", "NPR", "Northern Peripheral Road"],
    sectors: [[99, 113]],
    map: { x: 138, y: 190, label: "t", short: "Dwarka Expwy" },
  },
];

/** A locality page is published (and indexed) once at least this many listings there are verified. */
export const LOCALITY_MIN_LISTINGS = 20;

/** Pseudo-locality for "All Gurugram": distances are measured from Rajiv Chowk. */
export const ALL_GURUGRAM = { slug: "gurugram", name: "All Gurugram", nameHi: "पूरा गुरुग्राम" } as const;

/** Road labels on the schematic map: [text, x, y, corner pinned there (t/b + l/r)]. */
export const MAP_ROADS: [string, number, number, "tl" | "tr" | "bl" | "br"][] = [
  ["DELHI ↑", 186, 14, "tr"],
  ["MG ROAD", 500, 14, "tr"],
  ["SPR", 392, 300, "bl"],
  ["NH-48 · JAIPUR ↓", 128, 428, "bl"],
  ["SOHNA ↓", 414, 428, "bl"],
];

const BY_SLUG = new Map(LOCALITIES.map((l) => [l.slug, l]));

export function getLocality(slug: string | null | undefined): Locality | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

export function isLocalitySlug(slug: string): boolean {
  return BY_SLUG.has(slug);
}

export function localityName(slug: string | null | undefined, lang: "en" | "hi" = "en"): string {
  if (!slug || slug === ALL_GURUGRAM.slug) return lang === "hi" ? ALL_GURUGRAM.nameHi : ALL_GURUGRAM.name;
  const l = BY_SLUG.get(slug);
  return l ? (lang === "hi" ? l.nameHi : l.name) : slug;
}

// ── Matching (ported from the prototype's locality search) ──────────────────

/** Lower-case, punctuation (. , · – — -) to spaces, single spaces. */
export function locText(t: string): string {
  return t
    .toLowerCase()
    .replace(/[.,·–—-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** locText plus the spellings residents use: "sec 56" → "sector 56", "ph 3" → "phase 3",
 * "rd" → "road", "ext" → "extension". */
export function locDeep(t: string): string {
  return locText(t)
    .replace(/\bsec(?:t(?:or)?)?\s*(?=\d)/g, "sector ")
    .replace(/\bph(?:ase)?\s*(?=\d)/g, "phase ")
    .replace(/\brd\b/g, "road")
    .replace(/\bext\b/g, "extension");
}

/** Words match anywhere ("golf cou"), but a number at either end of the query must be a whole
 * number in the text, so "Sector 5" never resolves to Sector 56. */
export function locHas(text: string, q: string): boolean {
  const d0 = /^\d/.test(q);
  const d1 = /\d$/.test(q);
  for (let i = text.indexOf(q); i >= 0; i = text.indexOf(q, i + 1)) {
    if (!(d0 && /\d/.test(text[i - 1] || "")) && !(d1 && /\d/.test(text[i + q.length] || ""))) return true;
  }
  return false;
}

export type LocalityMatch = {
  hit: boolean;
  /** Why it matched, for the UI: "Matched “GCER”" or "Includes Sector 65". */
  note: string;
  /** Only part of a number matched: offer as "Did you mean", never as a match. */
  near: boolean;
  /** The alias that matched ("GCER"), for a translated note. */
  alias?: string;
  /** The sector number that matched ("Includes Sector 65"), for a translated note. */
  sector?: number;
};

export function matchLocality(L: Locality, query: string): LocalityMatch {
  const lq = locText(query);
  const dq = locDeep(query);
  if (!lq || locHas(locText(L.name), lq) || locHas(locText(L.nameHi), lq)) return { hit: true, note: "", near: false };
  const alias = L.aliases.find((x) => locHas(locText(x), lq)) || L.aliases.find((x) => locHas(locDeep(x), dq));
  if (alias) return { hit: true, note: `Matched “${alias}”`, near: false, alias };
  if (locHas(locDeep(L.name), dq)) return { hit: true, note: "", near: false };
  const n = (dq.match(/^(?:sector )?(\d{1,3})$/) || [])[1];
  if (n && L.sectors.some(([lo, hi]) => +n >= lo && +n <= hi)) return { hit: true, note: `Includes Sector ${+n}`, near: false, sector: +n };
  const near = [L.name, ...L.aliases].some((x) => locText(x).includes(lq) || locDeep(x).includes(dq));
  return { hit: false, note: "", near };
}

export type LocalitySearch = {
  query: string;
  hits: { locality: Locality; note: string; alias?: string; sector?: number }[];
  /** When nothing matched: localities that partly matched ("Did you mean"), at most 3. */
  near: Locality[];
};

/** The locality index search: "GCER", "Sector 65", "Sohna Rd", "DLF 3" and "Sec 56" all resolve. */
export function searchLocalities(query: string, list: Locality[] = LOCALITIES): LocalitySearch {
  const q = query.trim();
  const results = list.map((locality) => ({ locality, m: matchLocality(locality, q) }));
  const hits = results.filter((r) => r.m.hit).map((r) => ({ locality: r.locality, note: r.m.note, alias: r.m.alias, sector: r.m.sector }));
  const near = hits.length || !locText(q) ? [] : results.filter((r) => r.m.near).slice(0, 3).map((r) => r.locality);
  return { query: q, hits, near };
}

/** Best single locality for a free-text value (a select value, a slug or a typed name). */
export function resolveLocality(value: string | null | undefined): Locality | undefined {
  if (!value) return undefined;
  const bySlug = BY_SLUG.get(value);
  if (bySlug) return bySlug;
  const { hits } = searchLocalities(value);
  return hits[0]?.locality;
}

/** Every spelling of a locality, deep-normalised, for phrase matching inside free-text search. */
export function localityPhrases(L: Locality): string[] {
  return Array.from(new Set([L.name, L.nameHi, ...L.aliases].map(locDeep).filter(Boolean)));
}

/** The locality that contains a sector number, if any. */
export function localityForSector(sector: number): Locality | undefined {
  return LOCALITIES.find((L) => L.sectors.some(([lo, hi]) => sector >= lo && sector <= hi));
}

// ── Geography (schematic, not to scale) ─────────────────────────────────────

function mapDistance(a: Locality, b: Locality): number {
  return Math.hypot(a.map.x - b.map.x, a.map.y - b.map.y);
}

/** Localities nearest to `slug` on the schematic map. With `liveOnly`, only localities with a
 * published page (used by "Nearby localities" on the no-results state). */
export function nearbyLocalities(slug: string, opts: { limit?: number; liveOnly?: boolean } = {}): Locality[] {
  const from = BY_SLUG.get(slug);
  if (!from) return [];
  return LOCALITIES.filter((L) => L.slug !== slug && (!opts.liveOnly || L.live))
    .sort((a, b) => mapDistance(from, a) - mapDistance(from, b))
    .slice(0, opts.limit ?? 3);
}
