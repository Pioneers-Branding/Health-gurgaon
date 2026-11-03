import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nearbyLocalities, searchLocalities } from "../../src/lib/localities";
import {
  DEFAULT_SEARCH,
  editDistance,
  findLocalityInQuery,
  normalize,
  parseSearchParams,
  quickSearch,
  resultTitle,
  searchProviders,
  stem,
  toSearchQuery,
  tokenize,
  type SearchParams,
} from "../../src/lib/search";
import { CATALOGUE, FRIDAY_11AM, FRIDAY_3PM } from "./fixtures";

const run = (p: Partial<SearchParams>, now = FRIDAY_11AM) => searchProviders(CATALOGUE, { ...DEFAULT_SEARCH, ...p }, now);
const slugs = (p: Partial<SearchParams>, now?: Date) => run(p, now).results.map((r) => r.slug);

describe("locality aliases", () => {
  it("resolves the aliases residents type", () => {
    assert.equal(searchLocalities("GCER").hits[0].locality.slug, "golf-course-ext-road");
    assert.equal(searchLocalities("Sec 56").hits[0].locality.slug, "sector-56");
    assert.equal(searchLocalities("DLF 3").hits[0].locality.slug, "dlf-phases-1-5");
    assert.equal(searchLocalities("Sohna Rd").hits[0].locality.slug, "sohna-road");
    assert.equal(searchLocalities("सोहना रोड").hits[0].locality.slug, "sohna-road");
  });

  it("matches sector numbers to the locality that contains them", () => {
    const r = searchLocalities("Sector 65");
    assert.equal(r.hits.length, 1);
    assert.equal(r.hits[0].locality.slug, "golf-course-ext-road");
    assert.equal(r.hits[0].note, "Includes Sector 65");
  });

  it("never matches part of a number, but offers it as did-you-mean", () => {
    const r = searchLocalities("Sector 5");
    assert.equal(r.hits.length, 0);
    assert.deepEqual(r.near.map((l) => l.slug), ["sector-56"]);
  });

  it("finds a locality inside a free-text query", () => {
    assert.equal(findLocalityInQuery(tokenize("chemist gcer"))?.locality.slug, "golf-course-ext-road");
    assert.equal(findLocalityInQuery(tokenize("lab sec 56"))?.locality.slug, "sector-56");
    assert.equal(findLocalityInQuery(tokenize("paediatrician dlf 3"))?.locality.slug, "dlf-phases-1-5");
    assert.equal(findLocalityInQuery(tokenize("physio sohna road"))?.locality.slug, "sohna-road");
    assert.equal(findLocalityInQuery(tokenize("chemist sector 65"))?.locality.slug, "golf-course-ext-road");
    assert.equal(findLocalityInQuery(tokenize("new born care")), null);
  });

  it("uses a typed locality as the filter", () => {
    const out = run({ q: "chemist GCER" });
    assert.equal(out.interpreted.locality?.slug, "golf-course-ext-road");
    assert.equal(out.interpreted.localityFromQuery, true);
    const sec56 = run({ q: "lab sec 56" });
    assert.equal(sec56.interpreted.locality?.slug, "sector-56");
    assert.deepEqual(sec56.results.map((r) => r.slug), ["prakash-path-labs"]);
  });

  it("orders nearby localities by the schematic map, live pages only", () => {
    assert.deepEqual(nearbyLocalities("new-gurgaon", { liveOnly: true, limit: 2 }).map((l) => l.slug), ["sohna-road", "golf-course-ext-road"]);
  });
});

describe("text handling", () => {
  it("normalises apostrophes, accents and punctuation", () => {
    assert.equal(normalize("Children’s Clinic, DLF–Phase 3"), "childrens clinic dlf phase 3");
    assert.equal(normalize("Café"), "cafe");
  });

  it("folds suffixes so specialist and specialty words meet", () => {
    assert.equal(stem("cardiologist"), stem("cardiology"));
    assert.equal(stem("paediatrician"), stem("paediatrics"));
    assert.equal(stem("pharmacies"), stem("pharmacist"));
    assert.equal(stem("chemists"), stem("chemist"));
    assert.equal(stem("labs"), "lab");
  });

  it("counts adjacent swaps as one typo", () => {
    assert.equal(editDistance("paediatrcian", "paediatrician"), 1);
    assert.equal(editDistance("cehmist", "chemist"), 1);
    assert.equal(editDistance("abc", "xyz", 1), 2);
  });
});

describe("matching", () => {
  it("finds paediatricians, children's clinics and hospitals with paediatrics", () => {
    const out = run({ q: "Paediatrician" });
    const found = new Set([...out.results.map((r) => r.slug), out.sponsored?.slug]);
    for (const s of ["dr-ananya-rao", "little-steps-childrens-clinic", "dr-rohan-bhatia", "dr-kavya-menon", "district-civil-hospital", "urban-primary-health-centre-sector-31"]) {
      assert.ok(found.has(s), `expected ${s}`);
    }
    assert.ok(!found.has("dr-vikram-sethi"));
    assert.ok(!found.has("sai-medicos"));
  });

  it("maps synonyms and conditions to specialties", () => {
    assert.deepEqual(run({ q: "child doctor" }).interpreted.specialties.map((s) => s.slug), ["paediatrics"]);
    const fever = run({ q: "child fever" });
    assert.deepEqual(fever.interpreted.specialties.map((s) => s.slug), ["paediatrics"]);
    assert.ok(fever.results.some((r) => r.slug === "dr-ananya-rao"));
    assert.deepEqual(run({ q: "toothache" }).interpreted.specialties.map((s) => s.slug), ["dentistry"]);
    assert.ok(slugs({ q: "toothache" }).includes("smile-square-dental"));
    assert.ok(slugs({ q: "knee rehab" }).includes("dr-vikram-sethi"));
    assert.ok(slugs({ q: "blood test" }).includes("prakash-path-labs"));
  });

  it("tolerates typos and offers the correction", () => {
    const out = run({ q: "paediatrishan" });
    assert.deepEqual(out.interpreted.specialties.map((s) => s.slug), ["paediatrics"]);
    assert.ok(out.results.some((r) => r.slug === "dr-ananya-rao"));
    assert.equal(out.didYouMean, "paediatrician");
    const chem = run({ q: "cehmist" });
    assert.ok(chem.results.some((r) => r.slug === "sai-medicos"));
    assert.equal(chem.didYouMean, "chemist");
  });

  it("matches languages and services", () => {
    assert.deepEqual(slugs({ q: "paediatrician tamil" }), ["dr-kavya-menon"]);
    assert.deepEqual(slugs({ q: "home sample collection" }).sort(), ["prakash-path-labs", "prakash-path-labs-sector-48"]);
    assert.ok(slugs({ q: "dentist sunday" }).includes("smile-square-dental"));
  });

  it("requires every concept: a paediatric cardiologist isn't any paediatrician", () => {
    const out = run({ q: "Paediatric cardiologist" });
    assert.deepEqual(out.interpreted.specialties.map((s) => s.slug).sort(), ["cardiology", "paediatrics"]);
    assert.ok(!out.results.some((r) => r.slug === "dr-ananya-rao"));
  });
});

describe("filters", () => {
  it("filters by locality", () => {
    assert.ok(slugs({ q: "paediatrician", locality: "sohna-road" }).every((s) => ["dr-kavya-menon", "malibu-child-care", "sohna-road-care-hospital"].includes(s)));
  });

  it("open now uses verified hours in India time and never assumes", () => {
    const at11 = slugs({ q: "paediatrician", open: true }, FRIDAY_11AM);
    assert.ok(at11.includes("dr-ananya-rao")); // Friday 10 am – 1 pm, 5 – 8 pm
    const at3 = slugs({ q: "paediatrician", open: true }, FRIDAY_3PM);
    assert.ok(!at3.includes("dr-ananya-rao"));
    assert.ok(!at3.includes("malibu-child-care")); // no verified hours: not assumed open
    assert.ok(slugs({ q: "chemist", open: true }, FRIDAY_3PM).includes("sai-medicos"));
  });

  it("filters by verified fee ceiling, keeping free consultations", () => {
    const upTo800 = slugs({ q: "paediatrician", fee: 1000 });
    assert.ok(upTo800.includes("dr-ananya-rao"));
    assert.ok(upTo800.includes("dr-kavya-menon"));
    assert.ok(!upTo800.includes("dr-rohan-bhatia")); // ₹1,200
    assert.ok(upTo800.includes("urban-primary-health-centre-sector-31")); // free
    assert.ok(!upTo800.includes("district-civil-hospital")); // no verified fee
  });

  it("filters by language, ownership, type, access, gender and home visits", () => {
    assert.ok(slugs({ q: "paediatrician", langs: ["Telugu"] }).every((s) => s === "dr-ananya-rao"));
    assert.ok(slugs({ q: "paediatrician", own: "government" }).every((s) => ["district-civil-hospital", "urban-primary-health-centre-sector-31", "dr-s-malhotra"].includes(s)));
    assert.deepEqual(slugs({ kind: "pharmacy" }).sort(), ["sai-medicos", "sohna-road-medicos", "wellness-chemist"]);
    assert.ok(!slugs({ q: "paediatrician", wheelchair: true }).includes("little-steps-childrens-clinic"));
    assert.ok(slugs({ q: "paediatrician", female: true }).every((s) => ["dr-ananya-rao", "dr-kavya-menon", "dr-priya-kohli"].includes(s)));
    assert.ok(slugs({ homeVisits: true }).includes("dr-vikram-sethi"));
    assert.ok(slugs({ ftype: "transition-care" }).includes("recare-transition-centre"));
  });

  it("checked in the last 14 days", () => {
    const fresh = slugs({ q: "paediatrician", fresh: true }, FRIDAY_11AM);
    assert.ok(fresh.includes("dr-ananya-rao")); // 4 days
    assert.ok(!fresh.includes("dr-kavya-menon")); // 22 days
  });

  it("returns facets over the matched set", () => {
    const out = run({ q: "paediatrician" });
    assert.ok(out.facets.kinds.find((k) => k.key === "doctor")!.count >= 4);
    assert.ok(out.facets.languages.find((l) => l.key === "Telugu")!.count >= 1);
  });
});

describe("sponsored listings and sorting", () => {
  it("keeps the sponsored listing out of the ordered results", () => {
    const out = run({ q: "paediatrician" });
    assert.equal(out.sponsored?.slug, "aravali-multispeciality-hospital");
    assert.ok(!out.results.some((r) => r.slug === "aravali-multispeciality-hospital"));
    assert.match(out.sortNote, /separate and doesn't change this order/);
  });

  it("shows a sponsored provider normally when it is the only result", () => {
    const out = run({ q: "aravali", kind: "hospital" });
    assert.equal(out.sponsored, null);
    assert.deepEqual(out.results.map((r) => r.slug), ["aravali-multispeciality-hospital"]);
  });

  it("sorts by most recently verified, nearest, or name", () => {
    const fresh = slugs({ q: "paediatrician", sort: "fresh" });
    assert.ok(fresh.indexOf("dr-ananya-rao") < fresh.indexOf("dr-kavya-menon"));
    const dist = run({ q: "paediatrician", sort: "dist" }).results.map((r) => r.distanceKm ?? Infinity);
    assert.deepEqual(dist, [...dist].sort((a, b) => a - b));
    const names = run({ q: "paediatrician", sort: "name" }).results.map((r) => r.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("titles results like the prototype", () => {
    assert.match(resultTitle(run({ q: "Paediatrician" })), /^\d+ results for “Paediatrician” in Gurugram$/);
  });
});

describe("no results", () => {
  it("never ends in a dead end", () => {
    const out = run({ q: "Paediatric cardiologist", locality: "new-gurgaon" });
    assert.equal(out.total, 0);
    assert.ok(out.noResults);
    assert.deepEqual(out.noResults.suggestions.map((s) => s.label), ["Paediatrician", "Cardiologist", "Children’s clinic"]);
    assert.deepEqual(out.noResults.nearbyLocalities.map((l) => l.name), ["Sohna Road", "Golf Course Ext. Road", "All Gurugram"]);
  });

  it("says when filters hid the results", () => {
    const out = run({ q: "paediatrician", locality: "sohna-road", langs: ["Punjabi"] });
    assert.equal(out.total, 0);
    assert.ok(out.noResults!.hiddenByFilters > 0);
  });

  it("flags red-flag symptoms", () => {
    assert.equal(run({ q: "chest pain" }).emergency.urgent, true);
    assert.equal(run({ q: "dentist" }).emergency.urgent, false);
  });
});

describe("parameters", () => {
  it("parses and rebuilds the URL", () => {
    const p = parseSearchParams({ q: " paediatrician ", locality: "sohna-road", lang: ["Hindi", "tamil"], fee: "1000", open: "1", sort: "dist", own: "nope", kind: "doctor" });
    assert.equal(p.q, "paediatrician");
    assert.equal(p.locality, "sohna-road");
    assert.deepEqual(p.langs, ["Hindi", "Tamil"]);
    assert.equal(p.fee, 1000);
    assert.equal(p.open, true);
    assert.equal(p.sort, "dist");
    assert.equal(p.own, null);
    assert.equal(p.kind, "doctor");
    assert.equal(toSearchQuery(p), "q=paediatrician&locality=sohna-road&kind=doctor&lang=Hindi&lang=Tamil&fee=1000&open=1&sort=dist");
    assert.deepEqual(parseSearchParams(new URLSearchParams(toSearchQuery(p))), p);
  });

  it("ignores unknown localities and fee values", () => {
    const p = parseSearchParams({ locality: "atlantis", fee: "750" });
    assert.equal(p.locality, null);
    assert.equal(p.fee, null);
  });

  it("quick search puts name matches first", () => {
    assert.equal(quickSearch(CATALOGUE, "sai", FRIDAY_11AM)[0]?.slug, "sai-medicos");
  });
});
