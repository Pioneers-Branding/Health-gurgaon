// My reviews & reports: what needs you, reviews, reports and concerns, events you submitted,
// disputes, how you're signed, who sees your details. Prototype: "Health Gurgaon Account.dc.html" #activity.

import Link from "next/link";
import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import type { MyAccount, MyActivity, MyDispute, MyEvent, MyReport, MyReview, MySentItem, MySentLink } from "@/lib/data/account";
import { fmt, type Lang } from "@/lib/i18n";
import { accountStrings, type AccountStrings } from "@/lib/i18n/areas/account";
import { getLocality } from "@/lib/localities";
import { routes } from "@/lib/routes";

import { dateShort, dayMonth, dayShort, dayTime, medicalHits, reviewSegments, visitMonthLabel } from "./format";
import { ProgressSteps, StatusPill, type PillTone, type ProgressStep } from "./progress-steps";
import { ReviewCard, type ReviewCardData } from "./review-card";
import { ReviewLabelForm } from "./review-label-form";

const H2 = "m-0 text-22 font-bold tracking-[-.025em]";
const count = "font-normal text-subtle";
const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const noDot = (s: string) => s.replace(/\.$/, "");

function En({ lang, children }: { lang: Lang; children: ReactNode }) {
  return lang === "hi" ? <span lang="en">{children}</span> : <>{children}</>;
}

function EmptyBox({ title, body, cta }: { title: string; body: string; cta: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-20 bg-cream p-5">
      <span className="text-16.5 font-semibold">{title}</span>
      <span className="max-w-[40rem] text-14 font-light leading-[1.6] text-ink-soft">{body}</span>
      {cta}
    </div>
  );
}
const ctaPrimary = "inline-flex min-h-11 items-center self-start rounded-pill bg-teal px-5 text-14 font-semibold text-white hover:bg-teal-dark hover:text-white";

function SectionHead({ id, title, n, link }: { id: string; title: string; n: number; link: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id={id} className={H2}>
        {title} <span className={count}>({n})</span>
      </h2>
      {link}
    </div>
  );
}

type Props = {
  lang: Lang;
  now: string;
  account: MyAccount;
  activity: MyActivity;
  /** ?edit=HG-RV-… / ?withdraw=HG-RV-…: open that review's panel (also without JavaScript). */
  edit: string | null;
  withdraw: string | null;
};

export function ActivityView({ lang, now, account, activity, edit, withdraw }: Props) {
  const all = accountStrings(lang);
  const t = all.activity;
  const blank = activity.items.length === 0;
  const reportCount = activity.reports.length + activity.concerns.length;
  const reviewByRef = new Map(activity.reviews.map((r) => [r.ref, r]));
  const base = routes.accountActivity(lang);

  const attn = activity.attention.map((a) => {
    if (a.kind === "review") {
      const r = a.ref ? reviewByRef.get(a.ref) : undefined;
      return {
        key: a.ref ?? a.title,
        title: fmt(t.attnReview, { name: r?.provider.name ?? "" }),
        detail: a.detail,
        cta: (
          <Link href={`${base}?edit=${encodeURIComponent(a.ref ?? "")}#rv-${a.ref}`} className={ctaPrimary}>
            {t.attnReviewCta}
          </Link>
        ),
      };
    }
    const e = activity.events.find((x) => x.ref === a.ref);
    return {
      key: a.ref ?? a.title,
      title: fmt(t.attnEvent, { title: e?.title ?? "" }),
      detail: a.detail,
      cta: (
        <Link href={routes.submitEvent(lang)} className={ctaPrimary}>
          {t.attnEventCta}
        </Link>
      ),
    };
  });

  const jumps: [string, string][] = [
    ["hg-reviews", fmt(t.jumpReviews, { n: activity.reviews.length })],
    ["hg-reports", fmt(t.jumpReports, { n: reportCount })],
    ["hg-events", fmt(t.jumpEvents, { n: activity.events.length })],
    ["hg-dispute", fmt(activity.disputes.length === 1 ? t.jumpDispute : t.jumpDisputes, { n: activity.disputes.length })],
    ...(activity.sent.length ? [["hg-sent", fmt(t.jumpSent, { n: activity.sent.length })] as [string, string]] : []),
    ["hg-who", t.jumpWho],
  ];

  return (
    <div className="mx-auto flex w-full max-w-page flex-wrap items-start gap-7 px-6 pt-5.5 pb-14">
      <div className="flex min-w-0 flex-[3_1_37.5rem] flex-col gap-9">
        <section aria-labelledby="hg-attn-h" className="flex min-w-0 flex-col gap-0.5 rounded-20 border-2 border-ink px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2">
            <h2 id="hg-attn-h" className={H2}>
              {attn.length ? fmt(attn.length === 1 ? t.attnTitleOne : t.attnTitle, { n: attn.length }) : blank ? t.attnNothing : t.attnDone}
            </h2>
            <span className="mono-label text-10.5 text-subtle">{fmt(t.updated, { date: dateShort(lang, now) })}</span>
          </div>
          {attn.map((a, i) => (
            <div key={a.key} className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-line py-3">
              <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-full bg-saffron text-13.5 font-bold text-ink">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-[1_1_16.25rem] flex-col gap-0.5">
                <span className="text-15 font-medium leading-[1.4]">{a.title}</span>
                <span className="text-13.5 font-light leading-normal text-muted">
                  <En lang={lang}>{a.detail}</En>
                </span>
              </div>
              {a.cta}
            </div>
          ))}
          {!attn.length && <p className="border-t border-line py-3 text-14 font-light leading-[1.55] text-ink-soft">{blank ? t.noAttnBlank : t.noAttn}</p>}
          <p className="pt-0.5 text-13 font-light leading-normal text-muted">{blank ? t.attnFootBlank : t.attnFoot}</p>
        </section>

        <nav aria-label={t.onThisPage} className="-my-3 flex flex-wrap items-center gap-2">
          <span className="mono-label mr-1 text-10.5 text-subtle">{t.onThisPage}</span>
          {jumps.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-line-strong bg-white px-3.5 text-14 text-ink hover:border-ink hover:text-ink">
              {label}
            </a>
          ))}
        </nav>

        <Reviews lang={lang} t={all} account={account} reviews={activity.reviews} base={base} edit={edit} withdraw={withdraw} />
        <Reports lang={lang} t={all} reports={activity.reports} concerns={activity.concerns} />
        <Events lang={lang} t={all} events={activity.events} />
        <Disputes lang={lang} t={all} disputes={activity.disputes} />
        {activity.sent.length > 0 && <Sent lang={lang} t={all} items={activity.sent} />}
      </div>

      <aside className="flex min-w-0 flex-[1_1_20rem] flex-col gap-3.5">
        <ReviewLabelForm lang={lang} options={account.reviewLabelOptions} current={account.reviewLabel} legend={t.labelLegend} note={t.labelNote} saveLabel={all.common.save} />
        <section id="hg-who" aria-labelledby="hg-who-h" className="flex min-w-0 scroll-mt-24 flex-col gap-2 rounded-20 border-[1.5px] border-ink p-4.5">
          <h2 id="hg-who-h" className="m-0 text-19 font-bold tracking-title">
            {t.whoTitle}
          </h2>
          <p className="text-13.5 font-light leading-[1.55] text-ink-soft">{t.whoIntro}</p>
          <div className="flex flex-col">
            {t.whoRows.map(([who, kind, d]) => (
              <div key={who} className="flex flex-col gap-0.75 border-t border-line py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1">
                  <span className="text-14 font-semibold leading-[1.4]">{who}</span>
                  <StatusPill tone={kind === "never" ? "ok" : "warn"}>{t.whoBadge[kind]}</StatusPill>
                </div>
                <span className="text-13 font-light leading-normal text-ink-soft">{fmt(d, { label: account.reviewLabel })}</span>
              </div>
            ))}
          </div>
          <p className="text-13 font-light leading-normal text-muted">{t.whoFoot}</p>
          <Link href={routes.trust(lang, "privacy")} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
            {t.rolesLink}
          </Link>
        </section>
        <section aria-labelledby="hg-sla-h" className="flex min-w-0 flex-col gap-1.5 rounded-20 bg-cream p-4.5">
          <h2 id="hg-sla-h" className="m-0 text-19 font-bold tracking-title">
            {t.slaTitle}
          </h2>
          <dl className="m-0 flex flex-col">
            {t.sla.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-px border-t border-line-strong py-2">
                <dt className="mono-label text-10.5 text-subtle">{k}</dt>
                <dd className="m-0 text-14 font-medium leading-[1.45]">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
    </div>
  );
}

// ── Reviews ───────────────────────────────────────────────────────────────────

function reviewCard(lang: Lang, t: AccountStrings, account: MyAccount, r: MyReview, base: string): ReviewCardData {
  const a = t.activity;
  const editPending = r.status === "published" && !!r.editText;
  const pill = editPending ? a.pill.pending : (a.pill[r.status] ?? r.statusLabel);
  const tone: PillTone = editPending ? "wait" : r.status === "published" ? "ok" : r.status === "pending" ? "wait" : r.status === "needs_changes" ? "act" : "off";
  const sent = r.editSubmittedAt
    ? fmt(a.sentEdited, { date: dateShort(lang, r.editSubmittedAt) })
    : r.status === "published" && r.publishedAt
      ? fmt(a.sentPublished, { date: dateShort(lang, r.publishedAt) })
      : r.status === "needs_changes" && r.returnedAt
        ? fmt(a.sentReturned, { date: dateShort(lang, r.sentAt), short: dayMonth(lang, r.returnedAt) })
        : r.status === "pending"
          ? fmt(a.sentPending, { date: dayTime(lang, r.sentAt) })
          : fmt(a.sentPending, { date: dateShort(lang, r.sentAt) });
  const meta = `${r.ref} · ${fmt(a.visited, { month: visitMonthLabel(lang, r.visitMonth) })} · ${sent}`;
  const text = editPending ? (r.editText ?? r.text) : r.text;
  const label = account.reviewLabel;

  let reasons: ReviewCardData["reasons"] = null;
  if (r.status === "needs_changes") {
    const lines: string[] = [];
    if (r.redactions.some((x) => x.kind === "phone")) lines.push(a.reasonPhone);
    const med = medicalHits(r.text);
    if (med.length) lines.push(fmt(a.reasonMed, { list: med.join(", ") }));
    if (!lines.length && r.moderationReason) lines.push(r.moderationReason);
    reasons = { heading: fmt(a.whyBack, { date: r.returnedAt ? dayMonth(lang, r.returnedAt) : "" }), lines, suggestion: r.suggestion };
  }
  const shownAs =
    r.status === "published" && !editPending
      ? r.helpful === 0
        ? fmt(a.shownAsNone, { label })
        : fmt(r.helpful === 1 ? a.shownAsOne : a.shownAs, { label, n: r.helpful })
      : r.status === "withdrawn"
        ? a.withdrawnCopy
        : fmt(a.willShow, { label });
  const next =
    r.status === "published"
      ? editPending
        ? fmt(a.nextPendingEdit, { day: dayShort(lang, r.checkBy) })
        : a.nextPublished
      : r.status === "pending"
        ? fmt(a.nextPending, { day: dayShort(lang, r.checkBy) })
        : r.status === "needs_changes"
          ? a.nextChanges
          : r.status === "withdrawn"
            ? a.nextWithdrawn
            : a.nextRejected;
  const kind = r.provider.profileKind;
  const replyLead = r.reply && r.replyAt && !editPending ? fmt(a.replyFrom[kind] ?? a.replyFrom.doctor, { date: dateShort(lang, r.replyAt) }) : null;
  const canEdit = r.status === "published" || r.status === "pending" || r.status === "needs_changes";
  const withdrawText = r.status === "published" ? (editPending ? fmt(a.withdrawLiveEdit, { name: r.provider.name }) : fmt(r.reply ? a.withdrawPublished : a.withdrawPublishedNoReply, { name: r.provider.name })) : a.withdrawUnpublished;
  return {
    ref: r.ref,
    name: r.provider.name,
    href: routes.provider(lang, kind, r.provider.slug),
    sub: [r.provider.headline, r.provider.area].filter(Boolean).join(" · "),
    meta,
    pill,
    pillTone: tone,
    reasons,
    segments: r.status === "needs_changes" ? reviewSegments(text) : [{ text, mark: null }],
    draft: text,
    shownAs,
    reply: replyLead && r.reply ? { lead: replyLead, text: r.reply } : null,
    next,
    canEdit,
    editLabel: r.status === "needs_changes" ? a.fixAndSend : a.edit,
    editPrimary: r.status === "needs_changes",
    editNote: r.status === "published" ? a.editNotePublished : r.status === "needs_changes" ? a.editNoteChanges : a.editNotePending,
    withdrawText,
    withdrawn: r.status === "withdrawn",
    border: r.status === "needs_changes" ? "changes" : r.status === "withdrawn" ? "withdrawn" : "plain",
    editHref: `${base}?edit=${encodeURIComponent(r.ref)}#rv-${r.ref}`,
    withdrawHref: `${base}?withdraw=${encodeURIComponent(r.ref)}#rv-${r.ref}`,
  };
}

function Reviews({ lang, t, account, reviews, base, edit, withdraw }: { lang: Lang; t: AccountStrings; account: MyAccount; reviews: MyReview[]; base: string; edit: string | null; withdraw: string | null }) {
  const a = t.activity;
  const labels = { ...a, cancel: t.common.cancel, undo: t.common.undo, and: t.common.and, sending: t.common.sending };
  return (
    <section id="hg-reviews" aria-labelledby="hg-reviews-h" className="flex scroll-mt-24 flex-col gap-3">
      <SectionHead
        id="hg-reviews-h"
        title={a.reviewsTitle}
        n={reviews.length}
        link={
          <Link href={routes.search(lang, { intent: "review" })} className="inline-flex min-h-11 items-center text-14 font-medium">
            {a.writeReview}
          </Link>
        }
      />
      <p className="-mt-1.5 max-w-[47.5rem] text-14 font-light leading-[1.55] text-ink-soft">{a.reviewsIntro}</p>
      {[...reviews].sort((x, y) => Number(y.status === "needs_changes") - Number(x.status === "needs_changes")).map((r) => (
        <ReviewCard
          key={`${r.ref}-${edit === r.ref ? "e" : ""}${withdraw === r.ref ? "w" : ""}`}
          lang={lang}
          data={reviewCard(lang, t, account, r, base)}
          labels={labels}
          startEditing={edit === r.ref}
          startConfirming={withdraw === r.ref}
        />
      ))}
      {!reviews.length && (
        <EmptyBox
          title={a.noReviewsTitle}
          body={a.noReviewsBody}
          cta={
            <Link href={routes.search(lang, { intent: "review" })} className={ctaPrimary}>
              {a.noReviewsCta}
            </Link>
          }
        />
      )}
      <Link href={routes.trust(lang, "reviews")} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
        {a.howWeCheck}
      </Link>
    </section>
  );
}

// ── Reports and concerns ──────────────────────────────────────────────────────

function reportSteps(lang: Lang, t: AccountStrings, r: MyReport): ProgressStep[] {
  const a = t.activity;
  const who = a.who[r.targetProfileKind ?? ""] ?? a.whoDefault;
  const received = r.timeline.find((x) => x.status === "received");
  const checking = r.timeline.find((x) => x.status === "checking");
  const final = r.status === "resolved" || r.status === "no_change" || r.status === "rejected";
  const steps: ProgressStep[] = [
    {
      title: a.stepReceived,
      detail: (
        <>
          {dayShort(lang, r.receivedAt, { year: true })}.{received?.note ? <> <En lang={lang}>{received.note}</En></> : null}
        </>
      ),
      state: "done",
    },
  ];
  if (final) {
    steps.push({
      title: fmt(a.stepCheckedWith, { who }),
      detail: checking?.note ? <En lang={lang}>{`${noDot(checking.note)}, ${dayShort(lang, checking.at)}.`}</En> : checking ? `${dayShort(lang, checking.at)}.` : undefined,
      state: "done",
    });
    const at = r.resolvedAt ?? r.receivedAt;
    const onTime = new Date(at) <= new Date(r.dueAt) ? fmt(a.onTime, { date: dayShort(lang, at) }) : `${dayShort(lang, at)}.`;
    steps.push({
      title: r.status === "resolved" ? a.stepFixed : r.status === "no_change" ? a.stepNoChange : a.stepRejected,
      detail: (
        <>
          {onTime}
          {r.resolution ? <> <En lang={lang}>{r.resolution}</En></> : null}
        </>
      ),
      state: r.status === "resolved" ? "done" : "warn",
    });
  } else {
    steps.push({
      title: fmt(a.stepCheckingWith, { who }),
      detail: checking?.note ? <En lang={lang}>{checking.note}</En> : undefined,
      state: r.status === "checking" ? "now" : "next",
    });
    steps.push({ title: a.stepFinalPending, detail: fmt(a.dueBy, { day: dayShort(lang, r.dueAt) }), state: "next" });
  }
  return steps;
}

function Reports({ lang, t, reports, concerns }: { lang: Lang; t: AccountStrings; reports: MyReport[]; concerns: MyReport[] }) {
  const a = t.activity;
  const labels = { stepTag: a.stepTag, stepSr: a.stepSr };
  const n = reports.length + concerns.length;
  const reportLink = routes.search(lang, { intent: "report" });
  return (
    <section id="hg-reports" aria-labelledby="hg-reports-h" className="flex scroll-mt-24 flex-col gap-3">
      <SectionHead
        id="hg-reports-h"
        title={a.reportsTitle}
        n={n}
        link={
          <Link href={reportLink} className="inline-flex min-h-11 items-center text-14 font-medium">
            {n ? a.reportElse : a.reportFirst}
          </Link>
        }
      />
      <div className="flex items-start gap-3 rounded-16 bg-success-tint px-4 py-3.5">
        <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-full bg-success text-13 font-bold text-white">
          ✓
        </span>
        <div className="flex min-w-0 flex-col gap-0.75">
          <span className="text-15 font-semibold text-success">{a.promiseTitle}</span>
          <span className="text-14 font-light leading-[1.55] text-ink">{a.promiseBody}</span>
        </div>
      </div>
      {n > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] items-start gap-3.5">
          {reports.map((r) => {
            const tone: PillTone = r.status === "resolved" ? "ok" : r.status === "no_change" || r.status === "rejected" ? "warn" : "wait";
            return (
              <article key={r.ref} className="flex min-w-0 flex-col gap-3 rounded-20 border border-line p-4.5">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                  <div className="flex min-w-0 flex-col gap-0.75">
                    <span className="mono-label text-10.5 tracking-[.04em] text-subtle">
                      {r.ref} · {a.field[r.field ?? ""] ?? a.fieldOther}
                    </span>
                    <h3 className="m-0 text-16 font-semibold leading-[1.35]">
                      <En lang={lang}>{r.targetLabel}</En>
                    </h3>
                  </div>
                  <StatusPill tone={tone}>{a.reportStatusPill[r.status] ?? r.statusLabel}</StatusPill>
                </div>
                <p className="text-14 font-light leading-[1.55] text-ink-soft">
                  <b className="font-medium text-ink">{a.youToldUs}</b> <En lang={lang}>“{r.details}”</En>
                </p>
                <ProgressSteps steps={reportSteps(lang, t, r)} labels={labels} />
                {r.status === "resolved" && (
                  <Link href={routes.trust(lang, "corrections")} className="-mt-1.5 inline-flex min-h-11 items-center self-start text-14 font-medium">
                    {a.correctionsLink}
                  </Link>
                )}
              </article>
            );
          })}
          {concerns.map((c) => (
            <Concern key={c.ref} lang={lang} t={t} c={c} />
          ))}
        </div>
      )}
      {!n && (
        <EmptyBox
          title={a.noReportsTitle}
          body={a.noReportsBody}
          cta={
            <Link href={reportLink} className={ctaPrimary}>
              {a.noReportsCta}
            </Link>
          }
        />
      )}
    </section>
  );
}

function Concern({ lang, t, c }: { lang: Lang; t: AccountStrings; c: MyReport }) {
  const a = t.activity;
  const checking = c.timeline.find((x) => x.status === "checking");
  const closed = c.status === "resolved" || c.status === "no_change" || c.status === "rejected";
  const steps: ProgressStep[] = [
    { title: a.stepReceived, detail: `${dayShort(lang, c.receivedAt, { year: true })}.`, state: "done" },
    {
      title: a.concernReadBy,
      detail: checking ? `${dayShort(lang, checking.at)}. ${a.concernReadNote}` : a.concernReadNote,
      state: checking ? "done" : "now",
    },
    closed
      ? {
          title: a.concernOutcome,
          detail: (
            <>
              {c.resolvedAt ? `${dayShort(lang, c.resolvedAt)}. ` : null}
              {c.resolution ? <En lang={lang}>{c.resolution}</En> : null}
            </>
          ),
          state: "done",
        }
      : { title: a.concernOutcome, detail: a.concernPending, state: "next" },
  ];
  return (
    <article className="col-span-full grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] items-start gap-x-7 gap-y-3.5 rounded-20 border-[1.5px] border-ink p-4.5">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <div className="flex min-w-0 flex-col gap-0.75">
            <span className="mono-label text-10.5 tracking-[.04em] text-subtle">{fmt(a.concernRef, { ref: c.ref, topic: a.concernTopic[c.field ?? ""] ?? a.concernTopicOther })}</span>
            <h3 className="m-0 text-16 font-semibold leading-[1.35]">
              <En lang={lang}>{c.targetLabel}</En>
            </h3>
          </div>
          <span className="flex-none self-start whitespace-nowrap rounded-pill bg-ink px-2.75 py-1 text-12.5 font-semibold text-saffron">{a.concernPill}</span>
        </div>
        <p className="text-14 font-light leading-[1.55] text-ink-soft">
          <b className="font-medium text-ink">{a.youToldUs}</b> <En lang={lang}>“{c.details}”</En>
        </p>
        <div className="flex flex-col gap-1 rounded-14 bg-cream px-3.5 py-3">
          <span className="text-14.5 font-semibold">{a.concernWhyTitle}</span>
          <span className="text-14 font-light leading-[1.55] text-ink">{a.concernWhyBody}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <ProgressSteps steps={steps} labels={{ stepTag: a.stepTag, stepSr: a.stepSr }} />
        <div className="flex flex-col gap-2">
          <span className="text-14.5 font-semibold">{a.furtherTitle}</span>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-2">
            {a.further.map(([title, detail]) => (
              <div key={title} className="rounded-14 bg-cream p-3 text-13.5 leading-[1.45]">
                <b className="font-semibold">{title}</b>
                <br />
                <span className="font-light">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Events I submitted ─────────────────────────────────────────────────────────

function eventSteps(lang: Lang, t: AccountStrings, e: MyEvent): ProgressStep[] {
  const a = t.activity;
  const steps: ProgressStep[] = [];
  const at = (iso: string) => dayMonth(lang, iso);
  for (const x of e.timeline) {
    if (x.status === "received") {
      steps.push({ title: a.stepReceived, detail: <>{`${at(x.at)}.`}{x.note ? <> <En lang={lang}>{x.note}</En></> : null}</>, state: "done" });
    } else if (x.status === "changes_requested") {
      const ask = x.note ?? e.requestedChanges ?? "";
      steps.push({ title: a.stepChanges, detail: <>{`${at(x.at)}: `}<En lang={lang}>{lang === "en" ? lowerFirst(ask) : ask}</En></>, state: e.status === "changes_requested" ? "act" : "done" });
    } else if (x.status === "organiser_check") {
      steps.push({ title: a.stepOrganiser, detail: x.note ? <En lang={lang}>{x.note}</En> : undefined, state: e.status === "awaiting_review" ? "now" : "done" });
    } else if (x.status === "verified") {
      steps.push({ title: a.stepVerified, detail: <>{`${at(x.at)}.`}{x.note ? <> <En lang={lang}>{x.note}</En></> : null}</>, state: "done" });
    } else if (x.status === "rejected") {
      steps.push({ title: a.stepNotApproved, detail: x.note ? <En lang={lang}>{x.note}</En> : undefined, state: "warn" });
    }
  }
  if (!steps.length) steps.push({ title: a.stepReceived, detail: e.submittedAt ? `${at(e.submittedAt)}.` : undefined, state: "done" });
  if (e.status === "awaiting_review" && !e.timeline.some((x) => x.status === "organiser_check")) steps.push({ title: a.stepOrganiser, detail: a.nextOrganiser, state: "now" });
  if (e.status === "awaiting_review" || e.status === "changes_requested") {
    steps.push({ title: a.stepVerified, detail: e.status === "changes_requested" ? a.nextAfterChanges : a.nextAwaiting, state: "next" });
  }
  return steps;
}

/** Needs you first, then waiting for us, then the rest (the prototype's order). */
const EVENT_ORDER = (e: MyEvent) => (e.status === "changes_requested" ? 0 : e.status === "awaiting_review" ? 1 : 2);

function Events({ lang, t, events }: { lang: Lang; t: AccountStrings; events: MyEvent[] }) {
  const a = t.activity;
  return (
    <section id="hg-events" aria-labelledby="hg-events-h" className="flex scroll-mt-24 flex-col gap-3">
      <SectionHead
        id="hg-events-h"
        title={a.eventsTitle}
        n={events.length}
        link={
          <Link href={routes.submitEvent(lang)} className="inline-flex min-h-11 items-center text-14 font-medium">
            {a.submitEvent}
          </Link>
        }
      />
      <p className="-mt-1.5 max-w-[47.5rem] text-14 font-light leading-[1.55] text-ink-soft">{a.eventsIntro}</p>
      {events.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] items-start gap-3.5">
          {[...events].sort((x, y) => EVENT_ORDER(x) - EVENT_ORDER(y)).map((e) => {
            const tone: PillTone = e.status === "changes_requested" ? "act" : e.status === "verified" || e.status === "completed" ? "ok" : e.status === "awaiting_review" ? "wait" : "off";
            const L = getLocality(e.locality);
            const place = L ? (lang === "hi" ? L.nameHi : L.name) : null;
            const sectorPlace = !!place && /^Sector \d+$/.test(L?.name ?? "");
            const where = (e.venue ? [e.venue, sectorPlace ? null : place] : [place]).filter(Boolean).join(" · ");
            const cost = e.cost === "Free" ? t.common.free : e.cost;
            return (
              <article key={e.ref ?? e.slug} className={cn("flex min-w-0 flex-col gap-3 rounded-20", e.status === "changes_requested" ? "border-2 border-saffron p-4.25" : "border border-line p-4.5")}>
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                  <span className="mono-label pt-1 text-10.5 tracking-[.04em] text-subtle">{e.ref}</span>
                  <StatusPill tone={tone}>{a.eventPill[e.status] ?? e.statusLabel}</StatusPill>
                </div>
                <div className="flex min-w-0 flex-col gap-0.75">
                  <h3 className="m-0 text-16 font-semibold leading-[1.35]">
                    <En lang={lang}>{e.title}</En>
                  </h3>
                  <span className="text-14 leading-normal">
                    {dayShort(lang, e.startsAt, { year: true })} · {e.timeLabel}
                  </span>
                  <span className="text-13.5 font-light leading-normal text-ink-soft">
                    <En lang={lang}>{[where, cost, e.venue ? null : fmt(a.runBy, { name: e.organiserName })].filter(Boolean).join(" · ")}</En>
                  </span>
                </div>
                <ProgressSteps steps={eventSteps(lang, t, e)} labels={{ stepTag: a.stepTag, stepSr: a.stepSr }} />
                {e.status === "changes_requested" ? (
                  <ButtonLink href={routes.submitEvent(lang)} variant="primary" size="sm" className="self-start font-semibold">
                    {a.makeChanges}
                  </ButtonLink>
                ) : e.status === "awaiting_review" ? (
                  <ButtonLink href={routes.submitEvent(lang)} variant="outline" size="sm" className="self-start">
                    {a.updateNumber}
                  </ButtonLink>
                ) : e.listed ? (
                  <Link href={routes.event(lang, e.slug)} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
                    {a.seeCalendar}
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      {!events.length && (
        <EmptyBox
          title={a.noEventsTitle}
          body={a.noEventsBody}
          cta={
            <Link href={routes.submitEvent(lang)} className={ctaPrimary}>
              {a.noEventsCta}
            </Link>
          }
        />
      )}
    </section>
  );
}

// ── Disputes ──────────────────────────────────────────────────────────────────

function Disputes({ lang, t, disputes }: { lang: Lang; t: AccountStrings; disputes: MyDispute[] }) {
  const a = t.activity;
  const decided = (d: MyDispute) => d.status === "upheld" || d.status === "partly_upheld" || d.status === "not_upheld" || d.status === "withdrawn";
  return (
    <section id="hg-dispute" aria-labelledby="hg-dispute-h" className="flex scroll-mt-24 flex-col gap-3">
      <SectionHead
        id="hg-dispute-h"
        title={disputes.length === 1 ? a.disputeOne : a.disputeMany}
        n={disputes.length}
        link={
          <Link href={routes.disputes(lang)} className="inline-flex min-h-11 items-center text-14 font-medium">
            {a.disputeLink}
          </Link>
        }
      />
      <p className="-mt-1.5 max-w-[47.5rem] text-14 font-light leading-[1.55] text-ink-soft">{a.disputeIntro}</p>
      {disputes.map((d) => {
        const done = decided(d);
        const tone: PillTone = d.status === "upheld" ? "ok" : d.status === "partly_upheld" || d.status === "not_upheld" ? "warn" : d.status === "withdrawn" ? "off" : "wait";
        const steps: ProgressStep[] = [
          { title: a.stepReceived, detail: `${dayShort(lang, d.receivedAt, { year: true })}. ${a.disputeReceivedNote}`, state: "done" },
          { title: a.disputeEditor, detail: done ? a.disputeEditorDone : fmt(a.disputeEditorDue, { day: dayShort(lang, d.dueAt) }), state: done ? "done" : d.status === "under_review" ? "now" : "next" },
          done
            ? {
                title: fmt(a.disputeOutcome, { outcome: a.disputeOutcomeWord[d.status] ?? d.statusLabel }),
                detail: (
                  <>
                    {d.outcomePublishedAt ? `${dayShort(lang, d.outcomePublishedAt)}. ` : null}
                    {d.outcomeText ? <En lang={lang}>{d.outcomeText}</En> : null}
                  </>
                ),
                state: d.status === "upheld" ? "done" : "warn",
              }
            : { title: a.disputeOutcomePending, detail: a.disputeOutcomePendingNote, state: "next" },
        ];
        return (
          <article key={d.ref} className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,18.75rem),1fr))] items-start gap-x-7 gap-y-3 rounded-20 border border-line p-4.5">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <span className="mono-label pt-1 text-10.5 tracking-[.04em] text-subtle">
                  {d.ref} · {a.disputeTarget[d.target] ?? d.target}
                </span>
                <StatusPill tone={tone}>{a.disputePill[d.status] ?? d.statusLabel}</StatusPill>
              </div>
              <h3 className="m-0 text-16 font-semibold leading-[1.35]">
                <En lang={lang}>{d.itemLabel}</En>
              </h3>
              <p className="text-14 font-light leading-[1.55] text-ink-soft">
                <b className="font-medium text-ink">{a.yourReason}</b> <En lang={lang}>{lang === "en" ? lowerFirst(d.details) : d.details}</En>
              </p>
              <Link href={routes.disputes(lang)} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
                {a.publicLog}
              </Link>
            </div>
            <ProgressSteps steps={steps} labels={{ stepTag: a.stepTag, stepSr: a.stepSr }} />
          </article>
        );
      })}
      {!disputes.length && (
        <EmptyBox
          title={a.noDisputeTitle}
          body={a.noDisputeBody}
          cta={
            <Link href={routes.disputes(lang)} className={ctaPrimary}>
              {a.noDisputeCta}
            </Link>
          }
        />
      )}
    </section>
  );
}

// ── Other things I sent ───────────────────────────────────────────────────────

/** Green when it went through, saffron while it's with us, "needs you" when we asked for more,
 * grey when it stopped. A report's "open" means it is still being checked; a question's means it
 * is published. */
function sentTone(item: MySentItem): PillTone {
  if (item.kind === "flag") return item.status === "open" ? "wait" : item.status === "resolved" ? "ok" : "off";
  if (item.status === "info_requested") return "act";
  if (["approved", "published", "open", "resolved", "accepted"].includes(item.status)) return "ok";
  if (["pending", "escalated", "received", "call_scheduled"].includes(item.status)) return "wait";
  return "off";
}

function sentHref(lang: Lang, link: MySentLink): string {
  switch (link.to) {
    case "provider":
      return routes.provider(lang, link.profileKind, link.slug);
    case "reviews":
      return routes.providerReviews(lang, link.profileKind, link.slug);
    case "thread":
      return routes.thread(lang, link.id);
    case "story":
      return routes.stories(lang, { story: link.slug });
    case "volunteer":
      return routes.volunteer(lang);
  }
}

/** Claims, patient stories, community questions and replies, volunteering, and "Report" under a
 * review or story: a compact card each (reference · what it is, status, title, date). */
function Sent({ lang, t, items }: { lang: Lang; t: AccountStrings; items: MySentItem[] }) {
  const a = t.activity;
  return (
    <section id="hg-sent" aria-labelledby="hg-sent-h" className="flex scroll-mt-24 flex-col gap-3">
      <SectionHead id="hg-sent-h" title={a.sentTitle} n={items.length} link={null} />
      <p className="-mt-1.5 max-w-[47.5rem] text-14 font-light leading-[1.55] text-ink-soft">{a.sentIntro}</p>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] items-start gap-3.5 p-0">
        {items.map((item) => {
          const kindLabel =
            item.kind === "story"
              ? (a.storyKind[item.note ?? "video"] ?? a.storyKind.video)
              : item.kind === "flag"
                ? (a.flagKind[item.target ?? ""] ?? a.flagKindOther)
                : (a.sentKind[item.kind] ?? item.kind);
          const pill = a.sentPill[item.kind]?.[item.status] ?? item.status;
          const tone = sentTone(item);
          // "Your story about {name}": only the stored (English) name is marked lang="en".
          const [before, after] = a.storyAbout.split("{name}");
          const title =
            item.kind === "story" ? (
              <>
                {before}
                <En lang={lang}>{item.title}</En>
                {after}
              </>
            ) : (
              <En lang={lang}>{item.title}</En>
            );
          const quote = item.kind === "flag" ? a.yourReason : item.kind === "reply" ? a.yourReply : null;
          return (
            <li key={`${item.kind}-${item.ref ?? item.at}-${item.at}`} className="flex min-w-0">
              <article className="flex w-full min-w-0 flex-col gap-2 rounded-20 border border-line p-4.5">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                  <span className="mono-label min-w-0 pt-1 text-10.5 tracking-[.04em] text-subtle">
                    {item.ref ? `${item.ref} · ` : ""}
                    {kindLabel}
                  </span>
                  <StatusPill tone={tone}>{pill}</StatusPill>
                </div>
                <h3 className="m-0 text-16 font-semibold leading-[1.35] [overflow-wrap:anywhere]">{title}</h3>
                <span className="text-13.5 font-light leading-normal text-ink-soft">
                  <time dateTime={item.at}>{fmt(a.sentOn, { date: dateShort(lang, item.at) })}</time>
                </span>
                {quote && item.note && (
                  <p className="text-14 font-light leading-[1.55] text-ink-soft [overflow-wrap:anywhere]">
                    <b className="font-medium text-ink">{quote}</b> <En lang={lang}>“{item.note}”</En>
                  </p>
                )}
                {item.link && (
                  <Link href={sentHref(lang, item.link)} className="-mb-1.5 inline-flex min-h-11 items-center self-start text-14 font-medium">
                    {a.sentLink[item.link.to]}
                  </Link>
                )}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
