// Building blocks for form schemas. Pure (zod only): client components may import schemas for
// instant feedback, and Server Actions must always parse again on the server.
//
// FormData arrives as strings (checkboxes as "on", repeated fields as arrays): the helpers here
// turn that into typed values. Messages are the prototype's wording where it has one.

import { z } from "zod";

import { normalizeIndianMobile } from "@/lib/auth/phone";

/** Required text, trimmed, with min/max length. */
export function text(min: number, max: number, minMessage: string, maxMessage?: string) {
  return z
    .string(minMessage)
    .trim()
    .min(min, minMessage)
    .max(max, maxMessage ?? `Please keep this under ${max} characters.`);
}

/** Optional text: "" becomes undefined. */
export function optionalText(max: number, maxMessage?: string) {
  return z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .trim()
      .max(max, maxMessage ?? `Please keep this under ${max} characters.`)
      .optional(),
  );
}

/** A checkbox: "on" / "true" / "1" / true → true, anything else → false. */
export const checkbox = z.preprocess((v) => v === true || v === "on" || v === "true" || v === "1" || v === "yes", z.boolean());

/** A checkbox that must be ticked. */
export function mustTick(message: string) {
  return checkbox.refine((v) => v === true, message);
}

/** A field that may repeat (several checkboxes with one name): always an array of strings. */
export const stringList = z.preprocess(
  (v) => (v === undefined || v === null || v === "" ? [] : Array.isArray(v) ? v : [v]),
  z.array(z.string().trim().min(1)),
);

/** URL slugs ("dr-ananya-rao"). */
export const slug = z
  .string("Missing reference.")
  .trim()
  .max(120, "Invalid reference.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid reference.");

/** Slugs, cuids and nanoids: anything we put in a URL or a hidden input to point at a row. */
export const recordId = z
  .string("Missing reference.")
  .trim()
  .min(1, "Missing reference.")
  .max(120, "Invalid reference.")
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid reference.");

/** An Indian mobile, normalised to "+91XXXXXXXXXX". */
export function indianMobile(message = "Enter a 10-digit mobile number.") {
  return z.string(message).transform((value, ctx) => {
    const phone = normalizeIndianMobile(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return phone;
  });
}

/** Optional email: "" becomes undefined. */
export const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v),
  z.email("Enter a valid email address, or leave it empty.").max(200).optional(),
);

/** The page language, sent as a hidden input so actions can answer in Hindi. */
export const lang = z.enum(["en", "hi"]).catch("en");

/** A same-site path to return to after an action ("/gurgaon/doctor/dr-ananya-rao"). */
export const nextPath = z.preprocess(
  (v) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v.slice(0, 500) : undefined),
  z.string().optional(),
);

/** Enum from a readonly list of values, with one message for anything else. */
export function oneOf<const T extends readonly [string, ...string[]]>(values: T, message: string) {
  return z.enum(values, message);
}
