// One moderation queue: the list (Waiting / Done / All in the URL) and the selected item's
// details with the decision form. Prototype: "Health Gurgaon Admin and Mobile.dc.html" #admin.

import Link from "next/link";

import type { ItemHistoryRow, ModerationQueue, QueueItem, QueueTarget } from "@/lib/data/admin";
import { buttonGroup, KIND_DECISIONS, reasonsFor, STORY_CATEGORY_VALUES, type QueueItemKind } from "@/lib/data/admin-format";
import { fmt, getDictionary, type Lang } from "@/lib/i18n";
import { checkLabel, reasonLabel, type AdminStrings } from "@/lib/i18n/areas/admin";
import { routes } from "@/lib/routes";
import { cn } from "@/components/ui/cn";

import { DecisionPanel, type DecisionLabels } from "./decision-panel";
import { adminHref, isOpenStatus, slaText, stamp, STATUS_PILL } from "./format";
import { RevealPrivate } from "./reveal-private";

export type QueueFilter = "waiting" | "done" | "all";
const FILTERS: QueueFilter[] = ["waiting", "done", "all"];

export function targetHref(lang: Lang, target: QueueTarget | null | undefined, kind?: QueueItemKind): string | null {
  if (!target) return null;
  switch (target.type) {
    case "provider":
      return kind === "review" || kind === "review_edit" || kind === "flag_review" ? routes.providerReviews(lang, target.profileKind, target.slug) : routes.provider(lang, target.profileKind, target.slug);
    case "event":
      return routes.event(lang, target.slug);
    case "thread":
      return routes.thread(lang, target.id);
    case "story":
      return routes.stories(lang, { story: target.slug });
    case "society":
      return routes.society(lang, target.slug);
    case "article":
      return routes.article(lang, target.slug);
    case "guide":
      return routes.guide(lang, target.slug);
  }
}

function noteHelpKey(kind: QueueItemKind): string {
  if (kind === "review" || kind === "review_edit") return "review";
  if (kind.startsWith("report_")) return "report";
  if (kind === "event" || kind === "dispute" || kind === "claim") return kind;
  return "default";
}

function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={cn("rounded-pill px-2.5 py-0.75 text-12 font-semibold whitespace-nowrap", STATUS_PILL[status] ?? STATUS_PILL.waiting)}>{label}</span>;
}

function FlagPill({ children, lang }: { children: string; lang?: string }) {
  return (
    <span lang={lang} className="rounded-pill bg-pending-tint px-2 py-0.5 text-11 font-semibold text-pending">
      {children}
    </span>
  );
}

export function QueueView({
  lang,
  t,
  queue,
  filter,
  items,
  selected,
  history,
  nextId,
  canReveal,
}: {
  lang: Lang;
  t: AdminStrings;
  queue: ModerationQueue;
  filter: QueueFilter;
  items: QueueItem[];
  selected: QueueItem | null;
  history: ItemHistoryRow[];
  nextId: string | null;
  canReveal: boolean;
}) {
  const dict = getDictionary(lang);
  const q = t.queue;
  const enText = lang === "hi" ? "en" : undefined;
  const kindLabel = (i: QueueItem) => (i.kind ? (t.kinds[i.kind] ?? i.kindLabel) : i.kindLabel);
  const emptyText = filter === "waiting" ? q.empty : filter === "done" ? q.emptyDone : q.emptyAll;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,23.75rem),1fr))] items-start gap-5">
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h1 className="m-0 text-24 leading-tight font-bold tracking-h3">{dict.adminQueues[queue]}</h1>
          <nav aria-label={q.filtersLabel} className="flex gap-1.5">
            {FILTERS.map((f) => (
              <Link
                key={f}
                href={adminHref(lang, queue, { filter: f === "waiting" ? null : f })}
                aria-current={filter === f ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-pill border-[1.5px] px-3 text-12.5 no-underline",
                  filter === f ? "border-ink bg-ink text-cream hover:text-cream" : "border-line-strong bg-white text-ink hover:border-ink hover:text-ink",
                )}
              >
                {q.filters[f]}
              </Link>
            ))}
          </nav>
        </div>
        {items.length > 0 ? (
          <ul aria-label={q.listLabel} className="m-0 flex list-none flex-col gap-2.5 p-0">
            {items.map((i) => {
              const open = i.status === "waiting" || i.status === "escalated";
              const sla = slaText(t.sla, open, i.hoursLeft);
              const isSel = selected?.id === i.id;
              return (
                <li key={i.id}>
                  <Link
                    href={adminHref(lang, queue, { filter: filter === "waiting" ? null : filter, item: i.id }, "detail")}
                    aria-current={isSel ? "true" : undefined}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-18 bg-white text-left text-ink no-underline hover:text-ink",
                      isSel ? "border-2 border-ink p-[0.8125rem]" : "border border-line p-3.5 hover:border-line-strong",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2.5">
                      <span className="font-mono text-10.5 leading-[1.35] font-medium tracking-mono text-subtle">
                        {i.shortRef} · {kindLabel(i)}
                      </span>
                      <span className={cn("mono-label flex-none text-10.5", sla.urgent ? "text-emergency" : "text-subtle")}>{sla.text}</span>
                    </span>
                    <span className="text-15 leading-[1.35] font-semibold" lang={enText}>
                      {i.title}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusPill status={i.status} label={t.status[i.status] ?? i.statusLabel} />
                      {i.flags.map((f) => (
                        <FlagPill key={f} lang={lang === "hi" && !t.checkText[f] ? "en" : undefined}>
                          {checkLabel(t, f)}
                        </FlagPill>
                      ))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="m-0 rounded-18 bg-success-tint p-5 font-medium text-success">{emptyText}</p>
        )}
      </div>
      {selected ? <Detail lang={lang} t={t} queue={queue} item={selected} history={history} nextId={nextId} filter={filter} canReveal={canReveal} /> : null}
    </div>
  );
}

function Detail({
  lang,
  t,
  queue,
  item,
  history,
  nextId,
  filter,
  canReveal,
}: {
  lang: Lang;
  t: AdminStrings;
  queue: ModerationQueue;
  item: QueueItem;
  history: ItemHistoryRow[];
  nextId: string | null;
  filter: QueueFilter;
  canReveal: boolean;
}) {
  const q = t.queue;
  const kind: QueueItemKind = item.kind ?? "review";
  const open = isOpenStatus(item.status);
  const enText = lang === "hi" ? "en" : undefined;
  const view = item.targetPublic ? targetHref(lang, item.target, kind) : null;
  const group = buttonGroup(kind);
  const words = t.decide.buttons[group] ?? t.decide.buttons.default;
  const labels: DecisionLabels = {
    reason: t.decide.reason,
    chooseReason: t.decide.chooseReason,
    note: t.decide.note,
    optional: t.decide.optional,
    noteHelp: t.decide.noteHelp[noteHelpKey(kind)] ?? t.decide.noteHelp.default,
    working: t.decide.working,
    viewLive: t.done.viewLive,
    nextWaiting: q.nextWaiting,
    decidedNote: q.decidedNote,
    storyTitle: t.decide.storyTitle,
    storyIntro: t.decide.storyIntro,
    story: t.decide.storyFields,
  };

  return (
    <section
      id="detail"
      aria-labelledby="detail-title"
      className="flex min-w-0 scroll-mt-24 flex-col gap-3.5 rounded-22 border-[1.5px] border-ink p-4.5 sm:p-5.5 lg:sticky lg:top-24"
    >
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <span className="mono-label pt-1 text-10.5 text-subtle">{fmt(q.submitted, { ref: item.shortRef, when: stamp(lang, item.submittedAt) })}</span>
        <StatusPill status={item.status} label={t.status[item.status] ?? item.statusLabel} />
      </div>
      <h2 id="detail-title" className="m-0 text-20 leading-[1.3] font-bold tracking-title" lang={enText}>
        {item.title}
      </h2>
      <div className="rounded-16 bg-cream px-4 py-3.5 text-14.5 leading-[1.6] font-light break-words whitespace-pre-line" lang={enText}>
        {item.body}
      </div>
      {view ? (
        <Link href={view} className="-my-1 inline-flex min-h-11 items-center self-start text-14 font-medium">
          {q.viewOnSite}
        </Link>
      ) : (
        <span className="text-13 font-light text-subtle">{q.notPublicYet}</span>
      )}
      {item.checks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="mono-label text-10.5 text-subtle">{q.checks}</span>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {item.checks.map((c) => (
              <li key={c.text} className="flex items-center gap-2 text-13.5">
                <span
                  aria-hidden="true"
                  className={cn("flex size-5 flex-none items-center justify-center rounded-full text-11 font-bold", c.ok ? "bg-success-tint text-success" : "bg-pending-tint text-pending")}
                >
                  {c.ok ? "✓" : "!"}
                </span>
                <span className="sr-only">{c.ok ? q.checkOk : q.checkWarn}: </span>
                <span lang={lang === "hi" && !t.checkText[c.text] ? "en" : undefined}>{checkLabel(t, c.text)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {item.hasPrivate && (
        <RevealPrivate
          key={`reveal-${item.id}`}
          lang={lang}
          queue={queue}
          itemId={item.id}
          canReveal={canReveal}
          labels={{ hidden: q.privateHidden, revealed: q.privateRevealed, none: q.privateNone, reveal: q.reveal, revealing: q.revealing, onlyEditors: q.revealOnlyEditors }}
        />
      )}
      <DecisionPanel
        key={`decide-${item.id}`}
        lang={lang}
        queue={queue}
        itemId={item.id}
        open={open}
        decisions={KIND_DECISIONS[kind].map((d) => ({ value: d, label: words[d] }))}
        reasons={reasonsFor(kind).map((r) => ({ value: r, label: reasonLabel(t, r) }))}
        labels={labels}
        story={kind === "story" && item.story ? { ...item.story, categories: STORY_CATEGORY_VALUES.map((c) => ({ value: c, label: t.storyCategories[c] ?? c })) } : null}
        viewHref={targetHref(lang, item.target, kind)}
        noteOptional={kind !== "dispute"}
        nextHref={nextId ? adminHref(lang, queue, { filter: filter === "waiting" ? null : filter, item: nextId }, "detail") : null}
      />
      <div className="flex flex-col gap-1.5 border-t border-line pt-3">
        <span className="mono-label text-10.5 text-subtle">{q.history}</span>
        {history.length ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {history.map((h) => (
              <li key={`${h.at}-${h.action}`} className="flex flex-col gap-0.5 text-13 leading-snug">
                <span>
                  <b className="font-semibold">{t.verbs[h.verb] ?? h.action}</b>
                  {" · "}
                  <span className="font-light text-muted">{fmt(q.historyLine, { who: h.actor, role: h.actorRole ? (t.roles[h.actorRole] ?? h.actorRole) : "", when: stamp(lang, h.at) })}</span>
                </span>
                {h.reason && (
                  <span className="font-light text-ink-soft">
                    {fmt(t.auditReason, { reason: reasonLabel(t, h.reason) })}
                    {h.note ? (
                      <>
                        {" · "}
                        <span lang={enText}>“{h.note}”</span>
                      </>
                    ) : null}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-13 font-light text-subtle">{q.historyNone}</span>
        )}
      </div>
    </section>
  );
}
