// "Share your experience": guided questions, not star-only. Personal data in the text is
// redacted on the server (src/lib/redact.ts); medical details trigger a warning.

import { z } from "zod";

import { isProfileKind, REVIEW_MAX_LENGTH, REVIEW_MIN_LENGTH, REVIEW_QUESTIONS } from "@/lib/domain";

import { lang, mustTick, optionalText, slug, text } from "./common";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "October 2026" or "Earlier in 2026", not in the future and not before 2000. */
export function isValidVisitMonth(value: string, now: Date = new Date()): boolean {
  const ist = new Date(now.getTime() + 330 * 60_000);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const earlier = value.match(/^Earlier in (\d{4})$/);
  if (earlier) return +earlier[1] >= 2000 && +earlier[1] <= year;
  const m = value.match(/^([A-Z][a-z]+) (\d{4})$/);
  if (!m) return false;
  const mi = MONTHS.indexOf(m[1]);
  const y = +m[2];
  if (mi < 0 || y < 2000) return false;
  return y < year || (y === year && mi <= month);
}

const answer = (options: readonly string[]) => z.preprocess((v) => (v === "" ? undefined : v), z.enum(options as [string, ...string[]]).optional());

export const reviewSchema = z.object({
  providerKind: z.string().refine(isProfileKind, "Invalid reference."),
  providerSlug: slug,
  visitMonth: z.string("Tell us when you visited and the type of visit.").refine((v) => isValidVisitMonth(v), "Tell us when you visited and the type of visit."),
  visitType: text(1, 80, "Tell us when you visited and the type of visit."),
  department: optionalText(80),
  explained: answer(REVIEW_QUESTIONS[0].options),
  waiting: answer(REVIEW_QUESTIONS[1].options),
  access: answer(REVIEW_QUESTIONS[2].options),
  fees: answer(REVIEW_QUESTIONS[3].options),
  text: text(REVIEW_MIN_LENGTH, REVIEW_MAX_LENGTH, `Please write at least ${REVIEW_MIN_LENGTH} characters about your experience.`),
  noConflict: mustTick("Please confirm you have no conflict of interest."),
  lang,
});
export type ReviewInput = z.infer<typeof reviewSchema>;

/** The guided answers as stored in Review.answers. */
export function reviewAnswers(input: Pick<ReviewInput, "explained" | "waiting" | "access" | "fees">): Record<string, string> {
  return Object.fromEntries(
    (["explained", "waiting", "access", "fees"] as const).filter((k) => input[k]).map((k) => [k, input[k] as string]),
  );
}

/** A published review's reference, e.g. "HG-RV-8412". */
export const REVIEW_REF = /^HG-RV-\d{4,}$/;
const reviewRef = z.string("Invalid reference.").trim().regex(REVIEW_REF, "Invalid reference.");

/** A provider's public reply under a review (claimed providers only). */
export const reviewReplySchema = z.object({
  reviewRef,
  reply: text(10, 1000, "Please write a reply of at least 10 characters."),
});

/** "Helpful" on a review. */
export const reviewHelpfulSchema = z.object({ reviewRef });

// ── The author's own review (/account/activity) ─────────────────────────────

/** "Edit your review" / "Fix and send again": the new text goes to a moderator. */
export const reviewEditSchema = z.object({
  ref: reviewRef,
  text: text(REVIEW_MIN_LENGTH, REVIEW_MAX_LENGTH, `Please write at least ${REVIEW_MIN_LENGTH} characters about your experience.`),
  lang,
});

/** "Withdraw review". */
export const reviewWithdrawSchema = z.object({ ref: reviewRef, lang });

/** Undo straight after a withdrawal: back to the status it had. */
export const reviewRestoreSchema = z.object({
  ref: reviewRef,
  previous: z.enum(["published", "pending", "needs_changes"], "Invalid reference."),
  lang,
});

/** How long "Undo" stays available after withdrawing a review. */
export const REVIEW_UNDO_MINUTES = 30;

// ── "Report" under a single review ──────────────────────────────────────────

/** The review policy's reasons (Content and Trust #dispute, "A single review goes through the
 * review policy"), plus "Something else". */
export const REVIEW_FLAG_REASONS = ["personal", "fake", "conflict", "other"] as const;
export type ReviewFlagReason = (typeof REVIEW_FLAG_REASONS)[number];

/** Stored in ContentFlag.reason (English, for the moderators' queue). */
export const REVIEW_FLAG_REASON_TEXT: Record<ReviewFlagReason, string> = {
  personal: "Shares a patient's name, phone number or medical details",
  fake: "Not based on a real visit, or fake or coordinated",
  conflict: "From staff, a relative or a competitor who didn't declare it",
  other: "Something else",
};

/** "Report" under a review: a moderator checks it against the review policy (ref HG-CM-…). */
export const reviewFlagSchema = z
  .object({
    providerSlug: slug,
    reviewRef,
    reason: z.enum(REVIEW_FLAG_REASONS, "Choose a reason."),
    details: optionalText(500),
    lang,
  })
  .refine((v) => v.reason !== "other" || (v.details?.length ?? 0) >= 10, { message: "Tell us a little more.", path: ["details"] });
export type ReviewFlagInput = z.infer<typeof reviewFlagSchema>;
