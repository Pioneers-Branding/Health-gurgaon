// Pure helpers for the top lists, stories, facilities and neighbour-method pages: URL filters,
// filtering, facility facts and the demo's notes. No server-only imports (unit-tested, and the
// stories Server Action uses storySlug()).

import type { DemoDoc, DemoSafeguard } from "@/lib/ranking";

export type Ownership = "private" | "government" | "charitable" | "ppp";
export type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** Append (or replace) query parameters on a path built by @/lib/routes. Empty values are dropped. */
export function withQuery(href: string, params: Record<string, string | number | boolean | null | undefined>, hash?: string): string {
  const [path, existing = ""] = href.split("#")[0].split("?");
  const sp = new URLSearchParams(existing);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) sp.delete(key);
    else sp.set(key, value === true ? "1" : String(value));
  }
  const qs = sp.toString();
  return `${path}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}

export function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Fill {placeholders}. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (Object.prototype.hasOwnProperty.call(values, k) ? String(values[k]) : m));
}

/** "October 2026" / "अक्टूबर 2026" (India time) from a stored date. */
export function monthYearLong(lang: "en" | "hi", iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
}

export function plural(n: number, one: string, many: string): string {
  return fill(n === 1 ? one : many, { n });
}

// ── Top lists hub ───────────────────────────────────────────────────────────

/** Filter chips on the hub, in the prototype's order. `value` is TopList.hubGroup. */
export const HUB_GROUPS = [
  { key: "doctors", value: "Doctors" },
  { key: "hospitals", value: "Hospitals" },
  { key: "care-centres", value: "Care centres" },
  { key: "diagnostics", value: "Diagnostics" },
  { key: "government", value: "Government" },
] as const;
export type HubGroupKey = (typeof HUB_GROUPS)[number]["key"];

export type HubFilters = { group: HubGroupKey | null; q: string };

export function parseHubFilters(sp: SearchParamsRecord): HubFilters {
  const g = first(sp.group);
  const group = HUB_GROUPS.find((x) => x.key === g)?.key ?? null;
  const q = (first(sp.q) ?? "").trim().slice(0, 80);
  return { group, q };
}

export function hubGroupKey(hubGroup: string): HubGroupKey | null {
  return HUB_GROUPS.find((x) => x.value === hubGroup)?.key ?? null;
}

/** Cards whose group matches and whose title (in either language) contains the query. */
export function filterHubCards<T extends { groupKey: HubGroupKey | null; search: string }>(cards: T[], f: HubFilters): T[] {
  const q = f.q.trim().toLowerCase();
  return cards.filter((c) => (!f.group || c.groupKey === f.group) && (!q || c.search.toLowerCase().includes(q)));
}

// ── One list ────────────────────────────────────────────────────────────────

/** Ownership chips on a list page (the prototype's: no PPP). */
export const LIST_OWNERSHIPS = ["private", "government", "charitable"] as const;

/** "All Gurugram" + these localities in the list page's locality picker (and "Best in …" on the hub). */
export const RANK_LOCALITIES = ["sector-56", "golf-course-road", "golf-course-ext-road", "sohna-road", "dlf-phases-1-5", "new-gurgaon"] as const;

export type ListFilters = { own: (typeof LIST_OWNERSHIPS)[number] | null; locality: string | null };

export function parseListFilters(sp: SearchParamsRecord): ListFilters {
  const o = first(sp.own);
  const l = first(sp.locality);
  return {
    own: (LIST_OWNERSHIPS as readonly string[]).includes(o ?? "") ? (o as ListFilters["own"]) : null,
    locality: (RANK_LOCALITIES as readonly string[]).includes(l ?? "") ? l! : null,
  };
}

/** Entries matching the filters, re-numbered from 1 in score order (as the prototype does). */
export function filterEntries<T extends { ownership: string; localitySlug: string | null }>(entries: T[], f: ListFilters): (T & { position: number })[] {
  return entries.filter((e) => (!f.own || e.ownership === f.own) && (!f.locality || e.localitySlug === f.locality)).map((e, i) => ({ ...e, position: i + 1 }));
}

/** "▲ 1 since Sep" → { dir: "up", n: 1, month: "Sep" }; "NEW" → { dir: "new" }; anything else → same. */
export function parseMovement(m: string): { dir: "up" | "down"; n: number; month: string } | { dir: "new" } | { dir: "same" } {
  const match = /^([▲▼])\s*(\d+)\s+since\s+(\w+)$/.exec(m.trim());
  if (match) return { dir: match[1] === "▲" ? "up" : "down", n: Number(match[2]), month: match[3] };
  if (m.trim().toUpperCase() === "NEW") return { dir: "new" };
  return { dir: "same" };
}

// ── Stories ─────────────────────────────────────────────────────────────────

/** Category chips (`value` is Story.category). */
export const STORY_CATEGORIES = [
  { slug: "recovery", value: "Recovery" },
  { slug: "children", value: "Children" },
  { slug: "seniors", value: "Seniors" },
  { slug: "womens-health", value: "Women’s health" },
  { slug: "chronic-care", value: "Chronic care" },
] as const;
export type StoryCategorySlug = (typeof STORY_CATEGORIES)[number]["slug"];

export function parseStoryCategory(sp: SearchParamsRecord): StoryCategorySlug | null {
  const c = first(sp.category);
  return STORY_CATEGORIES.find((x) => x.slug === c)?.slug ?? null;
}

export function storyCategoryValue(slug: StoryCategorySlug | null): string | null {
  return slug ? (STORY_CATEGORIES.find((x) => x.slug === slug)?.value ?? null) : null;
}

/** The caption under the video: the transcript's first sentence. */
export function firstSentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const i = t.indexOf(".");
  return i === -1 ? t : t.slice(0, i + 1);
}

/** A pending story's slug from its reference ("HG-ST-222" → "submitted-hg-st-222"). */
export function storySlug(ref: string): string {
  return `submitted-${ref.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/** Lower-case, accents and punctuation out: for matching a typed provider name to a listing. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(sample\)/g, " ")
    .replace(/\bdr\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The one listing a typed name points at: an exact name match, else the only listing whose name
 * contains every typed word (at least 2 words, or one of 5+ letters). Null when unsure. */
export function matchProviderName<T extends { name: string }>(typed: string, providers: T[]): T | null {
  const q = normalizeName(typed);
  if (q.length < 3) return null;
  const exact = providers.filter((p) => normalizeName(p.name) === q);
  if (exact.length === 1) return exact[0];
  const words = q.split(" ").filter(Boolean);
  if (words.length < 2 && q.length < 5) return null;
  const hits = providers.filter((p) => {
    const n = ` ${normalizeName(p.name)} `;
    return words.every((w) => n.includes(` ${w}`));
  });
  return hits.length === 1 ? hits[0] : null;
}

// ── Facilities ──────────────────────────────────────────────────────────────

/** Ownership cards on the facilities page, in the prototype's order (after "All ownership"). */
export const FACILITY_OWNERSHIPS = ["government", "private", "charitable", "ppp"] as const;

export type FacilityFilters = { ownership: Ownership | null; type: string | null };

export function parseFacilityFilters(sp: SearchParamsRecord, typeSlugs: readonly string[]): FacilityFilters {
  const o = first(sp.ownership);
  const t = first(sp.type);
  return {
    ownership: (FACILITY_OWNERSHIPS as readonly string[]).includes(o ?? "") ? (o as Ownership) : null,
    type: t && typeSlugs.includes(t) ? t : null,
  };
}

export function filterFacilities<T extends { ownership: string; type: { slug: string } }>(rows: T[], f: FacilityFilters): T[] {
  return rows.filter((r) => (!f.ownership || r.ownership === f.ownership) && (!f.type || r.type.slug === f.type));
}

/** Types whose explainer ("What is transition care?") shows under the type cards. */
export const TRANSITION_TYPES = ["transition-care", "rehabilitation"] as const;

/** Up to three facts for a facility card: emergency cover, size, then the listing's own tags. */
export function facilityFacts(p: { emergency: unknown; sizeLabel: string | null; tags: string[] }): string[] {
  const out: string[] = [];
  const e = p.emergency && typeof p.emergency === "object" ? (p.emergency as { available24x7?: boolean; label?: string }) : null;
  if (e?.available24x7) out.push("24×7 emergency");
  else if (e?.label) out.push(e.label);
  if (p.sizeLabel) out.push(p.sizeLabel);
  for (const tag of p.tags) {
    if (out.length >= 3) break;
    if (/^emergency$/i.test(tag) && e) continue;
    if (!out.some((x) => x.toLowerCase() === tag.toLowerCase())) out.push(tag);
  }
  return out.slice(0, 3);
}

const OWNERSHIP_ORDER: Record<string, number> = { government: 0, private: 1, charitable: 2, ppp: 3 };

/** Directory order: government first (as the prototype lists them), then by type, then name. */
export function sortFacilities<T extends { ownership: string; typeOrder: number; name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (OWNERSHIP_ORDER[a.ownership] ?? 9) - (OWNERSHIP_ORDER[b.ownership] ?? 9) || a.typeOrder - b.typeOrder || a.name.localeCompare(b.name));
}

// ── Neighbour method page demo ──────────────────────────────────────────────

export type DemoNote = { key: "conflict" | "newAccounts" | "old" | "negative"; n: number };

/** The notes under a demo doctor (same rules as scoreDemoDoc() in lib/ranking), as keys so the
 * page can word them in either language. */
export function demoNotes(d: DemoDoc, on: Record<DemoSafeguard, boolean>): DemoNote[] {
  const notes: DemoNote[] = [];
  if (on.conflict && d.conflict) notes.push({ key: "conflict", n: d.conflict });
  if (on.trust && d.newAcct > 5) notes.push({ key: "newAccounts", n: d.newAcct });
  if (on.recency && d.old > 5) notes.push({ key: "old", n: d.old });
  if (on.balance && d.neg > 4) notes.push({ key: "negative", n: d.neg });
  return notes;
}
