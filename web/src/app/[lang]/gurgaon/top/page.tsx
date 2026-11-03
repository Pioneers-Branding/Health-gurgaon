// Top lists hub. Prototype: "Health Gurgaon Top Lists and Stories.dc.html" #lists.
// Every list card renders into the static shell (the Suspense fallback shows them all); the URL's
// group and search (?group=&q=) apply under <Suspense>, and live as the reader types.
import type { Metadata } from "next";
import { Suspense } from "react";

import { parseHubFilters } from "@/components/top-lists/format";
import { HubView } from "@/components/top-lists/hub-view";
import { getTopLists } from "@/lib/data/top-lists";
import { getDictionary, type Lang } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/top">;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.topLists;
  return pageMetadata({ lang, href: (l) => routes.topLists(l), title: t.title, description: t.description });
}

export default async function TopListsPage({ searchParams }: Props) {
  const lang = await getLang();
  const lists = await getTopLists();
  return (
    <Suspense fallback={<HubView lang={lang} lists={lists} filters={{ group: null, q: "" }} />}>
      <HubForRequest lang={lang} lists={lists} searchParams={searchParams} />
    </Suspense>
  );
}

async function HubForRequest({ lang, lists, searchParams }: { lang: Lang; lists: Awaited<ReturnType<typeof getTopLists>>; searchParams: Props["searchParams"] }) {
  const filters = parseHubFilters(await searchParams);
  return <HubView lang={lang} lists={lists} filters={filters} />;
}
