// Pieces shared by the doctor, hospital, lab and pharmacy profiles and the reviews page
// (Server Components).

import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { ButtonAnchor, ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Disclaimer } from "@/components/ui/disclaimer";
import { isSaved } from "@/lib/data/account";
import type { NeighbourSummary } from "@/lib/data/neighbours";
import { getLiveHours, type ProviderProfile, type ReviewDTO } from "@/lib/data/providers";
import { fmt, formatDate, formatNumber, isoDate, type Lang } from "@/lib/i18n";
import { dataLabel, type FindCareStrings } from "@/lib/i18n/areas/find-care";
import { SITE_URL } from "@/lib/i18n/metadata";
import { localityName } from "@/lib/localities";
import { routes, type ProviderKind } from "@/lib/routes";

import { HoursTable, PhaseTag, Stamp } from "./bits";
import { directionsUrl, openStatusText, visitMonthLabel } from "./format";
import { HelpfulButton } from "./helpful-button";
import { SaveButton } from "./save-button";

/** Initials circle with the listing's own initials (56px on cards). */
export function Initials({ text, className }: { text: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex size-14 flex-none items-center justify-center rounded-full bg-cream text-16 font-semibold text-teal", className)}>
      {text}
    </span>
  );
}

/** Where a listing is: its locality in the page language, else the stored area. */
export function profilePlace(lang: Lang, p: { localitySlug: string | null; areaLabel: string | null }): string | null {
  return p.localitySlug ? localityName(p.localitySlug, lang) : p.areaLabel;
}

// ── Header actions ──────────────────────────────────────────────────────────

/** Save state needs the session: render it under <Suspense> with this as the fallback. */
export function ProfileSave({ lang, t, profile, size = "lg", initialSaved = false }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile; size?: "md" | "lg"; initialSaved?: boolean }) {
  return (
    <SaveButton
      lang={lang}
      slug={profile.slug}
      name={profile.name}
      size={size}
      initialSaved={initialSaved}
      signInHref={routes.account(lang, { next: routes.provider(lang, profile.profileKind, profile.slug) })}
      labels={{ save: t.card.save, saved: t.card.saved, saveLabel: t.card.saveLabel, signIn: t.card.signInToSave }}
      className="min-w-24"
    />
  );
}

async function ProfileSaveState(props: { lang: Lang; t: FindCareStrings; profile: ProviderProfile; size?: "md" | "lg" }) {
  const saved = await isSaved("provider", props.profile.slug);
  return <ProfileSave {...props} initialSaved={saved} />;
}

export function SaveForProfile(props: { lang: Lang; t: FindCareStrings; profile: ProviderProfile; size?: "md" | "lg" }) {
  return (
    <Suspense fallback={<ProfileSave {...props} />}>
      <ProfileSaveState {...props} />
    </Suspense>
  );
}

export function DirectionsLink({ t, profile, size = "lg" }: { t: FindCareStrings; profile: ProviderProfile; size?: "sm" | "lg" }) {
  return (
    <ButtonAnchor
      href={directionsUrl([profile.hours.practiceLabel ?? profile.name, profile.addressLine ?? profile.areaLabel])}
      target="_blank"
      rel="noopener noreferrer"
      variant="outline"
      size={size}
      aria-label={t.profile.directionsLabel.replace("{name}", profile.name)}
    >
      {t.profile.directions}
    </ButtonAnchor>
  );
}

// ── Opening hours (request-time "today" and "open now") ─────────────────────

async function LiveHoursTable({ slug, days, t, header }: { slug: string; days: { day: number; text: string }[]; t: FindCareStrings; header?: ReactNode }) {
  const live = await getLiveHours(slug);
  return <HoursTable days={days} today={live?.today ?? null} t={t} header={header} />;
}

/** The weekly table; today's row is highlighted once the request time is known. */
export function ProfileHoursTable({ slug, days, t, header }: { slug: string; days: { day: number; text: string }[]; t: FindCareStrings; header?: ReactNode }) {
  return (
    <Suspense fallback={<HoursTable days={days} today={null} t={t} header={header} />}>
      <LiveHoursTable slug={slug} days={days} t={t} header={header} />
    </Suspense>
  );
}

async function LiveOpenPill({ lang, slug, t }: { lang: Lang; slug: string; t: FindCareStrings }) {
  const live = await getLiveHours(slug);
  if (!live) return null;
  const s = openStatusText(lang, t.hours, t.weekdays, live.status);
  return (
    <p
      className={cn(
        "flex flex-col gap-0.5 rounded-18 px-4.5 py-3.5",
        s.state === "open" ? "bg-success-tint text-success" : s.state === "closed" ? "bg-cream text-caution" : "bg-cream text-subtle",
      )}
    >
      <span className="text-18 font-bold">{s.label}</span>
      {s.detail && <span className="text-12.5 font-light">{s.detail}</span>}
    </p>
  );
}

/** "Open now · Closes 8 pm today" (lab and pharmacy headers). */
export function OpenNowPill({ lang, slug, t }: { lang: Lang; slug: string; t: FindCareStrings }) {
  return (
    <Suspense fallback={<span aria-hidden="true" className="block h-17 w-40 animate-pulse rounded-18 bg-cream" />}>
      <LiveOpenPill lang={lang} slug={slug} t={t} />
    </Suspense>
  );
}

// ── Aside: correction, claim, small print ───────────────────────────────────

export function ProfileAside({ lang, t, profile, kind, children }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile; kind: ProviderKind; children?: ReactNode }) {
  return (
    <aside className="flex flex-col gap-3">
      {children}
      <section aria-labelledby="wrong-title" className="flex flex-col gap-2 rounded-20 border-[1.5px] border-line p-4.5">
        <h2 id="wrong-title" className="font-semibold">
          {t.profile.wrongTitle}
        </h2>
        <p className="text-13.5 leading-normal font-light text-muted">{t.profile.wrongBody}</p>
        <ButtonLink href={routes.report(lang, kind, profile.slug)} variant="outline" size="sm" className="self-start">
          {t.profile.suggestCorrection}
        </ButtonLink>
      </section>
      {profile.claimed ? (
        <p className="rounded-20 bg-cream p-4.5 text-13.5 leading-normal font-light text-muted">{t.profile.claimed}</p>
      ) : (
        <section aria-labelledby="claim-title" className="flex flex-col gap-2 rounded-20 bg-cream p-4.5">
          <h2 id="claim-title" className="font-semibold">
            {fmt(t.profile.claimTitle, { name: profile.name })}
          </h2>
          <p className="text-13.5 leading-normal font-light text-muted">{t.profile.claimBody}</p>
          <Link href={routes.claim(lang, kind, profile.slug)} className="inline-flex min-h-11 items-center self-start text-13.5 font-medium">
            {t.profile.claimCta}
          </Link>
        </section>
      )}
      <Disclaimer lang={lang} kinds={["medical", "listing"]} className="px-1" />
    </aside>
  );
}

// ── Reviews ─────────────────────────────────────────────────────────────────

/** "What patients' families mention (18 reviews)" with share bars. */
export function MentionsBlock({ lang, t, total, mentions, families }: { lang: Lang; t: FindCareStrings; total: number; mentions: { label: string; pct: number }[]; families: boolean }) {
  return (
    <section aria-labelledby="mentions-title" className="flex flex-col gap-3 rounded-20 bg-cream p-5">
      <h2 id="mentions-title" className="text-17 font-semibold">
        {fmt(families ? t.reviews.mentionsFamilies : t.reviews.mentions, { count: formatNumber(lang, total) })}
      </h2>
      {mentions.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11.25rem),1fr))] gap-2.5">
          {mentions.map((m) => (
            <li key={m.label} className="flex flex-col gap-1.5 rounded-14 bg-white p-3">
              <span className="text-13.5 font-medium">{dataLabel(lang, m.label)}</span>
              <span className="block h-1.5 overflow-hidden rounded-3 bg-line" aria-hidden="true">
                <span className="block h-full bg-teal" style={{ width: `${Math.max(0, Math.min(100, m.pct))}%` }} />
              </span>
              <span className="text-11.5 font-light text-subtle">{fmt(t.reviews.mentionPct, { pct: m.pct })}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-12 font-light text-subtle">{t.reviews.disclaimer}</p>
    </section>
  );
}

/** PHASE 2: "Ranked #1 of 10 · Top paediatricians in Gurugram → see the list". */
export function RankCard({ lang, t, kind, slug, list }: { lang: Lang; t: FindCareStrings; kind: ProviderKind; slug: string; list: { slug: string; title: string; rank: number; of: number } }) {
  return (
    <div className="flex flex-col gap-2 rounded-18 border-[1.5px] border-dashed border-phase px-4 py-3.5">
      <PhaseTag>{t.reviews.phase2}</PhaseTag>
      <p className="text-14 leading-normal">
        <b className="font-semibold">{fmt(t.reviews.ranked, { rank: list.rank, of: list.of })}</b> · {list.title}{" "}
        <Link href={routes.topList(lang, list.slug)} className="font-medium">
          {t.reviews.seeList}
        </Link>
      </p>
      <Link href={routes.dispute(lang, kind, slug, { target: "ranking", list: list.slug })} className="inline-flex min-h-11 items-center self-start text-12.5 font-medium">
        {t.reviews.disputeRanking}
      </Link>
    </div>
  );
}

/** PHASE 2B: "Recommended by N neighbours" (Neighbour Recommendation System, "On the doctor profile"). */
export function NeighbourBlock({
  lang,
  t,
  kind,
  slug,
  summary,
  threadHref,
}: {
  lang: Lang;
  t: FindCareStrings;
  kind: ProviderKind;
  slug: string;
  summary: NeighbourSummary;
  threadHref: string;
}) {
  const n = t.neighbours;
  const ranked = summary.status === "ranked";
  return (
    <section aria-labelledby="neighbours-title" className="flex flex-col gap-3 rounded-18 border-[1.5px] border-dashed border-phase px-4 py-4">
      <PhaseTag tone="soft">{t.reviews.phase2b}</PhaseTag>
      {ranked ? (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id="neighbours-title" className="inline-flex rounded-pill bg-success-tint px-3 py-1.25 text-13 font-semibold text-success">
              {summary.recommendedBy === 1 ? n.recommendedOne : fmt(n.recommended, { count: formatNumber(lang, summary.recommendedBy) })}
            </h2>
            {summary.rank && (
              <Stamp>
                {fmt(n.rank, {
                  rank: summary.rank.position,
                  place: localityName(summary.rank.localitySlug, lang),
                  specialty: dataLabel(lang, summary.rank.specialtyName),
                })}
              </Stamp>
            )}
          </div>
          {summary.themes.length > 0 && (
            <>
              <h3 className="text-15 font-semibold">{n.mention}</h3>
              <ul className="flex flex-wrap gap-1.5">
                {summary.themes.map((th) => (
                  <li key={th.label} className="rounded-pill bg-cream px-3 py-1.5 text-13">
                    {dataLabel(lang, th.label)} ({formatNumber(lang, th.count)})
                  </li>
                ))}
              </ul>
            </>
          )}
          {summary.quotes.map((q) => (
            <Link key={q.text} href={threadHref} className="flex flex-col gap-1 rounded-14 bg-cream px-3.5 py-3 text-ink hover:text-ink hover:ring-2 hover:ring-teal">
              <span lang="en" className="text-14 leading-[1.55] font-light">
                “{q.text}”
              </span>
              <span className="font-mono text-10.5 text-teal uppercase">
                {q.meta} {n.readThread}
              </span>
            </Link>
          ))}
          {summary.concernedResidents > 0 && (
            <p className="text-12.5 font-light text-muted">
              {fmt(summary.concernedResidents === 1 ? n.concernsOne : n.concerns, {
                count: formatNumber(lang, summary.concernedResidents),
                themes: summary.concerns.map((c) => dataLabel(lang, c.label).toLowerCase()).join(", "),
              })}
            </p>
          )}
        </>
      ) : (
        <>
          <h2 id="neighbours-title" className="text-15 font-semibold">
            {summary.status === "frozen" ? n.frozen : n.notEnough}
          </h2>
          <p className="text-13 leading-normal font-light text-muted">{n.notEnoughBody}</p>
        </>
      )}
      <p className="text-12 leading-normal font-light text-subtle">{n.basis}</p>
      <div className="flex flex-wrap gap-x-4">
        <Link href={threadHref} className="inline-flex min-h-11 items-center text-12.5 font-medium">
          {n.readThreads}
        </Link>
        <Link href={routes.neighbourRecommendations(lang)} className="inline-flex min-h-11 items-center text-12.5 font-medium">
          {n.howItWorks}
        </Link>
        <Link href={routes.dispute(lang, kind, slug, { target: "mention" })} className="inline-flex min-h-11 items-center text-12.5 font-medium">
          {n.dispute}
        </Link>
      </div>
    </section>
  );
}

/** PHASE 2: "Patient-experience score 86/100" with its four weighted parts. */
export function ExperienceScoreBlock({
  lang,
  t,
  kind,
  slug,
  score,
  total,
  subScores,
  list,
}: {
  lang: Lang;
  t: FindCareStrings;
  kind: ProviderKind;
  slug: string;
  score: number;
  total: number;
  subScores: { label: string; value: number; weight: number }[];
  list: { slug: string; title: string; rank: number } | null;
}) {
  return (
    <section aria-labelledby="score-title" className="flex flex-col gap-3.5 rounded-20 border-[1.5px] border-dashed border-phase p-4.5">
      <PhaseTag>{t.reviews.phase2}</PhaseTag>
      <p className="text-14.5 leading-[1.55]">
        <b id="score-title" className="font-semibold">
          {fmt(t.reviews.scoreLine, { score })}
        </b>{" "}
        · {fmt(t.reviews.verifiedReviews, { count: formatNumber(lang, total) })}
        {list && <> · {fmt(t.reviews.rankIn, { rank: list.rank, title: list.title })}</>} ·{" "}
        <Link href={list ? routes.topList(lang, list.slug) : routes.topLists(lang)} className="font-medium">
          {t.reviews.howCalculated}
        </Link>
      </p>
      {subScores.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10.625rem),1fr))] gap-3">
          {subScores.map((s) => (
            <li key={s.label} className="flex flex-col gap-1.5">
              <span className="flex justify-between gap-2 text-13">
                <span>{s.label}</span>
                <b className="font-semibold">{s.value}</b>
              </span>
              <span className="block h-1.5 overflow-hidden rounded-3 bg-line" aria-hidden="true">
                <span className="block h-full bg-teal" style={{ width: `${Math.max(0, Math.min(100, s.value))}%` }} />
              </span>
              <span className="font-mono text-10 text-subtle uppercase">{fmt(t.reviews.weight, { pct: s.weight })}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-12.5 leading-normal font-light text-subtle">
        {t.reviews.scoreNote}{" "}
        <Link href={routes.dispute(lang, kind, slug, { target: "ranking", list: list?.slug })} className="font-medium">
          {t.reviews.disputeIt}
        </Link>
      </p>
    </section>
  );
}

export function ReviewCard({
  lang,
  t,
  review,
  kind,
  slug,
  replyLabel,
  showDepartment,
  signInHref,
}: {
  lang: Lang;
  t: FindCareStrings;
  review: ReviewDTO;
  kind: ProviderKind;
  slug: string;
  replyLabel: string;
  showDepartment: boolean;
  signInHref: string;
}) {
  const date = visitMonthLabel(lang, review.visitMonth);
  return (
    <article className="flex flex-col gap-2.5 rounded-20 border border-line p-4.5">
      <div className="flex flex-wrap justify-between gap-2.5">
        <h3 className="font-semibold">{review.authorLabel}</h3>
        <Stamp caps={false}>
          {date}
          {showDepartment && review.department ? ` · ${dataLabel(lang, review.department)}` : ""}
        </Stamp>
      </div>
      {review.verificationTags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {review.verificationTags.map((tag) => (
            <li key={tag} className="rounded-pill bg-success-tint px-2.25 py-0.75 text-11.5 font-semibold text-success">
              {dataLabel(lang, tag)}
            </li>
          ))}
        </ul>
      )}
      <p lang="en" className="text-14.5 leading-[1.6] font-light">
        {review.text}
      </p>
      {review.providerReply && (
        <p className="rounded-14 bg-cream px-3.5 py-3 text-13.5 leading-[1.55] font-light">
          <b className="font-semibold">{replyLabel}</b> <span lang="en">{review.providerReply}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3.5">
        <HelpfulButton
          lang={lang}
          reviewRef={review.ref}
          slug={slug}
          count={review.helpfulCount}
          label={t.reviews.helpful}
          signInLabel={t.reviews.signInHelpful}
          signInHref={signInHref}
        />
        <Link href={routes.report(lang, kind, slug, { review: review.ref })} className="inline-flex min-h-11 items-center text-13 text-subtle hover:text-ink">
          {t.reviews.report}
        </Link>
      </div>
    </article>
  );
}

export function NoReviews({ t, message }: { t: FindCareStrings; message?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-20 bg-cream p-5">
      <p className="font-semibold">{message ?? t.reviews.none}</p>
      <p className="text-13.5 font-light text-muted">{t.reviews.noneBody}</p>
    </div>
  );
}

// ── Verification record ─────────────────────────────────────────────────────

export function VerificationLog({ lang, t, profile }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile }) {
  const rows = profile.verification.log;
  return (
    <div className="flex flex-col gap-4">
      {rows.length > 0 || profile.nextCheckAt ? (
        <ol className="overflow-hidden rounded-20 border border-line">
          {rows.map((r, i) => (
            <li key={`${r.field}-${i}`} className={cn("grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4.5 py-4", i > 0 && "border-t border-line")}>
              <div className="flex flex-col gap-0.75">
                <span className="font-medium">{r.what}</span>
                {r.how && <span className="text-13 font-light text-muted">{r.how}</span>}
              </div>
              {r.checkedAt ? (
                <time dateTime={isoDate(r.checkedAt)} className="font-mono text-11 whitespace-nowrap text-success uppercase">
                  {formatDate(lang, r.checkedAt)}
                </time>
              ) : (
                <span className="font-mono text-11 whitespace-nowrap text-subtle uppercase">{t.verify.result[r.result] ?? r.result}</span>
              )}
            </li>
          ))}
          {profile.nextCheckAt && (
            <li className={cn("grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4.5 py-4", rows.length > 0 && "border-t border-line")}>
              <div className="flex flex-col gap-0.75">
                <span className="font-medium">{t.verify.nextCheck}</span>
                <span className="text-13 font-light text-muted">{t.verify.nextCheckHow}</span>
              </div>
              <time dateTime={isoDate(profile.nextCheckAt)} className="font-mono text-11 whitespace-nowrap text-success uppercase">
                {formatDate(lang, profile.nextCheckAt, "monthYear")}
              </time>
            </li>
          )}
        </ol>
      ) : (
        <p className="rounded-20 bg-cream p-4.5 text-14 font-light text-muted">{t.verify.none}</p>
      )}
      <p className="text-13.5 leading-[1.6] font-light text-muted">
        {t.verify.note}{" "}
        <Link href={routes.trust(lang, "verification")} className="font-medium">
          {t.verify.how}
        </Link>
      </p>
    </div>
  );
}

// ── Structured data ─────────────────────────────────────────────────────────

const SCHEMA_TYPE: Record<string, string> = {
  doctor: "Physician",
  clinic: "MedicalClinic",
  hospital: "Hospital",
  emergency_dept: "Hospital",
  lab: "DiagnosticLab",
  pharmacy: "Pharmacy",
  blood_bank: "MedicalOrganization",
  home_care: "MedicalOrganization",
  ambulance: "MedicalOrganization",
};

/** Physician / MedicalClinic / Hospital / DiagnosticLab / Pharmacy JSON-LD, from shown facts only. */
export function profileJsonLd(lang: Lang, profile: ProviderProfile, crumbs: { name: string; href: string }[]): Record<string, unknown>[] {
  const url = `${SITE_URL}${routes.provider(lang, profile.profileKind, profile.slug)}`;
  const org: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE[profile.kind] ?? "MedicalOrganization",
    name: profile.name,
    url,
    address: {
      "@type": "PostalAddress",
      ...(profile.addressLine || profile.areaLabel ? { streetAddress: profile.addressLine ?? profile.areaLabel } : {}),
      addressLocality: "Gurugram",
      addressRegion: "Haryana",
      addressCountry: "IN",
    },
  };
  if (profile.languages.length) org.knowsLanguage = profile.languages;
  if (profile.specialty) org.medicalSpecialty = profile.specialty.name;
  if (profile.hours.open24h) org.openingHours = "Mo-Su 00:00-23:59";
  return [
    org,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE_URL}${c.href}` })),
    },
  ];
}
