// Pure helpers for the community area (forum, threads, Healthy Neighbourhoods, volunteering).
// No React and no server code: safe in Client Components, used by src/lib/data/community.ts and
// covered by tests/unit/community.test.ts.

import { FORUM_TOPICS } from "@/lib/domain";
import { getLocality, nearbyLocalities, type Locality } from "@/lib/localities";
import type { SearchDoc } from "@/lib/search";

type RawParams = Record<string, string | string[] | undefined>;

function one(raw: RawParams, key: string): string | null {
  const v = raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
}

/** Fill {placeholders}. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

/** "1 reply" / "6 replies": picks the template by count and fills {n}. */
export function plural(n: number, one: string, many: string): string {
  return (n === 1 ? one : many).replaceAll("{n}", String(n));
}

// ── Forum filters in the URL ─────────────────────────────────────────────────

export const FORUM_SORTS = ["recent", "helpful", "unanswered"] as const;
export type ForumSort = (typeof FORUM_SORTS)[number];

export type ForumFilters = { topic: string | null; locality: string | null; sort: ForumSort };

export const NO_FORUM_FILTERS: ForumFilters = { topic: null, locality: null, sort: "recent" };

/** ?topic=<slug>&locality=<slug>&sort=recent|helpful|unanswered. Unknown values are ignored. */
export function parseForumFilters(raw: RawParams): ForumFilters {
  const topic = one(raw, "topic");
  const locality = one(raw, "locality");
  const sort = one(raw, "sort");
  return {
    topic: topic && FORUM_TOPICS.some((t) => t.slug === topic) ? topic : null,
    locality: locality && getLocality(locality) ? locality : null,
    sort: (FORUM_SORTS as readonly string[]).includes(sort ?? "") ? (sort as ForumSort) : "recent",
  };
}

/** The query for a forum link (defaults omitted). Feed it to routes.community(). */
export function forumQuery(f: Partial<ForumFilters>): { topic?: string; locality?: string; sort?: string } {
  return {
    ...(f.topic ? { topic: f.topic } : {}),
    ...(f.locality ? { locality: f.locality } : {}),
    ...(f.sort && f.sort !== "recent" ? { sort: f.sort } : {}),
  };
}

// ── Thread status ────────────────────────────────────────────────────────────

export type ThreadStatusKind = "resolved" | "answered" | "unanswered" | "open";

/** From the card's English status label ("Resolved", "Pharmacist answered", "Unanswered", "Open"). */
export function threadStatusKind(t: { status: string; statusLabel: string }): { kind: ThreadStatusKind; who: string | null } {
  if (t.status === "resolved") return { kind: "resolved", who: null };
  const m = /^(.+) answered$/.exec(t.statusLabel);
  if (m) return { kind: "answered", who: m[1] };
  if (t.statusLabel === "Unanswered") return { kind: "unanswered", who: null };
  return { kind: "open", who: null };
}

/** The "Unanswered" sort: open threads nobody has resolved or answered with authority. */
export function isUnanswered(t: { status: string; statusLabel: string }): boolean {
  const k = threadStatusKind(t).kind;
  return k === "open" || k === "unanswered";
}

// ── "3 days ago" ─────────────────────────────────────────────────────────────

export type Ago = { unit: "now" | "min" | "hour" | "day" | "week" | "date"; n: number };

/** How long ago `at` was, seen from `now` (both ISO strings). Over 8 weeks → "date". */
export function agoParts(at: string, now: string): Ago {
  const mins = Math.max(0, Math.round((Date.parse(now) - Date.parse(at)) / 60_000));
  if (mins < 1) return { unit: "now", n: 0 };
  if (mins < 60) return { unit: "min", n: mins };
  const hours = Math.round(mins / 60);
  if (hours < 24) return { unit: "hour", n: hours };
  const days = Math.round(hours / 24);
  if (days < 14) return { unit: "day", n: days };
  if (days < 60) return { unit: "week", n: Math.round(days / 7) };
  return { unit: "date", n: 0 };
}

export type AgoStrings = { justNow: string; min: string; hour: string; hours: string; day: string; days: string; weeks: string };

/** "40 min ago", "5 hours ago", "1 day ago"; `date` formats anything older than eight weeks. */
export function formatAgo(t: AgoStrings, at: string, now: string, date: (iso: string) => string): string {
  const a = agoParts(at, now);
  switch (a.unit) {
    case "now":
      return t.justNow;
    case "min":
      return fill(t.min, { n: a.n });
    case "hour":
      return plural(a.n, t.hour, t.hours);
    case "day":
      return plural(a.n, t.day, t.days);
    case "week":
      return fill(t.weeks, { n: a.n });
    default:
      return date(at);
  }
}

// ── "Verified listings that match" on a thread ───────────────────────────────

export type ThreadMatchKind = "pharmacy_24h" | "lab_home_collection";

export type ThreadMatches = {
  kind: ThreadMatchKind;
  count: number;
  /** The thread's locality (the place named in "near …"). */
  localitySlug: string;
  /** For the "See them" link: routes.search(lang, { type, q }). */
  search: { type: "pharmacy" | "lab"; q: string };
};

/** Localities counted as "near" a thread's locality: itself and its two nearest neighbours. */
export function nearSlugs(localitySlug: string): string[] {
  return [localitySlug, ...nearbyLocalities(localitySlug, { limit: 2 }).map((l) => l.slug)];
}

/**
 * Verified listings that answer a thread's question: chemists open 24 hours for "Pharmacy &
 * after-hours", labs with home collection for "Diagnostics", counted in the thread's locality and
 * its two nearest neighbours. Only listings that were checked count. Null when nothing matches.
 */
export function matchThread(topicSlug: string, localitySlug: string | null, docs: Pick<SearchDoc, "kind" | "localitySlug" | "open24h" | "homeCollection" | "lastCheckedAt">[]): ThreadMatches | null {
  if (!localitySlug || !getLocality(localitySlug)) return null;
  const near = new Set(nearSlugs(localitySlug));
  const checked = (d: (typeof docs)[number]) => !!d.lastCheckedAt && !!d.localitySlug && near.has(d.localitySlug);
  if (topicSlug === "pharmacy-after-hours") {
    const count = docs.filter((d) => d.kind === "pharmacy" && d.open24h && checked(d)).length;
    return count ? { kind: "pharmacy_24h", count, localitySlug, search: { type: "pharmacy", q: "24 hours" } } : null;
  }
  if (topicSlug === "diagnostics") {
    const count = docs.filter((d) => d.kind === "lab" && d.homeCollection && checked(d)).length;
    return count ? { kind: "lab_home_collection", count, localitySlug, search: { type: "lab", q: "home collection" } } : null;
  }
  return null;
}

/** "GCER" for Golf Course Ext. Road (an all-capitals alias residents use), else the name. */
export function placeShort(L: Pick<Locality, "name" | "aliases">): string {
  return L.aliases.find((a) => /^[A-Z]{3,6}$/.test(a)) ?? L.name;
}

// ── Healthy Neighbourhoods ───────────────────────────────────────────────────

/** "Sector 57 Residents' Welfare Association" → "sector-57-residents-welfare-association". */
export function societySlug(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base.length >= 3 ? base : `society-${base || "group"}`;
}

/** "Sector 57 Residents' Welfare Association" → "57"; "Palm Grove Apartments" → "PG". */
export function societyBadge(name: string): string {
  const num = /\b(\d{1,3})\b/.exec(name);
  if (num) return num[1];
  const letters = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(the|of|and|rwa)$/i.test(w))
    .map((w) => w[0].toUpperCase());
  return letters.slice(0, 2).join("") || "HN";
}

/** The first comma-separated part of a venue: "Sector 57 Community Centre, near the main market" → "Sector 57 Community Centre". */
export function venueShort(venue: string | null): string | null {
  if (!venue) return null;
  const first = venue.split(/[,(]/)[0].trim();
  return first || venue;
}

// ── Volunteer roles ──────────────────────────────────────────────────────────

export const ROLE_AUDIENCES = ["resident", "student", "professional"] as const;
export type RoleAudience = (typeof ROLE_AUDIENCES)[number];

/** ?for=resident|student|professional (anything else: all roles). */
export function parseRoleFilter(raw: RawParams): RoleAudience | null {
  const v = one(raw, "for");
  return (ROLE_AUDIENCES as readonly string[]).includes(v ?? "") ? (v as RoleAudience) : null;
}

// ── Dates ────────────────────────────────────────────────────────────────────

/** "15 Nov" (Hindi "15 नवंबर"), India time. */
export function dayMonth(lang: "en" | "hi", iso: string): string {
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: lang === "hi" ? "long" : "short" })
    .format(new Date(iso))
    .replace("Sept", "Sep");
}

/** "SEP 2026" for the completed-initiative cards (Hindi "सितंबर 2026"). */
export function monthYearLabel(lang: "en" | "hi", iso: string): string {
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", month: lang === "hi" ? "long" : "short", year: "numeric" })
    .format(new Date(iso))
    .replace("Sept", "Sep");
}
