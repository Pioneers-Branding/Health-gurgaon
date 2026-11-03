// "Submit a health event": template → details → organiser → review and consent.
// The organiser's phone is private: used once to verify, never shown.

import { z } from "zod";

import { EVENT_SUBMISSION_CONSENTS, EVENT_TEMPLATES, ORGANISER_TYPES } from "@/lib/domain";

import { indianMobile, lang, mustTick, optionalText, text } from "./common";

const TEMPLATE_NAMES = EVENT_TEMPLATES.map((t) => t.name) as [string, ...string[]];

/** "2026-11-15" not in the past (India time) and within the next 12 months. */
export function isValidEventDate(value: string, now: Date = new Date()): boolean {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const day = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const check = new Date(day);
  if (check.getUTCMonth() !== +m[2] - 1 || check.getUTCDate() !== +m[3]) return false;
  const ist = new Date(now.getTime() + 330 * 60_000);
  const today = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return day >= today && day <= today + 366 * 86_400_000;
}

export const eventTemplateSchema = z.object({
  template: z.enum(TEMPLATE_NAMES, "Choose a template."),
});

export const eventDetailsSchema = z.object({
  title: text(6, 140, "Add a clear title"),
  date: z.string("Pick a date").refine((v) => isValidEventDate(v), "Pick a date"),
  time: z.string("Add a start time").regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Add a start time"),
  venue: text(2, 200, "Where is it happening?"),
  locality: text(2, 120, "Which locality?"),
  eligibility: optionalText(200),
  cost: z.enum(["Free", "Paid"], "Is it free or paid?"),
  costAmount: optionalText(40),
});

export const eventOrganiserSchema = z.object({
  orgType: z.enum(ORGANISER_TYPES, "Who’s organising?"),
  org: text(2, 160, "Organisation or group name"),
  contact: text(2, 120, "Who should we speak to?"),
  role: optionalText(80),
  phone: indianMobile("10-digit mobile number"),
});

const CONSENT_MESSAGE = "Please confirm all three to submit.";
export const eventConsentSchema = z.object({
  consent1: mustTick(CONSENT_MESSAGE),
  consent2: mustTick(CONSENT_MESSAGE),
  consent3: mustTick(CONSENT_MESSAGE),
});

/** The whole submission, checked again on submit. */
export const eventSubmissionSchema = eventTemplateSchema
  .extend(eventDetailsSchema.shape)
  .extend(eventOrganiserSchema.shape)
  .extend(eventConsentSchema.shape)
  .extend({ lang });
export type EventSubmissionInput = z.infer<typeof eventSubmissionSchema>;

/** The consent sentences the organiser ticked, stored with the event. */
export const EVENT_CONSENT_TEXT = EVENT_SUBMISSION_CONSENTS;

/** "Something wrong or cancelled? Report it" on an event page. */
export const eventReportSchema = z.object({
  eventSlug: z.string().trim().regex(/^[a-z0-9-]{1,120}$/, "Invalid reference."),
  details: text(8, 1000, "Tell us what’s wrong or changed."),
  lang,
});
