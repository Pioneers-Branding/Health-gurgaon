// /gurgaon/top: the top lists hub. Prototype: "Health Gurgaon Top Lists and Stories.dc.html" #lists.
// Server Component; the finder (search box, group chips, cards) is a small client component.

import Link from "next/link";

import { JsonLd } from "@/components/ui/json-ld";
import { formatDate, getDictionary, type Lang } from "@/lib/i18n";
import type { TopListCard } from "@/lib/data/top-lists";
import { tlData, topListsStrings } from "@/lib/i18n/areas/top-lists";
import { SITE_URL } from "@/lib/i18n/metadata";
import { localityName } from "@/lib/localities";
import { routes } from "@/lib/routes";

import { breadcrumbLd } from "./bits";
import { HUB_GROUPS, RANK_LOCALITIES, fill, hubGroupKey, monthYearLong, withQuery, type HubFilters } from "./format";
import { HubFinder, type HubCard } from "./hub-finder";

/** The list "How we rank" opens with its method showing (the prototype opens paediatricians). */
function methodListSlug(lists: TopListCard[]): string | null {
  return lists.find((l) => !l.sourceListSlug && l.entryCount > 0)?.slug ?? lists[0]?.slug ?? null;
}

export function HubView({ lang, lists, filters }: { lang: Lang; lists: TopListCard[]; filters: HubFilters }) {
  const t = topListsStrings(lang);
  const dict = getDictionary(lang);
  const latest = lists.reduce<string | null>((m, l) => (!m || l.updatedAt > m ? l.updatedAt : m), null);
  const month = latest ? monthYearLong(lang, latest) : "";
  const hospitals = lists.find((l) => l.slug === "hospitals") ?? lists.find((l) => l.hubGroup === "Hospitals" && !l.sourceListSlug);
  const government = lists.find((l) => l.presetOwnership === "government");
  const methodSlug = methodListSlug(lists);

  // A list with nothing ranked yet doesn't claim "Top 10" or a review count.
  const ranked = (l: (typeof lists)[number]) => l.entryCount > 0 || !!l.sourceListSlug;
  const cards: HubCard[] = lists.map((l) => ({
    slug: l.slug,
    href: routes.topList(lang, l.slug),
    top: ranked(l) ? fill(t.hub.topN, { n: l.countLabel }) : t.hub.soon,
    bandKey: l.bandGroup,
    bandLabel: t.hub.bands[l.bandGroup] ?? l.bandGroup,
    title: tlData(lang, l.title),
    meta: ranked(l) ? tlData(lang, l.hubMeta) : t.hub.notRanked,
    updated: fill(t.hub.updated, { date: formatDate(lang, l.updatedAt, "short") }),
    groupKey: hubGroupKey(l.hubGroup),
    search: `${l.title} ${tlData("hi", l.title)} ${l.hubMeta}`,
  }));

  const hero = (
    <>
      <span className="mono-label text-11 text-saffron">{fill(t.hub.kicker, { month })}</span>
      <h1 className="max-w-[53.75rem] text-36 leading-[1.02] font-bold tracking-display text-balance sm:text-[3rem]">{t.hub.title}</h1>
      <p className="max-w-[45rem] text-17 leading-[1.6] font-light text-on-dark">{t.hub.intro}</p>
    </>
  );

  const aside = (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18.75rem),1fr))] gap-3.5">
      {hospitals && (
        <section aria-labelledby="hub-by-locality" className="flex flex-col gap-2 rounded-22 bg-cream p-5.5">
          <h2 id="hub-by-locality" className="text-17 font-semibold">
            {t.hub.byLocality}
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {RANK_LOCALITIES.map((slug) => (
              <li key={slug}>
                <Link
                  href={withQuery(routes.topList(lang, hospitals.slug), { locality: slug })}
                  className="inline-flex min-h-11 items-center rounded-pill bg-white px-3.25 text-13 text-ink hover:text-ink hover:ring-2 hover:ring-ink"
                >
                  {fill(t.hub.bestIn, { place: localityName(slug, lang) })}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="hub-government" className="flex flex-col gap-2 rounded-22 bg-cream p-5.5">
        <h2 id="hub-government" className="text-17 font-semibold">
          {t.hub.govTitle}
        </h2>
        <p className="text-13.5 leading-[1.55] font-light text-muted">{t.hub.govText}</p>
        {government && (
          <Link href={routes.topList(lang, government.slug)} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
            {t.hub.govLink}
          </Link>
        )}
      </section>
      <section aria-labelledby="hub-dispute" className="flex flex-col gap-2 rounded-22 bg-cream p-5.5">
        <h2 id="hub-dispute" className="text-17 font-semibold">
          {t.hub.disputeTitle}
        </h2>
        <p className="text-13.5 leading-[1.55] font-light text-muted">{t.hub.disputeText}</p>
        <Link href={routes.disputes(lang)} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
          {t.hub.disputeLink}
        </Link>
      </section>
    </div>
  );

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: dict.breadcrumbs.home, url: `${SITE_URL}${routes.home(lang)}` },
            { name: dict.pages.topLists.title, url: `${SITE_URL}${routes.topLists(lang)}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t.hub.title,
            itemListElement: lists.map((l, i) => ({ "@type": "ListItem", position: i + 1, name: tlData(lang, l.title), url: `${SITE_URL}${routes.topList(lang, l.slug)}` })),
          },
        ]}
      />
      <HubFinder
        basePath={routes.topLists(lang)}
        cards={cards}
        groups={HUB_GROUPS.map((g) => g.key)}
        labels={{
          findLabel: t.hub.findLabel,
          findPlaceholder: t.hub.findPlaceholder,
          findSubmit: t.hub.findSubmit,
          groupsLabel: t.hub.groupsLabel,
          all: t.hub.all,
          groups: t.hub.groups,
          noLists: t.hub.noLists,
          noListsGroup: t.hub.noListsGroup,
          countOne: t.hub.countOne,
          countMany: t.hub.countMany,
          listsLabel: t.hub.listsLabel,
          howWeRank: t.hub.howWeRank,
        }}
        initial={filters}
        hero={hero}
        howWeRankHref={methodSlug ? `${routes.topList(lang, methodSlug)}#method` : routes.topLists(lang)}
        aside={aside}
      />
    </>
  );
}
