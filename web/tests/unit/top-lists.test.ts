import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  demoNotes,
  facilityFacts,
  filterEntries,
  filterFacilities,
  filterHubCards,
  firstSentence,
  matchProviderName,
  parseFacilityFilters,
  parseHubFilters,
  parseListFilters,
  parseMovement,
  parseStoryCategory,
  sortFacilities,
  storyCategoryValue,
  storySlug,
  withQuery,
} from "../../src/components/top-lists/format";
import { facilityCountTitle, monthName, tlData, topListsStrings } from "../../src/lib/i18n/areas/top-lists";
import { NEIGHBOUR_DEMO_DOCS } from "../../src/lib/neighbour-demo";
import { DEMO_SAFEGUARDS, scoreDemoDoc, type DemoSafeguard } from "../../src/lib/ranking";
import { STORY_CONSENTS } from "../../src/lib/validation/story";

const en = topListsStrings("en");
const hi = topListsStrings("hi");

describe("top lists: URL helpers", () => {
  it("adds, replaces and drops query values", () => {
    assert.equal(withQuery("/gurgaon/top", { group: "doctors", q: "" }), "/gurgaon/top?group=doctors");
    assert.equal(withQuery("/gurgaon/top?group=doctors", { group: null, q: "dent" }), "/gurgaon/top?q=dent");
    assert.equal(withQuery("/hi/gurgaon/stories", { share: true }), "/hi/gurgaon/stories?share=1");
    assert.equal(withQuery("/gurgaon/top/paediatricians", {}, "method"), "/gurgaon/top/paediatricians#method");
  });

  it("parses hub filters, ignoring unknown groups", () => {
    assert.deepEqual(parseHubFilters({ group: "care-centres", q: "  rehab " }), { group: "care-centres", q: "rehab" });
    assert.deepEqual(parseHubFilters({ group: "nope" }), { group: null, q: "" });
    assert.deepEqual(parseHubFilters({ group: ["doctors", "x"] }), { group: "doctors", q: "" });
  });

  it("filters hub cards by group and search text", () => {
    const cards = [
      { groupKey: "doctors" as const, search: "Top dentists in Gurugram गुरुग्राम के टॉप दंत चिकित्सक" },
      { groupKey: "hospitals" as const, search: "Top nursing homes & small hospitals" },
    ];
    assert.equal(filterHubCards(cards, { group: null, q: "NURSING" }).length, 1);
    assert.equal(filterHubCards(cards, { group: null, q: "दंत" }).length, 1);
    assert.equal(filterHubCards(cards, { group: "hospitals", q: "dent" }).length, 0);
    assert.equal(filterHubCards(cards, { group: null, q: "" }).length, 2);
  });

  it("parses list filters (no PPP chip, known localities only)", () => {
    assert.deepEqual(parseListFilters({ own: "government", locality: "sohna-road" }), { own: "government", locality: "sohna-road" });
    assert.deepEqual(parseListFilters({ own: "ppp", locality: "mars" }), { own: null, locality: null });
  });

  it("re-numbers filtered entries from 1 in score order", () => {
    const entries = [
      { name: "A", ownership: "private", localitySlug: "sector-56" },
      { name: "B", ownership: "government", localitySlug: "sector-56" },
      { name: "C", ownership: "government", localitySlug: "sohna-road" },
    ];
    const shown = filterEntries(entries, { own: "government", locality: null });
    assert.deepEqual(
      shown.map((e) => [e.name, e.position]),
      [
        ["B", 1],
        ["C", 2],
      ],
    );
    assert.equal(filterEntries(entries, { own: "charitable", locality: null }).length, 0);
  });

  it("reads movement labels", () => {
    assert.deepEqual(parseMovement("▲ 1 since Sep"), { dir: "up", n: 1, month: "Sep" });
    assert.deepEqual(parseMovement("▼ 2 since Sep"), { dir: "down", n: 2, month: "Sep" });
    assert.deepEqual(parseMovement("NEW"), { dir: "new" });
    assert.deepEqual(parseMovement("—"), { dir: "same" });
    assert.equal(monthName("hi", "Sep"), "सितंबर");
  });
});

describe("top lists: stories", () => {
  it("maps category slugs to stored categories", () => {
    assert.equal(parseStoryCategory({ category: "womens-health" }), "womens-health");
    assert.equal(storyCategoryValue("womens-health"), "Women’s health");
    assert.equal(parseStoryCategory({ category: "billing" }), null);
  });

  it("captions with the first sentence", () => {
    assert.equal(firstSentence("I reached at 8 am. There was a queue."), "I reached at 8 am.");
    assert.equal(firstSentence(""), "");
    assert.equal(firstSentence("No full stop"), "No full stop");
  });

  it("makes URL-safe slugs for pending stories", () => {
    assert.equal(storySlug("HG-ST-222"), "submitted-hg-st-222");
  });

  it("matches a typed provider only when there is one clear listing", () => {
    const providers = [
      { name: "Shanti Nursing Home (sample)" },
      { name: "Aravali Multispeciality Hospital" },
      { name: "Sohna Road Care Hospital (sample)" },
      { name: "Sector 56 Care Hospital (sample)" },
      { name: "Dr. Ananya Rao" },
    ];
    assert.equal(matchProviderName("shanti nursing home", providers)?.name, "Shanti Nursing Home (sample)");
    assert.equal(matchProviderName("Aravali Hospital", providers)?.name, "Aravali Multispeciality Hospital");
    assert.equal(matchProviderName("Dr Ananya Rao", providers)?.name, "Dr. Ananya Rao");
    assert.equal(matchProviderName("Care Hospital", providers), null);
    assert.equal(matchProviderName("ab", providers), null);
    assert.equal(matchProviderName("Some other clinic", providers), null);
  });

  it("asks for the same four consents the schema checks", () => {
    assert.deepEqual(en.share.consents, [...STORY_CONSENTS]);
    assert.equal(hi.share.consents.length, STORY_CONSENTS.length);
  });
});

describe("top lists: facilities", () => {
  it("parses ownership and type filters against the known types", () => {
    assert.deepEqual(parseFacilityFilters({ ownership: "ppp", type: "dialysis-centre" }, ["dialysis-centre"]), { ownership: "ppp", type: "dialysis-centre" });
    assert.deepEqual(parseFacilityFilters({ ownership: "trust", type: "spa" }, ["dialysis-centre"]), { ownership: null, type: null });
  });

  it("filters by ownership and type", () => {
    const rows = [
      { ownership: "government", type: { slug: "large-hospital" } },
      { ownership: "private", type: { slug: "large-hospital" } },
      { ownership: "private", type: { slug: "nursing-home" } },
    ];
    assert.equal(filterFacilities(rows, { ownership: "private", type: null }).length, 2);
    assert.equal(filterFacilities(rows, { ownership: "private", type: "large-hospital" }).length, 1);
    assert.equal(filterFacilities(rows, { ownership: "ppp", type: null }).length, 0);
  });

  it("builds up to three facts: emergency, size, own tags", () => {
    assert.deepEqual(facilityFacts({ emergency: { available24x7: true }, sizeLabel: "300+ beds", tags: ["Free OPD", "Emergency"] }), ["24×7 emergency", "300+ beds", "Free OPD"]);
    assert.deepEqual(facilityFacts({ emergency: { available24x7: false, label: "Emergency till midnight" }, sizeLabel: "45 beds", tags: ["Medicine", "Paediatrics"] }), [
      "Emergency till midnight",
      "45 beds",
      "Medicine",
    ]);
    assert.deepEqual(facilityFacts({ emergency: null, sizeLabel: null, tags: ["Home visits", "In-patient"] }), ["Home visits", "In-patient"]);
  });

  it("lists government facilities first, then by type and name", () => {
    const sorted = sortFacilities([
      { ownership: "private", typeOrder: 0, name: "B" },
      { ownership: "ppp", typeOrder: 0, name: "A" },
      { ownership: "government", typeOrder: 3, name: "Z" },
      { ownership: "government", typeOrder: 0, name: "Y" },
    ]);
    assert.deepEqual(
      sorted.map((r) => r.name),
      ["Y", "Z", "B", "A"],
    );
  });

  it("words the result count with real plurals", () => {
    assert.equal(facilityCountTitle(en, "en", 14, null, null), "14 facilities");
    assert.equal(facilityCountTitle(en, "en", 1, null, null), "1 facility");
    assert.equal(facilityCountTitle(en, "en", 3, "government", { slug: "large-hospital", name: "Large hospital" }), "3 government large hospitals");
    assert.equal(facilityCountTitle(en, "en", 1, "private", { slug: "nursing-home", name: "Nursing home" }), "1 private nursing home");
    assert.equal(facilityCountTitle(en, "en", 2, "ppp", null), "2 PPP facilities");
    assert.equal(facilityCountTitle(hi, "hi", 3, "government", { slug: "large-hospital", name: "Large hospital" }), "3 सरकारी बड़े अस्पताल");
    assert.equal(facilityCountTitle(hi, "hi", 1, null, null), "1 सुविधा");
  });
});

describe("top lists: Hindi data labels", () => {
  it("translates whole strings and · separated parts", () => {
    assert.equal(tlData("en", "Top hospitals in Gurugram, 2026"), "Top hospitals in Gurugram, 2026");
    assert.equal(tlData("hi", "Top hospitals in Gurugram, 2026"), "गुरुग्राम के टॉप अस्पताल, 2026");
    assert.equal(tlData("hi", "Sector 38 · 24×7 emergency · 1,000+ beds"), "सेक्टर 38 · 24×7 इमरजेंसी · 1,000+ बेड");
    assert.equal(tlData("hi", "Sushant Lok 1 · Hindi, English, Telugu · ₹800"), "Sushant Lok 1 · हिंदी, अंग्रेज़ी, तेलुगु · ₹800");
    assert.equal(tlData("hi", "BASED ON 1,284 VERIFIED REVIEWS"), "1,284 सत्यापित समीक्षाओं पर आधारित");
    assert.equal(tlData("hi", "1,284 reviews · registration verified"), "1,284 समीक्षाएं · रजिस्ट्रेशन सत्यापित");
    assert.equal(tlData("hi", "TRANSITION CARE · OCT 2026"), "ट्रांज़िशन केयर · अक्टूबर 2026");
    assert.equal(tlData("hi", "Son of a patient, Sector 49"), "मरीज़ के बेटे, सेक्टर 49");
  });
});

describe("neighbour method demo", () => {
  it("words the same notes scoreDemoDoc() produces, for every safeguard combination", () => {
    const keys = DEMO_SAFEGUARDS.map((s) => s.key);
    for (let mask = 0; mask < 1 << keys.length; mask++) {
      const on = Object.fromEntries(keys.map((k, i) => [k, !!(mask & (1 << i))])) as Record<DemoSafeguard, boolean>;
      for (const d of NEIGHBOUR_DEMO_DOCS) {
        const expected = scoreDemoDoc(d, on).notes;
        const ours = demoNotes(d, on).map((n) => en.method.notes[n.key].replace("{n}", String(n.n)));
        assert.deepEqual(ours, expected, `${d.name} ${mask}`);
      }
    }
  });

  it("has Hindi text for every safeguard", () => {
    for (const s of DEMO_SAFEGUARDS) {
      assert.equal(en.method.safeguardText[s.key].label, s.label);
      assert.ok(hi.method.safeguardText[s.key].label.length > 0);
    }
  });
});
