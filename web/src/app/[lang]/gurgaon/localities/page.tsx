// Locality index: "Find your locality" search, the schematic map, the selected locality's summary
// and every locality with its verified coverage. Prototype: "Health Gurgaon Local and Events.dc.html"
// #localities. The catalogue (coverage, upcoming events) renders into the static shell with the
// default state; the URL state (?q=, ?sel=) and the reader's follows come under <Suspense>.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { stampDate, tileParts } from "@/components/local-events/bits";
import { fill, plural } from "@/components/local-events/format";
import { LocalityExplorer, type ExplorerLinks, type ExplorerLocality } from "@/components/local-events/locality-explorer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getMyFollows } from "@/lib/data/account";
import { getUpcomingEvents } from "@/lib/data/events";
import { getLocalityIndex } from "@/lib/data/localities";
import { getDictionary, localityName, type Lang } from "@/lib/i18n";
import { coversText, dataText, localEventsStrings, mapShortName, type LocalEventsStrings } from "@/lib/i18n/areas/local-events";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/localities">;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.localities;
  return pageMetadata({ lang, href: (l) => routes.localities(l), title: t.title, description: t.description });
}

async function explorerData(lang: Lang, t: LocalEventsStrings) {
  const [index, events] = await Promise.all([getLocalityIndex(), getUpcomingEvents()]);
  const localities: ExplorerLocality[] = index.localities.map((L) => ({
    slug: L.slug,
    name: localityName(lang, L),
    short: mapShortName(lang, L.slug, L.map.short ?? null),
    live: L.live,
    covers: coversText(lang, L.slug, L.covers),
    coverage: { doctors: L.coverage.doctors, careFacilities: L.coverage.careFacilities, pharmaciesLabs: L.coverage.pharmaciesLabs, total: L.coverage.total },
    extra: L.coverage.extra ? dataText(lang, L.coverage.extra) : null,
    checked: L.coverage.checkedAt ? stampDate(lang, L.coverage.checkedAt) : "",
    editor: L.editorLabel ? dataText(lang, L.editorLabel) : null,
    map: { x: L.map.x, y: L.map.y, side: L.map.label },
    events: events
      .filter((e) => e.localitySlug === L.slug)
      .map((e) => {
        const tile = tileParts(lang, t, e);
        return { slug: e.slug, href: routes.event(lang, e.slug), title: e.title, day: tile.day, mon: tile.mon, verified: e.verified, status: e.verified ? t.status.verified : t.status.awaiting };
      }),
    href: routes.locality(lang, L.slug),
    searchHref: routes.search(lang, { locality: L.slug }),
    suggestHref: routes.suggestListing(lang, { locality: L.slug }),
  }));
  return { index, localities };
}

export default async function LocalitiesPage({ searchParams }: Props) {
  const lang = await getLang();
  const t = localEventsStrings(lang);
  const dict = getDictionary(lang);
  const { index, localities } = await explorerData(lang, t);

  const intro = (
    <div className="flex flex-col gap-3.5">
      <Breadcrumbs lang={lang} items={[{ label: t.crumbs.localities }]} className="-my-3" />
      <h1 className="text-[2.875rem] leading-[1.02] font-bold tracking-display">{dict.pages.localities.title}</h1>
      <p className="max-w-[35rem] text-16.5 leading-[1.6] font-light text-muted">{t.index.intro}</p>
      <span className="font-mono text-11 text-subtle uppercase">
        {fill(t.index.statsLine, {
          localities: plural(index.localities.length, t.index.localitiesOne, t.index.localitiesMany),
          live: plural(index.liveCount, t.index.liveOne, t.index.liveMany),
          date: index.listCheckedAt ? stampDate(lang, index.listCheckedAt) : "",
        })}
      </span>
    </div>
  );

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-22 bg-cream p-5.5">
      <div className="flex max-w-[41.25rem] flex-col gap-1.5">
        <h2 className="text-18 font-semibold">{t.index.helpTitle}</h2>
        <p className="text-14 leading-[1.55] font-light text-muted">{t.index.helpBody}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={routes.suggestListing(lang)} className="inline-flex min-h-11 items-center rounded-pill bg-teal px-4.5 text-14 font-medium text-white hover:bg-teal-dark hover:text-white">
          {t.index.suggestListing}
        </Link>
        <Link href={routes.volunteer(lang)} className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-ink px-4.5 text-14 font-medium text-ink hover:bg-white hover:text-ink">
          {t.index.becomeChampion}
        </Link>
      </div>
    </div>
  );

  const links: ExplorerLinks = {
    calendar: routes.events(lang),
    submit: routes.submitEvent(lang),
    champion: routes.volunteer(lang),
    accountSaved: routes.accountSaved(lang),
    signIn: routes.account(lang),
    base: routes.localities(lang),
  };
  const common = { lang, t: { index: t.index, follow: t.follow, status: t.status }, localities, intro, footer, links, minListings: index.minListings };

  return (
    <Suspense fallback={<LocalityExplorer {...common} initialQuery="" initialSel={null} followed={[]} signedIn={null} />}>
      <ExplorerForRequest {...common} searchParams={searchParams} />
    </Suspense>
  );
}

/** The same explorer with the URL's search and selection and the reader's follows. */
async function ExplorerForRequest({ searchParams, ...common }: Omit<Parameters<typeof LocalityExplorer>[0], "initialQuery" | "initialSel" | "followed" | "signedIn"> & { searchParams: Props["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const follows = await getMyFollows();
  return (
    <LocalityExplorer
      {...common}
      initialQuery={one(sp.q).slice(0, 80)}
      initialSel={one(sp.sel) || null}
      followed={(follows ?? []).filter((f) => f.kind === "locality").map((f) => f.targetId)}
      signedIn={follows !== null}
    />
  );
}
