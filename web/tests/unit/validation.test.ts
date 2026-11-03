import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formDataToObject, parseForm } from "../../src/lib/action-state";
import {
  answerSchema,
  claimDetailsSchema,
  codeMismatchMessage,
  deleteAccountSchema,
  emailChangeSchema,
  messageChannelSchema,
  undoStopAllSchema,
  welcomeChoicesSchema,
  disputeSchema,
  eventSubmissionSchema,
  factReportSchema,
  isValidEventDate,
  isValidVisitMonth,
  otpRequestSchema,
  otpVerifySchema,
  parseLinks,
  questionSchema,
  reviewAnswers,
  reviewSchema,
  rwaRegistrationSchema,
  setConsentSchema,
  setFollowAlertSchema,
  toggleSavedSchema,
  volunteerApplicationSchema,
  weeklyReportSignupSchema,
} from "../../src/lib/validation";

const NOW = new Date("2026-10-16T05:30:00Z");

function fd(entries: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
}

function errorsOf(result: ReturnType<typeof parseForm>): Record<string, string[] | undefined> {
  assert.equal(result.ok, false);
  const state = !result.ok ? result.state : null;
  return state && state.status === "error" ? (state.fieldErrors ?? {}) : {};
}

describe("form data", () => {
  it("turns repeated fields into arrays and drops Next's action keys", () => {
    const obj = formDataToObject(fd({ availability: ["Weekdays", "Weekends"], name: "Meena", $ACTION_ID_abc: "" }));
    assert.deepEqual(obj, { availability: ["Weekdays", "Weekends"], name: "Meena" });
  });
});

describe("sign-in", () => {
  it("normalises the phone and rejects non-mobiles", () => {
    const ok = parseForm(otpRequestSchema, fd({ phone: "98765 43210", lang: "hi" }));
    assert.ok(ok.ok);
    assert.equal(ok.ok && ok.data.phone, "+919876543210");
    assert.equal(ok.ok && ok.data.lang, "hi");
    assert.equal(ok.ok && ok.data.via, "sms");
    assert.ok(errorsOf(parseForm(otpRequestSchema, fd({ phone: "12345" }))).phone);
    const viaWhatsApp = parseForm(otpRequestSchema, fd({ phone: "+91 98765 43210", via: "whatsapp", resend: "1" }));
    assert.ok(viaWhatsApp.ok && viaWhatsApp.data.via === "whatsapp" && viaWhatsApp.data.resend);
  });

  it("explains what's wrong with a number in the prototype's words", () => {
    assert.deepEqual(errorsOf(parseForm(otpRequestSchema, fd({ phone: "" }))).phone, ["Please enter your mobile number."]);
    assert.deepEqual(errorsOf(parseForm(otpRequestSchema, fd({ phone: "5876543210" }))).phone, [
      "This doesn’t look like an Indian mobile number. It should start with 6, 7, 8 or 9.",
    ]);
    assert.deepEqual(errorsOf(parseForm(otpRequestSchema, fd({ phone: "98765 432" }))).phone, ["Please enter all 10 digits. You’ve typed 8."]);
    assert.ok(parseForm(otpRequestSchema, fd({ phone: "098765 43210" })).ok);
  });

  it("counts down tries in the prototype's words", () => {
    assert.equal(codeMismatchMessage(2), "That code doesn’t match. Check the latest message and try again. 2 tries left.");
    assert.equal(codeMismatchMessage(1), "That code doesn’t match. Check the latest message and try again. 1 try left.");
    assert.equal(codeMismatchMessage(0), "That code didn’t match 3 times, so it has stopped working. Ask for a new code below.");
    assert.deepEqual(errorsOf(parseForm(otpVerifySchema, fd({ code: "123" }))).code, ["Please enter all 6 digits of the code."]);
  });

  it("asks for a locality only when locality alerts are ticked", () => {
    assert.ok(parseForm(welcomeChoicesSchema, fd({ messageLang: "hi", weekly: "on" })).ok);
    assert.deepEqual(errorsOf(parseForm(welcomeChoicesSchema, fd({ local: "on" }))).locality, ["Choose the locality you’d like alerts for."]);
    const both = parseForm(welcomeChoicesSchema, fd({ local: "on", locality: "sohna-road" }));
    assert.ok(both.ok && both.data.local && both.data.messageLang === "en");
  });

  it("accepts a code typed with spaces, and only 6 digits", () => {
    const ok = parseForm(otpVerifySchema, fd({ code: "123 456" }));
    assert.equal(ok.ok && ok.data.code, "123456");
    const dashed = parseForm(otpVerifySchema, fd({ code: "123-456" }));
    assert.equal(dashed.ok && dashed.data.code, "123456");
    assert.ok(errorsOf(parseForm(otpVerifySchema, fd({ code: "12345a" }))).code);
  });

  it("keeps only same-site paths for next", () => {
    const evil = parseForm(otpVerifySchema, fd({ code: "123456", next: "//evil.example" }));
    assert.equal(evil.ok && evil.data.next, undefined);
    const good = parseForm(otpVerifySchema, fd({ code: "123456", next: "/gurgaon/doctor/dr-ananya-rao" }));
    assert.equal(good.ok && good.data.next, "/gurgaon/doctor/dr-ananya-rao");
  });
});

describe("reviews", () => {
  const valid = {
    providerKind: "doctor",
    providerSlug: "dr-ananya-rao",
    visitMonth: "October 2026",
    visitType: "Routine check-up / vaccination",
    explained: "Yes",
    waiting: "15–45 min",
    text: "Explained the vaccination schedule clearly and didn't rush us at all.",
    noConflict: "on",
  };

  it("accepts a complete review", () => {
    const r = parseForm(reviewSchema, fd(valid));
    assert.ok(r.ok);
    assert.deepEqual(r.ok && reviewAnswers(r.data), { explained: "Yes", waiting: "15–45 min" });
  });

  it("needs 40 characters, the conflict declaration and a real visit month", () => {
    assert.ok(errorsOf(parseForm(reviewSchema, fd({ ...valid, text: "Too short." }))).text);
    const noTick = { ...valid } as Record<string, string>;
    delete noTick.noConflict;
    assert.deepEqual(errorsOf(parseForm(reviewSchema, fd(noTick))).noConflict, ["Please confirm you have no conflict of interest."]);
    assert.ok(errorsOf(parseForm(reviewSchema, fd({ ...valid, providerKind: "spaceship" }))).providerKind);
  });

  it("rejects future visit months", () => {
    assert.equal(isValidVisitMonth("October 2026", NOW), true);
    assert.equal(isValidVisitMonth("Earlier in 2026", NOW), true);
    assert.equal(isValidVisitMonth("November 2026", NOW), false);
    assert.equal(isValidVisitMonth("Octember 2026", NOW), false);
  });
});

describe("reports and disputes", () => {
  it("needs the item, the field and what's correct", () => {
    assert.ok(parseForm(factReportSchema, fd({ item: "Sai Medicos, Sector 56", field: "timings", details: "Called them on 15 Oct; they close at 10 pm" })).ok);
    const errs = errorsOf(parseForm(factReportSchema, fd({ item: "", field: "colour", details: "no" })));
    assert.ok(errs.item && errs.field && errs.details);
    assert.ok(errorsOf(parseForm(factReportSchema, fd({ item: "X clinic", field: "fee", details: "Fee is now 900", email: "not-an-email" }))).email);
  });

  it("needs a connection from someone else and 30 characters of detail", () => {
    const base = { kind: "ranking", role: "resident", itemId: "entry1", reason: "fake", details: "A burst of praise from brand-new accounts in one week.", declare: "on" };
    assert.ok(parseForm(disputeSchema, fd(base)).ok);
    assert.deepEqual(errorsOf(parseForm(disputeSchema, fd({ ...base, role: "other" }))).connection, ["Tell us your connection to this provider."]);
    assert.ok(errorsOf(parseForm(disputeSchema, fd({ ...base, details: "Too short" }))).details);
    assert.ok(errorsOf(parseForm(disputeSchema, fd({ ...base, kind: "review" }))).kind);
    assert.deepEqual(parseLinks("https://a.example/x, ftp://no", "http://b.example/y https://a.example/x"), ["https://a.example/x", "http://b.example/y"]);
  });
});

describe("events", () => {
  const valid = {
    template: "Health check-up camp",
    title: "Free eye check-up camp",
    date: "2026-11-15",
    time: "09:00",
    venue: "Community Centre",
    locality: "Sector 57",
    cost: "Free",
    orgType: "rwa",
    org: "Sector 57 RWA",
    contact: "R. Kapoor",
    phone: "9000000006",
    consent1: "on",
    consent2: "on",
    consent3: "on",
  };

  it("accepts a complete submission and keeps the phone normalised", () => {
    const r = parseForm(eventSubmissionSchema, fd(valid));
    assert.ok(r.ok);
    assert.equal(r.ok && r.data.phone, "+919000000006");
  });

  it("rejects past dates, bad times and missing consents", () => {
    assert.equal(isValidEventDate("2026-10-15", NOW), false);
    assert.equal(isValidEventDate("2026-10-16", NOW), true);
    assert.equal(isValidEventDate("2026-02-30", NOW), false);
    assert.equal(isValidEventDate("2028-01-01", NOW), false);
    const errs = errorsOf(parseForm(eventSubmissionSchema, fd({ ...valid, time: "25:00", consent3: "" })));
    assert.ok(errs.time);
    assert.deepEqual(errs.consent3, ["Please confirm all three to submit."]);
  });
});

describe("community, RWA and volunteers", () => {
  it("blocks medical-advice questions", () => {
    const base = { title: "Which labs do home collection on Sundays in Sector 49?", topic: "diagnostics", locality: "sohna-road", anonymous: "on" };
    assert.ok(parseForm(questionSchema, fd(base)).ok);
    assert.deepEqual(errorsOf(parseForm(questionSchema, fd({ ...base, title: "What dose of paracetamol should I take?" }))).title, [
      "Please rephrase so you’re not asking for medical advice.",
    ]);
    assert.ok(errorsOf(parseForm(questionSchema, fd({ ...base, title: "Chemist?" }))).title);
  });

  it("needs a non-empty reply", () => {
    assert.ok(errorsOf(parseForm(answerSchema, fd({ threadId: "gcer-24h-chemist", body: " " }))).body);
  });

  it("needs the society details and authorisation", () => {
    const r = parseForm(rwaRegistrationSchema, fd({ name: "Sector 57 RWA", locality: "Sector 57", contact: "R. Kapoor", groupType: "registered_rwa", channel: "whatsapp" }));
    assert.deepEqual(errorsOf(r).consent, ["Please confirm you’re authorised."]);
  });

  it("reads availability checkboxes as a list", () => {
    const r = parseForm(volunteerApplicationSchema, fd({ role: "community-moderator", name: "Meena", locality: "Sector 56", availability: ["Weekends", "Online only"], consent: "on" }));
    assert.deepEqual(r.ok && r.data.availability, ["Weekends", "Online only"]);
    assert.ok(errorsOf(parseForm(volunteerApplicationSchema, fd({ role: "community-moderator", name: "Meena", locality: "Sector 56", availability: "Sometimes", consent: "on" }))).availability);
  });

  it("needs a registration number for professional claims", () => {
    assert.ok(errorsOf(parseForm(claimDetailsSchema, fd({ providerSlug: "dr-vikram-sethi", role: "doctor", registrationNumber: "12" }))).registrationNumber);
  });
});

describe("consent, saved and account", () => {
  it("reads grant/withdraw and checkboxes", () => {
    const grant = parseForm(setConsentSchema, fd({ purpose: "weekly_report", channel: "whatsapp", granted: "grant" }));
    assert.equal(grant.ok && grant.data.granted, true);
    const on = parseForm(setConsentSchema, fd({ purpose: "saved_changes", granted: "on", from: "saved", channel: "" }));
    assert.ok(on.ok && on.data.granted && on.data.from === "saved" && on.data.channel === undefined);
    const withdraw = parseForm(setConsentSchema, fd({ purpose: "weekly_report", channel: "whatsapp", granted: "withdraw" }));
    assert.equal(withdraw.ok && withdraw.data.granted, false);
    assert.ok(errorsOf(parseForm(setConsentSchema, fd({ purpose: "spam", channel: "whatsapp" }))).purpose);
  });

  it("needs the consent box for the WhatsApp report", () => {
    assert.deepEqual(errorsOf(parseForm(weeklyReportSignupSchema, fd({ phone: "9876543210" }))).consent, ["Please tick the consent box so we can message you."]);
    const fromNews = parseForm(weeklyReportSignupSchema, fd({ phone: "9876543210", consent: "on", from: "news" }));
    assert.equal(fromNews.ok && fromNews.data.from, "news");
    const fromElsewhere = parseForm(weeklyReportSignupSchema, fd({ phone: "9876543210", consent: "on", from: "somewhere" }));
    assert.equal(fromElsewhere.ok && fromElsewhere.data.from, "homepage");
  });

  it("only accepts known kinds and safe ids", () => {
    assert.ok(parseForm(toggleSavedSchema, fd({ kind: "provider", targetId: "dr-ananya-rao" })).ok);
    assert.ok(errorsOf(parseForm(toggleSavedSchema, fd({ kind: "provider", targetId: "../etc/passwd" }))).targetId);
    assert.ok(errorsOf(parseForm(toggleSavedSchema, fd({ kind: "user", targetId: "x" }))).kind);
    assert.ok(errorsOf(parseForm(setFollowAlertSchema, fd({ kind: "locality", targetId: "sohna-road", alert: "pigeon" }))).alert);
  });

  it("lets an account be deleted, choosing what happens to a published review", () => {
    assert.ok(parseForm(deleteAccountSchema, fd({})).ok);
    const keep = parseForm(deleteAccountSchema, fd({ publishedReviews: "keep" }));
    assert.equal(keep.ok && keep.data.publishedReviews, "keep");
    assert.ok(errorsOf(parseForm(deleteAccountSchema, fd({ publishedReviews: "maybe" }))).publishedReviews);
  });

  it("checks email addresses, channels and undo lists", () => {
    const email = parseForm(emailChangeSchema, fd({ email: "  Anu@Example.com " }));
    assert.equal(email.ok && email.data.email, "anu@example.com");
    assert.deepEqual(errorsOf(parseForm(emailChangeSchema, fd({ email: "anu@" }))).email, ["Please check the email address. It should look like name@example.com."]);
    assert.ok(errorsOf(parseForm(messageChannelSchema, fd({ purpose: "weekly_report", channel: "sms" }))).channel);
    const undo = parseForm(undoStopAllSchema, fd({ purposes: ["weekly_report", "locality_updates"] }));
    assert.deepEqual(undo.ok && undo.data.purposes, ["weekly_report", "locality_updates"]);
    assert.ok(!parseForm(undoStopAllSchema, fd({ purposes: ["spam"] })).ok);
  });
});
