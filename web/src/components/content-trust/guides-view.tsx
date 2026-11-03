// The guide library (/gurgaon/guides). The prototype has no library screen: this uses the
// Homepage's guide cards ("Local health guides", cream cards with a kicker, title and review line).

import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/ui/json-ld";
import type { GuideCard } from "@/lib/data/content";
import { fmt, formatDate, getDictionary, type Lang } from "@/lib/i18n";
import { contentTrustStrings, ctDataLabel, type ContentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { dataLang } from "./bits";

export function GuidesView({ lang, guides }: { lang: Lang; guides: GuideCard[] }) {
  const t = contentTrustStrings(lang);
  const dict = getDictionary(lang);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home, item: `${SITE_URL}${routes.home(lang)}` },
            { "@type": "ListItem", position: 2, name: dict.pages.guides.title, item: `${SITE_URL}${routes.guides(lang)}` },
          ],
        }}
      />
      <div className="border-b border-line bg-cream">
        <Container className="flex flex-col gap-3.5 pt-4 pb-9">
          <Breadcrumbs lang={lang} items={[{ label: dict.pages.guides.title }]} />
          <h1 className="text-36 leading-[1.05] font-bold tracking-display sm:text-44">{dict.pages.guides.title}</h1>
          <p className="max-w-[40rem] text-16 leading-[1.6] font-light text-muted">{t.guides.intro}</p>
        </Container>
      </div>
      <Container className="flex flex-col gap-5.5 pt-8 pb-14">
        <p className="rounded-18 bg-emergency-tint px-4.5 py-3.5 text-14 leading-[1.55]">{t.guides.emergency}</p>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-3.5">
          {guides.map((g) => (
            <li key={g.slug} className="flex">
              <GuideCardLink lang={lang} t={t} guide={g} />
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}

/** A cream guide card: kicker, title, "Reviewed by … · Updated Oct 2026". */
export function GuideCardLink({ lang, t, guide: g }: { lang: Lang; t: ContentTrustStrings; guide: GuideCard }) {
  const meta = [g.reviewNote ? ctDataLabel(t, g.reviewNote) : null, fmt(t.guides.updated, { date: formatDate(lang, g.updatedAt, "monthYear") })].filter(Boolean).join(" · ");
  return (
    <Link href={routes.guide(lang, g.slug)} className="flex min-h-47.5 w-full flex-col gap-2.5 rounded-22 bg-cream p-5.5 text-ink hover:bg-cream-deep hover:text-ink">
      <span className="mono-label text-10.5 text-teal">{ctDataLabel(t, g.tag)}</span>
      <span lang={dataLang(lang)} className="text-19 leading-[1.3] font-semibold tracking-title text-pretty">
        {g.title}
      </span>
      <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-12.5 font-light text-subtle">
        <span>{meta}</span>
        {!g.hasContent && <span className="rounded-pill border border-dashed border-phase px-2 py-0.5 text-11.5 font-normal text-muted">{t.guides.inProgress}</span>}
      </span>
    </Link>
  );
}
