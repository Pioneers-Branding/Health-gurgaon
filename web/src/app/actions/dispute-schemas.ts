// Pure helpers for the four-step dispute form (/dispute/[kind]/[slug]): the values carried from
// step to step, and which schema checks each step (src/lib/validation/dispute.ts). The form is
// one <form> whose Server Action answers with the next step, so it also works without JavaScript.

import type { FieldErrors } from "@/lib/action-state";
import { disputeStep1Schema, disputeStep2Schema, disputeStep3Schema, disputeStep4Schema } from "@/lib/validation/dispute";

export const DISPUTE_STEPS = 4;

export const DISPUTE_VALUE_KEYS = ["kind", "role", "connection", "itemId", "reason", "details", "link", "links", "email", "declare"] as const;
export type DisputeValueKey = (typeof DISPUTE_VALUE_KEYS)[number];
export type DisputeValues = Record<DisputeValueKey, string>;

export type DisputeTargetKind = "ranking" | "mention" | "review";

/** One thing on this provider that can be disputed (step 2 cards). */
export type DisputeItem = {
  /** Top-list entry id (ranking) or the provider's slug (mentions, or "not in a top list"). */
  id: string;
  kind: "ranking" | "mention";
  listSlug: string | null;
  listTitle: string | null;
  rank: number | null;
  of: number | null;
  score: number | null;
  reviewCount: number | null;
  listUpdatedAt: string | null;
  /** Mentions: "ranked" | "frozen" | "not_enough"; null for rankings. */
  mentionStatus: string | null;
  recommendedBy: number | null;
  themes: { label: string; count: number }[];
};

export function emptyDisputeValues(initial: Partial<DisputeValues> = {}): DisputeValues {
  const v = Object.fromEntries(DISPUTE_VALUE_KEYS.map((k) => [k, ""])) as DisputeValues;
  for (const k of DISPUTE_VALUE_KEYS) if (typeof initial[k] === "string") v[k] = initial[k] as string;
  return v;
}

/** Values posted by the form (strings only; a ticked checkbox posts "on"). */
export function readDisputeValues(raw: Record<string, unknown>): DisputeValues {
  const v = emptyDisputeValues();
  for (const k of DISPUTE_VALUE_KEYS) {
    const value = raw[k];
    if (typeof value === "string") v[k] = value.slice(0, 4000);
  }
  return v;
}

export function clampStep(step: unknown): number {
  const n = typeof step === "string" ? Number.parseInt(step, 10) : typeof step === "number" ? step : 1;
  return Number.isFinite(n) ? Math.min(DISPUTE_STEPS, Math.max(1, Math.trunc(n))) : 1;
}

/** Field errors for one step, or null when the step is complete. `itemIds` are the items this
 * provider can be disputed on for the chosen kind. */
export function checkDisputeStep(step: number, v: DisputeValues, itemIds: readonly string[] = []): FieldErrors | null {
  const errors: FieldErrors = {};
  const add = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) => {
    if (result.success || !result.error) return;
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= [issue.message];
    }
  };
  if (step === 1) add(disputeStep1Schema.safeParse({ kind: v.kind, role: v.role, connection: v.connection }));
  if (step === 2) {
    add(disputeStep2Schema.safeParse({ itemId: v.itemId, reason: v.reason, details: v.details, link: v.link }));
    if (!errors.itemId && itemIds.length && !itemIds.includes(v.itemId)) errors.itemId = ["Choose what you’re disputing."];
  }
  if (step === 3) add(disputeStep3Schema.safeParse({ links: v.links }));
  if (step === 4) add(disputeStep4Schema.safeParse({ email: v.email, declare: v.declare }));
  return Object.keys(errors).length ? errors : null;
}

/** The first step (1-4) with a problem, checking every step in order; null when all are fine. */
export function firstInvalidStep(v: DisputeValues, itemIds: readonly string[] = []): { step: number; errors: FieldErrors } | null {
  for (let step = 1; step <= DISPUTE_STEPS; step++) {
    const errors = checkDisputeStep(step, v, itemIds);
    if (errors) return { step, errors };
  }
  return null;
}
