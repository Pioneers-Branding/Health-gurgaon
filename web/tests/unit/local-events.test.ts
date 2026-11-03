import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clockLabel,
  costLabel,
  eventSlug,
  eventsHref,
  fill,
  filterEvents,
  icsFile,
  isOnlineText,
  isRoadLocality,
  monthKey,
  monthsBetween,
  organiserTile,
  parseEventFilters,
  parseMonth,
  plural,
  shiftMonth,
  slugBase,
  timeLabelHi,
  timeText,
  whatsappHref,
} from "../../src/components/local-events/format";
import { coversText, dataText, localEventsStrings, mapShortName, sourceText } from "../../src/lib/i18n/areas/local-events";
import { LOCALITIES, searchLocalities } from "../../src/lib/localities";
import { EVENT_TEMPLATES } from "../../src/lib/domain";

const en = localEventsStrings("en");
const hi = localEventsStrings("hi");

describe("local events: counts and copy", () => {
  it("uses singular and plural correctly", () => {
    assert.equal(plural(1, en.index.short.eventsOne, en.index.short.eventsMany), "camp or event");
    assert.equal(plural(2, en.index.short.eventsOne, en.index.short.eventsMany), "camps & events");
    assert.equal(plural(0, en.index.short.eventsOne, en.index.short.eventsMany), "camps & events");
    assert.equal(plural(1, en.calendar.monthOne, en.calendar.monthMany), "1 event this month");
    assert.equal(plural(9, en.calendar.monthOne, en.calendar.monthMany), "9 events this month");
    assert.equal(fill(plural(2, en.calendar.dayTitleOne, en.calendar.dayTitleMany), { day: 15, month: "November" }), "2 events on 15 November");
    assert.equal(plural(1, en.index.followNoteOne, en.index.followNoteMany), "You follow 1 locality.");
    assert.equal(plural(3, en.index.followNoteOne, en.index.followNoteMany), "You follow 3 localities.");
    assert.equal(plural(1, en.locality.recommendedOne, en.locality.recommendedMany), "Recommended by 1 neighbour");
  });

  it("has the same shape and real Hindi in both languages", () => {
    const keys = (o: unknown, p = ""): string[] =>
      o && typeof o === "object" && !Array.isArray(o) ? Object.entries(o).flatMap(([k, v]) => keys(v, `${p}${k}.`)) : [p];
    assert.deepEqual(keys(hi).sort(), keys(en).sort());
    assert.equal(hi.templates.length, EVENT_TEMPLATES.length);
    assert.equal(hi.submit.consents.length, 3);
    assert.match(hi.index.intro, /[ऀ-ॿ]/);
    assert.notEqual(hi.calendar.sub, en.calendar.sub);
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    assert.equal(fill("{a} and {b}", { a: 1 }), "1 and {b}");
  });

  it("translates stored locality and source text", () => {
    assert.equal(coversText("en", "sohna-road", "x"), "x");
    assert.match(coversText("hi", "sohna-road", "x"), /सेक्टर 47–50/);
    assert.equal(dataText("hi", "Free"), "मुफ़्त");
    assert.equal(dataText("hi", "Unknown value"), "Unknown value");
    assert.equal(sourceText("hi", "Called organiser (RWA secretary) on 14 Oct 2026"), "14 अक्तूबर 2026 को आयोजक (RWA सचिव) को कॉल किया");
    assert.equal(sourceText("hi", "Resident submission · not yet confirmed"), "निवासी ने भेजा · अभी पुष्टि नहीं हुई");
    assert.equal(sourceText("en", "Called organiser on 12 Oct 2026"), "Called organiser on 12 Oct 2026");
    assert.equal(mapShortName("en", "golf-course-ext-road", "Golf Course\nExt. Road"), "Golf Course\nExt. Road");
    assert.equal(mapShortName("hi", "sohna-road", null), null);
  });

  it("knows road localities from areas", () => {
    assert.ok(isRoadLocality("Sohna Road"));
    assert.ok(isRoadLocality("Dwarka Expressway"));
    assert.ok(!isRoadLocality("Sector 56"));
    assert.ok(!isRoadLocality("DLF Phases 1–5"));
  });
});

describe("local events: calendar filters in the URL", () => {
  const accept = { types: ["health_camp", "screening"], localities: ["sohna-road", "sector-56"] };

  it("keeps known values and drops the rest", () => {
    assert.deepEqual(parseEventFilters({ type: "screening", locality: "online", free: "1", verified: "on", month: "2026-11", day: "15" }, accept), {
      type: "screening",
      locality: "online",
      free: true,
      verified: true,
      month: "2026-11",
      day: 15,
    });
    assert.deepEqual(parseEventFilters({ type: "party", locality: "mars", free: "yes", month: "2026-13", day: "40" }, accept), {
      type: null,
      locality: null,
      free: false,
      verified: false,
      month: null,
      day: null,
    });
    assert.equal(parseEventFilters({ type: ["screening", "health_camp"] }, accept).type, "screening");
  });

  it("builds links with every filter, in both languages", () => {
    assert.equal(eventsHref("en", { type: "screening", free: true, verified: true, month: "2026-11", day: 9, locality: null }), "/gurgaon/events?type=screening&free=1&verified=1&month=2026-11&day=9");
    assert.equal(eventsHref("hi", {}), "/hi/gurgaon/events");
  });

  it("filters by type, locality, online, free and verified", () => {
    const list = [
      { slug: "a", type: "screening", localitySlug: "sohna-road", isOnline: false, isFree: true, verified: false },
      { slug: "b", type: "talk", localitySlug: null, isOnline: true, isFree: true, verified: true },
      { slug: "c", type: "screening", localitySlug: "sector-56", isOnline: false, isFree: false, verified: true },
    ];
    const pick = (f: Partial<Parameters<typeof filterEvents>[1]>) => filterEvents(list, { type: null, locality: null, free: false, verified: false, ...f }).map((e) => e.slug);
    assert.deepEqual(pick({}), ["a", "b", "c"]);
    assert.deepEqual(pick({ type: "screening" }), ["a", "c"]);
    assert.deepEqual(pick({ locality: "online" }), ["b"]);
    assert.deepEqual(pick({ locality: "sohna-road" }), ["a"]);
    assert.deepEqual(pick({ free: true, verified: true }), ["b"]);
  });

  it("moves between months", () => {
    assert.deepEqual(parseMonth("2026-11"), { year: 2026, month: 11 });
    assert.equal(parseMonth("2026-1"), null);
    assert.deepEqual(shiftMonth({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
    assert.deepEqual(shiftMonth({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
    assert.equal(monthKey(2027, 3), "2027-03");
    assert.equal(monthsBetween({ year: 2026, month: 11 }, { year: 2027, month: 11 }), 12);
  });
});

describe("local events: submitting an event", () => {
  it("makes URL-safe slugs from titles and the reference", () => {
    assert.equal(slugBase("Free eye check-up camp!"), "free-eye-check-up-camp");
    assert.equal(slugBase("CPR & first-aid for residents"), "cpr-and-first-aid-for-residents");
    assert.equal(slugBase("मुफ़्त जाँच"), "");
    assert.ok(slugBase("a".repeat(30) + " " + "b".repeat(40)).length <= 60);
    assert.equal(eventSlug("Women’s health talk", "HG-EV-5191"), "women-s-health-talk-5191");
    assert.equal(eventSlug("मुफ़्त जाँच", "HG-EV-5192"), "event-5192");
    assert.match(eventSlug("Free eye check-up camp", "HG-EV-5193"), /^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("writes start times like the calendar", () => {
    assert.equal(clockLabel("09:00"), "9 am");
    assert.equal(clockLabel("09:30"), "9:30 am");
    assert.equal(clockLabel("12:00"), "12 pm");
    assert.equal(clockLabel("00:15"), "12:15 am");
    assert.equal(clockLabel("18:00"), "6 pm");
  });

  it("writes the cost", () => {
    assert.deepEqual(costLabel("Free", "200"), { cost: "Free", isFree: true });
    assert.deepEqual(costLabel("Paid", "200"), { cost: "₹200", isFree: false });
    assert.deepEqual(costLabel("Paid", "Rs. 450"), { cost: "₹450", isFree: false });
    assert.deepEqual(costLabel("Paid", "₹1,200"), { cost: "₹1,200", isFree: false });
    assert.deepEqual(costLabel("Paid", ""), { cost: "Paid", isFree: false });
  });

  it("spots online events", () => {
    assert.ok(isOnlineText("Online"));
    assert.ok(isOnlineText("Zoom call"));
    assert.ok(!isOnlineText("Sector 56"));
  });

  it("resolves typed localities the way residents write them", () => {
    assert.equal(searchLocalities("Sohna Rd").hits[0]?.locality.slug, "sohna-road");
    assert.equal(searchLocalities("Sec 57").hits[0]?.locality.slug, "sector-56");
    assert.equal(searchLocalities("GCER").hits[0]?.alias, "GCER");
    assert.equal(searchLocalities("Sector 65").hits[0]?.sector, 65);
    assert.equal(searchLocalities("Sector 5").hits.length, 0);
    assert.ok(searchLocalities("Sector 5").near.length > 0);
    assert.equal(LOCALITIES.length, 9);
  });
});

describe("local events: times, tiles, calendar files and sharing", () => {
  it("says times in Hindi", () => {
    assert.equal(timeLabelHi("9 am–1 pm"), "सुबह 9 – दोपहर 1 बजे");
    assert.equal(timeLabelHi("6 pm"), "शाम 6 बजे");
    assert.equal(timeLabelHi("7–8:30 am"), "सुबह 7 – 8:30 बजे");
    assert.equal(timeLabelHi("10 am–3 pm"), "सुबह 10 – दोपहर 3 बजे");
    assert.equal(timeLabelHi("5 pm"), "शाम 5 बजे");
    assert.equal(timeLabelHi("8 pm"), "रात 8 बजे");
    assert.equal(timeLabelHi("all day"), "all day");
    assert.equal(timeText("en", "9 am–1 pm"), "9 am–1 pm");
    assert.equal(timeText("en", "9 am–1 pm", true), "9 am – 1 pm");
  });

  it("makes organiser tiles", () => {
    assert.equal(organiserTile("Sector 57 Residents' Welfare Association", "Sector 57 RWA"), "57");
    assert.equal(organiserTile("Nirvana Country RWA"), "NC");
    assert.equal(organiserTile("Caregivers’ support group"), "CS");
  });

  it("writes a calendar file with escaped text and a 2-hour default", () => {
    const ics = icsFile({ uid: "x", title: "CPR, first-aid; guards", startsAt: "2026-11-08T05:30:00.000Z", endsAt: null, location: "DLF Phase 4 club", url: "https://example.org/e" });
    assert.match(ics, /DTSTART:20261108T053000Z/);
    assert.match(ics, /DTEND:20261108T073000Z/);
    assert.match(ics, /SUMMARY:CPR\\, first-aid\\; guards/);
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  });

  it("shares on WhatsApp with the text encoded", () => {
    assert.equal(whatsappHref("a b\nc"), "https://wa.me/?text=a%20b%0Ac");
  });
});
