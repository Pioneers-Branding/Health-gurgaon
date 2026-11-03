// A locality page (prototype #locality, "Healthcare on Sohna Road"). Live localities show the
// verified categories, featured hospitals, upcoming events, neighbours' questions and how to get
// care; localities that aren't live yet show the index's "Not enough verified information yet"
// state with what we have so far and how to help (and the page is noindex). The catalogue renders
// into the static shell; the Follow button's state comes from the session under <Suspense>.

import Link from "next/link";
import { Suspense } from "react";

import { Badge, isOwnership, OwnershipBadge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { SponsoredBox } from "@/components/ui/sponsored-box";
import { JsonLd } from "@/components/ui/json-ld";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyAccount, getMyConsent, getMyFollows } from "@/lib/data/account";
import type { LocalityPage } from "@/lib/data/localities";
import type { NeighbourRankingRow } from "@/lib/data/neighbours";
import { getDictionary, localityName, type Lang } from "@/lib/i18n";
import { dataLabel } from "@/lib/i18n/areas/find-care";
import { coversText, dataText, type LocalEventsStrings } from "@/lib/i18n/areas/local-events";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { EventStatusPill, eventStatusKind, stampDate, statusLabel, tileParts } from "./bits";
import { fill, isRoadLocality, plural } from "./format";
import { LocalityCategories, type LocalityCategory } from "./locality-categories";
import { LocalityFollow, type FollowInitial } from "./locality-follow";

const CATEGORY_SEARCH: Record<string, { kind?: string; q?: string }> = {
  clinics: { kind: "clinic" },
  labs: { kind: "lab" },
  chemists: { kind: "pharmacy" },
  home_care: { q: "home care" },
  physio: { q: "physiotherapy" },
  hospitals: { kind: "hospital" },
};

function checkedLine(t: LocalEventsStrings["locality"], kind: string, days: number | null): string {
  const set =
    kind === "pharmacy"
      ? [t.hoursCheckedToday, t.hoursCheckedOne, t.hoursCheckedMany]
      : kind === "hospital" || kind === "emergency_dept"
        ? [t.facilityCheckedToday, t.facilityCheckedOne, t.facilityCheckedMany]
        : [t.checkedToday, t.checkedOne, t.checkedMany];
  if (days === null) return t.checkedUnknown;
  return days <= 0 ? set[0] : plural(days, set[1], set[2]);
}

export function LocalityView({
  lang,
  t,
  page,
  neighbours,
  neighbourCounts,
}: {
  lang: Lang;
  t: LocalEventsStrings;
  page: LocalityPage;
  neighbours: NeighbourRankingRow[];
  neighbourCounts: Record<string, number>;
}) {
  const dict = getDictionary(lang);
  const L = page.locality;
  const name = localityName(lang, L);
  const road = isRoadLocality(L.name);
  const tl = t.locality;
  const covers = coversText(lang, L.slug, L.covers);
  const description = L.description ? dataText(lang, L.description) : null;
  const meta = L.pageUpdatedAt
    ? `${fill(tl.pageUpdated, { date: stampDate(lang, L.pageUpdatedAt) })}${L.editorLabel ? fill(tl.editor, { editor: dataText(lang, L.editorLabel) }) : ""}`
    : L.coverage.checkedAt
      ? fill(tl.lastChecked, { date: stampDate(lang, L.coverage.checkedAt) })
      : undefined;

  const categories: LocalityCategory[] = page.categories.map((c) => {
    const label = tl.categories[c.key as keyof typeof tl.categories] ?? c.label;
    const search = CATEGORY_SEARCH[c.key] ?? {};
    return {
      key: c.key,
      label,
      labelOne: tl.categoriesOne[c.key as keyof typeof tl.categoriesOne] ?? label,
      count: c.count,
      title: fill(road ? tl.categoryTitle : tl.categoryTitleArea, { category: label, name }),
      listings: c.providers.map((p) => ({
        slug: p.slug,
        href: routes.provider(lang, p.profileKind, p.slug),
        name: p.name,
        line: [dataLabel(lang, p.headline.split(" · ")[0]), p.areaLabel].filter(Boolean).join(" · "),
        checked: checkedLine(tl, p.kind, p.checkedDaysAgo),
      })),
      seeAll: { href: routes.search(lang, { locality: L.slug, ...search }), label: fill(tl.seeAll, { category: label.toLowerCase() }) },
    };
  });

  const editorial = page.featuredHospitals.filter((h) => !h.sponsored);
  const sponsored = page.featuredHospitals.filter((h) => h.sponsored);
  const ranked = neighbours.filter((r) => r.rank !== null && r.status !== "not_enough").slice(0, 3);
  const selfHref = routes.locality(lang, L.slug);

  const crumbs = [
    { label: t.crumbs.localities, href: routes.localities(lang) },
    { label: name, href: selfHref },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home, item: `${SITE_URL}${routes.home(lang)}` },
      { "@type": "ListItem", position: 2, name: t.crumbs.localities, item: `${SITE_URL}${routes.localities(lang)}` },
      { "@type": "ListItem", position: 3, name, item: `${SITE_URL}${selfHref}` },
    ],
  };

  const followProps = {
    lang,
    slug: L.slug,
    name,
    live: L.live,
    t: t.follow,
    signInHref: routes.account(lang, { next: selfHref }),
    accountHref: routes.accountSaved(lang),
    consentHref: routes.accountConsent(lang),
    meta,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <section className="bg-cream">
        <Container className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,27.5rem),1fr))] items-center gap-7 pt-7 pb-9">
          <div className="flex min-w-0 flex-col gap-3.5">
            <Breadcrumbs lang={lang} items={[crumbs[0], { label: name }]} className="-my-3" />
            <h1 className="text-[2.875rem] leading-[1.02] font-bold tracking-display">{fill(road ? tl.titleRoad : tl.titleArea, { name })}</h1>
            {!L.live && (
              <span className="self-start rounded-pill border border-dashed border-sponsored bg-pending-tint px-2.5 py-0.75 text-12 leading-tight font-semibold text-caution">{t.status.notEnough}</span>
            )}
            <p className="max-w-[35rem] text-16.5 leading-[1.6] font-light text-muted">
              {fill(t.index.covers, { covers })}
              {description ? ` ${description}` : ""}
            </p>
            <Suspense fallback={<LocalityFollow {...followProps} initial={{ following: false, wantsAlerts: false, alertsOn: false }} signedIn={null} channelName="WhatsApp" dest="" />}>
              <FollowForReader {...followProps} />
            </Suspense>
          </div>
          <div className="relative h-70 rounded-24 bg-stripes" role="img" aria-label={fill(tl.map, { name })}>
            <span className="absolute top-3.5 left-4 rounded-6 bg-cream px-2 py-1 font-mono text-11 text-subtle">{fill(tl.map, { name })}</span>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-8 pt-8 pb-14">
        {!L.live && (
          <div className="flex flex-col gap-2 rounded-22 border-[1.5px] border-ink p-5.5">
            <h2 className="text-18 font-semibold">{t.index.thinTitle}</h2>
            <p className="max-w-[45rem] text-14 leading-[1.55] font-light text-muted">
              {fill(t.index.thinText, { min: L.listingsNeeded + L.coverage.total, name, n: L.coverage.total })}
            </p>
            <div className="h-2 max-w-[45rem] overflow-hidden rounded-pill bg-line" aria-hidden="true">
              <div className="h-full rounded-pill bg-saffron" style={{ width: `${Math.min(100, Math.round((L.coverage.total / (L.listingsNeeded + L.coverage.total || 1)) * 100))}%` }} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="mono-label text-10.5 text-caution">{fill(t.index.progress, { n: L.coverage.total, min: L.listingsNeeded + L.coverage.total })}</span>
              <Link href={routes.search(lang, { locality: L.slug })} className="inline-flex min-h-11 items-center text-13.5 font-medium">
                {t.index.searchCare}
              </Link>
            </div>
          </div>
        )}

        {!L.live && <h2 className="-mb-4 text-20 font-semibold">{tl.soFarTitle}</h2>}
        <LocalityCategories categories={categories} note={tl.categoryNote} label={tl.categoriesLabel} empty={tl.emptyCategory} />

        {ranked.length > 0 && (
          <section aria-labelledby="loc-neighbours" className="flex max-w-[45rem] flex-col gap-3 rounded-22 border border-line p-5">
            <span className="mono-label text-10.5 text-subtle">{tl.neighboursKicker}</span>
            <h2 id="loc-neighbours" className="text-20 font-bold tracking-title">
              {fill(tl.neighboursTitle, { name })}
            </h2>
            <ol className="flex flex-col gap-3">
              {ranked.map((r) => (
                <li key={r.provider.slug} className="flex items-center gap-3 border-t border-line pt-3">
                  <span aria-hidden="true" className="flex size-8.5 flex-none items-center justify-center rounded-10 bg-saffron font-bold">
                    {r.rank}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link href={routes.provider(lang, r.provider.profileKind, r.provider.slug)} className="text-15 font-semibold text-ink">
                      {r.provider.name}
                    </Link>
                    <span className="text-12.5 font-light text-muted">
                      {plural(r.recommendedBy, tl.recommendedOne, tl.recommendedMany)}
                      {r.topTheme ? ` · “${lang === "hi" ? dataLabel(lang, r.topTheme) : r.topTheme.charAt(0).toLowerCase() + r.topTheme.slice(1)}”` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-12 leading-normal font-light text-subtle">
              {tl.neighboursNote} <Link href={routes.neighbourRecommendations(lang)}>{tl.neighboursHow}</Link>
            </p>
          </section>
        )}

        {page.featuredHospitals.length > 0 && (
          <section aria-labelledby="loc-featured" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2.5">
              <h2 id="loc-featured" className="text-20 font-semibold">
                {fill(tl.featuredTitle, { name })}
              </h2>
              <Link href={routes.facilities(lang)} className="inline-flex min-h-11 items-center text-13.5 font-medium">
                {tl.allHospitals}
              </Link>
            </div>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.875rem),1fr))] gap-3">
              {editorial.map((h) => (
                <li key={h.provider.slug} className="flex">
                  <FeaturedCard lang={lang} t={tl} h={h} count={neighbourCounts[h.provider.slug] ?? 0} />
                </li>
              ))}
              {sponsored.map((h) => (
                <li key={h.provider.slug} className="flex">
                  <SponsoredBox lang={lang} label={dict.badges.sponsored} className="w-full">
                    <FeaturedCard lang={lang} t={tl} h={h} count={neighbourCounts[h.provider.slug] ?? 0} bare />
                  </SponsoredBox>
                </li>
              ))}
            </ul>
            <span className="text-12 font-light text-subtle">{tl.featuredNote}</span>
          </section>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22.5rem),1fr))] gap-5">
          <section aria-labelledby="loc-upcoming" className="flex flex-col gap-3 rounded-22 bg-cream p-5.5">
            <div className="flex items-center justify-between gap-2">
              <h2 id="loc-upcoming" className="text-18 font-semibold">
                {fill(road ? tl.upcomingRoad : tl.upcomingArea, { name })}
              </h2>
              <Link href={routes.events(lang, { locality: L.slug })} className="inline-flex min-h-11 flex-none items-center text-13.5">
                {t.index.calendar}
              </Link>
            </div>
            {page.events.map((e) => {
              const tile = tileParts(lang, t, e);
              const kind = eventStatusKind(e);
              return (
                <Link key={e.slug} href={routes.event(lang, e.slug)} className="flex items-center gap-3 rounded-16 bg-white p-3.5 text-ink transition-shadow hover:text-ink hover:ring-2 hover:ring-teal">
                  <span aria-hidden="true" className="min-w-14 flex-none rounded-12 bg-ink px-2.5 py-2 text-center text-18 leading-[1.2] font-bold text-cream">
                    {tile.day}
                    <br />
                    <span className="font-mono text-10 font-normal">{tile.mon}</span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.75">
                    <span className="text-14.5 font-semibold">{e.title}</span>
                    <EventStatusPill kind={kind} label={statusLabel(t, kind)} />
                  </span>
                </Link>
              );
            })}
            {page.events.length === 0 && (
              <div className="flex flex-col items-start gap-2">
                <p className="text-13.5 leading-normal font-light text-muted">{t.index.noEvents}</p>
                <Link href={routes.submitEvent(lang)} className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-line-strong bg-white px-4 text-13.5 text-ink hover:border-ink hover:text-ink">
                  {t.index.submitEvent}
                </Link>
              </div>
            )}
          </section>

          <section aria-labelledby="loc-asking" className="flex flex-col gap-2.5 rounded-22 border border-line p-5.5">
            <h2 id="loc-asking" className="text-18 font-semibold">
              {tl.askingTitle}
            </h2>
            {page.questions.length > 0 ? (
              <ul className="flex flex-col">
                {page.questions.map((q) => (
                  <li key={q.id}>
                    <Link href={routes.thread(lang, q.id)} className="flex flex-col gap-0.75 border-t border-line py-3 text-ink hover:text-ink">
                      <span className="text-14.5 font-medium">{q.title}</span>
                      <span className="text-12 font-light text-subtle">{threadMeta(lang, tl, q)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-13.5 leading-normal font-light text-muted">{tl.noQuestions}</p>
            )}
            <Link href={routes.ask(lang, { locality: L.slug })} className="inline-flex min-h-11 items-center self-start text-13.5 font-medium">
              {tl.ask}
            </Link>
          </section>

          {page.gettingCare && (
            <section aria-labelledby="loc-getting-care" className="flex flex-col gap-2.5 rounded-22 border border-line p-5.5">
              <h2 id="loc-getting-care" className="text-18 font-semibold">
                {fill(road ? tl.gettingCareRoad : tl.gettingCareArea, { name })}
              </h2>
              <p className="text-14 leading-[1.6] font-light text-muted">{dataText(lang, page.gettingCare)}</p>
              <Link href={routes.guide(lang, "planning-for-emergencies-in-your-society")} className="inline-flex min-h-11 items-center self-start text-13.5 font-medium">
                {tl.guideLink}
              </Link>
            </section>
          )}
        </div>

        {!L.live && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-22 bg-cream p-5.5">
            <div className="flex max-w-[41.25rem] flex-col gap-1.5">
              <h2 className="text-18 font-semibold">{fill(t.index.helpGet, { name })}</h2>
              <p className="text-14 leading-[1.55] font-light text-muted">{t.index.helpBody}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={routes.suggestListing(lang, { locality: L.slug })} className="inline-flex min-h-11 items-center rounded-pill bg-teal px-4.5 text-14 font-medium text-white hover:bg-teal-dark hover:text-white">
                {t.index.suggestListing}
              </Link>
              <Link href={routes.volunteer(lang)} className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-ink px-4.5 text-14 font-medium text-ink hover:bg-white hover:text-ink">
                {t.index.becomeChampion}
              </Link>
            </div>
          </div>
        )}
      </Container>
    </>
  );
}

function threadMeta(lang: Lang, tl: LocalEventsStrings["locality"], q: LocalityPage["questions"][number]): string {
  const area = q.areaLabel ? (lang === "hi" ? dataText(lang, q.areaLabel) : q.areaLabel) : null;
  const replies = q.replyCount === 0 ? tl.repliesNone : plural(q.replyCount, tl.repliesOne, tl.repliesMany);
  const status =
    q.status === "resolved"
      ? tl.status.resolved
      : q.statusLabel.endsWith(" answered")
        ? fill(tl.status.answered, { who: dataText(lang, q.statusLabel.replace(/ answered$/, "")) })
        : null;
  return [area, replies, status].filter(Boolean).join(" · ");
}

function FeaturedCard({
  lang,
  t,
  h,
  count,
  bare = false,
}: {
  lang: Lang;
  t: LocalEventsStrings["locality"];
  h: LocalityPage["featuredHospitals"][number];
  count: number;
  bare?: boolean;
}) {
  const own = isOwnership(h.ownership) ? h.ownership : null;
  return (
    <Link
      href={routes.provider(lang, h.provider.profileKind, h.provider.slug)}
      className={
        bare
          ? "flex w-full flex-col gap-1.75 text-ink hover:text-ink"
          : "flex w-full flex-col gap-1.75 rounded-18 border border-line bg-white p-4 text-ink transition-shadow hover:text-ink hover:ring-2 hover:ring-teal"
      }
    >
      <span className="flex flex-wrap gap-1.5">
        {own ? <OwnershipBadge ownership={own} lang={lang} /> : <Badge tone="dark">{dataText(lang, h.ownershipLabel)}</Badge>}
        {h.facilityType && <Badge tone="neutral">{dataLabel(lang, h.facilityType)}</Badge>}
      </span>
      <span className="text-16 font-semibold">{h.provider.name}</span>
      <span className="text-13 font-light text-muted">{h.metaLine}</span>
      {count > 0 && <span className="text-12.5 font-medium text-teal">{plural(count, t.recommendedOne, t.recommendedMany)}</span>}
    </Link>
  );
}

/** The Follow button with the reader's follow, alerts, channel and where alerts go. */
async function FollowForReader(props: Omit<Parameters<typeof LocalityFollow>[0], "initial" | "signedIn" | "channelName" | "dest">) {
  const user = await getCurrentUser();
  if (!user) return <LocalityFollow {...props} initial={{ following: false, wantsAlerts: false, alertsOn: false }} signedIn={false} channelName="WhatsApp" dest="" />;
  const [follows, consent, account] = await Promise.all([getMyFollows(), getMyConsent(), getMyAccount()]);
  const f = follows?.find((x) => x.kind === "locality" && x.targetId === props.slug);
  const initial: FollowInitial = { following: !!f, wantsAlerts: !!f?.wantsAlerts, alertsOn: !!f?.alertsOn };
  const channel = consent?.types.find((x) => x.purpose === "locality_updates")?.channel ?? "whatsapp";
  const isEmail = channel === "email" && !!account?.emailMasked;
  return (
    <LocalityFollow
      {...props}
      initial={initial}
      signedIn
      channelName={isEmail ? (props.lang === "hi" ? "ईमेल" : "Email") : "WhatsApp"}
      dest={isEmail ? (account?.emailMasked ?? props.t.yourEmail) : (account?.phoneMasked ?? user.phoneMasked ?? props.t.yourNumber)}
    />
  );
}
