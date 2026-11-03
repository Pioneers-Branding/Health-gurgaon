// Hospitals & care centres. Prototype: "Health Gurgaon Top Lists and Stories.dc.html" #facilities.
// Every facility renders into the static shell (the Suspense fallback is the unfiltered
// directory); the ownership and type filters (?ownership=&type=, routes.facilities) apply under
// <Suspense>. The filter cards are plain links.
import type { Metadata } from "next";
import { Suspense } from "react";

import { FacilitiesBody, FacilitiesHeader } from "@/components/top-lists/facilities-view";
import { parseFacilityFilters } from "@/components/top-lists/format";
import { getFacilityCatalogue, type FacilityCatalogue } from "@/lib/data/top-lists";
import { getDictionary, type Lang } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/facilities">;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.facilities;
  return pageMetadata({ lang, href: (l) => routes.facilities(l), title: t.title, description: t.description });
}

export default async function FacilitiesPage({ searchParams }: Props) {
  const lang = await getLang();
  const catalogue = await getFacilityCatalogue();
  return (
    <>
      <FacilitiesHeader lang={lang} />
      <Suspense fallback={<FacilitiesBody lang={lang} catalogue={catalogue} filters={{ ownership: null, type: null }} />}>
        <BodyForRequest lang={lang} catalogue={catalogue} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BodyForRequest({ lang, catalogue, searchParams }: { lang: Lang; catalogue: FacilityCatalogue; searchParams: Props["searchParams"] }) {
  const filters = parseFacilityFilters(await searchParams, catalogue.types.map((t) => t.slug));
  return <FacilitiesBody lang={lang} catalogue={catalogue} filters={filters} />;
}
