import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkIssueAllowed,
  evaluateOtpAttempt,
  generateOtpCode,
  hashIp,
  hashOtp,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  otpHashMatches,
  type ChallengeRecord,
} from "../../src/lib/auth/otp";
import { getOtpSender, OtpConfigError, otpMessageText, shouldRevealDevCode } from "../../src/lib/auth/otp-sender";
import { maskPhone, normalizeIndianMobile, parsePhoneList } from "../../src/lib/auth/phone";
import { can, canOpenQueue } from "../../src/lib/auth/permissions";

const SECRET = "test-secret-with-enough-length-1234567890";
const NOW = new Date("2026-10-16T05:30:00Z");
const PHONE = "+919876543210";

function challenge(code: string, over: Partial<ChallengeRecord> = {}): ChallengeRecord {
  const id = over.id ?? "chal_1";
  return {
    id,
    phone: PHONE,
    codeHash: hashOtp(SECRET, { challengeId: id, phone: PHONE, code }),
    expiresAt: new Date(NOW.getTime() + OTP_TTL_MS),
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    consumedAt: null,
    ...over,
  };
}

describe("codes and hashes", () => {
  it("generates 6-digit codes", () => {
    for (let i = 0; i < 200; i++) assert.match(generateOtpCode(), /^\d{6}$/);
  });

  it("never stores the code itself", () => {
    const code = "123456";
    const hash = hashOtp(SECRET, { challengeId: "a", phone: PHONE, code });
    assert.notEqual(hash, code);
    assert.ok(!hash.includes(code));
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it("binds the hash to the challenge, the phone and the secret", () => {
    const code = "123456";
    const base = hashOtp(SECRET, { challengeId: "a", phone: PHONE, code });
    assert.notEqual(base, hashOtp(SECRET, { challengeId: "b", phone: PHONE, code }));
    assert.notEqual(base, hashOtp(SECRET, { challengeId: "a", phone: "+919999999999", code }));
    assert.notEqual(base, hashOtp("another-secret-of-decent-length-000000", { challengeId: "a", phone: PHONE, code }));
    assert.equal(otpHashMatches(SECRET, { challengeId: "a", phone: PHONE, code }, base), true);
    assert.equal(otpHashMatches(SECRET, { challengeId: "a", phone: PHONE, code: "123457" }, base), false);
  });

  it("hashes IP addresses for rate limits", () => {
    assert.notEqual(hashIp(SECRET, "203.0.113.7"), "203.0.113.7");
    assert.equal(hashIp(SECRET, "203.0.113.7"), hashIp(SECRET, "203.0.113.7"));
  });
});

describe("checking a code", () => {
  it("accepts the right code and counts the attempt", () => {
    assert.deepEqual(evaluateOtpAttempt(challenge("424242"), "424242", NOW, SECRET), { ok: true, attempts: 1 });
  });

  it("rejects a wrong code and says how many attempts are left", () => {
    const r = evaluateOtpAttempt(challenge("424242"), "000000", NOW, SECRET);
    assert.deepEqual(r, { ok: false, reason: "mismatch", attempts: 1, attemptsLeft: OTP_MAX_ATTEMPTS - 1 });
  });

  it("expires after 10 minutes", () => {
    const later = new Date(NOW.getTime() + OTP_TTL_MS);
    assert.equal(evaluateOtpAttempt(challenge("424242"), "424242", later, SECRET).ok, false);
    const r = evaluateOtpAttempt(challenge("424242"), "424242", later, SECRET);
    assert.equal(!r.ok && r.reason, "expired");
    assert.equal(evaluateOtpAttempt(challenge("424242"), "424242", new Date(later.getTime() - 1000), SECRET).ok, true);
  });

  it("locks after 3 attempts (\"didn’t match 3 times\"), even for the right code", () => {
    assert.equal(OTP_MAX_ATTEMPTS, 3);
    let c = challenge("424242");
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      const r = evaluateOtpAttempt(c, "111111", NOW, SECRET);
      assert.equal(r.ok, false);
      c = { ...c, attempts: r.attempts };
    }
    const r = evaluateOtpAttempt(c, "424242", NOW, SECRET);
    assert.equal(!r.ok && r.reason, "locked");
  });

  it("can't be used twice", () => {
    const r = evaluateOtpAttempt(challenge("424242", { consumedAt: NOW }), "424242", NOW, SECRET);
    assert.equal(!r.ok && r.reason, "consumed");
  });

  it("doesn't count malformed input as an attempt", () => {
    const r = evaluateOtpAttempt(challenge("424242"), "4242", NOW, SECRET);
    assert.deepEqual(r, { ok: false, reason: "malformed", attempts: 0, attemptsLeft: OTP_MAX_ATTEMPTS });
  });
});

describe("sending limits", () => {
  const sec = (s: number) => new Date(NOW.getTime() - s * 1000);

  it("allows the first code", () => {
    assert.deepEqual(checkIssueAllowed({ now: NOW, phoneSends: [] }), { ok: true });
  });

  it("waits 30 seconds between codes", () => {
    assert.deepEqual(checkIssueAllowed({ now: NOW, phoneSends: [sec(10)] }), { ok: false, reason: "cooldown", retryAfterSeconds: 20 });
    assert.deepEqual(checkIssueAllowed({ now: NOW, phoneSends: [sec(31)] }), { ok: true });
  });

  it("allows at most 5 codes per phone per hour", () => {
    const five = [sec(3000), sec(2400), sec(1800), sec(1200), sec(600)];
    const r = checkIssueAllowed({ now: NOW, phoneSends: five });
    assert.equal(!r.ok && r.reason, "phone_hourly_limit");
    assert.equal(!r.ok && r.retryAfterSeconds, 600);
    assert.deepEqual(checkIssueAllowed({ now: NOW, phoneSends: [sec(4000), ...five.slice(1)] }), { ok: true });
  });

  it("limits sends per network", () => {
    const ipSends = Array.from({ length: 20 }, (_, i) => sec(100 + i * 60));
    const r = checkIssueAllowed({ now: NOW, phoneSends: [], ipSends });
    assert.equal(!r.ok && r.reason, "ip_hourly_limit");
  });
});

describe("senders", () => {
  it("uses the dev sender in development and shows the code only there", () => {
    assert.equal(getOtpSender({ OTP_PROVIDER: "dev", NODE_ENV: "development" }).name, "dev");
    assert.equal(shouldRevealDevCode({ OTP_PROVIDER: "dev", NODE_ENV: "development" }), true);
    assert.equal(shouldRevealDevCode({ OTP_PROVIDER: "dev", NODE_ENV: "production" }), false);
    assert.equal(shouldRevealDevCode({ OTP_PROVIDER: "msg91", NODE_ENV: "development" }), false);
  });

  it("refuses the dev sender in production and unknown providers", () => {
    assert.throws(() => getOtpSender({ OTP_PROVIDER: "dev", NODE_ENV: "production" }), OtpConfigError);
    assert.equal(getOtpSender({ OTP_PROVIDER: "dev", NODE_ENV: "production", OTP_DEV_ALLOW_IN_PRODUCTION: "1" }).name, "dev");
    assert.throws(() => getOtpSender({ OTP_PROVIDER: "carrier-pigeon" }), OtpConfigError);
  });

  it("writes the message in English or Hindi", () => {
    assert.match(otpMessageText({ code: "123456", lang: "en" }), /^123456 is your HealthGurgaon sign-in code/);
    assert.match(otpMessageText({ code: "123456", lang: "hi" }), /^123456 आपका HealthGurgaon/);
    // A claim code goes to a clinic's number and must not read like a sign-in code.
    assert.doesNotMatch(otpMessageText({ code: "123456", lang: "en", purpose: "claim" }), /sign-in/);
    assert.match(otpMessageText({ code: "123456", lang: "en", purpose: "claim" }), /^123456 is the code to confirm a claim/);
    assert.doesNotMatch(otpMessageText({ code: "123456", lang: "hi", purpose: "claim" }), /साइन-इन/);
  });
});

describe("phones and roles", () => {
  it("normalises Indian mobiles and masks them", () => {
    assert.equal(normalizeIndianMobile("098765 43210"), PHONE);
    assert.equal(normalizeIndianMobile("+91-98765-43210"), PHONE);
    assert.equal(normalizeIndianMobile("5876543210"), null);
    assert.equal(normalizeIndianMobile("+1 415 555 0100"), null);
    assert.equal(maskPhone(PHONE), "+91 98XXX XX210");
    assert.deepEqual(parsePhoneList("+91 90000 00001, 9000000002;bad"), ["+919000000001", "+919000000002"]);
  });

  it("follows the plan's permission table", () => {
    assert.equal(can(null, "report_incorrect_info"), false);
    assert.equal(can("resident", "ask_answer_community"), true);
    assert.equal(can("moderator", "approve_events_reviews"), true);
    assert.equal(can("moderator", "edit_credentials_verification"), false);
    assert.equal(can("provider", "edit_own_provider_profile"), false);
    assert.equal(can("provider", "edit_own_provider_profile", { own: true }), true);
    assert.equal(can("editor", "manage_roles_audit"), false);
    assert.equal(can("admin", "manage_roles_audit"), true);
    assert.equal(canOpenQueue("moderator", "claims"), false);
    assert.equal(canOpenQueue("editor", "claims"), true);
  });
});
