import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cardFacts,
  cleanPhoneInput,
  eventMatches,
  heroWhen,
  metaText,
  placeText,
  startTime,
  startTimeHi,
  storyKind,
  storyPlace,
  withQuery,
} from "../../src/components/home/format";
import { homeData, homeStrings, localityTileText, weeklyReportLabels } from "../../src/lib/i18n/areas/home";

const en = homeStrings("en");
const hi = homeStrings("hi");

describe("home: WhatsApp number clean-up", () => {
  it("keeps 10 digits from typed or pasted numbers", () => {
    assert.equal(cleanPhoneInput("98765 43210"), "9876543210");
    assert.equal(cleanPhoneInput("+91 98765-43210"), "9876543210");
    assert.equal(cleanPhoneInput("919876543210"), "9876543210");
    assert.equal(cleanPhoneInput("098765 43210"), "9876543210");
    assert.equal(cleanPhoneInput("(987) 654-3210 ext"), "9876543210");
    assert.equal(cleanPhoneInput("98765"), "98765");
    assert.equal(cleanPhoneInput("abc"), "");
  });

  it("doesn't drop a leading 91 from a 10-digit number", () => {
    assert.equal(cleanPhoneInput("9198765432"), "9198765432");
  });
});

describe("home: stored data on Hindi pages", () => {
  it("translates whole place names only", () => {
    assert.equal(placeText("hi", "Sector 49"), "सेक्टर 49");
    assert.equal(placeText("hi", "Sector 9A"), "सेक्टर 9A");
    assert.equal(placeText("hi", "DLF Phase 2"), "DLF फ़ेज़ 2");
    assert.equal(placeText("hi", "Near Sector 56 metro"), "Near Sector 56 metro");
    assert.equal(placeText("en", "Sector 49"), "Sector 49");
  });

  it("translates a featured hospital's meta line part by part", () => {
    assert.equal(metaText("hi", "4.0 km · Sector 51 · 200+ beds"), "4.0 किमी · सेक्टर 51 · 200+ बेड");
    assert.equal(metaText("hi", "3.4 km · free / low-cost · 300+ beds"), "3.4 किमी · मुफ़्त / कम ख़र्च · 300+ बेड");
    assert.equal(metaText("hi", "2.1 km · Sector 38 · 1,000+ beds"), "2.1 किमी · सेक्टर 38 · 1,000+ बेड");
    assert.equal(metaText("en", "4.0 km · Sector 51 · 200+ beds"), "4.0 km · Sector 51 · 200+ beds");
  });

  it("has Hindi for the locality tiles and short labels, and leaves unknown ones as stored", () => {
    assert.deepEqual(localityTileText("hi", { slug: "sohna-road", desc: "Clinics, labs, home care", photo: "Sohna Road" }), { desc: "क्लिनिक, लैब, घर पर देखभाल", photo: "सोहना रोड" });
    assert.deepEqual(localityTileText("en", { slug: "sohna-road", desc: "Clinics, labs, home care", photo: "Sohna Road" }), { desc: "Clinics, labs, home care", photo: "Sohna Road" });
    assert.equal(homeData("hi", "Large hospital"), "बड़ा अस्पताल");
    assert.equal(homeData("hi", "Something new"), "Something new");
    assert.equal(homeData("en", "Large hospital"), "Large hospital");
  });
});

describe("home: stories", () => {
  it("reads the place and the kind of care", () => {
    assert.equal(storyPlace("Son of a patient, Sector 49"), "Sector 49");
    assert.equal(storyPlace("Parent"), "Parent");
    assert.equal(storyKind("TRANSITION CARE · OCT 2026"), "Transition care");
    assert.equal(storyKind("OCT 2026"), null);
  });
});

describe("home: next camp", () => {
  it("takes the start of a time label", () => {
    assert.equal(startTime("9 am–1 pm"), "9 am");
    assert.equal(startTime("7–8:30 am"), "7 am");
    assert.equal(startTime("6 pm"), "6 pm");
    assert.equal(startTimeHi("9 am"), "सुबह 9 बजे");
    assert.equal(startTimeHi("6 pm"), "शाम 6 बजे");
    assert.equal(startTimeHi("12:30 pm"), "दोपहर 12:30 बजे");
  });

  it("writes the day and time in India time", () => {
    // 15 Nov 2026, 9 am IST = 03:30 UTC (a Sunday)
    assert.equal(heroWhen("en", en, "2026-11-15T03:30:00.000Z", "9 am–1 pm"), "Sun 15 Nov, 9 am");
    assert.equal(heroWhen("hi", hi, "2026-11-15T03:30:00.000Z", "9 am–1 pm"), "रवि 15 नव॰, सुबह 9 बजे");
    // 1 Nov 2026 00:30 IST is still 31 Oct in UTC
    assert.equal(heroWhen("en", en, "2026-10-31T19:00:00.000Z", ""), "Sun 1 Nov");
  });
});

describe("home: event filter chips", () => {
  const camp = { type: "health_camp", isFree: true };
  const drive = { type: "blood_drive", isFree: true };
  const workshop = { type: "workshop", isFree: false };
  const talk = { type: "talk", isFree: true };
  it("groups event types the way the prototype does", () => {
    assert.ok(eventMatches("all", workshop));
    assert.ok(eventMatches("camps", camp) && eventMatches("camps", { type: "screening", isFree: true }));
    assert.ok(!eventMatches("camps", drive));
    assert.ok(eventMatches("bloodDrives", drive));
    assert.ok(eventMatches("workshops", workshop) && eventMatches("workshops", talk));
    assert.ok(eventMatches("free", talk) && !eventMatches("free", workshop));
  });
});

describe("home: recently verified card lines", () => {
  const base = { areaLabel: null, localityName: null, distanceKm: null, languages: [], fee: null, feeVerified: false, hoursSummary: null, keyFact: null };
  it("doctors: place, languages, then key fact or verified fee", () => {
    assert.deepEqual(
      cardFacts("en", en, { ...base, kind: "doctor", areaLabel: "Sushant Lok 1 clinic", distanceKm: 0.8, languages: ["Hindi", "English", "Telugu"], fee: 800, feeVerified: true }),
      ["Sushant Lok 1 clinic · 0.8 km", "Hindi, English, Telugu", "Consultation ₹800 (verified)"],
    );
    assert.deepEqual(
      cardFacts("en", en, { ...base, kind: "doctor", areaLabel: "Home visits + clinic", distanceKm: 1.6, languages: ["Hindi"], fee: 700, feeVerified: true, keyFact: "Wheelchair accessible (verified)" }),
      ["Home visits + clinic · 1.6 km", "Hindi", "Wheelchair accessible (verified)"],
    );
  });

  it("labs and chemists: place, key fact, checked hours", () => {
    assert.deepEqual(
      cardFacts("en", en, { ...base, kind: "lab", areaLabel: "Sector 56 market", distanceKm: 0.4, languages: ["Hindi", "English"], hoursSummary: "Open 7 am – 8 pm", keyFact: "Home sample collection" }),
      ["Sector 56 market · 0.4 km", "Home sample collection", "Open 7 am – 8 pm (hours checked)"],
    );
    assert.deepEqual(cardFacts("hi", hi, { ...base, kind: "pharmacy", areaLabel: "Sector 56", distanceKm: 1.1, hoursSummary: "Open 24 hours", keyFact: "Delivery available" }), [
      "सेक्टर 56 · 1.1 किमी",
      "Delivery available",
      "Open 24 hours (समय जाँचा गया)",
    ]);
  });

  it("never shows an unverified fee, and drops empty lines", () => {
    assert.deepEqual(cardFacts("en", en, { ...base, kind: "doctor", fee: 900, feeVerified: false }), []);
    assert.deepEqual(cardFacts("en", en, { ...base, kind: "doctor", fee: 0, feeVerified: true }), ["Free consultation (verified)"]);
  });
});

describe("home: links and labels", () => {
  it("adds query parameters to a route", () => {
    assert.equal(withQuery("/gurgaon/search", { q: "Paediatrician", locality: "sector-56" }), "/gurgaon/search?q=Paediatrician&locality=sector-56");
    assert.equal(withQuery("/hi/gurgaon/stories", { story: "a-b", share: null }), "/hi/gurgaon/stories?story=a-b");
    assert.equal(withQuery("/gurgaon/stories?x=1", { share: 1 }), "/gurgaon/stories?x=1&share=1");
  });

  it("has every string in Hindi, and the sign-up labels in both languages", () => {
    const walk = (a: unknown, b: unknown, path: string) => {
      if (typeof a === "string") {
        assert.equal(typeof b, "string", path);
        return;
      }
      assert.equal(typeof b, "object", path);
      for (const key of Object.keys(a as object)) walk((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`);
    };
    walk(en, hi, "home");
    assert.equal(weeklyReportLabels("en").done, "You'll get a confirmation message on WhatsApp. Reply YES to start.");
    assert.equal(weeklyReportLabels("hi").subscribe, "सदस्यता लें");
    assert.equal(weeklyReportLabels("en").prefix, "+91");
  });
});
