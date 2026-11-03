"use client";

// "Dispute a ranking or a mention" (Content and Trust #dispute): What & who → Item & reason →
// Evidence → Declare & send, then "Dispute received" with the reference and what happens next.
// One <form> posts every step to disputeStep, which answers with the next step and carries the
// values back, so all four steps also work without JavaScript. Choosing "A review" shows the
// review-policy panel instead (switched with CSS, so that works without JavaScript too).

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { disputeStep, type DisputeData } from "@/app/actions/dispute";
import { emptyDisputeValues, type DisputeValues } from "@/app/actions/dispute-schemas";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/action-state";
import { detectMedicalDetails } from "@/lib/content-safety";
import { DISPUTE_MIN_DETAILS, DISPUTE_REASONS } from "@/lib/domain";
import type { ContentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { findPersonalData } from "@/lib/redact";

import { FormError, PhaseTag, PolicyTiles, StepBars, WarnBox } from "./bits";
import { CardRadios, ChipRadios } from "./form-kit";

/** A disputable item, with its display lines prepared on the server. */
export type DisputeItemView = { id: string; kind: "ranking" | "mention"; pos: string; meta: string; listHref: string | null };

export type DisputeLabels = ContentTrustStrings["dispute"] & {
  progress: string;
  doneStep: string;
  continue: string;
  back: string;
  sending: string;
  characters: string;
  phase2b: string;
  phoneWarning: string;
  medicalWarning: string;
  emailInvalid: string;
  emailPlaceholder: string;
  removeItems: readonly string[];
};

type State = ActionState<DisputeData>;

export function DisputeForm({
  lang,
  kind,
  slug,
  provider,
  claimed,
  items,
  initialKind,
  initialItemId,
  labels: L,
  hrefs,
}: {
  lang: "en" | "hi";
  kind: string;
  slug: string;
  provider: { name: string; line: string };
  claimed: boolean;
  items: { ranking: DisputeItemView[]; mention: DisputeItemView[] };
  initialKind: "ranking" | "mention" | "review";
  initialItemId: string;
  labels: DisputeLabels;
  hrefs: { report: string; claim: string; reviews: string; policy: string; profile: string; threads: string };
}) {
  const [state, action] = useActionState<State, FormData>(disputeStep, idle);
  const server = state.status !== "idle" ? state.data : undefined;
  const step = server?.step ?? 1;
  const [raw, setV] = useState<DisputeValues>(() => server?.values ?? emptyDisputeValues({ kind: initialKind, itemId: initialItemId }));
  const set = (key: keyof DisputeValues) => (value: string) => setV((cur) => ({ ...cur, [key]: value }));
  const topRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(0);
  const [dismissed, setDismissed] = useState<State | null>(null);

  const fe = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const done = server?.ref && state !== dismissed ? server : null;
  const isMention = raw.kind === "mention";
  const list = isMention ? items.mention : items.ranking;
  // An item from the other kind (after switching kinds) falls back to this kind's first item.
  const v: DisputeValues = list.some((i) => i.id === raw.itemId) ? raw : { ...raw, itemId: list[0]?.id ?? "" };
  const selected = list.find((i) => i.id === v.itemId) ?? null;

  useEffect(() => {
    if (state.status === "idle") return;
    if (done) {
      doneRef.current?.focus();
      window.scrollTo(0, 0);
      return;
    }
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }, [state, done]);

  const reasonLabel = (r: string) => (r === "different" && kind === "hospital" ? L.reasons.differentHospital : L.reasons[r]);
  const hint =
    v.reason === "different" ? (isMention ? L.hints.differentMention : L.hints.different) : v.reason === "method" ? (isMention ? L.hints.methodMention : L.hints.method) : v.reason ? L.hints[v.reason as keyof typeof L.hints] : null;
  const what = selected ? (isMention ? L.whatMention : L.whatRanking).replace("{name}", provider.name).replace("{item}", selected.pos) : "";
  const you = v.role === "provider" ? L.youProvider : v.role === "other" ? L.youOther.replace("{connection}", v.connection.trim()) : L.youResident;
  const isProvider = v.role === "provider";

  if (done) {
    const doneMention = done.values.kind === "mention";
    const provRole = done.values.role === "provider";
    const tracker = [
      { title: L.tracker.received, body: doneMention ? L.tracker.receivedMention : L.tracker.receivedRanking, dot: "bg-success" },
      { title: L.tracker.review, body: (doneMention ? L.tracker.reviewMention : L.tracker.reviewRanking) + (provRole ? L.tracker.moreEvidence : ""), dot: "bg-saffron" },
      { title: L.tracker.outcome, body: L.tracker.outcomeBody + (done.values.email.trim() ? L.tracker.outcomeEmail : ""), dot: "bg-line" },
    ];
    const meanwhile = doneMention ? L.meanwhileMention : L.meanwhileRanking;
    const reply = doneMention ? (provRole ? L.replyMentionProvider : L.replyMention) : provRole ? L.replyRankingProvider : L.replyRanking;
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="flex flex-col gap-4.5 rounded-24 border border-line p-5 sm:p-6">
        <div className="flex items-center gap-3.5">
          <span aria-hidden="true" className="flex size-12 flex-none items-center justify-center rounded-full bg-success text-22 font-bold text-white">
            ✓
          </span>
          <div className="flex min-w-0 flex-col gap-0.75">
            <p className="text-22 font-bold tracking-title">{L.sentTitle}</p>
            <p className="font-mono text-11.5 text-subtle uppercase">{L.sentRef.replace("{ref}", done.ref ?? "")}</p>
          </div>
        </div>
        <p className="text-14.5 leading-[1.6] font-light text-ink-soft">{L.sentSummary.replace("{what}", what).replace("{reason}", (reasonLabel(done.values.reason) ?? "").toLowerCase())}</p>
        <ol className="flex flex-col">
          {tracker.map((tr) => (
            <li key={tr.title} className="flex gap-3.5 py-2.5">
              <span aria-hidden="true" className={`mt-0.75 size-4 flex-none rounded-full ${tr.dot}`} />
              <div className="flex flex-col gap-0.5">
                <span className="text-15 font-semibold">{tr.title}</span>
                <span className="text-13.5 leading-normal font-light text-muted">{tr.body}</span>
              </div>
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16.25rem),1fr))] gap-3">
          <div className="flex flex-col gap-2 rounded-18 bg-cream p-4">
            <span className="mono-label text-10.5 text-caution">{L.meanwhile}</span>
            {meanwhile.map((m) => (
              <p key={m} className="text-14 leading-[1.55] font-light">
                {m}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-2 rounded-18 bg-success-tint p-4">
            <span className="mono-label text-10.5 text-success">{L.reply}</span>
            {reply.map((m) => (
              <p key={m} className="text-14 leading-[1.55] font-light">
                {m}
              </p>
            ))}
          </div>
        </div>
        <p className="text-12.5 leading-[1.55] font-light text-subtle">{L.smallPrint}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={hrefs.profile} className="inline-flex min-h-11 items-center rounded-pill bg-ink px-4.5 text-14 font-medium text-cream hover:bg-ink-soft hover:text-cream">
            {L.backToProfile}
          </Link>
          <Button
            variant="soft"
            size="md"
            onClick={() => {
              setDismissed(state);
              setV(emptyDisputeValues({ kind: "ranking", itemId: items.ranking[0]?.id ?? "" }));
              setRound((r) => r + 1);
              window.scrollTo(0, 0);
            }}
          >
            {L.another}
          </Button>
        </div>
      </div>
    );
  }

  const shownStep = state === dismissed ? 1 : step;
  const progress = L.progress.replace("{current}", String(shownStep)).replace("{total}", "4");
  const hidden = (keys: (keyof DisputeValues)[]) => keys.map((k) => <input key={k} type="hidden" name={k} value={v[k]} />);
  const pii = findPersonalData(v.details);
  const warning = pii.phone || pii.email || pii.idNumber ? L.phoneWarning : detectMedicalDetails(v.details) ? L.medicalWarning : null;
  const summaryError =
    state.status === "error" && state !== dismissed
      ? fe.kind
        ? L.errWhat
        : fe.role
          ? L.errWho
          : fe.connection
            ? L.errConnection
            : fe.itemId
              ? L.errItem
              : fe.reason
                ? L.errReason
                : fe.details
                  ? L.errDetails
                  : fe.email
                    ? L.emailInvalid
                    : fe.declare
                      ? L.errDeclare
                      : state.message
      : null;

  return (
    <div ref={topRef} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 rounded-18 bg-cream px-4.5 py-4 text-13.5 leading-[1.6]">
        <p className="text-14.5 font-semibold">{L.factTitle}</p>
        <p className="font-light text-muted">
          {L.factBodyBefore}{" "}
          <Link href={hrefs.report} className="font-medium">
            {L.factLink}
          </Link>{" "}
          {L.factBodyAfter}
        </p>
      </div>
      <StepBars id="dispute-steps" steps={L.steps} current={shownStep} progress={progress} doneLabel={L.doneStep} />
      <form key={round} action={action} noValidate className="group/dk flex flex-col gap-4 rounded-24 border border-line p-5 sm:p-5.5">
        <button type="submit" name="intent" value={shownStep === 4 ? "submit" : "next"} tabIndex={-1} aria-hidden="true" className="sr-only" />
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="providerKind" value={kind} />
        <input type="hidden" name="providerSlug" value={slug} />
        <input type="hidden" name="step" value={shownStep} />

        {shownStep === 1 ? (
          <>
            <CardRadios
              name="kind"
              idPrefix="dispute-kind"
              legend={L.whatTitle}
              legendClassName="mb-2 text-18 font-semibold text-ink"
              minWidth="12.5rem"
              options={(["ranking", "mention", "review"] as const).map((k) => ({
                value: k,
                title: L.kinds[k].title,
                detail: L.kinds[k].detail,
                extra: k === "mention" ? (<span className="mt-1 flex"><PhaseTag soft>{L.phase2b}</PhaseTag></span>) : undefined,
              }))}
              value={v.kind}
              onChange={set("kind")}
              error={fe.kind ? L.errWhat : undefined}
            />
            <div className="hidden flex-col gap-3 rounded-22 border-[1.5px] border-ink p-5 group-has-[#dispute-kind-review:checked]/dk:flex">
              <p className="text-18 font-semibold">{L.reviewPanelTitle}</p>
              <p className="text-14.5 leading-[1.6] font-light text-muted">{L.reviewPanelBody}</p>
              <PolicyTiles items={L.removeItems} />
              <p className="text-14 leading-[1.55] font-light text-muted">{L.reviewPanelReply}</p>
              <div className="flex flex-wrap gap-2">
                <Link href={hrefs.reviews} className="inline-flex min-h-11 items-center rounded-pill bg-ink px-4.5 text-14 font-medium text-cream hover:bg-ink-soft hover:text-cream">
                  {L.goToProfile}
                </Link>
                <Link
                  href={hrefs.policy}
                  className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-ink px-4.5 text-14 font-medium text-ink hover:bg-cream hover:text-ink"
                >
                  {L.readPolicy}
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-3 group-has-[#dispute-kind-review:checked]/dk:hidden">
              <ChipRadios
                name="role"
                legend={L.whoTitle}
                legendClassName="mb-2 text-18 font-semibold text-ink"
                options={(["provider", "resident", "other"] as const).map((r) => ({ value: r, label: L.roles[r].label }))}
                value={v.role}
                onChange={set("role")}
                error={fe.role ? L.errWho : undefined}
              />
              {isProvider && (
                <p className="text-13.5 leading-[1.55] font-light text-muted">
                  {isMention ? L.providerNoteMention : L.providerNote}
                  {!claimed && (
                    <>
                      {" "}
                      {L.notClaimed}{" "}
                      <Link href={hrefs.claim} className="font-medium">
                        {L.claimLink}
                      </Link>
                      {L.notClaimedRest}
                    </>
                  )}
                </p>
              )}
              {v.role && !isProvider && <p className="text-13.5 leading-[1.55] font-light text-muted">{L.roles[v.role as "resident" | "other"]?.note}</p>}
              {v.role === "other" && (
                <Field id="dispute-connection" label={L.connection} error={fe.connection ? L.errConnection : undefined}>
                  <Input name="connection" value={v.connection} onChange={(e) => set("connection")(e.target.value)} placeholder={L.connectionPlaceholder} maxLength={160} />
                </Field>
              )}
            </div>
            {hidden(["itemId", "reason", "details", "link", "links", "email", "declare", ...(v.role === "other" ? [] : (["connection"] as const))])}
          </>
        ) : (
          hidden(["kind", "role", "connection"])
        )}

        {shownStep === 2 ? (
          <>
            <CardRadios
              name="itemId"
              legend={isMention ? L.whichMentions : L.whichRanking}
              legendClassName="mb-2 text-18 font-semibold text-ink"
              minWidth="16.25rem"
              options={list.map((it) => ({
                value: it.id,
                kicker: (
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="mono-label text-10.5 text-teal">{isMention ? L.tagMention : it.listHref ? L.tagRanking : L.notRanked}</span>
                    {isMention && <PhaseTag soft>{L.phase2b}</PhaseTag>}
                  </span>
                ),
                title: provider.name,
                detail: provider.line,
                extra: (
                  <>
                    <span className="mt-1 text-14 leading-[1.45] font-medium">{it.pos}</span>
                    <span className="text-12.5 leading-[1.45] font-light text-subtle">{it.meta}</span>
                  </>
                ),
              }))}
              value={v.itemId}
              onChange={set("itemId")}
              error={fe.itemId ? L.errItem : undefined}
            />
            <p className="text-13 leading-[1.55] font-light text-muted">
              {isMention ? L.itemNoteMention : L.itemNoteRanking}{" "}
              <Link href={isMention ? hrefs.threads : (selected?.listHref ?? hrefs.threads)} className="font-medium">
                {isMention ? L.itemLinkMention : L.itemLinkRanking}
              </Link>
            </p>
            {isMention && (
              <Field id="dispute-link" label={L.threadLink}>
                <Input name="link" type="url" value={v.link} onChange={(e) => set("link")(e.target.value)} placeholder={L.threadLinkPlaceholder} maxLength={500} />
              </Field>
            )}
            <ChipRadios
              name="reason"
              legend={L.whyTitle}
              legendClassName="mb-2 text-18 font-semibold text-ink"
              options={DISPUTE_REASONS.map((r) => ({ value: r, label: reasonLabel(r) }))}
              value={v.reason}
              onChange={set("reason")}
              error={fe.reason ? L.errReason : undefined}
            />
            {hint && <p className="rounded-14 bg-cream px-3.5 py-3 text-13.5 leading-[1.55] font-light text-ink-soft">{hint}</p>}
            {v.reason === "outdated" && (
              <p className="text-13 leading-[1.55] font-light text-muted">
                {L.outdatedNote}{" "}
                <Link href={hrefs.report} className="font-medium">
                  {L.outdatedLink}
                </Link>{" "}
                {L.outdatedRest}
              </p>
            )}
            <Field id="dispute-details" label={L.detailsLabel} error={fe.details ? L.errDetails : undefined}>
              <Textarea
                name="details"
                rows={4}
                maxLength={3000}
                value={v.details}
                onChange={(e) => set("details")(e.target.value)}
                placeholder={isMention ? L.detailsPlaceholderMention : L.detailsPlaceholder}
                className={warning ? "border-sponsored" : undefined}
              />
            </Field>
            <span className="-mt-2.5 text-12 font-light text-subtle">{charCount(L.characters, v.details.trim().length)}</span>
            {warning && <WarnBox>{warning}</WarnBox>}
            {hidden(["links", "email", "declare", ...(isMention ? [] : (["link"] as const))])}
          </>
        ) : (
          shownStep !== 1 && hidden(["itemId", "reason", "details", "link"])
        )}

        {shownStep === 3 ? (
          <>
            <h2 className="text-18 font-semibold">{L.evidenceTitle}</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3">
              <div className="flex flex-col gap-1.5 rounded-18 bg-success-tint p-4">
                <span className="mono-label text-10.5 text-success">{L.canSend}</span>
                <span className="text-14 leading-[1.7] font-light">{L.canSendBody}</span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-18 bg-emergency-tint p-4">
                <span className="mono-label text-10.5 text-emergency">{L.neverSend}</span>
                <span className="text-14 leading-[1.7] font-light">{L.neverSendBody}</span>
              </div>
            </div>
            <p className="text-13 leading-[1.55] font-light text-muted">{L.noRecords}</p>
            <Field id="dispute-links" label={L.linksLabel}>
              <Input name="links" value={v.links} onChange={(e) => set("links")(e.target.value)} placeholder={L.linksPlaceholder} maxLength={1500} />
            </Field>
            <div className="flex flex-col gap-1">
              <span className="text-14 font-medium">{L.filesTitle}</span>
              <p className="text-12.5 leading-normal font-light text-subtle">{L.filesBody}</p>
            </div>
            {hidden(["email", "declare"])}
          </>
        ) : (
          shownStep > 3 && hidden(["links"])
        )}

        {shownStep === 4 && (
          <>
            <h2 className="text-18 font-semibold">{L.checkTitle}</h2>
            <dl className="rounded-18 bg-cream px-4 py-1.5">
              {[
                [L.summary.disputing, what],
                [L.summary.reason, v.reason ? reasonLabel(v.reason) : L.notChosen],
                [L.summary.you, you],
                [L.summary.evidence, (v.links + v.link).trim() ? L.evidenceLinks : L.evidenceNone],
              ].map(([k, val], i) => (
                <div key={k} className={`flex flex-wrap gap-x-3.5 gap-y-0.5 py-2.5 ${i ? "border-t border-line" : ""}`}>
                  <dt className="flex-[0_0_6rem] pt-0.75 font-mono text-10.5 text-subtle uppercase">{k}</dt>
                  <dd className="min-w-0 flex-[1_1_12.5rem] text-14 leading-normal">{val}</dd>
                </div>
              ))}
            </dl>
            <Field id="dispute-email" label={L.emailLabel} help={isProvider ? L.emailNoteProvider : L.emailNote} error={fe.email ? L.emailInvalid : undefined}>
              <Input name="email" type="email" autoComplete="email" value={v.email} onChange={(e) => set("email")(e.target.value)} placeholder={L.emailPlaceholder} maxLength={200} />
            </Field>
            <div className="rounded-14 border-[1.5px] border-line-strong px-3.5 py-1">
              <Checkbox
                id="dispute-declare"
                name="declare"
                checked={v.declare === "on"}
                onChange={(e) => set("declare")(e.target.checked ? "on" : "")}
                label={(isProvider ? L.declareProvider : v.role === "other" ? L.declareOther : L.declareResident) + L.declareRest}
                error={fe.declare ? L.errDeclare : undefined}
                className="[&_label]:text-13.5 [&_label]:leading-normal [&_label]:font-light"
              />
            </div>
          </>
        )}

        {summaryError && <FormError>{summaryError}</FormError>}

        <div className="flex flex-row-reverse flex-wrap items-center gap-2.5 border-t border-line pt-3.5 group-has-[#dispute-kind-review:checked]/dk:hidden">
          <SubmitButton name="intent" value={shownStep === 4 ? "submit" : "next"} pendingLabel={L.sending}>
            {shownStep === 4 ? L.submit : L.continue}
          </SubmitButton>
          {shownStep > 1 && (
            <Button type="submit" name="intent" value="back" variant="soft" size="md" className="mr-auto">
              {L.back}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function charCount(template: string, count: number): string {
  return template.replace("{count}", String(count)).replace("{min}", String(DISPUTE_MIN_DETAILS));
}
