// Locality page. Prototype: "Health Gurgaon Local and Events.dc.html" #locality ("Healthcare on
// Sohna Road"). Unknown slugs are real 404s (known slugs are prerendered); localities that aren't
// "live" yet are noindex and show the "Not enough verified information yet" state (the plan:
// "only indexed when content is sufficient").
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isRoadLocality } from "@/components/local-events/format";
import { LocalityView } from "@/components/local-events/locality-view";
import { getLocalityPage } from "@/lib/data/localities";
import { getNeighbourCounts, getNeighbourRanking } from "@/lib/data/neighbours";
import { fmt, getDictionary, localityName } from "@/lib/i18n";
import { localEventsStrings } from "@/lib/i18n/areas/local-events";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { LOCALITIES } from "@/lib/localities";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/[locality]">;

export function generateStaticParams() {
  return LOCALITIES.map((l) => ({ locality: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const page = await getLocalityPage((await params).locality);
  if (!page) notFound();
  const t = localEventsStrings(lang);
  const d = getDictionary(lang).pages.locality;
  const name = localityName(lang, page.locality);
  return pageMetadata({
    lang,
    href: (l) => routes.locality(l, page.locality.slug),
    title: fmt(isRoadLocality(page.locality.name) ? t.locality.titleRoad : t.locality.titleArea, { name }),
    description: fmt(d.description, { name }),
    noindex: !page.indexable,
  });
}

export default async function LocalityPage({ params }: Props) {
  const lang = await getLang();
  const page = await getLocalityPage((await params).locality);
  if (!page) notFound();
  const slugs = page.featuredHospitals.map((h) => h.provider.slug);
  const [ranking, counts] = await Promise.all([getNeighbourRanking(page.locality.slug, "paediatrics"), getNeighbourCounts(slugs)]);
  return <LocalityView lang={lang} t={localEventsStrings(lang)} page={page} neighbours={ranking.rows} neighbourCounts={counts} />;
}
