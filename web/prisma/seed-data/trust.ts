// Reports, disputes, claims, the audit log and listing changes.
// Sources: "Health Gurgaon Admin and Mobile.dc.html" (queue items HG-2041 and CL-0311, the audit
// log), "Health Gurgaon Content and Trust.dc.html" (recent dispute outcomes, the corrections log),
// "Health Gurgaon Account.dc.html" (the sample resident's reports HG-3107, HG-2041, HG-1987, the
// concern HG-CC-0112, dispute HG-DS-0402 and the "changed since you saved it" facts) and the
// Find Care confirmation (ref HG-3107). The private text behind other published dispute outcomes
// isn't in the prototype; those rows say so.
//
// Dates follow the latest prototype (Account, 27 Oct 2026): HG-2041, still waiting in the Admin
// prototype's 16 Oct queue, has since been answered ("Couldn’t verify", 20 Oct), so the Admin
// reports queue now holds HG-3107.

import type { SeedAudit, SeedClaim, SeedDispute, SeedListingChange, SeedReport } from "./types";

export const REPORTS: SeedReport[] = [
  {
    ref: "HG-3107",
    type: "fact",
    targetKind: "provider",
    target: "prakash-path-labs",
    targetLabel: "Prakash Path Labs, Sector 56 market",
    field: "timings",
    details: "The board outside now says they close at 6 pm on weekdays.",
    firsthand: true,
    reporter: "resident",
    status: "checking",
    created: "2026-10-26 18:25",
    timeline: [
      { status: "received", at: "2026-10-26 18:25", note: "The listing now says “hours being re-checked”." },
      { status: "checking", at: "2026-10-27 10:15", note: "An editor is calling the lab manager to confirm." },
    ],
    autoChecks: [
      { ok: true, text: "Factual field, not an allegation" },
      { ok: true, text: "Reporter has 1 report confirmed, 1 couldn’t be verified" },
    ],
    privateNote: "Reporter: Sector 57 resident, verified by OTP",
  },
  {
    ref: "HG-2041",
    type: "fact",
    targetKind: "provider",
    target: "dr-ananya-rao",
    targetLabel: "Little Steps Clinic, Sushant Lok 1 (Dr. Ananya Rao)",
    field: "timings",
    details: "The clinic now closes at 7 pm on Saturdays.",
    firsthand: true,
    reporter: "resident",
    status: "no_change",
    resolution: "The clinic says Saturday evenings are a trial for now, so we kept the checked hours (9 am – 1 pm). We’ll ask again on 16 Nov.",
    created: "2026-10-16 09:05",
    resolved: "2026-10-20 16:00",
    timeline: [
      { status: "received", at: "2026-10-16 09:05" },
      { status: "checking", at: "2026-10-19 11:30", note: "Phone call with the clinic reception." },
      {
        status: "no_change",
        at: "2026-10-20 16:00",
        note: "The clinic says Saturday evenings are a trial for now, so we kept the checked hours (9 am – 1 pm). We’ll ask again on 16 Nov.",
      },
    ],
    autoChecks: [
      { ok: true, text: "Factual field, not an allegation" },
      { ok: true, text: "Reporter has 3 accepted reports" },
    ],
    privateNote: "Reporter email on file",
  },
  {
    ref: "HG-1987",
    type: "fact",
    targetKind: "provider",
    target: "sai-medicos",
    targetLabel: "Sai Medicos, Sector 56",
    field: "timings",
    details: "They’re open all night now, not just till midnight.",
    firsthand: true,
    reporter: "resident",
    status: "resolved",
    resolution: "“Open 24 hours” confirmed and the listing updated.",
    created: "2026-10-06 22:40",
    resolved: "2026-10-09 12:30",
    timeline: [
      { status: "received", at: "2026-10-06 22:40" },
      { status: "checking", at: "2026-10-08 23:30", note: "Phone call, and a Champion visited at night." },
      { status: "resolved", at: "2026-10-09 12:30", note: "“Open 24 hours” confirmed and the listing updated." },
    ],
  },
  {
    ref: "HG-CC-0112",
    type: "complaint",
    targetKind: "provider",
    target: "clear-scan-diagnostics",
    targetLabel: "Clear Scan Diagnostics, Sector 50",
    field: "billing",
    details: "I was charged twice for one ultrasound, and the desk wouldn’t give me a receipt.",
    firsthand: true,
    reporter: "resident",
    status: "resolved",
    resolution: "Noted on the listing’s private file. We can’t investigate billing or treatment ourselves; the offices below can.",
    created: "2026-10-02 13:20",
    resolved: "2026-10-09 15:00",
    timeline: [
      { status: "received", at: "2026-10-02 13:20" },
      { status: "checking", at: "2026-10-06 10:00", note: "Read by the separate review team. Not the editors who correct listings." },
      { status: "resolved", at: "2026-10-09 15:00", note: "Noted on the listing’s private file. We can’t investigate billing or treatment ourselves; the offices below can." },
    ],
    privateNote: "Billing concern. Never published; the provider is not told who raised it.",
  },
];

/** "Changed since you saved it" and locality alerts: changes to a listing's facts. */
export const LISTING_CHANGES: SeedListingChange[] = [
  { provider: "prakash-path-labs", field: "hours", summary: "Sunday hours are now 7 am – 1 pm. They were 7 – 11 am.", source: "the lab manager, by phone", at: "2026-10-09 12:00" },
  { provider: "sai-medicos", field: "hours", summary: "Now open 24 hours. It used to close at midnight.", source: "a phone call, and a Champion’s visit at night", reportRef: "HG-1987", at: "2026-10-09 12:30" },
];

export const DISPUTES: SeedDispute[] = [
  {
    ref: "HG-DS-0402",
    target: "mention",
    itemLabel: "Mentions counted for a dentist in Sector 56",
    filerRole: "resident",
    filer: "resident",
    reason: "different",
    details: "Some mentions were about a different dentist with a similar name.",
    status: "upheld",
    outcomeText: "Three mentions were about a different dentist with a similar name. They were moved to the right profile and both scores recalculated.",
    outcomePublished: "2026-10-22 17:00",
    created: "2026-10-15 10:20",
  },
  {
    ref: "HG-DS-0405",
    target: "ranking",
    topList: "diagnostic-labs",
    itemLabel: "Top diagnostic labs, Gurugram 2026",
    filerRole: "resident",
    reason: "conflict",
    details: "Sample dispute: the original text is private and not part of the prototype.",
    status: "partly_upheld",
    outcomeText: "Two of the five reviews flagged came from undeclared staff and were removed. The other three met our policy, and the lab’s position didn’t change.",
    outcomePublished: "2026-10-17",
    created: "2026-10-15 16:30",
  },
  {
    ref: "HG-DS-0398",
    target: "ranking",
    provider: "aravali-multispeciality-hospital",
    topList: "hospitals",
    itemLabel: "Top hospitals by patient experience, Gurugram 2026 · #2",
    filerRole: "other",
    reason: "method",
    details: "Sample dispute: the original text is private and not part of the prototype.",
    status: "not_upheld",
    outcomeText: "The dispute said sponsorship had lifted this hospital. Sponsorship isn’t part of the score; an editor re-checked all four parts against the method and found no error.",
    outcomePublished: "2026-10-09",
    created: "2026-10-03 10:15",
  },
  {
    ref: "HG-DS-0391",
    target: "mention",
    itemLabel: "Neighbour ranking · physiotherapists, Sohna Road",
    filerRole: "resident",
    reason: "method",
    details: "Sample dispute: the original text is private and not part of the prototype.",
    status: "upheld",
    outcomeText: "A physiotherapist was ranked on mentions from only 4 different residents; the minimum is 5. The profile now shows “Not enough neighbour discussion yet”.",
    outcomePublished: "2026-10-03",
    created: "2026-09-28 09:40",
  },
];

export const CLAIMS: SeedClaim[] = [
  {
    ref: "HG-CL-0311",
    provider: "dr-vikram-sethi",
    claimant: "claimant",
    role: "doctor",
    registrationNumber: "HR-PT-XXXX (sample)",
    otpVerified: true,
    status: "pending",
    autoChecks: [
      { ok: true, text: "OTP matched clinic number" },
      { ok: false, text: "Registration number not yet matched on council register" },
    ],
    privateNote: "Claimant contact on file",
    created: "2026-10-13 12:00",
  },
  {
    ref: "HG-CL-0287",
    provider: "little-steps-childrens-clinic",
    claimant: "provider",
    role: "staff",
    otpVerified: true,
    status: "approved",
    decisionReason: "Registration matched, OTP passed",
    decided: "2026-09-02 15:20",
    created: "2026-08-30 11:05",
  },
];

/** Admin → Audit log (prototype rows, newest first). */
export const AUDIT: SeedAudit[] = [
  { at: "2026-10-16 09:58", actorLabel: "S. Bansal", actor: "editor", actorRole: "editor", action: "event.approve", targetKind: "event", targetLabel: "EV-5170", reason: "organiser confirmed by call" },
  { at: "2026-10-16 09:40", actorLabel: "R. Mehta", actor: "moderator", actorRole: "moderator", action: "review.reject", targetKind: "review", targetLabel: "RV-8819", reason: "contains patient details" },
  { at: "2026-10-15 18:12", actorLabel: "Admin", actor: "admin", actorRole: "admin", action: "role.change", targetKind: "user", targetLabel: "A. Dutta", reason: "Changed role of A. Dutta to Moderator" },
  { at: "2026-10-15 17:03", actorLabel: "S. Bansal", actor: "editor", actorRole: "editor", action: "provider.update_hours", targetKind: "provider", targetLabel: "Sai Medicos", reason: "source: phone call" },
  { at: "2026-10-15 11:21", actorLabel: "R. Mehta", actor: "moderator", actorRole: "moderator", action: "listing.merge", targetKind: "provider", targetLabel: "Smile Square Dental", reason: "Merged duplicate listing" },
];
