// The signed-in person's own data: the account, saved items, follows, "My reviews & reports"
// and messages/consent. Server-only. Prototype: "Health Gurgaon Account.dc.html".
//
// Each exported function reads the session itself (request-time: call it under <Suspense>) and
// passes only the user id to an unexported cached function tagged per user, so one person can
// never ask for another's data. Actions expire the tags (tags.saved(userId) etc.).

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { AlertPref, ConsentPurpose, EventStatus, FollowKind, ReportStatus, ReportType, ReviewStatus, SavedKind } from "@prisma/client";

import { pendingEmail } from "@/lib/auth/email-verification";
import { maskPhone } from "@/lib/auth/phone";
import { getCurrentUser } from "@/lib/auth/session";
import { tags } from "@/lib/cache-tags";
import { getConsentHistory, getConsentSummary, type ConsentRecordEntry, type MessageTypeSummary } from "@/lib/consent";
import { addWorkingDays, iso } from "@/lib/dates";
import { db } from "@/lib/db";
import {
  CONCERN_STATUS_LABELS,
  DISPUTE_REVIEW_WORKING_DAYS,
  DISPUTE_STATUS_LABELS,
  EVENT_STATUS_LABELS,
  FOLLOW_ALERT_PURPOSE,
  PROFILE_KIND_OF,
  PUBLIC_EVENT_STATUSES,
  REPORT_ANSWER_WORKING_DAYS,
  REPORT_FIELDS,
  REPORT_STATUS_LABELS,
  REVIEW_MODERATION_HOURS,
  REVIEW_STATUS_LABELS,
  SUBMITTED_EVENT_STATUS_LABELS,
  type ProfileKind,
} from "@/lib/domain";
import type { Redaction, TimelineEntry } from "@/lib/json-types";
import { getLocality } from "@/lib/localities";
import { maskEmail } from "@/lib/redact";
import { reviewLabelOptions } from "@/lib/review-label";
import { resolveTargets, type ResolvedTarget } from "@/lib/targets";

const FOLLOW_PURPOSE = FOLLOW_ALERT_PURPOSE;

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const asTimeline = (v: unknown): TimelineEntry[] => (Array.isArray(v) ? (v as TimelineEntry[]) : []);

// ── The account ─────────────────────────────────────────────────────────────

export type MyAccount = {
  id: string;
  role: string;
  phoneMasked: string;
  /** The confirmed address for messages (the owner's own pages only), masked for display. */
  email: string | null;
  emailMasked: string | null;
  emailVerifiedAt: string | null;
  /** Waiting for its link to be opened. */
  emailPending: { email: string; expiresAt: string } | null;
  /** Language for messages and sign-in codes. */
  messageLang: "en" | "hi";
  area: string | null;
  locality: { slug: string; name: string } | null;
  reviewLabel: string;
  reviewLabelOptions: string[];
  firstSignedInAt: string;
  /** "3 REVIEWS · 4 REPORTS · 3 EVENTS · 1 DISPUTE" and the other "What we keep" counts. */
  counts: { savedPlaces: number; savedEvents: number; savedOther: number; follows: number; reviews: number; reports: number; events: number; disputes: number; consentEntries: number };
};

async function accountFor(userId: string): Promise<MyAccount | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(tags.consent(userId), tags.saved(userId), tags.follows(userId), tags.activity(userId));
  const u = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      phone: true,
      email: true,
      emailVerifiedAt: true,
      lang: true,
      area: true,
      localitySlug: true,
      reviewLabel: true,
      phoneVerifiedAt: true,
      createdAt: true,
      deletedAt: true,
      _count: { select: { follows: true, reviews: true, reports: true, events: true, disputes: true, consents: true } },
    },
  });
  if (!u || u.deletedAt) return null;
  const [saved, pending] = await Promise.all([db.savedItem.groupBy({ by: ["kind"], where: { userId }, _count: { _all: true } }), pendingEmail(userId)]);
  const savedCount = (k: SavedKind) => saved.find((s) => s.kind === k)?._count._all ?? 0;
  const L = getLocality(u.localitySlug);
  return {
    id: u.id,
    role: u.role,
    phoneMasked: maskPhone(u.phone),
    email: u.emailVerifiedAt ? u.email : null,
    emailMasked: u.emailVerifiedAt && u.email ? maskEmail(u.email) : null,
    emailVerifiedAt: iso(u.emailVerifiedAt),
    emailPending: pending ? { email: pending.email, expiresAt: pending.expiresAt.toISOString() } : null,
    messageLang: u.lang === "hi" ? "hi" : "en",
    area: u.area,
    locality: L ? { slug: L.slug, name: L.name } : null,
    reviewLabel: reviewLabelOptions(u)[0],
    reviewLabelOptions: reviewLabelOptions(u),
    firstSignedInAt: (u.phoneVerifiedAt ?? u.createdAt).toISOString(),
    counts: {
      savedPlaces: savedCount("provider"),
      savedEvents: savedCount("event"),
      savedOther: saved.reduce((n, s) => n + s._count._all, 0) - savedCount("provider") - savedCount("event"),
      follows: u._count.follows,
      reviews: u._count.reviews,
      reports: u._count.reports,
      events: u._count.events,
      disputes: u._count.disputes,
      consentEntries: u._count.consents,
    },
  };
}

/** The account header, "Your data" counts and "How your reviews and posts are signed". */
export async function getMyAccount(): Promise<MyAccount | null> {
  const user = await getCurrentUser();
  return user ? accountFor(user.id) : null;
}

// ── Saved ───────────────────────────────────────────────────────────────────

export type ListingChangeView = { field: string; summary: string; source: string | null; changedAt: string; reportRef: string | null };
export type MyReportOnItem = { ref: string; status: ReportStatus; statusLabel: string; field: string | null; dueAt: string; resolution: string | null; resolvedAt: string | null };

export type SavedEntry = ResolvedTarget & {
  savedAt: string;
  /** Saved places: what a resident needs to see what changed since they saved it. */
  provider?: {
    profileKind: ProfileKind;
    initials: string;
    headline: string;
    area: string | null;
    badges: string[];
    lastCheckedAt: string | null;
    sponsored: boolean;
    sponsorLabel: string | null;
    fee: number | null;
    followUp: string | null;
    hoursSummary: string | null;
    open24h: boolean;
    /** Who confirmed the hours ("Hospital front desk"), for the "re-confirmed" source line. */
    hoursSource: string | null;
    /** A listed 24×7 emergency department ("24×7 emergency department confirmed"). */
    emergency24x7: boolean;
    /** "Little Steps Clinic, Sushant Lok 1": where a doctor's timings apply. */
    practiceLabel: string | null;
    qualifications: string | null;
    /** "Sunday hours are now 7 am – 1 pm. They were 7 – 11 am." Newest first. */
    changesSinceSaved: ListingChangeView[];
    /** Re-checked after it was saved (lastCheckedAt > savedAt): "RE-CONFIRMED · NO CHANGE" when there are no changes. */
    recheckedSinceSaved: boolean;
    /** The person's own reports about this place, newest first ("your report HG-3107"). */
    myReports: MyReportOnItem[];
  };
  /** Saved events: status now, and whether it was verified after it was saved. */
  event?: {
    startsAt: string;
    endsAt: string | null;
    timeLabel: string;
    venue: string | null;
    status: EventStatus;
    statusLabel: string;
    verifiedAt: string | null;
    source: string | null;
    verifiedSinceSaved: boolean;
    /** "We called the organiser, the Sector 57 RWA secretary." (the timeline's verified note). */
    verifiedNote: string | null;
    cost: string;
    eligibility: string | null;
    organiserName: string;
    localitySlug: string | null;
  };
};

async function savedFor(userId: string): Promise<SavedEntry[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(tags.saved(userId), tags.activity(userId), tags.providers, tags.events);
  const rows = await db.savedItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  const resolved = await resolveTargets(rows);
  const providerSlugs = rows.filter((r) => r.kind === "provider").map((r) => r.targetId);
  const eventSlugs = rows.filter((r) => r.kind === "event").map((r) => r.targetId);
  const [providers, events] = await Promise.all([
    providerSlugs.length
      ? db.provider.findMany({
          where: { slug: { in: providerSlugs } },
          select: {
            id: true,
            slug: true,
            kind: true,
            initials: true,
            headline: true,
            areaLabel: true,
            badges: true,
            lastCheckedAt: true,
            sponsored: true,
            sponsorLabel: true,
            consultationFee: true,
            followUpTerms: true,
            hoursSummary: true,
            open24h: true,
            hoursSource: true,
            emergency: true,
            practiceLabel: true,
            qualifications: true,
            changes: { orderBy: { changedAt: "desc" }, take: 10 },
          },
        })
      : [],
    eventSlugs.length
      ? db.event.findMany({
          where: { slug: { in: eventSlugs } },
          select: {
            slug: true,
            startsAt: true,
            endsAt: true,
            timeLabel: true,
            venue: true,
            status: true,
            verifiedAt: true,
            source: true,
            timeline: true,
            cost: true,
            eligibility: true,
            organiserName: true,
            localitySlug: true,
          },
        })
      : [],
  ]);
  const reports = providers.length
    ? await db.report.findMany({ where: { reporterId: userId, targetKind: "provider", targetId: { in: providers.map((p) => p.id) } }, orderBy: { createdAt: "desc" } })
    : [];

  // Changed places first (as on the Saved page), then newest saves.
  const entries = rows.flatMap((r): SavedEntry[] => {
    const t = resolved.get(`${r.kind}:${r.targetId}`);
    if (!t) return [];
    const entry: SavedEntry = { ...t, savedAt: r.createdAt.toISOString() };
    const p = r.kind === "provider" ? providers.find((x) => x.slug === r.targetId) : undefined;
    if (p) {
      const changes = p.changes.filter((c) => c.changedAt > r.createdAt);
      entry.provider = {
        profileKind: PROFILE_KIND_OF[p.kind],
        initials: p.initials,
        headline: p.headline,
        area: p.areaLabel,
        badges: asStrings(p.badges),
        lastCheckedAt: iso(p.lastCheckedAt),
        sponsored: p.sponsored,
        sponsorLabel: p.sponsorLabel,
        fee: p.consultationFee,
        followUp: p.followUpTerms,
        hoursSummary: p.hoursSummary,
        open24h: p.open24h,
        hoursSource: p.hoursSource,
        emergency24x7: !!(p.emergency && typeof p.emergency === "object" && (p.emergency as { available24x7?: unknown }).available24x7 === true),
        practiceLabel: p.practiceLabel,
        qualifications: p.qualifications,
        changesSinceSaved: changes.map((c) => ({ field: c.field, summary: c.summary, source: c.source, changedAt: c.changedAt.toISOString(), reportRef: c.reportRef })),
        recheckedSinceSaved: !!p.lastCheckedAt && p.lastCheckedAt > r.createdAt,
        myReports: reports
          .filter((rep) => rep.targetId === p.id)
          .map((rep) => ({
            ref: rep.ref,
            status: rep.status,
            statusLabel: REPORT_STATUS_LABELS[rep.status],
            field: rep.field,
            dueAt: addWorkingDays(rep.createdAt, REPORT_ANSWER_WORKING_DAYS).toISOString(),
            resolution: rep.resolution,
            resolvedAt: iso(rep.resolvedAt),
          })),
      };
    }
    const e = r.kind === "event" ? events.find((x) => x.slug === r.targetId) : undefined;
    if (e) {
      entry.event = {
        startsAt: e.startsAt.toISOString(),
        endsAt: iso(e.endsAt),
        timeLabel: e.timeLabel,
        venue: e.venue,
        status: e.status,
        statusLabel: EVENT_STATUS_LABELS[e.status],
        verifiedAt: iso(e.verifiedAt),
        source: e.source,
        verifiedSinceSaved: !!e.verifiedAt && e.verifiedAt > r.createdAt,
        verifiedNote: asTimeline(e.timeline).find((x) => x.status === "verified")?.note ?? null,
        cost: e.cost,
        eligibility: e.eligibility,
        organiserName: e.organiserName,
        localitySlug: e.localitySlug,
      };
    }
    return [entry];
  });
  const changed = (e: SavedEntry) => (e.provider?.changesSinceSaved.length ? 1 : 0);
  return entries.sort((a, b) => changed(b) - changed(a));
}

/** /account/saved: saved places (changed ones first) and events, with what changed. Null when signed out. */
export async function getMySaved(): Promise<SavedEntry[] | null> {
  const user = await getCurrentUser();
  return user ? savedFor(user.id) : null;
}

/** For a Save button: is this saved? (false when signed out). */
export async function isSaved(kind: SavedKind, targetId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const rows = await savedKeysFor(user.id);
  return rows.includes(`${kind}:${targetId}`);
}

async function savedKeysFor(userId: string): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(tags.saved(userId));
  const rows = await db.savedItem.findMany({ where: { userId }, select: { kind: true, targetId: true } });
  return rows.map((r) => `${r.kind}:${r.targetId}`);
}

// ── Following ───────────────────────────────────────────────────────────────

export type FollowEntry = ResolvedTarget & {
  alert: AlertPref;
  /** The message type its alerts use. */
  purpose: ConsentPurpose;
  /** The person asked for alerts (WhatsApp or email chosen). */
  wantsAlerts: boolean;
  /** …and the message type is on, so alerts are actually sent. When wantsAlerts && !alertsOn:
   * "Off, because “Locality alerts” messages are stopped." */
  alertsOn: boolean;
  followedAt: string;
  /** What's new since following. */
  news: {
    locality?: { covers: string | null; upcoming: { slug: string; title: string; startsAt: string; status: EventStatus }[] };
    thread?: { newReplies: number; status: string; replyCount: number; bestAnswerBy: string | null; area: string | null; topic: string };
    topic?: { newQuestions: number; latest: { id: string; title: string; createdAt: string; replyCount: number; area: string | null } | null };
  };
};

async function followsFor(userId: string): Promise<FollowEntry[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(tags.follows(userId), tags.consent(userId), tags.threads, tags.events);
  const [rows, states] = await Promise.all([
    db.follow.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.consentState.findMany({ where: { userId, granted: true }, select: { purpose: true } }),
  ]);
  const resolved = await resolveTargets(rows);
  const on = new Set(states.map((s) => s.purpose));
  const now = new Date();

  const out: FollowEntry[] = [];
  for (const r of rows) {
    const t = resolved.get(`${r.kind}:${r.targetId}`);
    if (!t) continue;
    const purpose = FOLLOW_PURPOSE[r.kind];
    const wantsAlerts = r.alert === "whatsapp" || r.alert === "email";
    const news: FollowEntry["news"] = {};
    if (r.kind === "locality") {
      const upcoming = await db.event.findMany({
        where: { localitySlug: r.targetId, status: { in: ["verified", "awaiting_review"] }, startsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 5,
        select: { slug: true, title: true, startsAt: true, status: true },
      });
      news.locality = { covers: getLocality(r.targetId)?.covers ?? null, upcoming: upcoming.map((e) => ({ ...e, startsAt: e.startsAt.toISOString() })) };
    } else if (r.kind === "thread") {
      const thread = await db.thread.findUnique({
        where: { id: r.targetId },
        select: { status: true, replyCount: true, areaLabel: true, topicSlug: true, posts: { where: { status: "published" }, select: { createdAt: true, isBest: true, authorLabel: true, professionalLabel: true } } },
      });
      if (thread) {
        const best = thread.posts.find((p) => p.isBest);
        news.thread = {
          newReplies: thread.posts.filter((p) => p.createdAt > r.createdAt).length,
          status: thread.status,
          replyCount: thread.replyCount,
          bestAnswerBy: best ? (best.professionalLabel ?? best.authorLabel) : null,
          area: thread.areaLabel,
          topic: thread.topicSlug,
        };
      }
    } else if (r.kind === "topic") {
      const where = { topicSlug: r.targetId, status: { in: ["open" as const, "resolved" as const] } };
      const [count, latest] = await Promise.all([
        db.thread.count({ where: { ...where, createdAt: { gt: r.createdAt } } }),
        db.thread.findFirst({ where, orderBy: { createdAt: "desc" }, select: { id: true, title: true, createdAt: true, replyCount: true, areaLabel: true } }),
      ]);
      news.topic = { newQuestions: count, latest: latest ? { id: latest.id, title: latest.title, createdAt: latest.createdAt.toISOString(), replyCount: latest.replyCount, area: latest.areaLabel } : null };
    }
    out.push({ ...t, alert: r.alert, purpose, wantsAlerts, alertsOn: wantsAlerts && on.has(purpose), followedAt: r.createdAt.toISOString(), news });
  }
  return out;
}

/** /account/saved → "Following": localities, topics and discussions, with alerts and news. */
export async function getMyFollows(): Promise<FollowEntry[] | null> {
  const user = await getCurrentUser();
  return user ? followsFor(user.id) : null;
}

/** For a Follow button: the follow and its alert preference, or null. */
export async function getFollowState(kind: FollowKind, targetId: string): Promise<{ alert: AlertPref } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const f = await db.follow.findUnique({ where: { userId_kind_targetId: { userId: user.id, kind, targetId } }, select: { alert: true } });
  return f ? { alert: f.alert } : null;
}

// ── My reviews & reports ────────────────────────────────────────────────────

export type ActivityItem = {
  kind: "review" | "report" | "concern" | "dispute" | "claim" | "event" | "question" | "volunteer" | "story" | "reply" | "flag";
  ref: string | null;
  title: string;
  status: string;
  statusLabel: string;
  at: string;
};

/** Where to see something the person sent, built into a URL by the page (routes.*). */
export type MySentLink =
  | { to: "provider"; profileKind: ProfileKind; slug: string }
  | { to: "reviews"; profileKind: ProfileKind; slug: string }
  | { to: "thread"; id: string }
  | { to: "story"; slug: string }
  | { to: "volunteer" };

/** "Other things I sent": profile claims, patient stories, community questions and replies,
 * volunteer applications, and "Report" under a single review or story (ContentFlag rows the
 * person reported). A compact card each: reference, what it is, status and date. */
export type MySentItem = {
  kind: "claim" | "story" | "question" | "reply" | "volunteer" | "flag";
  /** HG-CL-0312, HG-ST-222, HG-CM-1912 (questions and replies: their moderation reference), HG-VOL-413. */
  ref: string | null;
  title: string;
  /** The raw status (ClaimStatus, StoryStatus, ThreadStatus, PostStatus, ApplicationStatus, FlagStatus). */
  status: string;
  /** Flags: the reason the person gave. Replies: the start of the reply. Stories: video | written. */
  note: string | null;
  /** Flags: what was reported ("review" | "story" | "post" | "thread"). */
  target: string | null;
  at: string;
  link: MySentLink | null;
};

export type MyReview = {
  ref: string;
  provider: { slug: string; name: string; headline: string; area: string | null; profileKind: ProfileKind };
  status: ReviewStatus;
  statusLabel: string;
  visitMonth: string;
  text: string;
  /** An edit of a published review waiting for a moderator (the published text stays live). */
  editText: string | null;
  editSubmittedAt: string | null;
  signedAs: string;
  sentAt: string;
  /** "A moderator usually checks within 48 hours, so by Wed 28 Oct." */
  checkBy: string;
  publishedAt: string | null;
  returnedAt: string | null;
  helpful: number;
  reply: string | null;
  replyAt: string | null;
  /** Why it was returned (needs_changes) or not published. */
  moderationReason: string | null;
  suggestion: string | null;
  /** Personal data removed automatically ("A phone number was removed automatically."). */
  redactions: Redaction[];
  /** Last change (a withdrawal can be undone straight after). */
  updatedAt: string;
};

export type MyReport = {
  ref: string;
  type: ReportType;
  /** "timings" → "Timings". */
  field: string | null;
  fieldLabel: string | null;
  targetLabel: string;
  /** What the person told us. */
  details: string;
  status: ReportStatus;
  statusLabel: string;
  receivedAt: string;
  /** Fact reports: answered within 3 working days. */
  dueAt: string;
  resolution: string | null;
  resolvedAt: string | null;
  timeline: TimelineEntry[];
  /** The listing it is about (provider reports), for "Checking with the lab" and its link. */
  targetProfileKind: ProfileKind | null;
  targetSlug: string | null;
};

export type MyEvent = {
  ref: string | null;
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  timeLabel: string;
  venue: string | null;
  locality: string | null;
  cost: string;
  organiserName: string;
  status: EventStatus;
  statusLabel: string;
  /** Visible in the calendar now ("Listed in the calendar as “Awaiting review”"). */
  listed: boolean;
  requestedChanges: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  timeline: TimelineEntry[];
};

export type MyDispute = {
  ref: string;
  target: string;
  itemLabel: string;
  details: string;
  status: string;
  statusLabel: string;
  receivedAt: string;
  /** An editor reviews within 5 working days. */
  dueAt: string;
  outcomeText: string | null;
  outcomePublishedAt: string | null;
};

export type MyActivity = {
  /** "2 things need you": reviews returned for changes and events with changes requested. */
  attention: { kind: "review" | "event"; ref: string | null; title: string; detail: string }[];
  reviews: MyReview[];
  reports: MyReport[];
  /** Concerns (type complaint) took the separate review path; never published. */
  concerns: MyReport[];
  events: MyEvent[];
  disputes: MyDispute[];
  /** Claims, stories, questions, replies, volunteering and review/story reports, newest first. */
  sent: MySentItem[];
  /** Everything above, newest first. */
  items: ActivityItem[];
};

function toReport(
  r: { ref: string; type: ReportType; field: string | null; targetLabel: string; details: string; status: ReportStatus; createdAt: Date; resolution: string | null; resolvedAt: Date | null; timeline: unknown; targetKind?: string | null; targetId?: string | null },
  providers: Map<string, { slug: string; profileKind: ProfileKind }> = new Map(),
): MyReport {
  const target = r.targetKind === "provider" && r.targetId ? providers.get(r.targetId) : undefined;
  return {
    ref: r.ref,
    type: r.type,
    field: r.field,
    fieldLabel: REPORT_FIELDS.find((f) => f.key === r.field)?.label ?? r.field,
    targetLabel: r.targetLabel,
    details: r.details,
    status: r.status,
    statusLabel: r.type === "complaint" ? CONCERN_STATUS_LABELS[r.status] : REPORT_STATUS_LABELS[r.status],
    receivedAt: r.createdAt.toISOString(),
    dueAt: addWorkingDays(r.createdAt, REPORT_ANSWER_WORKING_DAYS).toISOString(),
    resolution: r.resolution,
    resolvedAt: iso(r.resolvedAt),
    timeline: asTimeline(r.timeline),
    targetProfileKind: target?.profileKind ?? null,
    targetSlug: target?.slug ?? null,
  };
}

async function activityFor(userId: string): Promise<MyActivity> {
  "use cache";
  cacheLife("minutes");
  cacheTag(tags.activity(userId));
  const [reviews, reports, disputes, claims, events, threads, applications, stories, posts, flags] = await Promise.all([
    db.review.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      include: { provider: { select: { slug: true, name: true, headline: true, areaLabel: true, kind: true } } },
    }),
    db.report.findMany({ where: { reporterId: userId }, orderBy: { createdAt: "desc" } }),
    db.dispute.findMany({ where: { filerId: userId }, orderBy: { createdAt: "desc" } }),
    db.claim.findMany({ where: { claimantId: userId }, select: { ref: true, status: true, createdAt: true, provider: { select: { name: true, slug: true, kind: true, status: true } } } }),
    db.event.findMany({ where: { submitterId: userId }, orderBy: { startsAt: "desc" } }),
    db.thread.findMany({ where: { authorId: userId }, select: { id: true, status: true, createdAt: true, title: true } }),
    db.volunteerApplication.findMany({ where: { userId }, select: { ref: true, status: true, createdAt: true, role: { select: { title: true } } } }),
    db.story.findMany({ where: { submitterId: userId }, select: { ref: true, slug: true, title: true, providerName: true, format: true, status: true, createdAt: true } }),
    db.post.findMany({ where: { authorId: userId }, select: { id: true, status: true, createdAt: true, body: true, thread: { select: { id: true, title: true, status: true } } } }),
    db.contentFlag.findMany({
      where: { reporterId: userId },
      select: { ref: true, targetKind: true, targetId: true, targetLabel: true, reason: true, status: true, createdAt: true },
    }),
  ]);
  const label = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

  // Questions and replies wait in the community queue under a moderation reference (HG-CM-…);
  // the person sees the same reference. Reports point at reviews and stories: link to where they are.
  const [modRefs, flaggedReviews, flaggedStories] = await Promise.all([
    threads.length || posts.length
      ? db.contentFlag.findMany({
          where: {
            reporterId: null,
            OR: [
              { targetKind: "thread", targetId: { in: threads.map((t) => t.id) } },
              { targetKind: "post", targetId: { in: posts.map((p) => p.id) } },
            ],
          },
          orderBy: { createdAt: "asc" },
          select: { ref: true, targetKind: true, targetId: true },
        })
      : [],
    flags.some((f) => f.targetKind === "review")
      ? db.review.findMany({
          where: { id: { in: flags.filter((f) => f.targetKind === "review").map((f) => f.targetId) } },
          select: { id: true, provider: { select: { slug: true, kind: true, status: true } } },
        })
      : [],
    flags.some((f) => f.targetKind === "story")
      ? db.story.findMany({ where: { id: { in: flags.filter((f) => f.targetKind === "story").map((f) => f.targetId) } }, select: { id: true, slug: true, status: true } })
      : [],
  ]);
  const modRef = (kind: string, id: string) => modRefs.find((m) => m.targetKind === kind && m.targetId === id)?.ref ?? null;
  const PUBLIC_THREAD = ["open", "resolved"];
  const snippet = (s: string, max = 140) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

  const sent: MySentItem[] = [
    ...claims.map(
      (c): MySentItem => ({
        kind: "claim",
        ref: c.ref,
        title: c.provider.name,
        status: c.status,
        note: null,
        target: null,
        at: c.createdAt.toISOString(),
        link: c.provider.status === "published" ? { to: "provider", profileKind: PROFILE_KIND_OF[c.provider.kind], slug: c.provider.slug } : null,
      }),
    ),
    ...stories.map(
      (s): MySentItem => ({
        kind: "story",
        ref: s.ref,
        title: s.providerName,
        status: s.status,
        note: s.format === "written" ? "written" : "video",
        target: null,
        at: s.createdAt.toISOString(),
        link: s.status === "published" ? { to: "story", slug: s.slug } : null,
      }),
    ),
    ...threads.map(
      (t): MySentItem => ({
        kind: "question",
        ref: modRef("thread", t.id),
        title: t.title,
        status: t.status,
        note: null,
        target: null,
        at: t.createdAt.toISOString(),
        link: PUBLIC_THREAD.includes(t.status) ? { to: "thread", id: t.id } : null,
      }),
    ),
    ...posts.map(
      (p): MySentItem => ({
        kind: "reply",
        ref: modRef("post", p.id),
        title: p.thread.title,
        status: p.status,
        note: snippet(p.body),
        target: null,
        at: p.createdAt.toISOString(),
        link: PUBLIC_THREAD.includes(p.thread.status) ? { to: "thread", id: p.thread.id } : null,
      }),
    ),
    ...applications.map(
      (a): MySentItem => ({ kind: "volunteer", ref: a.ref, title: a.role.title, status: a.status, note: null, target: null, at: a.createdAt.toISOString(), link: { to: "volunteer" } }),
    ),
    ...flags.map((f): MySentItem => {
      const review = f.targetKind === "review" ? flaggedReviews.find((r) => r.id === f.targetId) : undefined;
      const story = f.targetKind === "story" ? flaggedStories.find((s) => s.id === f.targetId) : undefined;
      const link: MySentLink | null =
        review && review.provider.status === "published"
          ? { to: "reviews", profileKind: PROFILE_KIND_OF[review.provider.kind], slug: review.provider.slug }
          : story && story.status === "published"
            ? { to: "story", slug: story.slug }
            : null;
      return { kind: "flag", ref: f.ref, title: f.targetLabel, status: f.status, note: snippet(f.reason, 200), target: f.targetKind, at: f.createdAt.toISOString(), link };
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const myReviews: MyReview[] = reviews.map((r) => ({
    ref: r.ref,
    provider: { slug: r.provider.slug, name: r.provider.name, headline: r.provider.headline, area: r.provider.areaLabel, profileKind: PROFILE_KIND_OF[r.provider.kind] },
    status: r.status,
    statusLabel: REVIEW_STATUS_LABELS[r.status],
    visitMonth: r.visitMonth,
    text: r.text,
    editText: r.editText,
    editSubmittedAt: iso(r.editSubmittedAt),
    signedAs: r.authorLabel,
    sentAt: r.createdAt.toISOString(),
    checkBy: new Date((r.editSubmittedAt ?? r.createdAt).getTime() + REVIEW_MODERATION_HOURS * 3_600_000).toISOString(),
    publishedAt: iso(r.publishedAt),
    returnedAt: r.status === "needs_changes" ? iso(r.moderatedAt) : null,
    helpful: r.helpfulCount,
    reply: r.status === "published" ? r.providerReply : null,
    replyAt: r.status === "published" ? iso(r.providerReplyAt) : null,
    moderationReason: r.moderationReason,
    suggestion: r.suggestion,
    redactions: Array.isArray(r.redactions) ? (r.redactions as Redaction[]) : [],
    updatedAt: r.updatedAt.toISOString(),
  }));
  const reportProviderIds = reports.filter((r) => r.targetKind === "provider" && r.targetId).map((r) => r.targetId as string);
  const reportProviders = new Map(
    (reportProviderIds.length ? await db.provider.findMany({ where: { id: { in: reportProviderIds } }, select: { id: true, slug: true, kind: true } }) : []).map(
      (p) => [p.id, { slug: p.slug, profileKind: PROFILE_KIND_OF[p.kind] }] as const,
    ),
  );
  const myReports = reports.filter((r) => r.type !== "complaint").map((r) => toReport(r, reportProviders));
  const concerns = reports.filter((r) => r.type === "complaint").map((r) => toReport(r, reportProviders));
  const myEvents: MyEvent[] = events.map((e) => ({
    ref: e.ref,
    slug: e.slug,
    title: e.title,
    startsAt: e.startsAt.toISOString(),
    endsAt: iso(e.endsAt),
    timeLabel: e.timeLabel,
    venue: e.venue,
    locality: e.localitySlug,
    cost: e.cost,
    organiserName: e.organiserName,
    status: e.status,
    statusLabel: SUBMITTED_EVENT_STATUS_LABELS[e.status],
    listed: (PUBLIC_EVENT_STATUSES as readonly string[]).includes(e.status),
    requestedChanges: e.requestedChanges,
    submittedAt: iso(e.submittedAt),
    verifiedAt: iso(e.verifiedAt),
    timeline: asTimeline(e.timeline),
  }));
  const myDisputes: MyDispute[] = disputes.map((d) => ({
    ref: d.ref,
    target: d.target,
    itemLabel: d.itemLabel,
    details: d.details,
    status: d.status,
    statusLabel: DISPUTE_STATUS_LABELS[d.status],
    receivedAt: d.createdAt.toISOString(),
    dueAt: addWorkingDays(d.createdAt, DISPUTE_REVIEW_WORKING_DAYS).toISOString(),
    outcomeText: d.outcomeText,
    outcomePublishedAt: iso(d.outcomePublishedAt),
  }));

  const attention: MyActivity["attention"] = [
    ...myReviews
      .filter((r) => r.status === "needs_changes")
      .map((r) => ({ kind: "review" as const, ref: r.ref, title: `Fix your review of ${r.provider.name}`, detail: r.moderationReason ?? "A moderator returned it for changes." })),
    ...myEvents
      .filter((e) => e.status === "changes_requested")
      .map((e) => ({ kind: "event" as const, ref: e.ref, title: `Make the changes to “${e.title}”`, detail: e.requestedChanges ?? "The editors asked for changes." })),
  ];

  const items: ActivityItem[] = [
    ...myReviews.map((r) => ({ kind: "review" as const, ref: r.ref, title: `Review of ${r.provider.name}`, status: r.status, statusLabel: r.statusLabel, at: r.sentAt })),
    ...myReports.map((r) => ({ kind: "report" as const, ref: r.ref, title: r.targetLabel, status: r.status, statusLabel: r.statusLabel, at: r.receivedAt })),
    ...concerns.map((r) => ({ kind: "concern" as const, ref: r.ref, title: r.targetLabel, status: r.status, statusLabel: r.statusLabel, at: r.receivedAt })),
    ...myDisputes.map((d) => ({ kind: "dispute" as const, ref: d.ref, title: d.itemLabel, status: d.status, statusLabel: d.statusLabel, at: d.receivedAt })),
    ...claims.map((c) => ({ kind: "claim" as const, ref: c.ref, title: `Claim of ${c.provider.name}`, status: c.status, statusLabel: label(c.status), at: c.createdAt.toISOString() })),
    ...myEvents.map((e) => ({ kind: "event" as const, ref: e.ref, title: e.title, status: e.status, statusLabel: e.statusLabel, at: e.submittedAt ?? e.startsAt })),
    ...threads.map((t) => ({ kind: "question" as const, ref: t.id, title: t.title, status: t.status, statusLabel: label(t.status), at: t.createdAt.toISOString() })),
    ...applications.map((a) => ({ kind: "volunteer" as const, ref: a.ref, title: a.role.title, status: a.status, statusLabel: label(a.status), at: a.createdAt.toISOString() })),
    ...sent
      .filter((s) => s.kind === "story" || s.kind === "reply" || s.kind === "flag")
      .map((s) => ({ kind: s.kind, ref: s.ref, title: s.title, status: s.status, statusLabel: label(s.status), at: s.at })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return { attention, reviews: myReviews, reports: myReports, concerns, events: myEvents, disputes: myDisputes, sent, items };
}

/** /account/activity: "My reviews & reports", grouped, with progress. Null when signed out. */
export async function getMyActivity(): Promise<MyActivity | null> {
  const user = await getCurrentUser();
  return user ? activityFor(user.id) : null;
}

// ── The account pages' "today" ──────────────────────────────────────────────

async function accountClock(): Promise<string> {
  "use cache";
  cacheLife("minutes");
  return new Date().toISOString();
}

/** "Now" for the account pages ("CHECKED FOR YOU · 28 OCT 2026", "IN 18 DAYS"), as an ISO
 * string. Cached for minutes, so Server Components never read the clock while rendering. */
export async function getAccountNow(): Promise<string> {
  return accountClock();
}

// ── WhatsApp & email ─────────────────────────────────────────────────────────

export type MyConsent = {
  /** The five message types, in prototype order. */
  types: MessageTypeSummary[];
  /** "Your consent record", newest first. */
  record: ConsentRecordEntry[];
  onCount: number;
  whatsappOn: ConsentPurpose[];
  emailOn: ConsentPurpose[];
  /** Followed localities with alerts: "Locality alerts (Sohna Road)". */
  alertLocalities: string[];
};

async function consentFor(userId: string): Promise<MyConsent> {
  "use cache";
  cacheLife("minutes");
  cacheTag(tags.consent(userId), tags.follows(userId));
  const [types, record, follows] = await Promise.all([
    getConsentSummary(userId),
    getConsentHistory(userId),
    db.follow.findMany({ where: { userId, kind: "locality", alert: { in: ["whatsapp", "email"] } }, orderBy: { createdAt: "asc" }, select: { targetId: true } }),
  ]);
  const on = types.filter((t) => t.on);
  return {
    types,
    record,
    onCount: on.length,
    whatsappOn: on.filter((t) => t.channel === "whatsapp").map((t) => t.purpose),
    emailOn: on.filter((t) => t.channel === "email").map((t) => t.purpose),
    alertLocalities: follows.map((f) => getLocality(f.targetId)?.name).filter((n): n is string => !!n),
  };
}

/** /account/consent: every message type (on/off, channel, last sent, record line) and the whole
 * consent record. Email and language: getMyAccount(). Null when signed out. */
export async function getMyConsent(): Promise<MyConsent | null> {
  const user = await getCurrentUser();
  return user ? consentFor(user.id) : null;
}
