// Find care search. Pure: it works on a catalogue loaded by src/lib/data/search.ts (cached) and
// is unit-tested without a database.
//
// What it does, in order:
//   1. Normalises the query ("Children’s" → "childrens", accents, punctuation).
//   2. Finds a locality typed into the query ("chemist GCER", "lab sec 56", "sector 65") using
//      the canonical aliases and sector ranges, unless the page already chose a locality.
//   3. Maps specialty words and conditions to specialties ("pediatrician", "child doctor",
//      "child fever" → Paediatrics), tolerating typos ("paediatrishan").
//   4. Requires every remaining word to match the provider (name, specialty, services, tags,
//      departments, languages…), with plural/suffix folding and typo correction.
//   5. Applies the Find care filters, keeps sponsored listings out of the ordered results, sorts
//      (recently verified, nearest, name) and returns facets plus a no-results payload
//      ("did you mean", nearby localities, broader searches) so a search is never a dead end.
// Filters only use verified values: unknown hours, fees or access never pass a filter.

import type { Ownership, ProviderKind } from "@prisma/client";

import { detectUrgency, type Urgency } from "./content-safety";
import { daysBetween } from "./dates";
import {
  FEE_CEILINGS,
  FILTER_LANGUAGES,
  KIND_FILTERS,
  OWNERSHIP_LABELS,
  OWNERSHIPS,
  PROFILE_KIND_OF,
  PROVIDER_KIND_LABELS,
  type KindFilter,
  type ProfileKind,
} from "./domain";
import { isOpenAt } from "./hours";
import type { OpeningHours } from "./json-types";
import { ALL_GURUGRAM, getLocality, LOCALITIES, localityForSector, localityPhrases, locDeep, nearbyLocalities, type Locality } from "./localities";

// ── Catalogue shapes (built by src/lib/data/search.ts) ──────────────────────

export type SearchDoc = {
  id: string;
  slug: string;
  kind: ProviderKind;
  name: string;
  initials: string;
  headline: string;
  specialtySlug: string | null;
  ownership: Ownership;
  facilityTypeSlug: string | null;
  facilityTypeName: string | null;
  localitySlug: string | null;
  areaLabel: string | null;
  distanceKm: number | null;
  languages: string[];
  fee: number | null;
  feeVerified: boolean;
  openingHours: OpeningHours | null;
  open24h: boolean;
  hoursSummary: string | null;
  wheelchair: boolean | null;
  gender: string | null;
  homeVisits: boolean;
  homeCollection: boolean;
  delivery: boolean;
  badge: string | null;
  tags: string[];
  keyFact: string | null;
  departments: string[];
  services: string[];
  keywords: string;
  lastCheckedAt: string | null;
  sponsored: boolean;
  sponsorLabel: string | null;
  sample: boolean;
};

export type SearchSpecialty = {
  slug: string;
  name: string;
  doctorNoun: string;
  doctorNounPlural: string;
  synonyms: string[];
  conditions: string[];
  relatedSearches: string[];
};

export type SearchCatalogue = {
  providers: SearchDoc[];
  specialties: SearchSpecialty[];
  facilityTypes: { slug: string; name: string }[];
};

// ── Parameters ──────────────────────────────────────────────────────────────

export const SEARCH_SORTS = ["fresh", "dist", "name"] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export type SearchParams = {
  q: string;
  /** Locality slug; null = All Gurugram. */
  locality: string | null;
  kind: KindFilter | null;
  own: Ownership | null;
  /** Facility type slug. */
  ftype: string | null;
  langs: string[];
  /** Verified consultation fee ceiling (₹); null = any. */
  fee: number | null;
  open: boolean;
  wheelchair: boolean;
  female: boolean;
  homeVisits: boolean;
  /** Checked in the last 14 days. */
  fresh: boolean;
  sort: SearchSort;
  page: number;
};

export const DEFAULT_SEARCH: SearchParams = {
  q: "",
  locality: null,
  kind: null,
  own: null,
  ftype: null,
  langs: [],
  fee: null,
  open: false,
  wheelchair: false,
  female: false,
  homeVisits: false,
  fresh: false,
  sort: "fresh",
  page: 1,
};

export const SEARCH_PAGE_SIZE = 20;
export const FRESH_DAYS = 14;

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function readAll(raw: RawParams, key: string): string[] {
  if (raw instanceof URLSearchParams) return raw.getAll(key);
  const v = raw[key];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

function readOne(raw: RawParams, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = readAll(raw, k)[0];
    if (v !== undefined && v !== "") return v;
  }
  return null;
}

const truthy = (v: string | null) => v === "1" || v === "true" || v === "on" || v === "yes";

/** Read the search page's URL parameters, ignoring anything unknown or malformed.
 * Keys: q, locality, kind, own, ftype, lang (repeatable or comma list), fee, open, wheelchair,
 * female, homevisits, fresh, sort, page. */
export function parseSearchParams(raw: RawParams): SearchParams {
  const q = (readOne(raw, "q") ?? "").slice(0, 120).trim();
  const loc = readOne(raw, "locality", "loc");
  const locality = loc && loc !== ALL_GURUGRAM.slug && loc !== "all" && getLocality(loc) ? loc : null;
  const kindRaw = readOne(raw, "kind", "type");
  const kind = (KIND_FILTERS.find((k) => k.key === kindRaw)?.key ?? null) as KindFilter | null;
  const ownRaw = readOne(raw, "own");
  const own = (OWNERSHIPS as readonly string[]).includes(ownRaw ?? "") ? (ownRaw as Ownership) : null;
  const ftype = readOne(raw, "ftype");
  const langs = readAll(raw, "lang")
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .map((v) => FILTER_LANGUAGES.find((l) => l.toLowerCase() === v.toLowerCase()) ?? null)
    .filter((v): v is (typeof FILTER_LANGUAGES)[number] => !!v);
  const feeRaw = Number(readOne(raw, "fee"));
  const fee = (FEE_CEILINGS as readonly number[]).includes(feeRaw) ? feeRaw : null;
  const sortRaw = readOne(raw, "sort");
  const sort = (SEARCH_SORTS as readonly string[]).includes(sortRaw ?? "") ? (sortRaw as SearchSort) : "fresh";
  const page = Math.max(1, Math.min(50, Math.floor(Number(readOne(raw, "page")) || 1)));
  return {
    q,
    locality,
    kind,
    own,
    ftype: ftype && /^[a-z0-9-]{2,40}$/.test(ftype) ? ftype : null,
    langs: Array.from(new Set(langs)),
    fee,
    open: truthy(readOne(raw, "open")),
    wheelchair: truthy(readOne(raw, "wheelchair")),
    female: truthy(readOne(raw, "female")),
    homeVisits: truthy(readOne(raw, "homevisits")),
    fresh: truthy(readOne(raw, "fresh")),
    sort,
    page,
  };
}

/** The query string for a search (defaults omitted), e.g. "q=paediatrician&locality=sector-56". */
export function toSearchQuery(params: Partial<SearchParams>): string {
  const p = { ...DEFAULT_SEARCH, ...params };
  const out = new URLSearchParams();
  if (p.q) out.set("q", p.q);
  if (p.locality) out.set("locality", p.locality);
  if (p.kind) out.set("kind", p.kind);
  if (p.own) out.set("own", p.own);
  if (p.ftype) out.set("ftype", p.ftype);
  for (const l of p.langs) out.append("lang", l);
  if (p.fee) out.set("fee", String(p.fee));
  if (p.open) out.set("open", "1");
  if (p.wheelchair) out.set("wheelchair", "1");
  if (p.female) out.set("female", "1");
  if (p.homeVisits) out.set("homevisits", "1");
  if (p.fresh) out.set("fresh", "1");
  if (p.sort !== "fresh") out.set("sort", p.sort);
  if (p.page > 1) out.set("page", String(p.page));
  return out.toString();
}

// ── Text normalisation ──────────────────────────────────────────────────────

/** Lower-case, accents and apostrophes removed ("Children’s" → "childrens"), punctuation to
 * spaces. Devanagari is kept. */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "a", "an", "the", "in", "near", "nearby", "around", "at", "for", "of", "me", "my", "i", "to", "and", "or", "with",
  "who", "which", "any", "good", "best", "top", "find", "need", "looking", "want", "please", "speaks", "speaking", "is", "are", "on",
  "gurgaon", "gurugram", "ggn",
]);

const STEM_RULES: [RegExp, string][] = [
  [/ians$/, ""],
  [/ian$/, ""],
  [/ists$/, ""],
  [/ist$/, ""],
  [/ics$/, "ic"],
  [/ies$/, "y"],
  [/ology$/, "olog"],
  [/y$/, ""],
  [/al$/, ""],
  [/s$/, ""],
];

/** Light suffix folding so "cardiologist" ~ "cardiology", "chemists" ~ "chemist",
 * "pharmacies" ~ "pharmacy" ~ "pharmacist", "paediatrician" ~ "paediatrics". */
export function stem(word: string): string {
  if (!/^[a-z0-9]+$/.test(word)) return word;
  if (word.length === 4 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, 3);
  if (word.length <= 4) return word;
  let w = word;
  for (let pass = 0; pass < 2; pass++) {
    const rule = STEM_RULES.find(([re]) => re.test(w));
    if (!rule || /ss$/.test(w)) break;
    const next = w.replace(rule[0], rule[1]);
    if (next.length < 4 || next === w) break;
    w = next;
  }
  return w;
}

export function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

/** Optimal-string-alignment distance (Damerau–Levenshtein with adjacent swaps), stopping early
 * once it exceeds `max`. */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1);
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

/** How many typos a word of this length may have. */
export function typoAllowance(length: number): number {
  if (length < 5) return 0;
  if (length < 9) return 1;
  return 2;
}

type Word = { raw: string; stem: string };

function toWords(text: string): Word[] {
  return tokenize(text).map((raw) => ({ raw, stem: stem(raw) }));
}

function wordMatches(token: string, word: Word): boolean {
  if (word.raw === token) return true;
  const ts = stem(token);
  if (word.stem === ts) return true;
  if (token.length >= 4 && word.raw.startsWith(token)) return true;
  if (ts.length >= 4 && word.stem.startsWith(ts)) return true;
  return false;
}

function fuzzyEquals(token: string, target: string): boolean {
  if (token === target || stem(token) === stem(target)) return true;
  const allowance = typoAllowance(Math.max(token.length, target.length));
  return allowance > 0 && editDistance(token, target, allowance) <= allowance;
}

// ── Indexing ────────────────────────────────────────────────────────────────

const KIND_VOCAB: Record<ProviderKind, string> = {
  doctor: "doctor dr",
  clinic: "clinic",
  hospital: "hospital",
  lab: "lab laboratory diagnostic diagnostics test tests",
  pharmacy: "chemist pharmacy medical store medicine medicines",
  blood_bank: "blood bank blood centre",
  ambulance: "ambulance",
  emergency_dept: "emergency hospital",
  home_care: "home care nursing attendant",
};

type IndexedDoc = { doc: SearchDoc; words: Word[]; wordSet: Set<string> };

function indexDoc(doc: SearchDoc, specialty: SearchSpecialty | undefined): IndexedDoc {
  const parts = [
    doc.name,
    doc.headline,
    doc.keywords,
    KIND_VOCAB[doc.kind],
    doc.facilityTypeName ?? "",
    doc.areaLabel ?? "",
    doc.keyFact ?? "",
    doc.tags.join(" "),
    doc.services.join(" "),
    doc.departments.join(" "),
    doc.languages.join(" "),
    specialty ? [specialty.name, specialty.doctorNoun, specialty.doctorNounPlural, ...specialty.synonyms].join(" ") : "",
    doc.homeVisits ? "home visit visits" : "",
    doc.homeCollection ? "home collection sample" : "",
    doc.delivery ? "delivery" : "",
    doc.open24h ? "24 hours 24h open" : "",
  ];
  const words = toWords(parts.join(" "));
  return { doc, words, wordSet: new Set(words.map((w) => w.raw)) };
}

function docHasToken(d: IndexedDoc, token: string): boolean {
  if (d.wordSet.has(token)) return true;
  return d.words.some((w) => wordMatches(token, w));
}

function docHasPhrase(d: IndexedDoc, phraseTokens: string[]): boolean {
  return phraseTokens.every((t) => docHasToken(d, t));
}

// ── Query interpretation ────────────────────────────────────────────────────

type Concept = { specialty: SearchSpecialty; phrase: string; phraseTokens: string[]; kind: "specialty" | "condition"; corrected: boolean; tokenIdx: number[] };

const GENERIC_LOCALITY_WORDS = new Set(["road", "sector", "phase", "phases", "golf", "course", "new", "extension", "city", "town", "country", "lok", "expressway", "gurgaon", "gurugram", "vihar"]);

/** Locality named inside free text: longest exact alias phrase, then "sector N", then a single
 * distinctive first word ("sohna", "dlf", "palam"). Returns the token indexes it used. */
export function findLocalityInQuery(tokens: string[], list: Locality[] = LOCALITIES): { locality: Locality; used: number[] } | null {
  const deep = locDeep(tokens.join(" ")).split(" ").filter(Boolean);
  // locDeep rewrites words in place ("sec" → "sector", "rd" → "road"), so indexes line up unless
  // a number was glued to a word ("sec56" → "sector 56"); then match on the plain tokens.
  return findLocalityInDeepTokens(deep.length === tokens.length ? deep : tokens, list);
}

function findLocalityInDeepTokens(deep: string[], list: Locality[]): { locality: Locality; used: number[] } | null {
  const phrases = list.map((L) => ({ L, phrases: localityPhrases(L).map((p) => normalize(p)) }));
  for (let n = Math.min(4, deep.length); n >= 1; n--) {
    for (let i = 0; i + n <= deep.length; i++) {
      const window = deep.slice(i, i + n).join(" ");
      const used = Array.from({ length: n }, (_, k) => i + k);
      const exact = phrases.filter((p) => p.phrases.includes(window));
      if (exact.length >= 1) return { locality: exact[0].L, used };
      if (n === 2 && deep[i] === "sector" && /^\d{1,3}$/.test(deep[i + 1])) {
        const L = localityForSector(+deep[i + 1]);
        if (L && list.includes(L)) return { locality: L, used };
      }
    }
  }
  for (let i = 0; i < deep.length; i++) {
    const t = deep[i];
    if ((t.length < 3 && t !== "gc") || GENERIC_LOCALITY_WORDS.has(t) || STOPWORDS.has(t)) continue;
    const owners = phrases.filter((p) => p.phrases.some((ph) => ph.split(" ")[0] === t));
    if (owners.length === 1) return { locality: owners[0].L, used: [i] };
  }
  return null;
}

function findConcepts(tokens: string[], specialties: SearchSpecialty[], skip: Set<number>): { concepts: Concept[]; used: Set<number> } {
  const candidates: { s: SearchSpecialty; phrase: string; toks: string[]; kind: Concept["kind"] }[] = [];
  for (const s of specialties) {
    for (const p of [s.name, s.doctorNoun, s.doctorNounPlural, ...s.synonyms]) candidates.push({ s, phrase: p, toks: tokenize(p), kind: "specialty" });
    for (const p of s.conditions) candidates.push({ s, phrase: p, toks: tokenize(p), kind: "condition" });
  }
  candidates.sort((a, b) => b.toks.length - a.toks.length);
  const used = new Set<number>();
  const concepts: Concept[] = [];
  for (const c of candidates) {
    const n = c.toks.length;
    if (!n) continue;
    for (let i = 0; i + n <= tokens.length; i++) {
      const idx = Array.from({ length: n }, (_, k) => i + k);
      if (idx.some((k) => used.has(k) || skip.has(k))) continue;
      let corrected = false;
      const ok = idx.every((k, j) => {
        const t = tokens[k];
        const p = c.toks[j];
        if (t === p || stem(t) === stem(p)) return true;
        if (fuzzyEquals(t, p)) {
          corrected = true;
          return true;
        }
        return false;
      });
      if (ok) {
        idx.forEach((k) => used.add(k));
        const existing = concepts.find((x) => x.specialty.slug === c.s.slug);
        if (existing) existing.tokenIdx.push(...idx);
        else concepts.push({ specialty: c.s, phrase: c.phrase, phraseTokens: c.toks, kind: c.kind, corrected, tokenIdx: idx });
      }
    }
  }
  return { concepts, used };
}

function docSatisfiesConcept(d: IndexedDoc, c: Concept): boolean {
  const s = c.specialty;
  if (d.doc.specialtySlug === s.slug) return true;
  const deptMatch = d.doc.departments.some((dep) => {
    const depTokens = tokenize(dep);
    return tokenize(s.name).every((t) => depTokens.some((x) => stem(x) === stem(t)));
  });
  if (deptMatch) return true;
  if ([s.doctorNoun, ...s.synonyms].some((syn) => docHasPhrase(d, tokenize(syn)))) return true;
  return docHasPhrase(d, c.phraseTokens);
}

// ── Results ─────────────────────────────────────────────────────────────────

export type SearchCard = {
  id: string;
  slug: string;
  kind: ProviderKind;
  kindLabel: string;
  profileKind: ProfileKind;
  name: string;
  initials: string;
  headline: string;
  ownership: Ownership;
  facilityType: { slug: string; name: string } | null;
  localitySlug: string | null;
  localityName: string | null;
  areaLabel: string | null;
  distanceKm: number | null;
  languages: string[];
  fee: number | null;
  feeVerified: boolean;
  /** true/false when hours are verified, null when unknown. */
  openNow: boolean | null;
  open24h: boolean;
  hoursSummary: string | null;
  wheelchair: boolean | null;
  homeVisits: boolean;
  badge: string | null;
  tags: string[];
  keyFact: string | null;
  lastCheckedAt: string | null;
  checkedDaysAgo: number | null;
  sponsored: boolean;
  sponsorLabel: string | null;
  sample: boolean;
};

export function toSearchCard(doc: SearchDoc, now: Date): SearchCard {
  const L = getLocality(doc.localitySlug);
  return {
    id: doc.id,
    slug: doc.slug,
    kind: doc.kind,
    kindLabel: PROVIDER_KIND_LABELS[doc.kind],
    profileKind: PROFILE_KIND_OF[doc.kind],
    name: doc.name,
    initials: doc.initials,
    headline: doc.headline,
    ownership: doc.ownership,
    facilityType: doc.facilityTypeSlug ? { slug: doc.facilityTypeSlug, name: doc.facilityTypeName ?? doc.facilityTypeSlug } : null,
    localitySlug: doc.localitySlug,
    localityName: L?.name ?? null,
    areaLabel: doc.areaLabel,
    distanceKm: doc.distanceKm,
    languages: doc.languages,
    fee: doc.feeVerified ? doc.fee : null,
    feeVerified: doc.feeVerified,
    openNow: isOpenAt(doc.openingHours, doc.open24h, now),
    open24h: doc.open24h,
    hoursSummary: doc.hoursSummary,
    wheelchair: doc.wheelchair,
    homeVisits: doc.homeVisits,
    badge: doc.badge,
    tags: doc.tags,
    keyFact: doc.keyFact,
    lastCheckedAt: doc.lastCheckedAt,
    checkedDaysAgo: doc.lastCheckedAt ? Math.max(0, daysBetween(new Date(doc.lastCheckedAt), now)) : null,
    sponsored: doc.sponsored,
    sponsorLabel: doc.sponsorLabel,
    sample: doc.sample,
  };
}

export type FacetCount<K extends string = string> = { key: K; label: string; count: number };

export type SearchFacets = {
  kinds: FacetCount<KindFilter>[];
  ownership: FacetCount<Ownership>[];
  facilityTypes: FacetCount[];
  languages: FacetCount[];
  toggles: { open: number; wheelchair: number; female: number; homeVisits: number; fresh: number };
};

export type SearchOutcome = {
  params: SearchParams;
  interpreted: {
    query: string;
    /** Words that had to match providers literally (after locality and specialty words). */
    words: string[];
    specialties: { slug: string; name: string; via: "specialty" | "condition" }[];
    locality: { slug: string; name: string } | null;
    localityFromQuery: boolean;
    corrections: { from: string; to: string }[];
  };
  total: number;
  page: number;
  pageCount: number;
  results: SearchCard[];
  /** At most one sponsored listing, shown apart from (and never inside) the ordered results. */
  sponsored: SearchCard | null;
  facets: SearchFacets;
  sortNote: string;
  /** Corrected query when a typo was fixed ("paediatrishan" → "paediatrician"). */
  didYouMean: string | null;
  /** Red-flag symptoms in the query: show "Call 112" first. */
  emergency: Urgency;
  noResults: null | {
    suggestions: { label: string; q: string }[];
    nearbyLocalities: { slug: string | null; name: string }[];
    /** Results the active filters hid (0 when filters aren't the reason). */
    hiddenByFilters: number;
  };
};

const FALLBACK_SUGGESTIONS = ["General physician", "Paediatrician", "Lab", "Chemist", "Physiotherapist"];

function matchesFilters(d: SearchDoc, p: SearchParams, now: Date): boolean {
  if (p.kind) {
    const kinds = KIND_FILTERS.find((k) => k.key === p.kind)!.kinds as readonly ProviderKind[];
    if (!kinds.includes(d.kind)) return false;
  }
  if (p.own && d.ownership !== p.own) return false;
  if (p.ftype && d.facilityTypeSlug !== p.ftype) return false;
  if (p.langs.length && !p.langs.every((l) => d.languages.includes(l))) return false;
  if (p.fee !== null && (d.fee === null || !d.feeVerified || d.fee > p.fee)) return false;
  if (p.open && isOpenAt(d.openingHours, d.open24h, now) !== true) return false;
  if (p.wheelchair && d.wheelchair !== true) return false;
  if (p.female && d.gender !== "female") return false;
  if (p.homeVisits && !d.homeVisits) return false;
  if (p.fresh && (!d.lastCheckedAt || daysBetween(new Date(d.lastCheckedAt), now) > FRESH_DAYS)) return false;
  return true;
}

function sortDocs(list: SearchDoc[], sort: SearchSort): SearchDoc[] {
  const dist = (d: SearchDoc) => d.distanceKm ?? Number.POSITIVE_INFINITY;
  const checked = (d: SearchDoc) => (d.lastCheckedAt ? new Date(d.lastCheckedAt).getTime() : Number.NEGATIVE_INFINITY);
  const byName = (a: SearchDoc, b: SearchDoc) => a.name.localeCompare(b.name, "en");
  const copy = [...list];
  if (sort === "dist") return copy.sort((a, b) => dist(a) - dist(b) || byName(a, b));
  if (sort === "name") return copy.sort(byName);
  return copy.sort((a, b) => checked(b) - checked(a) || dist(a) - dist(b) || byName(a, b));
}

function sortNoteFor(sort: SearchSort, sponsoredShown: boolean): string {
  const spon = sponsoredShown ? " The sponsored listing above is separate and doesn't change this order." : "";
  if (sort === "fresh") return "Sorted by most recently verified." + (spon || " Sponsored listings are labelled and shown separately.");
  if (sort === "dist") return "Sorted by distance from the centre of the selected locality." + spon;
  return "Sorted alphabetically." + spon;
}

function facetsFor(docs: SearchDoc[], catalogue: SearchCatalogue, now: Date): SearchFacets {
  const count = (pred: (d: SearchDoc) => boolean) => docs.filter(pred).length;
  return {
    kinds: KIND_FILTERS.map((k) => ({ key: k.key as KindFilter, label: k.label, count: count((d) => (k.kinds as readonly ProviderKind[]).includes(d.kind)) })),
    ownership: OWNERSHIPS.map((o) => ({ key: o, label: OWNERSHIP_LABELS[o], count: count((d) => d.ownership === o) })),
    facilityTypes: catalogue.facilityTypes
      .map((f) => ({ key: f.slug, label: f.name, count: count((d) => d.facilityTypeSlug === f.slug) }))
      .filter((f) => f.count > 0),
    languages: FILTER_LANGUAGES.map((l) => ({ key: l, label: l, count: count((d) => d.languages.includes(l)) })),
    toggles: {
      open: count((d) => isOpenAt(d.openingHours, d.open24h, now) === true),
      wheelchair: count((d) => d.wheelchair === true),
      female: count((d) => d.gender === "female"),
      homeVisits: count((d) => d.homeVisits),
      fresh: count((d) => !!d.lastCheckedAt && daysBetween(new Date(d.lastCheckedAt), now) <= FRESH_DAYS),
    },
  };
}

/** Run a Find care search over a catalogue. `now` decides "open now" and "checked in the last
 * 14 days"; pass the request time. */
export function searchProviders(catalogue: SearchCatalogue, params: SearchParams, now: Date): SearchOutcome {
  const specialtyBySlug = new Map(catalogue.specialties.map((s) => [s.slug, s]));
  const listed = catalogue.providers;
  const index = listed.map((doc) => indexDoc(doc, doc.specialtySlug ? specialtyBySlug.get(doc.specialtySlug) : undefined));

  // 1–2. Tokens and a locality typed into the query.
  const allTokens = tokenize(params.q).filter((t) => !STOPWORDS.has(t));
  let localitySlug = params.locality;
  let localityFromQuery = false;
  const consumed = new Set<number>();
  const found = findLocalityInQuery(allTokens);
  if (found) {
    found.used.forEach((i) => consumed.add(i));
    if (!localitySlug || localitySlug !== found.locality.slug) {
      localitySlug = found.locality.slug;
      localityFromQuery = true;
    }
  }

  // 3. Specialties and conditions.
  const { concepts, used } = findConcepts(allTokens, catalogue.specialties, consumed);
  used.forEach((i) => consumed.add(i));

  // 4. Remaining words, with typo correction against everything we know.
  const vocabulary = new Set<string>();
  for (const d of index) for (const w of d.words) if (w.raw.length >= 3) vocabulary.add(w.raw);
  const corrections: { from: string; to: string }[] = [];
  const rewritten: (string | null)[] = [...allTokens];
  for (const c of concepts.filter((x) => x.corrected)) {
    const to = c.phraseTokens.join(" ");
    corrections.push({ from: c.tokenIdx.map((i) => allTokens[i]).join(" "), to });
    c.tokenIdx.forEach((i, k) => (rewritten[i] = k === 0 ? to : null));
  }
  const words: string[] = [];
  allTokens.forEach((t, i) => {
    if (consumed.has(i)) return;
    if (index.some((d) => docHasToken(d, t))) {
      words.push(t);
      return;
    }
    const allowance = typoAllowance(t.length);
    let best: string | null = null;
    let bestD = allowance + 1;
    if (allowance > 0) {
      for (const v of vocabulary) {
        const dist = editDistance(t, v, allowance);
        if (dist < bestD || (dist === bestD && best !== null && v.length < best.length)) {
          best = v;
          bestD = dist;
        }
      }
    }
    if (best && bestD <= allowance) {
      corrections.push({ from: t, to: best });
      rewritten[i] = best;
      words.push(best);
    } else {
      words.push(t);
    }
  });

  const matchesQuery = (d: IndexedDoc) => concepts.every((c) => docSatisfiesConcept(d, c)) && words.every((w) => docHasToken(d, w));
  const inLocality = (d: SearchDoc) => !localitySlug || d.localitySlug === localitySlug;

  const base = index.filter((d) => matchesQuery(d) && inLocality(d.doc)).map((d) => d.doc);
  const filtered = base.filter((d) => matchesFilters(d, params, now));
  const sponsoredDoc = filtered.find((d) => d.sponsored) ?? null;
  const others = filtered.filter((d) => !d.sponsored);
  const showSponsored = !!sponsoredDoc && others.length > 0;
  const ordered = sortDocs(showSponsored ? others : filtered, params.sort);

  const pageCount = Math.max(1, Math.ceil(ordered.length / SEARCH_PAGE_SIZE));
  const page = Math.min(params.page, pageCount);
  const results = ordered.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE).map((d) => toSearchCard(d, now));

  const L = getLocality(localitySlug);
  const didYouMean = corrections.length ? rewritten.filter((t): t is string => !!t).join(" ") : null;

  let noResults: SearchOutcome["noResults"] = null;
  if (ordered.length === 0) {
    // Specialists first ("Paediatrician", "Cardiologist"), then broader searches ("Children’s clinic").
    const suggestions: { label: string; q: string }[] = [
      ...concepts.map((c) => ({ label: c.specialty.doctorNoun, q: c.specialty.doctorNoun })),
      ...concepts.flatMap((c) => c.specialty.relatedSearches.map((r) => ({ label: r, q: r }))),
    ];
    if (!suggestions.length) for (const s of FALLBACK_SUGGESTIONS) suggestions.push({ label: s, q: s });
    const unique = suggestions.filter((s, i) => suggestions.findIndex((x) => x.label.toLowerCase() === s.label.toLowerCase()) === i).slice(0, 3);
    const nearby: { slug: string | null; name: string }[] = localitySlug
      ? [...nearbyLocalities(localitySlug, { limit: 2, liveOnly: true }).map((n) => ({ slug: n.slug, name: n.name })), { slug: null, name: ALL_GURUGRAM.name }]
      : [];
    noResults = { suggestions: unique, nearbyLocalities: nearby, hiddenByFilters: base.length };
  }

  return {
    params: { ...params, locality: localitySlug, page },
    interpreted: {
      query: params.q,
      words,
      specialties: concepts.map((c) => ({ slug: c.specialty.slug, name: c.specialty.name, via: c.kind })),
      locality: L ? { slug: L.slug, name: L.name } : null,
      localityFromQuery,
      corrections,
    },
    total: ordered.length,
    page,
    pageCount,
    results,
    sponsored: showSponsored && sponsoredDoc ? toSearchCard(sponsoredDoc, now) : null,
    facets: facetsFor(base, catalogue, now),
    sortNote: sortNoteFor(params.sort, showSponsored),
    didYouMean,
    emergency: detectUrgency(params.q),
    noResults,
  };
}

/** Instant results for the full-screen mobile search: best name/specialty matches, nearest locality first. */
export function quickSearch(catalogue: SearchCatalogue, q: string, now: Date, opts: { locality?: string | null; limit?: number } = {}): SearchCard[] {
  if (!q.trim()) return [];
  const outcome = searchProviders(catalogue, { ...DEFAULT_SEARCH, q, locality: null }, now);
  const all = [...outcome.results, ...(outcome.sponsored ? [outcome.sponsored] : [])];
  const qn = normalize(q);
  const score = (c: SearchCard) => {
    const name = normalize(c.name);
    const nameScore = name.startsWith(qn) ? 0 : name.includes(qn) ? 1 : 2;
    return nameScore + (opts.locality && c.localitySlug !== opts.locality ? 0.5 : 0);
  };
  return all.sort((a, b) => score(a) - score(b)).slice(0, opts.limit ?? 5);
}

/** Result title as the prototype words it: "6 results for “Paediatrician” in Gurugram". */
export function resultTitle(outcome: SearchOutcome): string {
  const n = outcome.total;
  const q = outcome.params.q ? ` for “${outcome.params.q}”` : "";
  const where = outcome.interpreted.locality ? ` in ${outcome.interpreted.locality.name}` : " in Gurugram";
  return `${n} result${n === 1 ? "" : "s"}${q}${where}`;
}
