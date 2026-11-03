"use client";

// A patient story: its card (stories page) or the "Watch patient story" button (list pages), and
// the player dialog with the transcript, the checks and "Report this video" (flagStory → the
// community moderation queue). The dialog is a native <dialog> (focus stays inside, Esc closes,
// focus returns to the button). `?story=<slug>` on the stories page opens one directly.

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { flagStory, type FlagStoryData } from "@/app/actions/stories";
import { badgeClasses, isOwnership, OWNERSHIP_TONE } from "@/components/ui/badge-styles";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";


export type StoryView = {
  slug: string;
  title: string;
  who: string;
  providerName: string;
  providerHref: string | null;
  ownership: string;
  ownershipLabel: string;
  duration: string;
  meta: string;
  transcript: string;
  caption: string;
  written: boolean;
  checks: { consented: boolean; visitConfirmed: boolean; notPaid: boolean };
};

export type PlayerLabels = {
  lang: "en" | "hi";
  label: string;
  playerUnavailable: string;
  visitConfirmed: string;
  writtenConsent: string;
  notPaid: string;
  transcript: string;
  transcriptPending: string;
  disclaimer: string;
  view: string;
  report: string;
  reported: string;
  reportLegend: string;
  reportSend: string;
  reportSending: string;
  reportCancel: string;
  reasons: { value: string; label: string }[];
  close: string;
  /** Card texts (stories page). */
  video: string;
  written: string;
  consent: string;
  play: string;
  read: string;
  /** List page button. */
  watch: string;
};

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);

function PlayCircle({ size }: { size: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex flex-none items-center justify-center rounded-full",
        size === "sm" && "size-6 bg-saffron text-10 text-ink",
        size === "md" && "size-15.5 bg-ink text-20 text-saffron",
        size === "lg" && "size-17.5 bg-saffron text-24 text-ink",
      )}
    >
      ▶
    </span>
  );
}

function ReportForm({ story, labels, onCancel }: { story: StoryView; labels: PlayerLabels; onCancel: () => void }) {
  const [state, action] = useActionState<ActionState<FlagStoryData>, FormData>(flagStory, idle);
  const id = useId();
  if (state.status === "success") {
    return (
      <p role="status" className="rounded-14 bg-success-tint px-3.5 py-3 text-13.5 leading-[1.55] text-ink-soft">
        <b className="font-semibold text-success">{labels.reported}</b> · {state.message}
      </p>
    );
  }
  const err = state.status === "error" ? (state.fieldErrors?.reason?.[0] ?? state.message) : null;
  return (
    <form action={action} className="flex flex-col gap-2.5 rounded-16 border border-line p-3.5">
      <input type="hidden" name="lang" value={labels.lang} />
      <input type="hidden" name="story" value={story.slug} />
      <fieldset className="flex flex-col gap-1.5" aria-describedby={err ? `${id}-err` : undefined}>
        <legend className="mb-1.5 text-14 font-medium">{labels.reportLegend}</legend>
        <div className="flex flex-wrap gap-1.5">
          {labels.reasons.map((r) => (
            <label
              key={r.value}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-pill border-[1.5px] border-line-strong bg-white px-3.25 text-13 has-checked:border-ink has-checked:bg-ink has-checked:text-cream has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal"
            >
              <input type="radio" name="reason" value={r.value} required className="sr-only" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      {err && (
        <p id={`${id}-err`} role="alert" className="text-13 font-medium text-emergency">
          {err}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="dark" size="sm" pendingLabel={labels.reportSending}>
          {labels.reportSend}
        </SubmitButton>
        <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center rounded-pill px-3 text-13.5 text-teal hover:text-ink">
          {labels.reportCancel}
        </button>
      </div>
    </form>
  );
}

function PlayerDialog({ story, labels, dialogRef }: { story: StoryView; labels: PlayerLabels; dialogRef: React.RefObject<HTMLDialogElement | null> }) {
  const [reporting, setReporting] = useState(false);
  const titleId = useId();
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => setReporting(false)}
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto max-h-[92vh] w-[calc(100%-2.5rem)] max-w-[53.75rem] overflow-hidden rounded-24 bg-white p-0 text-ink backdrop:bg-[rgba(20,12,6,.75)]"
    >
      <div className="grid max-h-[92vh] grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] overflow-auto">
        <div className="relative flex min-h-60 items-center justify-center bg-[repeating-linear-gradient(135deg,#3a2a1e_0_14px,#33251a_14px_28px)] sm:min-h-95">
          <span className="absolute top-3.5 left-3.5 rounded-5 bg-cream px-1.75 py-0.75 font-mono text-10.5 text-subtle">{labels.label}</span>
          <PlayCircle size="lg" />
          <span className="sr-only">{labels.playerUnavailable}</span>
          {story.caption && (
            <span lang="en" className="absolute right-4 bottom-4 left-4 rounded-7 bg-[rgba(0,0,0,.6)] px-2.5 py-2 text-center text-13 text-white">
              “{story.caption}”
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3 p-5.5">
          <div className="flex justify-between gap-2.5">
            <h2 id={titleId} className="text-19 leading-[1.3] font-bold">
              {story.title}
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
          <div className="flex flex-wrap gap-1.5">
            {story.checks.visitConfirmed && <span className="rounded-pill bg-success-tint px-2.25 py-0.75 text-11.5 font-semibold text-success">{labels.visitConfirmed}</span>}
            {story.checks.consented && <span className="rounded-pill bg-success-tint px-2.25 py-0.75 text-11.5 font-semibold text-success">{labels.writtenConsent}</span>}
            {story.checks.notPaid && <span className="rounded-pill bg-cream px-2.25 py-0.75 text-11.5 font-semibold">{labels.notPaid}</span>}
          </div>
          <h3 className="mono-label text-10.5 text-subtle">{labels.transcript}</h3>
          {story.transcript ? (
            <p lang="en" className="text-14 leading-[1.65] font-light text-ink-soft">
              {story.transcript}
            </p>
          ) : (
            <p className="text-14 leading-[1.65] font-light text-muted">{labels.transcriptPending}</p>
          )}
          <p className="text-12 leading-[1.55] font-light text-subtle">{labels.disclaimer}</p>
          <div className="flex flex-wrap gap-2">
            {story.providerHref && (
              <Link href={story.providerHref} className="inline-flex min-h-11 items-center rounded-pill bg-ink px-4 text-13.5 text-cream hover:bg-ink-soft hover:text-cream">
                {fill(labels.view, { provider: story.providerName })}
              </Link>
            )}
            {!reporting && (
              <button
                type="button"
                onClick={() => setReporting(true)}
                className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-line-strong bg-white px-4 text-13.5 hover:border-ink"
              >
                {labels.report}
              </button>
            )}
          </div>
          {reporting && <ReportForm story={story} labels={labels} onCancel={() => setReporting(false)} />}
        </div>
      </div>
    </dialog>
  );
}

function useStoryDialog(slug: string, deepLink: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!deepLink) return;
    if (new URLSearchParams(window.location.search).get("story") === slug) ref.current?.showModal();
  }, [deepLink, slug]);
  return ref;
}

/** A story card on the stories page: the poster opens the player. */
export function StoryCard({ story, labels, deepLink = false }: { story: StoryView; labels: PlayerLabels; deepLink?: boolean }) {
  const ref = useStoryDialog(story.slug, deepLink);
  return (
    <article className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label={fill(story.written ? labels.read : labels.play, { title: story.title })}
        className="relative aspect-[4/5] overflow-hidden rounded-22 bg-[repeating-linear-gradient(135deg,#e3d6c0_0_12px,#ecdfca_12px_24px)] p-0"
      >
        <span className="absolute top-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-5 bg-cream px-1.75 py-0.75 font-mono text-10 text-subtle">
          {fill(story.written ? labels.written : labels.video, { who: story.who })}
        </span>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <PlayCircle size="md" />
        </span>
        {story.duration && <span className="absolute right-3 bottom-3 rounded-5 bg-ink px-1.75 py-0.75 font-mono text-11 font-medium text-cream">{story.duration}</span>}
        {story.checks.consented && <span className="absolute bottom-3 left-3 rounded-pill bg-success-tint px-2.25 py-0.75 text-11 font-semibold text-success">{labels.consent}</span>}
      </button>
      <h2 className="text-16 leading-[1.35] font-semibold tracking-snug">{story.title}</h2>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={badgeClasses(isOwnership(story.ownership) ? OWNERSHIP_TONE[story.ownership] : "dark")}>{story.ownershipLabel}</span>
        {story.providerHref ? (
          <Link href={story.providerHref} className="inline-flex min-h-11 items-center text-13">
            {story.providerName}
          </Link>
        ) : (
          <span className="text-13">{story.providerName}</span>
        )}
      </div>
      {story.meta && <span className="-mt-2 font-mono text-10.5 text-subtle uppercase">{story.meta}</span>}
      <PlayerDialog story={story} labels={labels} dialogRef={ref} />
    </article>
  );
}

/** "▶ Watch patient story" on a list entry. */
export function WatchStoryButton({ story, labels }: { story: StoryView; labels: PlayerLabels }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-ink py-2 pr-3.5 pl-2.25 text-13 text-cream hover:bg-ink-soft"
      >
        <PlayCircle size="sm" />
        {labels.watch}
      </button>
      <PlayerDialog story={story} labels={labels} dialogRef={ref} />
    </>
  );
}
