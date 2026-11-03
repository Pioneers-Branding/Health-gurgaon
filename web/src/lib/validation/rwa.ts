// Healthy Neighbourhoods: registering a society, messaging an organiser, and the society
// dashboard's volunteer decisions. Contact details stay private.

import { z } from "zod";

import { CONTACT_CHANNELS, SOCIETY_TYPES } from "@/lib/domain";

import { lang, mustTick, optionalText, recordId, slug, text } from "./common";

const REQUIRED = "Please fill in the society name, locality and contact.";

export const rwaRegistrationSchema = z.object({
  name: text(3, 160, REQUIRED),
  locality: text(2, 120, REQUIRED),
  contact: text(2, 120, REQUIRED),
  role: optionalText(80),
  groupType: z.enum(SOCIETY_TYPES, "Choose the type of group."),
  channel: z.enum(CONTACT_CHANNELS, "Choose how we should contact you."),
  consent: mustTick("Please confirm you’re authorised."),
  lang,
});
export type RwaRegistrationInput = z.infer<typeof rwaRegistrationSchema>;

/** "Message the organiser": forwarded privately, neither side's number is shown. */
export const contactOrganiserSchema = z.object({
  societySlug: slug,
  message: text(10, 1000, "Write a short message first."),
  lang,
});

export const volunteerOfferDecisionSchema = z.object({
  societySlug: slug,
  offerId: recordId,
  decision: z.enum(["accepted", "declined"]),
});

/** A completed-activity report: counts only, never attendee names or health data. */
export const initiativeReportSchema = z.object({
  societySlug: slug,
  eventSlug: slug,
  summary: text(10, 300, "Describe what happened in a sentence (counts only, no names)."),
});
