"use server";

// Patient stories:
//   submitStory  "Share your story" (upload → privacy check → consent) → a pending Story in the
//                stories moderation queue (status "pending", ref HG-ST-222). Nothing is published
//                until a moderator has confirmed the visit, edited for privacy and the teller has
//                approved the final version. No files are uploaded here (we never store medical
//                records); a moderator contacts the teller through their account to collect it.
//   flagStory    "Report this video" → the community moderation queue (ContentFlag, HG-CM-1907);
//                the story stays up while it's checked.
// Both re-check the signed-in user and validate with zod (src/lib/validation/{story,community}.ts).

import { fail, formLang, needsSignIn, ok, parseForm, type ActionState } from "@/lib/action-state";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { db } from "@/lib/db";
import { redactPersonalData } from "@/lib/redact";
import { nextRef } from "@/lib/refs";
import { defaultReviewLabel } from "@/lib/review-label";
import { flagContentSchema } from "@/lib/validation/community";
import { storySubmissionSchema, storyTranscript } from "@/lib/validation/story";

import { fill, matchProviderName, storySlug } from "@/components/top-lists/format";

type Lang = "en" | "hi";

const T = {
  signIn: {
    en: "Please sign in to share your story, so a moderator can confirm your visit and send you the edited version to approve.",
    hi: "अपनी कहानी बताने के लिए कृपया साइन इन करें, ताकि एक मॉडरेटर आपकी विज़िट की पुष्टि कर सकें और संपादित रूप आपको मंज़ूरी के लिए भेज सकें।",
  },
  provider: { en: "Provider accounts can’t share patient stories.", hi: "प्रदाता के खाते से मरीज़ों की कहानियां नहीं भेजी जा सकतीं।" },
  check: { en: "Please check the highlighted fields.", hi: "कृपया चिह्नित जगहें देखें।" },
  consent: { en: "Please confirm all four to submit.", hi: "भेजने के लिए कृपया चारों की पुष्टि करें।" },
  providerMissing: { en: "Which provider is this about?", hi: "यह किस प्रदाता के बारे में है?" },
  textShort: {
    en: "Please write at least 50 characters about your experience.",
    hi: "कृपया अपने अनुभव के बारे में कम से कम 50 अक्षर लिखें।",
  },
  textLong: { en: "Please keep your story under 3000 characters.", hi: "कृपया अपनी कहानी 3000 अक्षरों से छोटी रखें।" },
  received: {
    en: "Received. A moderator will confirm your visit, check privacy and add captions. Ref {ref}.",
    hi: "मिल गई। एक मॉडरेटर आपकी विज़िट की पुष्टि करेंगे, निजता जांचेंगे और कैप्शन जोड़ेंगे। संदर्भ {ref}।",
  },
  duplicate: {
    en: "You’ve already shared a story about this provider. A moderator has it. Ref {ref}.",
    hi: "आप इस प्रदाता के बारे में पहले ही कहानी भेज चुके हैं। वह एक मॉडरेटर के पास है। संदर्भ {ref}।",
  },
  storyNotFound: { en: "We couldn’t find that story.", hi: "वह कहानी नहीं मिली।" },
  flagged: { en: "Thanks. A moderator will check this video. Reference {ref}.", hi: "धन्यवाद। एक मॉडरेटर इस वीडियो की जांच करेंगे। संदर्भ {ref}।" },
  flagOpen: { en: "You’ve already reported this video ({ref}). A moderator is checking it.", hi: "आप इस वीडियो की शिकायत पहले ही कर चुके हैं ({ref})। एक मॉडरेटर इसकी जांच कर रहे हैं।" },
  reason: { en: "Choose a reason.", hi: "कोई कारण चुनें।" },
  forbiddenFlag: { en: "You can’t report content with this account.", hi: "इस खाते से आप शिकायत नहीं कर सकते।" },
} as const;

function tr(key: keyof typeof T, lang: Lang, vars: Record<string, string> = {}): string {
  return fill(T[key][lang], vars);
}

// ── Share your story ────────────────────────────────────────────────────────

export type SubmitStoryData = { ref: string; duplicate: boolean };

/** One pending story per person per provider: submitting again returns the first reference. */
export async function submitStory(_prev: ActionState<SubmitStoryData>, formData: FormData): Promise<ActionState<SubmitStoryData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(T.signIn[lang]);
  if (user.role === "provider") return fail("forbidden", T.provider[lang]);
  const parsed = parseForm(storySubmissionSchema, formData);
  if (!parsed.ok) {
    const state = parsed.state;
    if (state.status !== "error" || lang !== "hi") return state;
    const fe = state.fieldErrors ?? {};
    const textHi = fe.text?.[0]?.includes("3000") ? T.textLong.hi : T.textShort.hi;
    const hiErrors = Object.fromEntries(
      Object.entries(fe).map(([k, v]) => [
        k,
        v && v.length ? [k.startsWith("consent") ? T.consent.hi : k === "provider" ? T.providerMissing.hi : k === "text" ? textHi : T.check.hi] : v,
      ]),
    );
    const first = fe.provider ? T.providerMissing.hi : fe.text ? textHi : Object.keys(fe).some((k) => k.startsWith("consent")) ? T.consent.hi : T.check.hi;
    return fail(state.code, first, hiErrors);
  }
  const d = parsed.data;
  // A written story is public text once a moderator publishes it: phones, emails and ID numbers
  // are removed before it is stored.
  const written = storyTranscript(d);

  // Public text never carries phone numbers or emails.
  const typed = redactPersonalData(d.provider).text.trim();
  const candidates = await db.provider.findMany({ where: { status: "published" }, select: { id: true, name: true, ownership: true } });
  const match = matchProviderName(typed, candidates);
  const providerName = match ? match.name.replace(/\s*\(sample\)\s*$/i, "") : typed;

  const same = await db.story.findFirst({
    where: { submitterId: user.id, status: "pending", ...(match ? { providerId: match.id } : { providerName }) },
    select: { ref: true },
  });
  if (same?.ref) return ok(tr("duplicate", lang, { ref: same.ref }), { ref: same.ref, duplicate: true });

  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("story", tx);
    await tx.story.create({
      data: {
        slug: storySlug(r),
        ref: r,
        // Placeholders until a moderator writes the published title and caption.
        title: `Story about ${providerName}`,
        // Signed like their reviews ("Parent · Sector 57" → "Parent, Sector 57"): never a name.
        whoLabel: (user.reviewLabel || defaultReviewLabel(user.area)).replace(" · ", ", "),
        providerId: match?.id ?? null,
        providerName,
        ownership: match?.ownership ?? "private",
        category: "Unsorted",
        durationLabel: "",
        meta: "",
        transcript: written,
        format: d.format === "Written" ? "written" : "video",
        consented: true,
        visitConfirmed: false,
        privacyEdited: false,
        notPaid: true,
        status: "pending",
        submitterId: user.id,
      },
    });
    return r;
  });
  expireTags(tags.activity(user.id));
  return ok(tr("received", lang, { ref }), { ref, duplicate: false });
}

// ── Report this video ───────────────────────────────────────────────────────

export type FlagStoryData = { ref: string; duplicate: boolean };

/** Anyone may report a story (signed in or not), as with reviews; the moderator sees who only
 * when it was a signed-in person. */
export async function flagStory(_prev: ActionState<FlagStoryData>, formData: FormData): Promise<ActionState<FlagStoryData>> {
  const lang = formLang(formData);
  const parsed = parseForm(flagContentSchema, { targetKind: "story", targetId: formData.get("story"), reason: formData.get("reason"), details: formData.get("details") ?? "" });
  if (!parsed.ok) {
    const state = parsed.state;
    return state.status === "error" && state.fieldErrors?.reason ? fail("invalid_input", tr("reason", lang), { reason: [tr("reason", lang)] }) : state;
  }
  const user = await getCurrentUser();
  if (user && !can(user.role, "report_incorrect_info")) return fail("forbidden", T.forbiddenFlag[lang]);
  const story = await db.story.findUnique({ where: { slug: parsed.data.targetId }, select: { id: true, slug: true, title: true, providerName: true, transcript: true, status: true } });
  if (!story || story.status !== "published") return fail("not_found", tr("storyNotFound", lang));
  if (user) {
    const open = await db.contentFlag.findFirst({ where: { targetKind: "story", targetId: story.id, reporterId: user.id, status: "open" }, select: { ref: true } });
    if (open) return ok(tr("flagOpen", lang, { ref: open.ref }), { ref: open.ref, duplicate: true });
  }
  const details = parsed.data.details ? redactPersonalData(parsed.data.details).text : "";
  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("flag", tx);
    await tx.contentFlag.create({
      data: {
        ref: r,
        targetKind: "story",
        targetId: story.id,
        targetLabel: `Patient story: ${story.title} (${story.providerName})`,
        excerpt: story.transcript ? story.transcript.slice(0, 600) : null,
        reason: details ? `${parsed.data.reason}: “${details}”` : parsed.data.reason,
        reporterId: user?.id ?? null,
        autoChecks: [{ ok: true, text: "Story stays published while it’s checked" }],
        flags: parsed.data.reason === "Personal data" ? ["Privacy"] : [],
        privateNote: user ? `Reported by a signed-in ${user.role}` : "Reported without signing in",
      },
    });
    return r;
  });
  if (user) expireTags(tags.activity(user.id));
  return ok(tr("flagged", lang, { ref }), { ref, duplicate: false });
}
