// /gurgaon/top/[list]: one ranked list. Prototype: "Health Gurgaon Top Lists and Stories.dc.html"
// #listicle. The header, method and the full ranking are in the static shell; the ownership and
// locality filters (?own=&locality=) apply under <Suspense> (see the page).

import Link from "next/link";
import type { ReactNode } from "react";

import {
  AutoSubmitForm,
  SubmitOnChangeSelect,
} from "@/components/find-care/auto-submit-form";
import { NotSponsoredBadge, OwnershipBadge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { chipClasses } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { SponsoredBox } from "@/components/ui/sponsored-box";
import { JsonLd } from "@/components/ui/json-ld";
import type {
  StoryCard,
  TopListDetail,
  TopListEntryDTO,
  TopListSponsor,
} from "@/lib/data/top-lists";
import { formatDate, formatNumber, getDictionary, type Lang } from "@/lib/i18n";
import {
  monthName,
  tlData,
  topListsStrings,
  type TopListsStrings,
} from "@/lib/i18n/areas/top-lists";
import { SITE_URL } from "@/lib/i18n/metadata";
import { localityName } from "@/lib/localities";
import { isProviderKind, routes } from "@/lib/routes";

import {
  CheckPill,
  TypePill,
  breadcrumbLd,
} from "./bits";
import {
  CompareBar,
  CompareProvider,
  CompareToggle,
  type CompareEntry,
} from "./compare";
import {
  LIST_OWNERSHIPS,
  RANK_LOCALITIES,
  fill,
  filterEntries,
  parseMovement,
  plural,
  withQuery,
  type ListFilters,
} from "./format";
import { OpenOnHash } from "./open-on-hash";
import { WatchStoryButton } from "./story-player";
import { playerLabels, toStoryView } from "./story-model";

export type ListContext = {
  lang: Lang;
  detail: TopListDetail;
  /** The list whose entries this one filters (government → hospitals), else its own slug. */
  baseSlug: string;
  stories: StoryCard[];
  sponsor: TopListSponsor | null;
};

export function ListHeader({ ctx }: { ctx: ListContext }) {
  const { lang, detail } = ctx;
  const t = topListsStrings(lang);
  const dict = getDictionary(lang);
  const selfHref = routes.topList(lang, detail.slug);
  const ranked = detail.entries.length > 0;
  return (
    <section className="bg-cream">
      <JsonLd
        data={[
          breadcrumbLd([
            {
              name: dict.breadcrumbs.home,
              url: `${SITE_URL}${routes.home(lang)}`,
            },
            {
              name: dict.pages.topLists.title,
              url: `${SITE_URL}${routes.topLists(lang)}`,
            },
            { name: tlData(lang, detail.crumb), url: `${SITE_URL}${selfHref}` },
          ]),
          // No ItemList for a list with nothing ranked yet.
          ...(ranked
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "ItemList",
                  name: tlData(lang, detail.h1),
                  description: tlData(lang, detail.intro),
                  itemListOrder: "https://schema.org/ItemListOrderDescending",
                  numberOfItems: detail.entries.length,
                  itemListElement: detail.entries.map((e) => ({
                    "@type": "ListItem",
                    position: e.rank,
                    name: e.name,
                    ...(e.provider
                      ? {
                          url: `${SITE_URL}${routes.provider(lang, e.provider.profileKind, e.provider.slug)}`,
                        }
                      : {}),
                  })),
                },
              ]
            : []),
        ]}
      />
      <div className="mx-auto flex w-full max-w-[68.75rem] flex-col gap-3.5 px-6 pt-4 pb-7.5">
        <Breadcrumbs
          lang={lang}
          items={[
            { label: t.list.crumb, href: routes.topLists(lang) },
            { label: tlData(lang, detail.crumb) },
          ]}
        />
        {detail.tabs.length > 0 && (
          <nav aria-label={t.list.tabsLabel} className="flex flex-wrap gap-1.5">
            {detail.tabs.map((tab) => {
              const on = tab.slug === ctx.baseSlug;
              return (
                <Link
                  key={tab.slug}
                  href={routes.topList(lang, tab.slug)}
                  aria-current={on ? "page" : undefined}
                  className={chipClasses(on)}
                >
                  {tlData(lang, tab.tabLabel)}
                </Link>
              );
            })}
          </nav>
        )}
        {/* Nothing ranked yet: the plain title ("Top dentists in Gurugram"), not "Top 10 … 2026". */}
        <h1 className="text-36 leading-[1.04] font-bold tracking-display text-balance sm:text-[2.875rem]">
          {tlData(lang, ranked ? detail.h1 : detail.title)}
        </h1>
        <p className="max-w-[47.5rem] text-16.5 leading-[1.6] font-light text-muted">
          {tlData(lang, detail.intro)}
        </p>
        <div className="flex flex-wrap items-center gap-x-4.5 gap-y-2.5 font-mono text-11.5 text-subtle uppercase">
          <span>
            {fill(t.list.updated, {
              date: formatDate(lang, detail.updatedAt, "short"),
            })}
          </span>
          {ranked && <span>{tlData(lang, detail.basis)}</span>}
          <NotSponsoredBadge
            lang={lang}
            size="sm"
            className="font-sans normal-case"
          />
          <details id="method" className="group open:basis-full">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-pill border-[1.5px] border-ink bg-white px-3 font-sans text-12 font-medium text-ink normal-case hover:bg-cream-deep [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">{t.list.methodShow}</span>
              <span className="hidden group-open:inline">
                {t.list.methodHide}
              </span>
            </summary>
            <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-3.5 rounded-20 bg-white p-5 font-sans normal-case">
              {detail.method.map((m) => (
                <div key={m.label} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-14.5 font-semibold text-ink">
                      {tlData(lang, m.label)}
                    </span>
                    <span className="font-mono text-12 font-medium text-teal">
                      {fill(t.list.weight, { pct: m.weightPct })}
                    </span>
                  </div>
                  <span className="text-13 leading-normal font-light text-muted">
                    {tlData(lang, m.detail)}
                  </span>
                </div>
              ))}
              <p className="col-span-full border-t border-line pt-3 text-12.5 leading-[1.55] font-light text-subtle">
                {fill(t.list.methodNote, { min: detail.minReviews })}
              </p>
            </div>
          </details>
        </div>
        <OpenOnHash id="method" />
      </div>
    </section>
  );
}

function Movement({
  t,
  lang,
  movement,
}: {
  t: TopListsStrings;
  lang: Lang;
  movement: string;
}) {
  const m = parseMovement(movement);
  const [text, label] =
    m.dir === "up"
      ? [
          fill(t.list.movementUp, { n: m.n, month: monthName(lang, m.month) }),
          fill(t.list.movementUpLabel, {
            n: m.n,
            month: monthName(lang, m.month),
          }),
        ]
      : m.dir === "down"
        ? [
            fill(t.list.movementDown, {
              n: m.n,
              month: monthName(lang, m.month),
            }),
            fill(t.list.movementDownLabel, {
              n: m.n,
              month: monthName(lang, m.month),
            }),
          ]
        : m.dir === "new"
          ? [t.list.movementNew, t.list.movementNewLabel]
          : [t.list.movementSame, t.list.movementSameLabel];
  return (
    <span className="ml-auto font-mono text-10.5 text-subtle">
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function EntryCard({
  ctx,
  entry,
  position,
  story,
}: {
  ctx: ListContext;
  entry: TopListEntryDTO;
  position: number;
  story: StoryCard | null;
}) {
  const { lang, detail } = ctx;
  const t = topListsStrings(lang);
  const p = entry.provider;
  const kind = p && isProviderKind(p.profileKind) ? p.profileKind : null;
  const nameId = `entry-${entry.id}`;
  return (
    <li>
      <article
        aria-labelledby={nameId}
        className="flex flex-col gap-3.5 rounded-24 border border-line bg-white p-5"
      >
        <div className="flex flex-wrap items-start gap-4.5">
          <div
            className={cn(
              "flex size-14 flex-none items-center justify-center rounded-16 text-24 font-bold text-ink",
              position <= 3 ? "bg-saffron" : "bg-cream",
            )}
          >
            <span aria-hidden="true">{position}</span>
            <span className="sr-only">
              {fill(t.common.rank, { n: position })}
            </span>
          </div>
          <div className="flex min-w-0 flex-[1_1_15rem] flex-col gap-1.75">
            <div className="flex flex-wrap gap-1.5">
              <OwnershipBadge ownership={entry.ownership} lang={lang} />
              <TypePill>{tlData(lang, entry.typeLabel)}</TypePill>
              <CheckPill>✓ {tlData(lang, detail.badgeLabel)}</CheckPill>
            </div>
            <h2
              id={nameId}
              className="text-21 leading-tight font-semibold tracking-title"
            >
              {p ? (
                <Link
                  href={routes.provider(lang, p.profileKind, p.slug)}
                  className="text-ink hover:text-teal"
                >
                  {entry.name}
                </Link>
              ) : (
                entry.name
              )}
            </h2>
            <span className="text-13.5 font-light text-muted">
              {tlData(lang, entry.meta)}
            </span>
            <q lang="en" className="text-14.5 leading-[1.55] text-ink-soft">
              {entry.quote}
            </q>
          </div>
          <div className="flex min-w-30 flex-col items-end gap-1">
            <span className="text-[2.125rem] leading-none font-bold tracking-h1 text-teal">
              {entry.score}
            </span>
            <span className="font-mono text-10.5 text-subtle uppercase">
              {t.list.scoreUnit}
            </span>
            <span className="text-12 font-light text-muted">
              {plural(
                entry.reviewCount,
                t.list.reviewsOne,
                t.list.reviewsMany.replace(
                  "{n}",
                  formatNumber(lang, entry.reviewCount),
                ),
              )}
            </span>
          </div>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.375rem),1fr))] gap-2.5">
          {entry.subScores.map((s) => (
            <li key={s.label} className="flex flex-col gap-1.25">
              <span className="flex justify-between gap-2 text-12">
                <span>{tlData(lang, s.label)}</span>
                <span className="font-mono text-11 font-medium">{s.value}</span>
              </span>
              <span
                aria-hidden="true"
                className="block h-1.5 overflow-hidden rounded-3 bg-line"
              >
                <span
                  className="block h-full bg-teal"
                  style={{ width: `${Math.max(0, Math.min(100, s.value))}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {story && (
            <WatchStoryButton
              story={toStoryView(lang, story)}
              labels={playerLabels(lang)}
            />
          )}
          {p && kind && (
            <Link
              href={routes.providerReviews(lang, kind, p.slug)}
              className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-line-strong bg-white px-3.5 text-13 text-ink hover:border-ink hover:text-ink"
            >
              {t.list.reviewsLink}
            </Link>
          )}
          <CompareToggle id={entry.id} name={entry.name} labels={t.compare} />
          {p && kind && (
            <Link
              href={routes.dispute(lang, kind, p.slug, {
                target: "ranking",
                list: ctx.baseSlug,
              })}
              className="inline-flex min-h-11 items-center px-1 text-12.5 font-medium"
            >
              {t.list.dispute}
            </Link>
          )}
          <Movement t={t} lang={lang} movement={entry.movement} />
        </div>
      </article>
    </li>
  );
}

function SponsorNote({ ctx }: { ctx: ListContext }) {
  const { lang, sponsor } = ctx;
  if (!sponsor) return null;
  const t = topListsStrings(lang);
  return (
    <SponsoredBox
      lang={lang}
      label={t.list.sponsoredLabel}
      className="sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"
    >
      <p className="min-w-0 flex-[1_1_13.75rem] text-14 font-light">
        {sponsor.announcement
          ? tlData(lang, sponsor.announcement)
          : fill(t.list.sponsoredFallback, { name: sponsor.provider.name })}
      </p>
      <Link
        href={routes.trust(lang, "sponsorship")}
        className="inline-flex min-h-11 items-center text-13"
      >
        {t.list.sponsorshipPolicy}
      </Link>
    </SponsoredBox>
  );
}

/** Ownership chips, locality picker, the ranking (with compare) and the sponsored note. */
export function RankedSection({
  ctx,
  filters,
}: {
  ctx: ListContext;
  filters: ListFilters;
}) {
  const { lang, detail, baseSlug } = ctx;
  const t = topListsStrings(lang);
  const selfHref = routes.topList(lang, detail.slug);
  const baseHref = routes.topList(lang, baseSlug);
  const own = filters.own ?? detail.presetOwnership;
  const shown = filterEntries(detail.entries, filters);
  const storyByProvider = new Map(
    ctx.stories.filter((s) => s.provider).map((s) => [s.provider!.slug, s]),
  );

  const ownHref = (o: (typeof LIST_OWNERSHIPS)[number] | null) => {
    // The government list is the hospitals list with "Government" chosen: other chips go back to it.
    if (detail.presetOwnership)
      return o === detail.presetOwnership
        ? withQuery(selfHref, { locality: filters.locality })
        : withQuery(baseHref, { own: o, locality: filters.locality });
    return withQuery(selfHref, { own: o, locality: filters.locality });
  };

  const compareEntries: CompareEntry[] = shown.map((e) => ({
    id: e.id,
    name: e.name,
    ownership: t.ownership[e.ownership] ?? e.ownershipLabel,
    type: tlData(lang, e.typeLabel),
    score: e.score,
    reviews: fill(t.compare.reviewsValue, {
      n: formatNumber(lang, e.reviewCount),
    }),
    subs: e.subScores.map((s) => ({
      label: tlData(lang, s.label),
      value: s.value,
    })),
    details: tlData(lang, e.meta),
  }));

  let empty: ReactNode = null;
  if (shown.length === 0) {
    empty =
      detail.entries.length === 0 ? (
        <p className="rounded-20 bg-cream p-5.5 text-15 leading-[1.55]">
          {t.list.emptyList}{" "}
          <Link href={routes.topLists(lang)} className="font-medium">
            {t.list.emptyListLink}
          </Link>
        </p>
      ) : (
        <p className="rounded-20 bg-cream p-5.5 text-15 leading-[1.55]">
          {fill(t.list.noRanked, {
            own: own ? `${t.ownershipLower[own] ?? own} ` : "",
            place: filters.locality
              ? localityName(filters.locality, lang)
              : t.list.allGurugram,
          })}{" "}
          <Link href={baseHref} className="font-medium">
            {t.list.showAll}
          </Link>
        </p>
      );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={t.list.ownLabel} className="flex flex-wrap gap-1.5">
          {[null, ...LIST_OWNERSHIPS].map((o) => {
            const on = (own ?? null) === o;
            return (
              <Link
                key={o ?? "all"}
                href={ownHref(o)}
                scroll={false}
                aria-current={on ? "true" : undefined}
                className={chipClasses(on)}
              >
                {o ? t.ownership[o] : t.list.allOwnership}
              </Link>
            );
          })}
        </nav>
        <AutoSubmitForm
          action={selfHref}
          label={t.list.localityLabel}
          submitLabel={t.list.apply}
          className="flex flex-wrap items-center gap-2"
        >
          {filters.own && (
            <input type="hidden" name="own" value={filters.own} />
          )}
          <label htmlFor="rank-locality" className="sr-only">
            {t.list.localityLabel}
          </label>
          <SubmitOnChangeSelect
            key={filters.locality ?? "all"}
            id="rank-locality"
            name="locality"
            defaultValue={filters.locality ?? ""}
            className="min-h-11 rounded-pill border-[1.5px] border-line-strong bg-white px-3 text-13.5 text-ink"
          >
            <option value="">{t.list.allGurugram}</option>
            {RANK_LOCALITIES.map((slug) => (
              <option key={slug} value={slug}>
                {localityName(slug, lang)}
              </option>
            ))}
          </SubmitOnChangeSelect>
        </AutoSubmitForm>
      </div>
      <p role="status" className="sr-only">
        {plural(shown.length, t.list.resultsOne, t.list.resultsMany)}
      </p>
      <CompareProvider>
        {shown.length > 0 && (
          <ol aria-label={t.list.entriesLabel} className="flex flex-col gap-4">
            {shown.map((e) => (
              <EntryCard
                key={e.id}
                ctx={ctx}
                entry={e}
                position={e.position}
                story={
                  e.hasStory && e.provider
                    ? (storyByProvider.get(e.provider.slug) ?? null)
                    : null
                }
              />
            ))}
          </ol>
        )}
        {empty}
        <SponsorNote ctx={ctx} />
        <CompareBar entries={compareEntries} labels={t.compare} />
      </CompareProvider>
    </>
  );
}

export function ListFootnote({ lang }: { lang: Lang }) {
  return (
    <p className="text-12.5 leading-[1.6] font-light text-subtle">
      {topListsStrings(lang).list.footnote}
    </p>
  );
}
