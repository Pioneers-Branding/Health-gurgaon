// Find care search. Prototype: "Health Gurgaon Find Care.dc.html" #results · #noresults.
// Everything below the breadcrumb depends on the URL (query, filters, sort, view, intent), so it
// renders under <Suspense>; the fallback keeps the page's shape and its one h1.
import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchBox, SearchView } from "@/components/find-care/search-view";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary, type Lang } from "@/lib/i18n";
import { findCareStrings } from "@/lib/i18n/areas/find-care";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/search">;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.search;
  return pageMetadata({ lang, href: (l) => routes.search(l), title: t.title, description: t.description });
}

export default async function SearchPage({ searchParams }: Props) {
  const lang = await getLang();
  const t = findCareStrings(lang);
  return (
    <Container className="flex flex-col gap-5 pt-6 pb-14">
      <Breadcrumbs lang={lang} items={[{ label: t.crumbs.search }]} />
      <Suspense fallback={<SearchFallback lang={lang} />}>
        <SearchView lang={lang} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

function SearchFallback({ lang }: { lang: Lang }) {
  const t = findCareStrings(lang);
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">{t.search.loading}</span>
      <SearchBox lang={lang} t={t} params={null} localityParam={null} intent={null} view="list" />
      <div className="grid items-start gap-6 min-[876px]:grid-cols-3">
        <Skeleton className="h-[36rem] w-full rounded-20 min-[876px]:max-w-[21.25rem]" />
        <div className="flex flex-col gap-3.5 min-[876px]:col-span-2">
          <h1 className="text-26 leading-tight font-bold tracking-h3">{t.search.defaultTitle}</h1>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-20" />
          ))}
        </div>
      </div>
    </div>
  );
}
