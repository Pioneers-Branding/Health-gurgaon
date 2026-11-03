// Admin & moderation: every decision needs a reason, which goes into the audit log.

import { z } from "zod";

import { ADMIN_QUEUES, ROLES } from "@/lib/auth/permissions";

import { recordId, text } from "./common";

export const MODERATION_DECISIONS = ["approve", "reject", "request_info", "escalate"] as const;
export type ModerationDecision = (typeof MODERATION_DECISIONS)[number];

/** Reasons offered per queue (prototype: "Reason (required, shown in audit log)"). */
export const MODERATION_REASONS: Record<string, readonly string[]> = {
  reviews: ["Genuine experience, meets policy", "Contains personal or medical details", "Unsupported allegation / defamatory", "Suspected fake or conflicted review"],
  reports: ["Confirmed with provider", "Confirmed with primary source", "Could not verify", "Duplicate report"],
  events: ["Organiser confirmed by call", "Organiser unreachable", "Promotional, not a health event", "Unsafe or misleading claims"],
  claims: ["Registration matched, OTP passed", "Registration mismatch", "Insufficient authorisation"],
  community: ["Within guidelines", "Medical advice / unsafe", "Harassment or personal attack", "Spam or undisclosed promotion"],
  disputes: ["Upheld", "Partly upheld", "Not upheld", "Needs more evidence"],
};

export const moderationDecisionSchema = z.object({
  queue: z.enum(ADMIN_QUEUES),
  itemId: recordId,
  decision: z.enum(MODERATION_DECISIONS, "Choose an action."),
  reason: text(3, 300, "Choose a reason first. It’s recorded in the audit log."),
  note: z.string().trim().max(1000).optional(),
});
export type ModerationDecisionInput = z.infer<typeof moderationDecisionSchema>;

/** "Reveal (logged)": viewing a reporter's private contact details. */
export const revealPrivateSchema = z.object({
  queue: z.enum(ADMIN_QUEUES),
  itemId: recordId,
});

export const changeRoleSchema = z.object({
  userId: recordId,
  role: z.enum(ROLES, "Choose a role."),
  reason: text(3, 300, "Say why the role is changing."),
});
