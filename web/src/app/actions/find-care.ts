"use server";

// Find care actions: reveal a provider's phone on click, mark a review helpful, report wrong
// opening hours in one tap (lab and pharmacy profiles) and suggest a provider we haven't listed.
// Every action re-checks the signed-in user itself and validates with src/lib/validation.
//
//   const [state, action, pending] = useActionState(revealProviderPhone, idle);
//   <form action={action}><input type="hidden" name="slug" value={slug} />…</form>
//
// Messages come back in the form's language (hidden input name="lang").

import { fail, formLang, needsSignIn, ok, parseForm, type ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { expireTags, tags } from "@/lib/cache";
import { getPublicPhone } from "@/lib/data/providers";
import { db } from "@/lib/db";
import { nextRef } from "@/lib/refs";
import { redactPersonalData } from "@/lib/redact";
import { normalize } from "@/lib/search";
import { recordId, slug as slugSchema } from "@/lib/validation/common";
import { factReportSchema, missingListingSchema } from "@/lib/validation/report";
import { z } from "zod";

type Lang = "en" | "hi";

const T = {
  notFound: { en: "We couldn’t find that listing.", hi: "यह लिस्टिंग नहीं मिली।" },
  phoneShown: { en: "Phone number shown.", hi: "फ़ोन नंबर दिखाया गया।" },
  noPhone: { en: "Phone to be confirmed before launch", hi: "लॉन्च से पहले फ़ोन की पुष्टि की जाएगी" },
  signInHelpful: { en: "Sign in to mark reviews helpful.", hi: "समीक्षा को मददगार बताने के लिए साइन इन करें।" },
  helpfulOn: { en: "Marked as helpful.", hi: "मददगार के रूप में चिह्नित।" },
  helpfulOff: { en: "Helpful mark removed.", hi: "मददगार का निशान हटाया गया।" },
  reviewNotFound: { en: "We couldn’t find that review.", hi: "यह समीक्षा नहीं मिली।" },
  signInReport: { en: "Please sign in to report wrong hours, so we can tell you what we find.", hi: "ग़लत समय बताने के लिए कृपया साइन इन करें, ताकि हम आपको बता सकें कि जाँच में क्या मिला।" },
  forbidden: { en: "You can’t report information with this account.", hi: "इस खाते से आप जानकारी की शिकायत नहीं कर सकते।" },
  hoursReported: {
    en: "Thanks. We've flagged these hours for a re-check (ref {ref}). Other residents will see “hours being re-checked” until we confirm.",
    hi: "धन्यवाद। हमने इस समय को दोबारा जाँचने के लिए चिह्नित किया है (संदर्भ {ref})। पुष्टि होने तक बाकी निवासियों को “समय दोबारा जाँचा जा रहा है” दिखेगा।",
  },
  suggested: { en: "Thanks. Reference {ref}.", hi: "धन्यवाद। संदर्भ {ref}।" },
  alreadySuggested: { en: "Someone has already suggested this provider. We’re checking it (ref {ref}).", hi: "किसी ने इस प्रदाता का सुझाव पहले ही दिया है। हम इसकी जाँच कर रहे हैं (संदर्भ {ref})।" },
} as const;

function tr(key: keyof typeof T, lang: Lang, vars: Record<string, string> = {}): string {
  return Object.entries(vars).reduce<string>((s, [k, v]) => s.replaceAll(`{${k}}`, v), T[key][lang]);
}

const providerSlugSchema = z.object({ slug: slugSchema });
const reviewRefSchema = z.object({ ref: recordId, slug: slugSchema });

// ── Show clinic phone ───────────────────────────────────────────────────────

export type PhoneData = { phone: string | null };

/** "Show clinic phone": the number is fetched on click and never part of the page HTML. A
 * listing without a confirmed number answers "Phone to be confirmed before launch". */
export async function revealProviderPhone(_prev: ActionState<PhoneData>, formData: FormData): Promise<ActionState<PhoneData>> {
  const lang = formLang(formData);
  const parsed = parseForm(providerSlugSchema, formData);
  if (!parsed.ok) return parsed.state;
  const exists = await db.provider.findUnique({ where: { slug: parsed.data.slug }, select: { status: true } });
  if (!exists || exists.status !== "published") return fail("not_found", T.notFound[lang]);
  const phone = await getPublicPhone(parsed.data.slug);
  return ok(phone ? T.phoneShown[lang] : T.noPhone[lang], { phone });
}

// ── Helpful votes on reviews ────────────────────────────────────────────────

export type HelpfulData = { count: number; voted: boolean };

/** Toggle "Helpful (12)" on a published review. One vote per person. */
export async function toggleReviewHelpful(_prev: ActionState<HelpfulData>, formData: FormData): Promise<ActionState<HelpfulData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(T.signInHelpful[lang]);
  const parsed = parseForm(reviewRefSchema, formData);
  if (!parsed.ok) return parsed.state;
  const review = await db.review.findUnique({
    where: { ref: parsed.data.ref },
    select: { id: true, status: true, helpfulCount: true, provider: { select: { slug: true } } },
  });
  if (!review || review.status !== "published" || review.provider.slug !== parsed.data.slug) return fail("not_found", T.reviewNotFound[lang]);

  const key = { reviewId_userId: { reviewId: review.id, userId: user.id } };
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.reviewHelpful.findUnique({ where: key });
    if (existing) {
      await tx.reviewHelpful.delete({ where: key });
      const r = await tx.review.update({ where: { id: review.id }, data: { helpfulCount: { decrement: 1 } }, select: { helpfulCount: true } });
      if (r.helpfulCount < 0) await tx.review.update({ where: { id: review.id }, data: { helpfulCount: 0 } });
      return { count: Math.max(0, r.helpfulCount), voted: false };
    }
    await tx.reviewHelpful.create({ data: { reviewId: review.id, userId: user.id } });
    const r = await tx.review.update({ where: { id: review.id }, data: { helpfulCount: { increment: 1 } }, select: { helpfulCount: true } });
    return { count: r.helpfulCount, voted: true };
  });
  expireTags(tags.reviews(review.provider.slug));
  return ok(result.voted ? T.helpfulOn[lang] : T.helpfulOff[lang], result);
}

// ── "These hours are wrong" ─────────────────────────────────────────────────

export type HoursReportData = { ref: string };

/** One-tap fact report on a profile's opening hours. Goes to the editors' reports queue; while
 * it is open the profile shows "hours being re-checked". One open report per person and listing. */
export async function reportWrongHours(_prev: ActionState<HoursReportData>, formData: FormData): Promise<ActionState<HoursReportData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(T.signInReport[lang]);
  if (!can(user.role, "report_incorrect_info")) return fail("forbidden", T.forbidden[lang]);
  const slugParsed = parseForm(providerSlugSchema, formData);
  if (!slugParsed.ok) return slugParsed.state;
  const provider = await db.provider.findUnique({ where: { slug: slugParsed.data.slug }, select: { id: true, slug: true, name: true, status: true } });
  if (!provider || provider.status !== "published") return fail("not_found", T.notFound[lang]);

  const parsed = parseForm(factReportSchema, {
    targetKind: "provider",
    targetId: provider.id,
    item: provider.name,
    field: "timings",
    details: "The opening hours shown on the profile are wrong (reported with “These hours are wrong”).",
    firsthand: false,
    lang,
  });
  if (!parsed.ok) return parsed.state;

  const open = await db.report.findFirst({
    where: { type: "fact", targetKind: "provider", targetId: provider.id, field: "timings", reporterId: user.id, status: { in: ["received", "checking"] } },
    select: { ref: true },
  });
  if (open) return ok(tr("hoursReported", lang, { ref: open.ref }), { ref: open.ref });

  const at = new Date().toISOString();
  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("report", tx);
    await tx.report.create({
      data: {
        ref: r,
        type: "fact",
        targetKind: parsed.data.targetKind,
        targetId: parsed.data.targetId,
        targetLabel: parsed.data.item,
        field: parsed.data.field,
        details: parsed.data.details,
        firsthand: parsed.data.firsthand,
        reporterId: user.id,
        timeline: [{ status: "received", at }],
        autoChecks: [],
        flags: [],
      },
    });
    return r;
  });
  expireTags(tags.provider(provider.slug), tags.activity(user.id));
  return ok(tr("hoursReported", lang, { ref }), { ref });
}

// ── Suggest a provider we're missing ────────────────────────────────────────

export type SuggestData = { ref: string; duplicate: boolean };

/** "Know a provider we're missing?": a suggestion for the editors' reports queue. Nothing is
 * published from it. Signed-in residents see it under My reports; anyone may leave an email for
 * updates (kept private). The same open suggestion is never filed twice. */
export async function suggestListing(_prev: ActionState<SuggestData>, formData: FormData): Promise<ActionState<SuggestData>> {
  const lang = formLang(formData);
  const parsed = parseForm(missingListingSchema, formData);
  if (!parsed.ok) return parsed.state;
  const user = await getCurrentUser();
  if (user && !can(user.role, "report_incorrect_info")) return fail("forbidden", T.forbidden[lang]);

  const name = redactPersonalData(parsed.data.name).text;
  const locality = redactPersonalData(parsed.data.locality).text;
  const details = parsed.data.details ? redactPersonalData(parsed.data.details).text : "";
  const label = `${name} · ${locality}`;

  const pending = await db.report.findMany({
    where: { type: "missing", status: { in: ["received", "checking"] } },
    select: { ref: true, targetLabel: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const same = pending.find((r) => normalize(r.targetLabel) === normalize(label));
  if (same) return ok(tr("alreadySuggested", lang, { ref: same.ref }), { ref: same.ref, duplicate: true });

  const at = new Date().toISOString();
  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("report", tx);
    await tx.report.create({
      data: {
        ref: r,
        type: "missing",
        targetKind: "page",
        targetLabel: label,
        details: details || `Suggested listing: ${label}`,
        reporterId: user?.id ?? null,
        reporterEmail: parsed.data.email ?? null,
        timeline: [{ status: "received", at }],
        autoChecks: [],
        flags: [],
      },
    });
    return r;
  });
  if (user) expireTags(tags.activity(user.id));
  return ok(tr("suggested", lang, { ref }), { ref, duplicate: false });
}
