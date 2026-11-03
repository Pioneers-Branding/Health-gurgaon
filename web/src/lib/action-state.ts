// The one shape every Server Action returns to useActionState, plus helpers. Pure: client
// components import the type and `idle`.
//
//   // src/app/actions/thing.ts
//   "use server";
//   export async function doThing(prev: ActionState, formData: FormData): Promise<ActionState> {
//     const user = await getCurrentUser();
//     if (!user) return needsSignIn();
//     const parsed = parseForm(thingSchema, formData);
//     if (!parsed.ok) return parsed.state;
//     …mutate, writeAudit(), expireTags()…
//     return ok("Saved", { ref });
//   }
//
//   // a client component
//   const [state, action, pending] = useActionState(doThing, idle);
//   <form action={action}> … {state.status === "error" && <p role="alert">{state.message}</p>}
//
// Errors carry a stable `code` (for translations and tests) and an English `message`.

import { flattenError, type output, type ZodError, type ZodType } from "zod";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState<T = unknown> =
  | { status: "idle" }
  | { status: "success"; message: string; data?: T }
  | { status: "error"; code: string; message: string; fieldErrors?: FieldErrors; data?: T };

export const idle: ActionState<never> = { status: "idle" };

export function ok<T>(message: string, data?: T): ActionState<T> {
  return data === undefined ? { status: "success", message } : { status: "success", message, data };
}

export function fail(code: string, message: string, fieldErrors?: FieldErrors): ActionState<never> {
  return fieldErrors ? { status: "error", code, message, fieldErrors } : { status: "error", code, message };
}

/** An error that still carries data for the form, e.g. code "consent_required" with what to ask. */
export function failWith<T>(code: string, message: string, data: T): ActionState<T> {
  return { status: "error", code, message, data };
}

export function needsSignIn(message = "Please sign in with your phone number to continue."): ActionState<never> {
  return fail("sign_in_required", message);
}

export function notAllowed(message = "You don’t have permission to do that."): ActionState<never> {
  return fail("forbidden", message);
}

/** Field errors from a failed zod parse; the first message becomes the summary. */
export function fromZodError(error: ZodError, message?: string): ActionState<never> {
  const flat = flattenError(error);
  const fieldErrors = flat.fieldErrors as FieldErrors;
  const first = flat.formErrors[0] ?? Object.values(fieldErrors).find((v) => v && v.length)?.[0];
  return fail("invalid_input", message ?? first ?? "Please check the highlighted fields.", fieldErrors);
}

/** FormData → plain object. Repeated keys become arrays; files and Next's $ACTION_ keys are dropped. */
export function formDataToObject(formData: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION") || typeof value !== "string") continue;
    const existing = out[key];
    if (existing === undefined) out[key] = value;
    else out[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return out;
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; state: ActionState<never> };

/** Validate a form (FormData or a plain object) with a zod schema from src/lib/validation. */
export function parseForm<S extends ZodType>(schema: S, input: FormData | Record<string, unknown>): ParseResult<output<S>> {
  const raw = input instanceof FormData ? formDataToObject(input) : input;
  const result = schema.safeParse(raw);
  return result.success ? { ok: true, data: result.data } : { ok: false, state: fromZodError(result.error) };
}

/** The form's language (hidden input name="lang"), for bilingual messages. */
export function formLang(input: FormData | Record<string, unknown>): "en" | "hi" {
  const v = input instanceof FormData ? input.get("lang") : input.lang;
  return v === "hi" ? "hi" : "en";
}
