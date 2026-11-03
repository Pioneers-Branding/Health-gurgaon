"use client";

// "Share your story": the prototype's three-step dialog (Upload → Privacy check → Consent) posting
// to the submitStory Server Action, which puts the story in the moderation queue and returns its
// reference. Every field stays in one <form> (steps are only hidden), so the server sees and
// re-checks everything. `?share=1` opens it (the sign-in page sends people back there).
// A written story is typed on the privacy step, under the list of what not to include (50–3000
// characters; the server removes phone numbers and emails again before storing it).

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { submitStory, type SubmitStoryData } from "@/app/actions/stories";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import { findPersonalData } from "@/lib/redact";
import { STORY_TEXT_MAX, STORY_TEXT_MIN } from "@/lib/validation/story";

export type ShareLabels = {
  title: string;
  stepsLabel: string;
  steps: string[];
  stepOf: string;
  provider: string;
  providerPlaceholder: string;
  format: string;
  formats: Record<string, string>;
  uploadVideo: string;
  uploadWritten: string;
  uploadHow: string;
  privacyTitle: string;
  privacy: string[];
  privacyNote: string;
  privacyTitleWritten: string;
  storyLabel: string;
  storyHelp: string;
  storyCount: string;
  storyPhone: string;
  errText: string;
  consentLegend: string;
  consents: string[];
  errProvider: string;
  errConsent: string;
  next: string;
  back: string;
  submit: string;
  sending: string;
  doneTitle: string;
  done: string;
  doneDuplicate: string;
  /** "See it in your activity →" after sending. */
  activity: string;
  signInTitle: string;
  signInText: string;
  signIn: string;
  close: string;
  /** The page's "Share your story" button. */
  open: string;
};

const FORMATS = ["Video", "Written"] as const;

export function ShareStory({
  lang,
  labels,
  signedIn,
  signInHref,
  activityHref,
}: {
  lang: "en" | "hi";
  labels: ShareLabels;
  signedIn: boolean | null;
  signInHref: string;
  activityHref: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState<ActionState<SubmitStoryData>, FormData>(submitStory, idle);
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState("");
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("Video");
  const [story, setStory] = useState("");
  const [consents, setConsents] = useState([false, false, false, false]);
  const [clientErr, setClientErr] = useState("");
  const id = useId();
  const focusRef = useRef<HTMLElement | null>(null);
  const done = state.status === "success";
  const written = format === "Written";
  const storyLength = story.trim().length;
  const contact = findPersonalData(story);
  const storyHasContact = written && (contact.phone || contact.email || contact.idNumber);

  // A server answer about the provider or the story text takes the reader back to that step.
  const [answered, setAnswered] = useState(state);
  if (answered !== state) {
    setAnswered(state);
    if (state.status === "error" && state.fieldErrors?.provider?.length) setStep(1);
    else if (state.status === "error" && state.fieldErrors?.text?.length) setStep(2);
  }

  // ?share=1 (e.g. back from signing in) opens the dialog.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("share") === "1") dialogRef.current?.showModal();
  }, []);

  // Move focus to the start of each step and to the result.
  useEffect(() => {
    focusRef.current?.focus();
  }, [step, done]);

  const serverErr = state.status === "error" ? state.message : "";
  const needsSignIn = signedIn === false || (state.status === "error" && state.code === "sign_in_required");
  const err = clientErr || (state.status === "error" && state.code !== "sign_in_required" ? serverErr : "");

  function next() {
    if (step === 1 && !provider.trim()) {
      setClientErr(labels.errProvider);
      return;
    }
    if (step === 2 && written && storyLength < STORY_TEXT_MIN) {
      setClientErr(labels.errText);
      return;
    }
    setClientErr("");
    setStep((s) => Math.min(3, s + 1));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex min-h-12 items-center rounded-pill bg-teal px-5 text-14.5 font-semibold text-white hover:bg-teal-dark"
      >
        {labels.open}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto max-h-[92vh] w-[calc(100%-2.5rem)] max-w-[35rem] overflow-auto rounded-24 bg-white p-0 text-ink backdrop:bg-[rgba(20,12,6,.6)]"
      >
        <div className="flex flex-col gap-3.5 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${id}-title`} className="text-22 font-bold tracking-h3">
              {labels.title}
            </h2>
            <button
              type="button"
              aria-label={labels.close}
              onClick={() => dialogRef.current?.close()}
              className="flex size-11 flex-none items-center justify-center rounded-full bg-cream text-18 hover:bg-cream-deep"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <ol aria-label={labels.stepsLabel} className="grid grid-cols-3 gap-1.5">
            {labels.steps.map((s, i) => {
              const n = i + 1;
              const reached = done || n <= step;
              return (
                <li key={s} aria-current={!done && n === step ? "step" : undefined} className="flex flex-col gap-1.25">
                  <span aria-hidden="true" className={cn("h-1.25 rounded-3", reached ? "bg-teal" : "bg-line")} />
                  <span className={cn("text-12", !done && n === step ? "font-semibold" : "font-light")}>{s}</span>
                </li>
              );
            })}
          </ol>

          {done ? (
            <div ref={(el) => void (focusRef.current = el)} tabIndex={-1} role="status" className="flex flex-col gap-2 outline-none">
              <p className="text-18 font-bold">{labels.doneTitle}</p>
              <p className="text-14 leading-[1.55] font-light text-muted">
                {(state.data?.duplicate ? labels.doneDuplicate : labels.done).replace("{ref}", state.data?.ref ?? "")}
              </p>
              <Link href={activityHref} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
                {labels.activity}
              </Link>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="mt-1 inline-flex min-h-11 items-center self-end rounded-pill bg-teal px-5.5 text-15 font-semibold text-white hover:bg-teal-dark"
              >
                {labels.close}
              </button>
            </div>
          ) : (
            <form
              action={action}
              noValidate
              onSubmit={(e) => {
                if (step < 3) {
                  e.preventDefault();
                  next();
                  return;
                }
                if (!consents.every(Boolean)) {
                  e.preventDefault();
                  setClientErr(labels.errConsent);
                }
              }}
              className="flex flex-col gap-3.5"
            >
              <input type="hidden" name="lang" value={lang} />
              <p className="sr-only" aria-live="polite">
                {labels.stepOf.replace("{n}", String(step))}
              </p>

              {needsSignIn && (
                <div className="flex flex-col gap-1 rounded-16 border border-sponsored bg-pending-tint px-4 py-3 text-13.5 leading-[1.55] text-pending">
                  <p className="font-semibold">{labels.signInTitle}</p>
                  <p className="font-light">{labels.signInText}</p>
                  <Link href={signInHref} className="inline-flex min-h-11 items-center self-start font-medium">
                    {labels.signIn}
                  </Link>
                </div>
              )}

              <div hidden={step !== 1} className="flex flex-col gap-3.5">
                <label htmlFor={`${id}-provider`} className="flex flex-col gap-1.5 text-14 font-medium">
                  {labels.provider}
                  <input
                    ref={(el) => {
                      if (step === 1) focusRef.current = el;
                    }}
                    id={`${id}-provider`}
                    name="provider"
                    value={provider}
                    maxLength={160}
                    autoComplete="off"
                    placeholder={labels.providerPlaceholder}
                    aria-invalid={!!clientErr && step === 1 ? true : undefined}
                    aria-describedby={clientErr && step === 1 ? `${id}-err` : undefined}
                    onChange={(e) => {
                      setProvider(e.target.value);
                      setClientErr("");
                    }}
                    className="min-h-12 rounded-12 border-[1.5px] border-line-strong bg-white px-3 text-15 font-normal text-ink"
                  />
                </label>
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-14 font-medium">{labels.format}</legend>
                  <div className="flex gap-1.5">
                    {FORMATS.map((f) => (
                      <label
                        key={f}
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-pill border-[1.5px] border-line-strong bg-white px-3.25 text-13 has-checked:border-ink has-checked:bg-ink has-checked:text-cream has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal"
                      >
                        <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} className="sr-only" />
                        {labels.formats[f] ?? f}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-col gap-1.5 rounded-16 border-2 border-dashed border-line-strong p-5.5 text-center text-13.5 font-light text-muted">
                  <p>{format === "Video" ? labels.uploadVideo : labels.uploadWritten}</p>
                  {!written && <p className="text-12.5 text-subtle">{labels.uploadHow}</p>}
                </div>
              </div>

              <div hidden={step !== 2} className="flex flex-col gap-2.5">
                <h3
                  ref={(el) => {
                    if (step === 2) focusRef.current = el;
                  }}
                  tabIndex={-1}
                  className="text-16 font-semibold outline-none"
                >
                  {written ? labels.privacyTitleWritten : labels.privacyTitle}
                </h3>
                <ul className="flex flex-col gap-2 text-14 leading-normal font-light">
                  {labels.privacy.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                {written ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${id}-story`} className="text-14 font-medium">
                      {labels.storyLabel}
                    </label>
                    <p id={`${id}-story-help`} className="text-12.5 leading-normal font-light text-muted">
                      {labels.storyHelp}
                    </p>
                    <textarea
                      id={`${id}-story`}
                      name="text"
                      rows={7}
                      value={story}
                      maxLength={STORY_TEXT_MAX}
                      aria-invalid={!!clientErr && step === 2 ? true : undefined}
                      aria-describedby={[`${id}-story-help`, `${id}-story-count`, storyHasContact ? `${id}-story-phone` : null, clientErr && step === 2 ? `${id}-err` : null]
                        .filter(Boolean)
                        .join(" ")}
                      onChange={(e) => {
                        setStory(e.target.value);
                        setClientErr("");
                      }}
                      className="min-h-36 w-full resize-y rounded-12 border-[1.5px] border-line-strong bg-white px-3 py-2.5 text-15 leading-[1.55] font-light text-ink hover:border-subtle focus-visible:border-teal aria-[invalid=true]:border-emergency"
                    />
                    <p id={`${id}-story-count`} className={cn("text-12 font-light", storyLength > 0 && storyLength < STORY_TEXT_MIN ? "text-caution" : "text-subtle")}>
                      {labels.storyCount.replace("{n}", String(storyLength))}
                    </p>
                    {storyHasContact && (
                      <p id={`${id}-story-phone`} role="status" className="rounded-14 border-[1.5px] border-dashed border-sponsored bg-pending-tint px-3.5 py-2.5 text-13 leading-normal text-pending">
                        {labels.storyPhone}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-13 leading-[1.55] font-light text-muted">{labels.privacyNote}</p>
                )}
              </div>

              <fieldset hidden={step !== 3} className="flex flex-col gap-1" aria-describedby={clientErr && step === 3 ? `${id}-err` : undefined}>
                <legend
                  ref={(el) => {
                    if (step === 3) focusRef.current = el;
                  }}
                  tabIndex={-1}
                  className="sr-only"
                >
                  {labels.consentLegend}
                </legend>
                {labels.consents.map((c, i) => (
                  <label key={c} className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1.5 text-13.5 leading-normal font-light">
                    <input
                      type="checkbox"
                      name={`consent${i + 1}`}
                      checked={consents[i]}
                      onChange={() => {
                        setConsents((prev) => prev.map((v, k) => (k === i ? !v : v)));
                        setClientErr("");
                      }}
                      className="mt-0.5 size-4.5 flex-none cursor-pointer accent-teal"
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </fieldset>

              {err && (
                <p id={`${id}-err`} role="alert" className="text-13 font-medium text-emergency">
                  {err}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setClientErr("");
                      setStep((s) => Math.max(1, s - 1));
                    }}
                    className="inline-flex min-h-11 items-center px-1.5 text-14 text-teal hover:text-ink"
                  >
                    {labels.back}
                  </button>
                ) : (
                  <span />
                )}
                {step < 3 ? (
                  <button type="button" onClick={next} className="inline-flex min-h-12 items-center rounded-pill bg-teal px-5.5 text-15 font-semibold text-white hover:bg-teal-dark">
                    {labels.next}
                  </button>
                ) : (
                  <SubmitButton size="lg" pendingLabel={labels.sending}>
                    {labels.submit}
                  </SubmitButton>
                )}
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
