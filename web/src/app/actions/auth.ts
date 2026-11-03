"use server";

// Sign in with a one-time code, the optional choices at a first sign-in, and sign out.
// Prototype: "Health Gurgaon Account.dc.html" #signin (Your number → Code → Choices → Done).
//
//   const [state, request, pending] = useActionState(requestOtp, idle);       // 1 · Your number
//   const [vstate, verify] = useActionState(verifyOtp, idle);                 // 2 · Code
//   const [cstate, choose] = useActionState(saveWelcomeChoices, idle);        // 3 · Choices (first sign-in)
//   <form action={signOut}><input type="hidden" name="lang" value={lang} /><button>Sign out</button></form>
//
// requestOtp keeps the pending challenge id in an httpOnly cookie, so step 2 only needs the code
// (and works without JavaScript). In development the code comes back in state.data.devCode for
// the "Development mode: your code is 123456" note.
//
// verifyOtp signs the person in and then:
//   · first sign-in → returns { firstSignIn: true }: show "Choices" (saveWelcomeChoices);
//   · returning, with ?next= → redirects there;
//   · returning, no next → returns { firstSignIn: false }: show "Welcome back".

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { fail, formLang, needsSignIn, ok, parseForm, type ActionState } from "@/lib/action-state";
import { hashIp } from "@/lib/auth/otp";
import { issueOtp, verifyOtp as verifyOtpChallenge } from "@/lib/auth/otp-service";
import { maskPhone } from "@/lib/auth/phone";
import { deleteCurrentSession, getCurrentUser, safeNextPath } from "@/lib/auth/session";
import { completeSignIn } from "@/lib/auth/sign-in";
import { expireTags, tags } from "@/lib/cache";
import { recordAccountEvent, setConsent } from "@/lib/consent";
import { db } from "@/lib/db";
import { resolveLocality } from "@/lib/localities";
import { codeMismatchMessage, otpRequestSchema, otpVerifySchema, welcomeChoicesSchema } from "@/lib/validation/auth";

const OTP_COOKIE = process.env.NODE_ENV === "production" ? "__Host-hg_otp" : "hg_otp";

type Lang = "en" | "hi";

const MESSAGES = {
  sent: { en: "We sent it by {via} to {phone}. It works for 10 minutes.", hi: "हमने इसे {via} से {phone} पर भेजा है। यह 10 मिनट तक काम करेगा।" },
  resent: { en: "We sent a new code by {via} to {phone}. Earlier codes no longer work.", hi: "हमने {via} से {phone} पर नया कोड भेजा है। पुराने कोड अब काम नहीं करेंगे।" },
  cooldown: { en: "Please wait {s} seconds before asking for another code.", hi: "नया कोड मांगने से पहले {s} सेकंड रुकें।" },
  phone_hourly_limit: { en: "Too many codes for this number. Try again in {m} minutes.", hi: "इस नंबर के लिए बहुत सारे कोड भेजे गए। {m} मिनट बाद फिर कोशिश करें।" },
  ip_hourly_limit: { en: "Too many sign-in attempts from this network. Try again in {m} minutes.", hi: "इस नेटवर्क से बहुत सारी कोशिशें हुईं। {m} मिनट बाद फिर कोशिश करें।" },
  unavailable: { en: "Sign-in is temporarily unavailable. Please try again later.", hi: "साइन इन अभी उपलब्ध नहीं है। कृपया बाद में कोशिश करें।" },
  send_failed: { en: "We couldn’t send the code. Please try again.", hi: "हम कोड नहीं भेज सके। कृपया फिर कोशिश करें।" },
  no_challenge: { en: "Your code has expired. Ask for a new code below.", hi: "आपका कोड समाप्त हो गया है। नीचे से नया कोड मांगें।" },
  expired: { en: "That code has expired. Ask for a new code below.", hi: "यह कोड समाप्त हो गया है। नीचे से नया कोड मांगें।" },
  locked: { en: "That code didn’t match 3 times, so it has stopped working. Ask for a new code below.", hi: "यह कोड 3 बार मेल नहीं खाया, इसलिए अब काम नहीं करेगा। नीचे से नया कोड मांगें।" },
  mismatch: { en: "That code doesn’t match. Check the latest message and try again. {n} tries left.", hi: "यह कोड मेल नहीं खाता। सबसे नया संदेश देखकर फिर कोशिश करें। {n} कोशिशें बाकी हैं।" },
  mismatch_one: { en: "That code doesn’t match. Check the latest message and try again. 1 try left.", hi: "यह कोड मेल नहीं खाता। सबसे नया संदेश देखकर फिर कोशिश करें। 1 कोशिश बाकी है।" },
  malformed: { en: "Please enter all 6 digits of the code.", hi: "कृपया कोड के सभी 6 अंक डालें।" },
  signedIn: { en: "You’re signed in.", hi: "आप साइन इन हो गए हैं।" },
  welcomeBack: { en: "Welcome back.", hi: "फिर से स्वागत है।" },
  signInFirst: { en: "Please sign in first.", hi: "पहले साइन इन करें।" },
  unknownLocality: { en: "Choose a locality from the list.", hi: "सूची से एक इलाका चुनें।" },
  choicesSaved: { en: "Your choices are saved, with today’s date, in your consent record.", hi: "आपकी पसंद आज की तारीख के साथ आपके सहमति रिकॉर्ड में सेव हो गई है।" },
} as const;

function t(key: keyof typeof MESSAGES, lang: Lang, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce<string>((s, [k, v]) => s.replace(`{${k}}`, String(v)), MESSAGES[key][lang]);
}

async function clientIpHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
  const secret = process.env.AUTH_SECRET;
  return ip && secret ? hashIp(secret, ip) : null;
}

export type OtpRequestData = {
  phoneMasked: string;
  /** Hidden input for "Send a new code" (the same phone, normalised). */
  phone: string;
  /** How this code was sent: "sms" | "whatsapp". "Send it by WhatsApp instead" posts the other. */
  via: "sms" | "whatsapp";
  resent: boolean;
  /** ISO time after which a new code can be sent (the 0:30 countdown). */
  resendAt: string;
  expiresAt: string;
  /** Only in development with OTP_PROVIDER=dev: "Development mode: your code is 123456". */
  devCode: string | null;
};

/** Step 1: send a code to a mobile number by SMS or WhatsApp. Also "Send a new code by SMS" and
 * "Send it by WhatsApp instead" (fields: phone, via, resend=1). */
export async function requestOtp(_prev: ActionState<OtpRequestData>, formData: FormData): Promise<ActionState<OtpRequestData>> {
  const lang = formLang(formData);
  const parsed = parseForm(otpRequestSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { phone, via, resend } = parsed.data;

  const result = await issueOtp({ phone, ipHash: await clientIpHash(), lang, channel: via });
  if (!result.ok) {
    const s = result.retryAfterSeconds;
    return fail(result.reason, t(result.reason, lang, { s, m: Math.max(1, Math.ceil(s / 60)) }));
  }

  (await cookies()).set(OTP_COOKIE, result.challengeId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  const phoneMasked = maskPhone(phone);
  const viaName = via === "whatsapp" ? "WhatsApp" : "SMS";
  return ok(t(resend ? "resent" : "sent", lang, { via: viaName, phone: phoneMasked }), {
    phoneMasked,
    phone,
    via,
    resent: resend,
    resendAt: result.resendAt.toISOString(),
    expiresAt: result.expiresAt.toISOString(),
    devCode: result.devCode,
  });
}

export type VerifyOtpData = {
  /** True on the first sign-in: show step 3, "Choices". */
  firstSignIn: boolean;
  /** Where "Continue" goes afterwards, when the sign-in started from another page. */
  next: string | null;
  /** "+91 98XXX XX321": "Signed in as …" on the next step (also without JavaScript). */
  phoneMasked: string;
};

/** Step 2: check the code and sign in (creating the account on the first sign-in). Returning
 * people with a `next` go straight there; everyone else gets state back (see the header). */
export async function verifyOtp(_prev: ActionState<VerifyOtpData>, formData: FormData): Promise<ActionState<VerifyOtpData>> {
  const lang = formLang(formData);
  // A pasted "123 456" or "123-456" works: keep the digits before any length check.
  const raw = formData.get("code");
  const parsed = parseForm(otpVerifySchema, {
    code: typeof raw === "string" ? raw.replace(/\D/g, "") : raw,
    lang: formData.get("lang") ?? undefined,
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.ok) return lang === "hi" ? fail("malformed", t("malformed", lang), { code: [t("malformed", lang)] }) : parsed.state;

  const store = await cookies();
  const challengeId = store.get(OTP_COOKIE)?.value;
  if (!challengeId) return fail("no_challenge", t("no_challenge", lang));

  const result = await verifyOtpChallenge({ challengeId, code: parsed.data.code });
  if (!result.ok) {
    if (result.reason === "mismatch") {
      const n = result.attemptsLeft;
      if (n <= 0) return fail("locked", t("locked", lang), { code: [lang === "en" ? codeMismatchMessage(0) : t("locked", lang)] });
      const message = n === 1 ? t("mismatch_one", lang) : t("mismatch", lang, { n });
      return fail("mismatch", message, { code: [lang === "en" ? codeMismatchMessage(n) : message] });
    }
    const reason = result.reason === "not_found" || result.reason === "consumed" ? "no_challenge" : result.reason;
    return fail(reason, t(reason, lang));
  }

  const userAgent = (await headers()).get("user-agent");
  const signedIn = await completeSignIn({ phone: result.phone, lang, channel: result.channel, userAgent });
  store.delete(OTP_COOKIE);
  const next = safeNextPath(parsed.data.next);
  if (!signedIn.isNew && next) redirect(next);
  return ok(signedIn.isNew ? t("signedIn", lang) : t("welcomeBack", lang), { firstSignIn: signedIn.isNew, next, phoneMasked: maskPhone(result.phone) });
}

export type WelcomeChoicesData = {
  weekly: boolean;
  /** The locality chosen for alerts, by name ("Sohna Road"), or null. */
  locality: string | null;
  messageLang: "en" | "hi";
  next: string | null;
};

/** Step 3 (first sign-in only), all optional: the language for messages and sign-in codes, the
 * Weekly Gurgaon Health Report on WhatsApp, and alerts for one locality. Each choice goes in the
 * consent record ("At your first sign-in"). */
export async function saveWelcomeChoices(_prev: ActionState<WelcomeChoicesData>, formData: FormData): Promise<ActionState<WelcomeChoicesData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t("signInFirst", lang));
  const parsed = parseForm(welcomeChoicesSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { messageLang, weekly, local, next } = parsed.data;
  const locality = local ? (resolveLocality(parsed.data.locality) ?? null) : null;
  if (local && !locality) return fail("invalid_input", t("unknownLocality", lang), { locality: [t("unknownLocality", lang)] });

  await db.$transaction(async (tx) => {
    if (weekly) {
      await setConsent(
        { userId: user.id, purpose: "weekly_report", granted: true, channel: "whatsapp", source: "sign_in", context: "At your first sign-in. You ticked the box.", confirmed: true },
        tx,
      );
    }
    if (locality) {
      await tx.follow.upsert({
        where: { userId_kind_targetId: { userId: user.id, kind: "locality", targetId: locality.slug } },
        create: { userId: user.id, kind: "locality", targetId: locality.slug, alert: "whatsapp" },
        update: { alert: "whatsapp" },
      });
      await setConsent(
        {
          userId: user.id,
          purpose: "locality_updates",
          granted: true,
          channel: "whatsapp",
          source: "sign_in",
          subject: locality.name,
          context: "At your first sign-in. You ticked the box and chose the locality.",
          confirmed: true,
        },
        tx,
      );
    }
    await tx.user.update({ where: { id: user.id }, data: { lang: messageLang, ...(locality && !user.localitySlug ? { localitySlug: locality.slug } : {}) } });
    const langWord = messageLang === "hi" ? "Hindi" : "English";
    await recordAccountEvent(
      {
        userId: user.id,
        action: "setting",
        summary: `Chose ${langWord} for messages and sign-in codes${weekly || locality ? "" : ". No messages turned on."}`,
        context: "At your first sign-in.",
        source: "sign_in",
      },
      tx,
    );
  });
  expireTags(tags.consent(user.id), tags.follows(user.id));
  return ok(t("choicesSaved", lang), { weekly, locality: locality?.name ?? null, messageLang, next: next ?? null });
}

/** Sign out of this browser, then back to the sign-in page with "You’ve signed out" (or to
 * `next`). Optional hidden inputs: lang, next. */
export async function signOut(formData: FormData): Promise<void> {
  const lang = formLang(formData);
  await deleteCurrentSession();
  const next = safeNextPath(typeof formData.get("next") === "string" ? (formData.get("next") as string) : null);
  redirect(next ?? (lang === "hi" ? "/hi/account?signed_out=1" : "/account?signed_out=1"));
}
