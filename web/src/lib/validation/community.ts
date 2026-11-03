// "Ask your neighbourhood": questions, replies, helpful reactions and reports of posts.
// Phone numbers and emails are removed on the server; medical-advice questions are blocked and
// urgent ones show the emergency message first (src/lib/content-safety.ts).

import { z } from "zod";

import { detectAdviceRequest } from "@/lib/content-safety";
import { ANSWER_MIN_LENGTH, FORUM_TOPICS, QUESTION_MIN_LENGTH } from "@/lib/domain";

import { checkbox, lang, optionalText, recordId, text } from "./common";

const TOPIC_SLUGS = FORUM_TOPICS.map((t) => t.slug) as [string, ...string[]];

export const questionSchema = z
  .object({
    title: text(QUESTION_MIN_LENGTH, 200, "Please write your question in a full sentence."),
    body: optionalText(2000),
    topic: z.enum(TOPIC_SLUGS, "Choose a topic."),
    locality: z.string().trim().regex(/^[a-z0-9-]{2,60}$/, "Choose a locality."),
    anonymous: checkbox,
    lang,
  })
  .refine((v) => !detectAdviceRequest(`${v.title} ${v.body ?? ""}`), {
    message: "Please rephrase so you’re not asking for medical advice.",
    path: ["title"],
  });
export type QuestionInput = z.infer<typeof questionSchema>;

export const answerSchema = z.object({
  threadId: recordId,
  body: text(ANSWER_MIN_LENGTH, 2000, "Write a reply first."),
  lang,
});
export type AnswerInput = z.infer<typeof answerSchema>;

export const helpfulSchema = z.object({ postId: recordId });

export const markBestSchema = z.object({ threadId: recordId, postId: recordId });

export const resolveThreadSchema = z.object({ threadId: recordId, resolved: checkbox });

export const FLAG_REASONS = ["Medical advice / unsafe", "Harassment or personal attack", "Spam or undisclosed promotion", "Personal data", "Other"] as const;

export const flagContentSchema = z.object({
  targetKind: z.enum(["post", "thread", "review", "story"]),
  targetId: recordId,
  reason: z.enum(FLAG_REASONS, "Choose a reason."),
  details: optionalText(500),
});
