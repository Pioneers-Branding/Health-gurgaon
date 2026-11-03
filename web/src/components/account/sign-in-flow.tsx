"use client";

// Sign in: 1 · Your number → 2 · Code → 3 · Choices (first sign-in only) → Done.
// Prototype: "Health Gurgaon Account.dc.html" #signin. Each step is a real form posting a Server
// Action (requestOtp, verifyOtp, saveWelcomeChoices), so it also works without JavaScript; the
// step shown is derived from the three action states. The server decides first versus returning
// sign-in (verifyOtp's firstSignIn), never a checkbox.

import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";

import { requestOtp, saveWelcomeChoices, verifyOtp, type OtpRequestData, type VerifyOtpData, type WelcomeChoicesData } from "@/app/actions/auth";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";
import { fmt } from "@/lib/i18n/format";
import type { AccountStrings } from "@/lib/i18n/areas/account";

import { cleanCode, cleanPhoneInput, listText, phoneProblem, type Lang } from "./format";
import { focusElement, useHydrated, useOnChange } from "./hooks";

export type SignedInInfo = {
  phoneMasked: string;
  /** "the Weekly Gurgaon Health Report", "locality alerts for Sohna Road": already in the page language. */
  messages: string[];
  attention: number;
  hasActivity: boolean;
};

type Step = "phone" | "code" | "choices" | "done";

const radioCard =
  "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-14 border-[1.5px] border-line-strong bg-white px-4 text-15 text-ink has-checked:border-teal has-checked:bg-success-tint has-checked:font-semibold has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal";
const primaryBtn = "inline-flex min-h-13 items-center justify-center self-start rounded-pill bg-teal px-6.5 text-16 font-semibold text-white hover:bg-teal-dark hover:text-white disabled:cursor-default disabled:bg-line disabled:text-subtle";

export function SignInFlow({
  lang,
  t,
  common,
  links,
  next,
  nextName,
  signedOut,
  signedIn,
  localities,
  crumbs,
  aside,
}: {
  lang: Lang;
  t: AccountStrings["signin"];
  common: AccountStrings["common"];
  links: { privacy: string; saved: string; activity: string; consent: string; restart: string };
  /** A safe same-site path to go back to after signing in. */
  next: string | null;
  /** "Dr. Ananya Rao" when `next` is a profile. */
  nextName: string | null;
  signedOut: boolean;
  signedIn: SignedInInfo | null;
  localities: { slug: string; name: string; nameEn: string }[];
  /** "Gurugram › Sign in", rendered on the server. */
  crumbs: ReactNode;
  aside: ReactNode;
}) {
  const hydrated = useHydrated();
  const [reqState, requestAction, reqPending] = useActionState<ActionState<OtpRequestData>, FormData>(requestOtp, idle);
  const [verState, verifyAction, verPending] = useActionState<ActionState<VerifyOtpData>, FormData>(verifyOtp, idle);
  const [choState, choicesAction, choPending] = useActionState<ActionState<WelcomeChoicesData>, FormData>(saveWelcomeChoices, idle);

  const [phone, setPhone] = useState("");
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [via, setVia] = useState<"sms" | "whatsapp">("sms");
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState(false);
  const [wait, setWait] = useState<number | null>(null);
  const [weekly, setWeekly] = useState(false);
  const [local, setLocal] = useState(false);

  // A new code (or a new number) starts the code step afresh: old wrong-code errors don't carry over.
  const [seenReq, setSeenReq] = useState(reqState);
  const [staleVerify, setStaleVerify] = useState<ActionState<VerifyOtpData> | null>(null);
  // The last code that was sent: a failed resend ("Please wait 20 seconds…") stays on the code step.
  const [lastSent, setLastSent] = useState<OtpRequestData | undefined>(undefined);
  if (reqState !== seenReq) {
    setSeenReq(reqState);
    setStaleVerify(verState);
    if (reqState.status === "success") {
      setEditing(false);
      setCode("");
      setWait(30);
      setLastSent(reqState.data);
      if (reqState.data) setVia(reqState.data.via);
    }
  }
  const ver: ActionState<VerifyOtpData> = verState === staleVerify ? idle : verState;

  let step: Step = "phone";
  let welcomeBack = false;
  if (choState.status === "success") step = "done";
  else if (ver.status === "success") {
    step = ver.data?.firstSignIn ? "choices" : "done";
    welcomeBack = !ver.data?.firstSignIn;
  } else if ((reqState.status === "success" || lastSent) && !editing) step = "code";
  else if (signedIn) {
    step = "done";
    welcomeBack = true;
  }

  const sent = reqState.status === "success" ? reqState.data : lastSent;
  const masked = (ver.status === "success" && ver.data?.phoneMasked) || signedIn?.phoneMasked || sent?.phoneMasked || "";
  const locked = ver.status === "error" && ver.code === "locked";

  // The 0:30 before a new code can be sent.
  const resendAt = sent?.resendAt;
  useEffect(() => {
    if (!resendAt) return;
    const tick = () => setWait(Math.max(0, Math.ceil((new Date(resendAt).getTime() - Date.now()) / 1000)));
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [resendAt]);
  // The server allows a new code only 30 seconds after the last one, also after 3 wrong tries.
  const waiting = wait !== null && wait > 0;

  // Focus moves to the result after each action.
  useOnChange(step, () => focusElement("hg-step-title"));
  useOnChange(reqState, (s) => {
    if (s.status === "error") focusElement(step === "code" ? "hg-code" : "hg-phone");
    else if (s.status === "success" && step === "code") focusElement("hg-code");
  });
  useOnChange(ver, (s) => {
    if (s.status === "error") {
      setCode("");
      focusElement("hg-code");
    }
  });
  useOnChange(choState, (s) => {
    if (s.status === "error") focusElement("hg-opt-loc");
  });
  useEffect(() => {
    if (signedOut) focusElement("hg-signedout");
  }, [signedOut]);

  // ── Phone step ─────────────────────────────────────────────────────────────
  const problemText = (value: string) => {
    const p = phoneProblem(value);
    if (!p) return null;
    return p.kind === "empty" ? t.phoneErrEmpty : p.kind === "first" ? t.phoneErrFirst : fmt(t.phoneErrCount, { n: p.n });
  };
  const serverPhoneErr =
    reqState.status === "error" && !editing ? (reqState.fieldErrors?.phone?.length ? (problemText(phone) ?? reqState.message) : reqState.message) : null;
  const shownPhoneErr = phoneErr ?? (step === "phone" ? serverPhoneErr : null);
  const firstOk = !phone || /^[6-9]/.test(phone);
  const phoneBad = !!shownPhoneErr || !firstOk;
  const phoneHint = !phone ? t.phoneHintEmpty : !firstOk ? t.phoneHintFirst : phone.length < 10 ? fmt(t.phoneHintCount, { n: phone.length }) : t.phoneHintOk;
  const viaName = (v: "sms" | "whatsapp") => (v === "sms" ? common.sms : common.whatsapp);

  // ── Code step ──────────────────────────────────────────────────────────────
  const codeErr =
    ver.status === "error" ? (ver.fieldErrors?.code?.[0] ?? ver.message) : reqState.status === "error" && step === "code" ? reqState.message : null;
  const otherVia = via === "sms" ? "whatsapp" : "sms";

  // ── Done step ──────────────────────────────────────────────────────────────
  const first = choState.status === "success" ? choState.data : undefined;
  const placeName = (name: string | null) => (name ? (localities.find((l) => l.nameEn === name)?.name ?? name) : null);
  const firstPlace = placeName(first?.locality ?? null);
  const firstNames = first ? [first.weekly ? t.msgNames.weekly : "", firstPlace ? fmt(t.msgNames.local, { place: firstPlace }) : ""].filter(Boolean) : [];
  const doneLines = welcomeBack
    ? [signedIn?.messages.length ? fmt(t.doneMsgsWelcome, { list: listText(signedIn.messages, common.and) }) : t.doneNoMsgsWelcome]
    : firstNames.length
      ? [fmt(t.doneMsgsFirst, { list: listText(firstNames, common.and), lang: t.langWord[first?.messageLang ?? "en"] }), t.doneMsgsFirstNoted]
      : [fmt(t.doneNoneFirst, { lang: t.langWord[first?.messageLang ?? lang] }), t.doneNoneFirstNoted];

  const backFlow = step === "done" && welcomeBack;
  const stepNames = backFlow ? [t.steps.phone, t.steps.code, t.steps.done] : [t.steps.phone, t.steps.code, t.steps.choices];
  const stepIdx = { phone: 0, code: 1, choices: 2, done: backFlow ? 2 : 3 }[step];
  const heroTitle = step === "done" ? (welcomeBack ? t.heroWelcome : t.heroSignedIn) : step === "choices" ? t.heroSignedIn : t.heroTitle;
  const heroSub = step === "done" ? (welcomeBack ? t.heroSubWelcome : t.heroSubDone) : step === "choices" ? t.heroSubChoices : t.heroSub;
  const showSignedOut = signedOut && !signedIn && step === "phone" && reqState.status !== "success";
  const showFrom = !!next && (step === "phone" || step === "code");
  const attention = signedIn?.attention ?? 0;

  return (
    <>
      <div className="bg-cream">
        <div className="mx-auto flex w-full max-w-page flex-col gap-2.5 px-6 pt-4 pb-7">
          {crumbs}
          <h1 className="m-0 text-38 font-bold leading-[1.08] tracking-h1 text-balance">{heroTitle}</h1>
          <p className="max-w-[40rem] text-16 font-light leading-[1.6] text-muted">{heroSub}</p>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-page flex-wrap items-start gap-7 px-6 pt-7 pb-14">
        <section aria-labelledby="hg-step-title" className="flex min-w-0 max-w-[47.5rem] flex-[3_1_32.5rem] flex-col gap-4 rounded-20 border-[1.5px] border-ink p-[clamp(16px,4.5vw,22px)]">
          {showSignedOut && (
            <div id="hg-signedout" role="status" className="rounded-14 bg-success-tint px-3.5 py-3 text-14.5 leading-normal text-success">
              {t.signedOut}
            </div>
          )}
          {showFrom && (
            <div className="rounded-14 bg-cream px-3.5 py-3 text-14.5 leading-normal text-ink-soft">
              {nextName ? (
                <>
                  {t.fromNamedLead} <b className="font-semibold">{nextName}</b>
                  {t.fromNamedTail}
                </>
              ) : (
                t.fromPage
              )}
            </div>
          )}
          <ol aria-label={t.stepsLabel} className="m-0 grid list-none grid-cols-3 gap-1.5 p-0">
            {stepNames.map((name, i) => (
              <li key={name} aria-current={i === stepIdx ? "step" : undefined} className="flex min-w-0 flex-col gap-1.5">
                <span aria-hidden="true" className={cn("block h-1.5 rounded-3", i <= stepIdx ? "bg-teal" : "bg-line")} />
                <span className={cn("text-12.5 leading-[1.3]", i === stepIdx ? "font-semibold" : "font-normal", i <= stepIdx ? "text-ink" : "text-subtle")}>
                  {i + 1} · {name}
                </span>
              </li>
            ))}
          </ol>

          {step === "phone" && (
            <form
              action={requestAction}
              noValidate
              onSubmit={(e) => {
                const problem = problemText(phone);
                if (problem) {
                  e.preventDefault();
                  setPhoneErr(problem);
                  focusElement("hg-phone");
                }
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="lang" value={lang} />
              <h2 id="hg-step-title" className="m-0 text-22 font-bold tracking-[-.025em]">
                {t.phoneTitle}
              </h2>
              <div id="hg-phone-field" className="flex flex-col gap-2">
                <label htmlFor="hg-phone" className="text-15 font-medium">
                  {t.phoneLabel} <span className="font-light text-muted">{t.phoneLabelNote}</span>
                </label>
                <div className={cn("flex w-full max-w-[26.25rem] items-stretch rounded-14 border-[1.5px] bg-white", phoneBad ? "border-emergency" : "border-ink")}>
                  <span aria-hidden="true" className="flex items-center rounded-l-12 border-r border-line-strong bg-cream px-3.5 text-18 font-medium text-ink-soft">
                    +91
                  </span>
                  <input
                    id="hg-phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => {
                      setPhone(cleanPhoneInput(e.target.value));
                      setPhoneErr(null);
                    }}
                    placeholder={t.phonePlaceholder}
                    aria-describedby={shownPhoneErr ? "hg-phone-err" : "hg-phone-help"}
                    aria-invalid={phoneBad || undefined}
                    className="min-h-13.5 min-w-0 flex-1 rounded-r-12 border-0 bg-transparent px-3.5 text-19 tracking-[.04em] text-ink outline-offset-[-4px] placeholder:font-light placeholder:text-subtle"
                  />
                </div>
                {shownPhoneErr ? (
                  <span id="hg-phone-err" role="alert" className="text-14 font-medium leading-normal text-emergency">
                    {shownPhoneErr}
                  </span>
                ) : (
                  <span
                    id="hg-phone-help"
                    className={cn("text-13.5 leading-normal", phoneBad ? "font-medium text-emergency" : phone.length === 10 ? "text-success" : "text-muted")}
                  >
                    {phoneHint}
                  </span>
                )}
              </div>
              <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                <legend className="mb-2 p-0 text-15 font-medium">{t.viaLegend}</legend>
                <div className="flex flex-wrap gap-2">
                  {(["sms", "whatsapp"] as const).map((v) => (
                    <label key={v} className={radioCard}>
                      <input type="radio" name="via" value={v} checked={via === v} onChange={() => setVia(v)} className="m-0 size-5 accent-teal" />
                      {viaName(v)}
                    </label>
                  ))}
                </div>
                <span className="text-13.5 font-light leading-[1.55] text-muted">{via === "sms" ? t.viaNoteSms : t.viaNoteWa}</span>
              </fieldset>
              <button type="submit" disabled={reqPending} aria-busy={reqPending || undefined} className={primaryBtn}>
                {reqPending ? common.sending : via === "sms" ? t.sendSms : t.sendWa}
              </button>
              <div className="flex flex-col">
                <span className="text-13.5 font-light leading-[1.55] text-muted">{t.numberUse}</span>
                <Link href={links.privacy} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
                  {t.numberLink}
                </Link>
              </div>
            </form>
          )}

          {step === "code" && sent && (
            <>
              <form action={verifyAction} noValidate className="flex flex-col gap-4">
                <input type="hidden" name="lang" value={lang} />
                <h2 id="hg-step-title" className="m-0 text-22 font-bold tracking-[-.025em]">
                  {t.codeTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span id="hg-code-sent" role="status" className="text-15 leading-[1.55] text-ink-soft">
                    {fmt(sent.resent ? t.resentLead : t.sentLead, { via: viaName(sent.via) })}{" "}
                    <b className="whitespace-nowrap font-semibold" lang="en">
                      {sent.phoneMasked}
                    </b>
                    {sent.resent ? t.resentTail : t.sentTail}
                  </span>
                  <a
                    href={links.restart}
                    onClick={(e) => {
                      e.preventDefault();
                      setEditing(true);
                      setPhoneErr(null);
                      setWait(null);
                    }}
                    className="inline-flex min-h-11 items-center px-1 text-14.5 font-medium"
                  >
                    {t.changeNumber}
                  </a>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="hg-code" className="text-15 font-medium">
                    {t.codeLabel}
                  </label>
                  <input
                    id="hg-code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(cleanCode(e.target.value))}
                    aria-describedby={["hg-code-sent", sent.devCode ? "hg-code-hint" : "", codeErr ? "hg-code-err" : ""].filter(Boolean).join(" ")}
                    aria-invalid={!!codeErr || undefined}
                    className={cn(
                      "min-h-14.5 w-full max-w-70 rounded-14 border-[1.5px] bg-white px-4 text-26 font-medium tracking-[.35em] text-ink",
                      codeErr ? "border-emergency" : "border-ink",
                    )}
                  />
                  {sent.devCode && (
                    // Development only (OTP_PROVIDER=dev outside production): the code, and where the server logs it.
                    <span id="hg-code-hint" className="mono-label text-11 font-normal leading-[1.6] text-subtle">
                      {fmt(t.devNote, { code: sent.devCode })}
                    </span>
                  )}
                  {codeErr && (
                    <span id="hg-code-err" role="alert" className="text-14 font-medium leading-normal text-emergency">
                      {codeErr}
                    </span>
                  )}
                </div>
                <button type="submit" disabled={locked || verPending} aria-busy={verPending || undefined} className={primaryBtn}>
                  {verPending ? t.verifying : t.verify}
                </button>
              </form>
              {/* Resending is its own forms (not formAction buttons inside the code form): React
                  overrides a formAction button's name, so a name="via" button would lose its value. */}
              <div className="flex flex-col gap-2.5 border-t border-line pt-3.5">
                <span className="text-15 font-medium">{t.noCode}</span>
                {waiting ? (
                  <span className="text-14 leading-normal text-muted">
                    {t.waitLead}{" "}
                    <b className="font-semibold tabular-nums">{`0:${String(wait).padStart(2, "0")}`}</b>
                    {t.waitTail}
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        [via, fmt(t.resendSame, { via: viaName(via) }), "border-ink font-medium hover:bg-cream"],
                        [otherVia, fmt(t.resendOther, { via: viaName(otherVia) }), "border-line-strong hover:border-ink"],
                      ] as const
                    ).map(([v, label, look]) => (
                      <form key={v} action={requestAction} noValidate>
                        <input type="hidden" name="lang" value={lang} />
                        <input type="hidden" name="phone" value={sent.phone} />
                        <input type="hidden" name="resend" value="1" />
                        <input type="hidden" name="via" value={v} />
                        <button type="submit" disabled={reqPending} className={cn("min-h-12 rounded-pill border-[1.5px] bg-white px-4.5 text-14.5 text-ink", look)}>
                          {label}
                        </button>
                      </form>
                    ))}
                  </div>
                )}
                <span className="text-13.5 font-light leading-[1.55] text-muted">{t.codeFoot}</span>
              </div>
            </>
          )}

          {step === "choices" && (
            <form action={choicesAction} className="flex flex-col gap-3.5">
              <input type="hidden" name="lang" value={lang} />
              <div role="status" className="rounded-14 bg-success-tint px-3.5 py-3 text-14.5 leading-normal text-success">
                {t.acceptedLead}{" "}
                <b className="whitespace-nowrap font-semibold" lang="en">
                  {masked}
                </b>
                .
              </div>
              <h2 id="hg-step-title" className="m-0 text-22 font-bold tracking-[-.025em]">
                {t.choicesTitle}
              </h2>
              <p className="text-14.5 font-light leading-[1.6] text-ink-soft">{t.choicesIntro}</p>
              {(
                [
                  ["weekly", t.optWeeklyName, t.optWeeklyWhy, t.optWeeklyOften, weekly, setWeekly],
                  ["local", t.optLocalName, t.optLocalWhy, t.optLocalOften, local, setLocal],
                ] as const
              ).map(([name, title, why, often, on, set]) => (
                <label
                  key={name}
                  className="flex cursor-pointer items-start gap-3.5 rounded-16 border-[1.5px] border-line-strong bg-white p-3.5 has-checked:border-teal has-checked:bg-success-tint has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal"
                >
                  <input type="checkbox" name={name} checked={on} onChange={() => set(!on)} className="m-0 mt-0.5 size-5.5 flex-none accent-teal" />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-15.5 font-semibold leading-[1.35]">{title}</span>
                    <span className="text-14 font-light leading-normal text-ink-soft">
                      <b className="font-medium">{t.whatFor}</b> {why}
                    </span>
                    <span className="text-14 font-light leading-normal text-ink-soft">
                      <b className="font-medium">{t.howOften}</b> {often}
                    </span>
                  </span>
                </label>
              ))}
              {(local || !hydrated) && (
                <label className="flex flex-col gap-1.5 text-15 font-medium">
                  {t.whichLocality}
                  <select
                    id="hg-opt-loc"
                    name="locality"
                    defaultValue={localities[0]?.slug}
                    aria-invalid={(choState.status === "error" && !!choState.fieldErrors?.locality) || undefined}
                    className="min-h-12 max-w-80 rounded-12 border-[1.5px] border-line-strong bg-white px-3 text-15 font-normal text-ink"
                  >
                    {localities.map((l) => (
                      <option key={l.slug} value={l.slug}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                <legend className="mb-2 p-0 text-15 font-medium">{t.langLegend}</legend>
                <div className="flex flex-wrap gap-2">
                  {(["en", "hi"] as const).map((l) => (
                    <label key={l} className={radioCard}>
                      <input type="radio" name="messageLang" value={l} defaultChecked={l === lang} className="m-0 size-5 accent-teal" />
                      <span lang={l} className={l === "hi" ? "font-hindi text-17 font-medium leading-[1.2]" : undefined}>
                        {l === "en" ? "English" : "हिंदी"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="text-13.5 font-light leading-[1.55] text-muted">{t.choicesFoot}</p>
              {choState.status === "error" && (
                <p role="alert" className="text-14 font-medium text-emergency">
                  {choState.message}
                </p>
              )}
              <button type="submit" disabled={choPending} aria-busy={choPending || undefined} className={primaryBtn}>
                {choPending ? common.working : weekly || local ? t.finishSave : t.finishNone}
              </button>
            </form>
          )}

          {step === "done" && (
            <>
              <div className="flex items-center gap-3.5">
                <span aria-hidden="true" className="flex size-12 flex-none items-center justify-center rounded-full bg-success text-22 font-bold text-white">
                  ✓
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 id="hg-step-title" className="m-0 text-22 font-bold tracking-[-.025em]">
                    {t.doneTitleLead}{" "}
                    <span className="whitespace-nowrap" lang="en">
                      {masked}
                    </span>
                  </h2>
                  <span className="text-14 text-ink-soft">{t.doneSub}</span>
                </div>
              </div>
              <div role="status" className="flex flex-col gap-1.5 rounded-16 bg-cream px-4 py-3.5 text-14.5 leading-[1.55]">
                {doneLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
              {first && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-14.5 font-semibold">{t.yourChoices}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        [fmt(t.chipWeekly, { v: first.weekly ? t.on : t.off }), first.weekly],
                        [fmt(t.chipLocal, { v: firstPlace ?? t.off }), !!firstPlace],
                        [fmt(t.chipLang, { v: t.langWord[first.messageLang] }), true],
                      ] as const
                    ).map(([label, on]) => (
                      <span key={label} className={cn("rounded-pill px-3 py-1.5 text-13 font-medium", on ? "bg-success-tint text-success" : "bg-cream text-ink-soft")}>
                        {label}
                      </span>
                    ))}
                  </div>
                  <Link href={links.consent} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
                    {t.changeChoices}
                  </Link>
                </div>
              )}
              <div className="flex flex-wrap gap-2.5">
                {next ? (
                  <>
                    <Link href={next} className="inline-flex min-h-12.5 items-center rounded-pill bg-teal px-5.5 text-15 font-semibold text-white hover:bg-teal-dark hover:text-white">
                      {nextName ? fmt(t.backNamed, { name: nextName }) : t.backPage}
                    </Link>
                    <Link href={links.saved} className="inline-flex min-h-12.5 items-center rounded-pill border-[1.5px] border-ink bg-white px-5 text-15 font-medium text-ink hover:bg-cream hover:text-ink">
                      {t.goSaved}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href={links.saved} className="inline-flex min-h-12.5 items-center rounded-pill bg-teal px-5.5 text-15 font-semibold text-white hover:bg-teal-dark hover:text-white">
                      {t.goSaved}
                    </Link>
                    {signedIn?.hasActivity && (
                      <Link href={links.activity} className="inline-flex min-h-12.5 items-center rounded-pill border-[1.5px] border-ink bg-white px-5 text-15 font-medium text-ink hover:bg-cream hover:text-ink">
                        {attention ? fmt(t.goActivityNeeds, { n: attention }) : t.goActivity}
                      </Link>
                    )}
                  </>
                )}
              </div>
              <span className="text-13.5 font-light leading-[1.55] text-muted">{t.sharedPhone}</span>
            </>
          )}
        </section>
        {aside}
      </div>
    </>
  );
}
