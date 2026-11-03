// "Report incorrect information": facts go to the editor queue; concerns about care or conduct
// take the confidential path and are never published; missing listings are suggestions.

import { z } from "zod";

import { CONCERN_TOPICS, REPORT_FIELDS, type ConcernTopic } from "@/lib/domain";

import { checkbox, lang, optionalEmail, optionalText, recordId, text } from "./common";

const FIELD_KEYS = REPORT_FIELDS.map((f) => f.key) as [string, ...string[]];
export const REPORT_TARGET_KINDS = ["provider", "event", "article", "guide", "thread", "post", "review", "locality", "story", "page"] as const;

/** A fact is wrong (also the "Suggest a correction" dialog on profiles). */
export const factReportSchema = z.object({
  targetKind: z.enum(REPORT_TARGET_KINDS).optional(),
  targetId: recordId.optional(),
  item: text(2, 200, "Which listing is this about?"),
  field: z.enum(FIELD_KEYS, "Choose what’s wrong."),
  details: text(8, 1500, "Tell us what’s correct."),
  firsthand: checkbox,
  email: optionalEmail,
  lang,
});
export type FactReportInput = z.infer<typeof factReportSchema>;

/** A concern about care or conduct, shared confidentially with editors. */
export const complaintSchema = z.object({
  targetKind: z.enum(REPORT_TARGET_KINDS).optional(),
  targetId: recordId.optional(),
  item: text(2, 200, "Which provider is this about?"),
  /** Optional: treatment | behaviour | billing | other (CONCERN_TOPICS), stored in Report.field. */
  topic: z.preprocess((v) => (v === "" ? undefined : v), z.enum(CONCERN_TOPICS.map((t) => t.key) as [ConcernTopic, ...ConcernTopic[]]).optional()),
  details: text(20, 3000, "Please describe what happened in a few sentences."),
  email: optionalEmail,
  lang,
});

/** Something is missing: a provider we haven't listed. */
export const missingListingSchema = z.object({
  name: text(2, 160, "Name of the doctor, clinic, lab or chemist."),
  locality: text(2, 120, "Which locality?"),
  details: optionalText(1000),
  email: optionalEmail,
  lang,
});

/** "Suggest “…” as a locality" from the locality index. */
export const localitySuggestionSchema = z.object({
  query: text(2, 80, "Type the locality name."),
  lang,
});
