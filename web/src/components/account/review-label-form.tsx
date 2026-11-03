"use client";

import { useActionState, useRef } from "react";

import { setReviewLabel } from "@/app/actions/consent";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";

import { useHydrated } from "./hooks";

/** "How your reviews and posts are signed": choosing one saves it (a Save button without JavaScript). */
export function ReviewLabelForm({
  lang,
  options,
  current,
  legend,
  note,
  saveLabel,
}: {
  lang: "en" | "hi";
  options: string[];
  current: string;
  legend: string;
  note: string;
  saveLabel: string;
}) {
  const [state, action] = useActionState<ActionState<{ label: string }>, FormData>(setReviewLabel, idle);
  const form = useRef<HTMLFormElement>(null);
  const hydrated = useHydrated();
  return (
    <form ref={form} action={action} className="flex min-w-0 flex-col gap-2.5 rounded-20 bg-cream p-4.5">
      <input type="hidden" name="lang" value={lang} />
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-16 font-semibold leading-[1.4]">{legend}</legend>
        {options.map((o) => (
          <label
            key={o}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-14 border-[1.5px] border-line-strong bg-white px-3.5 py-2 text-14 leading-[1.35] text-ink",
              "has-checked:border-teal has-checked:bg-success-tint has-checked:font-semibold has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal",
            )}
          >
            <input
              type="radio"
              name="label"
              value={o}
              defaultChecked={o === current}
              onChange={() => form.current?.requestSubmit()}
              className="m-0 size-5 flex-none accent-teal"
            />
            <span lang={lang === "hi" ? "en" : undefined}>{o}</span>
          </label>
        ))}
      </fieldset>
      <span className="text-13.5 font-light leading-[1.55] text-ink-soft">{note}</span>
      {!hydrated && (
        <button type="submit" className="min-h-11 self-start rounded-pill bg-ink px-4.5 text-14 font-medium text-cream">
          {saveLabel}
        </button>
      )}
      {state.status !== "idle" && (
        <span role={state.status === "error" ? "alert" : "status"} className={cn("text-14 leading-normal", state.status === "error" ? "font-medium text-emergency" : "text-success")}>
          {state.message}
        </span>
      )}
    </form>
  );
}
