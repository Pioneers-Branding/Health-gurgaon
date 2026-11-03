// /gurgaon/{doctor,hospital,lab,pharmacy}/[slug]/reviews: "Reviews & discussions" (prototype
// "Health Gurgaon Top Lists and Stories.dc.html" #business). Shared by the four route files.
// Tabs (?tab=) and the department filter (?dept=) are in the URL.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ButtonLink } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { cn } from "@/components/ui/cn";
import { JsonLd } from "@/components/ui/json-ld";
import { getNeighbourSummary } from "@/lib/data/neighbours";
import { getProviderDiscussions, getProviderForRoute, getProviderReviews, type ProviderProfile } from "@/lib/data/providers";
import { getStories } from "@/lib/data/top-lists";
import { fmt, formatNumber, getDictionary, type Lang } from "@/lib/i18n";
import { dataLabel, findCareStrings, type FindCareStrings } from "@/lib/i18n/areas/find-care";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes, type ProviderKind } from "@/lib/routes";

import { CheckBadge, OwnershipPill, ProfileTabs, TypePill, type ProfileTab } from "./bits";
import { tabFrom } from "./doctor-profile";
import { withParams } from "./format";
import { DiscussionsPanel, QaPanel, StoriesPanel } from "./hospital-profile";
import { MentionsBlock, NeighbourBlock, NoReviews, profilePlace, ReviewCard } from "./profile-parts";

type Params = Promise<{ lang: string; slug: string }>;
type Raw = Record<string, string | string[] | undefined>;

const TABS = ["reviews", "stories", "discussions", "qa"] as const;

export async function providerReviewsMetadata(kind: ProviderKind, params: Params): Promise<Metadata> {
  const lang = await getLang();
  const { slug } = await params;
  const profile = await getProviderForRoute(kind, slug);
  if (!profile) notFound();
  const t = getDictionary(lang).pages.reviews;
  const reviews = await getProviderReviews(slug);
  return pageMetadata({
    lang,
    href: (l) => routes.providerReviews(l, kind, slug),
    title: `${profile.name}: ${t.title}`,
    description: t.description,
    noindex: !reviews || reviews.publishedCount === 0,
  });
}

export async function ProviderReviewsPage({ kind, params, searchParams }: { kind: ProviderKind; params: Params; searchParams: Promise<Raw> }) {
  const lang = await getLang();
  const { slug } = await params;
  const profile = await getProviderForRoute(kind, slug);
  if (!profile) notFound();
  const t = findCareStrings(lang);
  const dict = getDictionary(lang);
  const [stories, discussions, neighbours] = await Promise.all([getStories({ provider: slug }), getProviderDiscussions(slug), kind === "doctor" ? getNeighbourSummary(slug) : null]);

  const href = routes.providerReviews(lang, kind, slug);
  const profileHref = routes.provider(lang, kind, slug);
  const stats = profile.reviewStats;
  const isHospital = profile.kind === "hospital" || profile.kind === "emergency_dept";
  const total = stats?.total ?? 0;
  const storyCount = stats?.storyCount ?? stories.length;
  const discussionCount = stats?.discussionCount ?? discussions.length;
  const tabs: ProfileTab[] = [
    { id: "reviews", label: fmt(t.reviewsPage.reviewsTab, { count: formatNumber(lang, total) }), href },
    ...(isHospital || storyCount > 0 ? [{ id: "stories", label: fmt(t.hospital.stories, { count: formatNumber(lang, storyCount) }), href: withParams(href, { tab: "stories" }) }] : []),
    { id: "discussions", label: fmt(t.hospital.discussions, { count: formatNumber(lang, discussionCount) }), href: withParams(href, { tab: "discussions" }) },
    ...(isHospital || profile.questions.length ? [{ id: "qa", label: t.hospital.qa, href: withParams(href, { tab: "qa" }) }] : []),
  ];
  const place = profile.sector ?? profilePlace(lang, profile);
  const sub = (place ? fmt(t.reviewsPage.sub, { place }) : t.reviewsPage.subNoPlace) + (profile.sample ? ` ${t.reviewsPage.sample}` : "");
  const list = profile.topLists[0] ?? null;
  const typeLabel = [profile.facilityType && profile.kind !== "doctor" ? dataLabel(lang, profile.headline.split(" · ")[0]) : profile.specialty?.name ? dataLabel(lang, profile.specialty.name) : null, profile.sizeLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home },
            { "@type": "ListItem", position: 2, name: profile.name },
            { "@type": "ListItem", position: 3, name: t.crumbs.reviews },
          ],
        }}
      />
      <div className="bg-cream">
        <div className="mx-auto flex w-full max-w-[68.75rem] flex-col gap-3.5 px-6 pt-7">
          <Breadcrumbs lang={lang} items={[{ label: profile.name, href: profileHref }, { label: t.crumbs.reviews }]} />
          <div className="flex flex-wrap items-center gap-1.5">
            <OwnershipPill ownership={profile.ownership} t={t} size="md" />
            {typeLabel && (
              <TypePill size="md" tone="white">
                {typeLabel}
              </TypePill>
            )}
            {profile.badges.slice(0, 1).map((b) => (
              <CheckBadge key={b} lang={lang} label={b} size="md" />
            ))}
            {list && (
              <Link href={routes.topList(lang, list.slug)} className="inline-flex items-center rounded-pill bg-saffron px-2.75 py-1 text-12 font-semibold text-ink hover:bg-saffron-soft hover:text-ink">
                {fmt(t.reviewsPage.topBadge, { rank: list.rank, title: list.title })}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="text-30 leading-[1.08] font-bold tracking-h1 sm:text-38">{profile.name}</h1>
              <p className="text-15 font-light text-muted">{sub}</p>
            </div>
            <dl className="flex items-center gap-4.5">
              {stats?.experienceScore !== undefined && (
                <div className="flex flex-col-reverse items-end">
                  <dt className="font-mono text-10.5 text-subtle uppercase">{t.reviews.experienceScore}</dt>
                  <dd className="text-[2.125rem] leading-none font-bold tracking-h1 text-teal">{stats.experienceScore}</dd>
                </div>
              )}
              <div className="flex flex-col-reverse items-end">
                <dt className="font-mono text-10.5 text-subtle uppercase">{t.reviews.verifiedReviewsLabel}</dt>
                <dd className="text-[2.125rem] leading-none font-bold tracking-h1">{formatNumber(lang, total)}</dd>
              </div>
            </dl>
          </div>
          <Suspense fallback={<ProfileTabs label={t.reviewsPage.tabs} tabs={tabs} current="reviews" underline={false} />}>
            <ReviewTabsNav searchParams={searchParams} tabs={tabs} label={t.reviewsPage.tabs} />
          </Suspense>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[68.75rem] flex-col gap-4 px-6 pt-6 pb-14">
        <Suspense fallback={<ReviewsPanel lang={lang} t={t} kind={kind} profile={profile} department={null} neighbours={neighbours} threadHref={threadHrefFor(lang, profile, discussions[0]?.id)} />}>
          <ReviewsTabPanel
            lang={lang}
            t={t}
            kind={kind}
            profile={profile}
            searchParams={searchParams}
            stories={stories}
            discussions={discussions}
            neighbours={neighbours}
            isHospital={isHospital}
            tabs={tabs.map((x) => x.id)}
          />
        </Suspense>
        <Link href={profileHref} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
          {t.reviewsPage.profile}
        </Link>
      </div>
    </>
  );
}

function threadHrefFor(lang: Lang, profile: ProviderProfile, firstThread: string | undefined): string {
  return firstThread ? routes.thread(lang, firstThread) : routes.community(lang, profile.localitySlug ? { locality: profile.localitySlug } : undefined);
}

async function ReviewTabsNav({ searchParams, tabs, label }: { searchParams: Promise<Raw>; tabs: ProfileTab[]; label: string }) {
  const tab = tabFrom(await searchParams, TABS, "reviews");
  return <ProfileTabs label={label} tabs={tabs} current={tabs.some((x) => x.id === tab) ? tab : "reviews"} underline={false} />;
}

async function ReviewsTabPanel({
  lang,
  t,
  kind,
  profile,
  searchParams,
  stories,
  discussions,
  neighbours,
  isHospital,
  tabs,
}: {
  lang: Lang;
  t: FindCareStrings;
  kind: ProviderKind;
  profile: ProviderProfile;
  searchParams: Promise<Raw>;
  stories: Awaited<ReturnType<typeof getStories>>;
  discussions: Awaited<ReturnType<typeof getProviderDiscussions>>;
  neighbours: Awaited<ReturnType<typeof getNeighbourSummary>>;
  isHospital: boolean;
  tabs: string[];
}) {
  const raw = await searchParams;
  const tabRaw = tabFrom(raw, TABS, "reviews");
  const tab = tabs.includes(tabRaw) ? tabRaw : "reviews";
  const deptRaw = raw.dept;
  const department = (Array.isArray(deptRaw) ? deptRaw[0] : deptRaw) ?? null;
  if (tab === "stories") return <StoriesPanel lang={lang} t={t} stories={stories} heading={false} />;
  if (tab === "discussions") return <DiscussionsPanel lang={lang} t={t} discussions={discussions} isHospital={isHospital} heading={false} />;
  if (tab === "qa") return <QaPanel lang={lang} t={t} questions={profile.questions} heading={false} />;
  return <ReviewsPanel lang={lang} t={t} kind={kind} profile={profile} department={department} neighbours={neighbours} threadHref={threadHrefFor(lang, profile, discussions[0]?.id)} />;
}

async function ReviewsPanel({
  lang,
  t,
  kind,
  profile,
  department,
  neighbours,
  threadHref,
}: {
  lang: Lang;
  t: FindCareStrings;
  kind: ProviderKind;
  profile: ProviderProfile;
  department: string | null;
  neighbours: Awaited<ReturnType<typeof getNeighbourSummary>>;
  threadHref: string;
}) {
  const stats = profile.reviewStats;
  const departments = stats?.departments ?? [];
  const current = department && departments.some((d) => d.name === department) ? department : null;
  const reviews = await getProviderReviews(profile.slug, { department: current });
  const href = routes.providerReviews(lang, kind, profile.slug);
  const signInHref = routes.account(lang, { next: href });
  const isHospital = profile.kind === "hospital" || profile.kind === "emergency_dept";
  return (
    <>
      {departments.length > 0 ? (
        <nav aria-label={t.reviews.filterDept}>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-2.5">
            {departments.map((d) => {
              const on = d.name === "All departments" ? !current : current === d.name;
              return (
                <li key={d.name}>
                  <Link
                    href={withParams(href, { dept: d.name === "All departments" ? null : d.name })}
                    scroll={false}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "flex h-full flex-col gap-1.25 rounded-18 p-3.5 text-ink hover:text-ink",
                      on ? "border-2 border-teal bg-[#F2FAF7]" : "border-[1.5px] border-line bg-white hover:border-teal",
                    )}
                  >
                    <span className="text-14 font-medium">{dataLabel(lang, d.name)}</span>
                    <span className="text-24 font-bold text-teal">{d.score}</span>
                    <span className="text-11.5 font-light text-subtle">{fmt(t.reviews.deptReviews, { count: formatNumber(lang, d.count) })}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : (
        stats && <MentionsBlock lang={lang} t={t} total={stats.total} mentions={stats.mentions} families={profile.specialty?.slug === "paediatrics"} />
      )}
      {neighbours && <NeighbourBlock lang={lang} t={t} kind={kind} slug={profile.slug} summary={neighbours} threadHref={threadHref} />}
      {reviews && reviews.reviews.length > 0 ? (
        reviews.reviews.map((r) => (
          <ReviewCard
            key={r.ref}
            lang={lang}
            t={t}
            review={r}
            kind={kind}
            slug={profile.slug}
            replyLabel={isHospital ? t.reviews.replyHospital : kind === "doctor" ? t.reviews.replyClinic : t.reviews.replyProvider}
            showDepartment={departments.length > 0}
            signInHref={signInHref}
          />
        ))
      ) : (
        <NoReviews t={t} message={current ? t.reviews.noneDept : undefined} />
      )}
      <ButtonLink href={routes.review(lang, kind, profile.slug)} variant="dark" size="md" className="self-start">
        {t.reviews.write}
      </ButtonLink>
    </>
  );
}
