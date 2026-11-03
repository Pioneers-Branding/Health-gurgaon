// "Ask your neighbourhood": the forum. Prototype: "Health Gurgaon Community.dc.html" #forum.
// Topic, locality and sort are in the URL (?topic, ?locality, ?sort). The unfiltered list renders
// into the static shell as the Suspense fallback (there without JavaScript and for crawlers); the
// URL's filters and the reader's follow state render under <Suspense>.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FollowButton } from "@/components/community/follow-button";
import { filterThreads, ForumBody, type TopicCounts } from "@/components/community/forum-view";
import { NO_FORUM_FILTERS, parseForumFilters, type ForumFilters } from "@/components/community/logic";
import { getCommunityNow, getMyTopicFollows, getThreads, getTopicCounts, type ThreadSort } from "@/lib/data/community";
import { FORUM_TOPICS } from "@/lib/domain";
import { fmt, getDictionary, type Lang } from "@/lib/i18n";
import { communityStrings, type CommunityStrings } from "@/lib/i18n/areas/community";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/community">;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.community;
  return pageMetadata({ lang, href: (l) => routes.community(l), title: t.title, description: t.description });
}

const SORT: Record<ForumFilters["sort"], ThreadSort> = { recent: "recent", helpful: "helpful", unanswered: "unanswered" };

async function loadForum(filters: ForumFilters) {
  const [threads, counts, now] = await Promise.all([getThreads({ sort: SORT[filters.sort], limit: 100 }), getTopicCounts(), getCommunityNow()]);
  return { threads: filterThreads(threads, filters), counts: counts as TopicCounts, now };
}

export default async function CommunityPage({ searchParams }: Props) {
  const lang = await getLang();
  const t = communityStrings(lang);
  const dict = getDictionary(lang);
  const all = await loadForum(NO_FORUM_FILTERS);
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-5 px-6 pt-7 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2.5rem] leading-[1.1] font-bold tracking-display">{dict.pages.community.title}</h1>
          <p className="max-w-[38.75rem] text-15 font-light text-muted">{t.forum.intro}</p>
        </div>
        <Link href={routes.ask(lang)} className="inline-flex min-h-12 items-center rounded-pill bg-teal px-5 text-14.5 font-semibold text-white hover:bg-teal-dark hover:text-white">
          {t.forum.ask}
        </Link>
      </div>
      <Suspense fallback={<ForumBody lang={lang} t={t} filters={NO_FORUM_FILTERS} {...all} follow={<CommunityFollow lang={lang} t={t} topic={null} initial={false} />} />}>
        <ForumForRequest lang={lang} t={t} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ForumForRequest({ lang, t, searchParams }: { lang: Lang; t: CommunityStrings; searchParams: Props["searchParams"] }) {
  const filters = parseForumFilters(await searchParams);
  const [data, followed] = await Promise.all([loadForum(filters), getMyTopicFollows()]);
  const initial = filters.topic ? !!followed?.includes(filters.topic) : !!followed && FORUM_TOPICS.every((x) => followed.includes(x.slug));
  return <ForumBody lang={lang} t={t} filters={filters} {...data} follow={<CommunityFollow lang={lang} t={t} topic={filters.topic} initial={initial} />} />;
}

function CommunityFollow({ lang, t, topic, initial }: { lang: Lang; t: CommunityStrings; topic: string | null; initial: boolean }) {
  const label = topic ? FORUM_TOPICS.find((x) => x.slug === topic) : null;
  const name = label ? (lang === "hi" ? label.labelHi : label.label) : "";
  return (
    <FollowButton
      // A new key per topic, so the button's state starts from that topic's follow.
      key={topic ?? "community"}
      lang={lang}
      kind={topic ? "topic" : "community"}
      targetId={topic ?? "community"}
      initial={initial}
      labels={{
        follow: topic ? fmt(t.forum.followTopic, { topic: name }) : t.forum.followCommunity,
        following: topic ? fmt(t.forum.followingTopic, { topic: name }) : t.forum.followingCommunity,
        signIn: t.forum.signInToFollow,
        signInLink: t.common.signIn,
      }}
      signInHref={routes.account(lang, { next: routes.community(lang, topic ? { topic } : undefined) })}
    />
  );
}
