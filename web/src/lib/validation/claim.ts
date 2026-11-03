// "Claim your profile": find the listing, say who you are, confirm with a code sent to the
// clinic phone on record.

import { z } from "zod";

import { CLAIM_ROLES } from "@/lib/domain";

import { lang, slug, text } from "./common";

export const claimSearchSchema = z.object({
  query: text(2, 80, "Type your name or clinic name."),
});

export const claimDetailsSchema = z.object({
  providerSlug: slug,
  role: z.enum(CLAIM_ROLES, "Tell us who’s claiming."),
  registrationNumber: text(4, 40, "Enter your registration number."),
  lang,
});
export type ClaimDetailsInput = z.infer<typeof claimDetailsSchema>;

export const claimCodeSchema = z.object({
  providerSlug: slug,
  code: z
    .string("Enter the 6-digit code.")
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code.")),
  lang,
});
