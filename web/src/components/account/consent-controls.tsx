"use client";

// WhatsApp & email: Stop all (with Undo), language, each message type (turn on with a question,
// turn off with Undo, WhatsApp or email), the email address, download, delete.
// Server Actions: src/app/actions/consent.ts. Every change writes a line in the consent record.

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  changeMessageChannel,
  confirmEmail,
  deleteMyAccount,
  exportMyData,
  requestEmailChange,
  setConsent,
  setMessageLanguage,
  stopAllWhatsApp,
  undoStopAllWhatsApp,
  type ConsentActionData,
  type EmailChangeData,
  type ExportedData,
} from "@/app/actions/consent";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";

import { focusElement, useFocusLater, useHydrated, useOnChange } from "./hooks";

type Lang = "en" | "hi";
type Purpose = "weekly_report" | "city_channel" | "locality_updates" | "community_replies" | "saved_changes";

const statusBox = "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-14 bg-cream py-1.5 pr-1.5 pl-3.5 text-14 leading-normal";
const undoBtn = "min-h-11 rounded-pill bg-ink px-4.5 text-14 font-medium text-cream hover:bg-ink-soft disabled:opacity-60";
const softBtn = "min-h-11 rounded-pill border-[1.5px] border-line-strong bg-white px-4.5 text-14.5 text-ink hover:border-ink";

function Err({ state }: { state: ActionState<unknown> }) {
  return state.status === "error" ? (
    <span role="alert" className="text-14 font-medium leading-normal text-emergency">
      {state.message}
    </span>
  ) : null;
}

// ── Your messages, your choice ─────────────────────────────────────────────────

export function StopAllCard({ lang, kicker, title, summary, anyWhatsApp, noneText, stopLabel, undoLabel, undoAria }: {
  lang: Lang;
  kicker: string;
  title: string;
  summary: string;
  anyWhatsApp: boolean;
  noneText: string;
  stopLabel: string;
  undoLabel: string;
  undoAria: string;
}) {
  const focusLater = useFocusLater();
  const [stopState, stopAction, stopping] = useActionState<ActionState<{ stopped: Purpose[] }>, FormData>(stopAllWhatsApp, idle);
  const [undoState, undoAction, undoing] = useActionState<ActionState<{ restored: Purpose[] }>, FormData>(undoStopAllWhatsApp, idle);
  const [last, setLast] = useState<"stop" | "undo" | null>(null);
  useOnChange(stopState, (s) => {
    if (s.status !== "idle") {
      setLast("stop");
      focusLater("hg-nu-stopall");
    }
  });
  useOnChange(undoState, (s) => {
    if (s.status !== "idle") {
      setLast("undo");
      focusLater(s.status === "success" ? "hg-stopall" : "hg-nu-stopall");
    }
  });
  const stopped = last === "stop" && stopState.status === "success" ? stopState.data?.stopped ?? [] : [];
  return (
    <div className="on-dark flex min-w-0 flex-col gap-3 rounded-20 bg-ink p-5.5 text-cream">
      <h2 className="mono-label m-0 text-11 text-saffron">{kicker}</h2>
      <p className="text-20 font-semibold leading-[1.35] tracking-card">{title}</p>
      <p className="text-14.5 font-light leading-[1.55] text-on-dark">{summary}</p>
      {anyWhatsApp ? (
        <form action={stopAction}>
          <input type="hidden" name="lang" value={lang} />
          <button id="hg-stopall" type="submit" disabled={stopping} className="min-h-12 rounded-pill bg-saffron px-5.5 text-15 font-semibold text-ink hover:bg-saffron-soft disabled:opacity-70">
            {stopLabel}
          </button>
        </form>
      ) : (
        !stopped.length && <p className="text-14.5 leading-normal text-teal-tint">{noneText}</p>
      )}
      {last === "stop" && stopState.status === "success" && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-14 bg-night-raise py-1.5 pr-1.5 pl-3.5 text-14 leading-normal">
          <span className="min-w-0 py-2">{stopState.message}</span>
          {stopped.length > 0 && (
            <form action={undoAction}>
              <input type="hidden" name="lang" value={lang} />
              {stopped.map((p) => (
                <input key={p} type="hidden" name="purposes" value={p} />
              ))}
              <button id="hg-nu-stopall" type="submit" disabled={undoing} aria-label={undoAria} className="min-h-11 rounded-pill bg-cream px-4.5 text-14 font-medium text-ink hover:bg-white disabled:opacity-70">
                {undoLabel}
              </button>
            </form>
          )}
        </div>
      )}
      {last === "undo" && undoState.status !== "idle" && (
        <p role={undoState.status === "error" ? "alert" : "status"} className="text-14 leading-normal text-on-dark">
          {undoState.message}
        </p>
      )}
      {stopState.status === "error" && (
        <p role="alert" className="text-14 font-medium text-saffron">
          {stopState.message}
        </p>
      )}
    </div>
  );
}

// ── Language for messages and sign-in codes ─────────────────────────────────────

export function MessageLanguage({ lang, current, legend, previewKicker, preview, businessNote, saveLabel }: {
  lang: Lang;
  current: Lang;
  legend: string;
  previewKicker: string;
  preview: Record<Lang, string>;
  businessNote: string;
  saveLabel: string;
}) {
  const [state, action] = useActionState<ActionState<{ messageLang: Lang }>, FormData>(setMessageLanguage, idle);
  const [chosen, setChosen] = useState<Lang>(current);
  const form = useRef<HTMLFormElement>(null);
  const hydrated = useHydrated();
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-20 border border-line p-5.5">
      <form ref={form} action={action} className="flex flex-col gap-2">
        <input type="hidden" name="lang" value={lang} />
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-16 font-semibold leading-[1.4]">{legend}</legend>
          <div className="flex flex-wrap gap-2">
            {(["en", "hi"] as const).map((l) => (
              <label
                key={l}
                className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-14 border-[1.5px] border-line-strong bg-white px-4 text-15 text-ink has-checked:border-teal has-checked:bg-success-tint has-checked:font-semibold has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal"
              >
                <input
                  type="radio"
                  name="messageLang"
                  value={l}
                  defaultChecked={l === current}
                  onChange={() => {
                    setChosen(l);
                    form.current?.requestSubmit();
                  }}
                  className="m-0 size-5 accent-teal"
                />
                <span lang={l} className={l === "hi" ? "font-hindi text-17 font-medium leading-[1.2]" : undefined}>
                  {l === "en" ? "English" : "हिंदी"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
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
      <div className="flex min-w-0 flex-col gap-1.5 rounded-tl-4 rounded-tr-16 rounded-br-16 rounded-bl-16 bg-[#E7F6E9] px-3.5 py-3">
        <span className="mono-label text-10.5 tracking-[.04em] text-success">{previewKicker}</span>
        <span lang={chosen} className={cn("whitespace-pre-line leading-[1.6] text-ink [overflow-wrap:anywhere]", chosen === "hi" ? "font-hindi text-16.5" : "text-14")}>
          {preview[chosen]}
        </span>
      </div>
      <p className="text-13 font-light leading-normal text-muted">{businessNote}</p>
    </div>
  );
}

// ── One message type ────────────────────────────────────────────────────────────

export type MessageTypeView = {
  purpose: Purpose;
  key: string;
  name: string;
  on: boolean;
  state: string;
  why: string;
  often: string;
  covers: string | null;
  record: ReactNode;
  last: string | null;
  sponsored: boolean;
  /** Email is confirmed, so WhatsApp | Email can be chosen. */
  hasEmail: boolean;
  channel: "whatsapp" | "email";
  dest: string;
  askTitle: string;
  askBody: string;
  /** Locality alerts with no followed locality: ask which one. */
  needLocality: boolean;
  askHref: string;
};

export function MessageTypeCard({ lang, m, labels, localities, startAsking }: {
  lang: Lang;
  m: MessageTypeView;
  labels: {
    turnOn: string;
    turnOff: string;
    toggleAria: string;
    sponsorTag: string;
    dtWhy: string;
    dtOften: string;
    dtAbout: string;
    dtSentBy: string;
    dtRecord: string;
    dtLast: string;
    chanAria: string;
    destTo: string;
    useEmail: string;
    askYes: string;
    cancel: string;
    undo: string;
    undoAria: string;
    whichLocality: string;
    whatsapp: string;
    email: string;
  };
  localities: { slug: string; name: string }[];
  startAsking: boolean;
}) {
  const focusLater = useFocusLater();
  const [state, action, pending] = useActionState<ActionState<ConsentActionData>, FormData>(setConsent, idle);
  const [undoState, undoAction, undoing] = useActionState<ActionState<ConsentActionData>, FormData>(setConsent, idle);
  const [chanState, chanAction, chanPending] = useActionState<ActionState<ConsentActionData>, FormData>(changeMessageChannel, idle);
  const [asking, setAsking] = useState(startAsking && !m.on);
  const [last, setLast] = useState<"toggle" | "undo" | "channel" | null>(null);
  const k = m.key;
  useEffect(() => {
    if (startAsking && !m.on) focusElement(`hg-ask-${k}`);
  }, [startAsking, m.on, k]);
  useOnChange(state, (s) => {
    setLast("toggle");
    if (s.status === "success") {
      setAsking(false);
      focusLater(`hg-nu-${k}`);
    }
  });
  useOnChange(undoState, (s) => {
    setLast("undo");
    if (s.status === "success") focusLater(`hg-tg-${k}`);
  });
  useOnChange(chanState, () => setLast("channel"));
  const fmt2 = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (x, key: string) => v[key] ?? x);
  const action2 = m.on ? labels.turnOff : labels.turnOn;
  const note = last === "toggle" ? state : last === "undo" ? undoState : last === "channel" ? chanState : idle;
  const hidden = (
    <>
      <input type="hidden" name="purpose" value={m.purpose} />
      <input type="hidden" name="lang" value={lang} />
    </>
  );
  return (
    <article id={`msg-${k}`} className={cn("flex min-w-0 scroll-mt-24 flex-col gap-3 rounded-20 bg-white", m.on ? "border-2 border-teal p-4.25" : "border border-line p-4.5")}>
      <div className="flex flex-wrap items-start justify-between gap-x-3.5 gap-y-2">
        <div className="flex min-w-0 flex-[1_1_12.5rem] flex-col gap-1.5">
          <h3 className="m-0 text-17 font-semibold leading-[1.3] tracking-snug">{m.name}</h3>
          <span className={cn("self-start whitespace-nowrap rounded-pill px-2.75 py-1 text-12.5 font-semibold", m.on ? "bg-success-tint text-success" : "bg-line text-ink-soft")}>{m.state}</span>
        </div>
        {m.on ? (
          <form action={action}>
            {hidden}
            <input type="hidden" name="granted" value="off" />
            <button id={`hg-tg-${k}`} type="submit" disabled={pending} aria-label={fmt2(labels.toggleAria, { action: action2, name: m.name })} className="min-h-11 flex-none rounded-pill border-[1.5px] border-ink bg-white px-5 text-14.5 font-semibold text-ink hover:bg-cream disabled:opacity-70">
              {labels.turnOff}
            </button>
          </form>
        ) : (
          <a
            id={`hg-tg-${k}`}
            href={m.askHref}
            onClick={(e) => {
              e.preventDefault();
              setAsking(true);
              setLast(null);
              focusLater(`hg-ask-${k}`);
            }}
            aria-label={fmt2(labels.toggleAria, { action: action2, name: m.name })}
            className="inline-flex min-h-11 flex-none items-center rounded-pill border-[1.5px] border-teal bg-teal px-5 text-14.5 font-semibold text-white hover:bg-teal-dark hover:text-white"
          >
            {labels.turnOn}
          </a>
        )}
      </div>
      {m.sponsored && <span className="self-start rounded-6 bg-ink px-2.25 py-0.75 font-mono text-10.5 font-medium uppercase leading-normal text-saffron">{labels.sponsorTag}</span>}
      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3.5 gap-y-2">
        <dt className="mono-label text-10.5 tracking-[.04em] text-subtle">{labels.dtWhy}</dt>
        <dd className="m-0 text-14 leading-[1.55]">{m.why}</dd>
        <dt className="mono-label text-10.5 tracking-[.04em] text-subtle">{labels.dtOften}</dt>
        <dd className="m-0 text-14 leading-[1.55]">{m.often}</dd>
        {m.on && m.covers && (
          <>
            <dt className="mono-label text-10.5 tracking-[.04em] text-subtle">{labels.dtAbout}</dt>
            <dd className="m-0 text-14 leading-[1.55]">{m.covers}</dd>
          </>
        )}
        {m.on && (
          <>
            <dt className="mono-label text-10.5 tracking-[.04em] text-subtle">{labels.dtSentBy}</dt>
            <dd className="m-0 flex min-w-0 flex-col gap-1">
              {m.hasEmail && (
                <form action={chanAction} role="group" aria-label={fmt2(labels.chanAria, { name: m.name })} className="flex flex-wrap gap-1.5">
                  {hidden}
                  {(["whatsapp", "email"] as const).map((c) => (
                    <button
                      key={c}
                      type="submit"
                      name="channel"
                      value={c}
                      aria-pressed={m.channel === c}
                      disabled={chanPending}
                      className={cn(
                        "min-h-11 rounded-pill border-[1.5px] px-4 text-14 disabled:opacity-70",
                        m.channel === c ? "border-ink bg-ink font-semibold text-cream" : "border-line-strong bg-white text-ink hover:border-ink",
                      )}
                    >
                      {c === "whatsapp" ? labels.whatsapp : labels.email}
                    </button>
                  ))}
                </form>
              )}
              <span className="text-14 leading-normal [overflow-wrap:anywhere]">{fmt2(labels.destTo, { dest: m.dest })}</span>
              {!m.hasEmail && (
                <a
                  href="#hg-email-sec"
                  onClick={(e) => {
                    e.preventDefault();
                    focusElement("hg-email");
                  }}
                  className="inline-flex min-h-11 items-center self-start text-14 font-medium"
                >
                  {labels.useEmail}
                </a>
              )}
            </dd>
          </>
        )}
        <dt className="mono-label text-10.5 tracking-[.04em] text-subtle">{labels.dtRecord}</dt>
        <dd className="m-0 text-13.5 font-light leading-[1.55] text-ink-soft">{m.record}</dd>
        {m.last && (
          <>
            <dt className="mono-label text-10.5 tracking-[.04em] text-subtle">{labels.dtLast}</dt>
            <dd className="m-0 text-13.5 font-light leading-[1.55] text-ink-soft">{m.last}</dd>
          </>
        )}
      </dl>
      {asking && !m.on && (
        <form action={action} role="group" aria-labelledby={`hg-ask-${k}`} className="flex flex-col gap-2.5 rounded-16 border-[1.5px] border-teal bg-cream p-3.5">
          {hidden}
          <input type="hidden" name="granted" value="on" />
          <span id={`hg-ask-${k}`} tabIndex={-1} className="text-15 font-semibold leading-[1.4]">
            {m.askTitle}
          </span>
          {m.needLocality && (
            <label className="flex flex-col gap-1.5 text-14 font-medium">
              {labels.whichLocality}
              <select name="locality" defaultValue={localities[0]?.slug} className="min-h-11 max-w-80 rounded-12 border-[1.5px] border-line-strong bg-white px-3 text-15 font-normal text-ink">
                {localities.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span className="text-14 font-light leading-[1.55] text-ink">{m.askBody}</span>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="min-h-11 rounded-pill bg-teal px-5 text-14.5 font-semibold text-white hover:bg-teal-dark disabled:opacity-70">
              {labels.askYes}
            </button>
            <button
              type="button"
              onClick={() => {
                setAsking(false);
                focusLater(`hg-tg-${k}`);
              }}
              className={softBtn}
            >
              {labels.cancel}
            </button>
          </div>
          <Err state={state} />
        </form>
      )}
      {note.status === "success" && (
        <div role="status" className={statusBox}>
          <span className="min-w-0 py-2">{note.message}</span>
          {last === "toggle" && (
            <form action={undoAction}>
              {hidden}
              <input type="hidden" name="granted" value={m.on ? "off" : "on"} />
              <input type="hidden" name="undo" value="1" />
              <button id={`hg-nu-${k}`} type="submit" disabled={undoing} aria-label={fmt2(labels.undoAria, { name: m.name })} className={undoBtn}>
                {labels.undo}
              </button>
            </form>
          )}
        </div>
      )}
      {note.status === "error" && !asking && <Err state={note} />}
    </article>
  );
}

// ── Your email for messages ─────────────────────────────────────────────────────

export function EmailForm({ lang, label, placeholder, sendLabel, help, formatError, devLinkLabel, pending: pendingNote }: {
  lang: Lang;
  label: string;
  placeholder: string;
  sendLabel: string;
  help: string;
  formatError: string;
  devLinkLabel: string;
  /** "Waiting for you to open the link we sent to …" */
  pending: string | null;
}) {
  const focusLater = useFocusLater();
  const [state, action, sending] = useActionState<ActionState<EmailChangeData>, FormData>(requestEmailChange, idle);
  const [localErr, setLocalErr] = useState<string | null>(null);
  useOnChange(state, (s) => {
    if (s.status === "success") focusLater("hg-email-status");
    else if (s.status === "error") focusElement("hg-email");
  });
  const err = localErr ?? (state.status === "error" ? (state.code === "invalid_input" ? formatError : state.message) : null);
  return (
    <form
      action={action}
      noValidate
      onSubmit={(e) => {
        const v = (new FormData(e.currentTarget).get("email") ?? "").toString().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
          e.preventDefault();
          setLocalErr(formatError);
          focusElement("hg-email");
        } else setLocalErr(null);
      }}
      className="flex min-w-0 flex-col gap-2"
    >
      <input type="hidden" name="lang" value={lang} />
      <label htmlFor="hg-email" className="text-15 font-medium">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="hg-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={placeholder}
          aria-invalid={!!err || undefined}
          aria-describedby={err ? "hg-email-help hg-email-err" : "hg-email-help"}
          onChange={() => setLocalErr(null)}
          className={cn("min-h-12 min-w-0 flex-[1_1_13.75rem] rounded-12 border-[1.5px] bg-white px-3.5 text-15 text-ink placeholder:font-light placeholder:text-subtle", err ? "border-emergency" : "border-line-strong")}
        />
        <button type="submit" disabled={sending} className="min-h-12 rounded-pill bg-ink px-5 text-14.5 font-medium text-cream hover:bg-ink-soft disabled:opacity-70">
          {sendLabel}
        </button>
      </div>
      <span id="hg-email-help" className="text-13 font-light leading-normal text-muted">
        {help}
      </span>
      {err && (
        <span id="hg-email-err" role="alert" className="text-14 font-medium leading-normal text-emergency">
          {err}
        </span>
      )}
      {state.status === "success" ? (
        <div id="hg-email-status" tabIndex={-1} role="status" className="flex flex-col gap-1 rounded-14 bg-success-tint px-3.5 py-2.5 text-14 leading-normal text-success">
          <span>{state.message}</span>
          {state.data?.devLink && (
            <a href={state.data.devLink} className="mono-label inline-flex min-h-11 items-center self-start text-10.5 tracking-[.04em] text-teal">
              {devLinkLabel}
            </a>
          )}
        </div>
      ) : (
        pendingNote && <p className="rounded-14 bg-cream px-3.5 py-2.5 text-14 leading-normal text-ink-soft">{pendingNote}</p>
      )}
    </form>
  );
}

/** ?confirm_email=<token>: a button that posts the token (so link scanners can't confirm it). */
export function ConfirmEmail({ lang, token, title, body, button, after }: { lang: Lang; token: string; title: string; body: string; button: string; after?: string }) {
  const focusLater = useFocusLater();
  const [state, action, pending] = useActionState<ActionState<{ email: string }>, FormData>(confirmEmail, idle);
  useEffect(() => {
    focusElement("hg-confirm-email");
  }, []);
  useOnChange(state, () => focusLater("hg-confirm-result"));
  return (
    <div id="hg-confirm-email" tabIndex={-1} className="flex flex-col gap-2.5 rounded-16 border-[1.5px] border-teal bg-cream p-4">
      {state.status === "idle" ? (
        <form action={action} className="flex flex-col gap-2.5">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="token" value={token} />
          <span className="text-16 font-semibold leading-[1.4]">{title}</span>
          <span className="text-14 font-light leading-[1.55]">{body}</span>
          <button type="submit" disabled={pending} className="min-h-12 self-start rounded-pill bg-teal px-5 text-14.5 font-semibold text-white hover:bg-teal-dark disabled:opacity-70">
            {button}
          </button>
        </form>
      ) : (
        <div id="hg-confirm-result" tabIndex={-1} role={state.status === "error" ? "alert" : "status"} className={cn("text-14.5 leading-normal", state.status === "error" ? "font-medium text-emergency" : "text-success")}>
          {state.message}
          {state.status === "success" && after ? <p className="mt-1 text-ink-soft">{after}</p> : null}
        </div>
      )}
    </div>
  );
}

// ── Download, sign out or delete ─────────────────────────────────────────────────

export function DataControls({
  lang,
  t,
  signOut,
  published,
  facts,
  startOpen,
  deleteHref,
  closeHref,
}: {
  lang: Lang;
  t: {
    download: string;
    downloadBody: string;
    downloadAgain: string;
    readyStrong: string;
    readyRest: string;
    saveFile: string;
    deleteTitle: string;
    deleteCard: string;
    deleteOpen: string;
    panelTitle: string;
    whatHappens: string;
    cantUndo: string;
    confirmDelete: string;
    keepAccount: string;
    deleting: string;
    choiceErr: string;
    working: string;
  };
  signOut: ReactNode;
  /** The published-review question, when there is one. */
  published: { legend: string; intro: string; options: { value: "keep" | "remove"; label: string; desc: string }[] } | null;
  facts: string[];
  startOpen: boolean;
  deleteHref: string;
  closeHref: string;
}) {
  const focusLater = useFocusLater();
  const [expState, expAction, exporting] = useActionState<ActionState<ExportedData>, FormData>(exportMyData, idle);
  const [delState, delAction, deleting] = useActionState<ActionState<unknown>, FormData>(deleteMyAccount, idle);
  const [open, setOpen] = useState(startOpen);
  const [choiceErr, setChoiceErr] = useState(false);
  const file = expState.status === "success" ? expState.data : undefined;
  const href = useMemo(() => (file ? URL.createObjectURL(new Blob([file.json], { type: "application/json" })) : null), [file]);
  useEffect(() => {
    return () => {
      if (href) URL.revokeObjectURL(href);
    };
  }, [href]);
  useOnChange(expState, (s) => {
    if (s.status === "success") focusLater("hg-dl-link");
  });
  useEffect(() => {
    if (startOpen) focusElement("hg-del-h");
  }, [startOpen]);
  useOnChange(delState, (s) => {
    if (s.status === "error") focusElement("hg-del-opts");
  });
  const err = choiceErr ? t.choiceErr : delState.status === "error" ? delState.message : null;

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18.75rem),1fr))] items-start gap-3.5">
        <div className="flex min-w-0 flex-col gap-2.5 rounded-20 border border-line p-4.5">
          <h3 className="m-0 text-16.5 font-semibold">{t.download}</h3>
          <p className="text-14 font-light leading-[1.55] text-ink-soft">{t.downloadBody}</p>
          <form action={expAction}>
            <input type="hidden" name="lang" value={lang} />
            <button type="submit" disabled={exporting} className="min-h-12 rounded-pill bg-ink px-5 text-14.5 font-medium text-cream hover:bg-ink-soft disabled:opacity-70">
              {exporting ? t.working : file ? t.downloadAgain : t.download}
            </button>
          </form>
          {file && href && (
            <div role="status" className="flex flex-col gap-2 rounded-14 bg-success-tint px-3.5 py-3 text-14 leading-normal text-success">
              <span>
                <b className="font-semibold">{t.readyStrong}</b>
                {t.readyRest}
              </span>
              <a id="hg-dl-link" href={href} download={file.filename} className="inline-flex min-h-11 items-center self-start rounded-pill bg-teal px-4.5 text-14 font-semibold text-white [overflow-wrap:anywhere] hover:bg-teal-dark hover:text-white">
                {t.saveFile.replace("{file}", file.filename)}
              </a>
            </div>
          )}
          <Err state={expState} />
        </div>
        {signOut}
        <div className="flex min-w-0 flex-col gap-2.5 rounded-20 border border-line p-4.5">
          <h3 className="m-0 text-16.5 font-semibold text-emergency">{t.deleteTitle}</h3>
          <p className="text-14 font-light leading-[1.55] text-ink-soft">{t.deleteCard}</p>
          <a
            id="hg-del-open"
            href={deleteHref}
            aria-expanded={open}
            onClick={(e) => {
              e.preventDefault();
              setOpen(true);
              focusLater("hg-del-h");
            }}
            className="inline-flex min-h-12 items-center self-start rounded-pill border-[1.5px] border-emergency bg-white px-5 text-14.5 font-medium text-emergency hover:bg-emergency-tint hover:text-emergency"
          >
            {t.deleteOpen}
          </a>
        </div>
      </div>
      {open && (
        <form
          id="hg-delete"
          action={delAction}
          role="group"
          aria-labelledby="hg-del-h"
          onSubmit={(e) => {
            if (published && !new FormData(e.currentTarget).get("publishedReviews")) {
              e.preventDefault();
              setChoiceErr(true);
              focusElement("hg-del-opts");
            }
          }}
          className="flex min-w-0 flex-col gap-3.5 rounded-20 border-2 border-emergency p-5"
        >
          <input type="hidden" name="lang" value={lang} />
          <h3 id="hg-del-h" tabIndex={-1} className="m-0 text-20 font-bold tracking-title text-emergency">
            {t.panelTitle}
          </h3>
          <span className="text-15 font-semibold">{t.whatHappens}</span>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {facts.map((f) => (
              <li key={f} className="flex items-baseline gap-3 text-14 leading-[1.55]">
                <span aria-hidden="true" className="size-1.75 flex-none -translate-y-0.5 rounded-full bg-emergency" />
                {f}
              </li>
            ))}
          </ul>
          {published && (
            <fieldset id="hg-del-opts" tabIndex={-1} aria-invalid={!!err || undefined} className="m-0 flex min-w-0 flex-col gap-2 rounded-16 border-[1.5px] border-line-strong px-3.5 pt-3 pb-3.5">
              <legend className="px-1.5 text-15 font-semibold">{published.legend}</legend>
              <span className="text-14 font-light leading-[1.55] text-ink-soft">{published.intro}</span>
              {published.options.map((o) => (
                <label
                  key={o.value}
                  className="flex min-h-12 cursor-pointer items-start gap-3 rounded-14 border-[1.5px] border-line-strong bg-white px-3.5 py-3 has-checked:border-ink has-checked:bg-cream has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal"
                >
                  <input type="radio" name="publishedReviews" value={o.value} onChange={() => setChoiceErr(false)} className="m-0 mt-0.5 size-5 flex-none accent-teal" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-14.5 font-medium leading-[1.4]">{o.label}</span>
                    <span className="text-13.5 font-light leading-normal text-ink-soft">{o.desc}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {err && (
            <span role="alert" className="text-14 font-medium text-emergency">
              {err}
            </span>
          )}
          <span className="text-14.5 font-medium leading-[1.55]">{t.cantUndo}</span>
          <div className="flex flex-wrap gap-2.5">
            <button type="submit" disabled={deleting} className="min-h-12.5 rounded-pill bg-emergency px-5.5 text-15 font-semibold text-white hover:bg-[#8f1c13] disabled:opacity-70">
              {deleting ? t.deleting : t.confirmDelete}
            </button>
            <a
              href={closeHref}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                setChoiceErr(false);
                focusLater("hg-del-open");
              }}
              className="inline-flex min-h-12.5 items-center rounded-pill border-[1.5px] border-ink bg-white px-5 text-15 font-medium text-ink hover:bg-cream hover:text-ink"
            >
              {t.keepAccount}
            </a>
          </div>
        </form>
      )}
    </>
  );
}
