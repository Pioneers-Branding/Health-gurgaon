import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { signInTarget } from "../../src/proxy";

const next = (target: ReturnType<typeof signInTarget>) => (target ? decodeURIComponent(target.search.replace(/^\?next=/, "")) : null);

describe("proxy: signed-out visitors to private pages", () => {
  it("sends every private page to sign-in, in English and Hindi", () => {
    const pages = [
      "/account/saved",
      "/account/activity",
      "/account/consent",
      "/admin",
      "/admin/reviews",
      "/admin/audit",
      "/gurgaon/society/sector-57-rwa/dashboard",
      "/gurgaon/community/ask",
      "/gurgaon/events/submit",
    ];
    for (const page of pages) {
      assert.deepEqual(signInTarget(page, ""), { pathname: "/account", search: `?next=${encodeURIComponent(page)}` }, page);
      const hi = `/hi${page}`;
      assert.deepEqual(signInTarget(hi, ""), { pathname: "/hi/account", search: `?next=${encodeURIComponent(hi)}` }, hi);
    }
  });

  it("keeps the query in next, minus Next's _rsc cache-buster", () => {
    const t = signInTarget("/hi/gurgaon/community/ask", "?topic=pharmacy&locality=sohna-road&_rsc=1x2y3");
    assert.equal(t?.pathname, "/hi/account");
    assert.equal(next(t), "/hi/gurgaon/community/ask?topic=pharmacy&locality=sohna-road");
    assert.equal(next(signInTarget("/account/activity", "?edit=HG-RV-8412")), "/account/activity?edit=HG-RV-8412");
  });

  it("accepts a trailing slash", () => {
    assert.equal(next(signInTarget("/account/saved/", "")), "/account/saved/");
    assert.equal(next(signInTarget("/gurgaon/events/submit/", "")), "/gurgaon/events/submit/");
  });

  it("leaves public pages, and the sign-in page itself, alone", () => {
    for (const page of [
      "/account",
      "/hi/account",
      "/account/other",
      "/gurgaon",
      "/gurgaon/community",
      "/gurgaon/community/t/abc123",
      "/gurgaon/events",
      "/gurgaon/events/eye-camp",
      "/gurgaon/society/sector-57-rwa",
      "/gurgaon/society/sector-57-rwa/dashboard/extra",
      "/administrator",
      "/review/doctor/dr-ananya-rao",
      "/hi/gurgaon/search",
    ]) {
      assert.equal(signInTarget(page, ""), null, page);
    }
  });

  it("never makes next longer than the sign-in page accepts (500 characters)", () => {
    const t = signInTarget("/gurgaon/community/ask", `?topic=${"x".repeat(600)}`);
    assert.equal(next(t), "/gurgaon/community/ask");
  });
});
