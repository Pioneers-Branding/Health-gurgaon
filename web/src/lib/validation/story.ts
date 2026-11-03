// "Share your story" (patient stories): upload → privacy check → consent. A video is collected
// later by a moderator; a written story is typed in the dialog (`text`, required for "Written").

import { z } from "zod";

import { redactPersonalData } from "@/lib/redact";

import { lang, mustTick, optionalText, text } from "./common";

const ALL_FOUR = "Please confirm all four to submit.";

export const STORY_CONSENTS = [
  "This is my own experience (or my family member’s, with their permission).",
  "I agree to HealthGurgaon publishing this, edited for privacy, with my first name and locality only.",
  "I haven’t been paid or offered anything by the provider for this story.",
  "I understand I can ask for it to be removed at any time.",
] as const;

/** A written story: at least 50 and at most 3000 characters (after trimming). */
export const STORY_TEXT_MIN = 50;
export const STORY_TEXT_MAX = 3000;
export const STORY_TEXT_SHORT = `Please write at least ${STORY_TEXT_MIN} characters about your experience.`;
export const STORY_TEXT_LONG = `Please keep your story under ${STORY_TEXT_MAX} characters.`;

/** "Written" needs the story itself; a video story ignores any text that was typed. */
function writtenNeedsText(value: { format: "Video" | "Written"; text?: string }, ctx: z.RefinementCtx) {
  if (value.format === "Written" && (value.text ?? "").length < STORY_TEXT_MIN) {
    ctx.addIssue({ code: "custom", path: ["text"], message: STORY_TEXT_SHORT });
  }
}

const storyFields = {
  provider: text(2, 160, "Which provider is this about?"),
  format: z.enum(["Video", "Written"]),
  /** The written story (format "Written" only). Personal data is removed on the server before
   * it is stored (Story.transcript). */
  text: optionalText(STORY_TEXT_MAX, STORY_TEXT_LONG),
};

/** Step 1 (Upload): the provider, the format and, for a written story, the text. */
export const storyProviderSchema = z.object(storyFields).superRefine(writtenNeedsText);

export const storySubmissionSchema = z
  .object({
    ...storyFields,
    consent1: mustTick(ALL_FOUR),
    consent2: mustTick(ALL_FOUR),
    consent3: mustTick(ALL_FOUR),
    consent4: mustTick(ALL_FOUR),
    lang,
  })
  .superRefine(writtenNeedsText)
  .transform((v) => ({ ...v, text: v.format === "Written" ? v.text : undefined }));
export type StorySubmissionInput = z.infer<typeof storySubmissionSchema>;

/** What goes in Story.transcript when the story is sent: a written story with phone numbers,
 * emails and ID numbers removed; nothing for a video (a moderator adds its transcript later). */
export function storyTranscript(input: Pick<StorySubmissionInput, "format" | "text">): string {
  return input.format === "Written" && input.text ? redactPersonalData(input.text).text.trim() : "";
}
