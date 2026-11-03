import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { csvCell, listingEditSchema, storyPublishSchema } from "../../src/app/actions/admin-schemas";
import { adminHref, ageText, slaText, stamp } from "../../src/components/admin/format";
import {
  auditAction,
  claimOutcome,
  disputeOutcome,
  eventOutcome,
  flagKind,
  hoursOrDays,
  KIND_DECISIONS,
  listingChanges,
  median,
  noteRequired,
  QUEUE_ITEM_KINDS,
  reasonsFor,
  reportKind,
  reportOutcome,
  reviewOutcome,
  slaState,
  storyMeta,
  volunteerOutcome,
} from "../../src/lib/data/admin-format";
import { adminStrings } from "../../src/lib/i18n/areas/admin";
import { MODERATION_REASONS } from "../../src/lib/validation/moderation";

describe("queue item kinds", () => {
  it("tells new questions and replies from reported content", () => {
    assert.equal(flagKind("thread", "New question awaiting approval"), "new_question");
    assert.equal(flagKind("post", "New reply awaiting approval"), "new_reply");
    assert.equal(flagKind("post", "Unsafe advice"), "flag_post");
    assert.equal(flagKind("thread", "Spam or undisclosed promotion"), "flag_thread");
    assert.equal(flagKind("review", "Something else"), "flag_review");
    assert.equal(flagKind("story", "Personal data"), "flag_story");
  });

  it("files locality suggestions and concerns apart from corrections", () => {
    assert.equal(reportKind("fact", "provider"), "report_fact");
    assert.equal(reportKind("complaint", "provider"), "report_concern");
    assert.equal(reportKind("missing", "locality"), "report_locality");
    assert.equal(reportKind("missing", "page"), "report_missing");
  });

  it("gives every kind buttons and reasons, and every reason a Hindi name", () => {
    const hi = adminStrings("hi");
    for (const kind of QUEUE_ITEM_KINDS) {
      assert.ok(KIND_DECISIONS[kind].length >= 2, kind);
      assert.ok(KIND_DECISIONS[kind].includes("approve") && KIND_DECISIONS[kind].includes("reject"), kind);
      const reasons = reasonsFor(kind);
      assert.ok(reasons.length >= 3, kind);
      for (const r of reasons) assert.ok(hi.reasonText[r], `Hindi for “${r}”`);
    }
  });

  it("uses the prototype's reason lists", () => {
    assert.deepEqual(reasonsFor("review"), MODERATION_REASONS.reviews);
    assert.deepEqual(reasonsFor("event"), MODERATION_REASONS.events);
    assert.deepEqual(reasonsFor("new_question"), MODERATION_REASONS.community);
    assert.deepEqual(reasonsFor("claim"), MODERATION_REASONS.claims);
  });
});

describe("decisions", () => {
  it("maps each decision to the row's own status", () => {
    assert.equal(reviewOutcome("approve"), "published");
    assert.equal(reviewOutcome("request_info"), "needs_changes");
    assert.equal(reviewOutcome("escalate"), null);
    assert.equal(eventOutcome("approve"), "verified");
    assert.equal(eventOutcome("request_info"), "changes_requested");
    assert.equal(claimOutcome("escalate"), "escalated");
    assert.equal(volunteerOutcome("request_info"), "call_scheduled");
  });

  it("closes reports as fixed, unverified or duplicate", () => {
    assert.equal(reportOutcome("approve", "Confirmed with provider"), "resolved");
    assert.equal(reportOutcome("reject", "Could not verify"), "no_change");
    assert.equal(reportOutcome("reject", "Duplicate report"), "rejected");
    assert.equal(reportOutcome("request_info", "Could not verify"), "checking");
  });

  it("decides disputes from the reason", () => {
    assert.equal(disputeOutcome("approve", "Upheld"), "upheld");
    assert.equal(disputeOutcome("approve", "Partly upheld"), "partly_upheld");
    assert.equal(disputeOutcome("reject", "Not upheld"), "not_upheld");
    assert.equal(disputeOutcome("request_info", "Needs more evidence"), "under_review");
  });

  it("needs a note where the person must act on it or it is published", () => {
    assert.equal(noteRequired("event", "request_info"), true);
    assert.equal(noteRequired("event", "approve"), false);
    assert.equal(noteRequired("dispute", "approve"), true);
    assert.equal(noteRequired("review", "request_info"), false);
  });

  it("names audit actions like the log expects", () => {
    assert.equal(auditAction("review", "approve"), "review.approve");
    assert.equal(auditAction("review", "request_info"), "review.request_changes");
    assert.equal(auditAction("report_fact", "approve"), "report.resolve");
    assert.equal(auditAction("story", "approve"), "story.publish");
    assert.equal(auditAction("new_question", "approve"), "question.approve");
    assert.equal(auditAction("flag_post", "reject"), "post.remove");
    assert.equal(auditAction("society", "approve"), "society.verify");
    assert.equal(auditAction("dispute", "reject"), "dispute.decide");
  });
});

describe("SLA and time labels", () => {
  it("says due, left, overdue or done", () => {
    assert.deepEqual(slaState(true, 2), { kind: "due", hours: 2 });
    assert.deepEqual(slaState(true, 14), { kind: "left", hours: 14 });
    assert.deepEqual(slaState(true, -5), { kind: "overdue", hours: 5 });
    assert.deepEqual(slaState(false, -5), { kind: "done" });
    const t = adminStrings("en").sla;
    assert.deepEqual(slaText(t, true, 2), { text: "DUE IN 2H", urgent: true });
    assert.deepEqual(slaText(t, true, 14), { text: "14H LEFT", urgent: false });
    assert.deepEqual(slaText(t, true, 72), { text: "3D LEFT", urgent: false });
    assert.deepEqual(slaText(t, true, -50), { text: "OVERDUE 2D", urgent: true });
    assert.equal(slaText(t, false, 3).text, "DONE");
  });

  it("switches from hours to days at two days", () => {
    assert.deepEqual(hoursOrDays(47), { n: 47, unit: "h" });
    assert.deepEqual(hoursOrDays(48), { n: 2, unit: "d" });
    assert.equal(ageText(adminStrings("en").stats, 48), "2d");
    assert.equal(ageText(adminStrings("hi").stats, 5), "5 घं.");
  });

  it("stamps times in India time like the prototype", () => {
    assert.equal(stamp("en", "2026-10-16T04:42:00.000Z"), "16 OCT, 10:12");
    assert.equal(stamp("en", "2026-10-16T04:28:00.000Z", { comma: false }), "16 OCT 09:58");
    assert.equal(stamp("hi", "2026-10-16T04:42:00.000Z"), "16 अक्टू., 10:12");
  });

  it("takes the median", () => {
    assert.equal(median([]), null);
    assert.equal(median([5, 1, 3]), 3);
    assert.equal(median([1, 2, 3, 10]), 2.5);
  });

  it("builds queue links with their own query", () => {
    assert.equal(adminHref("en", "reviews", { item: "HG-RV-8830", filter: null }, "detail"), "/admin/reviews?item=HG-RV-8830#detail");
    assert.equal(adminHref("hi", "audit", { before: "2026-10-16T00:00:00.000Z" }), "/hi/admin/audit?before=2026-10-16T00%3A00%3A00.000Z");
  });
});

describe("stories and listings", () => {
  it("needs the final text and all three checks before publishing a story", () => {
    const base = { storyTitle: "A calm night shift", storyCategory: "Recovery", storyTranscript: "The night nurse explained every step to my father.", visitConfirmed: "on", privacyEdited: "on", tellerApproved: "on" };
    assert.equal(storyPublishSchema.safeParse(base).success, true);
    assert.equal(storyPublishSchema.safeParse({ ...base, tellerApproved: "" }).success, false);
    assert.equal(storyPublishSchema.safeParse({ ...base, storyCategory: "Unsorted" }).success, false);
    assert.equal(storyPublishSchema.safeParse({ ...base, storyDuration: "3:72" }).success, false);
    assert.equal(storyPublishSchema.safeParse({ ...base, storyDuration: "3:12" }).success, true);
    assert.equal(storyMeta("Recovery", new Date("2026-10-28T06:00:00Z")), "RECOVERY · OCT 2026");
  });

  it("reads the fee as rupees or unknown", () => {
    const base = { slug: "sai-medicos", status: "published", reason: "Confirmed by phone call" };
    const fee = (v: string) => {
      const r = listingEditSchema.safeParse({ ...base, consultationFee: v });
      return r.success ? r.data.consultationFee : "invalid";
    };
    assert.equal(fee(""), null);
    assert.equal(fee("₹1,200"), 1200);
    assert.equal(fee("0"), 0);
    assert.equal(fee("-5"), "invalid");
  });

  it("writes what changed in residents' words", () => {
    const before = { status: "published" as const, hoursSummary: "Open 9 am – 1 pm", consultationFee: 500, feeVerified: true, keyFact: null };
    const lines = listingChanges(before, { ...before, hoursSummary: "Open 9 am – 7 pm", consultationFee: 600 });
    assert.deepEqual(
      lines.map((l) => l.summary),
      ["Hours are now Open 9 am – 7 pm. They were Open 9 am – 1 pm.", "Consultation fee is now ₹600. It was ₹500."],
    );
    assert.deepEqual(listingChanges(before, { ...before }), []);
    assert.equal(listingChanges(before, { ...before, status: "closed" })[0].summary, "This listing is marked as closed permanently.");
  });

  it("keeps CSV cells safe", () => {
    assert.equal(csvCell('He said "hi", then left'), '"He said ""hi"", then left"');
    assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
    assert.equal(csvCell(null), "");
  });
});
