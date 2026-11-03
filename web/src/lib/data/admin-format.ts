// Small formatting helpers and moderation rules for the admin pages. Pure (no server imports):
// the pages, the Server Actions (src/app/actions/admin*.ts) and the unit tests share them.

import { dayTile } from "@/lib/dates";
import { STORY_CATEGORIES } from "@/lib/domain";
import { MODERATION_REASONS } from "@/lib/validation/moderation";

/** "9 Nov" */
export function dayTileLabel(date: Date): string {
  const t = dayTile(date);
  return `${Number(t.day)} ${t.mon[0]}${t.mon.slice(1).toLowerCase()}`;
}

export function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

// ── What a queue item is ────────────────────────────────────────────────────

/** Every kind of item the moderation queues hold. The community queue also lists pending
 * societies (HG-RWA-…) and volunteer applications (HG-VOL-…). */
export const QUEUE_ITEM_KINDS = [
  "review",
  "review_edit",
  "report_fact",
  "report_concern",
  "report_missing",
  "report_locality",
  "event",
  "claim",
  "dispute",
  "new_question",
  "new_reply",
  "flag_post",
  "flag_thread",
  "flag_review",
  "flag_story",
  "society",
  "volunteer",
  "story",
] as const;
export type QueueItemKind = (typeof QUEUE_ITEM_KINDS)[number];

/** ContentFlag rows: a new question or reply waiting for approval, or a resident's report of
 * something already published. */
export const NEW_QUESTION_REASON = "New question awaiting approval";
export const NEW_REPLY_REASON = "New reply awaiting approval";

export function flagKind(targetKind: string, reason: string): QueueItemKind {
  if (targetKind === "thread") return reason === NEW_QUESTION_REASON ? "new_question" : "flag_thread";
  if (targetKind === "post") return reason === NEW_REPLY_REASON ? "new_reply" : "flag_post";
  if (targetKind === "review") return "flag_review";
  if (targetKind === "story") return "flag_story";
  return "flag_post";
}

export function reportKind(type: "fact" | "complaint" | "missing", targetKind: string | null): QueueItemKind {
  if (type === "complaint") return "report_concern";
  if (type === "missing") return targetKind === "locality" ? "report_locality" : "report_missing";
  return "report_fact";
}

// ── Decisions ───────────────────────────────────────────────────────────────

export type Decision = "approve" | "reject" | "request_info" | "escalate";
export const DECISIONS: readonly Decision[] = ["approve", "reject", "request_info", "escalate"];

/** The buttons each kind of item gets, in the prototype's order (Approve, Reject, Request info,
 * Escalate). Kinds whose rows can't record a step leave it out (a story has no "escalated"
 * state; a dispute is already with an editor). */
export const KIND_DECISIONS: Record<QueueItemKind, readonly Decision[]> = {
  review: DECISIONS,
  review_edit: ["approve", "reject", "escalate"],
  report_fact: DECISIONS,
  report_concern: DECISIONS,
  report_missing: DECISIONS,
  report_locality: ["approve", "reject", "escalate"],
  event: DECISIONS,
  claim: DECISIONS,
  dispute: ["approve", "reject", "request_info"],
  new_question: ["approve", "reject", "escalate"],
  new_reply: ["approve", "reject", "escalate"],
  flag_post: ["approve", "reject", "escalate"],
  flag_thread: ["approve", "reject", "escalate"],
  flag_review: ["approve", "reject", "escalate"],
  flag_story: ["approve", "reject", "escalate"],
  society: ["approve", "reject"],
  volunteer: ["approve", "reject", "request_info"],
  story: ["approve", "reject"],
};

/** "Reason (required, shown in audit log)": the options per kind. Reviews, reports, events,
 * claims, community and disputes are the prototype's lists (src/lib/validation/moderation.ts). */
export const STORY_REASONS = [
  "Visit confirmed, edited for privacy, teller approved",
  "Couldn’t confirm the visit",
  "Teller withdrew consent",
  "Paid or asked for by the provider",
  "Personal or medical details can’t be removed",
] as const;
/** "Report this video" on a published story: the community reasons, plus a teller changing their mind. */
export const FLAG_STORY_REASONS = [...MODERATION_REASONS.community, "Teller withdrew consent"] as const;
export const SOCIETY_REASONS =["Committee confirmed by call", "Couldn’t reach the contact", "Not a residents’ group", "Duplicate of a listed society"] as const;
export const VOLUNTEER_REASONS = ["Call done, good fit", "Registration checked", "Call scheduled with the coordinator", "Couldn’t reach the applicant", "Registration not valid", "Role is full"] as const;
export const LOCALITY_REASONS = ["Added as a new locality", "Linked to an existing locality", "Not in Gurugram", "Duplicate suggestion"] as const;
export const VERIFY_REASONS = ["Confirmed by phone call", "Matched on the council register", "Visited in person", "Confirmed by the provider in writing"] as const;
export const LISTING_REASONS = ["Confirmed by phone call", "Resident report confirmed", "Provider’s own update", "Visited in person", "Duplicate or closed"] as const;
export const ROLE_REASONS = ["Joined the moderation team", "Changed responsibilities", "Left the team", "Access review"] as const;

export function reasonsFor(kind: QueueItemKind): readonly string[] {
  switch (kind) {
    case "review":
    case "review_edit":
    case "flag_review":
      return MODERATION_REASONS.reviews;
    case "report_fact":
    case "report_concern":
    case "report_missing":
      return MODERATION_REASONS.reports;
    case "report_locality":
      return LOCALITY_REASONS;
    case "event":
      return MODERATION_REASONS.events;
    case "claim":
      return MODERATION_REASONS.claims;
    case "dispute":
      return MODERATION_REASONS.disputes;
    case "story":
      return STORY_REASONS;
    case "flag_story":
      return FLAG_STORY_REASONS;
    case "society":
      return SOCIETY_REASONS;
    case "volunteer":
      return VOLUNTEER_REASONS;
    default:
      return MODERATION_REASONS.community;
  }
}

/** A decision needs a note: a returned review or event says what to change; a dispute outcome
 * is published with a one-line reason; a published story needs its text. */
export function noteRequired(kind: QueueItemKind, decision: Decision): boolean {
  if (decision === "request_info") return kind === "event";
  if (kind === "dispute") return decision === "approve" || decision === "reject";
  return false;
}

// Status each decision leads to, per kind (the row's own vocabulary).

export function reviewOutcome(decision: Decision): "published" | "rejected" | "needs_changes" | null {
  return decision === "approve" ? "published" : decision === "reject" ? "rejected" : decision === "request_info" ? "needs_changes" : null;
}

export function reportOutcome(decision: Decision, reason: string): "resolved" | "no_change" | "rejected" | "checking" | null {
  if (decision === "approve") return "resolved";
  if (decision === "reject") return reason === "Duplicate report" || reason === "Duplicate suggestion" ? "rejected" : "no_change";
  if (decision === "request_info") return "checking";
  return null;
}

export function eventOutcome(decision: Decision): "verified" | "rejected" | "changes_requested" | null {
  return decision === "approve" ? "verified" : decision === "reject" ? "rejected" : decision === "request_info" ? "changes_requested" : null;
}

export function claimOutcome(decision: Decision): "approved" | "rejected" | "info_requested" | "escalated" {
  return decision === "approve" ? "approved" : decision === "reject" ? "rejected" : decision === "request_info" ? "info_requested" : "escalated";
}

export function disputeOutcome(decision: Decision, reason: string): "upheld" | "partly_upheld" | "not_upheld" | "under_review" | null {
  if (decision === "approve") return reason === "Partly upheld" ? "partly_upheld" : "upheld";
  if (decision === "reject") return "not_upheld";
  if (decision === "request_info") return "under_review";
  return null;
}

export function volunteerOutcome(decision: Decision): "accepted" | "declined" | "call_scheduled" | null {
  return decision === "approve" ? "accepted" : decision === "reject" ? "declined" : decision === "request_info" ? "call_scheduled" : null;
}

/** The audit log's verb for a decision on a kind ("review.approve", "report.resolve", …). */
export function auditAction(kind: QueueItemKind, decision: Decision): string {
  const entity = AUDIT_ENTITY[kind];
  if (decision === "escalate") return `${entity}.escalate`;
  if (decision === "request_info") return `${entity}.request_changes`;
  if (kind.startsWith("report_")) return decision === "approve" ? `${entity}.resolve` : `${entity}.close`;
  if (kind === "dispute") return "dispute.decide";
  if (kind === "story") return decision === "approve" ? "story.publish" : "story.reject";
  if (kind.startsWith("flag_")) return decision === "approve" ? `${entity}.keep` : `${entity}.remove`;
  if (kind === "society") return decision === "approve" ? "society.verify" : "society.reject";
  if (kind === "volunteer") return decision === "approve" ? "volunteer_application.accept" : "volunteer_application.decline";
  return `${entity}.${decision}`;
}

/** The thing a kind's audit lines are about ("Approved question CM-1910"). */
export const AUDIT_ENTITY: Record<QueueItemKind, string> = {
  review: "review",
  review_edit: "review_edit",
  report_fact: "report",
  report_concern: "concern",
  report_missing: "report",
  report_locality: "locality_suggestion",
  event: "event",
  claim: "claim",
  dispute: "dispute",
  new_question: "question",
  new_reply: "reply",
  flag_post: "post",
  flag_thread: "thread",
  flag_review: "review",
  flag_story: "story",
  society: "society",
  volunteer: "volunteer_application",
  story: "story",
};

/** Which set of button words a kind uses (admin strings: decide.buttons). */
export function buttonGroup(kind: QueueItemKind): string {
  if (kind.startsWith("report_")) return "report";
  if (kind.startsWith("flag_")) return "flag";
  if (kind === "review" || kind === "review_edit" || kind === "event" || kind === "dispute" || kind === "society" || kind === "volunteer" || kind === "story") return kind;
  return "default";
}

// ── Labels on the queue ─────────────────────────────────────────────────────

export type SlaState = { kind: "done" } | { kind: "overdue"; hours: number } | { kind: "due"; hours: number } | { kind: "left"; hours: number };

/** "DUE IN 2H" (at risk: 2 hours or less), "14H LEFT", "OVERDUE 5H", "DONE". */
export function slaState(open: boolean, hoursLeft: number): SlaState {
  if (!open) return { kind: "done" };
  if (hoursLeft < 0) return { kind: "overdue", hours: -hoursLeft };
  if (hoursLeft <= 2) return { kind: "due", hours: hoursLeft };
  return { kind: "left", hours: hoursLeft };
}

/** Hours as "14H" up to two days, then whole days "5D". */
export function hoursOrDays(hours: number): { n: number; unit: "h" | "d" } {
  const h = Math.max(0, Math.round(hours));
  return h < 48 ? { n: h, unit: "h" } : { n: Math.round(h / 24), unit: "d" };
}

/** Median of a list (null when empty). */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ── Stories: what a moderator fills in before publishing ───────────────────

export const STORY_CATEGORY_VALUES = STORY_CATEGORIES;

/** "RECOVERY · OCT 2026": the small line under a published story when the moderator leaves it empty. */
export function storyMeta(category: string, publishedAt: Date): string {
  const t = dayTile(publishedAt);
  return `${category.toUpperCase()} · ${t.mon} ${t.year}`;
}

/** "3:12" for a video's length (minutes:seconds). */
export const DURATION_PATTERN = /^\d{1,2}:[0-5]\d$/;

// ── Listings editor: what changed, in residents' words ─────────────────────

export type ListingEdit = {
  status: "published" | "hidden" | "closed";
  hoursSummary: string | null;
  consultationFee: number | null;
  feeVerified: boolean;
  keyFact: string | null;
};

export type ListingChangeLine = { field: "hours" | "fee" | "status" | "key_fact"; summary: string; before: string | null; after: string | null };

const feeText = (fee: number | null) => (fee === null ? null : fee === 0 ? "free" : `₹${fee.toLocaleString("en-IN")}`);

/** The lines that changed between two versions of a listing, as the "changed since you saved
 * it" sentences ("Hours are now 9 am – 7 pm. They were 9 am – 1 pm."). */
export function listingChanges(before: ListingEdit, after: ListingEdit): ListingChangeLine[] {
  const out: ListingChangeLine[] = [];
  const norm = (s: string | null) => (s ?? "").trim() || null;
  if (norm(before.hoursSummary) !== norm(after.hoursSummary)) {
    const a = norm(after.hoursSummary);
    const b = norm(before.hoursSummary);
    out.push({ field: "hours", before: b, after: a, summary: a ? `Hours are now ${a}.${b ? ` They were ${b}.` : ""}` : "Hours removed until they are re-checked." });
  }
  if (before.consultationFee !== after.consultationFee || before.feeVerified !== after.feeVerified) {
    const a = feeText(after.consultationFee);
    const b = feeText(before.consultationFee);
    if (before.consultationFee !== after.consultationFee) {
      out.push({ field: "fee", before: b, after: a, summary: a ? `Consultation fee is now ${a}.${b ? ` It was ${b}.` : ""}` : "Consultation fee removed until it is re-checked." });
    } else {
      out.push({ field: "fee", before: b, after: a, summary: after.feeVerified ? `Consultation fee ${a ?? ""} confirmed.`.replace("  ", " ") : "Consultation fee no longer marked as confirmed." });
    }
  }
  if (before.status !== after.status) {
    const word = { published: "listed again", hidden: "hidden while it is re-checked", closed: "marked as closed permanently" }[after.status];
    out.push({ field: "status", before: before.status, after: after.status, summary: `This listing is ${word}.` });
  }
  if (norm(before.keyFact) !== norm(after.keyFact)) {
    out.push({ field: "key_fact", before: norm(before.keyFact), after: norm(after.keyFact), summary: norm(after.keyFact) ?? "Key fact removed." });
  }
  return out;
}
