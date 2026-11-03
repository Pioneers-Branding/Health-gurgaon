// Issuing and checking one-time codes against the database. The rules live in ./otp (pure).
// Server-only; called by the auth Server Actions (src/app/actions/auth.ts) and, with
// purpose "claim", by the profile claim (src/app/actions/claim.ts).

import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";

import {
  challengeUnavailable,
  checkIssueAllowed,
  DEFAULT_ISSUE_LIMITS,
  generateOtpCode,
  hashOtp,
  isWellFormedCode,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  otpHashMatches,
  type IssueLimits,
} from "./otp";
import { getOtpSender, OtpConfigError, shouldRevealDevCode, type OtpPurpose } from "./otp-sender";

const HOUR_MS = 3_600_000;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new OtpConfigError("AUTH_SECRET is missing or too short (see .env.example).");
  return secret;
}

function limitsFromEnv(): IssueLimits {
  const num = (v: string | undefined, fallback: number) => (v && Number.isFinite(+v) && +v > 0 ? Math.floor(+v) : fallback);
  return {
    cooldownMs: DEFAULT_ISSUE_LIMITS.cooldownMs,
    maxPerPhonePerHour: num(process.env.OTP_MAX_PER_PHONE_PER_HOUR, DEFAULT_ISSUE_LIMITS.maxPerPhonePerHour),
    maxPerIpPerHour: num(process.env.OTP_MAX_PER_IP_PER_HOUR, DEFAULT_ISSUE_LIMITS.maxPerIpPerHour),
  };
}

export type IssueOtpResult =
  | { ok: true; challengeId: string; expiresAt: Date; resendAt: Date; devCode: string | null }
  | { ok: false; reason: "cooldown" | "phone_hourly_limit" | "ip_hourly_limit"; retryAfterSeconds: number }
  | { ok: false; reason: "unavailable" | "send_failed"; retryAfterSeconds: 0 };

/** Create a challenge for a normalised phone (+91…) and send the code by SMS or WhatsApp.
 * Earlier unused codes for the same phone and purpose stop working ("Earlier codes no longer
 * work"); the hourly limits count every purpose. */
export async function issueOtp(input: {
  phone: string;
  ipHash: string | null;
  lang: "en" | "hi";
  channel?: "sms" | "whatsapp";
  purpose?: OtpPurpose;
}): Promise<IssueOtpResult> {
  const channel = input.channel ?? "sms";
  const purpose = input.purpose ?? "sign_in";
  const now = new Date();
  let secret: string;
  let sender;
  try {
    secret = authSecret();
    sender = getOtpSender();
  } catch (error) {
    if (error instanceof OtpConfigError) {
      console.error(`[otp] ${error.message}`);
      return { ok: false, reason: "unavailable", retryAfterSeconds: 0 };
    }
    throw error;
  }

  const since = new Date(now.getTime() - HOUR_MS);
  const [phoneSends, ipSends] = await Promise.all([
    db.otpChallenge.findMany({ where: { phone: input.phone, createdAt: { gt: since } }, select: { createdAt: true } }),
    input.ipHash ? db.otpChallenge.findMany({ where: { ipHash: input.ipHash, createdAt: { gt: since } }, select: { createdAt: true } }) : Promise.resolve([]),
  ]);
  const decision = checkIssueAllowed({
    now,
    phoneSends: phoneSends.map((r) => r.createdAt),
    ipSends: ipSends.map((r) => r.createdAt),
    limits: limitsFromEnv(),
  });
  if (!decision.ok) return decision;

  const id = randomUUID();
  const code = generateOtpCode();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  await db.$transaction([
    db.otpChallenge.updateMany({ where: { phone: input.phone, purpose, consumedAt: null }, data: { consumedAt: now } }),
    db.otpChallenge.create({
      data: { id, phone: input.phone, purpose, channel, codeHash: hashOtp(secret, { challengeId: id, phone: input.phone, code }), expiresAt, maxAttempts: OTP_MAX_ATTEMPTS, ipHash: input.ipHash, createdAt: now },
    }),
  ]);

  try {
    await sender.send({ phone: input.phone, code, expiresAt, lang: input.lang, purpose, channel });
  } catch (error) {
    console.error("[otp] sending failed", error);
    await db.otpChallenge.update({ where: { id }, data: { consumedAt: new Date() } });
    return { ok: false, reason: "send_failed", retryAfterSeconds: 0 };
  }

  return {
    ok: true,
    challengeId: id,
    expiresAt,
    resendAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS),
    devCode: shouldRevealDevCode() ? code : null,
  };
}

export type VerifyOtpResult =
  | { ok: true; phone: string; channel: "sms" | "whatsapp" }
  | { ok: false; reason: "not_found" | "consumed" | "expired" | "locked" | "malformed" | "mismatch"; attemptsLeft: number };

/** Check a code. Each well-formed attempt is counted atomically before comparing, so parallel
 * guesses can't exceed the limit. A challenge issued for another purpose counts as not found,
 * so a claim code never signs anyone in. */
export async function verifyOtp(input: { challengeId: string; code: string; purpose?: OtpPurpose }): Promise<VerifyOtpResult> {
  const now = new Date();
  const secret = authSecret();
  const challenge = await db.otpChallenge.findUnique({ where: { id: input.challengeId } });
  if (!challenge || challenge.purpose !== (input.purpose ?? "sign_in")) return { ok: false, reason: "not_found", attemptsLeft: 0 };
  const blocked = challengeUnavailable(challenge, now);
  if (blocked) return { ok: false, reason: blocked, attemptsLeft: Math.max(0, challenge.maxAttempts - challenge.attempts) };
  if (!isWellFormedCode(input.code)) return { ok: false, reason: "malformed", attemptsLeft: challenge.maxAttempts - challenge.attempts };

  const counted = await db.otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: challenge.maxAttempts } },
    data: { attempts: { increment: 1 } },
  });
  if (counted.count === 0) {
    const fresh = await db.otpChallenge.findUnique({ where: { id: challenge.id } });
    const reason = fresh ? (challengeUnavailable(fresh, now) ?? "locked") : "not_found";
    return { ok: false, reason, attemptsLeft: 0 };
  }
  const attempts = challenge.attempts + 1;

  if (!otpHashMatches(secret, { challengeId: challenge.id, phone: challenge.phone, code: input.code }, challenge.codeHash)) {
    return { ok: false, reason: "mismatch", attemptsLeft: Math.max(0, challenge.maxAttempts - attempts) };
  }
  const consumed = await db.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: now } });
  if (consumed.count === 0) return { ok: false, reason: "consumed", attemptsLeft: 0 };
  return { ok: true, phone: challenge.phone, channel: challenge.channel === "whatsapp" ? "whatsapp" : "sms" };
}

/** Housekeeping: delete challenges older than a day (codes expire after 10 minutes; the hour of
 * history is what the rate limits need). Safe to run from a cron/Route Handler. */
export async function pruneOtpChallenges(olderThanHours = 24): Promise<number> {
  const { count } = await db.otpChallenge.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - olderThanHours * HOUR_MS) } } });
  return count;
}
