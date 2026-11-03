// Messages and consent, the email address for messages, how reviews are signed, the
// homepage's no-account WhatsApp sign-up, and account deletion. Messages are the Account
// prototype's ("WhatsApp & email", "Saved & followed").

import { z } from "zod";

import { MESSAGE_CHANNELS } from "@/lib/consent-text";
import { CONSENT_PURPOSES } from "@/lib/domain";

import { checkbox, indianMobile, lang, mustTick, optionalText, stringList, text } from "./common";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const purpose = z.enum(CONSENT_PURPOSES, "Unknown message type.");

/** Turn a message type on or off. `granted`: a checkbox, or "on"/"off", "grant"/"withdraw".
 * `channel` (optional) picks WhatsApp or email when turning on. Locality alerts: `locality` (a
 * slug) is followed first when no followed locality has alerts yet. `from` says which page, for
 * the consent record; `undo` marks the Undo straight after a change. */
export const setConsentSchema = z.object({
  purpose,
  granted: z.preprocess((v) => (v === "grant" || v === "on" ? true : v === "withdraw" || v === "off" ? false : v), checkbox),
  channel: z.preprocess(emptyToUndefined, z.enum(MESSAGE_CHANNELS, "Choose WhatsApp or email.").optional()),
  locality: optionalText(80),
  from: z.enum(["messages", "saved"]).catch("messages"),
  undo: checkbox,
  lang,
});
export type SetConsentInput = z.infer<typeof setConsentSchema>;

/** "How you get X: WhatsApp | Email". */
export const messageChannelSchema = z.object({
  purpose,
  channel: z.enum(MESSAGE_CHANNELS, "Choose WhatsApp or email."),
  lang,
});

/** "Language for messages and sign-in codes". */
export const messageLanguageSchema = z.object({
  messageLang: z.enum(["en", "hi"], "Choose English or हिंदी."),
  lang,
});

export const EMAIL_FORMAT_MESSAGE = "Please check the email address. It should look like name@example.com.";

/** "Email address" / "Change to a new email address": we send a link to confirm it. */
export const emailChangeSchema = z.object({
  email: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.email(EMAIL_FORMAT_MESSAGE).max(200, EMAIL_FORMAT_MESSAGE)),
  lang,
});

/** Opening the confirmation link: the page posts the token from ?confirm_email=… */
export const confirmEmailSchema = z.object({
  token: z.string("This link doesn’t work any more.").trim().min(20, "This link doesn’t work any more.").max(200, "This link doesn’t work any more."),
  lang,
});

/** "How your reviews and posts are signed": one of the offered labels (src/lib/review-label.ts). */
export const reviewLabelSchema = z.object({
  label: text(3, 80, "Choose how your reviews and posts are signed."),
  lang,
});

/** "Stop all WhatsApp messages": one tap, no fields beyond the language. */
export const stopAllWhatsAppSchema = z.object({ lang });

/** Undo straight after "Stop all WhatsApp messages": the types it stopped (repeat `purposes`). */
export const undoStopAllSchema = z.object({
  purposes: stringList.pipe(z.array(purpose).min(1, "Nothing to turn back on.")),
  lang,
});

/** Pages that offer "The Weekly Gurgaon Health Report, on WhatsApp" with no account needed. */
export const WEEKLY_SIGNUP_PAGES = ["homepage", "news"] as const;
export type WeeklySignupPage = (typeof WEEKLY_SIGNUP_PAGES)[number];

/** "The Weekly Gurgaon Health Report, on WhatsApp" (no account needed). `from` is the page the
 * form is on (a hidden field), recorded in the consent record. */
export const weeklyReportSignupSchema = z.object({
  phone: indianMobile("Enter a 10-digit mobile number."),
  consent: mustTick("Please tick the consent box so we can message you."),
  from: z.enum(WEEKLY_SIGNUP_PAGES).catch("homepage"),
  lang,
});

export const PUBLISHED_REVIEW_CHOICE_MESSAGE = "Please choose what happens to your published review first.";

/** Delete the account. With a published review, the person chooses: keep it signed “Former
 * resident” (keep) or take it down (remove). The action enforces the choice when it's needed. */
export const deleteAccountSchema = z.object({
  publishedReviews: z.preprocess(emptyToUndefined, z.enum(["keep", "remove"], PUBLISHED_REVIEW_CHOICE_MESSAGE).optional()),
  lang,
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
