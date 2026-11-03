// "Dispute a ranking or a mention": four steps, each validated on its own, then the whole form
// again on submit. A single review isn't disputed here: it goes through the review policy.

import { z } from "zod";

import { DISPUTE_MIN_DETAILS, DISPUTE_REASONS, DISPUTE_ROLES } from "@/lib/domain";

import { lang, mustTick, optionalEmail, optionalText, recordId, text } from "./common";

export const disputeStep1Schema = z
  .object({
    kind: z.enum(["ranking", "mention"], "Choose what you’re disputing."),
    role: z.enum(DISPUTE_ROLES, "Tell us who you are."),
    connection: optionalText(160),
  })
  .refine((v) => v.role !== "other" || (v.connection?.trim().length ?? 0) >= 3, {
    message: "Tell us your connection to this provider.",
    path: ["connection"],
  });

export const disputeStep2Schema = z.object({
  itemId: recordId,
  reason: z.enum(DISPUTE_REASONS, "Choose a reason."),
  details: text(DISPUTE_MIN_DETAILS, 3000, `Tell us a little more: at least ${DISPUTE_MIN_DETAILS} characters.`),
  link: optionalText(500),
});

export const disputeStep3Schema = z.object({
  links: optionalText(1500),
});

export const disputeStep4Schema = z.object({
  email: optionalEmail,
  declare: mustTick("Please confirm the declaration."),
});

/** The full dispute, checked again on submit. `itemId` is a top-list entry id (ranking) or a
 * provider slug (mention). */
export const disputeSchema = z
  .object({
    kind: z.enum(["ranking", "mention"], "Choose what you’re disputing."),
    role: z.enum(DISPUTE_ROLES, "Tell us who you are."),
    connection: optionalText(160),
    itemId: recordId,
    reason: z.enum(DISPUTE_REASONS, "Choose a reason."),
    details: text(DISPUTE_MIN_DETAILS, 3000, `Tell us a little more: at least ${DISPUTE_MIN_DETAILS} characters.`),
    link: optionalText(500),
    links: optionalText(1500),
    email: optionalEmail,
    declare: mustTick("Please confirm the declaration."),
    lang,
  })
  .refine((v) => v.role !== "other" || (v.connection?.trim().length ?? 0) >= 3, {
    message: "Tell us your connection to this provider.",
    path: ["connection"],
  });
export type DisputeInput = z.infer<typeof disputeSchema>;

/** Split pasted links into a clean list (http/https only, at most 10). */
export function parseLinks(...values: (string | undefined)[]): string[] {
  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .flatMap((v) => (v as string).split(/[\s,]+/))
        .map((v) => v.trim())
        .filter((v) => /^https?:\/\/\S+$/i.test(v)),
    ),
  ).slice(0, 10);
}
