import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkDisputeStep, clampStep, emptyDisputeValues, firstInvalidStep, readDisputeValues } from "../../src/app/actions/dispute-schemas";
import { factReportWithoutFieldSchema, isReportFormKind, reportFieldsFor } from "../../src/app/actions/report-schemas";
import { reviewFlagSchema } from "../../src/lib/validation/review";
import { providerLine, visitMonthDisplay } from "../../src/components/content-trust/format";
import { contentTrustStrings, ctDataLabel } from "../../src/lib/i18n/areas/content-trust";
import { routes } from "../../src/lib/routes";

const DETAILS = "Three of these reviews mention a clinic in Sector 29, not this one.";

describe("content & trust: dispute steps", () => {
  const good = emptyDisputeValues({
    kind: "ranking",
    role: "resident",
    itemId: "entry-1",
    reason: "fake",
    details: DETAILS,
    declare: "on",
  });

  it("checks each step with its own schema", () => {
    assert.equal(checkDisputeStep(1, good), null);
    assert.deepEqual(Object.keys(checkDisputeStep(1, { ...good, role: "" }) ?? {}), ["role"]);
    assert.deepEqual(Object.keys(checkDisputeStep(1, { ...good, role: "other", connection: "x" }) ?? {}), ["connection"]);
    assert.equal(checkDisputeStep(1, { ...good, role: "other", connection: "journalist" }), null);
    assert.deepEqual(Object.keys(checkDisputeStep(1, { ...good, kind: "review" }) ?? {}), ["kind"]);
    assert.deepEqual(Object.keys(checkDisputeStep(2, { ...good, details: "too short" }) ?? {}), ["details"]);
    assert.deepEqual(Object.keys(checkDisputeStep(2, { ...good, reason: "" }) ?? {}), ["reason"]);
    assert.equal(checkDisputeStep(3, good), null);
    assert.deepEqual(Object.keys(checkDisputeStep(4, { ...good, declare: "" }) ?? {}), ["declare"]);
    assert.deepEqual(Object.keys(checkDisputeStep(4, { ...good, email: "not-an-email" }) ?? {}), ["email"]);
  });

  it("only accepts items this provider can be disputed on", () => {
    assert.equal(checkDisputeStep(2, good, ["entry-1", "entry-2"]), null);
    assert.deepEqual(Object.keys(checkDisputeStep(2, good, ["entry-9"]) ?? {}), ["itemId"]);
  });

  it("finds the first step with a problem on submit", () => {
    assert.equal(firstInvalidStep(good, ["entry-1"]), null);
    assert.equal(firstInvalidStep({ ...good, details: "" }, ["entry-1"])?.step, 2);
    assert.equal(firstInvalidStep({ ...good, role: "", declare: "" })?.step, 1);
  });

  it("reads posted values and clamps the step", () => {
    const v = readDisputeValues({ kind: "mention", role: "provider", extra: "ignored", declare: "on", details: 42 });
    assert.equal(v.kind, "mention");
    assert.equal(v.role, "provider");
    assert.equal(v.details, "");
    assert.equal(v.declare, "on");
    assert.equal("extra" in v, false);
    assert.equal(clampStep("3"), 3);
    assert.equal(clampStep("9"), 4);
    assert.equal(clampStep("x"), 1);
    assert.equal(clampStep(undefined), 1);
  });
});

describe("content & trust: report form", () => {
  it("offers the fact fields that fit the item", () => {
    assert.equal(reportFieldsFor("doctor").length, 8);
    assert.deepEqual(reportFieldsFor("event"), ["timings", "address", "fee", "closed", "duplicate"]);
    assert.deepEqual(reportFieldsFor("article"), []);
    assert.deepEqual(reportFieldsFor("guide"), []);
    assert.equal(isReportFormKind("guide"), true);
    assert.equal(isReportFormKind("pharmacy"), true);
    assert.equal(isReportFormKind("society"), false);
  });

  it("checks article and guide corrections without a listing field", () => {
    assert.equal(factReportWithoutFieldSchema.safeParse({ item: "A guide", details: "The OPD timings changed in October.", lang: "en" }).success, true);
    assert.equal(factReportWithoutFieldSchema.safeParse({ item: "A guide", details: "short", lang: "en" }).success, false);
  });

  it("checks a report of a single review against the review policy's reasons", () => {
    const base = { providerSlug: "dr-ananya-rao", reviewRef: "HG-RV-8412", lang: "en" };
    assert.equal(reviewFlagSchema.safeParse({ ...base, reason: "fake" }).success, true);
    assert.equal(reviewFlagSchema.safeParse({ ...base, reason: "personal", details: "" }).success, true);
    assert.equal(reviewFlagSchema.safeParse({ ...base, reason: "other" }).success, false, "“Something else” needs a few words");
    assert.equal(reviewFlagSchema.safeParse({ ...base, reason: "other", details: "It quotes a private WhatsApp message." }).success, true);
    assert.equal(reviewFlagSchema.safeParse({ ...base, reason: "rude" }).success, false);
    assert.equal(reviewFlagSchema.safeParse({ ...base, reviewRef: "RV-1", reason: "fake" }).success, false);
  });
});

describe("content & trust: routes and labels", () => {
  it("adds the forms' query only when given (existing links unchanged)", () => {
    assert.equal(routes.report("en", "doctor", "dr-ananya-rao"), "/report/doctor/dr-ananya-rao");
    assert.equal(routes.report("en", "doctor", "dr-ananya-rao", { review: "HG-RV-8412" }), "/report/doctor/dr-ananya-rao?review=HG-RV-8412");
    assert.equal(routes.report("hi", "hospital", "x", { field: "accessibility" }), "/hi/report/hospital/x?field=accessibility");
    assert.equal(routes.dispute("en", "doctor", "dr-ananya-rao"), "/dispute/doctor/dr-ananya-rao");
    assert.equal(routes.dispute("en", "doctor", "d", { target: "ranking", list: "paediatricians" }), "/dispute/doctor/d?target=ranking&list=paediatricians");
    assert.equal(routes.dispute("en", "doctor", "d", { target: "mention", list: undefined }), "/dispute/doctor/d?target=mention");
  });

  it("shows visit months and data labels in Hindi", () => {
    const hi = contentTrustStrings("hi");
    const en = contentTrustStrings("en");
    assert.equal(visitMonthDisplay("en", "October 2026", en.review.earlierIn), "October 2026");
    assert.equal(visitMonthDisplay("hi", "October 2026", hi.review.earlierIn), "अक्तूबर 2026");
    assert.equal(visitMonthDisplay("en", "Earlier in 2026", en.review.earlierIn), "Earlier in 2026");
    assert.equal(visitMonthDisplay("hi", "Earlier in 2026", hi.review.earlierIn), "2026 में पहले");
    assert.equal(ctDataLabel(hi, "PUBLIC HEALTH"), "जन स्वास्थ्य");
    assert.equal(ctDataLabel(en, "PUBLIC HEALTH"), "PUBLIC HEALTH");
    assert.equal(ctDataLabel(hi, "Something new"), "Something new");
  });

  it("describes the provider under a form's heading", () => {
    assert.equal(providerLine({ headline: "Paediatrician · MBBS, MD", areaLabel: "Sushant Lok 1 clinic", localityName: "Sector 56" }), "Paediatrician, Sushant Lok 1 clinic");
    assert.equal(providerLine({ headline: "Pharmacy", areaLabel: null, localityName: "Sector 56" }), "Pharmacy, Sector 56");
  });

  it("has every English key in Hindi, with Hindi text", () => {
    const en = contentTrustStrings("en");
    const hi = contentTrustStrings("hi");
    const walk = (a: unknown, b: unknown, path: string) => {
      if (typeof a === "string") {
        assert.equal(typeof b, "string", path);
        return;
      }
      if (Array.isArray(a)) {
        assert.ok(Array.isArray(b) && b.length === a.length, path);
        a.forEach((x, i) => walk(x, (b as unknown[])[i], `${path}[${i}]`));
        return;
      }
      if (a && typeof a === "object") for (const k of Object.keys(a)) if (path !== "categories") walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)?.[k], path ? `${path}.${k}` : k);
    };
    walk(en, hi, "");
    assert.match(hi.review.title, /[ऀ-ॿ]/);
    assert.match(hi.dispute.submit, /[ऀ-ॿ]/);
  });
});
