// Pure schemas for the admin Server Actions (src/app/actions/admin.ts) that the shared
// moderation schemas (src/lib/validation/moderation.ts) don't cover: completing a story before
// publishing it, recording a listing check, editing a listing, and giving someone a role by
// phone. No server imports: the forms may use them too, and the actions parse again.

import { z } from "zod";

import { ROLES } from "@/lib/auth/permissions";
import { DURATION_PATTERN, LISTING_REASONS, ROLE_REASONS, STORY_CATEGORY_VALUES, VERIFY_REASONS } from "@/lib/data/admin-format";
import { checkbox, indianMobile, lang, mustTick, optionalText, slug, text } from "@/lib/validation/common";

const ALL_THREE = "Tick all three checks before publishing.";

/** "Publish" in the stories queue: the final, privacy-edited version the teller approved. */
export const storyPublishSchema = z.object({
  storyTitle: text(5, 140, "Write the published title (at least 5 characters)."),
  storyCategory: z.enum(STORY_CATEGORY_VALUES, "Choose a topic."),
  storyTranscript: text(20, 4000, "Write the caption or story text (at least 20 characters)."),
  storyDuration: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v),
    z.string().regex(DURATION_PATTERN, "Write the length as minutes:seconds, like 3:12.").optional(),
  ),
  storyMeta: optionalText(80),
  visitConfirmed: mustTick(ALL_THREE),
  privacyEdited: mustTick(ALL_THREE),
  tellerApproved: mustTick(ALL_THREE),
});
export type StoryPublishInput = z.infer<typeof storyPublishSchema>;

/** Verification desk: "Record check" on one listing. */
export const recordCheckSchema = z.object({
  slug,
  reason: z.enum(VERIFY_REASONS, "Choose how you checked."),
  source: optionalText(200),
  lang,
});

const fee = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.replace(/[₹,\s]/g, "")) : v),
  z.union([z.null(), z.coerce.number("Write the fee in rupees, or leave it empty.").int("Write the fee in whole rupees.").min(0, "The fee can’t be negative.").max(100_000, "Check the fee.")]),
);

/** Listings editor: the facts an editor may change on a listing, with a reason and a source. */
export const listingEditSchema = z.object({
  slug,
  status: z.enum(["published", "hidden", "closed"], "Choose a status."),
  hoursSummary: optionalText(120),
  hoursSource: optionalText(160),
  consultationFee: fee,
  feeVerified: checkbox,
  keyFact: optionalText(80),
  reason: z.enum(LISTING_REASONS, "Choose a reason first. It’s recorded in the audit log."),
  source: optionalText(200),
  lang,
});
export type ListingEditInput = z.infer<typeof listingEditSchema>;

/** Admins: give someone who has signed in once a role, by their number. */
export const grantRoleSchema = z.object({
  phone: indianMobile(),
  role: z.enum(ROLES, "Choose a role."),
  reason: z.enum(ROLE_REASONS, "Choose a reason."),
  lang,
});

/** Admins: change a listed staff member's role. */
export const roleChangeSchema = z.object({
  userId: z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9_-]+$/, "Invalid reference."),
  role: z.enum(ROLES, "Choose a role."),
  reason: z.enum(ROLE_REASONS, "Choose a reason."),
  lang,
});

/** One CSV cell: quoted when needed, and never starting a formula. */
export function csvCell(value: string | null | undefined): string {
  let s = value ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
