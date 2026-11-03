// One story from The Gurgaon Health Report (/gurgaon/news/[slug]). The prototype has no article
// screen: this follows the guide article's layout (cream header band, 880px column) with the news
// list's label, category, date and source line. Sponsored announcements sit in a SponsoredBox.

import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { SponsoredBox } from "@/components/ui/sponsored-box";
import { JsonLd } from "@/components/ui/json-ld";
import type { ArticleCard, ArticleDetail } from "@/lib/data/content";
import { fmt, formatDate, getDictionary, isoDate, type Lang } from "@/lib/i18n";
import { contentTrustStrings, ctDataLabel } from "@/lib/i18n/areas/content-trust";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { ArticleLabelPill, dataLang } from "./bits";

export function ArticleView({ lang, article: a, more }: { lang: Lang; article: ArticleDetail; more: ArticleCard[] }) {
  const t = contentTrustStrings(lang);
  const dict = getDictionary(lang);
  const sponsored = a.label === "sponsored";
  const url = `${SITE_URL}${routes.article(lang, a.slug)}`;
  const body = (
    <>
      {a.body.length > 0 ? (
        <div lang={dataLang(lang)} className="flex flex-col gap-4">
          {a.body.map((p, i) => (
            <p key={i} className="text-17 leading-[1.7] font-light text-ink-soft">
              {p}
            </p>
          ))}
        </div>
      ) : (
        <p className="rounded-18 bg-cream px-4.5 py-4 text-14.5 leading-[1.6] font-light text-muted">{t.article.noBody}</p>
      )}
    </>
  );
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": sponsored ? "Article" : "NewsArticle",
            headline: a.title,
            description: a.dek,
            datePublished: a.publishedAt,
            inLanguage: "en-IN",
            mainEntityOfPage: url,
            author: a.authorName ? { "@type": "Person", name: a.authorName } : { "@type": "Organization", name: "HealthGurgaon" },
            publisher: { "@type": "Organization", name: "HealthGurgaon" },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home, item: `${SITE_URL}${routes.home(lang)}` },
              { "@type": "ListItem", position: 2, name: dict.pages.news.title, item: `${SITE_URL}${routes.news(lang)}` },
              { "@type": "ListItem", position: 3, name: a.title, item: url },
            ],
          },
        ]}
      />
      <div className="bg-cream">
        <div className="mx-auto flex w-full max-w-[55rem] flex-col gap-3.5 px-6 pt-6 pb-9">
          <Breadcrumbs lang={lang} items={[{ label: dict.pages.news.title, href: routes.news(lang) }, { label: ctDataLabel(t, a.category) }]} />
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <ArticleLabelPill label={a.label}>{t.labels[a.label]}</ArticleLabelPill>
            <span className="font-mono text-10.5 font-medium text-teal">{ctDataLabel(t, a.category)}</span>
            <time dateTime={isoDate(a.publishedAt)} className="font-mono text-10.5 text-subtle uppercase">
              {formatDate(lang, a.publishedAt)}
            </time>
          </div>
          <h1 lang={dataLang(lang)} className="text-32 leading-[1.08] font-bold tracking-display text-balance sm:text-[2.625rem]">
            {a.title}
          </h1>
          <p lang={dataLang(lang)} className="text-17 leading-[1.55] font-light text-muted">
            {a.dek}
          </p>
          {!sponsored && (
            <div className="flex flex-wrap items-center gap-3.5 rounded-18 bg-white px-4 py-3.5">
              <span aria-hidden="true" className="flex size-10.5 flex-none items-center justify-center rounded-full bg-success-tint font-bold text-success">
                ✓
              </span>
              <div className="flex min-w-[13.75rem] flex-1 flex-col gap-0.5">
                <span className="text-14 font-medium">{t.article.sources}</span>
                <span lang={dataLang(lang)} className="text-12.5 font-light text-subtle">
                  {a.sourceNote}
                </span>
                <span className="text-12.5 font-light text-subtle">
                  {a.authorName ? fmt(t.article.by, { name: a.authorName }) : t.article.byDesk} · {fmt(t.article.published, { date: formatDate(lang, a.publishedAt) })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[55rem] flex-col gap-5.5 px-6 pt-7 pb-14">
        {a.label === "opinion" && <p className="rounded-18 bg-saffron-soft/50 px-4.5 py-3.5 text-14 leading-[1.55]">{t.article.opinionNote}</p>}
        {sponsored ? (
          <SponsoredBox lang={lang} label={t.article.sponsoredLabel}>
            <p className="text-13.5 leading-[1.55] font-light text-muted">{fmt(t.article.sponsoredBy, { name: a.sponsorName ?? "—" })}</p>
            {body}
          </SponsoredBox>
        ) : (
          body
        )}
        {a.corrections.length > 0 && (
          <section aria-labelledby="article-corrections" className="flex flex-col gap-2 rounded-20 border border-line p-5">
            <h2 id="article-corrections" className="font-semibold">
              {t.article.correctionsTitle}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {a.corrections.map((c) => (
                <li key={c.on + c.text} className="text-13.5 leading-[1.55] font-light text-muted">
                  <time dateTime={isoDate(c.on)}>{formatDate(lang, c.on)}</time>: <span lang={dataLang(lang)}>{c.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="flex flex-col gap-2 border-t border-line pt-4.5">
          <Disclaimer lang={lang} kinds={["medical"]} />
          <ButtonLink href={routes.report(lang, "article", a.slug)} variant="outline" size="sm" className="self-start">
            {t.article.suggest}
          </ButtonLink>
        </div>
        {more.length > 0 && (
          <section aria-labelledby="more-news" className="flex flex-col gap-3 border-t border-line pt-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="more-news" className="text-22 font-semibold tracking-h3">
                {t.article.more}
              </h2>
              <Link href={routes.news(lang)} className="inline-flex min-h-11 items-center text-14 font-medium">
                {t.article.allNews}
              </Link>
            </div>
            <ul className="flex flex-col">
              {more.map((m) => (
                <li key={m.slug} className="border-t border-line">
                  <Link href={routes.article(lang, m.slug)} className="flex flex-col gap-1 py-3.5 text-ink hover:text-teal">
                    <span className="flex flex-wrap items-center gap-2.5">
                      <ArticleLabelPill label={m.label}>{t.labels[m.label]}</ArticleLabelPill>
                      <time dateTime={isoDate(m.publishedAt)} className="font-mono text-10.5 text-subtle uppercase">
                        {formatDate(lang, m.publishedAt)}
                      </time>
                    </span>
                    <span lang={dataLang(lang)} className="text-16 leading-[1.35] font-semibold">
                      {m.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
