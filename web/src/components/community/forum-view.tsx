// "Ask your neighbourhood" forum body: topics, locality filter and house rules on the left; sorts,
// "+ Follow community / topic" and the discussions on the right. Prototype: "Health Gurgaon
// Community.dc.html" #forum. Filters are links / a GET form in the URL (?topic, ?locality, ?sort).

import Link from "next/link";
import type { ReactNode } from "react";

import { ChipLink } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { MonoLabel } from "@/components/ui/mono-label";
import type { ThreadCard } from "@/lib/data/community";
import { FORUM_TOPICS } from "@/lib/domain";
import { formatDate, type Lang } from "@/lib/i18n";
import type { CommunityStrings } from "@/lib/i18n/areas/community";
import { LOCALITIES, localityName } from "@/lib/localities";
import { routes } from "@/lib/routes";

import { dataLang } from "./bits";
import { LocalityFilter } from "./locality-filter";
import { FORUM_SORTS, fill, forumQuery, formatAgo, isUnanswered, plural, threadStatusKind, type ForumFilters } from "./logic";

export type TopicCounts = { total: number; topics: { slug: string; label: string; labelHi: string; count: number }[] };

/** Status words and colours on a card ("Resolved" green, "Pharmacist answered" teal, …).
 * Unanswered uses caution, not emergency red: red is kept for emergencies and errors. */
export function ThreadStatusText({ t, card, className }: { t: CommunityStrings; card: Pick<ThreadCard, "status" | "statusLabel">; className?: string }) {
  const { kind, who } = threadStatusKind(card);
  const text = kind === "resolved" ? t.status.resolved : kind === "answered" ? fill(t.status.answered, { who: t.status.who[who ?? ""] ?? who ?? "" }) : kind === "unanswered" ? t.status.unanswered : t.status.open;
  const tone = kind === "resolved" ? "text-success" : kind === "answered" ? "text-teal" : kind === "unanswered" ? "text-caution" : "text-pending";
  return <span className={cn("font-semibold", tone, className)}>{text}</span>;
}

export function ThreadCardLink({ lang, t, card, now }: { lang: Lang; t: CommunityStrings; card: ThreadCard; now: string }) {
  const topic = lang === "hi" ? card.topic.labelHi : card.topic.label;
  const place = card.localitySlug ? localityName(card.localitySlug, lang) : null;
  return (
    <Link
      href={routes.thread(lang, card.id)}
      className="flex gap-4 rounded-20 border border-line bg-white p-4.5 text-ink transition-shadow hover:text-ink hover:ring-2 hover:ring-teal"
    >
      <span className="flex min-w-13 flex-col items-center gap-0.5 pt-0.5">
        <span className="text-20 font-bold">{card.helpfulCount}</span>
        <span className="text-11 font-light text-subtle">{t.forum.helpful}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.75">
        <span lang={dataLang(lang)} className="text-16.5 leading-[1.35] font-semibold">
          {card.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-12.5 font-light text-subtle">
          <span className="rounded-pill bg-cream px-2.25 py-0.75 font-medium text-ink">{topic}</span>
          {place && <span>{place}</span>}
          <span>{plural(card.replyCount, t.forum.reply, t.forum.replies)}</span>
          <span>{formatAgo(t.ago, card.createdAt, now, (iso) => formatDate(lang, iso))}</span>
          <ThreadStatusText t={t} card={card} />
        </span>
      </span>
    </Link>
  );
}

/** Apply the URL's filters to the cached list (sorted by the data layer). */
export function filterThreads(threads: ThreadCard[], f: ForumFilters): ThreadCard[] {
  return threads.filter((x) => (!f.topic || x.topic.slug === f.topic) && (!f.locality || x.localitySlug === f.locality) && (f.sort !== "unanswered" || isUnanswered(x)));
}

export function ForumBody({
  lang,
  t,
  filters,
  threads,
  counts,
  now,
  follow,
}: {
  lang: Lang;
  t: CommunityStrings;
  filters: ForumFilters;
  /** Already filtered and sorted. */
  threads: ThreadCard[];
  counts: TopicCounts;
  now: string;
  /** "+ Follow community" / "+ Follow {topic}" (request-time). */
  follow: ReactNode;
}) {
  const topicRows = [{ slug: null as string | null, label: t.forum.allTopics, count: counts.total }, ...counts.topics.map((x) => ({ slug: x.slug as string | null, label: lang === "hi" ? x.labelHi : x.label, count: x.count }))];
  const localityOptions = LOCALITIES.map((L) => ({ value: L.slug, label: localityName(L.slug, lang) }));

  return (
    <div className="grid items-start gap-6 md:grid-cols-3">
      <aside className="flex flex-col gap-4 md:max-w-80">
        <nav aria-labelledby="forum-topics" className="flex flex-col gap-1 rounded-20 bg-cream p-4">
          <MonoLabel as="h2" id="forum-topics" className="px-2 pb-1.5">
            {t.forum.topics}
          </MonoLabel>
          <ul className="flex flex-col gap-1">
            {topicRows.map((row) => {
              const on = (filters.topic ?? null) === row.slug;
              return (
                <li key={row.slug ?? "all"}>
                  <Link
                    href={routes.community(lang, forumQuery({ ...filters, topic: row.slug }))}
                    aria-current={on ? "true" : undefined}
                    className={cn("flex min-h-11 items-center justify-between gap-2 rounded-12 px-2.5 py-2 text-14 text-ink hover:text-ink", on ? "bg-white font-semibold" : "hover:bg-white/60")}
                  >
                    <span>{row.label}</span>
                    <span className="font-mono text-11 text-subtle">{row.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex flex-col gap-2 rounded-20 border border-line p-4">
          <LocalityFilter
            action={routes.community(lang)}
            label={t.forum.locality}
            allLabel={t.forum.allLocalities}
            showLabel={t.forum.show}
            options={localityOptions}
            value={filters.locality}
            keep={{ topic: filters.topic ?? undefined, sort: filters.sort !== "recent" ? filters.sort : undefined }}
          />
        </div>
        <div className="flex flex-col gap-1.5 rounded-20 border border-line p-4 text-13 leading-[1.55] font-light text-muted">
          <h2 className="text-13 font-semibold text-ink">{t.forum.houseRulesTitle}</h2>
          <p>{t.forum.houseRules}</p>
        </div>
      </aside>

      <section aria-labelledby="forum-list" className="flex min-w-0 flex-col gap-3 md:col-span-2">
        <h2 id="forum-list" className="sr-only">
          {t.forum.listLabel}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div role="group" aria-label={t.forum.sortLabel} className="flex flex-wrap gap-1.5">
            {FORUM_SORTS.map((s) => (
              <ChipLink key={s} href={routes.community(lang, forumQuery({ ...filters, sort: s }))} selected={filters.sort === s} scroll={false}>
                {t.forum.sorts[s]}
              </ChipLink>
            ))}
          </div>
          {follow}
        </div>
        <p className="sr-only" role="status">
          {plural(threads.length, t.forum.countOne, t.forum.count)}
        </p>
        {threads.length ? (
          <ul className="flex flex-col gap-3">
            {threads.map((card) => (
              <li key={card.id}>
                <ThreadCardLink lang={lang} t={t} card={card} now={now} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={t.forum.emptyTitle}
            className="gap-2 rounded-20 p-6 sm:p-6"
            actions={
              <Link
                href={routes.ask(lang, { topic: filters.topic ?? undefined, locality: filters.locality ?? undefined })}
                className="inline-flex min-h-11 items-center rounded-pill bg-teal px-4.5 text-14 text-white hover:bg-teal-dark hover:text-white"
              >
                {t.forum.ask}
              </Link>
            }
          >
            {t.forum.emptyBody}
          </EmptyState>
        )}
      </section>
    </div>
  );
}

/** All topics for the selects on the Ask form, in the page language. */
export function topicOptions(lang: Lang) {
  return FORUM_TOPICS.map((x) => ({ value: x.slug, label: lang === "hi" ? x.labelHi : x.label }));
}
