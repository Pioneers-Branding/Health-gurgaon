// Community Health Champions: the volunteer application. Professional roles need a registration
// number (the action checks the chosen role's requiresRegistration flag).

import { z } from "zod";

import { VOLUNTEER_AVAILABILITY } from "@/lib/domain";

import { lang, mustTick, optionalText, slug, stringList, text } from "./common";

const NAME_LOCALITY = "Please add your name and locality.";

export const volunteerApplicationSchema = z.object({
  role: slug,
  name: text(2, 120, NAME_LOCALITY),
  locality: text(2, 120, NAME_LOCALITY),
  skills: optionalText(500),
  availability: stringList.pipe(z.array(z.enum(VOLUNTEER_AVAILABILITY)).max(VOLUNTEER_AVAILABILITY.length)),
  registrationNumber: optionalText(40),
  consent: mustTick("Please confirm the code of conduct."),
  lang,
});
export type VolunteerApplicationInput = z.infer<typeof volunteerApplicationSchema>;

export const PROFESSIONAL_REGISTRATION_MESSAGE = "Professional roles need a registration number.";

/** For roles with requiresRegistration. */
export function hasRegistration(input: Pick<VolunteerApplicationInput, "registrationNumber">): boolean {
  return (input.registrationNumber?.trim().length ?? 0) >= 4;
}
