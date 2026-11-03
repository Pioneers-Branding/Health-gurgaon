// /trust/disputes: the public log of dispute outcomes (the dispute screen's "Recent dispute
// outcomes", on its own page), with how disputes work and where to raise one.

import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/ui/json-ld";
import type { DisputeOutcome } from "@/lib/data/content";
import { getDictionary, type Lang } from "@/lib/i18n";
import { contentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { PhaseTag } from "./bits";
import { DisputesLog } from "./disputes-log";

export function DisputesView({ lang, outcomes }: { lang: Lang; outcomes: DisputeOutcome[] }) {
  const t = contentTrustStrings(lang);
  const dict = getDictionary(lang);
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-5 px-6 pt-4 pb-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home, item: `${SITE_URL}${routes.home(lang)}` },
            { "@type": "ListItem", position: 2, name: dict.pages.trust.title, item: `${SITE_URL}${routes.trust(lang)}` },
            { "@type": "ListItem", position: 3, name: dict.pages.disputes.title, item: `${SITE_URL}${routes.disputes(lang)}` },
          ],
        }}
      />
      <Breadcrumbs lang={lang} items={[{ label: dict.pages.trust.title, href: routes.trust(lang) }, { label: dict.pages.disputes.title }]} />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="mono-label text-10.5 text-teal">{t.disputes.kicker}</span>
          <PhaseTag>{t.common.phase2}</PhaseTag>
        </div>
        <h1 className="text-30 leading-[1.1] font-bold tracking-h1 text-balance sm:text-36">{dict.pages.disputes.title}</h1>
        <p className="text-15 leading-[1.55] font-light text-muted">{t.disputes.how}</p>
      </div>
      <section aria-labelledby="outcomes-title" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="outcomes-title" className="text-22 font-semibold tracking-title">
            {t.disputes.title}
          </h2>
          <p className="text-14 leading-[1.55] font-light text-muted">{t.disputes.intro}</p>
        </div>
        <DisputesLog lang={lang} t={t} outcomes={outcomes} />
      </section>
      <div className="flex flex-col gap-1.5 rounded-18 bg-cream px-4.5 py-4">
        <p className="text-14 leading-[1.55] font-light text-muted">{t.disputes.raise}</p>
        <div className="flex flex-wrap gap-x-5">
          <Link href={routes.topLists(lang)} className="inline-flex min-h-11 items-center text-13.5 font-medium">
            {t.disputes.topLists}
          </Link>
          <Link href={routes.trust(lang, "reviews")} className="inline-flex min-h-11 items-center text-13.5 font-medium">
            {t.disputes.reviewPolicy}
          </Link>
        </div>
      </div>
    </div>
  );
}
