"use client";

// "Claim your profile" (Content and Trust #claim): Find listing → Your role → Confirm → Done.
// One <form> posts every step to claimStep (it answers with the next step), so the flow also works
// without JavaScript. "Not your listing? Search for yours" is a separate small form.

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { claimStep, findClaimListings, type ClaimData, type ClaimSearchData } from "@/app/actions/claim";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import { routes } from "@/lib/routes";

import { FormError, StepBars } from "./bits";
import { ChipRadios } from "./form-kit";

export type ClaimLabels = {
  steps: string[];
  progress: string;
  doneStep: string;
  findTitle: string;
  notYours: string;
  searchLabel: string;
  searchPlaceholder: string;
  search: string;
  noMatches: string;
  alreadyClaimed: string;
  claimThis: string;
  notListed: string;
  requestListing: string;
  notListedRest: string;
  whoTitle: string;
  roles: Record<string, string>;
  regLabel: string;
  regPlaceholder: string;
  regHelp: string;
  errRole: string;
  errReg: string;
  confirmTitle: string;
  confirmBody: string;
  codeLabel: string;
  codePlaceholder: string;
  devCode: string;
  resend: string;
  errCode: string;
  doneTitle: string;
  doneBody: string;
  doneBodyNoPhone: string;
  canEdit: string;
  canEditBody: string;
  editorControlled: string;
  editorControlledBody: string;
  reference: string;
  back: string;
  continue: string;
  sending: string;
  backToProfile: string;
  trackIt: string;
  signIn: string;
};

type State = ActionState<ClaimData>;

export type ClaimFlowProps = {
  lang: "en" | "hi";
  kind: string;
  slug: string;
  listing: { name: string; line: string };
  labels: ClaimLabels;
  profileHref: string;
  activityHref: string;
  missingHref: string;
  signInHref: string;
  /** This person already has a claim of this listing with the editors (shown instead of the flow). */
  pending?: { title: string; body: string } | null;
};

export function ClaimFlow({
  lang,
  kind,
  slug,
  listing,
  labels,
  profileHref,
  activityHref,
  missingHref,
  signInHref,
  pending,
}: ClaimFlowProps) {
  const [state, action] = useActionState<State, FormData>(claimStep, idle);
  const [search, searchAction] = useActionState<ActionState<ClaimSearchData>, FormData>(findClaimListings, idle);
  const d = state.status !== "idle" ? state.data : undefined;
  const step = d?.step ?? 1;
  const [role, setRole] = useState(d?.role ?? "");
  const [reg, setReg] = useState(d?.registrationNumber ?? "");
  const [code, setCode] = useState("");
  const topRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const formError = state.status === "error" && !Object.keys(fieldErrors).length ? state.message : null;

  // A new code (or a new step) clears the code box.
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.status === "success") setCode("");
  }

  useEffect(() => {
    if (state.status === "idle") return;
    if (step === 4) doneRef.current?.focus();
    // Field errors only (no FormError line): focus the first field that needs fixing.
    if (state.status === "error" && state.fieldErrors && Object.keys(state.fieldErrors).length) {
      topRef.current?.querySelector<HTMLElement>('input[aria-invalid="true"], fieldset[aria-invalid="true"] input')?.focus();
    }
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }, [state, step]);

  if (step === 4 && d?.ref) {
    return (
      <div className="flex flex-col gap-5">
        <StepBars steps={labels.steps} current={4} progress={labels.progress.replace("{current}", "4").replace("{total}", "4")} doneLabel={labels.doneStep} />
        <div ref={doneRef} tabIndex={-1} role="status" className="flex flex-col gap-4 rounded-24 border border-line p-6">
          <p className="text-22 leading-snug font-bold">{labels.doneTitle}</p>
          <p className="font-mono text-11.5 text-subtle uppercase">{labels.reference.replace("{ref}", d.ref)}</p>
          <p className="text-14 leading-[1.55] font-light text-muted">{d.noPhone ? labels.doneBodyNoPhone : labels.doneBody}</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.75rem),1fr))] gap-3">
            <div className="flex flex-col gap-1.5 rounded-18 bg-success-tint p-4">
              <span className="mono-label text-10.5 text-success">{labels.canEdit}</span>
              <span className="text-14 leading-[1.7] font-light">{labels.canEditBody}</span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-18 bg-cream p-4">
              <span className="mono-label text-10.5 text-caution">{labels.editorControlled}</span>
              <span className="text-14 leading-[1.7] font-light">{labels.editorControlledBody}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5">
            <Link href={profileHref} className="inline-flex min-h-11 items-center font-medium">
              {labels.backToProfile}
            </Link>
            <Link href={activityHref} className="inline-flex min-h-11 items-center font-medium">
              {labels.trackIt}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (pending) {
    return (
      <div role="status" className="flex flex-col gap-1.5 rounded-18 bg-cream px-4.5 py-4 text-13.5 leading-[1.6] font-light text-muted">
        <p className="text-15 leading-snug font-semibold text-ink">{pending.title}</p>
        <p>{pending.body}</p>
        <Link href={activityHref} className="inline-flex min-h-11 items-center self-start font-medium">
          {labels.trackIt}
        </Link>
      </div>
    );
  }

  const progress = labels.progress.replace("{current}", String(step)).replace("{total}", "4");
  const defaultIntent = step === 1 ? "start" : step === 2 ? "details" : "code";

  return (
    <div ref={topRef} className="flex flex-col gap-5">
      <StepBars steps={labels.steps} current={step} progress={progress} doneLabel={labels.doneStep} />
      <div className="flex flex-col gap-4 rounded-24 border border-line p-5 sm:p-6">
        {step === 1 && <h2 className="text-18 font-semibold">{labels.findTitle}</h2>}
        <form action={action} noValidate className="flex flex-col gap-4">
          {/* Enter in a field means "Continue", not "Back". */}
          <button type="submit" name="intent" value={defaultIntent} tabIndex={-1} aria-hidden="true" className="sr-only" />
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="providerKind" value={kind} />
          <input type="hidden" name="providerSlug" value={slug} />
          <input type="hidden" name="step" value={step} />
          {step !== 2 && (
            <>
              <input type="hidden" name="role" value={role} />
              <input type="hidden" name="registrationNumber" value={reg} />
            </>
          )}

          {step === 1 && (
            <button
              type="submit"
              name="intent"
              value="start"
              className="flex flex-col gap-0.75 rounded-16 border-2 border-teal bg-success-tint p-3.5 text-left text-ink hover:bg-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              <span className="font-semibold">{listing.name}</span>
              <span className="text-13 font-light text-muted">{listing.line}</span>
              <span className="mt-1 text-13.5 font-medium text-teal">{labels.continue}</span>
            </button>
          )}

          {step === 2 && (
            <>
              <h2 className="text-18 font-semibold">{labels.whoTitle}</h2>
              <ChipRadios
                name="role"
                legend={labels.whoTitle}
                legendClassName="sr-only"
                options={Object.entries(labels.roles).map(([value, label]) => ({ value, label }))}
                value={role}
                onChange={setRole}
                error={fieldErrors.role ? labels.errRole : undefined}
              />
              <Field id="claim-reg" label={labels.regLabel} error={fieldErrors.registrationNumber ? labels.errReg : undefined}>
                <Input name="registrationNumber" value={reg} onChange={(e) => setReg(e.target.value)} placeholder={labels.regPlaceholder} maxLength={40} autoComplete="off" />
              </Field>
              <p className="text-13 leading-normal font-light text-muted">{labels.regHelp}</p>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-18 font-semibold">{labels.confirmTitle}</h2>
              <p className="text-14 leading-[1.55] font-light text-muted">{labels.confirmBody.replace("{last}", d?.phoneLast ?? "")}</p>
              {d?.devCode && <p className="rounded-14 bg-cream px-3.5 py-2.5 font-mono text-12.5 text-subtle">{labels.devCode.replace("{code}", d.devCode)}</p>}
              <Field id="claim-code" label={labels.codeLabel} error={fieldErrors.code ? (state.status === "error" ? state.message : labels.errCode) : undefined}>
                <Input
                  name="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={labels.codePlaceholder}
                  className="max-w-65 text-18 tracking-[0.3em]"
                />
              </Field>
              <div>
                <Button type="submit" name="intent" value="resend" variant="ghost" size="sm">
                  {labels.resend}
                </Button>
              </div>
            </>
          )}

          {formError && (
            <FormError>
              {formError}
              {state.status === "error" && state.code === "sign_in_required" && (
                <>
                  {" "}
                  <Link href={signInHref} className="font-semibold">
                    {labels.signIn}
                  </Link>
                </>
              )}
            </FormError>
          )}

          {step > 1 && (
            <div className="flex flex-row-reverse flex-wrap items-center justify-between gap-2.5 border-t border-line pt-3.5">
              <SubmitButton name="intent" value={step === 2 ? "details" : "code"} pendingLabel={labels.sending}>
                {labels.continue}
              </SubmitButton>
              <Button type="submit" name="intent" value="back" variant="soft" size="md">
                {labels.back}
              </Button>
            </div>
          )}
        </form>

        {step === 1 && (
          <>
            <form action={searchAction} className="flex flex-col gap-2.5 border-t border-line pt-4">
              <input type="hidden" name="lang" value={lang} />
              <Field id="claim-search" label={labels.notYours}>
                <Input name="query" placeholder={labels.searchPlaceholder} defaultValue={search.status === "success" ? search.data?.query : undefined} maxLength={80} autoComplete="off" />
              </Field>
              <div>
                <SubmitButton variant="soft" size="sm" pendingLabel={labels.sending}>
                  {labels.search}
                </SubmitButton>
              </div>
            </form>
            {search.status === "success" && search.data && (
              <ul role="status" className="flex flex-col gap-2">
                {search.data.matches.filter((m) => m.slug !== slug).length === 0 ? (
                  <li className="text-13.5 font-light text-muted">{labels.noMatches.replace("{q}", search.data.query)}</li>
                ) : (
                  search.data.matches
                    .filter((m) => m.slug !== slug)
                    .map((m) => (
                      <li key={m.slug}>
                        {m.claimed ? (
                          <div className="flex flex-col gap-0.75 rounded-16 border-[1.5px] border-line p-3.5 text-muted">
                            <span className="font-semibold text-ink">{m.name}</span>
                            <span className="text-13 font-light">
                              {[m.headline, m.place].filter(Boolean).join(" · ")} · {labels.alreadyClaimed}
                            </span>
                          </div>
                        ) : (
                          <Link
                            href={routes.claim(lang, m.profileKind, m.slug)}
                            className="flex flex-col gap-0.75 rounded-16 border-[1.5px] border-line bg-white p-3.5 text-ink hover:border-ink hover:text-ink"
                          >
                            <span className="font-semibold">{m.name}</span>
                            <span className="text-13 font-light text-muted">{[m.headline, m.place].filter(Boolean).join(" · ")}</span>
                            <span className="text-13.5 font-medium text-teal">{labels.claimThis}</span>
                          </Link>
                        )}
                      </li>
                    ))
                )}
              </ul>
            )}
            <p className="text-13 font-light text-muted">
              {labels.notListed}{" "}
              <Link href={missingHref} className="font-normal">
                {labels.requestListing}
              </Link>
              {labels.notListedRest}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
