import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  STORY_TEXT_LONG,
  STORY_TEXT_MAX,
  STORY_TEXT_MIN,
  STORY_TEXT_SHORT,
  storyProviderSchema,
  storySubmissionSchema,
  storyTranscript,
} from "../../src/lib/validation/story";

const ticks = { consent1: "on", consent2: "on", consent3: "on", consent4: "on", lang: "en" };
const words = (n: number) => "a".repeat(n);
const story = "The nurses explained every step of my father's discharge and called the next day to check on him.";

function textErrors(input: Record<string, unknown>): string[] | undefined {
  const r = storySubmissionSchema.safeParse(input);
  return r.success ? undefined : r.error.flatten().fieldErrors.text;
}

describe("share your story: written stories", () => {
  it("needs the story itself when the format is Written", () => {
    assert.deepEqual(textErrors({ provider: "Aravali Hospital", format: "Written", ...ticks }), [STORY_TEXT_SHORT]);
    assert.deepEqual(textErrors({ provider: "Aravali Hospital", format: "Written", text: "", ...ticks }), [STORY_TEXT_SHORT]);
    assert.deepEqual(textErrors({ provider: "Aravali Hospital", format: "Written", text: `   ${words(10)}   `, ...ticks }), [STORY_TEXT_SHORT]);
  });

  it("takes 50 to 3000 characters (after trimming)", () => {
    assert.equal(STORY_TEXT_MIN, 50);
    assert.equal(STORY_TEXT_MAX, 3000);
    assert.deepEqual(textErrors({ provider: "Aravali Hospital", format: "Written", text: words(49), ...ticks }), [STORY_TEXT_SHORT]);
    assert.deepEqual(textErrors({ provider: "Aravali Hospital", format: "Written", text: `  ${words(49)}  `, ...ticks }), [STORY_TEXT_SHORT]);
    assert.ok(storySubmissionSchema.safeParse({ provider: "Aravali Hospital", format: "Written", text: words(50), ...ticks }).success);
    assert.ok(storySubmissionSchema.safeParse({ provider: "Aravali Hospital", format: "Written", text: words(3000), ...ticks }).success);
    assert.deepEqual(textErrors({ provider: "Aravali Hospital", format: "Written", text: words(3001), ...ticks }), [STORY_TEXT_LONG]);
  });

  it("keeps the text for a written story", () => {
    const r = storySubmissionSchema.parse({ provider: "Aravali Hospital", format: "Written", text: `  ${story}  `, ...ticks });
    assert.equal(r.text, story);
    assert.equal(r.format, "Written");
  });

  it("doesn't need, or keep, any text for a video story", () => {
    const none = storySubmissionSchema.parse({ provider: "Aravali Hospital", format: "Video", ...ticks });
    assert.equal(none.text, undefined);
    const typed = storySubmissionSchema.parse({ provider: "Aravali Hospital", format: "Video", text: "typed, then switched to video", ...ticks });
    assert.equal(typed.text, undefined);
    assert.equal(storyTranscript(typed), "");
  });

  it("still needs all four consents and the provider", () => {
    const r = storySubmissionSchema.safeParse({ provider: "", format: "Written", text: story, consent1: "on", lang: "en" });
    assert.equal(r.success, false);
    const fe = r.success ? {} : r.error.flatten().fieldErrors;
    assert.ok(fe.provider?.length);
    assert.ok(fe.consent2?.length);
  });

  it("checks the text on the upload step too (storyProviderSchema)", () => {
    assert.equal(storyProviderSchema.safeParse({ provider: "Aravali Hospital", format: "Written", text: "short" }).success, false);
    assert.ok(storyProviderSchema.safeParse({ provider: "Aravali Hospital", format: "Written", text: story }).success);
    assert.ok(storyProviderSchema.safeParse({ provider: "Aravali Hospital", format: "Video" }).success);
  });
});

describe("storyTranscript (what is stored in Story.transcript)", () => {
  it("removes phone numbers, emails and ID numbers from a written story", () => {
    const text = `${story} Call me on 98765 43210 or write to asha.k@example.com. My Aadhaar is 2345 6789 0123.`;
    const input = storySubmissionSchema.parse({ provider: "Aravali Hospital", format: "Written", text, ...ticks });
    const stored = storyTranscript(input);
    assert.ok(stored.startsWith(story));
    assert.ok(!stored.includes("98765"), stored);
    assert.ok(!stored.includes("asha.k@example.com"), stored);
    assert.ok(!stored.includes("2345 6789 0123"), stored);
    assert.ok(stored.includes("[number removed]"), stored);
  });

  it("keeps helplines and stores a clean story as typed", () => {
    const text = `${story} In an emergency call 112 or ambulance 108.`;
    assert.equal(storyTranscript({ format: "Written", text }), text);
  });
});
