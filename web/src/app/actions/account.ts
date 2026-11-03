"use server";

// "My reviews & reports": edit, withdraw and restore your own reviews. Prototype: "Health
// Gurgaon Account.dc.html" #activity.
//
//   editMyReview      "Edit" / "Fix and send again": the new text goes to a moderator. An edit of a
//                     published review waits in editText (the published text stays live); a review
//                     still in moderation or returned for changes goes back to the queue.
//   withdrawMyReview  "Withdraw review": off the profile (if it was published) within the hour.
//   restoreMyReview   "Undo" straight after a withdrawal (30 minutes).
//
// A dose ("40 mg") blocks sending; phone numbers and emails are redacted on the server; medicine
// words only get a note for the moderator (the prototype's rules).

import type { ReviewStatus } from "@prisma/client";

import { fail, formLang, needsSignIn, ok, parseForm, type ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { db } from "@/lib/db";
import { fmt } from "@/lib/i18n/format";
import { accountStrings } from "@/lib/i18n/areas/account";
import { redactPersonalData } from "@/lib/redact";
import { doseHits, listText, medicineWordHits } from "@/components/account/format";

import { REVIEW_UNDO_MINUTES, reviewEditSchema, reviewRestoreSchema, reviewWithdrawSchema } from "@/lib/validation/review";

const SIGN_IN = { en: "Please sign in to manage your reviews.", hi: "अपने रिव्यू संभालने के लिए साइन इन करें।" } as const;
const NOT_FOUND = { en: "We couldn’t find that review.", hi: "यह रिव्यू नहीं मिला।" } as const;
const CANT_EDIT = { en: "This review can’t be edited any more. You can write a new one.", hi: "यह रिव्यू अब बदला नहीं जा सकता। आप नया रिव्यू लिख सकते हैं।" } as const;
const TOO_LATE = { en: "Undo is no longer available. You can write a new review.", hi: "अब पहले जैसा नहीं किया जा सकता। आप नया रिव्यू लिख सकते हैं।" } as const;

async function myReview(userId: string, ref: string) {
  return db.review.findFirst({ where: { ref, authorId: userId }, include: { provider: { select: { slug: true } } } });
}

export type ReviewEditData = { ref: string; status: ReviewStatus };

/** Fields: ref, text, lang. */
export async function editMyReview(_prev: ActionState<ReviewEditData>, formData: FormData): Promise<ActionState<ReviewEditData>> {
  const lang = formLang(formData);
  const t = accountStrings(lang).activity;
  const user = await getCurrentUser();
  if (!user) return needsSignIn(SIGN_IN[lang]);
  const parsed = parseForm(reviewEditSchema, formData);
  if (!parsed.ok) {
    const short = parsed.state.status === "error" && parsed.state.fieldErrors?.text;
    return short ? fail("too_short", t.errShort, { text: [t.errShort] }) : parsed.state;
  }
  const { ref, text } = parsed.data;
  const dose = doseHits(text);
  if (dose.length) {
    const message = fmt(t.errDose, { list: dose.join(", ") });
    return fail("dose", message, { text: [message] });
  }
  const review = await myReview(user.id, ref);
  if (!review) return fail("not_found", NOT_FOUND[lang]);
  if (review.status !== "published" && review.status !== "pending" && review.status !== "needs_changes") return fail("not_editable", CANT_EDIT[lang]);

  const clean = redactPersonalData(text);
  const now = new Date();
  if (review.status === "published") {
    await db.review.update({ where: { id: review.id }, data: { editText: clean.text, editSubmittedAt: now } });
  } else {
    await db.review.update({
      where: { id: review.id },
      data: { text: clean.text, redactions: clean.redactions, status: "pending", editText: null, editSubmittedAt: now, suggestion: null },
    });
  }
  expireTags(tags.activity(user.id));
  const words = medicineWordHits(clean.text);
  const message =
    t.sentNote +
    (clean.redactions.some((r) => r.kind === "phone") ? t.sentPhone : "") +
    (words.length ? fmt(t.sentWords, { list: listText(words, accountStrings(lang).common.and) }) : "");
  return ok(message, { ref, status: review.status === "published" ? "published" : "pending" });
}

export type ReviewWithdrawData = { ref: string; previous: "published" | "pending" | "needs_changes" };

/** Fields: ref, lang. */
export async function withdrawMyReview(_prev: ActionState<ReviewWithdrawData>, formData: FormData): Promise<ActionState<ReviewWithdrawData>> {
  const lang = formLang(formData);
  const t = accountStrings(lang).activity;
  const user = await getCurrentUser();
  if (!user) return needsSignIn(SIGN_IN[lang]);
  const parsed = parseForm(reviewWithdrawSchema, formData);
  if (!parsed.ok) return parsed.state;
  const review = await myReview(user.id, parsed.data.ref);
  if (!review) return fail("not_found", NOT_FOUND[lang]);
  if (review.status !== "published" && review.status !== "pending" && review.status !== "needs_changes") return fail("not_editable", CANT_EDIT[lang]);

  await db.review.update({ where: { id: review.id }, data: { status: "withdrawn" } });
  const wasPublic = review.status === "published";
  expireTags(tags.activity(user.id), wasPublic && tags.reviews(review.provider.slug), wasPublic && tags.provider(review.provider.slug));
  return ok(wasPublic ? t.withdrawnNote : t.withdrawnNoteUnpublished, { ref: review.ref, previous: review.status });
}

/** Fields: ref, previous (the status before the withdrawal), lang. */
export async function restoreMyReview(_prev: ActionState<{ ref: string }>, formData: FormData): Promise<ActionState<{ ref: string }>> {
  const lang = formLang(formData);
  const t = accountStrings(lang).activity;
  const user = await getCurrentUser();
  if (!user) return needsSignIn(SIGN_IN[lang]);
  const parsed = parseForm(reviewRestoreSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { ref, previous } = parsed.data;
  const review = await myReview(user.id, ref);
  if (!review) return fail("not_found", NOT_FOUND[lang]);
  const recent = Date.now() - review.updatedAt.getTime() < REVIEW_UNDO_MINUTES * 60_000;
  // Only a review that really was published goes back on the profile without a new check.
  if (review.status !== "withdrawn" || !recent || (previous === "published" && !review.publishedAt)) return fail("undo_expired", TOO_LATE[lang]);

  await db.review.update({ where: { id: review.id }, data: { status: previous } });
  const isPublic = previous === "published";
  expireTags(tags.activity(user.id), isPublic && tags.reviews(review.provider.slug), isPublic && tags.provider(review.provider.slug));
  return ok(t.restoredNote, { ref });
}
