// /gurgaon/doctors/[specialty] (prototype #specialty): explainer band with "when to see" and the
// emergency card, coverage by locality (?loc=), verified doctors, FAQs and related guides.

import Link from "next/link";
import { Suspense } from "react";

import { ArrowLink } from "@/components/ui/section-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { chipClasses } from "@/components/ui/chip";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/ui/json-ld";
import type { SpecialtyPage } from "@/lib/data/providers";
import { fmt, formatDate, formatNumber, getDictionary, type Lang } from "@/lib/i18n";
import { dataLabel, findCareStrings, specialtyNouns, specialtyTextHi, type FindCareStrings } from "@/lib/i18n/areas/find-care";
import { SITE_URL } from "@/lib/i18n/metadata";
import { localityName } from "@/lib/localities";
import { routes } from "@/lib/routes";

import { Stamp } from "./bits";
import { checkedAgo, kmLabel, splitEmergencyNote, withParams } from "./format";
import { languagesLabel, placeLabel } from "./provider-card";

type Raw = Record<string, string | string[] | undefined>;

export function specialtyTitle(lang: Lang, page: SpecialtyPage): string {
  const t = findCareStrings(lang);
  return fmt(t.specialty.h1, { plural: specialtyNouns(lang, page.specialty).plural });
}

export function SpecialtyView({ lang, page, searchParams }: { lang: Lang; page: SpecialtyPage; searchParams: Promise<Raw> }) {
  const t = findCareStrings(lang);
  const dict = getDictionary(lang);
  const s = page.specialty;
  const nouns = specialtyNouns(lang, s);
  const hi = specialtyTextHi(lang, s.slug);
  const title = specialtyTitle(lang, page);
  const summary = hi?.summary ?? s.summary ?? fmt(t.specialty.noExplainer, { plural: nouns.pluralLower });
  const whenToSee = hi?.whenToSee ?? s.whenToSee;
  const split = s.emergencyNote ? splitEmergencyNote(s.emergencyNote) : null;
  const emergency = hi
    ? { title: hi.emergencyTitle, body: hi.emergencyBody }
    : split ?? (s.emergencyNote ? { title: t.specialty.emergencyFallbackTitle, body: s.emergencyNote } : { title: t.specialty.emergencyFallbackTitle, body: t.specialty.emergencyFallbackBody });
  const faqs = hi?.faqs ?? page.faqs;
  const faqsInEnglish = !hi && lang === "hi";
  const href = routes.specialty(lang, s.slug);
  const specialtyName = dataLabel(lang, s.name);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home, item: `${SITE_URL}${routes.home(lang)}` },
              { "@type": "ListItem", position: 2, name: t.crumbs.doctors, item: `${SITE_URL}${routes.search(lang, { type: "doctor" })}` },
              { "@type": "ListItem", position: 3, name: specialtyName, item: `${SITE_URL}${href}` },
            ],
          },
          ...(faqs.length
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
                },
              ]
            : []),
        ]}
      />
      <div className="bg-cream">
        <Container className="grid gap-8 pt-8 pb-10 min-[916px]:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3.5">
            <Breadcrumbs lang={lang} items={[{ label: t.crumbs.doctors, href: routes.search(lang, { type: "doctor" }) }, { label: specialtyName }]} />
            <h1 className="text-36 leading-[1.05] font-bold tracking-display sm:text-44">{title}</h1>
            <p className="max-w-[35rem] text-16.5 leading-[1.6] font-light text-muted">{summary}</p>
            {s.reviewedBy && s.reviewedAt && (
              <p className="font-mono text-11.5 leading-normal text-subtle uppercase">
                {fmt(t.specialty.reviewed, { who: hi?.reviewedBy ?? s.reviewedBy, date: formatDate(lang, s.reviewedAt) })}
              </p>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            {whenToSee && (
              <section aria-labelledby="when-title" className="flex flex-col gap-2 rounded-20 bg-white p-5">
                <h2 id="when-title" className="text-16 font-semibold">
                  {fmt(t.specialty.whenToSee, { noun: nouns.nounLower })}
                </h2>
                <p className="text-14 leading-[1.6] font-light text-muted">{whenToSee}</p>
              </section>
            )}
            <section aria-labelledby="urgent-title" className="flex flex-col gap-2 rounded-20 border-2 border-emergency bg-white p-5">
              <h2 id="urgent-title" className="text-16 font-semibold text-emergency">
                {emergency.title}
              </h2>
              <p className="text-14 leading-[1.6] font-light text-muted">{emergency.body}</p>
              <Link href={routes.emergency(lang, "emergency-departments")} className="inline-flex min-h-11 items-center self-start text-13.5 font-medium">
                {t.specialty.emergencyLink}
              </Link>
            </section>
          </div>
        </Container>
      </div>
      <Container className="flex flex-col gap-7 pt-8 pb-14">
        <Suspense fallback={<Coverage lang={lang} t={t} page={page} selected={null} />}>
          <CoverageFromParams lang={lang} t={t} page={page} searchParams={searchParams} />
        </Suspense>
        <div className="grid gap-6 min-[916px]:grid-cols-2">
          {faqs.length > 0 && (
            <section aria-labelledby="faq-title" className="flex flex-col gap-1">
              <h2 id="faq-title" className="mb-2 text-18 font-semibold">
                {t.specialty.faqs}
              </h2>
              {faqs.map((f, i) => (
                <details key={f.q} open={i === 0} className="group border-t border-line">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-4 text-15 font-medium [&::-webkit-details-marker]:hidden">
                    <span lang={faqsInEnglish ? "en" : undefined}>{f.q}</span>
                    <span aria-hidden="true" className="text-teal">
                      <span className="group-open:hidden">+</span>
                      <span className="hidden group-open:inline">−</span>
                    </span>
                  </summary>
                  <p lang={faqsInEnglish ? "en" : undefined} className="mb-4 text-14 leading-[1.6] font-light text-muted">
                    {f.a}
                  </p>
                </details>
              ))}
            </section>
          )}
          {page.relatedGuides.length > 0 && (
            <section aria-labelledby="guides-title" className="flex flex-col gap-2.5">
              <h2 id="guides-title" className="text-18 font-semibold">
                {t.specialty.guides}
              </h2>
              {page.relatedGuides.map((g) => (
                <Link key={g.slug} href={routes.guide(lang, g.slug)} className="rounded-18 bg-cream p-4.5 font-medium text-ink hover:text-ink hover:ring-2 hover:ring-teal">
                  <span lang="en">{g.title}</span> <span aria-hidden="true">→</span>
                </Link>
              ))}
            </section>
          )}
        </div>
      </Container>
    </>
  );
}

async function CoverageFromParams({ lang, t, page, searchParams }: { lang: Lang; t: FindCareStrings; page: SpecialtyPage; searchParams: Promise<Raw> }) {
  const raw = await searchParams;
  const v = Array.isArray(raw.loc) ? raw.loc[0] : raw.loc;
  const selected = v && page.coverage.some((c) => c.slug === v) ? v : null;
  return <Coverage lang={lang} t={t} page={page} selected={selected} />;
}

function Coverage({ lang, t, page, selected }: { lang: Lang; t: FindCareStrings; page: SpecialtyPage; selected: string | null }) {
  const nouns = specialtyNouns(lang, page.specialty);
  const href = routes.specialty(lang, page.specialty.slug);
  const shown = page.coverage.filter((c) => c.live || c.count > 0 || c.slug === selected);
  const doctors = selected ? page.doctors.filter((d) => d.localitySlug === selected) : page.doctors;
  const placeName = selected ? localityName(selected, lang) : t.allGurugram;
  return (
    <>
      <section aria-labelledby="coverage-title" className="flex flex-col gap-3">
        <h2 id="coverage-title" className="text-18 font-semibold">
          {t.specialty.coverage}
        </h2>
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link href={href} scroll={false} aria-current={!selected ? "true" : undefined} className={chipClasses(!selected)}>
              {fmt(t.specialty.chip, { name: t.specialty.all, count: formatNumber(lang, page.doctors.length) })}
            </Link>
          </li>
          {shown.map((c) => (
            <li key={c.slug}>
              <Link href={withParams(href, { loc: c.slug })} scroll={false} aria-current={selected === c.slug ? "true" : undefined} className={chipClasses(selected === c.slug)}>
                {fmt(t.specialty.chip, { name: localityName(c.slug, lang), count: formatNumber(lang, c.count) })}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-12.5 font-light text-subtle">{fmt(t.specialty.coverageNote, { plural: nouns.pluralLower })}</p>
      </section>
      {doctors.length > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.875rem),1fr))] gap-3">
          {doctors.map((d) => {
            const place = placeLabel(lang, d);
            const km = kmLabel(lang, t.km, d.distanceKm);
            const checked = checkedAgo(t.card, d.checkedDaysAgo);
            return (
              <li key={d.slug}>
                <Link
                  href={routes.provider(lang, d.profileKind, d.slug)}
                  className="flex h-full flex-col gap-2 rounded-20 border border-line bg-white p-4.5 text-ink hover:text-ink hover:ring-2 hover:ring-teal"
                >
                  <span className="text-16 font-semibold">{d.name}</span>
                  {(place || km) && <span className="text-13 font-light text-muted">{[place, km].filter(Boolean).join(" · ")}</span>}
                  {d.languages.length > 0 && <span className="text-13 font-light text-muted">{languagesLabel(t, d.languages)}</span>}
                  {checked && (
                    <Stamp size="10.5" tone="success">
                      ✓ {checked}
                    </Stamp>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col gap-2 rounded-24 bg-cream p-6">
          <p className="text-18 font-semibold">{fmt(t.specialty.none, { plural: nouns.pluralLower, place: placeName })}</p>
          <p className="text-14.5 font-light text-muted">{t.specialty.noneBody}</p>
          <ArrowLink href={routes.search(lang, { q: page.specialty.doctorNoun })} size="sm">
            {fmt(t.specialty.searchAll, { plural: nouns.pluralLower })}
          </ArrowLink>
        </div>
      )}
    </>
  );
}
