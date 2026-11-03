// A guide (/gurgaon/guides/[slug]). Prototype: "Health Gurgaon Content and Trust.dc.html" #guide.
// Guides whose text isn't written yet (only their card exists) show who will review them and
// point to search and the other guides; those pages are noindex.

import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/ui/json-ld";
import type { GuideCard, GuideDetail } from "@/lib/data/content";
import { fmt, formatDate, getDictionary, type Lang } from "@/lib/i18n";
import { contentTrustStrings, ctDataLabel } from "@/lib/i18n/areas/content-trust";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { dataLang } from "./bits";
import { GuideBody } from "./guide-body";
import { GuideFooter } from "./guide-footer";
import { GuideCardLink } from "./guides-view";

export function GuideView({ lang, guide: g, others }: { lang: Lang; guide: GuideDetail; others: GuideCard[] }) {
  const t = contentTrustStrings(lang);
  const dict = getDictionary(lang);
  const url = `${SITE_URL}${routes.guide(lang, g.slug)}`;
  const tg = t.guide;
  const emergency = g.emergencyNote
    ? lang === "hi" || g.emergencyNote.startsWith("If it's an emergency")
      ? { lead: tg.emergencyLead, rest: lang === "hi" ? tg.emergencyRest : g.emergencyNote.replace(/^If it's an emergency\s*/, "") }
      : { lead: "", rest: g.emergencyNote }
    : null;
  const local = g.localNote;
  const localHref =
    local?.ctaKind === "search" ? routes.search(lang, { q: local.ctaQuery }) : local?.ctaKind === "emergency" ? routes.emergency(lang) : local?.ctaKind === "guide" ? routes.guides(lang) : null;
  const related = g.relatedGuides.length ? g.relatedGuides : others.filter((o) => o.slug !== g.slug).slice(0, 2);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.title,
            ...(g.summary ? { description: g.summary } : {}),
            dateModified: g.updatedAt,
            inLanguage: "en-IN",
            mainEntityOfPage: url,
            author: { "@type": "Organization", name: "HealthGurgaon" },
            publisher: { "@type": "Organization", name: "HealthGurgaon" },
            ...(g.reviewedBy ? { reviewedBy: { "@type": "Person", name: g.reviewedBy } } : {}),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home, item: `${SITE_URL}${routes.home(lang)}` },
              { "@type": "ListItem", position: 2, name: tg.guides, item: `${SITE_URL}${routes.guides(lang)}` },
              { "@type": "ListItem", position: 3, name: g.title, item: url },
            ],
          },
        ]}
      />
      <div className="bg-cream">
        <div className="mx-auto flex w-full max-w-[55rem] flex-col gap-3.5 px-6 pt-6 pb-9">
          <Breadcrumbs lang={lang} items={[{ label: tg.guides, href: routes.guides(lang) }, { label: ctDataLabel(t, g.category) }]} />
          <h1 lang={dataLang(lang)} className="text-32 leading-[1.08] font-bold tracking-display text-balance sm:text-[2.625rem]">
            {g.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3.5 rounded-18 bg-white px-4 py-3.5">
            <span aria-hidden="true" className="flex size-10.5 flex-none items-center justify-center rounded-full bg-success-tint font-bold text-success">
              ✓
            </span>
            <div className="flex min-w-[13.75rem] flex-1 flex-col gap-0.5">
              <span className="text-14 font-medium">
                {g.reviewedBy ? fmt(tg.reviewedBy, { name: g.reviewedBy }) : g.reviewNote ? ctDataLabel(t, g.reviewNote) : tg.notWritten}
              </span>
              <span className="text-12.5 font-light text-subtle">
                {[
                  g.writtenBy ? fmt(tg.writtenBy, { name: g.writtenBy }) : null,
                  fmt(tg.updated, { date: formatDate(lang, g.updatedAt) }),
                  g.nextReviewAt ? fmt(tg.nextReview, { date: formatDate(lang, g.nextReviewAt, "monthYear") }) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>
        </div>
      </div>
      <article className="mx-auto flex w-full max-w-[55rem] flex-col gap-5.5 px-6 pt-7 pb-14">
        {g.hasContent ? (
          <GuideBody
            sections={g.sections.map((s, i) => ({ id: `section-${i + 1}`, heading: s.heading, body: s.body }))}
            tocLabel={tg.toc}
            emergency={emergency}
            dataLang={dataLang(lang)}
          />
        ) : (
          <>
            <p className="rounded-18 bg-emergency-tint px-4.5 py-4 text-14.5 leading-[1.55]">{t.guides.emergency}</p>
            <div className="flex flex-col gap-2 rounded-20 bg-cream p-5">
              <h2 className="text-19 font-semibold">{tg.notWritten}</h2>
              <p className="text-14.5 leading-[1.6] font-light text-muted">{tg.notWrittenBody}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <ButtonLink href={routes.search(lang)} variant="dark" size="sm">
                  {dict.pages.search.title}
                </ButtonLink>
                <ButtonLink href={routes.guides(lang)} variant="outline" size="sm">
                  {tg.browse}
                </ButtonLink>
              </div>
            </div>
          </>
        )}
        {local && (
          <div className="flex flex-col gap-2.5 rounded-20 bg-cream p-5">
            <span className="mono-label text-10.5 text-teal">{tg.inGurugram}</span>
            <p lang={dataLang(lang)} className="text-15 leading-[1.65] font-light">
              {local.text}
            </p>
            {localHref && local.ctaLabel && (
              <Link href={localHref} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
                <span lang={dataLang(lang)}>{local.ctaLabel}</span>&nbsp;→
              </Link>
            )}
          </div>
        )}
        {(g.relatedSpecialties.length > 0 || related.length > 0) && (
          <section aria-labelledby="guide-related" className="flex flex-col gap-3">
            <h2 id="guide-related" className="mono-label text-10.5 text-subtle">
              {tg.related}
            </h2>
            {g.relatedSpecialties.length > 0 && (
              <ul className="flex flex-wrap gap-x-5">
                {g.relatedSpecialties.map((s) => (
                  <li key={s.slug}>
                    <Link href={routes.specialty(lang, s.slug)} className="inline-flex min-h-11 items-center text-14 font-medium">
                      {fmt(tg.relatedSpecialty, { noun: s.doctorNounPlural.toLowerCase() })}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {related.length > 0 && (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-3.5">
                {related.map((r) => (
                  <li key={r.slug} className="flex">
                    <GuideCardLink lang={lang} t={t} guide={r} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {g.hasContent ? (
          <GuideFooter
            lang={lang}
            slug={g.slug}
            title={g.title}
            labels={{
              useful: tg.useful,
              yes: tg.yes,
              notReally: tg.notReally,
              thanksYes: tg.thanksYes,
              thanksNo: tg.thanksNo,
              disclaimer: tg.disclaimer,
              suggest: tg.suggest,
              correctionTitle: tg.correctionTitle,
              correctionBody: tg.correctionBody,
              details: t.report.details,
              detailsPlaceholder: t.report.detailsPlaceholder,
              email: t.report.email,
              emailNote: t.report.emailNote,
              emailPlaceholder: t.forms.emailPlaceholder,
              send: t.report.send,
              sending: t.common.sending,
              doneTitle: t.report.doneTitle,
              doneBody: t.report.doneBody,
              errDetails: t.report.errDetails,
              emailInvalid: t.forms.emailInvalid,
              phoneWarning: t.forms.phoneWarningReport,
            }}
          />
        ) : (
          <p className="text-12.5 leading-[1.6] font-light text-subtle">{tg.disclaimer}</p>
        )}
      </article>
    </>
  );
}
