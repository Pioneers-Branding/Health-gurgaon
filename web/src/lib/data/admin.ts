// Admin & moderation reads. Server-only, request-time (never cached: staff must see the live
// queue), and every function checks the role itself: call them from /admin pages under
// <Suspense>. Decisions are Server Actions that write the AuditLog (src/lib/audit.ts).
//
// SLA: due = submitted + SLA_HOURS[queue]; "at risk" = due within 2 hours.

import "server-only";

import type { ProviderKind } from "@prisma/client";

import { writeAudit } from "@/lib/audit";
import { canOpenQueue, QUEUE_ACCESS, STAFF_ROLES, type AdminQueue } from "@/lib/auth/permissions";
import { maskPhone } from "@/lib/auth/phone";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CLAIM_ROLE_LABELS, DISPUTE_REASON_LABELS, PROFILE_KIND_OF, REPORT_FIELDS, SOCIETY_TYPE_LABELS, type ProfileKind } from "@/lib/domain";
import { asArray, asStringArray, type AutoCheck } from "@/lib/json-types";
import { getLocality } from "@/lib/localities";
import { shortRef } from "@/lib/refs";
import { normalize } from "@/lib/search";

import { dayTileLabel, flagKind, iso, median, reportKind, type QueueItemKind } from "./admin-format";

export type ModerationQueue = Exclude<AdminQueue, "verification" | "listings" | "audit">;
export const MODERATION_QUEUES: ModerationQueue[] = ["reviews", "reports", "events", "claims", "disputes", "community", "stories"];

/** Hours to a decision, per queue (reviews "usually within 48 hours", reports "3 working days",
 * events "2 working days", disputes "5 working days", first-time community posts "2 hours"). */
export const SLA_HOURS: Record<ModerationQueue, number> = { reviews: 48, reports: 72, events: 48, claims: 120, disputes: 120, community: 4, stories: 72 };

/** Items in the community queue that aren't posts: a new society is called within 3 working
 * days; a volunteer application within a week. */
const SOCIETY_SLA_HOURS = 72;
const VOLUNTEER_SLA_HOURS = 120;

export type QueueStatus = "waiting" | "approved" | "rejected" | "info_requested" | "escalated";
export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  waiting: "Waiting",
  approved: "Approved",
  rejected: "Rejected",
  info_requested: "Info requested",
  escalated: "Escalated",
};

/** Where the item lives on the public site (the moderator's "View on the site" link). */
export type QueueTarget =
  | { type: "provider"; profileKind: ProfileKind; slug: string }
  | { type: "event"; slug: string }
  | { type: "thread"; id: string }
  | { type: "story"; slug: string }
  | { type: "society"; slug: string }
  | { type: "article"; slug: string }
  | { type: "guide"; slug: string };

/** A story as the moderator edits it before publishing. */
export type StoryDraft = {
  title: string;
  category: string;
  transcript: string;
  meta: string;
  durationLabel: string;
  format: string;
  providerName: string;
  visitConfirmed: boolean;
  privacyEdited: boolean;
};

export type QueueItem = {
  queue: ModerationQueue;
  id: string;
  ref: string;
  /** "RV-8830" */
  shortRef: string;
  kindLabel: string;
  title: string;
  body: string;
  submittedAt: string;
  status: QueueStatus;
  statusLabel: string;
  dueAt: string;
  hoursLeft: number;
  slaAtRisk: boolean;
  checks: AutoCheck[];
  flags: string[];
  /** Private contact details exist (reveal with revealPrivateDetails, editors and admins only). */
  hasPrivate: boolean;
  /** What the item is (decides the buttons and reasons; see admin-format.ts). */
  kind?: QueueItemKind;
  /** Where it lives on the public site, and whether it is public now. */
  target?: QueueTarget | null;
  targetPublic?: boolean;
  /** Stories queue: the draft a moderator completes before publishing. */
  story?: StoryDraft;
};

type BaseItem = Omit<QueueItem, "statusLabel" | "dueAt" | "hoursLeft" | "slaAtRisk">;

function sla(hours: number, submitted: Date, now: Date, waiting: boolean) {
  const due = new Date(submitted.getTime() + hours * 3_600_000);
  const hoursLeft = Math.round((due.getTime() - now.getTime()) / 3_600_000);
  return { dueAt: due.toISOString(), hoursLeft, slaAtRisk: waiting && hoursLeft <= 2 };
}

function withStatus(base: BaseItem, submitted: Date, now: Date, slaHours?: number): QueueItem {
  return { ...base, statusLabel: QUEUE_STATUS_LABELS[base.status], ...sla(slaHours ?? SLA_HOURS[base.queue], submitted, now, base.status === "waiting") };
}

const escalated = (flags: string[]) => flags.includes("Escalated");
/** A report or claim sent back for more information (flag set by the moderation action). */
const INFO_REQUESTED = "Info requested";

const providerTarget = (p: { slug: string; kind: ProviderKind }): QueueTarget => ({
  type: "provider",
  profileKind: PROFILE_KIND_OF[p.kind],
  slug: p.slug,
});

async function loadQueue(queue: ModerationQueue, now: Date): Promise<QueueItem[]> {
  switch (queue) {
    case "reviews": {
      const rows = await db.review.findMany({ orderBy: { createdAt: "asc" }, include: { provider: { select: { name: true, headline: true, slug: true, kind: true, status: true } } } });
      return rows.map((r) => {
        const flags = asStringArray(r.flags);
        // An edit of a published review waits like a new review; the published text stays live.
        const editWaiting = r.status === "published" && !!r.editText;
        const status: QueueStatus =
          r.status === "pending" || editWaiting
            ? escalated(flags)
              ? "escalated"
              : "waiting"
            : r.status === "published"
              ? "approved"
              : r.status === "needs_changes"
                ? "info_requested"
                : "rejected";
        const spec = r.provider.headline.split(" · ")[0];
        const submitted = editWaiting ? (r.editSubmittedAt ?? r.createdAt) : r.createdAt;
        return withStatus(
          {
            queue,
            id: r.ref,
            ref: r.ref,
            shortRef: shortRef(r.ref),
            kindLabel: editWaiting ? "Review edit" : "Review",
            title: `Review of ${r.provider.name}${spec && spec !== r.provider.name ? ` (${spec})` : ""}`,
            body: `Visited: ${r.visitMonth}${r.visitType ? ` · ${r.visitType}` : ""}${r.department ? ` · ${r.department}` : ""}\n“${editWaiting ? r.editText : r.text}”${editWaiting ? `\n\nPublished now: “${r.text}”` : ""}`,
            submittedAt: submitted.toISOString(),
            status,
            checks: asArray<AutoCheck>(r.autoChecks),
            flags,
            hasPrivate: !!r.privateNote,
            kind: editWaiting ? "review_edit" : "review",
            target: providerTarget(r.provider),
            targetPublic: r.provider.status === "published",
          },
          submitted,
          now,
        );
      });
    }
    case "reports": {
      const rows = await db.report.findMany({ orderBy: { createdAt: "asc" } });
      const targets = await reportTargets(rows);
      return rows.map((r) => {
        const flags = asStringArray(r.flags);
        const waiting = r.status === "received" || r.status === "checking";
        const status: QueueStatus = waiting
          ? escalated(flags)
            ? "escalated"
            : r.status === "checking" && flags.includes(INFO_REQUESTED)
              ? "info_requested"
              : "waiting"
          : r.status === "rejected"
            ? "rejected"
            : r.status === "no_change"
              ? "rejected"
              : "approved";
        const field = REPORT_FIELDS.find((f) => f.key === r.field)?.label ?? r.field;
        const kind = reportKind(r.type, r.targetKind);
        const t = r.targetId ? targets.get(`${r.targetKind}:${r.targetId}`) : undefined;
        return withStatus(
          {
            queue,
            id: r.ref,
            ref: r.ref,
            shortRef: r.ref,
            kindLabel:
              kind === "report_fact" ? "Correction" : kind === "report_concern" ? "Concern (confidential)" : kind === "report_locality" ? "Locality suggestion" : "Missing listing",
            title: r.targetLabel,
            body: `${field ? `Field: ${field}\n` : ""}“${r.details}”${r.firsthand ? " Reporter says first-hand." : ""}`,
            submittedAt: r.createdAt.toISOString(),
            status,
            checks: asArray<AutoCheck>(r.autoChecks),
            flags,
            hasPrivate: !!(r.reporterEmail || r.privateNote),
            kind,
            target: t?.target ?? null,
            targetPublic: t?.public ?? false,
          },
          r.createdAt,
          now,
        );
      });
    }
    case "events": {
      const rows = await db.event.findMany({ where: { submittedAt: { not: null } }, orderBy: { submittedAt: "asc" } });
      return rows.map((e) => {
        const flags = asStringArray(e.flags);
        const status: QueueStatus =
          e.status === "awaiting_review" ? (escalated(flags) ? "escalated" : "waiting") : e.status === "changes_requested" ? "info_requested" : e.status === "rejected" ? "rejected" : "approved";
        const place = e.isOnline ? "Online" : (getLocality(e.localitySlug)?.name ?? e.venue ?? "");
        return withStatus(
          {
            queue,
            id: e.slug,
            ref: e.ref ?? e.slug,
            // Sample events without a reference show a short form of their slug.
            shortRef: e.ref ? shortRef(e.ref) : e.slug.length > 24 ? `${e.slug.slice(0, 23)}…` : e.slug,
            kindLabel: "Event",
            title: `${e.title}, ${place} (${dayTileLabel(e.startsAt)})`,
            body: `Organiser: ${e.organiserName}\n${e.cost} · ${e.timeLabel}${e.venue ? ` · ${e.venue}` : ""}${asStringArray(e.services).length ? `\nServices: ${asStringArray(e.services).join(", ")}` : ""}${e.eligibility ? `\nWho can come: ${e.eligibility}` : ""}${e.requestedChanges && e.status === "changes_requested" ? `\n\nChanges asked for: ${e.requestedChanges}` : ""}`,
            submittedAt: (e.submittedAt ?? e.createdAt).toISOString(),
            status,
            checks: asArray<AutoCheck>(e.autoChecks),
            flags,
            hasPrivate: !!(e.contactName || e.contactPhone),
            kind: "event",
            target: { type: "event", slug: e.slug },
            targetPublic: ["verified", "awaiting_review", "cancelled", "completed"].includes(e.status),
          },
          e.submittedAt ?? e.createdAt,
          now,
        );
      });
    }
    case "claims": {
      const rows = await db.claim.findMany({ orderBy: { createdAt: "asc" }, include: { provider: { select: { name: true, headline: true, slug: true, kind: true, status: true } } } });
      return rows.map((c) => {
        const flags = asStringArray(c.flags);
        const status: QueueStatus =
          c.status === "pending" ? "waiting" : c.status === "approved" ? "approved" : c.status === "rejected" ? "rejected" : c.status === "info_requested" ? "info_requested" : "escalated";
        const spec = c.provider.headline.split(" · ")[0];
        return withStatus(
          {
            queue,
            id: c.ref,
            ref: c.ref,
            shortRef: shortRef(c.ref),
            kindLabel: "Profile claim",
            title: `Claim of ${c.provider.name}${spec ? ` (${spec})` : ""}`,
            body: `Claimant: “${CLAIM_ROLE_LABELS[c.claimantRole]}”\nRegistration: ${c.registrationNumber ? "entered" : "not given"}\nOTP to clinic number on record: ${c.otpVerified ? "passed" : "not done"}`,
            submittedAt: c.createdAt.toISOString(),
            status,
            checks: asArray<AutoCheck>(c.autoChecks),
            flags,
            hasPrivate: !!c.privateNote,
            kind: "claim",
            target: providerTarget(c.provider),
            targetPublic: c.provider.status === "published",
          },
          c.createdAt,
          now,
        );
      });
    }
    case "disputes": {
      const rows = await db.dispute.findMany({ orderBy: { createdAt: "asc" }, include: { provider: { select: { slug: true, kind: true, status: true } } } });
      return rows.map((x) => {
        const waiting = x.status === "received" || x.status === "under_review";
        const status: QueueStatus = waiting ? "waiting" : x.status === "not_upheld" || x.status === "withdrawn" ? "rejected" : "approved";
        return withStatus(
          {
            queue,
            id: x.ref,
            ref: x.ref,
            shortRef: shortRef(x.ref),
            kindLabel: x.target === "mention" ? "Dispute · neighbour mention" : "Dispute · ranking",
            title: x.itemLabel,
            body: `Reason: ${DISPUTE_REASON_LABELS[x.reason]}\nFiled by: ${x.filerRole}${x.filerConnection ? ` (${x.filerConnection})` : ""}\n“${x.details}”${x.outcomeText ? `\n\nPublished outcome: “${x.outcomeText}”` : ""}`,
            submittedAt: x.createdAt.toISOString(),
            status,
            checks: [],
            flags: x.status === "under_review" ? ["Under review"] : [],
            hasPrivate: !!x.email,
            kind: "dispute",
            target: x.provider ? providerTarget(x.provider) : null,
            targetPublic: x.provider?.status === "published",
          },
          x.createdAt,
          now,
        );
      });
    }
    case "community": {
      const [rows, societies, applications] = await Promise.all([
        db.contentFlag.findMany({ orderBy: { createdAt: "asc" } }),
        db.society.findMany({ where: { ref: { not: null } }, orderBy: { createdAt: "asc" } }),
        db.volunteerApplication.findMany({ orderBy: { createdAt: "asc" }, include: { role: { select: { title: true } } } }),
      ]);
      const targets = await flagTargets(rows);
      const flagItems = rows.map((f) => {
        const flags = asStringArray(f.flags);
        const status: QueueStatus = f.status === "open" ? (escalated(flags) ? "escalated" : "waiting") : f.status === "dismissed" ? "approved" : "rejected";
        const kind = flagKind(f.targetKind, f.reason);
        const isNew = kind === "new_question" || kind === "new_reply";
        const t = targets.get(`${f.targetKind}:${f.targetId}`);
        return withStatus(
          {
            queue,
            id: f.ref,
            ref: f.ref,
            shortRef: shortRef(f.ref),
            kindLabel:
              kind === "new_question"
                ? "New question"
                : kind === "new_reply"
                  ? "New reply"
                  : kind === "flag_review"
                    ? "Reported review"
                    : kind === "flag_story"
                      ? "Reported story"
                      : kind === "flag_thread"
                        ? "Flagged thread"
                        : "Flagged post",
            title: f.targetLabel,
            body: isNew ? (f.excerpt ? `“${f.excerpt}”` : f.reason) : `Reported: ${f.reason}${f.excerpt ? `\n“${f.excerpt}”` : ""}`,
            submittedAt: f.createdAt.toISOString(),
            status,
            checks: asArray<AutoCheck>(f.autoChecks),
            flags,
            hasPrivate: !!f.privateNote,
            kind,
            target: t?.target ?? null,
            targetPublic: t?.public ?? false,
          },
          f.createdAt,
          now,
        );
      });
      const societyItems = societies.map((s) =>
        withStatus(
          {
            queue,
            id: s.ref!,
            ref: s.ref!,
            shortRef: shortRef(s.ref!),
            kindLabel: "New society",
            title: s.name,
            body: `Type: ${SOCIETY_TYPE_LABELS[s.groupType]}\nArea: ${s.areaLabel ?? getLocality(s.localitySlug)?.name ?? "not given"}\nContact: ${s.contactRole || "committee member"}, prefers ${s.contactChannel ?? "a call"}`,
            submittedAt: s.createdAt.toISOString(),
            status: s.status === "pending" ? "waiting" : s.status === "verified" ? "approved" : "rejected",
            checks: [
              { ok: !!s.localitySlug, text: s.localitySlug ? `Locality: ${getLocality(s.localitySlug)?.name ?? s.localitySlug}` : "Locality not matched to our list" },
              { ok: false, text: "Committee not yet called" },
            ],
            flags: s.status === "pending" ? ["Needs a call"] : [],
            hasPrivate: !!(s.contactName || s.contactPhone || s.contactEmail),
            kind: "society",
            target: { type: "society", slug: s.slug },
            targetPublic: s.status === "verified",
          },
          s.createdAt,
          now,
          SOCIETY_SLA_HOURS,
        ),
      );
      const volunteerItems = applications.map((a) =>
        withStatus(
          {
            queue,
            id: a.ref,
            ref: a.ref,
            shortRef: shortRef(a.ref),
            kindLabel: "Volunteer application",
            title: `${a.role.title}: application`,
            body: `Area: ${a.localityText}\nAvailable: ${asStringArray(a.availability).join(", ") || "not given"}${a.skills ? `\nSkills: “${a.skills}”` : ""}\nRegistration number: ${a.registrationNumber ? "entered" : "not needed or not given"}`,
            submittedAt: a.createdAt.toISOString(),
            status: a.status === "received" ? "waiting" : a.status === "call_scheduled" ? "info_requested" : a.status === "accepted" ? "approved" : "rejected",
            checks: [{ ok: a.consent, text: a.consent ? "Agreed to be called by the coordinator" : "No consent to be called" }],
            flags: [],
            hasPrivate: true,
            kind: "volunteer",
            target: null,
            targetPublic: false,
          },
          a.createdAt,
          now,
          VOLUNTEER_SLA_HOURS,
        ),
      );
      return [...flagItems, ...societyItems, ...volunteerItems];
    }
    case "stories": {
      // Patient stories shared from /gurgaon/stories ("Share your story"): pending until a moderator
      // has checked consent, the visit and privacy. Rejected stories are withdrawn.
      const rows = await db.story.findMany({ where: { sample: false }, orderBy: { createdAt: "asc" } });
      return rows.map((s) => {
        const status: QueueStatus = s.status === "pending" ? "waiting" : s.status === "published" ? "approved" : "rejected";
        const ref = s.ref ?? s.slug;
        return withStatus(
          {
            queue,
            id: ref,
            ref,
            shortRef: shortRef(ref),
            kindLabel: s.format === "written" ? "Patient story · written" : "Patient story · video",
            title: s.title,
            body: `About: ${s.providerName}\nShared by: ${s.whoLabel}\nTopic: ${s.category}${s.transcript ? `\n“${s.transcript}”` : ""}`,
            submittedAt: s.createdAt.toISOString(),
            status,
            checks: [
              { ok: s.consented, text: s.consented ? "Consent to publish given" : "No consent to publish" },
              { ok: s.visitConfirmed, text: s.visitConfirmed ? "Visit confirmed by the sharer" : "Visit not confirmed" },
              { ok: s.notPaid, text: s.notPaid ? "Not paid or asked by the provider" : "Payment question not answered" },
            ],
            flags: [],
            hasPrivate: false,
            kind: "story",
            target: { type: "story", slug: s.slug },
            targetPublic: s.status === "published",
            story: {
              title: s.title,
              category: s.category,
              transcript: s.transcript,
              meta: s.meta,
              durationLabel: s.durationLabel,
              format: s.format,
              providerName: s.providerName,
              visitConfirmed: s.visitConfirmed,
              privacyEdited: s.privacyEdited,
            },
          },
          s.createdAt,
          now,
        );
      });
    }
  }
}

type TargetInfo = { target: QueueTarget | null; public: boolean };

/** Public pages of the things reports are about (providers, events, articles, guides, threads). */
async function reportTargets(rows: { targetKind: string | null; targetId: string | null }[]): Promise<Map<string, TargetInfo>> {
  const ids = (kind: string) => [...new Set(rows.filter((r) => r.targetKind === kind && r.targetId).map((r) => r.targetId as string))];
  const [providers, events, articles, guides, threads] = await Promise.all([
    ids("provider").length ? db.provider.findMany({ where: { id: { in: ids("provider") } }, select: { id: true, slug: true, kind: true, status: true } }) : [],
    ids("event").length ? db.event.findMany({ where: { id: { in: ids("event") } }, select: { id: true, slug: true, status: true } }) : [],
    ids("article").length ? db.article.findMany({ where: { id: { in: ids("article") } }, select: { id: true, slug: true, status: true } }) : [],
    ids("guide").length ? db.guide.findMany({ where: { id: { in: ids("guide") } }, select: { id: true, slug: true, status: true } }) : [],
    ids("thread").length ? db.thread.findMany({ where: { id: { in: ids("thread") } }, select: { id: true, status: true } }) : [],
  ]);
  const out = new Map<string, TargetInfo>();
  for (const p of providers) out.set(`provider:${p.id}`, { target: providerTarget(p), public: p.status === "published" });
  for (const e of events) out.set(`event:${e.id}`, { target: { type: "event", slug: e.slug }, public: ["verified", "awaiting_review", "cancelled", "completed"].includes(e.status) });
  for (const a of articles) out.set(`article:${a.id}`, { target: { type: "article", slug: a.slug }, public: a.status === "published" });
  for (const g of guides) out.set(`guide:${g.id}`, { target: { type: "guide", slug: g.slug }, public: g.status === "published" });
  for (const t of threads) out.set(`thread:${t.id}`, { target: { type: "thread", id: t.id }, public: t.status === "open" || t.status === "resolved" });
  return out;
}

/** Public pages of flagged or new community content (threads, replies, reviews, stories). */
async function flagTargets(rows: { targetKind: string; targetId: string }[]): Promise<Map<string, TargetInfo>> {
  const ids = (kind: string) => [...new Set(rows.filter((r) => r.targetKind === kind).map((r) => r.targetId))];
  const [threads, posts, reviews, stories] = await Promise.all([
    ids("thread").length ? db.thread.findMany({ where: { id: { in: ids("thread") } }, select: { id: true, status: true } }) : [],
    ids("post").length ? db.post.findMany({ where: { id: { in: ids("post") } }, select: { id: true, status: true, thread: { select: { id: true, status: true } } } }) : [],
    ids("review").length
      ? db.review.findMany({ where: { id: { in: ids("review") } }, select: { id: true, status: true, provider: { select: { slug: true, kind: true, status: true } } } })
      : [],
    ids("story").length ? db.story.findMany({ where: { id: { in: ids("story") } }, select: { id: true, slug: true, status: true } }) : [],
  ]);
  const out = new Map<string, TargetInfo>();
  const open = (s: string) => s === "open" || s === "resolved";
  for (const t of threads) out.set(`thread:${t.id}`, { target: { type: "thread", id: t.id }, public: open(t.status) });
  for (const p of posts) out.set(`post:${p.id}`, { target: { type: "thread", id: p.thread.id }, public: open(p.thread.status) });
  for (const r of reviews) out.set(`review:${r.id}`, { target: providerTarget(r.provider), public: r.status === "published" && r.provider.status === "published" });
  for (const s of stories) out.set(`story:${s.id}`, { target: { type: "story", slug: s.slug }, public: s.status === "published" });
  return out;
}

const isOpen = (i: QueueItem) => i.status === "waiting" || i.status === "escalated";

/** Median hours from submission to a decision, over decisions made in the last 7 days. */
async function medianResponseHours(queues: ModerationQueue[], now: Date): Promise<number | null> {
  const since = new Date(now.getTime() - 7 * 86_400_000);
  const spans: number[] = [];
  const add = (from: Date | null, to: Date | null) => {
    if (from && to && to >= from) spans.push((to.getTime() - from.getTime()) / 3_600_000);
  };
  const has = (q: ModerationQueue) => queues.includes(q);
  const [reviews, reports, events, claims, disputes, flags, stories] = await Promise.all([
    has("reviews") ? db.review.findMany({ where: { moderatedAt: { gte: since } }, select: { createdAt: true, editSubmittedAt: true, moderatedAt: true } }) : [],
    has("reports") ? db.report.findMany({ where: { resolvedAt: { gte: since } }, select: { createdAt: true, resolvedAt: true } }) : [],
    has("events") ? db.event.findMany({ where: { verifiedAt: { gte: since }, submittedAt: { not: null } }, select: { submittedAt: true, verifiedAt: true } }) : [],
    has("claims") ? db.claim.findMany({ where: { decidedAt: { gte: since } }, select: { createdAt: true, decidedAt: true } }) : [],
    has("disputes") ? db.dispute.findMany({ where: { outcomePublishedAt: { gte: since } }, select: { createdAt: true, outcomePublishedAt: true } }) : [],
    has("community") ? db.contentFlag.findMany({ where: { resolvedAt: { gte: since } }, select: { createdAt: true, resolvedAt: true } }) : [],
    has("stories") ? db.story.findMany({ where: { sample: false, publishedAt: { gte: since } }, select: { createdAt: true, publishedAt: true } }) : [],
  ]);
  for (const r of reviews) add(r.editSubmittedAt && r.editSubmittedAt <= (r.moderatedAt ?? now) ? r.editSubmittedAt : r.createdAt, r.moderatedAt);
  for (const r of reports) add(r.createdAt, r.resolvedAt);
  for (const e of events) add(e.submittedAt, e.verifiedAt);
  for (const c of claims) add(c.createdAt, c.decidedAt);
  for (const d of disputes) add(d.createdAt, d.outcomePublishedAt);
  for (const f of flags) add(f.createdAt, f.resolvedAt);
  for (const s of stories) add(s.createdAt, s.publishedAt);
  const m = median(spans);
  return m === null ? null : Math.round(m * 10) / 10;
}

/** Waiting counts per queue and the overview tiles (WAITING, OLDEST, SLA AT RISK, MEDIAN RESPONSE). */
export async function getAdminOverview() {
  const user = await requireRole(STAFF_ROLES);
  const now = new Date();
  const queues = MODERATION_QUEUES.filter((q) => canOpenQueue(user.role, q));
  const all = (await Promise.all(queues.map((q) => loadQueue(q, now)))).flat();
  const waiting = all.filter(isOpen);
  const oldest = [...waiting].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))[0] ?? null;
  return {
    role: user.role,
    displayName: user.displayName,
    queues: queues.map((q) => {
      const open = all.filter((i) => i.queue === q && isOpen(i));
      return { queue: q, waiting: open.length, atRisk: open.filter((i) => i.slaAtRisk).length };
    }),
    waiting: waiting.length,
    oldest: oldest
      ? { shortRef: oldest.shortRef, kindLabel: oldest.kindLabel, kind: oldest.kind ?? null, queue: oldest.queue, id: oldest.id, hours: Math.round((now.getTime() - new Date(oldest.submittedAt).getTime()) / 3_600_000) }
      : null,
    slaAtRisk: waiting.filter((i) => i.slaAtRisk).length,
    medianResponseHours: await medianResponseHours(queues, now),
  };
}

/** One queue. filter "waiting" (default), "done" or "all". Waiting items: due soonest first. */
export async function getModerationQueue(queue: ModerationQueue, filter: "waiting" | "done" | "all" = "waiting"): Promise<QueueItem[]> {
  await requireRole(QUEUE_ACCESS[queue]);
  const items = await loadQueue(queue, new Date());
  const shown = filter === "all" ? items : items.filter((i) => (filter === "waiting" ? isOpen(i) : !isOpen(i)));
  return shown.sort((a, b) => (isOpen(a) && isOpen(b) ? a.dueAt.localeCompare(b.dueAt) : isOpen(a) !== isOpen(b) ? (isOpen(a) ? -1 : 1) : b.submittedAt.localeCompare(a.submittedAt)));
}

export async function getModerationItem(queue: ModerationQueue, id: string): Promise<QueueItem | null> {
  await requireRole(QUEUE_ACCESS[queue]);
  return (await loadQueue(queue, new Date())).find((i) => i.id === id) ?? null;
}

export type ItemHistoryRow = { at: string; actor: string; actorRole: string | null; action: string; verb: string; reason: string | null; note: string | null };

/** Every audit line about one queue item (decisions and reveals), newest first. */
export async function getItemHistory(queue: ModerationQueue, id: string): Promise<ItemHistoryRow[]> {
  await requireRole(QUEUE_ACCESS[queue]);
  const rows = await db.auditLog.findMany({ where: { targetId: id }, orderBy: { createdAt: "desc" }, take: 20 });
  return rows.map((r) => {
    const details = r.details && typeof r.details === "object" && !Array.isArray(r.details) ? (r.details as Record<string, unknown>) : {};
    return {
      at: r.createdAt.toISOString(),
      actor: r.actorLabel,
      actorRole: r.actorRole,
      action: r.action,
      verb: r.action.split(".")[1] ?? r.action,
      reason: r.reason,
      note: typeof details.note === "string" ? details.note : null,
    };
  });
}

/** "Reveal (logged)": private contact details of a submission. Editors and admins only, and the
 * view is written to the audit log, so call this from a Server Action, not during render. */
export async function revealPrivateDetails(queue: ModerationQueue, id: string): Promise<string | null> {
  const user = await requireRole(["editor", "admin"]);
  let text: string | null = null;
  if (queue === "reviews") text = (await db.review.findUnique({ where: { ref: id }, select: { privateNote: true } }))?.privateNote ?? null;
  if (queue === "reports") {
    const r = await db.report.findUnique({ where: { ref: id }, select: { reporterEmail: true, privateNote: true } });
    text = [r?.privateNote, r?.reporterEmail ? `Email: ${r.reporterEmail}` : null].filter(Boolean).join(" · ") || null;
  }
  if (queue === "events") {
    const e = await db.event.findUnique({ where: { slug: id }, select: { contactName: true, contactRole: true, contactPhone: true } });
    text = e ? [e.contactName, e.contactRole, e.contactPhone].filter(Boolean).join(" · ") || null : null;
  }
  if (queue === "claims") text = (await db.claim.findUnique({ where: { ref: id }, select: { privateNote: true } }))?.privateNote ?? null;
  if (queue === "disputes") text = (await db.dispute.findUnique({ where: { ref: id }, select: { email: true } }))?.email ?? null;
  if (queue === "community") {
    if (id.startsWith("HG-RWA-")) {
      const s = await db.society.findUnique({ where: { ref: id }, select: { contactName: true, contactRole: true, contactPhone: true, contactEmail: true, contactChannel: true } });
      text = s ? [s.contactName, s.contactRole, s.contactPhone, s.contactEmail, s.contactChannel ? `prefers ${s.contactChannel}` : null].filter(Boolean).join(" · ") || null : null;
    } else if (id.startsWith("HG-VOL-")) {
      const a = await db.volunteerApplication.findUnique({ where: { ref: id }, select: { name: true, registrationNumber: true, user: { select: { phone: true } } } });
      text = a ? [a.name, a.user?.phone ?? null, a.registrationNumber ? `Registration: ${a.registrationNumber}` : null].filter(Boolean).join(" · ") || null : null;
    } else {
      text = (await db.contentFlag.findUnique({ where: { ref: id }, select: { privateNote: true } }))?.privateNote ?? null;
    }
  }
  if (text) await writeAudit({ actor: user, action: "private.reveal", target: { kind: queue, id, label: id }, reason: "Viewed private details" });
  return text;
}

export type AuditRow = {
  id: string;
  at: string;
  actor: string;
  actorRole: string | null;
  action: string;
  target: string | null;
  reason: string | null;
  summary: string;
  /** "approve" (the part after the dot) and "review" (before it, underscores as spaces). */
  verb?: string;
  entity?: string;
};

const VERBS: Record<string, string> = {
  approve: "Approved",
  reject: "Rejected",
  request_changes: "Requested changes to",
  escalate: "Escalated",
  resolve: "Resolved",
  decide: "Decided",
  change: "Changed",
  reveal: "Viewed private details of",
  merge: "Merged",
  update: "Updated",
  update_hours: "Updated hours for",
  verify: "Verified",
  close: "Closed",
  hide: "Hid",
  delete: "Deleted",
  export: "Exported",
  publish: "Published",
  keep: "Kept",
  remove: "Removed",
  accept: "Accepted",
  decline: "Declined",
};

/** The audit log, newest first ("Every moderation and edit action, who made it and why."). */
export async function getAuditLog(opts: { limit?: number; before?: string | null } = {}): Promise<AuditRow[]> {
  await requireRole(QUEUE_ACCESS.audit);
  const before = opts.before ? new Date(opts.before) : null;
  const rows = await db.auditLog.findMany({
    where: before && !Number.isNaN(before.getTime()) ? { createdAt: { lt: before } } : {},
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.limit ?? 50, 200),
  });
  return rows.map((r) => {
    const [entity, verb = ""] = r.action.split(".");
    const verbText = VERBS[verb] ?? r.action;
    const target = r.targetLabel ?? r.targetId;
    // "Viewed private details of HG-RV-8830", "Updated hours for Sai Medicos": the verb says it.
    const entityText = r.action === "private.reveal" || r.action === "provider.update_hours" ? "" : entity.replace(/_/g, " ");
    return {
      id: r.id,
      at: r.createdAt.toISOString(),
      actor: r.actorLabel,
      actorRole: r.actorRole,
      action: r.action,
      target,
      reason: r.reason,
      summary: `${[verbText, entityText, target].filter(Boolean).join(" ")}${r.reason ? ` · reason: ${r.reason}` : ""}`,
      verb,
      entity: entityText,
    };
  });
}

/** Verification desk: listings due for a re-check (profiles every 90 days) and unverified ones. */
export async function getVerificationDesk(opts: { withinDays?: number } = {}) {
  await requireRole(QUEUE_ACCESS.verification);
  const now = new Date();
  const horizon = new Date(now.getTime() + (opts.withinDays ?? 14) * 86_400_000);
  const stale = new Date(now.getTime() - 90 * 86_400_000);
  const rows = await db.provider.findMany({
    where: { OR: [{ status: "pending" }, { lastCheckedAt: null }, { lastCheckedAt: { lt: stale } }, { nextCheckAt: { lte: horizon } }] },
    select: { slug: true, name: true, kind: true, status: true, lastCheckedAt: true, nextCheckAt: true, localitySlug: true },
    orderBy: [{ nextCheckAt: "asc" }, { lastCheckedAt: "asc" }],
  });
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    status: r.status,
    locality: getLocality(r.localitySlug)?.name ?? null,
    lastCheckedAt: iso(r.lastCheckedAt),
    nextCheckAt: iso(r.nextCheckAt),
    reason: r.status === "pending" ? "New listing, not yet verified" : !r.lastCheckedAt ? "Never checked" : r.nextCheckAt && r.nextCheckAt <= horizon ? "Re-check due" : "Last checked over 90 days ago",
  }));
}

/** Listings editor: search by name (case-insensitive, done in JS for portability). */
export async function getListings(opts: { q?: string; status?: string; page?: number } = {}) {
  await requireRole(QUEUE_ACCESS.listings);
  const rows = await db.provider.findMany({
    where: opts.status ? { status: opts.status as "published" } : {},
    select: { slug: true, name: true, kind: true, status: true, localitySlug: true, claimed: true, sponsored: true, lastCheckedAt: true, sample: true },
    orderBy: { name: "asc" },
  });
  const q = opts.q ? normalize(opts.q) : "";
  const matched = q ? rows.filter((r) => normalize(r.name).includes(q)) : rows;
  const page = Math.max(1, opts.page ?? 1);
  return {
    total: matched.length,
    page,
    items: matched.slice((page - 1) * 50, page * 50).map((r) => ({ ...r, locality: getLocality(r.localitySlug)?.name ?? null, lastCheckedAt: iso(r.lastCheckedAt) })),
  };
}

/** Listings editor: the facts an editor can change on one listing, plus its recent changes. */
export async function getListingForEdit(slug: string) {
  await requireRole(QUEUE_ACCESS.listings);
  const p = await db.provider.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      kind: true,
      status: true,
      headline: true,
      areaLabel: true,
      localitySlug: true,
      hoursSummary: true,
      hoursSource: true,
      hoursCheckedAt: true,
      consultationFee: true,
      feeVerified: true,
      keyFact: true,
      claimed: true,
      sponsored: true,
      sample: true,
      lastCheckedAt: true,
      nextCheckAt: true,
      changes: { orderBy: { changedAt: "desc" }, take: 5, select: { field: true, summary: true, source: true, changedAt: true } },
    },
  });
  if (!p) return null;
  return {
    ...p,
    profileKind: PROFILE_KIND_OF[p.kind],
    locality: getLocality(p.localitySlug)?.name ?? null,
    hoursCheckedAt: iso(p.hoursCheckedAt),
    lastCheckedAt: iso(p.lastCheckedAt),
    nextCheckAt: iso(p.nextCheckAt),
    changes: p.changes.map((c) => ({ ...c, changedAt: c.changedAt.toISOString() })),
  };
}

/** Admins: people with a role other than resident, plus anyone matching a phone search. Phones
 * are masked here too. */
export async function getStaffAndRoles() {
  await requireRole("admin");
  const rows = await db.user.findMany({ where: { deletedAt: null, role: { not: "resident" } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  return rows.map((u) => ({ id: u.id, displayName: u.displayName, phoneMasked: maskPhone(u.phone), role: u.role, lastSignInAt: iso(u.lastSignInAt) }));
}

/** Admins: one person's current role, for the "Role changed" confirmation (phone masked). */
export async function getStaffMember(id: string) {
  await requireRole("admin");
  const u = await db.user.findFirst({ where: { id, deletedAt: null }, select: { id: true, displayName: true, phone: true, role: true } });
  return u ? { id: u.id, label: u.displayName || maskPhone(u.phone), role: u.role } : null;
}
