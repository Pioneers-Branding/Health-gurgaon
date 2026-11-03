// The audit log: every moderator, editor and admin action, who made it and why. Server-only.
// Rows are only ever inserted; there is no update or delete API.
//
//   await writeAudit({ actor: user, action: "review.approve", target: { kind: "review", id, label: ref },
//                      reason: "Genuine experience, meets policy" }, tx);
//
// Pass the transaction client when the change itself happens in a transaction, so the log and
// the change commit together.

import "server-only";

import type { Prisma } from "@prisma/client";

import type { SessionUser } from "@/lib/auth/types";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { db, type DbClient } from "@/lib/db";

/** Common action names. Use "<entity>.<verb>"; new ones are fine, keep them stable. */
export const AUDIT_ACTIONS = {
  reviewApprove: "review.approve",
  reviewReject: "review.reject",
  reviewRequestChanges: "review.request_changes",
  reviewEscalate: "review.escalate",
  reportResolve: "report.resolve",
  reportReject: "report.reject",
  eventApprove: "event.approve",
  eventReject: "event.reject",
  eventCancel: "event.cancel",
  claimApprove: "claim.approve",
  claimReject: "claim.reject",
  disputeDecide: "dispute.decide",
  flagResolve: "flag.resolve",
  postHide: "post.hide",
  providerUpdate: "provider.update",
  providerVerify: "provider.verify",
  providerHours: "provider.update_hours",
  listingMerge: "listing.merge",
  listingClose: "listing.close",
  societyVerify: "society.verify",
  roleChange: "role.change",
  privateReveal: "private.reveal",
  accountDelete: "account.delete",
  accountExport: "account.export",
  consentAdmin: "consent.admin_change",
} as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditEntry = {
  actor: SessionUser | "system";
  action: AuditAction | (string & {});
  target?: { kind: string; id?: string | null; label?: string | null };
  /** Required for moderation decisions ("Reason (required, shown in audit log)"). */
  reason?: string | null;
  details?: Record<string, unknown>;
};

function actorLabel(actor: SessionUser | "system"): string {
  if (actor === "system") return "System";
  return actor.displayName?.trim() || `${ROLE_LABELS[actor.role]} ${actor.phoneMasked.slice(-3)}`;
}

export async function writeAudit(entry: AuditEntry, client: DbClient = db): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: entry.actor === "system" ? null : entry.actor.id,
      actorLabel: actorLabel(entry.actor),
      actorRole: entry.actor === "system" ? "system" : entry.actor.role,
      action: entry.action,
      targetKind: entry.target?.kind ?? null,
      targetId: entry.target?.id ?? null,
      targetLabel: entry.target?.label ?? null,
      reason: entry.reason ?? null,
      details: (entry.details as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });
}
