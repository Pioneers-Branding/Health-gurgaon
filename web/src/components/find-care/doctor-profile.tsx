// Doctor profile (prototype #doctor): header band with photo, credentials line, badges and
// contact actions; tabs Overview · Timings & location · Reviews · Verification record (?tab=);
// the correction / claim aside.

import Link from "next/link";
import { Suspense } from "react";

import { NotSponsoredBadge, SponsoredTag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { FreshnessStamp } from "@/components/ui/freshness-stamp";
import { PhotoPlaceholder } from "@/components/ui/avatar";
import { JsonLd } from "@/components/ui/json-ld";
import { getNeighbourSummary } from "@/lib/data/neighbours";
import { getProviderDiscussions, getProviderReviews, type ProviderProfile } from "@/lib/data/providers";
import { fmt, formatDate, formatRupees, getDictionary, type Lang } from "@/lib/i18n";
import { dataLabel, findCareStrings, specialtyNouns, type FindCareStrings } from "@/lib/i18n/areas/find-care";
import { routes } from "@/lib/routes";

import { CheckBadge, ProfileTabs, Stamp, type ProfileTab } from "./bits";
import { withParams } from "./format";
import { PhoneButton } from "./phone-button";
import {
  DirectionsLink,
  MentionsBlock,
  NeighbourBlock,
  NoReviews,
  ProfileAside,
  ProfileHoursTable,
  profileJsonLd,
  RankCard,
  ReviewCard,
  SaveForProfile,
  VerificationLog,
} from "./profile-parts";

export const DOCTOR_TABS = ["overview", "timings", "reviews", "verify"] as const;
export type DoctorTab = (typeof DOCTOR_TABS)[number];

type Raw = Record<string, string | string[] | undefined>;

export function tabFrom<T extends string>(raw: Raw, tabs: readonly T[], fallback: T): T {
  const v = raw.tab;
  const s = Array.isArray(v) ? v[0] : v;
  return (tabs as readonly string[]).includes(s ?? "") ? (s as T) : fallback;
}

export function DoctorProfile({ lang, profile, searchParams }: { lang: Lang; profile: ProviderProfile; searchParams: Promise<Raw> }) {
  const t = findCareStrings(lang);
  const dict = getDictionary(lang);
  const href = routes.doctor(lang, profile.slug);
  const nouns = profile.specialty ? specialtyNouns(lang, profile.specialty) : null;
  const specialtyLabel = profile.specialty ? dataLabel(lang, profile.specialty.name) : null;
  const crumbs = [
    ...(profile.specialty ? [{ label: specialtyLabel ?? profile.specialty.name, href: routes.specialty(lang, profile.specialty.slug) }] : [{ label: t.crumbs.doctors, href: routes.search(lang, { type: "doctor" }) }]),
    { label: profile.name },
  ];
  const subline = [nouns?.noun ?? profile.headline, profile.qualifications, profile.yearsInPractice ? fmt(t.profile.yearsInPractice, { years: profile.yearsInPractice }) : null]
    .filter(Boolean)
    .join(" · ");
  const reviewCount = profile.reviewStats?.total ?? null;

  const tabs = (count: number | null): ProfileTab[] => [
    { id: "overview", label: t.profile.overview, href },
    { id: "timings", label: t.profile.timings, href: withParams(href, { tab: "timings" }) },
    { id: "reviews", label: fmt(t.profile.reviewsTab, { count: count ?? 0 }), href: withParams(href, { tab: "reviews" }) },
    { id: "verify", label: t.profile.verification, href: withParams(href, { tab: "verify" }) },
  ];

  return (
    <>
      <JsonLd
        data={profileJsonLd(lang, profile, [
          { name: dict.breadcrumbs.home, href: routes.home(lang) },
          ...(profile.specialty ? [{ name: specialtyLabel ?? profile.specialty.name, href: routes.specialty(lang, profile.specialty.slug) }] : []),
          { name: profile.name, href },
        ])}
      />
      <div className="bg-cream">
        <Container className="flex flex-col gap-4.5 pt-7 pb-8">
          <Breadcrumbs lang={lang} items={crumbs} />
          <div className="flex flex-wrap items-start gap-5.5">
            <PhotoPlaceholder small caption={t.profile.photo} captionPosition="bottom-center" className="size-28 flex-none rounded-28" />
            <div className="flex min-w-[min(100%,17.5rem)] flex-1 flex-col gap-2">
              <h1 className="text-32 leading-[1.05] font-bold tracking-h1 sm:text-38">{profile.name}</h1>
              <p className="text-16 text-muted">{subline}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {profile.badges.map((b) => (
                  <CheckBadge key={b} lang={lang} label={b} size="md" />
                ))}
                {profile.sponsored ? <SponsoredTag lang={lang}>{profile.sponsorLabel ?? undefined}</SponsoredTag> : <NotSponsoredBadge lang={lang} />}
                {profile.lastCheckedAt && <FreshnessStamp lang={lang} date={profile.lastCheckedAt} kind="lastChecked" className="py-1.25" />}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.hasPublicPhone && (
                <PhoneButton
                  lang={lang}
                  slug={profile.slug}
                  labels={{ show: t.profile.showPhone, loading: t.profile.phoneLoading, shown: t.profile.phoneClinic, call: t.profile.call, none: t.profile.noPhone }}
                />
              )}
              <DirectionsLink t={t} profile={profile} />
              <SaveForProfile lang={lang} t={t} profile={profile} />
            </div>
          </div>
          <Suspense fallback={<ProfileTabs label={t.profile.tabsLabel} tabs={tabs(reviewCount)} current="overview" />}>
            <DoctorTabsNav searchParams={searchParams} label={t.profile.tabsLabel} tabs={tabs(reviewCount)} />
          </Suspense>
        </Container>
      </div>
      <Container className="grid items-start gap-7 pt-7 pb-14 min-[1004px]:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 min-[1004px]:col-span-2">
          <Suspense fallback={<DoctorOverview lang={lang} t={t} profile={profile} />}>
            <DoctorTabPanel lang={lang} t={t} profile={profile} searchParams={searchParams} />
          </Suspense>
        </div>
        <ProfileAside lang={lang} t={t} profile={profile} kind="doctor" />
      </Container>
    </>
  );
}

async function DoctorTabsNav({ searchParams, label, tabs }: { searchParams: Promise<Raw>; label: string; tabs: ProfileTab[] }) {
  const tab = tabFrom(await searchParams, DOCTOR_TABS, "overview");
  return <ProfileTabs label={label} tabs={tabs} current={tab} />;
}

async function DoctorTabPanel({ lang, t, profile, searchParams }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile; searchParams: Promise<Raw> }) {
  const tab = tabFrom(await searchParams, DOCTOR_TABS, "overview");
  if (tab === "timings") return <DoctorTimings lang={lang} t={t} profile={profile} />;
  if (tab === "reviews") return <DoctorReviews lang={lang} t={t} profile={profile} />;
  if (tab === "verify") return <VerificationLog lang={lang} t={t} profile={profile} />;
  return <DoctorOverview lang={lang} t={t} profile={profile} />;
}

type Fact = { key: string; label: string; value: string; note: string | null; tone: "verified" | "stated" | "muted" };

/** The facts grid: verified facts with their source, or the listing's own fields dated by the
 * last check when no per-fact record exists. */
export function doctorFacts(lang: Lang, t: FindCareStrings, p: ProviderProfile): Fact[] {
  const label = (field: string, fallback: string) => t.profile.factLabels[field] ?? fallback;
  if (p.verification.facts.length) {
    return p.verification.facts
      .filter((f) => f.value)
      .map((f) => ({
        key: f.field,
        label: label(f.field, f.label),
        value: f.value!,
        note: f.note,
        tone: f.result === "verified" ? "verified" : f.result === "stated" ? "stated" : "muted",
      }));
  }
  const note = p.lastCheckedAt ? fmt(t.profile.factsFallbackNote, { date: formatDate(lang, p.lastCheckedAt) }) : null;
  const facts: Fact[] = [];
  if (p.registration?.council || p.registration?.number)
    facts.push({ key: "registration", label: label("registration", "Registration"), value: [p.registration.council, p.registration.number].filter(Boolean).join(" · "), note, tone: "muted" });
  if (p.qualifications) facts.push({ key: "qualifications", label: label("qualifications", "Qualifications"), value: p.qualifications, note, tone: "muted" });
  if (p.feeVerified && p.fee !== null)
    facts.push({
      key: "fee",
      label: label("fee", "Consultation fee"),
      value: p.fee === 0 ? t.profile.freeConsultation : p.followUpTerms ? fmt(t.profile.feeValue, { amount: formatRupees(lang, p.fee), terms: p.followUpTerms }) : formatRupees(lang, p.fee),
      note,
      tone: "muted",
    });
  if (p.languages.length) facts.push({ key: "languages", label: label("languages", "Languages"), value: p.languages.map((l) => t.languages[l] ?? l).join(", "), note, tone: "muted" });
  if (p.practicesAt.length)
    facts.push({ key: "affiliations", label: label("affiliations", "Practices at"), value: p.practicesAt.map((a) => (a.days ? `${a.name} (${a.days})` : a.name)).join(" · "), note, tone: "muted" });
  else if (p.areaLabel) facts.push({ key: "location", label: label("location", "Location"), value: p.areaLabel, note, tone: "muted" });
  if (p.wheelchair !== null) facts.push({ key: "accessibility", label: label("accessibility", "Accessibility"), value: p.wheelchair ? t.profile.wheelchairYes : t.profile.wheelchairNo, note, tone: "muted" });
  return facts;
}

export function FactsGrid({ facts }: { facts: Fact[] }) {
  if (!facts.length) return null;
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.75rem),1fr))] gap-3">
      {facts.map((f) => (
        <div key={f.key} className="flex flex-col gap-1.5 rounded-18 border border-line p-4">
          <dt className="mono-label text-10.5 text-subtle">{f.label}</dt>
          <dd className="text-15 leading-[1.45] font-medium">{f.value}</dd>
          {f.note && <dd className={f.tone === "verified" ? "text-11.5 font-light text-success" : f.tone === "stated" ? "text-11.5 font-light text-teal" : "text-11.5 font-light text-subtle"}>{f.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function ServicesList({ lang, t, services }: { lang: Lang; t: FindCareStrings; services: string[] }) {
  if (!services.length) return null;
  return (
    <section aria-labelledby="services-title" className="flex flex-col gap-2.5">
      <h2 id="services-title" className="text-18 font-semibold">
        {t.profile.services}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {services.map((s) => (
          <li key={s} className="rounded-pill bg-cream px-3.25 py-1.75 text-13.5">
            {dataLabel(lang, s)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DoctorOverview({ lang, t, profile }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile }) {
  return (
    <>
      <FactsGrid facts={doctorFacts(lang, t, profile)} />
      <ServicesList lang={lang} t={t} services={profile.services} />
    </>
  );
}

/** The hours source line: green when confirmed, grey for sample or unverified hours. */
export function hoursSourceStamp(lang: Lang, t: FindCareStrings, profile: ProviderProfile): { text: string; verified: boolean } | null {
  const h = profile.hours;
  if (!h.source) return null;
  const verified = !/sample|not yet verified/i.test(h.source);
  return { text: h.checkedAt ? fmt(t.hours.confirmedBy, { source: h.source, date: formatDate(lang, h.checkedAt) }) : h.source, verified };
}

function DoctorTimings({ lang, t, profile }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile }) {
  const h = profile.hours;
  const stamp = hoursSourceStamp(lang, t, profile);
  return (
    <>
      {h.underRecheck && (
        <Callout tone="warning" title={t.hours.underRecheck}>
          <p>{t.hours.underRecheckBody}</p>
        </Callout>
      )}
      {h.days ? (
        <ProfileHoursTable
          slug={profile.slug}
          days={h.days}
          t={t}
          header={
            <div className="flex flex-wrap justify-between gap-2.5 bg-cream px-4.5 py-4">
              <span className="font-semibold">{h.practiceLabel ?? profile.name}</span>
              {stamp && <Stamp tone={stamp.verified ? "success" : "subtle"}>{stamp.text}</Stamp>}
            </div>
          }
        />
      ) : (
        <p className="rounded-20 bg-cream p-4.5 text-14 font-light text-muted">{t.hours.notVerified}</p>
      )}
      <p className="text-13 font-light text-muted">{t.hours.appointments}</p>
      {profile.practicesAt.length > 0 && (
        <section aria-labelledby="practices-title" className="flex flex-col gap-2.5">
          <h2 id="practices-title" className="text-18 font-semibold">
            {t.profile.factLabels.affiliations}
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.75rem),1fr))] gap-2.5">
            {profile.practicesAt.map((a) => (
              <li key={a.slug}>
                <Link
                  href={routes.provider(lang, a.profileKind, a.slug)}
                  className="flex flex-col gap-1 rounded-16 border border-line bg-white p-3.5 text-ink hover:text-ink hover:ring-2 hover:ring-teal"
                >
                  <span className="text-14.5 font-semibold">{a.name}</span>
                  {(a.department || a.days) && <span className="text-12.5 font-light text-muted">{[a.department ? dataLabel(lang, a.department) : null, a.days].filter(Boolean).join(" · ")}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

async function DoctorReviews({ lang, t, profile }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile }) {
  const [reviews, neighbours, discussions] = await Promise.all([getProviderReviews(profile.slug), getNeighbourSummary(profile.slug), getProviderDiscussions(profile.slug, 1)]);
  const stats = profile.reviewStats;
  const list = profile.topLists[0] ?? null;
  const threadHref = discussions[0] ? routes.thread(lang, discussions[0].id) : routes.community(lang, profile.localitySlug ? { locality: profile.localitySlug } : undefined);
  const signInHref = routes.account(lang, { next: withParams(routes.doctor(lang, profile.slug), { tab: "reviews" }) });
  return (
    <>
      {stats && <MentionsBlock lang={lang} t={t} total={stats.total} mentions={stats.mentions} families={profile.specialty?.slug === "paediatrics"} />}
      {(list || neighbours) && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16.25rem),1fr))] items-start gap-2.5">
          {list && <RankCard lang={lang} t={t} kind="doctor" slug={profile.slug} list={list} />}
          {neighbours && <NeighbourBlock lang={lang} t={t} kind="doctor" slug={profile.slug} summary={neighbours} threadHref={threadHref} />}
        </div>
      )}
      {reviews && reviews.reviews.length > 0 ? (
        reviews.reviews.map((r) => (
          <ReviewCard key={r.ref} lang={lang} t={t} review={r} kind="doctor" slug={profile.slug} replyLabel={t.reviews.replyClinic} showDepartment={false} signInHref={signInHref} />
        ))
      ) : (
        <NoReviews t={t} />
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <ButtonLink href={routes.review(lang, "doctor", profile.slug)} variant="dark" size="md">
          {t.reviews.write}
        </ButtonLink>
        <Link href={routes.providerReviews(lang, "doctor", profile.slug)} className="inline-flex min-h-11 items-center text-14 font-medium">
          {t.profile.allReviews}
        </Link>
      </div>
    </>
  );
}
