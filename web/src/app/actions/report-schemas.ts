// Pure helpers for the report form (/report/[kind]/[slug]) and the guide's "Suggest a correction":
// which facts can be reported for each kind of item, the fact schema for items without listing
// fields (articles, threads, guides). "Report" under a single review uses reviewFlagSchema from
// src/lib/validation/review.ts. Built on src/lib/validation/report.ts. No server imports: client
// components use these too, and the Server Actions parse again.

import { REPORT_FIELDS, type ReportField } from "@/lib/domain";
import { isProviderKind, isReportableKind, type ReportableKind } from "@/lib/routes";
import { factReportSchema } from "@/lib/validation/report";

/** Everything the report form can be about: the reportable kinds, plus guides (their
 * "Suggest a correction" form posts here too). */
export type ReportFormKind = ReportableKind | "guide";

export function isReportFormKind(value: string): value is ReportFormKind {
  return isReportableKind(value) || value === "guide";
}

const EVENT_FIELDS: ReportField[] = ["timings", "address", "fee", "closed", "duplicate"];

/** The "What's wrong?" chips for an item. Listings get all eight; events the ones an event has;
 * articles, threads and guides none (the explanation says what's wrong). */
export function reportFieldsFor(kind: ReportFormKind): ReportField[] {
  if (isProviderKind(kind)) return REPORT_FIELDS.map((f) => f.key);
  if (kind === "event") return EVENT_FIELDS;
  return [];
}

/** A fact report about an article, a thread or a guide: no listing field to choose. */
export const factReportWithoutFieldSchema = factReportSchema.omit({ field: true });
