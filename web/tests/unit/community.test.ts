import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { localizeMessage, localizeState, MESSAGES } from "../../src/app/actions/community-messages";
import {
  agoParts,
  dayMonth,
  fill,
  formatAgo,
  forumQuery,
  isUnanswered,
  matchThread,
  monthYearLabel,
  nearSlugs,
  parseForumFilters,
  parseRoleFilter,
  placeShort,
  plural,
  societyBadge,
  societySlug,
  threadStatusKind,
  venueShort,
} from "../../src/components/community/logic";
import { communityStrings } from "../../src/lib/i18n/areas/community";
import { getLocality } from "../../src/lib/localities";
import { questionSchema, rwaRegistrationSchema, volunteerApplicationSchema } from "../../src/lib/validation";
import { parseForm } from "../../src/lib/action-state";

const en = communityStrings("en");
const hi = communityStrings("hi");

describe("community strings", () => {
  it("has every English key in Hindi, and Hindi that isn't English", () => {
    const walk = (a: unknown, b: unknown, path: string) => {
      if (typeof a === "string") {
        assert.equal(typeof b, "string", `${path} missing in Hindi`);
        return;
      }
      if (Array.isArray(a)) {
        assert.ok(Array.isArray(b) && b.length === a.length, `${path} length`);
        a.forEach((x, i) => walk(x, (b as unknown[])[i], `${path}[${i}]`));
        return;
      }
      for (const k of Object.keys(a as object)) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
    };
    walk({ ...en, volunteer: { ...en.volunteer, roleText: {} } }, { ...hi, volunteer: { ...hi.volunteer, roleText: {} } }, "community");
    assert.notEqual(hi.forum.intro, en.forum.intro);
    assert.match(hi.thread.urgentTitle, /[ऀ-ॿ]/);
  });

  it("keeps the prototype's English word for word", () => {
    assert.equal(en.forum.houseRules, "Share experiences, not diagnoses. No phone numbers, prescriptions or reports. No naming-and-shaming; use “Report” for concerns. Disclose if you work for a provider.");
    assert.equal(en.rwa.title, "Help your society look after its health, together.");
    assert.equal(en.volunteer.doneBody, "Role: {role}. We'll invite you to a 20-minute call and the next online orientation (Saturdays, 11 am). Ref {ref}.");
  });
});

describe("forum filters", () => {
  it("reads topic, locality and sort, ignoring unknown values", () => {
    assert.deepEqual(parseForumFilters({ topic: "diagnostics", locality: "sohna-road", sort: "helpful" }), { topic: "diagnostics", locality: "sohna-road", sort: "helpful" });
    assert.deepEqual(parseForumFilters({ topic: "nope", locality: "atlantis", sort: "random" }), { topic: null, locality: null, sort: "recent" });
    assert.deepEqual(parseForumFilters({ topic: ["senior-care", "x"] }), { topic: "senior-care", locality: null, sort: "recent" });
  });

  it("builds a query without the defaults", () => {
    assert.deepEqual(forumQuery({ topic: null, locality: null, sort: "recent" }), {});
    assert.deepEqual(forumQuery({ topic: "diagnostics", locality: null, sort: "unanswered" }), { topic: "diagnostics", sort: "unanswered" });
  });

  it("classifies thread statuses as the prototype shows them", () => {
    assert.deepEqual(threadStatusKind({ status: "resolved", statusLabel: "Resolved" }), { kind: "resolved", who: null });
    assert.deepEqual(threadStatusKind({ status: "open", statusLabel: "Pharmacist answered" }), { kind: "answered", who: "Pharmacist" });
    assert.equal(threadStatusKind({ status: "open", statusLabel: "Unanswered" }).kind, "unanswered");
    assert.equal(isUnanswered({ status: "open", statusLabel: "Open" }), true);
    assert.equal(isUnanswered({ status: "open", statusLabel: "Hospital answered" }), false);
    assert.equal(isUnanswered({ status: "resolved", statusLabel: "Resolved" }), false);
  });

  it("reads the volunteer role filter", () => {
    assert.equal(parseRoleFilter({ for: "student" }), "student");
    assert.equal(parseRoleFilter({ for: "everyone" }), null);
  });
});

describe("time and counts", () => {
  const now = "2026-10-16T05:30:00.000Z";
  it("says how long ago, like the prototype", () => {
    assert.deepEqual(agoParts("2026-10-16T04:50:00.000Z", now), { unit: "min", n: 40 });
    assert.deepEqual(agoParts("2026-10-16T00:30:00.000Z", now), { unit: "hour", n: 5 });
    assert.deepEqual(agoParts("2026-10-13T05:30:00.000Z", now), { unit: "day", n: 3 });
    assert.equal(agoParts("2026-07-01T05:30:00.000Z", now).unit, "date");
    assert.equal(formatAgo(en.ago, "2026-10-15T05:30:00.000Z", now, () => "x"), "1 day ago");
    assert.equal(formatAgo(hi.ago, "2026-10-13T05:30:00.000Z", now, () => "x"), "3 दिन पहले");
    assert.equal(formatAgo(en.ago, "2026-07-01T05:30:00.000Z", now, () => "1 Jul 2026"), "1 Jul 2026");
  });

  it("uses singular and plural", () => {
    assert.equal(plural(1, en.forum.reply, en.forum.replies), "1 reply");
    assert.equal(plural(6, en.forum.reply, en.forum.replies), "6 replies");
    assert.equal(fill(en.status.answered, { who: "Pharmacist" }), "Pharmacist answered");
  });

  it("formats dates in India time", () => {
    assert.equal(dayMonth("en", "2026-11-15T03:30:00.000Z"), "15 Nov");
    assert.equal(monthYearLabel("en", "2026-09-06T05:30:00.000Z"), "Sep 2026");
    assert.match(dayMonth("hi", "2026-11-15T03:30:00.000Z"), /15 नवंबर/);
  });
});

describe("verified listings that match a thread", () => {
  const doc = (kind: string, localitySlug: string | null, extra: Partial<{ open24h: boolean; homeCollection: boolean; lastCheckedAt: string | null }> = {}) => ({
    kind: kind as "pharmacy",
    localitySlug,
    open24h: false,
    homeCollection: false,
    lastCheckedAt: "2026-10-12T00:00:00.000Z",
    ...extra,
  });

  it("counts checked 24-hour chemists in the locality and its two nearest neighbours", () => {
    assert.deepEqual(nearSlugs("golf-course-ext-road"), ["golf-course-ext-road", "sector-56", "sohna-road"]);
    const docs = [
      doc("pharmacy", "sector-56", { open24h: true }),
      doc("pharmacy", "sohna-road", { open24h: true }),
      doc("pharmacy", "sohna-road"),
      doc("pharmacy", "palam-vihar", { open24h: true }),
      doc("pharmacy", "sector-56", { open24h: true, lastCheckedAt: null }),
    ];
    const m = matchThread("pharmacy-after-hours", "golf-course-ext-road", docs);
    assert.equal(m?.count, 2);
    assert.equal(m?.kind, "pharmacy_24h");
    assert.deepEqual(m?.search, { type: "pharmacy", q: "24 hours" });
  });

  it("matches labs with home collection for diagnostics, and nothing for other topics", () => {
    const docs = [doc("lab", "sohna-road", { homeCollection: true }), doc("lab", "sohna-road")];
    assert.equal(matchThread("diagnostics", "sohna-road", docs)?.count, 1);
    assert.equal(matchThread("senior-care", "sohna-road", docs), null);
    assert.equal(matchThread("pharmacy-after-hours", "sohna-road", docs), null);
    assert.equal(matchThread("diagnostics", null, docs), null);
  });

  it("names GCER the way residents do", () => {
    assert.equal(placeShort(getLocality("golf-course-ext-road")!), "GCER");
    assert.equal(placeShort(getLocality("sohna-road")!), "Sohna Road");
  });
});

describe("societies", () => {
  it("makes slugs and badges from names", () => {
    assert.equal(societySlug("Sector 57 Residents' Welfare Association"), "sector-57-residents-welfare-association");
    assert.equal(societySlug("  Palm Grove Apartments, Phase 2 "), "palm-grove-apartments-phase-2");
    assert.match(societySlug("ॐ"), /^society-/);
    assert.equal(societyBadge("Sector 57 RWA"), "57");
    assert.equal(societyBadge("Palm Grove Apartments"), "PG");
    assert.equal(venueShort("Sector 57 Community Centre, near the main market (ground floor, step-free)"), "Sector 57 Community Centre");
    assert.equal(venueShort(null), null);
  });
});

describe("form validation the community actions rely on", () => {
  it("refuses medical-advice questions and short titles, with the prototype's words", () => {
    const short = parseForm(questionSchema, { title: "Chemist?", topic: "diagnostics", locality: "sohna-road" });
    assert.equal(short.ok, false);
    if (!short.ok && short.state.status === "error") assert.equal(short.state.fieldErrors?.title?.[0], "Please write your question in a full sentence.");
    const advice = parseForm(questionSchema, { title: "What dose of paracetamol should I take for fever?", topic: "pharmacy-after-hours", locality: "sohna-road" });
    assert.equal(advice.ok, false);
    if (!advice.ok && advice.state.status === "error") assert.equal(advice.state.fieldErrors?.title?.[0], "Please rephrase so you’re not asking for medical advice.");
    const good = parseForm(questionSchema, { title: "Which labs on Sohna Road do home collection on Sundays?", topic: "diagnostics", locality: "sohna-road", anonymous: "on" });
    assert.equal(good.ok, true);
  });

  it("needs the society name, locality, contact and the authorised tick", () => {
    const r = parseForm(rwaRegistrationSchema, { name: "", locality: "", contact: "", groupType: "registered_rwa", channel: "whatsapp" });
    assert.equal(r.ok, false);
    if (!r.ok && r.state.status === "error") {
      assert.equal(r.state.fieldErrors?.name?.[0], "Please fill in the society name, locality and contact.");
      assert.equal(r.state.fieldErrors?.consent?.[0], "Please confirm you’re authorised.");
    }
  });

  it("parses repeated availability chips", () => {
    const r = parseForm(volunteerApplicationSchema, { role: "community-moderator", name: "Asha", locality: "Sector 56", availability: ["Weekends", "Online only"], consent: "on" });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.data.availability, ["Weekends", "Online only"]);
  });
});

describe("action messages", () => {
  it("has Hindi for every message and every schema message the forms show", () => {
    for (const [k, v] of Object.entries(MESSAGES)) assert.match(v.hi, /[ऀ-ॿ]/, k);
    assert.equal(localizeMessage("Please add your name and locality.", "hi"), "कृपया अपना नाम और इलाका लिखें।");
    assert.equal(localizeMessage("Please keep this under 200 characters.", "hi"), "कृपया इसे 200 अक्षरों से कम रखें।");
    assert.equal(localizeMessage("Please add your name and locality.", "en"), "Please add your name and locality.");
  });

  it("translates a failed parse's summary and field errors", () => {
    const s = localizeState({ status: "error", code: "invalid_input", message: "Choose a topic.", fieldErrors: { topic: ["Choose a topic."] } }, "hi");
    assert.equal(s.status === "error" && s.message, "विषय चुनें।");
    assert.deepEqual(s.status === "error" && s.fieldErrors?.topic, ["विषय चुनें।"]);
  });
});
