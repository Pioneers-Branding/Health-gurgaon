// One top list. Prototype: "Health Gurgaon Top Lists and Stories.dc.html" #listicle.
// Known lists are prerendered (unknown slugs are real 404s). The header, the published method and
// the full ranking render into the static shell (the Suspense fallback); the ownership and
// locality filters (?own=&locality=) apply under <Suspense>. Lists without enough verified
// reviews yet are noindex.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { parseListFilters } from "@/components/top-lists/format";
import { ListFootnote, ListHeader, RankedSection, type ListContext } from "@/components/top-lists/list-view";
import { getStories, getTopList, getTopListSponsor, getTopLists, listTopListSlugs } from "@/lib/data/top-lists";
import { tlData } from "@/lib/i18n/areas/top-lists";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/top/[list]">;

export async function generateStaticParams() {
  return (await listTopListSlugs()).map((list) => ({ list }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { list } = await params;
  const detail = await getTopList(list);
  if (!detail) notFound();
  return pageMetadata({
    lang,
    href: (l) => routes.topList(l, detail.slug),
    title: tlData(lang, detail.entries.length > 0 ? detail.h1 : detail.title),
    description: tlData(lang, detail.intro),
    noindex: detail.entries.length === 0,
  });
}

export default async function TopListPage({ params, searchParams }: Props) {
  const lang = await getLang();
  const { list } = await params;
  const detail = await getTopList(list);
  if (!detail) notFound();
  const [lists, stories, sponsor] = await Promise.all([getTopLists(), getStories(), getTopListSponsor()]);
  const card = lists.find((l) => l.slug === detail.slug);
  const ctx: ListContext = { lang, detail, baseSlug: card?.sourceListSlug ?? detail.slug, stories, sponsor };
  return (
    <>
      <ListHeader ctx={ctx} />
      <div className="mx-auto flex w-full max-w-[68.75rem] flex-col gap-4 px-6 pt-6 pb-14">
        <Suspense fallback={<RankedSection ctx={ctx} filters={{ own: null, locality: null }} />}>
          <RankedForRequest ctx={ctx} searchParams={searchParams} />
        </Suspense>
        <ListFootnote lang={lang} />
      </div>
    </>
  );
}

async function RankedForRequest({ ctx, searchParams }: { ctx: ListContext; searchParams: Props["searchParams"] }) {
  const filters = parseListFilters(await searchParams);
  return <RankedSection ctx={ctx} filters={filters} />;
}
