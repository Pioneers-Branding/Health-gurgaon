// Hospital / clinic / care centre profile (prototype #hospital): photo band, the floating header
// card with the sponsor disclosure and the emergency box, tabs Overview · Reviews · Patient
// stories · Discussions · Ask the hospital (?tab=), and the accessibility / visiting aside.

import Link from "next/link";
import { Suspense } from "react";

import { PhotoPlaceholder } from "@/components/ui/avatar";
import { SponsoredTag } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { chipClasses } from "@/components/ui/chip";
import { Container } from "@/components/ui/container";
import { Disclaimer } from "@/components/ui/disclaimer";
import { FreshnessStamp } from "@/components/ui/freshness-stamp";
import { JsonLd } from "@/components/ui/json-ld";
import { getProviderDiscussions, getProviderReviews, type ProviderProfile } from "@/lib/data/providers";
import { getStories, type StoryCard } from "@/lib/data/top-lists";
import type { ThreadCard } from "@/lib/data/mappers";
import { fmt, formatDate, formatNumber, getDictionary, isoDate, type Lang } from "@/lib/i18n";
import { dataLabel, findCareStrings, type FindCareStrings } from "@/lib/i18n/areas/find-care";
import { localityName } from "@/lib/localities";
import { routes } from "@/lib/routes";

import { CheckBadge, OwnershipPill, PhaseTag, ProfileTabs, Stamp, TypePill, type ProfileTab } from "./bits";
import { tabFrom } from "./doctor-profile";
import { withParams } from "./format";
import { DepartmentFinder } from "./list-finders";
import { ExperienceScoreBlock, MentionsBlock, NoReviews, profileJsonLd, ReviewCard, SaveForProfile, DirectionsLink } from "./profile-parts";

export const HOSPITAL_TABS = ["overview", "reviews", "stories", "discussions", "qa"] as const;
type HospitalTab = (typeof HOSPITAL_TABS)[number];
type Raw = Record<string, string | string[] | undefined>;

function one(raw: Raw, key: string): string | null {
  const v = raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
}

export async function HospitalProfile({ lang, profile, searchParams }: { lang: Lang; profile: ProviderProfile; searchParams: Promise<Raw> }) {
  const t = findCareStrings(lang);
  const dict = getDictionary(lang);
  const href = routes.hospital(lang, profile.slug);
  const [stories, discussions] = await Promise.all([getStories({ provider: profile.slug }), getProviderDiscussions(profile.slug)]);
  const stats = profile.reviewStats;
  const isHospital = profile.kind === "hospital" || profile.kind === "emergency_dept";
  const reviewCount = stats?.total ?? 0;
  const storyCount = stats?.storyCount ?? stories.length;
  const discussionCount = stats?.discussionCount ?? discussions.length;
  const showQa = isHospital || profile.questions.length > 0;

  const tabs: ProfileTab[] = [
    { id: "overview", label: t.profile.overview, href },
    { id: "reviews", label: fmt(t.profile.reviewsTab, { count: formatNumber(lang, reviewCount) }), href: withParams(href, { tab: "reviews" }) },
    { id: "stories", label: fmt(t.hospital.stories, { count: formatNumber(lang, storyCount) }), href: withParams(href, { tab: "stories" }), marker: t.reviews.phase2 },
    { id: "discussions", label: fmt(t.hospital.discussions, { count: formatNumber(lang, discussionCount) }), href: withParams(href, { tab: "discussions" }), marker: t.reviews.phase2 },
    ...(showQa ? [{ id: "qa", label: t.hospital.qa, href: withParams(href, { tab: "qa" }), marker: t.reviews.phase2 }] : []),
  ];
  const headline = profile.headline.split(" · ")[0];
  const sub = [dataLabel(lang, headline), profile.areaLabel, profile.sample ? t.sampleListing : null].filter(Boolean).join(" · ");
  const typeLabel = [profile.facilityType ? dataLabel(lang, profile.facilityType.name) : null, profile.sizeLabel].filter(Boolean).join(" · ");
  const emergency = profile.emergency?.available24x7 ? profile.emergency : null;

  return (
    <>
      <JsonLd
        data={profileJsonLd(lang, profile, [
          { name: dict.breadcrumbs.home, href: routes.home(lang) },
          { name: t.crumbs.hospitals, href: routes.search(lang, { type: "hospital" }) },
          { name: profile.name, href },
        ])}
      />
      <PhotoPlaceholder caption={t.hospital.photo} className="h-65 [&>span]:top-4.5 [&>span]:left-6" />
      <Container className="relative -mt-20 flex flex-col gap-6 pb-14">
        <div className="flex flex-wrap justify-between gap-5 rounded-24 bg-white p-5 shadow-[0_10px_30px_-14px_rgb(43_29_20/0.3)] sm:p-6">
          <div className="flex max-w-[43.75rem] min-w-0 flex-[1_1_30rem] flex-col gap-2">
            {profile.sponsored && profile.sponsorLabel && (
              <SponsoredTag lang={lang} className="whitespace-normal">
                {profile.sponsorLabel}
              </SponsoredTag>
            )}
            <h1 className="text-30 leading-[1.1] font-bold tracking-h1 sm:text-36">{profile.name}</h1>
            <p className="text-15 font-light text-muted">{sub}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <OwnershipPill ownership={profile.ownership} t={t} size="md" />
              {typeLabel && <TypePill size="md">{typeLabel}</TypePill>}
              {profile.badges.map((b) => (
                <CheckBadge key={b} lang={lang} label={b} size="md" />
              ))}
              {profile.lastCheckedAt && <FreshnessStamp lang={lang} date={profile.lastCheckedAt} className="py-1.25" />}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <DirectionsLink t={t} profile={profile} size="sm" />
              <SaveForProfile lang={lang} t={t} profile={profile} size="md" />
            </div>
          </div>
          {emergency && (
            <section aria-labelledby="er-title" className="flex min-w-[min(100%,15rem)] flex-[0_1_26.25rem] flex-col gap-1.5 self-start rounded-18 bg-emergency-tint px-4.5 py-4">
              <span className="mono-label text-10.5 text-emergency">{t.hospital.emergency}</span>
              <h2 id="er-title" className="text-20 font-bold">
                {t.hospital.erLabel}
              </h2>
              <p className="text-13 font-light text-muted">
                <span lang="en">{emergency.source}.</span> {t.hospital.emergencyCall}
              </p>
              <Link href={routes.emergency(lang, "emergency-departments")} className="inline-flex min-h-11 items-center self-start text-13 font-medium">
                {t.hospital.otherEmergency}
              </Link>
            </section>
          )}
        </div>

        <Suspense fallback={<ProfileTabs label={t.profile.tabsLabel} tabs={tabs} current="overview" />}>
          <TabsNav searchParams={searchParams} label={t.profile.tabsLabel} tabs={tabs} />
        </Suspense>

        <div className="grid items-start gap-6 min-[1028px]:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-3 min-[1028px]:col-span-2">
            <Suspense fallback={<HospitalOverview lang={lang} t={t} profile={profile} />}>
              <HospitalTabPanel lang={lang} t={t} profile={profile} searchParams={searchParams} stories={stories} discussions={discussions} isHospital={isHospital} />
            </Suspense>
          </div>
          <HospitalAside lang={lang} t={t} profile={profile} />
        </div>
      </Container>
    </>
  );
}

async function TabsNav({ searchParams, label, tabs }: { searchParams: Promise<Raw>; label: string; tabs: ProfileTab[] }) {
  const tab = tabFrom(await searchParams, HOSPITAL_TABS, "overview");
  return <ProfileTabs label={label} tabs={tabs} current={tabs.some((x) => x.id === tab) ? tab : "overview"} />;
}

async function HospitalTabPanel({
  lang,
  t,
  profile,
  searchParams,
  stories,
  discussions,
  isHospital,
}: {
  lang: Lang;
  t: FindCareStrings;
  profile: ProviderProfile;
  searchParams: Promise<Raw>;
  stories: StoryCard[];
  discussions: ThreadCard[];
  isHospital: boolean;
}) {
  const raw = await searchParams;
  const tab: HospitalTab = tabFrom(raw, HOSPITAL_TABS, "overview");
  if (tab === "reviews") return <HospitalReviews lang={lang} t={t} profile={profile} department={one(raw, "dept")} isHospital={isHospital} />;
  if (tab === "stories") return <StoriesPanel lang={lang} t={t} stories={stories} />;
  if (tab === "discussions") return <DiscussionsPanel lang={lang} t={t} discussions={discussions} isHospital={isHospital} />;
  if (tab === "qa") return <QaPanel lang={lang} t={t} questions={profile.questions} />;
  return <HospitalOverview lang={lang} t={t} profile={profile} />;
}

function HospitalOverview({ lang, t, profile }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile }) {
  return (
    <>
      {profile.departments.length > 0 ? (
        <DepartmentFinder
          departments={profile.departments.map((d) => ({ name: dataLabel(lang, d.name), detail: d.detail }))}
          labels={{ title: t.hospital.departments, find: t.hospital.findDept, none: t.hospital.noDept, ask: t.hospital.noDeptAsk, rest: t.hospital.noDeptRest }}
          askHref={withParams(routes.hospital(lang, profile.slug), { tab: "qa" })}
        />
      ) : (
        <section aria-labelledby="departments-title" className="flex flex-col gap-3">
          <h2 id="departments-title" className="text-20 font-semibold">
            {t.hospital.departments}
          </h2>
          <p className="rounded-18 bg-cream p-4.5 text-14 font-light text-muted">{t.hospital.noDepartments}</p>
          {(profile.services.length > 0 || profile.tags.length > 0) && (
            <ul className="flex flex-wrap gap-2">
              {[...profile.services, ...profile.tags].map((s) => (
                <li key={s} className="rounded-pill bg-cream px-3.25 py-1.75 text-13.5">
                  {dataLabel(lang, s)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {profile.doctorsHere.length > 0 && (
        <section aria-labelledby="doctors-here-title" className="mt-3 flex flex-col gap-3">
          <h2 id="doctors-here-title" className="text-20 font-semibold">
            {t.hospital.doctorsHere}
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.75rem),1fr))] gap-2.5">
            {profile.doctorsHere.map((d) => (
              <li key={d.slug}>
                <Link
                  href={routes.provider(lang, d.profileKind, d.slug)}
                  className="flex h-full flex-col gap-1 rounded-16 border border-line bg-white p-3.5 text-ink hover:text-ink hover:ring-2 hover:ring-teal"
                >
                  <span className="text-14.5 font-semibold">{d.name}</span>
                  <span className="text-12.5 font-light text-muted">{[d.department ? dataLabel(lang, d.department) : d.headline, d.days].filter(Boolean).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

async function HospitalReviews({ lang, t, profile, department, isHospital }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile; department: string | null; isHospital: boolean }) {
  const reviews = await getProviderReviews(profile.slug, { department });
  const stats = profile.reviewStats;
  const list = profile.topLists[0] ?? null;
  const href = routes.hospital(lang, profile.slug);
  const signInHref = routes.account(lang, { next: withParams(href, { tab: "reviews" }) });
  const departments = stats?.departments ?? [];
  const current = department && departments.some((d) => d.name === department) ? department : "All departments";
  return (
    <>
      {stats && !stats.mentions.length && (
        <div className="flex flex-col gap-1.5 rounded-20 bg-cream p-5">
          <h2 className="text-17 font-semibold">{fmt(t.reviews.hospitalSummary, { count: formatNumber(lang, stats.total) })}</h2>
          <p className="text-12 leading-normal font-light text-subtle">{t.reviews.disclaimer}</p>
        </div>
      )}
      {stats && stats.mentions.length > 0 && <MentionsBlock lang={lang} t={t} total={stats.total} mentions={stats.mentions} families={false} />}
      {stats?.experienceScore !== undefined && (
        <ExperienceScoreBlock
          lang={lang}
          t={t}
          kind="hospital"
          slug={profile.slug}
          score={stats.experienceScore}
          total={stats.total}
          subScores={stats.subScores ?? []}
          list={list ? { slug: list.slug, title: list.title, rank: list.rank } : null}
        />
      )}
      {departments.length > 0 && (
        <nav aria-labelledby="dept-filter" className="flex flex-col gap-2">
          <span id="dept-filter" className="mono-label text-10.5 text-subtle">
            {t.reviews.filterDept}
          </span>
          <ul className="flex flex-wrap gap-1.5">
            {departments.map((d) => (
              <li key={d.name}>
                <Link
                  href={withParams(href, { tab: "reviews", dept: d.name === "All departments" ? null : d.name })}
                  scroll={false}
                  aria-current={current === d.name ? "true" : undefined}
                  className={chipClasses(current === d.name)}
                >
                  {fmt(t.reviews.deptChip, { name: dataLabel(lang, d.name), count: formatNumber(lang, d.count) })}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {reviews && reviews.reviews.length > 0 ? (
        reviews.reviews.map((r) => (
          <ReviewCard
            key={r.ref}
            lang={lang}
            t={t}
            review={r}
            kind="hospital"
            slug={profile.slug}
            replyLabel={isHospital ? t.reviews.replyHospital : t.reviews.replyProvider}
            showDepartment
            signInHref={signInHref}
          />
        ))
      ) : (
        <NoReviews t={t} message={department ? t.reviews.noneDept : undefined} />
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <ButtonLink href={routes.review(lang, "hospital", profile.slug)} variant="dark" size="md" className="self-start">
          {t.reviews.write}
        </ButtonLink>
        <Link href={routes.providerReviews(lang, "hospital", profile.slug)} className="inline-flex min-h-11 items-center text-14 font-medium">
          {t.profile.allReviews}
        </Link>
      </div>
    </>
  );
}

export function StoriesPanel({ lang, t, stories, heading = true }: { lang: Lang; t: FindCareStrings; stories: StoryCard[]; heading?: boolean }) {
  return (
    <>
      {heading && (
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-20 font-semibold">{t.hospital.storiesTitle}</h2>
          <PhaseTag>{t.reviews.phase2}</PhaseTag>
        </div>
      )}
      <p className="text-13.5 leading-[1.55] font-light text-muted">{t.hospital.storiesNote}</p>
      {stories.length > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.75rem),1fr))] gap-3.5">
          {stories.map((s) => (
            <li key={s.slug}>
              <Link href={routes.stories(lang)} className="flex flex-col gap-2 text-ink hover:text-ink">
                <span className="relative block aspect-[16/10] rounded-18 bg-[repeating-linear-gradient(135deg,#e3d6c0_0_12px,#ecdfca_12px_24px)]">
                  <span aria-hidden="true" className="absolute top-1/2 left-1/2 flex size-13 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-saffron">
                    ▶
                  </span>
                  <span className="absolute right-2.5 bottom-2.5 rounded-5 bg-ink px-1.75 py-0.75 font-mono text-11 font-medium text-cream">{s.duration}</span>
                </span>
                <span lang="en" className="text-15 leading-[1.35] font-semibold">
                  {s.title}
                </span>
                <span className="font-mono text-10.5 text-subtle uppercase">{s.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-18 bg-cream p-4.5 text-14 font-light text-muted">{t.hospital.noStories}</p>
      )}
      <Link href={routes.stories(lang)} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
        {t.hospital.allStories}
      </Link>
    </>
  );
}

export function threadMeta(lang: Lang, t: FindCareStrings, d: ThreadCard): string {
  const place = d.localitySlug ? localityName(d.localitySlug, lang) : d.areaLabel;
  const replies = d.replyCount === 1 ? t.hospital.repliesOne : fmt(t.hospital.replies, { count: formatNumber(lang, d.replyCount) });
  return [place, replies, d.statusLabel === "Open" ? null : d.statusLabel].filter(Boolean).join(" · ");
}

export function DiscussionsPanel({ lang, t, discussions, isHospital, heading = true }: { lang: Lang; t: FindCareStrings; discussions: ThreadCard[]; isHospital: boolean; heading?: boolean }) {
  return (
    <>
      {heading && (
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-20 font-semibold">{isHospital ? t.hospital.discussionsTitle : t.hospital.discussionsTitleGeneric}</h2>
          <PhaseTag>{t.reviews.phase2}</PhaseTag>
        </div>
      )}
      <p className="text-13.5 leading-[1.55] font-light text-muted">{t.hospital.discussionsNote}</p>
      {discussions.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {discussions.map((d) => (
            <li key={d.id}>
              <Link href={routes.thread(lang, d.id)} className="flex flex-col gap-1.25 rounded-18 border border-line p-4 text-ink hover:text-ink hover:ring-2 hover:ring-teal">
                <span lang="en" className="text-15.5 font-semibold">
                  {d.title}
                </span>
                <span className="text-12.5 font-light text-subtle">{threadMeta(lang, t, d)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-18 bg-cream p-4.5 text-14 font-light text-muted">{t.hospital.noDiscussions}</p>
      )}
      <ButtonLink href={routes.ask(lang)} variant="primary" size="sm" className="self-start">
        {heading ? t.hospital.startDiscussion : t.hospital.startDiscussionAbout}
      </ButtonLink>
    </>
  );
}

export function QaPanel({ lang, t, questions, heading = true }: { lang: Lang; t: FindCareStrings; questions: ProviderProfile["questions"]; heading?: boolean }) {
  const answered = questions.filter((q) => q.answer);
  return (
    <>
      {heading && (
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-20 font-semibold">{t.hospital.qaTitle}</h2>
          <PhaseTag>{t.reviews.phase2}</PhaseTag>
        </div>
      )}
      {answered.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {answered.map((q) => (
            <li key={q.question} className="flex flex-col gap-2 rounded-18 border border-line p-4">
              <p className="text-15 font-semibold">
                {t.hospital.q} <span lang="en">{q.question}</span>
              </p>
              <p className="rounded-12 bg-cream p-3 text-14 leading-[1.55] font-light">
                <b className="font-semibold">
                  {fmt(t.hospital.officialAnswer, { date: q.answeredAt ? formatDate(lang, q.answeredAt).toUpperCase() : "" })}
                </b>{" "}
                <span lang="en">{q.answer}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-18 bg-cream p-4.5 text-14 font-light text-muted">{t.hospital.noQa}</p>
      )}
      <p className="text-12.5 font-light text-subtle">{t.hospital.qaNote}</p>
    </>
  );
}

function HospitalAside({ lang, t, profile }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile }) {
  const items = profile.accessibility;
  return (
    <aside className="flex flex-col gap-3">
      <section aria-labelledby="access-title" className="flex flex-col gap-2.5 rounded-20 border border-line p-4.5">
        <h2 id="access-title" className="text-16 font-semibold">
          {t.hospital.accessibility}
        </h2>
        {items.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {items.map((a) => (
              <li key={a.item} className="flex items-start gap-2.5 text-13.5">
                <span
                  aria-hidden="true"
                  className={
                    a.status === "verified"
                      ? "flex size-5.5 flex-none items-center justify-center rounded-full bg-success-tint text-12 font-bold text-success"
                      : "flex size-5.5 flex-none items-center justify-center rounded-full bg-cream text-12 font-bold text-caution"
                  }
                >
                  {t.hospital.accessStatus[a.status] ?? "?"}
                </span>
                <span className="flex flex-col gap-px">
                  <span lang="en">{a.item}</span>
                  <span className="text-11.5 font-light text-subtle">{dataLabel(lang, a.source)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-13.5 font-light text-muted">
            {profile.wheelchair === true ? t.profile.wheelchairYes : profile.wheelchair === false ? t.profile.wheelchairNo : t.hospital.noAccessibility}
          </p>
        )}
        <Link href={routes.report(lang, "hospital", profile.slug, { field: "accessibility" })} className="inline-flex min-h-11 items-center self-start text-13 font-medium">
          {t.hospital.helpVerify}
        </Link>
      </section>
      {(profile.visiting || profile.hours.summary) && (
        <section aria-labelledby="visiting-title" className="flex flex-col gap-1.5 rounded-20 bg-cream p-4.5">
          <h2 id="visiting-title" className="font-semibold">
            {t.hospital.visiting}
          </h2>
          <p lang="en" className="text-13.5 leading-[1.55] font-light text-muted">
            {profile.visiting?.text ?? profile.hours.summary}
          </p>
          {profile.visiting?.confirmedAt ? (
            <Stamp tone="success" size="10.5">
              <time dateTime={isoDate(profile.visiting.confirmedAt)}>{fmt(getDictionary(lang).stamps.confirmed, { date: formatDate(lang, profile.visiting.confirmedAt) })}</time>
            </Stamp>
          ) : profile.hours.source ? (
            <Stamp size="10.5">{profile.hours.source}</Stamp>
          ) : null}
        </section>
      )}
      {profile.hours.underRecheck && (
        <Callout tone="warning" title={t.hours.underRecheck}>
          <p>{t.hours.underRecheckBody}</p>
        </Callout>
      )}
      <ButtonLink href={routes.report(lang, "hospital", profile.slug)} variant="outline" size="sm" className="self-start">
        {t.profile.suggestCorrection}
      </ButtonLink>
      {!profile.claimed && (
        <Link href={routes.claim(lang, "hospital", profile.slug)} className="inline-flex min-h-11 items-center self-start text-13 font-medium">
          {t.profile.claimCta}
        </Link>
      )}
      <Disclaimer lang={lang} kinds={["medical", "listing"]} className="px-1" />
    </aside>
  );
}
