import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AlertPref,
  ArticleLabel,
  ConsentChannel,
  ConsentPurpose,
  DisputeReason,
  EventStatus,
  EventType,
  FollowKind,
  Ownership,
  ProviderKind,
  Role,
  SavedKind,
} from "@prisma/client";

import { ROLES } from "../../src/lib/auth/permissions";
import { CONSENT_PURPOSE_INFO, consentWording, purposeLabel } from "../../src/lib/consent-text";
import {
  ALERT_PREFS,
  ARTICLE_LABELS,
  CONSENT_CHANNELS,
  CONSENT_PURPOSES,
  DISPUTE_REASONS,
  EVENT_STATUS_LABELS,
  EVENT_TYPES,
  PUBLIC_EVENT_STATUSES,
  FOLLOW_KINDS,
  OWNERSHIPS,
  PROFILE_KIND_OF,
  PROVIDER_KINDS,
  SAVED_KINDS,
  visitMonthOptions,
} from "../../src/lib/domain";
import { addWorkingDays, dayTile, daysBetween, formatDateLabel, formatShortDay, formatStamp, formatTime, parseIst } from "../../src/lib/dates";
import { hoursTable, isOpenAt, openStatus, parseHoursText, weeklyHours } from "../../src/lib/hours";
import { LOCALITIES } from "../../src/lib/localities";
import { LOCALITY_EXTRAS } from "../../prisma/seed-data/localities";
import { defaultReviewLabel, reviewLabelOptions } from "../../src/lib/review-label";
import { maskEmail } from "../../src/lib/redact";

const same = (a: readonly string[], b: Record<string, string>) => assert.deepEqual([...a].sort(), Object.values(b).sort());

describe("vocabularies stay in sync with the Prisma schema", () => {
  it("matches every enum", () => {
    same(ROLES, Role);
    same(PROVIDER_KINDS, ProviderKind);
    same(OWNERSHIPS, Ownership);
    same(EVENT_TYPES, EventType);
    same(ARTICLE_LABELS, ArticleLabel);
    same(DISPUTE_REASONS, DisputeReason);
    same(SAVED_KINDS, SavedKind);
    same(FOLLOW_KINDS, FollowKind);
    same(ALERT_PREFS, AlertPref);
    same(CONSENT_PURPOSES, ConsentPurpose);
    same(CONSENT_CHANNELS, ConsentChannel);
  });

  it("maps every provider kind to a profile page", () => {
    for (const k of PROVIDER_KINDS) assert.ok(PROFILE_KIND_OF[k]);
  });

  it("words every message type, in the Account prototype's order", () => {
    assert.deepEqual(CONSENT_PURPOSE_INFO.map((c) => c.purpose), [...CONSENT_PURPOSES]);
    assert.deepEqual(CONSENT_PURPOSE_INFO.map((c) => c.label), [
      "Weekly Gurgaon Health Report",
      "Gurugram camps & public-health alerts",
      "Locality alerts",
      "Replies to my questions",
      "Changes to things I saved",
    ]);
    for (const c of CONSENT_PURPOSE_INFO) {
      assert.deepEqual([...c.channels], ["whatsapp", "email"], c.purpose);
      for (const ch of c.channels) assert.ok(consentWording(c.purpose, ch), `${c.purpose}/${ch}`);
      assert.equal(consentWording(c.purpose, "sms"), null, "SMS is only for sign-in codes");
    }
    assert.equal(purposeLabel("locality_updates", "Sohna Road"), "Locality alerts for Sohna Road");
    assert.match(consentWording("weekly_report", "whatsapp") ?? "", /Reply STOP to stop/);
  });

  it("keeps changes-requested events off public pages", () => {
    same([...PUBLIC_EVENT_STATUSES, "changes_requested", "rejected"], EventStatus);
    assert.equal(EVENT_STATUS_LABELS.changes_requested, "Changes requested");
  });

  it("offers review signatures without names", () => {
    assert.deepEqual(reviewLabelOptions({ reviewLabel: "Parent of a 2-year-old · Sector 57", area: "Sector 57" }), [
      "Parent of a 2-year-old · Sector 57",
      "Parent · Sector 57",
      "Resident · Gurugram",
    ]);
    assert.deepEqual(reviewLabelOptions({ area: "Sector 57" }), ["Resident · Sector 57", "Resident · Gurugram"]);
    assert.equal(defaultReviewLabel(null), "Resident · Gurugram");
    assert.equal(maskEmail("anu@example.com"), "a•••••@example.com");
  });

  it("seeds coverage for every locality", () => {
    assert.deepEqual(LOCALITY_EXTRAS.map((l) => l.slug).sort(), LOCALITIES.map((l) => l.slug).sort());
    for (const L of LOCALITIES) {
      const s = LOCALITY_EXTRAS.find((x) => x.slug === L.slug)!.stats;
      const total = s.doctors + s.careFacilities + s.pharmaciesLabs;
      assert.equal(L.live, total >= 20, `${L.slug}: live flag disagrees with ${total} verified listings`);
    }
  });
});

describe("dates in India time", () => {
  it("formats labels the way the prototype prints them", () => {
    const d = parseIst("2026-10-12");
    assert.equal(formatDateLabel(d), "12 OCT 2026");
    assert.deepEqual(dayTile(parseIst("2026-11-09 08:00")), { dow: "MON", day: "09", mon: "NOV", year: 2026 });
    assert.equal(daysBetween(parseIst("2026-10-12 23:30"), parseIst("2026-10-16 00:10")), 4);
  });

  it("counts working days and prints the account page's dates", () => {
    assert.equal(formatShortDay(addWorkingDays(parseIst("2026-10-26 18:25"), 3)), "Thu 29 Oct");
    assert.equal(formatShortDay(addWorkingDays(parseIst("2026-10-16 09:05"), 3)), "Wed 21 Oct");
    assert.equal(formatShortDay(addWorkingDays(parseIst("2026-10-06 22:40"), 3)), "Fri 9 Oct");
    assert.equal(formatShortDay(parseIst("2026-10-26"), { year: true }), "Mon 26 Oct 2026");
    assert.equal(formatStamp(parseIst("2026-10-14 11:02")), "14 OCT 2026, 11:02 AM");
    assert.equal(formatStamp(parseIst("2026-10-03 20:14")), "3 OCT 2026, 8:14 PM");
    assert.equal(formatTime(parseIst("2026-10-03 20:14")), "8:14 pm");
    assert.equal(formatTime(parseIst("2026-10-03 11:00")), "11 am");
  });

  it("offers recent visit months", () => {
    assert.deepEqual(visitMonthOptions(parseIst("2026-10-16")), ["October 2026", "September 2026", "August 2026", "Earlier in 2026"]);
    assert.deepEqual(visitMonthOptions(parseIst("2027-01-05")), ["January 2027", "December 2026", "November 2026", "Earlier in 2026"]);
  });
});

describe("opening hours", () => {
  it("parses the printed hours", () => {
    assert.deepEqual(parseHoursText("10 am – 1 pm, 5 – 8 pm"), [
      [600, 780],
      [1020, 1200],
    ]);
    assert.deepEqual(parseHoursText("7 am – 8 pm"), [[420, 1200]]);
    assert.deepEqual(parseHoursText("8 am – 11 pm"), [[480, 1380]]);
    assert.deepEqual(parseHoursText("Closed"), []);
    assert.deepEqual(parseHoursText("Open 24 hours"), [[0, 1440]]);
    assert.deepEqual(parseHoursText("6 – 9 pm"), [[1080, 1260]]);
    assert.deepEqual(parseHoursText("11 – 2 pm"), [[660, 840]]);
  });

  it("answers open now in India time and never assumes", () => {
    const hours = weeklyHours({ thu: "10 am – 1 pm" });
    assert.equal(isOpenAt(hours, false, parseIst("2026-10-15 10:30")), true); // Thursday
    assert.equal(isOpenAt(hours, false, parseIst("2026-10-15 13:00")), false);
    assert.equal(isOpenAt(hours, false, parseIst("2026-10-16 10:30")), false); // Friday
    assert.equal(isOpenAt(null, false, parseIst("2026-10-15 10:30")), null);
    assert.equal(isOpenAt(null, true, parseIst("2026-10-15 03:00")), true);
  });

  it("describes the next change", () => {
    const hours = weeklyHours({ mon: "7 am – 8 pm", tue: "7 am – 8 pm", wed: "7 am – 8 pm", thu: "7 am – 8 pm", fri: "7 am – 8 pm", sat: "7 am – 6 pm", sun: "7 am – 1 pm" });
    assert.deepEqual(openStatus(hours, false, parseIst("2026-10-15 15:00")), { state: "open", label: "Open now", detail: "Closes 8 pm today" });
    assert.equal(openStatus(hours, false, parseIst("2026-10-15 21:00")).detail, "Opens 7 am tomorrow");
    assert.equal(hoursTable(hours, parseIst("2026-10-15 15:00")).find((r) => r.today)?.day, "Thursday");
  });
});
