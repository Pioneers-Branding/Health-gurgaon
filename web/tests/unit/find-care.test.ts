import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkedAgo,
  clockTime,
  directionsUrl,
  feeLine,
  kmLabel,
  openStatusText,
  splitEmergencyNote,
  visitMonthLabel,
  withParams,
} from "../../src/components/find-care/format";
import { parseIst } from "../../src/lib/dates";
import { everyDay, openStatusParts, weeklyHours } from "../../src/lib/hours";
import { dataLabel, findCareStrings, specialtyNouns, specialtyTextHi } from "../../src/lib/i18n/areas/find-care";

const en = findCareStrings("en");
const hi = findCareStrings("hi");
const LAB = weeklyHours({ mon: "7 am – 8 pm", tue: "7 am – 8 pm", wed: "7 am – 8 pm", thu: "7 am – 8 pm", fri: "7 am – 8 pm", sat: "7 am – 6 pm", sun: "7 am – 1 pm" });

describe("find care: open-now status", () => {
  it("returns the parts of the open-now line in India time", () => {
    assert.deepEqual(openStatusParts(LAB, false, parseIst("2026-10-15 15:00")), { state: "open", kind: "closesToday", minutes: 1200 }); // Thursday
    assert.deepEqual(openStatusParts(LAB, false, parseIst("2026-10-15 06:00")), { state: "closed", kind: "opensToday", minutes: 420 });
    assert.deepEqual(openStatusParts(LAB, false, parseIst("2026-10-15 21:00")), { state: "closed", kind: "opensLater", minutes: 420, inDays: 1, day: 4 });
    assert.deepEqual(openStatusParts(everyDay("Open 24 hours"), true, parseIst("2026-10-15 03:00")), { state: "open", kind: "open24" });
    assert.deepEqual(openStatusParts(null, false, parseIst("2026-10-15 03:00")), { state: "unknown", kind: "unknown" });
  });

  it("skips closed days when saying when it opens next", () => {
    const weekdays = weeklyHours({ mon: "9 am – 1 pm", tue: "9 am – 1 pm", wed: "9 am – 1 pm", thu: "9 am – 1 pm", fri: "9 am – 1 pm" });
    const parts = openStatusParts(weekdays, false, parseIst("2026-10-16 14:00")); // Friday afternoon
    assert.deepEqual(parts, { state: "closed", kind: "opensLater", minutes: 540, inDays: 3, day: 0 });
    assert.equal(openStatusText("en", en.hours, en.weekdays, parts).detail, "Opens 9 am on Monday");
    assert.equal(openStatusText("hi", hi.hours, hi.weekdays, parts).detail, "सोमवार को सुबह 9 बजे खुलेगा");
  });

  it("words the pill like the prototype, in both languages", () => {
    const parts = openStatusParts(LAB, false, parseIst("2026-10-15 15:00"));
    assert.deepEqual(openStatusText("en", en.hours, en.weekdays, parts), { state: "open", label: "Open now", detail: "Closes 8 pm today" });
    assert.deepEqual(openStatusText("hi", hi.hours, hi.weekdays, parts), { state: "open", label: "अभी खुला", detail: "आज रात 8 बजे बंद होगा" });
    assert.equal(openStatusText("en", en.hours, en.weekdays, { state: "unknown", kind: "unknown" }).label, "Hours not verified");
  });

  it("prints clock times", () => {
    assert.equal(clockTime("en", 420), "7 am");
    assert.equal(clockTime("en", 1230), "8:30 pm");
    assert.equal(clockTime("en", 720), "noon");
    assert.equal(clockTime("en", 1440), "midnight");
    assert.equal(clockTime("hi", 420), "सुबह 7");
    assert.equal(clockTime("hi", 780), "दोपहर 1");
  });
});

describe("find care: card wording", () => {
  it("shows the fee only when verified, else the open-now state", () => {
    assert.equal(feeLine("en", en.card, { fee: 800, feeVerified: true, openNow: true }), "₹800 consultation (verified)");
    assert.equal(feeLine("en", en.card, { fee: 1200, feeVerified: true, openNow: null }), "₹1,200 consultation (verified)");
    assert.equal(feeLine("en", en.card, { fee: 0, feeVerified: true, openNow: false }), "Free consultation");
    assert.equal(feeLine("en", en.card, { fee: 500, feeVerified: false, openNow: false }), "Closed now");
    assert.equal(feeLine("en", en.card, { fee: null, feeVerified: false, openNow: null }), null);
    assert.equal(feeLine("hi", hi.card, { fee: null, feeVerified: false, openNow: true }), "अभी खुला");
  });

  it("says when a listing was checked", () => {
    assert.equal(checkedAgo(en.card, 0), "Checked today");
    assert.equal(checkedAgo(en.card, 1), "Checked 1 day ago");
    assert.equal(checkedAgo(en.card, 4), "Checked 4 days ago");
    assert.equal(checkedAgo(hi.card, 4), "4 दिन पहले जाँचा गया");
    assert.equal(checkedAgo(en.card, null), null);
  });

  it("formats distances and review months", () => {
    assert.equal(kmLabel("en", en.km, 0.8), "0.8 km");
    assert.equal(kmLabel("hi", hi.km, 12), "12 किमी");
    assert.equal(kmLabel("en", en.km, null), null);
    assert.equal(visitMonthLabel("en", "September 2026"), "SEP 2026");
    assert.equal(visitMonthLabel("hi", "September 2026"), "सितंबर 2026");
    assert.equal(visitMonthLabel("en", "Earlier in 2026"), "Earlier in 2026");
  });

  it("splits the specialty emergency note as the prototype lays it out", () => {
    const note =
      "Go to emergency, don't wait for an appointment, if your child has trouble breathing, a seizure, is unusually drowsy or hard to wake, or a baby under 3 months has a fever. Call 112.";
    assert.deepEqual(splitEmergencyNote(note), {
      title: "Go to emergency, don't wait for an appointment, if your child",
      body: "has trouble breathing, a seizure, is unusually drowsy or hard to wake, or a baby under 3 months has a fever. Call 112.",
    });
    assert.equal(splitEmergencyNote("Call 112."), null);
  });
});

describe("find care: URLs", () => {
  it("adds and removes query parameters", () => {
    assert.equal(withParams("/gurgaon/doctor/dr-ananya-rao", { tab: "reviews" }), "/gurgaon/doctor/dr-ananya-rao?tab=reviews");
    assert.equal(withParams("/gurgaon/search?q=lab&intent=review", { intent: null, suggest: true }), "/gurgaon/search?q=lab&suggest=1");
    assert.equal(withParams("/hi/gurgaon/hospital/x", { tab: "reviews", dept: "Billing & insurance" }), "/hi/gurgaon/hospital/x?tab=reviews&dept=Billing+%26+insurance");
    assert.equal(withParams("/gurgaon/emergency", {}, "blood-banks"), "/gurgaon/emergency#blood-banks");
  });

  it("builds a Google Maps search without personal data", () => {
    assert.equal(directionsUrl(["Prakash Path Labs", "Sector 56 market"]), "https://www.google.com/maps/search/?api=1&query=Prakash%20Path%20Labs%2C%20Sector%2056%20market%2C%20Gurugram");
    assert.equal(directionsUrl([null, ""]), "https://www.google.com/maps/search/?api=1&query=Gurugram");
  });
});

describe("find care: Hindi data labels", () => {
  it("translates fixed vocabularies and leaves the rest as stored", () => {
    assert.equal(dataLabel("hi", "Registration checked"), "पंजीकरण जाँचा गया");
    assert.equal(dataLabel("hi", "Large hospital"), "बड़ा अस्पताल");
    assert.equal(dataLabel("hi", "Dr. Ananya Rao"), "Dr. Ananya Rao");
    assert.equal(dataLabel("en", "Large hospital"), "Large hospital");
  });

  it("has specialty nouns and the Paediatrics explainer in Hindi", () => {
    const s = { slug: "paediatrics", doctorNoun: "Paediatrician", doctorNounPlural: "Paediatricians" };
    assert.equal(specialtyNouns("en", s).plural, "Paediatricians");
    assert.equal(specialtyNouns("en", s).nounLower, "paediatrician");
    assert.equal(specialtyNouns("hi", s).plural, "बाल रोग विशेषज्ञ");
    assert.equal(specialtyTextHi("hi", "paediatrics")?.faqs.length, 4);
    assert.equal(specialtyTextHi("en", "paediatrics"), null);
  });

  it("keeps the Hindi strings complete", () => {
    const keys = (o: unknown, prefix = ""): string[] =>
      o && typeof o === "object" && !Array.isArray(o) ? Object.entries(o).flatMap(([k, v]) => keys(v, `${prefix}${k}.`)) : [prefix];
    assert.deepEqual(keys(hi).sort(), keys(en).sort());
    assert.equal(hi.emergency.redFlags.length, en.emergency.redFlags.length);
    assert.equal(hi.weekdays.length, 7);
  });
});
