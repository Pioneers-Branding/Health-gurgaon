// The Gurgaon Health Report (/gurgaon/news). Prototype: "Health Gurgaon Content and Trust.dc.html"
// #news. The whole list (All) is in the static shell; the label filter (?category=) is applied
// under <Suspense>. Sponsored announcements are kept apart from the reporting, in a SponsoredBox.

import Link from "next/link";
import { Suspense } from "react";

import { ChipLink } from "@/components/ui/chip";
import { Container } from "@/components/ui/container";
import { WeeklyReportSignup } from "@/components/home/weekly-report-signup";
import { SponsoredBox } from "@/components/ui/sponsored-box";
import { JsonLd } from "@/components/ui/json-ld";
import { getArticles, getCorrections, getNewsUpdatedAt, type ArticleCard, type CorrectionRow } from "@/lib/data/content";
import { ARTICLE_LABELS } from "@/lib/domain";
import { fmt, formatDate, getDictionary, isoDate, type Lang } from "@/lib/i18n";
import { contentTrustStrings, ctDataLabel, type ContentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { weeklyReportLabels } from "@/lib/i18n/areas/home";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { ArticleLabelPill, dataLang, Stripes } from "./bits";

type Filter = (typeof ARTICLE_LABELS)[number] | null;

export async function NewsView({ lang, searchParams }: { lang: Lang; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = contentTrustStrings(lang);
  const dict = getDictionary(lang);
  const [articles, updatedAt, corrections] = await Promise.all([getArticles(), getNewsUpdatedAt(), getCorrections(1)]);
  return (
    <Container className="flex flex-col gap-5.5 pt-7 pb-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home, item: `${SITE_URL}${routes.home(lang)}` },
            { "@type": "ListItem", position: 2, name: dict.pages.news.title, item: `${SITE_URL}${routes.news(lang)}` },
          ],
        }}
      />
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-3 border-ink pb-3.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          {updatedAt && (
            <span className="mono-label text-11 text-teal">
              {fmt(t.news.kicker, { date: formatDate(lang, updatedAt) })}
            </span>
          )}
          <h1 className="text-36 leading-[1.05] font-bold tracking-display sm:text-44">{dict.pages.news.title}</h1>
        </div>
        <p className="max-w-[23.75rem] text-13.5 leading-normal font-light text-muted">
          {t.news.intro}{" "}
          <Link href={routes.trust(lang, "editorial")} className="font-normal">
            {t.news.editorialPolicy}
          </Link>
        </p>
      </div>
      <Suspense fallback={<NewsBody lang={lang} t={t} articles={articles} corrections={corrections} filter={null} />}>
        <FilteredNews lang={lang} t={t} articles={articles} corrections={corrections} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function FilteredNews({
  lang,
  t,
  articles,
  corrections,
  searchParams,
}: {
  lang: Lang;
  t: ContentTrustStrings;
  articles: ArticleCard[];
  corrections: CorrectionRow[];
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const filter = (ARTICLE_LABELS as readonly string[]).includes(raw ?? "") ? (raw as Filter) : null;
  return <NewsBody lang={lang} t={t} articles={articles} corrections={corrections} filter={filter} />;
}

function NewsBody({ lang, t, articles, corrections, filter }: { lang: Lang; t: ContentTrustStrings; articles: ArticleCard[]; corrections: CorrectionRow[]; filter: Filter }) {
  const editorial = articles.filter((a) => a.label !== "sponsored" && (!filter || a.label === filter));
  const sponsored = articles.filter((a) => a.label === "sponsored");
  const showSponsored = (!filter || filter === "sponsored") && sponsored.length > 0;
  const latest = corrections[0];
  return (
    <>
      <nav aria-label={t.news.filterLabel} className="flex flex-wrap gap-1.5">
        <ChipLink href={routes.news(lang)} selected={!filter}>
          {t.news.all}
        </ChipLink>
        {ARTICLE_LABELS.map((label) => (
          <ChipLink key={label} href={routes.news(lang, { category: label })} selected={filter === label}>
            {t.labels[label]}
          </ChipLink>
        ))}
      </nav>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-7">
        <div className="flex min-w-0 flex-col min-[836px]:col-span-2">
          {editorial.length > 0 ? (
            <ul className="flex flex-col">
              {editorial.map((a) => (
                <li key={a.slug}>
                  <ArticleRow lang={lang} t={t} article={a} />
                </li>
              ))}
            </ul>
          ) : (
            filter !== "sponsored" && <p className="border-b border-line py-4.5 text-14 font-light text-muted">{t.news.empty}</p>
          )}
          {showSponsored && (
            <SponsoredBox lang={lang} label={t.news.sponsoredBox} className="mt-5">
              <ul className="flex flex-col">
                {sponsored.map((a, i) => (
                  <li key={a.slug} className={i > 0 ? "border-t border-sponsored/40" : undefined}>
                    <ArticleRow lang={lang} t={t} article={a} inBox />
                  </li>
                ))}
              </ul>
              <p className="text-12.5 leading-normal font-light text-muted">{t.news.sponsoredNote}</p>
            </SponsoredBox>
          )}
        </div>
        <aside className="flex flex-col gap-3.5">
          <section aria-labelledby="weekly-title" className="on-dark flex flex-col gap-2.5 rounded-22 bg-ink p-5.5 text-cream">
            <span className="mono-label text-10.5 text-saffron">{t.news.weeklyKicker}</span>
            <h2 id="weekly-title" className="text-19 leading-[1.3] font-semibold">
              {t.news.weeklyTitle}
            </h2>
            <WeeklyReportSignup lang={lang} from="news" labels={weeklyReportLabels(lang)} tone="dark" />
          </section>
          {latest && (
            <section aria-labelledby="corrections-title" className="flex flex-col gap-2 rounded-22 border border-line p-5">
              <h2 id="corrections-title" className="font-semibold">
                {t.news.correctionsTitle}
              </h2>
              <p className="text-13 leading-[1.55] font-light text-muted">
                <time dateTime={isoDate(latest.on)}>{formatDate(lang, latest.on)}</time>: <span lang={dataLang(lang)}>{latest.text}</span>
              </p>
              <Link href={routes.trust(lang, "corrections")} className="inline-flex min-h-11 items-center self-start text-13 font-medium">
                {t.news.correctionsLink}
              </Link>
            </section>
          )}
          <section aria-labelledby="tip-title" className="flex flex-col gap-1.5 rounded-22 bg-cream p-5">
            <h2 id="tip-title" className="font-semibold">
              {t.news.tipTitle}
            </h2>
            <p className="text-13 leading-[1.55] font-light text-muted">{t.news.tipBody}</p>
          </section>
        </aside>
      </div>
    </>
  );
}

function ArticleRow({ lang, t, article: a, inBox = false }: { lang: Lang; t: ContentTrustStrings; article: ArticleCard; inBox?: boolean }) {
  return (
    <Link
      href={routes.article(lang, a.slug)}
      className={`group grid grid-cols-[minmax(0,1fr)_5.5rem] gap-4.5 py-4.5 text-ink hover:text-ink sm:grid-cols-[minmax(0,1fr)_8.75rem] ${inBox ? "" : "border-b border-line"}`}
    >
      <span className="flex min-w-0 flex-col gap-1.75">
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <ArticleLabelPill label={a.label}>{t.labels[a.label]}</ArticleLabelPill>
          <span className="font-mono text-10.5 font-medium text-teal">{ctDataLabel(t, a.category)}</span>
          <time dateTime={isoDate(a.publishedAt)} className="font-mono text-10.5 text-subtle uppercase">
            {formatDate(lang, a.publishedAt)}
          </time>
        </span>
        <span lang={dataLang(lang)} className="text-17 leading-[1.3] font-semibold tracking-title group-hover:text-teal sm:text-19">
          {a.title}
        </span>
        <span lang={dataLang(lang)} className="text-14 leading-[1.55] font-light text-muted">
          {a.dek}
        </span>
        <span lang={dataLang(lang)} className="text-12 font-light text-subtle">
          {a.sourceNote}
        </span>
      </span>
      <Stripes className="h-18 sm:h-24" />
    </Link>
  );
}
