// The Trust centre (/trust). Prototype: "Health Gurgaon Content and Trust.dc.html" #trust: the
// hero, "Badges explained" (open/close without JavaScript), how lists are ordered, sponsorship,
// your data and the corrections log. The Website Plan's other trust pages (editorial policy,
// review policy, disputes) are sections here, with the anchors other pages link to:
// #verification #badges #editorial #sponsorship #reviews #privacy #corrections.

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { JsonLd } from "@/components/ui/json-ld";
import type { CorrectionRow } from "@/lib/data/content";
import { formatDate, getDictionary, isoDate, type Lang } from "@/lib/i18n";
import { contentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { dataLang, PolicyTiles } from "./bits";

const BADGE_TONES: Record<string, string> = {
  registration: "bg-success-tint text-success",
  facility: "bg-success-tint text-success",
  organiser: "bg-success-tint text-success",
  awaiting: "bg-pending-tint text-pending",
  sponsored: "bg-ink text-saffron",
};

const WRAP = "mx-auto w-full max-w-[68.75rem] px-6";

export function TrustView({ lang, corrections }: { lang: Lang; corrections: CorrectionRow[] }) {
  const t = contentTrustStrings(lang).trust;
  const dict = getDictionary(lang);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home, item: `${SITE_URL}${routes.home(lang)}` },
            { "@type": "ListItem", position: 2, name: dict.pages.trust.title, item: `${SITE_URL}${routes.trust(lang)}` },
          ],
        }}
      />
      <section id="verification" aria-labelledby="trust-title" className="on-dark bg-ink text-cream">
        <div className={cn(WRAP, "flex flex-col gap-3 py-10")}>
          <span className="mono-label text-11 text-saffron">{t.kicker}</span>
          <h1 id="trust-title" className="text-36 leading-[1.05] font-bold tracking-display text-balance sm:text-44">
            {t.title}
          </h1>
          <p className="max-w-[45rem] text-16.5 leading-[1.6] font-light text-on-dark">{t.intro}</p>
        </div>
      </section>
      <div className={cn(WRAP, "flex flex-col gap-8 pt-8 pb-14")}>
        <section id="badges" aria-labelledby="badges-title" className="flex flex-col gap-3">
          <h2 id="badges-title" className="text-22 font-semibold">
            {t.badgesTitle}
          </h2>
          {t.badges.map((b, i) => (
            <details key={b.key} open={i === 0} className="group overflow-hidden rounded-20 border border-line">
              <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3 bg-white px-4.5 py-4 [&::-webkit-details-marker]:hidden">
                <span className={cn("rounded-pill px-3 py-1.25 text-12.5 font-semibold whitespace-nowrap", BADGE_TONES[b.key])}>{b.name}</span>
                <span className="min-w-0 flex-1 basis-48 text-left text-14 font-light text-muted">{b.short}</span>
                <span aria-hidden="true" className="text-18 text-teal">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">−</span>
                </span>
              </summary>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.75rem),1fr))] gap-3.5 px-4.5 pb-4.5">
                <Fact label={t.how} tone="text-success">
                  {b.how}
                </Fact>
                <Fact label={t.not} tone="text-emergency">
                  {b.not}
                </Fact>
                <Fact label={t.when} tone="text-subtle">
                  {b.when}
                </Fact>
              </div>
            </details>
          ))}
        </section>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18.75rem),1fr))] gap-3.5">
          <PolicyCard id="ordering" title={t.listsTitle}>
            {t.listsBody}
          </PolicyCard>
          <PolicyCard id="sponsorship" title={t.sponsorshipTitle}>
            {t.sponsorshipBody}
          </PolicyCard>
          <PolicyCard
            id="privacy"
            title={t.dataTitle}
            link={
              <Link href={routes.accountConsent(lang)} className="inline-flex min-h-11 items-center self-start text-13.5 font-medium">
                {t.dataLink}
              </Link>
            }
          >
            {t.dataBody}
          </PolicyCard>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22.5rem),1fr))] items-start gap-3.5">
          <section id="editorial" aria-labelledby="editorial-title" className="flex flex-col gap-2.5 rounded-20 border border-line p-5">
            <h2 id="editorial-title" className="text-17 font-semibold">
              {t.editorialTitle}
            </h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-14 leading-[1.6] font-light text-muted marker:text-teal">
              {t.editorialBody.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <Link href={routes.news(lang)} className="inline-flex min-h-11 items-center self-start text-13.5 font-medium">
              {t.editorialLink}
            </Link>
          </section>
          <section id="reviews" aria-labelledby="reviews-title" className="flex flex-col gap-3 rounded-20 border border-line p-5">
            <h2 id="reviews-title" className="text-17 font-semibold">
              {t.reviewsTitle}
            </h2>
            <p className="text-14 leading-[1.6] font-light text-muted">{t.reviewsIntro}</p>
            <p className="text-14 font-medium">{t.removeTitle}</p>
            <PolicyTiles items={t.remove} />
            <p className="text-14 leading-[1.6] font-light text-muted">{t.reviewsReply}</p>
          </section>
        </div>

        <section aria-labelledby="disputes-title" className="flex flex-col gap-1.5 rounded-20 bg-cream p-5">
          <h2 id="disputes-title" className="text-17 font-semibold">
            {t.disputesTitle}
          </h2>
          <p className="max-w-[48rem] text-14 leading-[1.6] font-light text-muted">{t.disputesBody}</p>
          <div className="flex flex-wrap gap-x-5">
            <Link href={routes.disputes(lang)} className="inline-flex min-h-11 items-center text-13.5 font-medium">
              {t.disputesLink}
            </Link>
            <Link href={routes.neighbourRecommendations(lang)} className="inline-flex min-h-11 items-center text-13.5 font-medium">
              {t.neighbourLink}
            </Link>
          </div>
        </section>

        <section id="corrections" aria-labelledby="corrections-title" className="flex flex-col gap-3">
          <h2 id="corrections-title" className="text-22 font-semibold">
            {t.correctionsTitle}
          </h2>
          {corrections.length ? (
            <ul className="overflow-hidden rounded-20 border border-line">
              {corrections.map((c, i) => (
                <li
                  key={`${c.on}-${i}`}
                  className={cn(
                    "grid grid-cols-[6.875rem_minmax(0,1fr)] items-baseline gap-x-3.5 gap-y-1 px-4.5 py-3.25 text-14 sm:grid-cols-[6.875rem_minmax(0,1fr)_7.5rem]",
                    i > 0 && "border-t border-line",
                  )}
                >
                  <time dateTime={isoDate(c.on)} className="font-mono text-11 text-subtle uppercase">
                    {formatDate(lang, c.on)}
                  </time>
                  <span lang={dataLang(lang)} className="leading-normal font-light">
                    {c.text}
                  </span>
                  <span className="col-start-2 font-mono text-10.5 font-medium text-success uppercase sm:col-start-3">{t.correctionKinds[c.kind] ?? c.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-14 font-light text-muted">{t.correctionsEmpty}</p>
          )}
        </section>
      </div>
    </>
  );
}

function Fact({ label, tone, children }: { label: string; tone: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={cn("mono-label text-10.5", tone)}>{label}</span>
      <span className="text-13.5 leading-[1.55] font-light">{children}</span>
    </div>
  );
}

function PolicyCard({ id, title, link, children }: { id?: string; title: string; link?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-label={title} className="flex flex-col gap-2 rounded-20 bg-cream p-5">
      <h2 className="text-17 font-semibold">{title}</h2>
      <p className="text-14 leading-[1.6] font-light text-muted">{children}</p>
      {link}
    </section>
  );
}
