"use server";

// Admin & moderation decisions. Prototype: "Health Gurgaon Admin and Mobile.dc.html" #admin.
//
//   decideQueueItem  Approve / Reject / Request info / Escalate on any moderation queue item
//                    (reviews, reports, events, claims, disputes, community incl. new questions and
//                    replies, societies and volunteer applications, stories). Publishing a story,
//                    resolving a report and verifying a society are its "approve".
//   revealPrivate    "Reveal (logged)": editors and admins see a submitter's private contact.
//   recordCheck      Verification desk: a listing was re-checked (and published if it was new).
//   updateListing    Listings editor: correct a listing's facts with a reason and a source.
//   changeRole / grantRole / exportAuditLog   Admins only.
//
// Every action re-checks the signed-in user and their role, needs a reason, writes an AuditLog row
// in the same transaction as the change, and expires the cache tags of the public pages it touches
// (docs/BACKEND.md §6), so an approved review, event, question or story is public straight away.

import type { Prisma } from "@prisma/client";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fail, formLang, needsSignIn, notAllowed, ok, parseForm, type ActionState, type FieldErrors } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { canOpenQueue, isStaff, QUEUE_ACCESS } from "@/lib/auth/permissions";
import { maskPhone } from "@/lib/auth/phone";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { revealPrivateDetails, type ModerationQueue, MODERATION_QUEUES } from "@/lib/data/admin";
import {
  auditAction,
  buttonGroup,
  claimOutcome,
  disputeOutcome,
  eventOutcome,
  flagKind,
  KIND_DECISIONS,
  listingChanges,
  noteRequired,
  reasonsFor,
  reportKind,
  reportOutcome,
  reviewOutcome,
  storyMeta,
  volunteerOutcome,
  type Decision,
  type ListingEdit,
  type QueueItemKind,
} from "@/lib/data/admin-format";
import { formatDateLabel, formatDate } from "@/lib/dates";
import { db, type DbClient } from "@/lib/db";
import { REPORT_FIELDS } from "@/lib/domain";
import { fmt } from "@/lib/i18n/format";
import { adminStrings, type AdminStrings } from "@/lib/i18n/areas/admin";
import { asArray, asStringArray, type AutoCheck, type TimelineEntry } from "@/lib/json-types";
import { redactPersonalData } from "@/lib/redact";
import { shortRef } from "@/lib/refs";
import { routes } from "@/lib/routes";
import { moderationDecisionSchema } from "@/lib/validation/moderation";

import { csvCell, grantRoleSchema, listingEditSchema, recordCheckSchema, roleChangeSchema, storyPublishSchema } from "./admin-schemas";

const J = (value: unknown) => value as Prisma.InputJsonValue;
const without = (list: string[], ...drop: string[]) => list.filter((f) => !drop.includes(f));
const withFlag = (list: string[], flag: string) => (list.includes(flag) ? list : [...list, flag]);
const ESCALATED = "Escalated";
const INFO_REQUESTED = "Info requested";

/** Field errors in the form's language: zod's messages are English, so a Hindi form gets the
 * Hindi summary under each field instead. */
function localErrors(state: ActionState<never>, lang: "en" | "hi", t: AdminStrings): FieldErrors | undefined {
  const fe = state.status === "error" ? state.fieldErrors : undefined;
  if (!fe || lang === "en") return fe;
  return Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v && v.length ? [k === "reason" ? t.actions.reasonFirst : t.actions.checkFields] : v]));
}

function isModerationQueue(q: string): q is ModerationQueue {
  return (MODERATION_QUEUES as string[]).includes(q);
}

// ── Decisions on queue items ────────────────────────────────────────────────

export type DecisionData = {
  itemId: string;
  decision: Decision;
  /** The item is on a public page now (approved review, verified event, open question, …). */
  publicNow: boolean;
};

type Applied = { tags: (string | null | false | undefined)[]; publicNow: boolean; label: string; kind: QueueItemKind };
type Outcome = { ok: true; applied: Applied } | { ok: false; state: ActionState<never> };

type Ctx = {
  user: SessionUser;
  t: AdminStrings;
  lang: "en" | "hi";
  itemId: string;
  decision: Decision;
  reason: string;
  note: string | null;
  formData: FormData;
  now: Date;
};

/** Checks every kind shares: the button exists for it, the reason is one of its reasons, and a
 * note is there when the decision needs one. */
function checkDecision(ctx: Ctx, kind: QueueItemKind): ActionState<never> | null {
  const { t, decision, reason, note } = ctx;
  if (!KIND_DECISIONS[kind].includes(decision)) return fail("not_allowed_here", t.actions.notHere);
  if (!reasonsFor(kind).includes(reason)) return fail("invalid_input", t.actions.reasonFirst, { reason: [t.actions.reasonFirst] });
  if (noteRequired(kind, decision) && (!note || note.length < 10)) {
    const message = kind === "dispute" ? t.actions.noteDispute : t.actions.noteEvent;
    return fail("invalid_input", message, { note: [message] });
  }
  return null;
}

const decided = (t: AdminStrings): Outcome => ({ ok: false, state: fail("already_decided", t.actions.decided) });
const notFoundOutcome = (t: AdminStrings): Outcome => ({ ok: false, state: fail("not_found", t.actions.notFound) });

function audit(ctx: Ctx, kind: QueueItemKind, target: { id: string; label: string }, tx: DbClient, details: Record<string, unknown> = {}) {
  return writeAudit(
    {
      actor: ctx.user,
      action: auditAction(kind, ctx.decision),
      target: { kind: kind, id: target.id, label: target.label },
      reason: ctx.reason,
      details: { ...details, ...(ctx.note ? { note: ctx.note } : {}) },
    },
    tx,
  );
}

async function decideReview(ctx: Ctx): Promise<Outcome> {
  const r = await db.review.findUnique({ where: { ref: ctx.itemId }, include: { provider: { select: { slug: true } } } });
  if (!r) return notFoundOutcome(ctx.t);
  const editWaiting = r.status === "published" && !!r.editText;
  const kind: QueueItemKind = editWaiting ? "review_edit" : "review";
  const bad = checkDecision(ctx, kind);
  if (bad) return { ok: false, state: bad };
  if (!editWaiting && r.status !== "pending" && r.status !== "needs_changes") return decided(ctx.t);
  const { decision, reason, note, now, user } = ctx;
  const flags = asStringArray(r.flags);
  const toAuthor = note ? `${reason}. ${note}` : reason;
  await db.$transaction(async (tx) => {
    if (decision === "escalate") {
      await tx.review.update({ where: { id: r.id }, data: { flags: J(withFlag(flags, ESCALATED)) } });
    } else if (editWaiting) {
      await tx.review.update({
        where: { id: r.id },
        data:
          decision === "approve"
            ? { text: r.editText!, editText: null, editSubmittedAt: null, moderationReason: null, moderatedById: user.id, moderatedAt: now, flags: J(without(flags, ESCALATED)) }
            : { editText: null, editSubmittedAt: null, moderationReason: toAuthor, moderatedById: user.id, moderatedAt: now, flags: J(without(flags, ESCALATED)) },
      });
    } else {
      const status = reviewOutcome(decision)!;
      await tx.review.update({
        where: { id: r.id },
        data: {
          status,
          moderatedById: user.id,
          moderatedAt: now,
          flags: J(without(flags, ESCALATED)),
          ...(status === "published" ? { publishedAt: r.publishedAt ?? now, moderationReason: null, suggestion: null } : {}),
          ...(status === "rejected" ? { moderationReason: toAuthor } : {}),
          ...(status === "needs_changes" ? { moderationReason: reason, suggestion: note } : {}),
        },
      });
    }
    await audit(ctx, kind, { id: r.ref, label: shortRef(r.ref) }, tx);
  });
  return {
    ok: true,
    applied: { tags: [tags.reviews(r.provider.slug), tags.provider(r.provider.slug), r.authorId && tags.activity(r.authorId)], publicNow: decision === "approve", label: shortRef(r.ref), kind },
  };
}

async function decideReport(ctx: Ctx): Promise<Outcome> {
  const r = await db.report.findUnique({ where: { ref: ctx.itemId } });
  if (!r) return notFoundOutcome(ctx.t);
  const kind = reportKind(r.type, r.targetKind);
  const bad = checkDecision(ctx, kind);
  if (bad) return { ok: false, state: bad };
  if (r.status !== "received" && r.status !== "checking") return decided(ctx.t);
  const { decision, reason, note, now, user } = ctx;
  const flags = asStringArray(r.flags);
  const timeline = asArray<TimelineEntry>(r.timeline);
  const at = now.toISOString();

  // The thing the report is about, for its public page's tags and the corrections log.
  const target =
    r.targetKind === "provider" && r.targetId
      ? await db.provider.findUnique({ where: { id: r.targetId }, select: { id: true, slug: true, name: true } })
      : null;
  const event = r.targetKind === "event" && r.targetId ? await db.event.findUnique({ where: { id: r.targetId }, select: { id: true, slug: true, title: true } }) : null;
  const article = r.targetKind === "article" && r.targetId ? await db.article.findUnique({ where: { id: r.targetId }, select: { id: true, slug: true, title: true } }) : null;
  const status = reportOutcome(decision, reason);
  const fieldLabel = REPORT_FIELDS.find((f) => f.key === r.field)?.label ?? null;
  const subject = target?.name ?? event?.title ?? article?.title ?? r.targetLabel;
  const correction = status === "resolved" && kind === "report_fact" && (target || event || article);

  await db.$transaction(async (tx) => {
    if (decision === "escalate") {
      await tx.report.update({ where: { id: r.id }, data: { flags: J(withFlag(flags, ESCALATED)) } });
    } else if (status === "checking") {
      await tx.report.update({
        where: { id: r.id },
        data: {
          status: "checking",
          flags: J(withFlag(without(flags, ESCALATED), INFO_REQUESTED)),
          timeline: J([...timeline, { status: "checking", at, note: note ?? "An editor is checking this and has asked for more information." }]),
        },
      });
    } else {
      const resolution =
        note ??
        (kind === "report_concern"
          ? "Read by the separate review team and noted on the listing’s private file."
          : kind === "report_locality"
            ? `${reason}.`
            : status === "resolved"
              ? `Checked and corrected (${reason.toLowerCase()}).`
              : status === "rejected"
                ? "Not taken forward: we already had this report."
                : "We checked and couldn’t confirm a change, so the listing stays as it is.");
      await tx.report.update({
        where: { id: r.id },
        data: {
          status: status!,
          resolution,
          resolvedAt: now,
          resolvedById: user.id,
          flags: J(without(flags, ESCALATED, INFO_REQUESTED)),
          timeline: J([...timeline, { status: status!, at, note: resolution }]),
        },
      });
      if (correction) {
        await tx.correction.create({
          data: {
            kind: "corrected",
            text: note ? `${subject}: ${note}` : `${subject}: ${fieldLabel ? `${fieldLabel.toLowerCase()} corrected` : "corrected"} after a resident report (${r.ref}).`,
            happenedAt: now,
            providerId: target?.id ?? null,
            eventId: event?.id ?? null,
            articleId: article?.id ?? null,
          },
        });
      }
    }
    await audit(ctx, kind, { id: r.ref, label: r.ref }, tx);
  });
  const threadId = r.targetKind === "thread" ? r.targetId : null;
  return {
    ok: true,
    applied: {
      tags: [
        r.reporterId && tags.activity(r.reporterId),
        target && tags.provider(target.slug),
        target && tags.providers,
        event && tags.event(event.slug),
        event && tags.events,
        article && tags.article(article.slug),
        article && tags.articles,
        threadId && tags.thread(threadId),
        correction && tags.corrections,
      ],
      publicNow: !!correction,
      label: r.ref,
      kind,
    },
  };
}

async function decideEvent(ctx: Ctx): Promise<Outcome> {
  const e = await db.event.findUnique({ where: { slug: ctx.itemId }, include: { society: { select: { slug: true } } } });
  if (!e || !e.submittedAt) return notFoundOutcome(ctx.t);
  const bad = checkDecision(ctx, "event");
  if (bad) return { ok: false, state: bad };
  if (e.status !== "awaiting_review" && e.status !== "changes_requested") return decided(ctx.t);
  const { decision, reason, note, now, user } = ctx;
  const flags = asStringArray(e.flags);
  const timeline = asArray<TimelineEntry>(e.timeline);
  const at = now.toISOString();
  const status = eventOutcome(decision);
  const called = reason === "Organiser confirmed by call";
  await db.$transaction(async (tx) => {
    if (decision === "escalate") {
      await tx.event.update({ where: { id: e.id }, data: { flags: J(withFlag(flags, ESCALATED)) } });
    } else if (status === "verified") {
      const checks = asArray<AutoCheck>(e.autoChecks).map((c) => (called && c.text === "Organiser not yet called" ? { ok: true, text: "Organiser called and confirmed" } : c));
      await tx.event.update({
        where: { id: e.id },
        data: {
          status: "verified",
          verifiedAt: now,
          verifiedById: user.id,
          organiserVerified: called ? true : e.organiserVerified,
          source: called ? `Called organiser on ${formatDate(now)}` : `${reason}, ${formatDate(now)}`,
          requestedChanges: null,
          autoChecks: J(checks),
          flags: J(without(flags, ESCALATED, "Needs organiser call")),
          timeline: J([...timeline, { status: "verified", at, note: note ?? (called ? "We called the organiser and confirmed the details." : `${reason}.`) }]),
        },
      });
    } else if (status === "changes_requested") {
      await tx.event.update({
        where: { id: e.id },
        data: { status, requestedChanges: note, flags: J(without(flags, ESCALATED)), timeline: J([...timeline, { status, at, note: note ?? reason }]) },
      });
    } else {
      await tx.event.update({
        where: { id: e.id },
        data: { status: "rejected", flags: J(without(flags, ESCALATED)), timeline: J([...timeline, { status: "rejected", at, note: note ? `${reason}. ${note}` : `${reason}.` }]) },
      });
    }
    await audit(ctx, "event", { id: e.slug, label: e.ref ? shortRef(e.ref) : e.slug }, tx);
  });
  return {
    ok: true,
    applied: {
      tags: [
        tags.event(e.slug),
        tags.events,
        e.submitterId && tags.activity(e.submitterId),
        e.localitySlug && tags.locality(e.localitySlug),
        e.society && tags.society(e.society.slug),
        e.society && tags.societies,
      ],
      publicNow: decision === "approve",
      label: e.ref ? shortRef(e.ref) : e.slug,
      kind: "event",
    },
  };
}

async function decideClaim(ctx: Ctx): Promise<Outcome> {
  const c = await db.claim.findUnique({
    where: { ref: ctx.itemId },
    include: { provider: { select: { id: true, slug: true, claimed: true } }, claimant: { select: { id: true, role: true } } },
  });
  if (!c) return notFoundOutcome(ctx.t);
  const bad = checkDecision(ctx, "claim");
  if (bad) return { ok: false, state: bad };
  if (c.status === "approved" || c.status === "rejected") return decided(ctx.t);
  const { decision, reason, note, now, user } = ctx;
  if (decision === "approve" && c.provider.claimed) return { ok: false, state: fail("already_claimed", ctx.t.actions.alreadyClaimed) };
  const status = claimOutcome(decision);
  // The claimant manages the profile from now on: a resident becomes a provider (◐ "edit own
  // provider profile"). Staff and other roles keep theirs.
  const promote = decision === "approve" && c.claimant?.role === "resident";
  await db.$transaction(async (tx) => {
    await tx.claim.update({
      where: { id: c.id },
      data: { status, decisionReason: note ? `${reason}. ${note}` : reason, decidedAt: now, decidedById: user.id, ...(decision === "escalate" ? { flags: J(withFlag(asStringArray(c.flags), ESCALATED)) } : {}) },
    });
    if (decision === "approve") await tx.provider.update({ where: { id: c.provider.id }, data: { claimed: true } });
    if (promote && c.claimant) {
      await tx.user.update({ where: { id: c.claimant.id }, data: { role: "provider" } });
      await writeAudit({ actor: user, action: "role.change", target: { kind: "user", id: c.claimant.id, label: `Claimant of ${shortRef(c.ref)}` }, reason: "Profile claim approved", details: { from: "resident", to: "provider" } }, tx);
    }
    await audit(ctx, "claim", { id: c.ref, label: shortRef(c.ref) }, tx);
  });
  return {
    ok: true,
    applied: { tags: [tags.provider(c.provider.slug), tags.providers, c.claimantId && tags.activity(c.claimantId)], publicNow: decision === "approve", label: shortRef(c.ref), kind: "claim" },
  };
}

async function decideDispute(ctx: Ctx): Promise<Outcome> {
  const d = await db.dispute.findUnique({ where: { ref: ctx.itemId }, include: { provider: { select: { slug: true } } } });
  if (!d) return notFoundOutcome(ctx.t);
  const bad = checkDecision(ctx, "dispute");
  if (bad) return { ok: false, state: bad };
  if (d.status !== "received" && d.status !== "under_review") return decided(ctx.t);
  const { decision, reason, note, now, user } = ctx;
  const status = disputeOutcome(decision, reason)!;
  const final = status !== "under_review";
  await db.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: d.id },
      data: final ? { status, outcomeText: redactPersonalData(note ?? reason).text, outcomePublishedAt: now, decidedById: user.id } : { status },
    });
    await audit(ctx, "dispute", { id: d.ref, label: shortRef(d.ref) }, tx, { outcome: status });
  });
  return {
    ok: true,
    applied: {
      tags: [
        final && tags.disputes,
        d.filerId && tags.activity(d.filerId),
        final && d.topListSlug && tags.topList(d.topListSlug),
        final && d.topListSlug && tags.topLists,
        final && d.target === "mention" && tags.mentions,
        final && d.provider && tags.provider(d.provider.slug),
      ],
      publicNow: final,
      label: shortRef(d.ref),
      kind: "dispute",
    },
  };
}

/** "New question": approving opens the thread; rejecting keeps it hidden. */
async function decideFlag(ctx: Ctx): Promise<Outcome> {
  const f = await db.contentFlag.findUnique({ where: { ref: ctx.itemId } });
  if (!f) return notFoundOutcome(ctx.t);
  const kind = flagKind(f.targetKind, f.reason);
  const bad = checkDecision(ctx, kind);
  if (bad) return { ok: false, state: bad };
  if (f.status !== "open") return decided(ctx.t);
  const { decision, reason, note, now, user } = ctx;
  const flags = asStringArray(f.flags);
  const keep = decision === "approve";
  const tagList: Applied["tags"] = [];
  let publicNow = false;

  await db.$transaction(async (tx) => {
    if (decision === "escalate") {
      await tx.contentFlag.update({ where: { id: f.id }, data: { flags: J(withFlag(flags, ESCALATED)) } });
      await audit(ctx, kind, { id: f.ref, label: shortRef(f.ref) }, tx);
      return;
    }
    await tx.contentFlag.update({
      where: { id: f.id },
      data: { status: keep ? "dismissed" : "resolved", decisionReason: note ? `${reason}. ${note}` : reason, resolvedById: user.id, resolvedAt: now, flags: J(without(flags, ESCALATED)) },
    });
    // The person who reported it sees the outcome in their activity straight away.
    tagList.push(f.reporterId && tags.activity(f.reporterId));

    if (f.targetKind === "thread") {
      const thread = await tx.thread.findUnique({ where: { id: f.targetId }, select: { id: true, status: true, authorId: true, flags: true, provider: { select: { slug: true } }, localitySlug: true } });
      if (thread) {
        const threadFlags = without(asStringArray(thread.flags), "Awaiting approval");
        if (keep && (thread.status === "pending" || thread.status === "hidden")) {
          await tx.thread.update({ where: { id: thread.id }, data: { status: "open", lastActivityAt: now, flags: J(threadFlags) } });
        } else if (!keep && thread.status !== "removed") {
          await tx.thread.update({ where: { id: thread.id }, data: { status: "hidden", flags: J(threadFlags) } });
        }
        publicNow = keep;
        tagList.push(tags.thread(thread.id), tags.threads, thread.authorId && tags.activity(thread.authorId), thread.authorId && tags.follows(thread.authorId), thread.provider && tags.provider(thread.provider.slug), thread.localitySlug && tags.locality(thread.localitySlug));
      }
    } else if (f.targetKind === "post") {
      const post = await tx.post.findUnique({ where: { id: f.targetId }, select: { id: true, status: true, flags: true, professionalLabel: true, threadId: true, thread: { select: { answeredBy: true, status: true } } } });
      if (post) {
        const postFlags = without(asStringArray(post.flags), "Awaiting approval");
        if (keep && post.status !== "published") {
          // Publishing a reply: it counts in the thread's replies and moves the thread up.
          const who = post.professionalLabel?.match(/\b(pharmacist|doctor)\b/i)?.[1];
          await tx.post.update({ where: { id: post.id }, data: { status: "published", flags: J(postFlags) } });
          await tx.thread.update({
            where: { id: post.threadId },
            data: { replyCount: { increment: 1 }, lastActivityAt: now, ...(who && !post.thread.answeredBy ? { answeredBy: who[0].toUpperCase() + who.slice(1).toLowerCase() } : {}) },
          });
        } else if (!keep && post.status !== "hidden" && post.status !== "removed") {
          await tx.post.update({ where: { id: post.id }, data: { status: "hidden", flags: J(postFlags) } });
          if (post.status === "published") await tx.thread.update({ where: { id: post.threadId }, data: { replyCount: { decrement: 1 } } });
        }
        publicNow = keep && (post.thread.status === "open" || post.thread.status === "resolved");
        tagList.push(tags.thread(post.threadId), tags.threads);
      }
    } else if (f.targetKind === "review") {
      const review = await tx.review.findUnique({ where: { id: f.targetId }, select: { id: true, status: true, authorId: true, provider: { select: { slug: true } } } });
      if (review) {
        if (!keep && review.status === "published") {
          await tx.review.update({ where: { id: review.id }, data: { status: "rejected", moderationReason: reason, moderatedById: user.id, moderatedAt: now } });
        }
        publicNow = keep && review.status === "published";
        tagList.push(tags.reviews(review.provider.slug), tags.provider(review.provider.slug), review.authorId && tags.activity(review.authorId));
      }
    } else if (f.targetKind === "story") {
      const story = await tx.story.findUnique({ where: { id: f.targetId }, select: { id: true, status: true, submitterId: true } });
      if (story) {
        if (!keep && story.status === "published") await tx.story.update({ where: { id: story.id }, data: { status: "withdrawn" } });
        publicNow = keep && story.status === "published";
        tagList.push(tags.stories, story.submitterId && tags.activity(story.submitterId));
      }
    }
    // Content that is removed takes every other open report about it with it.
    if (!keep) {
      const others = await tx.contentFlag.findMany({
        where: { targetKind: f.targetKind, targetId: f.targetId, status: "open", id: { not: f.id }, reporterId: { not: null } },
        select: { reporterId: true },
      });
      tagList.push(...others.map((o) => o.reporterId && tags.activity(o.reporterId)));
      await tx.contentFlag.updateMany({
        where: { targetKind: f.targetKind, targetId: f.targetId, status: "open", id: { not: f.id } },
        data: { status: "resolved", decisionReason: `Removed with ${f.ref}`, resolvedById: user.id, resolvedAt: now },
      });
    }
    await audit(ctx, kind, { id: f.ref, label: shortRef(f.ref) }, tx);
  });
  return { ok: true, applied: { tags: tagList, publicNow, label: shortRef(f.ref), kind } };
}

async function decideSociety(ctx: Ctx): Promise<Outcome> {
  const s = await db.society.findUnique({ where: { ref: ctx.itemId } });
  if (!s) return notFoundOutcome(ctx.t);
  const bad = checkDecision(ctx, "society");
  if (bad) return { ok: false, state: bad };
  if (s.status !== "pending") return decided(ctx.t);
  const verify = ctx.decision === "approve";
  await db.$transaction(async (tx) => {
    await tx.society.update({ where: { id: s.id }, data: verify ? { status: "verified", verifiedAt: ctx.now, memberSince: s.memberSince ?? ctx.now } : { status: "rejected" } });
    await audit(ctx, "society", { id: s.ref!, label: s.shortName }, tx);
  });
  return { ok: true, applied: { tags: [tags.society(s.slug), tags.societies, s.localitySlug && tags.locality(s.localitySlug)], publicNow: verify, label: shortRef(s.ref!), kind: "society" } };
}

async function decideVolunteer(ctx: Ctx): Promise<Outcome> {
  const a = await db.volunteerApplication.findUnique({ where: { ref: ctx.itemId } });
  if (!a) return notFoundOutcome(ctx.t);
  const bad = checkDecision(ctx, "volunteer");
  if (bad) return { ok: false, state: bad };
  if (a.status !== "received" && a.status !== "call_scheduled") return decided(ctx.t);
  const status = volunteerOutcome(ctx.decision)!;
  await db.$transaction(async (tx) => {
    await tx.volunteerApplication.update({ where: { id: a.id }, data: { status } });
    await audit(ctx, "volunteer", { id: a.ref, label: shortRef(a.ref) }, tx, { status });
  });
  return { ok: true, applied: { tags: [a.userId && tags.activity(a.userId)], publicNow: false, label: shortRef(a.ref), kind: "volunteer" } };
}

async function decideStory(ctx: Ctx): Promise<Outcome> {
  const s = await db.story.findFirst({ where: { OR: [{ ref: ctx.itemId }, { slug: ctx.itemId }] }, include: { provider: { select: { slug: true } } } });
  if (!s) return notFoundOutcome(ctx.t);
  const bad = checkDecision(ctx, "story");
  if (bad) return { ok: false, state: bad };
  if (s.status !== "pending") return decided(ctx.t);
  const { decision, now } = ctx;
  let data: Prisma.StoryUpdateInput = { status: "withdrawn" };
  if (decision === "approve") {
    const parsed = parseForm(storyPublishSchema, ctx.formData);
    if (!parsed.ok) return { ok: false, state: fail("invalid_input", ctx.t.actions.storyFields, localErrors(parsed.state, ctx.lang, ctx.t)) };
    const p = parsed.data;
    data = {
      status: "published",
      publishedAt: now,
      title: redactPersonalData(p.storyTitle).text,
      category: p.storyCategory,
      transcript: redactPersonalData(p.storyTranscript).text,
      durationLabel: s.format === "video" ? (p.storyDuration ?? "") : "",
      meta: p.storyMeta ? redactPersonalData(p.storyMeta).text.toUpperCase() : storyMeta(p.storyCategory, now),
      visitConfirmed: true,
      privacyEdited: true,
    };
  }
  const ref = s.ref ?? s.slug;
  await db.$transaction(async (tx) => {
    await tx.story.update({ where: { id: s.id }, data });
    await audit(ctx, "story", { id: ref, label: shortRef(ref) }, tx);
  });
  return {
    ok: true,
    applied: { tags: [tags.stories, s.submitterId && tags.activity(s.submitterId), s.provider && tags.provider(s.provider.slug)], publicNow: decision === "approve", label: shortRef(ref), kind: "story" },
  };
}

/** Approve / Reject / Request info / Escalate. Fields: queue, itemId, decision, reason, note,
 * lang (+ the story fields when publishing a story). */
export async function decideQueueItem(_prev: ActionState<DecisionData>, formData: FormData): Promise<ActionState<DecisionData>> {
  const lang = formLang(formData);
  const t = adminStrings(lang);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t.actions.signIn);
  if (!isStaff(user.role)) return notAllowed(t.actions.forbidden);
  const parsed = parseForm(moderationDecisionSchema, formData);
  if (!parsed.ok) {
    const fe = parsed.state.status === "error" ? parsed.state.fieldErrors : undefined;
    if (fe?.reason) return fail("invalid_input", t.actions.reasonFirst, { reason: [t.actions.reasonFirst] });
    return fail("invalid_input", t.actions.notFound);
  }
  const { queue, itemId, decision, reason } = parsed.data;
  if (!isModerationQueue(queue) || !canOpenQueue(user.role, queue)) return notAllowed(t.actions.forbidden);
  const note = parsed.data.note ? redactPersonalData(parsed.data.note).text : null;
  const ctx: Ctx = { user, t, lang, itemId, decision, reason, note, formData, now: new Date() };

  let outcome: Outcome;
  switch (queue) {
    case "reviews":
      outcome = await decideReview(ctx);
      break;
    case "reports":
      outcome = await decideReport(ctx);
      break;
    case "events":
      outcome = await decideEvent(ctx);
      break;
    case "claims":
      outcome = await decideClaim(ctx);
      break;
    case "disputes":
      outcome = await decideDispute(ctx);
      break;
    case "community":
      outcome = itemId.startsWith("HG-RWA-") ? await decideSociety(ctx) : itemId.startsWith("HG-VOL-") ? await decideVolunteer(ctx) : await decideFlag(ctx);
      break;
    case "stories":
      outcome = await decideStory(ctx);
      break;
  }
  if (!outcome.ok) {
    if (outcome.state.status === "error" && outcome.state.code === "already_decided") refresh();
    return outcome.state;
  }
  expireTags(...outcome.applied.tags);
  refresh();
  const words = t.decide.buttons[buttonGroup(outcome.applied.kind)] ?? t.decide.buttons.default;
  const label = words[decision];
  return ok(`${fmt(t.done.message, { action: label, ref: outcome.applied.label })}${outcome.applied.publicNow ? ` ${t.done.live}` : ""}`, {
    itemId,
    decision,
    publicNow: outcome.applied.publicNow,
  });
}

// ── Reveal (logged) ─────────────────────────────────────────────────────────

export type RevealData = { text: string | null };

/** Fields: queue, itemId, lang. Editors and admins; the view is written to the audit log. */
export async function revealPrivate(_prev: ActionState<RevealData>, formData: FormData): Promise<ActionState<RevealData>> {
  const t = adminStrings(formLang(formData));
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t.actions.signIn);
  if (user.role !== "editor" && user.role !== "admin") return notAllowed(t.actions.forbidden);
  const queue = String(formData.get("queue") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  if (!isModerationQueue(queue) || !canOpenQueue(user.role, queue) || !/^[A-Za-z0-9_-]{1,120}$/.test(itemId)) return fail("not_found", t.actions.notFound);
  const text = await revealPrivateDetails(queue, itemId);
  return ok("", { text });
}

// ── Verification desk ───────────────────────────────────────────────────────

export type CheckData = { slug: string; published: boolean };

/** "Record check": the listing's facts were re-checked today. A listing not yet verified is
 * published. Fields: slug, reason, source, lang. */
export async function recordCheck(_prev: ActionState<CheckData>, formData: FormData): Promise<ActionState<CheckData>> {
  const lang = formLang(formData);
  const t = adminStrings(lang);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t.actions.signIn);
  if (!canOpenQueue(user.role, "verification")) return notAllowed(t.actions.forbidden);
  const parsed = parseForm(recordCheckSchema, formData);
  if (!parsed.ok) {
    const fe = localErrors(parsed.state, lang, t);
    return fail("invalid_input", fe?.reason ? t.actions.reasonFirst : t.actions.checkFields, fe?.reason ? { ...fe, reason: [t.actions.reasonFirst] } : fe);
  }
  const { slug, reason } = parsed.data;
  const source = parsed.data.source ? redactPersonalData(parsed.data.source).text : null;
  const p = await db.provider.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, status: true } });
  if (!p || (p.status !== "published" && p.status !== "pending")) return fail("not_found", t.actions.notFound);
  const now = new Date();
  const publish = p.status === "pending";
  await db.$transaction(async (tx) => {
    await tx.provider.update({ where: { id: p.id }, data: { lastCheckedAt: now, nextCheckAt: new Date(now.getTime() + 90 * 86_400_000), ...(publish ? { status: "published" } : {}) } });
    await tx.verificationRecord.create({
      data: {
        providerId: p.id,
        field: "listing",
        label: "Listing details re-checked",
        method: source ? `${reason} · ${source}` : reason,
        result: "verified",
        note: `✓ ${reason}, ${formatDateLabel(now)}`,
        showAsFact: false,
        showInLog: true,
        checkedAt: now,
        checkedById: user.id,
        sortOrder: 99,
      },
    });
    await writeAudit({ actor: user, action: "provider.verify", target: { kind: "provider", id: p.slug, label: p.name }, reason, details: { ...(source ? { source } : {}), ...(publish ? { published: true } : {}) } }, tx);
  });
  expireTags(tags.provider(p.slug), tags.providers, tags.featured);
  // Back to the desk with the confirmation (the checked listing leaves the list).
  const within = Number(formData.get("within"));
  const qs = new URLSearchParams({ checked: p.slug, ...(publish ? { published: "1" } : {}), ...([30, 90].includes(within) ? { within: String(within) } : {}) });
  redirect(`${routes.adminQueue(lang, "verification")}?${qs.toString()}`);
}

// ── Listings editor ─────────────────────────────────────────────────────────

export type ListingData = { slug: string; changes: number };

/** Correct a listing's facts. Fields: slug, status, hoursSummary, hoursSource, consultationFee,
 * feeVerified, keyFact, reason, source, lang. Resident-facing changes become ListingChange lines
 * ("changed since you saved it") and a line in the public corrections log. */
export async function updateListing(_prev: ActionState<ListingData>, formData: FormData): Promise<ActionState<ListingData>> {
  const lang = formLang(formData);
  const t = adminStrings(lang);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t.actions.signIn);
  if (!canOpenQueue(user.role, "listings")) return notAllowed(t.actions.forbidden);
  const parsed = parseForm(listingEditSchema, formData);
  if (!parsed.ok) {
    const fe = localErrors(parsed.state, lang, t);
    const onlyReason = !!fe?.reason && Object.keys(fe).length === 1;
    return fail("invalid_input", onlyReason ? t.actions.reasonFirst : t.actions.checkFields, onlyReason ? { reason: [t.actions.reasonFirst] } : fe);
  }
  const d = parsed.data;
  const p = await db.provider.findUnique({
    where: { slug: d.slug },
    select: { id: true, slug: true, name: true, status: true, hoursSummary: true, hoursSource: true, consultationFee: true, feeVerified: true, keyFact: true, featured: { select: { id: true }, take: 1 } },
  });
  if (!p || p.status === "merged" || p.status === "pending") return fail("not_found", t.actions.notFound);
  const clean = (s: string | undefined) => (s ? redactPersonalData(s).text.trim() || null : null);
  const before: ListingEdit = { status: p.status as ListingEdit["status"], hoursSummary: p.hoursSummary, consultationFee: p.consultationFee, feeVerified: p.feeVerified, keyFact: p.keyFact };
  const after: ListingEdit = {
    status: d.status,
    hoursSummary: clean(d.hoursSummary),
    consultationFee: d.consultationFee,
    feeVerified: d.consultationFee === null ? false : d.feeVerified,
    keyFact: clean(d.keyFact),
  };
  const hoursSource = clean(d.hoursSource);
  const lines = listingChanges(before, after);
  const sourceChanged = (hoursSource ?? null) !== (p.hoursSource ?? null);
  if (!lines.length && !sourceChanged) return fail("no_change", t.actions.noChange);

  const source = clean(d.source);
  const now = new Date();
  const hoursChanged = lines.some((l) => l.field === "hours") || sourceChanged;
  const publicLines = lines.filter((l) => l.field !== "key_fact");
  await db.$transaction(async (tx) => {
    await tx.provider.update({
      where: { id: p.id },
      data: { ...after, hoursSource, ...(hoursChanged ? { hoursCheckedAt: now } : {}) },
    });
    for (const l of publicLines) {
      await tx.listingChange.create({ data: { providerId: p.id, field: l.field, summary: l.summary, source: source ?? d.reason, changedAt: now } });
    }
    if (publicLines.length) {
      await tx.correction.create({ data: { kind: "updated", text: `${p.name}: ${publicLines.map((l) => l.summary).join(" ")}`, happenedAt: now, providerId: p.id } });
    }
    const onlyHours = lines.length > 0 && lines.every((l) => l.field === "hours");
    await writeAudit(
      {
        actor: user,
        action: onlyHours || (!lines.length && sourceChanged) ? "provider.update_hours" : "provider.update",
        target: { kind: "provider", id: p.slug, label: p.name },
        reason: d.reason,
        details: {
          changes: lines.map((l) => ({ field: l.field, before: l.before, after: l.after })),
          ...(source ? { source } : {}),
          ...(sourceChanged ? { hoursSource: { before: p.hoursSource, after: hoursSource } } : {}),
        },
      },
      tx,
    );
  });
  expireTags(tags.provider(p.slug), tags.providers, p.featured.length > 0 && tags.featured, publicLines.length > 0 && tags.corrections, before.status !== after.status && tags.topLists);
  refresh();
  return ok(lines.length === 1 || !lines.length ? t.listings.savedOne : fmt(t.listings.saved, { n: lines.length }), { slug: p.slug, changes: lines.length });
}

// ── Roles (admins) ──────────────────────────────────────────────────────────

export type RoleData = { userId: string; role: string };

async function setRole(user: SessionUser, t: AdminStrings, lang: "en" | "hi", target: { id: string; role: string; displayName: string | null; phone: string }, role: string, reason: string): Promise<ActionState<RoleData>> {
  if (target.id === user.id) return fail("own_role", t.actions.ownRole);
  if (target.role === role) return ok(fmt(t.staff.changed, { role: t.roles[role] ?? role }), { userId: target.id, role });
  if (target.role === "admin") {
    const admins = await db.user.count({ where: { role: "admin", deletedAt: null } });
    if (admins <= 1) return fail("last_admin", t.actions.lastAdmin);
  }
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { role: role as SessionUser["role"] } });
    await writeAudit(
      { actor: user, action: "role.change", target: { kind: "user", id: target.id, label: target.displayName || maskPhone(target.phone) }, reason, details: { from: target.role, to: role } },
      tx,
    );
  });
  // Back to the overview with the confirmation: a person who is no longer staff leaves the list.
  redirect(`${routes.admin(lang)}?changed=${encodeURIComponent(target.id)}#hg-staff`);
}

/** Fields: userId, role, reason, lang. Admins only. */
export async function changeRole(_prev: ActionState<RoleData>, formData: FormData): Promise<ActionState<RoleData>> {
  const lang = formLang(formData);
  const t = adminStrings(lang);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t.actions.signIn);
  if (user.role !== "admin") return notAllowed(t.actions.forbidden);
  const parsed = parseForm(roleChangeSchema, formData);
  if (!parsed.ok) return fail("invalid_input", t.actions.checkFields, localErrors(parsed.state, lang, t));
  const target = await db.user.findFirst({ where: { id: parsed.data.userId, deletedAt: null }, select: { id: true, role: true, displayName: true, phone: true } });
  if (!target) return fail("not_found", t.actions.notFound);
  return setRole(user, t, lang, target, parsed.data.role, parsed.data.reason);
}

/** Fields: phone, role, reason, lang. Admins only; the person must have signed in once. */
export async function grantRole(_prev: ActionState<RoleData>, formData: FormData): Promise<ActionState<RoleData>> {
  const lang = formLang(formData);
  const t = adminStrings(lang);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t.actions.signIn);
  if (user.role !== "admin") return notAllowed(t.actions.forbidden);
  const parsed = parseForm(grantRoleSchema, formData);
  if (!parsed.ok) return fail("invalid_input", t.actions.checkFields, localErrors(parsed.state, lang, t));
  const target = await db.user.findFirst({ where: { phone: parsed.data.phone, deletedAt: null }, select: { id: true, role: true, displayName: true, phone: true } });
  if (!target) return fail("unknown_phone", t.actions.unknownPhone, { phone: [t.actions.unknownPhone] });
  return setRole(user, t, lang, target, parsed.data.role, parsed.data.reason);
}

// ── Audit export (admins) ───────────────────────────────────────────────────

export type ExportData = { csv: string; filename: string; rows: number };

/** "Export CSV": the latest 2,000 audit lines. The export itself is logged. */
export async function exportAuditLog(_prev: ActionState<ExportData>, formData: FormData): Promise<ActionState<ExportData>> {
  const t = adminStrings(formLang(formData));
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t.actions.signIn);
  if (user.role !== "admin" || !QUEUE_ACCESS.audit.includes(user.role)) return notAllowed(t.actions.forbidden);
  const rows = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
  const head = ["time_utc", "actor", "actor_role", "action", "target_kind", "target_id", "target_label", "reason"];
  const lines = rows.map((r) => [r.createdAt.toISOString(), r.actorLabel, r.actorRole, r.action, r.targetKind, r.targetId, r.targetLabel, r.reason].map(csvCell).join(","));
  const now = new Date();
  await writeAudit({ actor: user, action: "audit.export", target: { kind: "audit", label: `${rows.length} lines` }, reason: "Audit export" });
  return ok("", { csv: [head.join(","), ...lines].join("\n"), filename: `healthgurgaon-audit-${now.toISOString().slice(0, 10)}.csv`, rows: rows.length });
}
