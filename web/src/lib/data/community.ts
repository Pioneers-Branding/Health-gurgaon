// Ask your neighbourhood, Healthy Neighbourhoods (societies) and volunteer roles. Server-only.
// Public reads are cached; the society dashboard is private and request-time.

import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/permissions";
import { tags } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { FORUM_TOPICS, SOCIETY_TYPE_LABELS, VOLUNTEER_AUDIENCE_LABELS } from "@/lib/domain";
import { getLocality } from "@/lib/localities";

import { matchThread, type ThreadMatches } from "@/components/community/logic";

import { eventCardSelect, iso, threadCardSelect, toEventCard, toThreadCard, type EventCard, type ThreadCard } from "./mappers";
import { getSearchCatalogue } from "./search";

export type { ThreadCard };

// ── Threads ─────────────────────────────────────────────────────────────────

export type ThreadSort = "recent" | "helpful" | "unanswered";

/** The forum list. Filters: topic slug, locality slug, provider slug; sorts as on the prototype
 * (Recent, Most helpful, Unanswered = no replies or still open). */
export async function getThreads(opts: { topic?: string | null; locality?: string | null; provider?: string | null; sort?: ThreadSort; limit?: number } = {}): Promise<ThreadCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.threads);
  const rows = await db.thread.findMany({
    where: {
      status: opts.sort === "unanswered" ? "open" : { in: ["open", "resolved"] },
      ...(opts.topic ? { topicSlug: opts.topic } : {}),
      ...(opts.locality ? { localitySlug: opts.locality } : {}),
      ...(opts.provider ? { provider: { slug: opts.provider } } : {}),
    },
    select: threadCardSelect,
    orderBy: opts.sort === "helpful" ? [{ helpfulCount: "desc" }, { lastActivityAt: "desc" }] : [{ createdAt: "desc" }],
    take: opts.limit ?? 50,
  });
  return rows.map(toThreadCard);
}

/** Topic list with thread counts ("All topics 7, Pharmacy & after-hours 1, …"). */
export async function getTopicCounts(): Promise<{ total: number; topics: { slug: string; label: string; labelHi: string; count: number }[] }> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.threads);
  const rows = await db.thread.groupBy({ by: ["topicSlug"], where: { status: { in: ["open", "resolved"] } }, _count: { _all: true } });
  const topics = FORUM_TOPICS.map((t) => ({ slug: t.slug, label: t.label, labelHi: t.labelHi, count: rows.find((r) => r.topicSlug === t.slug)?._count._all ?? 0 }));
  return { total: topics.reduce((n, t) => n + t.count, 0), topics };
}

export type PostDTO = {
  id: string;
  authorLabel: string;
  /** "Verified pharmacist": only for verified professionals. */
  professionalLabel: string | null;
  isProviderAnswer: boolean;
  body: string;
  helpfulCount: number;
  isBest: boolean;
  createdAt: string;
};

export type ThreadDetail = ThreadCard & { body: string | null; resolvedAt: string | null; posts: PostDTO[] };

/** /gurgaon/community/t/<id>: the question and its published replies (best answer first, then
 * oldest first). Null for unknown, pending or removed threads. */
export async function getThread(id: string): Promise<ThreadDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.thread(id), tags.threads);
  const t = await db.thread.findUnique({
    where: { id },
    select: {
      ...threadCardSelect,
      body: true,
      resolvedAt: true,
      posts: { where: { status: "published" }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!t || (t.status !== "open" && t.status !== "resolved")) return null;
  const posts = [...t.posts].sort((a, b) => Number(b.isBest) - Number(a.isBest) || a.createdAt.getTime() - b.createdAt.getTime());
  return {
    ...toThreadCard(t),
    body: t.body,
    resolvedAt: iso(t.resolvedAt),
    posts: posts.map((p) => ({
      id: p.id,
      authorLabel: p.authorLabel,
      professionalLabel: p.professionalLabel,
      isProviderAnswer: p.isProviderAnswer,
      body: p.body,
      helpfulCount: p.helpfulCount,
      isBest: p.isBest,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

// ── Societies ───────────────────────────────────────────────────────────────

export type SocietyCard = { slug: string; name: string; shortName: string; badgeText: string; areaLabel: string | null; localitySlug: string | null; memberSince: string | null; verified: boolean };

export async function getSocieties(): Promise<SocietyCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.societies);
  const rows = await db.society.findMany({ where: { status: "verified" }, orderBy: { name: "asc" } });
  return rows.map((s) => ({ slug: s.slug, name: s.name, shortName: s.shortName, badgeText: s.badgeText, areaLabel: s.areaLabel, localitySlug: s.localitySlug, memberSince: iso(s.memberSince), verified: true }));
}

export type SocietyProfile = SocietyCard & {
  groupTypeLabel: string;
  localityName: string | null;
  upcoming: EventCard[];
  completed: { title: string; heldOn: string; summary: string }[];
  volunteerNeeds: { title: string; detail: string }[];
  localResources: string | null;
};

/** /gurgaon/society/<slug>: public profile. Contact details are never included. */
export async function getSociety(slug: string): Promise<SocietyProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.society(slug), tags.societies, tags.events);
  const s = await db.society.findUnique({
    where: { slug },
    include: {
      initiatives: { where: { published: true }, orderBy: { heldOn: "desc" } },
      volunteerNeeds: { where: { open: true }, orderBy: { createdAt: "asc" } },
      events: { where: { status: { in: ["verified", "awaiting_review"] }, startsAt: { gte: new Date() } }, select: eventCardSelect, orderBy: { startsAt: "asc" } },
    },
  });
  if (!s || s.status !== "verified") return null;
  return {
    slug: s.slug,
    name: s.name,
    shortName: s.shortName,
    badgeText: s.badgeText,
    areaLabel: s.areaLabel,
    localitySlug: s.localitySlug,
    memberSince: iso(s.memberSince),
    verified: true,
    groupTypeLabel: SOCIETY_TYPE_LABELS[s.groupType],
    localityName: getLocality(s.localitySlug)?.name ?? null,
    upcoming: s.events.map(toEventCard),
    completed: s.initiatives.map((i) => ({ title: i.title, heldOn: i.heldOn.toISOString(), summary: i.summary })),
    volunteerNeeds: s.volunteerNeeds.map((n) => ({ title: n.title, detail: n.detail })),
    localResources: s.localResources,
  };
}

export async function listSocietySlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.societies);
  return (await db.society.findMany({ where: { status: "verified" }, select: { slug: true } })).map((s) => s.slug);
}

export type SocietyDashboard = {
  society: SocietyCard;
  /** What the viewer may do: admins and editors of the society edit; viewers see offers only. */
  permission: "admin" | "editor" | "viewer" | "staff";
  stats: { eventsThisQuarter: number; awaitingVerification: number; volunteerOffers: number; profileViews30d: number };
  events: (EventCard & { reportDue: boolean })[];
  offers: { id: string; displayName: string; detail: string; status: string }[];
  team: { name: string; title: string; permission: string }[];
};

/** /gurgaon/society/<slug>/dashboard (private). Request-time: call under <Suspense>. Returns null
 * when the signed-in user isn't on the society's team (or staff); the page then calls notFound(). */
export async function getSocietyDashboard(slug: string): Promise<SocietyDashboard | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const s = await db.society.findUnique({
    where: { slug },
    include: {
      members: true,
      volunteerOffers: { orderBy: { createdAt: "asc" } },
      events: { select: { id: true, ...eventCardSelect, reportSummary: true }, orderBy: { startsAt: "desc" } },
      initiatives: { select: { eventId: true } },
    },
  });
  if (!s) return null;
  const membership = s.members.find((m) => m.userId === user.id);
  if (!membership && !isStaff(user.role)) return null;
  const now = new Date();
  const quarterStart = new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1));
  const reported = new Set(s.initiatives.map((i) => i.eventId).filter(Boolean));
  const events = s.events.map((e) => ({ ...toEventCard(e), reportDue: e.status === "completed" && !e.reportSummary && !reported.has(e.id) }));
  return {
    society: { slug: s.slug, name: s.name, shortName: s.shortName, badgeText: s.badgeText, areaLabel: s.areaLabel, localitySlug: s.localitySlug, memberSince: iso(s.memberSince), verified: s.status === "verified" },
    permission: membership ? (membership.permission as "admin" | "editor" | "viewer") : "staff",
    stats: {
      eventsThisQuarter: s.events.filter((e) => e.startsAt >= quarterStart).length,
      awaitingVerification: s.events.filter((e) => e.status === "awaiting_review").length,
      volunteerOffers: s.volunteerOffers.length,
      profileViews30d: s.profileViews30d,
    },
    events,
    offers: s.volunteerOffers.map((o) => ({ id: o.id, displayName: o.displayName, detail: o.detail, status: o.status })),
    team: s.members.map((m) => ({ name: m.name, title: m.title, permission: m.permission })),
  };
}

// ── Volunteer roles ─────────────────────────────────────────────────────────

export type VolunteerRoleDTO = {
  slug: string;
  title: string;
  description: string;
  timeCommitment: string;
  pay: string;
  payLabel: string;
  audience: string;
  audienceLabel: string;
  access: string;
  requiresRegistration: boolean;
};

export async function getVolunteerRoles(): Promise<VolunteerRoleDTO[]> {
  "use cache";
  cacheLife("days");
  cacheTag(tags.volunteerRoles);
  const rows = await db.volunteerRole.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    description: r.description,
    timeCommitment: r.timeCommitment,
    pay: r.pay,
    payLabel: r.payLabel,
    audience: r.audience,
    audienceLabel: VOLUNTEER_AUDIENCE_LABELS[r.audience],
    access: r.access,
    requiresRegistration: r.requiresRegistration,
  }));
}

// ── Community pages: added for the forum, thread, society and dashboard pages ─────────────────

/** "Now" for "3 days ago" on community pages: the time this cache entry was filled (cached for
 * minutes, refreshed when threads change), so Server Components never read the clock. */
export async function getCommunityNow(): Promise<string> {
  "use cache";
  cacheLife("minutes");
  cacheTag(tags.threads);
  return new Date().toISOString();
}

/** Thread ids for generateStaticParams (published threads). */
export async function listThreadIds(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.threads);
  return (await db.thread.findMany({ where: { status: { in: ["open", "resolved"] } }, select: { id: true }, orderBy: { createdAt: "desc" } })).map((t) => t.id);
}

export type ThreadView = {
  thread: ThreadDetail;
  /** Signed "a resident of Sector 65" (the default) rather than the asker's own label. */
  anonymous: boolean;
  /** "Verified listings that match: 2 chemists near GCER confirmed open 24 hours". */
  matches: ThreadMatches | null;
};

/** /gurgaon/community/t/<id>: the thread, how the asker is shown, and verified listings that
 * answer it. Null for unknown, pending or removed threads. */
export async function getThreadView(id: string): Promise<ThreadView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.thread(id), tags.threads, tags.providers);
  const thread = await getThread(id);
  if (!thread) return null;
  const [row, catalogue] = await Promise.all([db.thread.findUnique({ where: { id }, select: { anonymous: true } }), getSearchCatalogue()]);
  return { thread, anonymous: row?.anonymous ?? true, matches: matchThread(thread.topic.slug, thread.localitySlug, catalogue.providers) };
}

export type PendingPost = { id: string; body: string; createdAt: string; authorLabel: string; professionalLabel: string | null };

export type ThreadViewer = {
  signedIn: boolean;
  /** The signed-in person asked this question (may resolve it and mark the most helpful reply). */
  isAsker: boolean;
  following: boolean;
  /** Posts this person marked helpful. */
  helpful: string[];
  /** Their own published posts (they can't mark those helpful). */
  ownPosts: string[];
  /** Their replies waiting for a moderator (only they see these). */
  pending: PendingPost[];
};

const SIGNED_OUT_VIEWER: ThreadViewer = { signedIn: false, isAsker: false, following: false, helpful: [], ownPosts: [], pending: [] };

/** Request-time: what the signed-in person may do on a thread. Call under <Suspense>. */
export async function getThreadViewer(id: string): Promise<ThreadViewer> {
  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT_VIEWER;
  const [thread, follow, reactions, posts] = await Promise.all([
    db.thread.findUnique({ where: { id }, select: { authorId: true } }),
    db.follow.findUnique({ where: { userId_kind_targetId: { userId: user.id, kind: "thread", targetId: id } }, select: { id: true } }),
    db.postReaction.findMany({ where: { userId: user.id, kind: "helpful", post: { threadId: id } }, select: { postId: true } }),
    db.post.findMany({ where: { threadId: id, authorId: user.id, status: { in: ["published", "pending"] } }, orderBy: { createdAt: "asc" } }),
  ]);
  return {
    signedIn: true,
    isAsker: !!thread?.authorId && thread.authorId === user.id,
    following: !!follow,
    helpful: reactions.map((r) => r.postId),
    ownPosts: posts.filter((p) => p.status === "published").map((p) => p.id),
    pending: posts
      .filter((p) => p.status === "pending")
      .map((p) => ({ id: p.id, body: p.body, createdAt: p.createdAt.toISOString(), authorLabel: p.authorLabel, professionalLabel: p.professionalLabel })),
  };
}

/** Request-time: topic slugs the signed-in person follows (null when signed out). */
export async function getMyTopicFollows(): Promise<string[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db.follow.findMany({ where: { userId: user.id, kind: "topic" }, select: { targetId: true } });
  return rows.map((r) => r.targetId);
}

export type SocietyMeta = { slug: string; name: string; shortName: string; verified: boolean; sample: boolean };

/** Any registered society (verified or waiting), for the dashboard's 404 check and the profile's
 * "sample profile" note. Null for unknown slugs. */
export async function getSocietyMeta(slug: string): Promise<SocietyMeta | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.society(slug), tags.societies);
  const s = await db.society.findUnique({ where: { slug }, select: { slug: true, name: true, shortName: true, status: true, sample: true } });
  return s && s.status !== "rejected" ? { slug: s.slug, name: s.name, shortName: s.shortName, verified: s.status === "verified", sample: s.sample } : null;
}

export type SocietyDashboardView = SocietyDashboard & {
  /** Accept or decline offers and publish activity reports: the society's admins and editors, and
   * site admins (the plan: "Manage society profile" = RWA rep for their own society, Admin). */
  canManage: boolean;
};

/** Request-time, under <Suspense>: the private dashboard for the society's team (any permission;
 * viewers see offers only) and site admins. Null for everyone else (the page shows a 404). */
export async function getSocietyDashboardView(slug: string): Promise<SocietyDashboardView | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const d = await getSocietyDashboard(slug);
  if (!d) return null;
  // getSocietyDashboard also opens it to moderators and editors; the plan's table gives society
  // management to the society's own team and admins only.
  if (d.permission === "staff" && user.role !== "admin") return null;
  return { ...d, canManage: d.permission === "admin" || d.permission === "editor" || user.role === "admin" };
}

/** Request-time: the signed-in person's place on a society's team ("admin" | "editor" | "viewer"),
 * "staff" for site admins, or null. For the "Society dashboard →" link on the public profile. */
export async function getMySocietyRole(slug: string): Promise<"admin" | "editor" | "viewer" | "staff" | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const member = await db.societyMember.findFirst({ where: { userId: user.id, society: { slug } }, select: { permission: true } });
  if (member) return member.permission as "admin" | "editor" | "viewer";
  return user.role === "admin" ? "staff" : null;
}
