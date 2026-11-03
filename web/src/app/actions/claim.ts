"use server";

// "Claim your profile" (/claim/[kind]/[slug]): Find listing → Your role → Confirm → Done.
// One Server Action answers every step (so the form also works without JavaScript):
//   intent=start    step 1 → 2
//   intent=details  step 2: role + registration number, then a 6-digit code to the clinic number
//                   on record (or, with no verified number, the claim goes straight to an editor)
//   intent=resend   step 3: a new code
//   intent=code     step 3: check the code, then the claim goes to the editors' claims queue
//   intent=back     one step back
// A claim is never approved here: an editor matches the registration and approves it in /admin.
// findClaimListings answers "Not your listing? Search for yours".

import { cookies, headers } from "next/headers";

import { formLang, ok, parseForm, type ActionState, type FieldErrors } from "@/lib/action-state";
import { hashIp } from "@/lib/auth/otp";
import { issueOtp, verifyOtp } from "@/lib/auth/otp-service";
import { isStaff } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { findClaimCandidates } from "@/lib/data/providers";
import { db } from "@/lib/db";
import { CLAIM_ROLE_LABELS, KINDS_FOR_PROFILE, isProfileKind, type ProfileKind } from "@/lib/domain";
import type { AutoCheck } from "@/lib/json-types";
import { nextRef } from "@/lib/refs";
import { claimCodeSchema, claimDetailsSchema, claimSearchSchema } from "@/lib/validation/claim";

type Lang = "en" | "hi";

const CLAIM_COOKIE = process.env.NODE_ENV === "production" ? "__Host-hg_claim" : "hg_claim";

const T = {
  signIn: { en: "Please sign in with your phone number to claim a profile.", hi: "प्रोफ़ाइल क्लेम करने के लिए कृपया अपने फ़ोन नंबर से साइन इन करें।" },
  staff: { en: "Staff accounts can’t claim provider profiles.", hi: "स्टाफ़ खाते प्रदाताओं की प्रोफ़ाइल क्लेम नहीं कर सकते।" },
  notFound: { en: "We couldn’t find that listing.", hi: "यह लिस्टिंग नहीं मिली।" },
  claimed: { en: "This profile has already been claimed.", hi: "यह प्रोफ़ाइल पहले ही क्लेम की जा चुकी है।" },
  pending: { en: "You already sent a claim for this listing ({ref}). An editor is checking it.", hi: "आप इस लिस्टिंग के लिए पहले ही क्लेम भेज चुके हैं ({ref})। एक संपादक इसकी जाँच कर रहे हैं।" },
  invalid: { en: "Please check the highlighted fields.", hi: "कृपया चिह्नित जानकारी जाँचें।" },
  sent: { en: "We've sent a 6-digit code to the clinic number on record.", hi: "हमने रिकॉर्ड में दर्ज क्लिनिक नंबर पर 6 अंकों का कोड भेजा है।" },
  resent: { en: "We've sent a new code. Earlier codes no longer work.", hi: "हमने नया कोड भेजा है। पुराने कोड अब काम नहीं करेंगे।" },
  cooldown: { en: "Please wait {s} seconds before asking for a new code.", hi: "नया कोड माँगने से पहले कृपया {s} सेकंड रुकें।" },
  limit: { en: "Too many codes for this number. Please try again in {m} minutes.", hi: "इस नंबर पर बहुत ज़्यादा कोड भेजे गए हैं। कृपया {m} मिनट बाद फिर कोशिश करें।" },
  unavailable: { en: "We can’t send codes right now. Please try again later.", hi: "हम अभी कोड नहीं भेज पा रहे हैं। कृपया थोड़ी देर बाद कोशिश करें।" },
  noCode: { en: "That code has expired. Send a new code.", hi: "यह कोड पुराना हो गया है। नया कोड भेजें।" },
  mismatch: { en: "That code doesn’t match. {n} tries left.", hi: "यह कोड मेल नहीं खाता। {n} कोशिशें बाकी हैं।" },
  locked: { en: "That code didn’t match 3 times, so it has stopped working. Send a new code.", hi: "यह कोड 3 बार मेल नहीं खाया, इसलिए अब काम नहीं करेगा। नया कोड भेजें।" },
  done: { en: "Claim received. Reference {ref}.", hi: "क्लेम मिल गया। संदर्भ {ref}।" },
  found: { en: "{n} listings found.", hi: "{n} लिस्टिंग मिलीं।" },
  code: { en: "Enter the 6-digit code.", hi: "6 अंकों का कोड डालें।" },
} as const;

function tr(key: keyof typeof T, lang: Lang, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce<string>((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), T[key][lang]);
}

export type ClaimStep = 1 | 2 | 3 | 4;

export type ClaimData = {
  step: ClaimStep;
  role: string;
  registrationNumber: string;
  /** Last two digits of the clinic number the code went to ("ending ••34"). */
  phoneLast: string | null;
  /** Development only (OTP_PROVIDER=dev): the code, as on the sign-in screen. */
  devCode: string | null;
  ref: string | null;
  /** The claim went to an editor without a code (no verified clinic number on record). */
  noPhone: boolean;
};

type State = ActionState<ClaimData>;

function data(partial: Partial<ClaimData> & { step: ClaimStep }): ClaimData {
  return { role: "", registrationNumber: "", phoneLast: null, devCode: null, ref: null, noPhone: false, ...partial };
}

function err(code: string, message: string, d: ClaimData, fieldErrors?: FieldErrors): State {
  return fieldErrors ? { status: "error", code, message, fieldErrors, data: d } : { status: "error", code, message, data: d };
}

/** "+91 124 400 1234" → "+911244001234" (the key the code is sent and rate-limited on). */
function clinicPhoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("0")) return `+91${digits.slice(1)}`;
  return `+${digits}`;
}

async function clientIpHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
  const secret = process.env.AUTH_SECRET;
  return ip && secret ? hashIp(secret, ip) : null;
}

const one = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

export async function claimStep(_prev: State, formData: FormData): Promise<State> {
  const lang = formLang(formData);
  const intent = one(formData.get("intent"));
  const current = Math.min(4, Math.max(1, Number.parseInt(one(formData.get("step")), 10) || 1)) as ClaimStep;
  const role = one(formData.get("role"));
  const registrationNumber = one(formData.get("registrationNumber")).slice(0, 40);
  const keep = (step: ClaimStep, extra: Partial<ClaimData> = {}) => data({ step, role, registrationNumber, ...extra });

  if (intent === "back") return ok("", keep(Math.max(1, current - 1) as ClaimStep));

  const user = await getCurrentUser();
  if (!user) return err("sign_in_required", tr("signIn", lang), keep(current));
  if (isStaff(user.role)) return err("forbidden", tr("staff", lang), keep(current));

  const providerKind = one(formData.get("providerKind"));
  const providerSlug = one(formData.get("providerSlug"));
  if (!isProfileKind(providerKind)) return err("not_found", tr("notFound", lang), keep(current));
  const provider = await db.provider.findUnique({
    where: { slug: providerSlug },
    select: { id: true, slug: true, name: true, kind: true, status: true, claimed: true, publicPhone: true },
  });
  if (!provider || provider.status !== "published" || !KINDS_FOR_PROFILE[providerKind].includes(provider.kind)) return err("not_found", tr("notFound", lang), keep(current));
  if (provider.claimed) return err("already_claimed", tr("claimed", lang), keep(current));
  const pending = await db.claim.findFirst({
    where: { providerId: provider.id, claimantId: user.id, status: { in: ["pending", "info_requested", "escalated"] } },
    select: { ref: true },
  });
  if (pending) return err("pending", tr("pending", lang, { ref: pending.ref }), keep(current));

  if (intent === "start") return ok("", keep(2));

  const details = parseForm(claimDetailsSchema, { providerSlug: provider.slug, role, registrationNumber, lang });
  if (!details.ok) {
    const state = details.state;
    return err("invalid_input", tr("invalid", lang), keep(2), state.status === "error" ? state.fieldErrors : undefined);
  }

  const phoneKey = provider.publicPhone ? clinicPhoneKey(provider.publicPhone) : null;
  const phoneLast = phoneKey ? phoneKey.slice(-2) : null;

  if (intent === "details" || intent === "resend") {
    if (!phoneKey) {
      // No verified clinic number: the claim goes to an editor, who calls the practice.
      const ref = await createClaim({ user, provider, role: details.data.role, registrationNumber: details.data.registrationNumber, otpVerified: false });
      return ok(tr("done", lang, { ref }), keep(4, { ref, noPhone: true }));
    }
    const result = await issueOtp({ phone: phoneKey, ipHash: await clientIpHash(), lang, channel: "sms", purpose: "claim" });
    if (!result.ok) {
      const s = result.retryAfterSeconds;
      const message =
        result.reason === "cooldown"
          ? tr("cooldown", lang, { s })
          : result.reason === "phone_hourly_limit" || result.reason === "ip_hourly_limit"
            ? tr("limit", lang, { m: Math.max(1, Math.ceil(s / 60)) })
            : tr("unavailable", lang);
      // A send that's too soon after the last one keeps the person on the code step.
      return err(result.reason, message, keep(intent === "resend" || result.reason === "cooldown" ? 3 : 2, { phoneLast }));
    }
    (await cookies()).set(CLAIM_COOKIE, result.challengeId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    return ok(tr(intent === "resend" ? "resent" : "sent", lang), keep(3, { phoneLast, devCode: result.devCode }));
  }

  if (intent === "code") {
    const parsed = parseForm(claimCodeSchema, { providerSlug: provider.slug, code: one(formData.get("code")).replace(/\D/g, ""), lang });
    if (!parsed.ok) return err("invalid_input", tr("code", lang), keep(3, { phoneLast }), { code: [T.code.en] });
    const store = await cookies();
    const challengeId = store.get(CLAIM_COOKIE)?.value;
    if (!challengeId || !phoneKey) return err("expired", tr("noCode", lang), keep(3, { phoneLast }), { code: [T.noCode.en] });
    const check = await verifyOtp({ challengeId, code: parsed.data.code, purpose: "claim" });
    if (!check.ok) {
      const message =
        check.reason === "mismatch" && check.attemptsLeft > 0
          ? tr("mismatch", lang, { n: check.attemptsLeft })
          : check.reason === "mismatch" || check.reason === "locked"
            ? tr("locked", lang)
            : tr("noCode", lang);
      return err(check.reason, message, keep(3, { phoneLast }), { code: [message] });
    }
    // The code must have gone to this listing's clinic number, not to some other phone.
    if (check.phone !== phoneKey) return err("expired", tr("noCode", lang), keep(3, { phoneLast }), { code: [T.noCode.en] });
    store.delete(CLAIM_COOKIE);
    const ref = await createClaim({ user, provider, role: details.data.role, registrationNumber: details.data.registrationNumber, otpVerified: true });
    return ok(tr("done", lang, { ref }), keep(4, { ref, phoneLast }));
  }

  return ok("", keep(current));
}

async function createClaim(input: {
  user: { id: string; phoneMasked: string };
  provider: { id: string; name: string };
  role: keyof typeof CLAIM_ROLE_LABELS;
  registrationNumber: string;
  otpVerified: boolean;
}): Promise<string> {
  const autoChecks: AutoCheck[] = [
    input.otpVerified ? { ok: true, text: "OTP matched clinic number" } : { ok: false, text: "No verified clinic number on record: call the practice" },
    { ok: false, text: "Registration number not yet matched on council register" },
  ];
  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("claim", tx);
    await tx.claim.create({
      data: {
        ref: r,
        providerId: input.provider.id,
        claimantId: input.user.id,
        claimantRole: input.role,
        registrationNumber: input.registrationNumber,
        otpVerified: input.otpVerified,
        authorisationNote: input.role === "staff" ? "Staff claim: ask for the doctor's written authorisation" : null,
        autoChecks,
        flags: input.otpVerified ? [] : ["Needs a call to the practice"],
        privateNote: `Claimant: ${CLAIM_ROLE_LABELS[input.role]}, signed in as ${input.user.phoneMasked}`,
      },
    });
    return r;
  });
  expireTags(tags.activity(input.user.id));
  return ref;
}

// ── "Not your listing? Search for yours" ────────────────────────────────────

export type ClaimMatch = { slug: string; name: string; profileKind: ProfileKind; headline: string; place: string | null; claimed: boolean };
export type ClaimSearchData = { query: string; matches: ClaimMatch[] };

export async function findClaimListings(_prev: ActionState<ClaimSearchData>, formData: FormData): Promise<ActionState<ClaimSearchData>> {
  const lang = formLang(formData);
  const parsed = parseForm(claimSearchSchema, formData);
  if (!parsed.ok) return parsed.state;
  const rows = await findClaimCandidates(parsed.data.query, 6);
  const matches = rows.map((r) => ({ slug: r.slug, name: r.name, profileKind: r.profileKind, headline: r.headline, place: r.place, claimed: r.claimed }));
  return ok(tr("found", lang, { n: matches.length }), { query: parsed.data.query, matches });
}
