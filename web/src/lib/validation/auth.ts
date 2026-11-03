// Sign-in with a one-time code, and the optional choices at a first sign-in.
// Messages are the Account prototype's (#signin).

import { z } from "zod";

import { OTP_LENGTH, OTP_MAX_ATTEMPTS } from "@/lib/auth/otp-constants";
import { mobileNumberProblem, normalizeIndianMobile } from "@/lib/auth/phone";

import { checkbox, lang, nextPath, optionalText } from "./common";

/** How the code is sent. Choosing WhatsApp only sends the code; it signs you up for nothing. */
export const OTP_CHANNELS = ["sms", "whatsapp"] as const;
export type OtpChannel = (typeof OTP_CHANNELS)[number];

/** The mobile number on the sign-in page, with the prototype's three messages. */
export const signInPhone = z.string("Please enter your mobile number.").transform((value, ctx) => {
  const problem = mobileNumberProblem(value);
  const phone = problem ? null : normalizeIndianMobile(value);
  if (!phone) {
    ctx.addIssue({ code: "custom", message: problem ?? "Please enter your mobile number." });
    return z.NEVER;
  }
  return phone;
});

/** Step 1: "Your number". Also "Send a new code by SMS" / "Send it by WhatsApp instead"
 * (resend = "1"). */
export const otpRequestSchema = z.object({
  phone: signInPhone,
  via: z.enum(OTP_CHANNELS).catch("sms"),
  resend: checkbox,
  lang,
  next: nextPath,
});
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const CODE_INCOMPLETE_MESSAGE = `Please enter all ${OTP_LENGTH} digits of the code.`;

/** Step 2: "Code". Spaces, dashes and dots typed or pasted between digits ("123 456", "123-456") are ignored. */
export const otpVerifySchema = z.object({
  code: z
    .string(CODE_INCOMPLETE_MESSAGE)
    .transform((v) => v.replace(/[\s.\-‐–—]+/g, ""))
    .pipe(z.string().regex(new RegExp(`^[0-9]{${OTP_LENGTH}}$`), CODE_INCOMPLETE_MESSAGE)),
  lang,
  next: nextPath,
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

/** "That code doesn’t match. … 2 tries left." / "… didn’t match 3 times …". */
export function codeMismatchMessage(triesLeft: number): string {
  return triesLeft > 0
    ? `That code doesn’t match. Check the latest message and try again. ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.`
    : `That code didn’t match ${OTP_MAX_ATTEMPTS} times, so it has stopped working. Ask for a new code below.`;
}

/** Step 3, first sign-in only: "Choices" (all optional). `messageLang` is the language for
 * messages and sign-in codes; `lang` stays the page language. */
export const welcomeChoicesSchema = z
  .object({
    messageLang: z.enum(["en", "hi"]).catch("en"),
    weekly: checkbox,
    local: checkbox,
    locality: optionalText(80),
    lang,
    next: nextPath,
  })
  .refine((v) => !v.local || !!v.locality, { path: ["locality"], message: "Choose the locality you’d like alerts for." });
export type WelcomeChoicesInput = z.infer<typeof welcomeChoicesSchema>;
