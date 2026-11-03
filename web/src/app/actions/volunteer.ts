"use server";

// Community Health Champions: the volunteer application. Needs sign-in (the coordinator calls the
// number on the account; it is never shown). Professional roles need a registration number. The
// application gets a reference ("HG-VOL-413") and appears in the person's activity.

import type { Prisma } from "@prisma/client";

import { fail, formLang, needsSignIn, ok, parseForm, type ActionState, type FieldErrors } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { db } from "@/lib/db";
import { redactPersonalData } from "@/lib/redact";
import { nextRef } from "@/lib/refs";
import { hasRegistration, PROFESSIONAL_REGISTRATION_MESSAGE, volunteerApplicationSchema } from "@/lib/validation/volunteer";

import { localizeMessage, localizeState, msg, type Lang } from "./community-messages";

export type ApplyData = { ref: string; role: string; roleSlug: string };

export async function applyToVolunteer(_prev: ActionState<ApplyData>, formData: FormData): Promise<ActionState<ApplyData>> {
  const lang: Lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(msg("signInApply", lang));

  const roleSlug = formData.get("role");
  const role = typeof roleSlug === "string" && /^[a-z0-9-]{2,80}$/.test(roleSlug) ? await db.volunteerRole.findUnique({ where: { slug: roleSlug } }) : null;
  if (!role) return fail("invalid_input", msg("roleNotFound", lang), { role: [msg("roleNotFound", lang)] });
  const regText = formData.get("registrationNumber");
  const regMissing = role.requiresRegistration && !hasRegistration({ registrationNumber: typeof regText === "string" ? regText : undefined });
  const regError = localizeMessage(PROFESSIONAL_REGISTRATION_MESSAGE, lang);

  const parsed = parseForm(volunteerApplicationSchema, formData);
  if (!parsed.ok) {
    // Show every problem at once, the registration number included.
    const state = localizeState(parsed.state, lang);
    if (regMissing && state.status === "error") {
      const fieldErrors: FieldErrors = { ...(state.fieldErrors ?? {}), registrationNumber: [regError] };
      return { ...state, fieldErrors };
    }
    return state;
  }
  if (regMissing) return fail("invalid_input", regError, { registrationNumber: [regError] });
  const input = parsed.data;

  const existing = await db.volunteerApplication.findFirst({ where: { userId: user.id, roleSlug: role.slug, status: { in: ["received", "call_scheduled", "accepted"] } }, select: { id: true } });
  if (existing) return fail("duplicate", msg("alreadyApplied", lang));

  const ref = await db.$transaction(async (tx) => {
    const ref = await nextRef("volunteer", tx);
    await tx.volunteerApplication.create({
      data: {
        ref,
        roleSlug: role.slug,
        userId: user.id,
        name: input.name,
        localityText: input.locality,
        skills: input.skills ? redactPersonalData(input.skills).text : null,
        availability: input.availability as Prisma.InputJsonValue,
        registrationNumber: role.requiresRegistration ? (input.registrationNumber ?? null) : null,
        consent: true,
      },
    });
    return ref;
  });
  expireTags(tags.activity(user.id));
  return ok(msg("applied", lang), { ref, role: role.title, roleSlug: role.slug });
}
