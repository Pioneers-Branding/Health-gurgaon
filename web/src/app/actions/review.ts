"use server";

// "Share your experience" (/review/[kind]/[slug]). A signed-in resident's review goes to the
// moderators' reviews queue (status pending) and to their own My reviews & reports; nothing is
// published until a moderator approves it. Personal data in the text is redacted on the server.
//
//   const [state, action] = useActionState(submitReview, idle);
//   <form action={action}>…<input type="hidden" name="lang" value={lang} /></form>

import { fail, formDataToObject, formLang, needsSignIn, ok, parseForm, type ActionState } from "@/lib/action-state";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { detectMedicalDetails } from "@/lib/content-safety";
import { db } from "@/lib/db";
import { KINDS_FOR_PROFILE, REVIEW_VISIT_TYPES } from "@/lib/domain";
import { asArray, type AutoCheck, type Department } from "@/lib/json-types";
import { redactPersonalData } from "@/lib/redact";
import { nextRef } from "@/lib/refs";
import { reviewAnswers, reviewSchema } from "@/lib/validation/review";

type Lang = "en" | "hi";

const T = {
  signIn: { en: "Please sign in with your phone number to write a review.", hi: "समीक्षा लिखने के लिए कृपया अपने फ़ोन नंबर से साइन इन करें।" },
  forbidden: { en: "Reviews are written by residents and patients. This account can’t write reviews.", hi: "समीक्षाएँ निवासी और मरीज़ लिखते हैं। इस खाते से समीक्षा नहीं लिखी जा सकती।" },
  notFound: { en: "We couldn’t find that listing.", hi: "यह लिस्टिंग नहीं मिली।" },
  visit: { en: "Tell us when you visited and the type of visit.", hi: "बताएँ कि आप कब गए थे और मुलाक़ात किस तरह की थी।" },
  already: {
    en: "You’ve already reviewed this listing ({ref}). You can see it, and edit it, in My reviews & reports.",
    hi: "आप इस लिस्टिंग की समीक्षा पहले ही लिख चुके हैं ({ref})। आप उसे मेरी समीक्षाएँ और रिपोर्ट में देख और बदल सकते हैं।",
  },
  done: { en: "Thank you. Your review is with a moderator. Ref {ref}.", hi: "धन्यवाद। आपकी समीक्षा एक मॉडरेटर के पास है। संदर्भ {ref}।" },
} as const;

function tr(key: keyof typeof T, lang: Lang, vars: Record<string, string> = {}): string {
  return Object.entries(vars).reduce<string>((s, [k, v]) => s.replaceAll(`{${k}}`, v), T[key][lang]);
}

export type ReviewData = {
  ref: string | null;
  redacted: boolean;
  /** On an error, what was sent, so the form keeps the answers (also without JavaScript). */
  values: Record<string, string> | null;
};

/** Submit a review for moderation. One open or published review per person and listing. */
export async function submitReview(prev: ActionState<ReviewData>, formData: FormData): Promise<ActionState<ReviewData>> {
  const state = await submit(prev, formData);
  if (state.status !== "error") return state;
  const values = Object.fromEntries(Object.entries(formDataToObject(formData)).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  return { ...state, data: { ref: null, redacted: false, values } };
}

async function submit(_prev: ActionState<ReviewData>, formData: FormData): Promise<ActionState<ReviewData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(tr("signIn", lang));
  if (!can(user.role, "write_review")) return fail("forbidden", tr("forbidden", lang));

  const parsed = parseForm(reviewSchema, formData);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  if (!(REVIEW_VISIT_TYPES as readonly string[]).includes(d.visitType)) return fail("invalid_input", tr("visit", lang), { visitType: [T.visit.en] });

  const provider = await db.provider.findUnique({
    where: { slug: d.providerSlug },
    select: { id: true, slug: true, kind: true, status: true, departments: true },
  });
  if (!provider || provider.status !== "published" || !KINDS_FOR_PROFILE[d.providerKind as keyof typeof KINDS_FOR_PROFILE].includes(provider.kind)) {
    return fail("not_found", tr("notFound", lang));
  }

  const existing = await db.review.findFirst({
    where: { providerId: provider.id, authorId: user.id, status: { in: ["pending", "published", "needs_changes"] } },
    select: { ref: true },
  });
  if (existing) return fail("duplicate", tr("already", lang, { ref: existing.ref }));

  // Only a department the hospital actually lists is kept.
  const departments = asArray<Department>(provider.departments).map((dep) => dep.name);
  const department = d.department && departments.includes(d.department) ? d.department : null;

  const clean = redactPersonalData(d.text);
  const medical = detectMedicalDetails(d.text);
  const earlier = await db.review.count({ where: { authorId: user.id } });
  const autoChecks: AutoCheck[] = [
    {
      ok: !clean.changed && !medical,
      text: clean.changed ? "Personal data removed automatically" : medical ? "Possible medical details: check before publishing" : "No phone numbers or medical details detected",
    },
    { ok: true, text: "No conflict declared" },
    { ok: earlier > 0, text: earlier > 0 ? `Reviewer has ${earlier} earlier review${earlier === 1 ? "" : "s"}` : "Reviewer’s first review on the platform" },
  ];
  const flags = [...(earlier === 0 ? ["First-time reviewer"] : []), ...(medical ? ["Medical details"] : [])];

  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("review", tx);
    await tx.review.create({
      data: {
        ref: r,
        providerId: provider.id,
        authorId: user.id,
        authorLabel: user.reviewLabel,
        visitMonth: d.visitMonth,
        visitType: d.visitType,
        department,
        answers: reviewAnswers(d),
        text: clean.text,
        redactions: clean.redactions,
        noConflict: true,
        verificationTags: [],
        autoChecks,
        flags,
        privateNote: `Reviewer: ${user.area ? `${user.area} resident` : "resident"}, verified by OTP`,
      },
    });
    return r;
  });

  expireTags(tags.activity(user.id));
  return ok(tr("done", lang, { ref }), { ref, redacted: clean.changed, values: null });
}
