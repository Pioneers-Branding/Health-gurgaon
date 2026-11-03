"use server";

// Messages, consent and your data. Prototype: "Health Gurgaon Account.dc.html" → WhatsApp &
// email, Saved & followed (the "Tell me when something I saved changes" switch) and "Your data".
//
// Every change to a message type, the channel, the language or the email address writes a line
// in the consent record (src/lib/consent.ts); nothing is ever deleted from it.
//
//   setConsent            turn a message type on/off (from the WhatsApp & email page or Saved)
//   changeMessageChannel  "How you get X: WhatsApp | Email"
//   setMessageLanguage    "Language for messages and sign-in codes"
//   requestEmailChange    send a confirmation link; confirmEmail opens it
//   setReviewLabel        "How your reviews and posts are signed"
//   stopAllWhatsApp       one tap; undoStopAllWhatsApp turns the same types back on
//   subscribeWeeklyReport homepage / news page sign-up, no account needed
//   exportMyData          everything we hold, as JSON
//   deleteMyAccount       delete, choosing what happens to a published review

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ConsentPurpose, FollowKind } from "@prisma/client";

import { fail, formLang, needsSignIn, ok, parseForm, type ActionState } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { confirmEmailChange, startEmailChange } from "@/lib/auth/email-verification";
import { maskPhone } from "@/lib/auth/phone";
import { SESSION_COOKIE, deleteAllSessions, getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import {
  changeConsentChannel,
  ConsentError,
  currentChannel,
  getConsentHistory,
  getConsentSummary,
  recordAccountEvent,
  setConsent as recordConsent,
  withdrawAll,
} from "@/lib/consent";
import { channelName, consentInfo, HOMEPAGE_WEEKLY_WORDING, type MessageChannel } from "@/lib/consent-text";
import { formatDate, formatStamp } from "@/lib/dates";
import { db } from "@/lib/db";
import { FOLLOW_ALERT_PURPOSE } from "@/lib/domain";
import { getLocality, resolveLocality } from "@/lib/localities";
import { getEmailSender, shouldRevealDevLink } from "@/lib/messaging/email-sender";
import { addToStopList } from "@/lib/messaging/stop-list";
import { FORMER_RESIDENT_LABEL, reviewLabelOptions } from "@/lib/review-label";
import { resolveTargets } from "@/lib/targets";
import {
  confirmEmailSchema,
  deleteAccountSchema,
  emailChangeSchema,
  messageChannelSchema,
  messageLanguageSchema,
  PUBLISHED_REVIEW_CHOICE_MESSAGE,
  reviewLabelSchema,
  setConsentSchema,
  stopAllWhatsAppSchema,
  undoStopAllSchema,
  weeklyReportSignupSchema,
} from "@/lib/validation/consent";

type Lang = "en" | "hi";

const T = {
  signIn: { en: "Please sign in to manage your messages.", hi: "अपने संदेश संभालने के लिए साइन इन करें।" },
  on: { en: "✓ Turned on, and noted in your consent record below.", hi: "✓ चालू हो गया, और नीचे आपके सहमति रिकॉर्ड में दर्ज है।" },
  off: { en: "Stopped. You won’t get “{label}” any more.", hi: "बंद हो गया। अब आपको “{label}” नहीं मिलेंगे।" },
  savedOn: { en: "✓ On. Noted in your consent record, with today’s date. Reply STOP to any message to stop.", hi: "✓ चालू। आज की तारीख के साथ आपके सहमति रिकॉर्ड में दर्ज। बंद करने के लिए किसी भी संदेश पर STOP लिखें।" },
  savedOff: { en: "Off. Noted in your consent record. You’ll still see changes here.", hi: "बंद। आपके सहमति रिकॉर्ड में दर्ज। बदलाव आपको यहाँ दिखते रहेंगे।" },
  unchanged: { en: "No change needed.", hi: "कोई बदलाव ज़रूरी नहीं।" },
  notOffered: { en: "That channel isn’t available for this message.", hi: "यह चैनल इस संदेश के लिए उपलब्ध नहीं है।" },
  chooseLocality: { en: "Choose the locality you’d like alerts for.", hi: "वह इलाका चुनें जिसके अलर्ट आप चाहते हैं।" },
  channel: { en: "✓ “{label}” will now come by {channel}. Noted in your consent record.", hi: "✓ “{label}” अब {channel} से आएंगे। आपके सहमति रिकॉर्ड में दर्ज।" },
  needEmail: { en: "Add an email address below and open the link we send, then choose Email.", hi: "नीचे ईमेल पता जोड़ें और भेजा गया लिंक खोलें, फिर ईमेल चुनें।" },
  lang: { en: "Saved. Messages and sign-in codes will now be in {lang}. Noted in your consent record.", hi: "सेव हो गया। संदेश और साइन-इन कोड अब {lang} में आएंगे। आपके सहमति रिकॉर्ड में दर्ज।" },
  emailSent: { en: "✓ We’ve sent a link to {email}. Nothing changes until you open it. The link works for 24 hours.", hi: "✓ हमने {email} पर एक लिंक भेजा है। लिंक खोलने तक कुछ नहीं बदलेगा। यह लिंक 24 घंटे तक काम करेगा।" },
  emailKeep: { en: " Until then, we keep using {email}.", hi: " तब तक हम {email} ही इस्तेमाल करेंगे।" },
  emailSame: { en: "That’s already your email address for messages.", hi: "यह पहले से आपका ईमेल पता है।" },
  emailConfirmed: { en: "✓ Email confirmed: {email}. Choose Email on any message to use it.", hi: "✓ ईमेल की पुष्टि हुई: {email}। इसे इस्तेमाल करने के लिए किसी भी संदेश पर ईमेल चुनें।" },
  emailLinkBad: { en: "This link doesn’t work any more. Ask for a new one on the WhatsApp & email page.", hi: "यह लिंक अब काम नहीं करता। WhatsApp और ईमेल पेज से नया लिंक मांगें।" },
  label: { en: "Saved. Your reviews and posts will show “{label}” within an hour.", hi: "सेव हो गया। आपकी समीक्षाओं और पोस्ट पर एक घंटे में “{label}” दिखेगा।" },
  labelUnknown: { en: "Choose one of the options shown.", hi: "दिखाए गए विकल्पों में से एक चुनें।" },
  stopped: { en: "Done. All WhatsApp messages have stopped. Nothing more will be sent to {phone}.", hi: "हो गया। सभी WhatsApp संदेश बंद हो गए हैं। {phone} पर अब कुछ नहीं भेजा जाएगा।" },
  stoppedEmail: { en: " {n} by email carry on; turn them off below.", hi: " ईमेल से आने वाले {n} संदेश चालू हैं; उन्हें नीचे बंद करें।" },
  nothingToStop: { en: "You weren’t getting any WhatsApp messages from us.", hi: "आपको हमसे कोई WhatsApp संदेश नहीं मिल रहा था।" },
  undone: { en: "Turned back on, and noted in your consent record.", hi: "फिर से चालू हो गया, और आपके सहमति रिकॉर्ड में दर्ज।" },
  undoTooLate: { en: "Undo is no longer available. Turn messages on one by one below.", hi: "अब पहले जैसा नहीं किया जा सकता। नीचे संदेश एक-एक करके चालू करें।" },
  weekly: { en: "You'll get a confirmation message on WhatsApp. Reply YES to start.", hi: "आपको WhatsApp पर पुष्टि का संदेश मिलेगा। शुरू करने के लिए YES लिखें।" },
  export: { en: "Your data is ready to download.", hi: "आपका डेटा डाउनलोड के लिए तैयार है।" },
} as const;

function t(key: keyof typeof T, lang: Lang, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce<string>((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), T[key][lang]);
}

/** Follows whose alerts ride on each message type. */
const followKindsFor = (purpose: ConsentPurpose) => (Object.keys(FOLLOW_ALERT_PURPOSE) as FollowKind[]).filter((k) => FOLLOW_ALERT_PURPOSE[k] === purpose);

const UNDO_MINUTES = 30;
const STOP_ALL_CONTEXT = "On the WhatsApp & email page. You tapped Stop all WhatsApp messages.";

/** Names of followed localities with alerts on: the record's "Locality alerts for Sohna Road". */
async function alertingLocalities(userId: string): Promise<string[]> {
  const rows = await db.follow.findMany({ where: { userId, kind: "locality", alert: { in: ["whatsapp", "email"] } }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => getLocality(r.targetId)?.name).filter((n): n is string => !!n);
}

export type ConsentActionData = { purpose: ConsentPurpose; on: boolean; channel: MessageChannel };

/** Turn a message type on or off. Fields: purpose, granted (on/off), channel?, locality?
 * (locality alerts), from (messages | saved), undo. Turning on is the confirmation step itself
 * ("Turn on “X”?" → Turn on), so it counts as confirmed. */
export async function setConsent(_prev: ActionState<ConsentActionData>, formData: FormData): Promise<ActionState<ConsentActionData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t("signIn", lang));
  const parsed = parseForm(setConsentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { purpose, granted, channel, from, undo } = parsed.data;
  const label = consentInfo(purpose).label;

  const context =
    from === "saved"
      ? purpose === "saved_changes"
        ? granted
          ? "On the Saved & followed page. You switched on “Tell me when something I saved changes”."
          : "On the Saved & followed page. You switched it off."
        : granted
          ? "On the Saved & followed page. You turned it on and confirmed."
          : "On the Saved & followed page. You turned it off."
      : undo
        ? "On the WhatsApp & email page. You tapped Undo."
        : granted
          ? "On the WhatsApp & email page. You tapped Turn on and confirmed."
          : "On the WhatsApp & email page. You tapped Turn off.";

  try {
    const result = await db.$transaction(async (tx) => {
      let subject: string | null = null;
      if (purpose === "locality_updates") {
        const names = await alertingLocalities(user.id);
        if (granted) {
          const chosen = parsed.data.locality ? resolveLocality(parsed.data.locality) : undefined;
          const followed = await tx.follow.findFirst({ where: { userId: user.id, kind: "locality" }, orderBy: { createdAt: "asc" } });
          const target = chosen ?? (followed ? getLocality(followed.targetId) : undefined);
          if (!target) return null;
          const states = await tx.consentState.findMany({ where: { userId: user.id, purpose } });
          const via: MessageChannel = channel ?? currentChannel(states, purpose);
          await tx.follow.upsert({
            where: { userId_kind_targetId: { userId: user.id, kind: "locality", targetId: target.slug } },
            create: { userId: user.id, kind: "locality", targetId: target.slug, alert: via },
            update: { alert: via },
          });
          subject = target.name;
        } else {
          subject = names.join(", ") || null;
          await tx.follow.updateMany({ where: { userId: user.id, kind: { in: ["locality", "society"] }, alert: { in: ["whatsapp", "email"] } }, data: { alert: "in_app" } });
        }
      }
      return recordConsent({ userId: user.id, purpose, granted, channel, source: from === "saved" ? "saved_page" : "account_settings", context, subject, regrant: undo && granted, confirmed: true }, tx);
    });
    if (!result) return fail("locality_required", t("chooseLocality", lang), { locality: [t("chooseLocality", lang)] });
    expireTags(tags.consent(user.id), tags.follows(user.id));
    const message = !result.changed ? t("unchanged", lang) : from === "saved" ? t(granted ? "savedOn" : "savedOff", lang) : granted ? t("on", lang) : t("off", lang, { label });
    return ok(message, { purpose, on: result.on, channel: result.channel });
  } catch (error) {
    if (error instanceof ConsentError) return fail("not_offered", t("notOffered", lang));
    throw error;
  }
}

/** "How you get X": WhatsApp or email. Email needs a confirmed address first. */
export async function changeMessageChannel(_prev: ActionState<ConsentActionData>, formData: FormData): Promise<ActionState<ConsentActionData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t("signIn", lang));
  const parsed = parseForm(messageChannelSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { purpose, channel } = parsed.data;
  if (channel === "email") {
    const me = await db.user.findUnique({ where: { id: user.id }, select: { email: true, emailVerifiedAt: true } });
    if (!me?.email || !me.emailVerifiedAt) return fail("email_required", t("needEmail", lang));
  }
  try {
    const result = await db.$transaction(async (tx) => {
      const r = await changeConsentChannel({ userId: user.id, purpose, channel, source: "account_settings", context: "On the WhatsApp & email page." }, tx);
      const kinds = followKindsFor(purpose);
      if (r.changed && kinds.length) {
        await tx.follow.updateMany({ where: { userId: user.id, kind: { in: kinds }, alert: { in: ["whatsapp", "email"] } }, data: { alert: channel } });
      }
      return r;
    });
    expireTags(tags.consent(user.id), tags.follows(user.id));
    if (!result.changed) return ok(t("unchanged", lang), { purpose, on: result.on, channel });
    return ok(t("channel", lang, { label: consentInfo(purpose).label, channel: channelName(channel) }), { purpose, on: result.on, channel });
  } catch (error) {
    if (error instanceof ConsentError) return fail("not_offered", t("notOffered", lang));
    throw error;
  }
}

/** "Language for messages and sign-in codes": English or हिंदी. Noted in the consent record. */
export async function setMessageLanguage(_prev: ActionState<{ messageLang: Lang }>, formData: FormData): Promise<ActionState<{ messageLang: Lang }>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t("signIn", lang));
  const parsed = parseForm(messageLanguageSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { messageLang } = parsed.data;
  const word = messageLang === "hi" ? "Hindi" : "English";
  if (user.lang === messageLang) return ok(t("unchanged", lang), { messageLang });
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { lang: messageLang } });
    await recordAccountEvent({ userId: user.id, action: "setting", summary: `Chose ${word} for messages and sign-in codes`, context: "On the WhatsApp & email page.", source: "account_settings" }, tx);
  });
  expireTags(tags.consent(user.id));
  return ok(t("lang", lang, { lang: messageLang === "hi" ? (lang === "hi" ? "हिंदी" : "Hindi") : lang === "hi" ? "अंग्रेज़ी" : "English" }), { messageLang });
}

export type EmailChangeData = { pending: string; expiresAt: string; /** Development only: the link we "sent". */ devLink: string | null };

/** "Email address" / "Change to a new email address": sends a confirmation link (24 hours).
 * Nothing changes until it's opened. */
export async function requestEmailChange(_prev: ActionState<EmailChangeData>, formData: FormData): Promise<ActionState<EmailChangeData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t("signIn", lang));
  const parsed = parseForm(emailChangeSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { email } = parsed.data;
  const me = await db.user.findUnique({ where: { id: user.id }, select: { email: true, emailVerifiedAt: true } });
  if (me?.email === email && me.emailVerifiedAt) return fail("unchanged", t("emailSame", lang), { email: [t("emailSame", lang)] });

  const { token, expiresAt } = await startEmailChange(user.id, email);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${site}${lang === "hi" ? "/hi" : ""}/account/consent?confirm_email=${encodeURIComponent(token)}`;
  await getEmailSender().send({
    to: email,
    subject: "Confirm your email for HealthGurgaon messages",
    text: `Open this link to use ${email} for the HealthGurgaon messages you choose to get by email. It works for 24 hours.\n\n${link}\n\nIf you didn’t ask for this, ignore this email. Nothing will change.`,
  });
  expireTags(tags.consent(user.id));
  const message = t("emailSent", lang, { email }) + (me?.email && me.emailVerifiedAt ? t("emailKeep", lang, { email: me.email }) : "");
  return ok(message, { pending: email, expiresAt: expiresAt.toISOString(), devLink: shouldRevealDevLink() ? link : null });
}

/** Opening the confirmation link. The account page posts the token from ?confirm_email=… (a
 * button, not a GET, so link scanners can't confirm it). Works signed in or out. */
export async function confirmEmail(_prev: ActionState<{ email: string }>, formData: FormData): Promise<ActionState<{ email: string }>> {
  const lang = formLang(formData);
  const parsed = parseForm(confirmEmailSchema, formData);
  if (!parsed.ok) return fail("invalid_link", t("emailLinkBad", lang));
  const result = await confirmEmailChange(parsed.data.token);
  if (!result.ok) return fail(`link_${result.reason}`, t("emailLinkBad", lang));
  expireTags(tags.consent(result.userId));
  return ok(t("emailConfirmed", lang, { email: result.email }), { email: result.email });
}

/** "How your reviews and posts are signed": one of reviewLabelOptions(). Updates every review
 * and post the person wrote. */
export async function setReviewLabel(_prev: ActionState<{ label: string }>, formData: FormData): Promise<ActionState<{ label: string }>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t("signIn", lang));
  const parsed = parseForm(reviewLabelSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { label } = parsed.data;
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { reviewLabel: true, area: true } });
  if (!reviewLabelOptions(me).includes(label)) return fail("invalid_input", t("labelUnknown", lang), { label: [t("labelUnknown", lang)] });

  const [reviews, posts] = await Promise.all([
    db.review.findMany({ where: { authorId: user.id }, select: { provider: { select: { slug: true } } } }),
    db.post.findMany({ where: { authorId: user.id }, select: { threadId: true } }),
  ]);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { reviewLabel: label } }),
    db.review.updateMany({ where: { authorId: user.id }, data: { authorLabel: label } }),
    db.post.updateMany({ where: { authorId: user.id }, data: { authorLabel: label } }),
  ]);
  expireTags(tags.activity(user.id), ...reviews.map((r) => tags.reviews(r.provider.slug)), ...posts.map((p) => tags.thread(p.threadId)), posts.length ? tags.threads : null);
  return ok(t("label", lang, { label }), { label });
}

/** "Stop all WhatsApp messages": stops every type that comes by WhatsApp, in one tap. Returns
 * the types stopped, for the Undo (undoStopAllWhatsApp). */
export async function stopAllWhatsApp(_prev: ActionState<{ stopped: ConsentPurpose[] }>, formData: FormData): Promise<ActionState<{ stopped: ConsentPurpose[] }>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t("signIn", lang));
  const parsed = parseForm(stopAllWhatsAppSchema, formData);
  if (!parsed.ok) return parsed.state;
  const names = await alertingLocalities(user.id);
  const stopped = await withdrawAll(user.id, {
    channel: "whatsapp",
    source: "account_settings",
    context: STOP_ALL_CONTEXT,
    subjects: names.length ? { locality_updates: names.join(", ") } : {},
  });
  expireTags(tags.consent(user.id));
  if (!stopped.length) return ok(t("nothingToStop", lang), { stopped });
  const byEmail = await db.consentState.count({ where: { userId: user.id, granted: true, channel: "email" } });
  const message = t("stopped", lang, { phone: user.phoneMasked }) + (byEmail ? t("stoppedEmail", lang, { n: byEmail }) : "");
  return ok(message, { stopped });
}

/** Undo straight after "Stop all WhatsApp messages" (within 30 minutes): turns the same types
 * back on, noted as "Turned back on". Field: purposes (repeated). */
export async function undoStopAllWhatsApp(_prev: ActionState<{ restored: ConsentPurpose[] }>, formData: FormData): Promise<ActionState<{ restored: ConsentPurpose[] }>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t("signIn", lang));
  const parsed = parseForm(undoStopAllSchema, formData);
  if (!parsed.ok) return parsed.state;
  const since = new Date(Date.now() - UNDO_MINUTES * 60_000);
  const restored: ConsentPurpose[] = [];
  const names = await alertingLocalities(user.id);
  await db.$transaction(async (tx) => {
    for (const purpose of new Set(parsed.data.purposes)) {
      const last = await tx.consent.findFirst({ where: { userId: user.id, purpose }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      if (!last || last.action !== "withdrawn" || last.context !== STOP_ALL_CONTEXT || last.createdAt < since) continue;
      const r = await recordConsent(
        {
          userId: user.id,
          purpose,
          granted: true,
          channel: "whatsapp",
          source: "account_settings",
          context: "On the WhatsApp & email page. You tapped Undo straight after stopping.",
          subject: purpose === "locality_updates" ? names.join(", ") || null : null,
          regrant: true,
          confirmed: true,
        },
        tx,
      );
      if (r.changed) restored.push(purpose);
    }
  });
  expireTags(tags.consent(user.id));
  if (!restored.length) return fail("undo_expired", t("undoTooLate", lang));
  return ok(t("undone", lang), { restored });
}

/** Homepage and news page: "The Weekly Gurgaon Health Report, on WhatsApp" (hidden field
 * `from`: "homepage" | "news"). No account needed: the number is
 * kept (privately) as an unverified contact and the yes counts once the person replies YES on
 * WhatsApp (ConsentState.confirmedAt). The answer is the same whether or not the number was known. */
export async function subscribeWeeklyReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const lang = formLang(formData);
  const parsed = parseForm(weeklyReportSignupSchema, formData);
  if (!parsed.ok) return parsed.state;
  const phone = parsed.data.phone;
  const user = (await db.user.findUnique({ where: { phone } })) ?? (await db.user.create({ data: { phone, lang, role: "resident" } }));
  if (!user.deletedAt) {
    const recent = await db.consent.count({ where: { userId: user.id, purpose: "weekly_report", createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
    if (!recent) {
      await recordConsent({
        userId: user.id,
        purpose: "weekly_report",
        granted: true,
        channel: "whatsapp",
        source: parsed.data.from === "news" ? "news_page" : "homepage_form",
        context: `${parsed.data.from === "news" ? "On the news page" : "On the homepage"}. You chose WhatsApp; we sent a message to confirm.`,
        wording: HOMEPAGE_WEEKLY_WORDING,
      });
    }
  }
  return ok(t("weekly", lang));
}

export type ExportedData = { filename: string; json: string };

/** "Download my data": everything we hold about the signed-in person, as a JSON file. */
export async function exportMyData(_prev: ActionState<ExportedData>, formData: FormData): Promise<ActionState<ExportedData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t("signIn", lang));
  const u = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    include: {
      savedItems: { orderBy: { createdAt: "desc" } },
      follows: { orderBy: { createdAt: "desc" } },
      reviews: { orderBy: { createdAt: "desc" }, include: { provider: { select: { name: true } } } },
      reports: { orderBy: { createdAt: "desc" } },
      disputes: { orderBy: { createdAt: "desc" } },
      claims: { orderBy: { createdAt: "desc" }, include: { provider: { select: { name: true } } } },
      threads: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, body: true, status: true, createdAt: true } },
      posts: { orderBy: { createdAt: "desc" }, select: { id: true, threadId: true, body: true, status: true, createdAt: true } },
      events: { orderBy: { createdAt: "desc" } },
      volunteerApplications: { orderBy: { createdAt: "desc" }, include: { role: { select: { title: true } } } },
      sessions: { select: { createdAt: true, expiresAt: true, userAgent: true } },
    },
  });
  const [types, record, targets] = await Promise.all([getConsentSummary(user.id), getConsentHistory(user.id, 1000), resolveTargets([...u.savedItems, ...u.follows])]);
  const name = (kind: string, id: string) => targets.get(`${kind}:${id}`)?.title ?? id;
  const day = (d: Date | null | undefined) => (d ? formatDate(d) : null);

  const data = {
    exported: formatDate(new Date()),
    account: {
      mobile: u.phone,
      email: u.email,
      area: u.area,
      locality: u.localitySlug ? (getLocality(u.localitySlug)?.name ?? u.localitySlug) : null,
      reviews_signed_as: u.reviewLabel,
      message_language: u.lang === "hi" ? "Hindi" : "English",
      first_signed_in: day(u.phoneVerifiedAt ?? u.createdAt),
    },
    saved: u.savedItems.map((s) => ({ kind: s.kind, name: name(s.kind, s.targetId), saved: day(s.createdAt) })),
    following: u.follows.map((f) => ({ kind: f.kind, name: name(f.kind, f.targetId), alerts: f.alert === "whatsapp" || f.alert === "email", since: day(f.createdAt) })),
    messages: types.map((m) => ({ type: m.label, on: m.on, channel: m.on ? channelName(m.channel) : null, record: m.recordText })),
    consent_record: record.map((r) => ({ when: formatStamp(new Date(r.at)), what: r.summary, where: r.context, tag: r.tag, wording: r.wording, wording_version: r.wordingVersion })),
    reviews: u.reviews.map((r) => ({ ref: r.ref, about: r.provider.name, status: r.status, visited: r.visitMonth, text: r.text, pending_edit: r.editText, sent: day(r.createdAt), published: day(r.publishedAt) })),
    reports: u.reports.map((r) => ({ ref: r.ref, type: r.type, about: r.targetLabel, field: r.field, what_you_said: r.details, status: r.status, outcome: r.resolution, received: day(r.createdAt) })),
    events_submitted: u.events.map((e) => ({ ref: e.ref, title: e.title, status: e.status, when: day(e.startsAt), received: day(e.submittedAt ?? e.createdAt) })),
    disputes: u.disputes.map((d) => ({ ref: d.ref, about: d.itemLabel, your_reason: d.details, status: d.status, outcome: d.outcomeText, received: day(d.createdAt) })),
    claims: u.claims.map((c) => ({ ref: c.ref, listing: c.provider.name, role: c.claimantRole, status: c.status, received: day(c.createdAt) })),
    questions: u.threads.map((q) => ({ id: q.id, title: q.title, text: q.body, status: q.status, asked: day(q.createdAt) })),
    replies: u.posts.map((p) => ({ id: p.id, thread: p.threadId, text: p.body, status: p.status, posted: day(p.createdAt) })),
    volunteering: u.volunteerApplications.map((a) => ({ ref: a.ref, role: a.role.title, status: a.status, applied: day(a.createdAt) })),
    signed_in_devices: u.sessions.map((s) => ({ since: day(s.createdAt), until: day(s.expiresAt), browser: s.userAgent })),
  };
  await writeAudit({ actor: user, action: "account.export", target: { kind: "user", id: user.id, label: "Own data export" } });
  return ok(t("export", lang), { filename: `healthgurgaon-my-data-${new Date().toISOString().slice(0, 10)}.json`, json: JSON.stringify(data, null, 2) });
}

/** Delete the account. Straight away: the number, email, area, saved items and follows go;
 * every message stops (the number is kept only as a hashed "said stop" note for a year); reviews
 * waiting for a moderator or for changes are deleted. A published review is kept signed “Former
 * resident” (publishedReviews=keep) or taken down (remove): the person must choose. Reports,
 * events and disputes stay, without the person's details. Redirects to /account?deleted=… */
export async function deleteMyAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(t("signIn", lang));
  const parsed = parseForm(deleteAccountSchema, formData);
  if (!parsed.ok) return parsed.state;
  const id = user.id;
  const choice = parsed.data.publishedReviews;
  const published = await db.review.findMany({ where: { authorId: id, status: "published" }, select: { id: true, provider: { select: { slug: true } } } });
  if (published.length && !choice) return fail("choice_required", PUBLISHED_REVIEW_CHOICE_MESSAGE, { publishedReviews: [PUBLISHED_REVIEW_CHOICE_MESSAGE] });

  const me = await db.user.findUniqueOrThrow({ where: { id }, select: { phone: true, _count: { select: { reports: true, events: true, disputes: true, claims: true } } } });
  // "Reports and events you sent stay, without your details": only said when there were some.
  const kept = me._count.reports + me._count.events + me._count.disputes + me._count.claims > 0;
  const threads = await db.post.findMany({ where: { authorId: id }, select: { threadId: true } });
  const now = new Date();
  await db.$transaction(async (tx) => {
    await withdrawAll(id, { source: "account_deleted", context: "You deleted your account." }, tx);
    await tx.savedItem.deleteMany({ where: { userId: id } });
    await tx.follow.deleteMany({ where: { userId: id } });
    await tx.reviewHelpful.deleteMany({ where: { userId: id } });
    await tx.postReaction.deleteMany({ where: { userId: id } });
    await tx.emailChallenge.deleteMany({ where: { userId: id } });
    await tx.review.deleteMany({ where: { authorId: id, status: { in: ["pending", "needs_changes"] } } });
    if (choice === "remove") {
      await tx.review.updateMany({ where: { authorId: id, status: "published" }, data: { status: "withdrawn" } });
    } else {
      await tx.review.updateMany({ where: { authorId: id, status: "published" }, data: { authorLabel: FORMER_RESIDENT_LABEL } });
    }
    await tx.review.updateMany({ where: { authorId: id }, data: { authorId: null, editText: null, editSubmittedAt: null, suggestion: null } });
    await tx.thread.updateMany({ where: { authorId: id }, data: { authorId: null } });
    await tx.post.updateMany({ where: { authorId: id }, data: { authorId: null, authorLabel: FORMER_RESIDENT_LABEL } });
    await tx.report.updateMany({ where: { reporterId: id }, data: { reporterId: null, reporterEmail: null } });
    await tx.dispute.updateMany({ where: { filerId: id }, data: { filerId: null, email: null } });
    await tx.claim.updateMany({ where: { claimantId: id }, data: { claimantId: null } });
    await tx.event.updateMany({ where: { submitterId: id }, data: { submitterId: null } });
    await tx.societyMember.updateMany({ where: { userId: id }, data: { userId: null } });
    await tx.volunteerApplication.updateMany({ where: { userId: id }, data: { userId: null } });
    if (me.phone.startsWith("+")) await addToStopList(me.phone, "account_deleted", tx);
    await tx.user.update({
      where: { id },
      data: {
        phone: `deleted:${id}`,
        displayName: null,
        email: null,
        emailVerifiedAt: null,
        area: null,
        reviewLabel: null,
        localitySlug: null,
        professionalLabel: null,
        deletedAt: now,
        role: "resident",
      },
    });
    await writeAudit({ actor: { ...user, displayName: "Deleted account" }, action: "account.delete", target: { kind: "user", id, label: "Deleted account" } }, tx);
  });
  console.info(`[sms:dev] account deleted: final confirmation to ${maskPhone(me.phone)}`);
  await deleteAllSessions(id);
  (await cookies()).delete(SESSION_COOKIE);
  expireTags(
    ...published.map((r) => tags.reviews(r.provider.slug)),
    ...threads.map((p) => tags.thread(p.threadId)),
    threads.length ? tags.threads : null,
  );
  const review = published.length ? choice : "none";
  redirect(`${lang === "hi" ? "/hi" : ""}/account?deleted=1&review=${review}${kept ? "&kept=1" : ""}`);
}
