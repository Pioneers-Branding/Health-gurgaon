// One-time sign-in codes: generation, hashing and the rules, as pure functions (the database side
// is src/lib/auth/otp-service.ts). Unit-tested in tests/unit/otp.test.ts.
//
// Rules: 6 digits · stored only as HMAC-SHA256(AUTH_SECRET, challenge id + phone + code) ·
// expire after 10 minutes · 5 attempts per code · 30 seconds between sends to a phone ·
// at most 5 codes per phone and 20 per IP address per rolling hour.

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import {
  OTP_DEFAULT_MAX_PER_IP_PER_HOUR,
  OTP_DEFAULT_MAX_PER_PHONE_PER_HOUR,
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_MS,
} from "./otp-constants";

export * from "./otp-constants";

const HOUR_MS = 3_600_000;

export function generateOtpCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

export function isWellFormedCode(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}

/** HMAC of the code, bound to its challenge and phone so a hash can't be replayed elsewhere. */
export function hashOtp(secret: string, input: { challengeId: string; phone: string; code: string }): string {
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`hg-otp:v1:${input.challengeId}:${input.phone}:${input.code}`).digest("hex");
}

export function otpHashMatches(secret: string, input: { challengeId: string; phone: string; code: string }, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(secret, input), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Hash of an IP address for rate limiting, so raw IPs are never stored. */
export function hashIp(secret: string, ip: string): string {
  return createHmac("sha256", secret).update(`hg-ip:v1:${ip}`).digest("hex").slice(0, 32);
}

export type IssueLimits = { cooldownMs: number; maxPerPhonePerHour: number; maxPerIpPerHour: number };

export const DEFAULT_ISSUE_LIMITS: IssueLimits = {
  cooldownMs: OTP_RESEND_COOLDOWN_MS,
  maxPerPhonePerHour: OTP_DEFAULT_MAX_PER_PHONE_PER_HOUR,
  maxPerIpPerHour: OTP_DEFAULT_MAX_PER_IP_PER_HOUR,
};

export type IssueDecision =
  | { ok: true }
  | { ok: false; reason: "cooldown" | "phone_hourly_limit" | "ip_hourly_limit"; retryAfterSeconds: number };

/** May we send another code? `phoneSends` / `ipSends`: when earlier codes were created (any order). */
export function checkIssueAllowed(input: { now: Date; phoneSends: Date[]; ipSends?: Date[]; limits?: IssueLimits }): IssueDecision {
  const limits = input.limits ?? DEFAULT_ISSUE_LIMITS;
  const now = input.now.getTime();
  const phone = input.phoneSends.map((d) => d.getTime()).filter((t) => t > now - HOUR_MS).sort((a, b) => a - b);
  const latest = phone[phone.length - 1];
  if (latest !== undefined && now - latest < limits.cooldownMs) {
    return { ok: false, reason: "cooldown", retryAfterSeconds: Math.ceil((limits.cooldownMs - (now - latest)) / 1000) };
  }
  if (phone.length >= limits.maxPerPhonePerHour) {
    const oldest = phone[phone.length - limits.maxPerPhonePerHour];
    return { ok: false, reason: "phone_hourly_limit", retryAfterSeconds: Math.max(1, Math.ceil((oldest + HOUR_MS - now) / 1000)) };
  }
  const ip = (input.ipSends ?? []).map((d) => d.getTime()).filter((t) => t > now - HOUR_MS).sort((a, b) => a - b);
  if (ip.length >= limits.maxPerIpPerHour) {
    const oldest = ip[ip.length - limits.maxPerIpPerHour];
    return { ok: false, reason: "ip_hourly_limit", retryAfterSeconds: Math.max(1, Math.ceil((oldest + HOUR_MS - now) / 1000)) };
  }
  return { ok: true };
}

export type ChallengeRecord = {
  id: string;
  phone: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  consumedAt: Date | null;
};

export type AttemptOutcome =
  | { ok: true; attempts: number }
  | { ok: false; reason: "consumed" | "expired" | "locked" | "malformed" | "mismatch"; attempts: number; attemptsLeft: number };

/** Why a challenge can't take another attempt right now, or null if it can. */
export function challengeUnavailable(c: ChallengeRecord, now: Date): "consumed" | "expired" | "locked" | null {
  if (c.consumedAt) return "consumed";
  if (now.getTime() >= c.expiresAt.getTime()) return "expired";
  if (c.attempts >= c.maxAttempts) return "locked";
  return null;
}

/** Judge one attempt. Every well-formed attempt on a usable challenge counts towards the limit,
 * including the correct one. Returns the attempt count to store. */
export function evaluateOtpAttempt(c: ChallengeRecord, code: string, now: Date, secret: string): AttemptOutcome {
  const blocked = challengeUnavailable(c, now);
  if (blocked) return { ok: false, reason: blocked, attempts: c.attempts, attemptsLeft: Math.max(0, c.maxAttempts - c.attempts) };
  if (!isWellFormedCode(code)) return { ok: false, reason: "malformed", attempts: c.attempts, attemptsLeft: c.maxAttempts - c.attempts };
  const attempts = c.attempts + 1;
  if (otpHashMatches(secret, { challengeId: c.id, phone: c.phone, code }, c.codeHash)) return { ok: true, attempts };
  return { ok: false, reason: "mismatch", attempts, attemptsLeft: Math.max(0, c.maxAttempts - attempts) };
}
