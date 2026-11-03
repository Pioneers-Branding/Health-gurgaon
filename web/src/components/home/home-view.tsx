// The city homepage (/gurgaon). Prototype: "Health Gurgaon Homepage.dc.html", every section in
// order: hero search with the next camp, browse by service, top lists, patient stories, recently
// verified near a locality, featured hospitals, health camps & events, localities, ask your
// neighbourhood + The Gurgaon Health Report, guides, Healthy Neighbourhoods, get involved and the
// weekly WhatsApp report. Everything here comes from the cached homepage read, so the whole page
// is in the static shell; the locality tabs and filters only switch what's shown (client).

import Link from "next/link";
import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/ui/json-ld";
import { ArrowLink, SectionHeader } from "@/components/ui/section-header";
import { SponsoredBox } from "@/components/ui/sponsored-box";
import { HOME_LOCALITY_TABS, HOME_PLACES, HOME_SEARCH_LOCALITIES, type Homepage } from "@/lib/data/home";
import { fmt, formatDate, getDictionary, isoDate, type Lang } from "@/lib/i18n";
import { contentTrustStrings, ctDataLabel } from "@/lib/i18n/areas/content-trust";
import { homeData, homeStrings, localityTileText, weeklyReportLabels } from "@/lib/i18n/areas/home";
import { tlData, topListsStrings } from "@/lib/i18n/areas/top-lists";
import { SITE_URL } from "@/lib/i18n/metadata";
import { localityName } from "@/lib/localities";
import { routes } from "@/lib/routes";

import { EventsBoard, HospitalsBoard, type EventItem, type HospitalItem } from "./boards";
import { EventRow, HospitalCard, NextCampCard, RecentCard, dataLang } from "./cards";
import { EVENT_FILTERS, placeText, storyKind, storyPlace, withQuery } from "./format";
import { HeroSearch } from "./hero-search";
import { HomePlaceProvider, PlaceSwitch, PlaceTabs, PlaceText, ShowPlaceButton } from "./place";
import { WeeklyReportSignup } from "./weekly-report-signup";

const DEFAULT_PLACE = "sector-56";

/** English queries behind the quick searches (the Hindi labels search with these). */
const QUICK_QUERIES = ["Paediatrician", "Open-now chemist", "Home sample collection", "Physiotherapy at home", "Dentist on Sunday"];

export type HomeViewProps = {
  lang: Lang;
  data: Homepage;
  /** A verified society page to show "how it works" (Healthy Neighbourhoods), if there is one. */
  exampleSociety: string | null;
};

export function HomeView({ lang, data, exampleSociety }: HomeViewProps) {
  const names = Object.fromEntries(HOME_PLACES.map((slug) => [slug, localityName(slug, lang)]));
  return (
    <HomePlaceProvider defaultPlace={DEFAULT_PLACE} names={names}>
      <WebsiteJsonLd lang={lang} />
      <Hero lang={lang} data={data} names={names} />
      <Browse lang={lang} />
      <TopListsBand lang={lang} data={data} />
      <Stories lang={lang} data={data} />
      <RecentlyVerified lang={lang} data={data} names={names} />
      <FeaturedHospitals lang={lang} data={data} names={names} />
      <Events lang={lang} data={data} />
      <Localities lang={lang} data={data} />
      <AskAndReport lang={lang} data={data} />
      <Guides lang={lang} data={data} />
      <HealthyNeighbourhoods lang={lang} exampleSociety={exampleSociety} />
      <GetInvolved lang={lang} />
      <WeeklyReport lang={lang} />
    </HomePlaceProvider>
  );
}

function WebsiteJsonLd({ lang }: { lang: Lang }) {
  const dict = getDictionary(lang);
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: dict.meta.siteName,
    url: `${SITE_URL}${routes.home(lang)}`,
    inLanguage: lang === "hi" ? "hi-IN" : "en-IN",
    description: dict.meta.description,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}${routes.search(lang)}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
  return <JsonLd data={data} />;
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ lang, data, names }: { lang: Lang; data: Homepage; names: Record<string, string> }) {
  const d = getDictionary(lang).home;
  const t = homeStrings(lang);
  const camps = Object.fromEntries(HOME_PLACES.map((slug) => [slug, <NextCampCard key={slug} lang={lang} place={names[slug]} e={data.nextCamp[slug] ?? null} />]));
  return (
    <section aria-labelledby="home-title" className="bg-cream">
      <Container className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,28.75rem),1fr))] items-center gap-10 pt-14 pb-15">
        <div className="flex min-w-0 flex-col gap-5.5">
          <span className="mono-label text-12 text-teal">{d.kicker}</span>
          <h1 id="home-title" className="text-44 leading-[1.02] font-bold tracking-display text-balance sm:text-56 sm:hi:text-52">
            {d.h1}
          </h1>
          <p className="max-w-[33.75rem] text-18 leading-[1.6] font-light text-pretty text-muted">{d.sub}</p>
          <HeroSearch
            action={routes.search(lang)}
            labels={{ searchLabel: d.searchLabel, localityLabel: d.localityLabel, searchPh: d.searchPh, search: d.search, emptyQuery: d.emptyQuery, quickLabel: t.quickLabel }}
            localities={[...HOME_SEARCH_LOCALITIES]}
            quick={d.quickSearches.map((label, i) => ({ label, q: QUICK_QUERIES[i] ?? label }))}
          />
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-13.5 font-light text-muted">
            <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-success text-11 font-bold text-white">
              ✓
            </span>
            {d.trust}
            <Link href={routes.trust(lang, "verification")} className="inline-flex min-h-11 items-center font-medium">
              {d.howVerify} →
            </Link>
          </p>
        </div>
        <div className="relative min-h-[26.25rem] overflow-hidden rounded-28 bg-stripes">
          <span className="absolute top-4.5 left-5 max-w-[calc(100%-2.5rem)] rounded-6 bg-cream px-2 py-1 font-mono text-11.5 text-subtle">{d.heroPhoto}</span>
          <PlaceSwitch panels={camps} />
        </div>
      </Container>
    </section>
  );
}

// ── Browse healthcare ────────────────────────────────────────────────────────

function Browse({ lang }: { lang: Lang }) {
  const d = getDictionary(lang).home;
  const c = d.categories;
  const t = homeStrings(lang);
  const search = (p: Record<string, string>) => routes.search(lang, p);
  const facilities = (p: { type?: string; ownership?: string }) => routes.facilities(lang, p);
  const tiles: { item: { name: string; desc: string }; href: string }[] = [
    { item: c.doctors, href: search({ kind: "doctor" }) },
    { item: c.hospitals, href: search({ kind: "hospital" }) },
    { item: c.clinics, href: search({ kind: "clinic" }) },
    { item: c.diagnostics, href: search({ kind: "lab" }) },
    { item: c.imaging, href: search({ q: "imaging" }) },
    { item: c.dental, href: search({ q: "dentist" }) },
    { item: c.physiotherapy, href: search({ q: "physiotherapy" }) },
    { item: c.mentalHealth, href: routes.specialty(lang, "mental-health") },
    { item: c.homeHealthcare, href: search({ q: "home healthcare" }) },
    { item: c.chemists, href: search({ q: "24-hour chemist" }) },
    { item: c.bloodBanks, href: routes.emergency(lang, "blood-banks") },
    { item: c.vaccination, href: search({ q: "vaccination" }) },
    { item: c.governmentHospitals, href: facilities({ ownership: "government" }) },
    { item: c.nursingHomes, href: facilities({ type: "nursing-home" }) },
    { item: c.transitionCare, href: facilities({ type: "transition-care" }) },
    { item: c.hospice, href: facilities({ type: "hospice-palliative" }) },
  ];
  return (
    <section aria-labelledby="home-browse">
      <Container className="flex flex-col gap-5.5 pt-14 pb-6">
        <SectionHeader id="home-browse" title={d.browse} action={<ArrowLink href={routes.search(lang)}>{d.allServices.replace(/\s*→$/, "")}</ArrowLink>} />
        <ul aria-label={t.categoriesLabel} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,11.25rem),1fr))] gap-3">
          {tiles.map(({ item, href }) => (
            <li key={item.name} className="flex">
              <Link
                href={href}
                className="flex min-h-26 w-full flex-col gap-1.5 rounded-18 border-[1.5px] border-transparent bg-cream p-4.5 text-ink transition-colors hover:border-teal hover:bg-white hover:text-ink"
              >
                <span aria-hidden="true" className="size-2.5 rounded-full bg-saffron" />
                <span className="text-15.5 font-semibold tracking-snug">{item.name}</span>
                <span className="text-12.5 leading-[1.4] font-light text-subtle">{item.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ── Top lists ────────────────────────────────────────────────────────────────

const BANDS: Record<string, string> = {
  DOCTORS: "bg-teal text-white",
  HOSPITALS: "bg-saffron text-ink",
  "CARE CENTRES": "bg-caution text-white",
  DIAGNOSTICS: "bg-gov text-white",
  GOVERNMENT: "bg-gov text-white",
};

function monthYear(lang: Lang, iso: string): string {
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" }).format(new Date(iso));
}

function TopListsBand({ lang, data }: { lang: Lang; data: Homepage }) {
  const d = getDictionary(lang).home;
  const t = homeStrings(lang);
  const tl = topListsStrings(lang);
  const latest = data.topLists.map((l) => l.updatedAt).sort().at(-1);
  const chips: { label: string; href: string }[] = [
    { label: d.facilityTypes.government, href: routes.facilities(lang, { ownership: "government" }) },
    { label: d.facilityTypes.private, href: routes.facilities(lang, { ownership: "private" }) },
    { label: d.facilityTypes.charitable, href: routes.facilities(lang, { ownership: "charitable" }) },
    { label: d.facilityTypes.nursingHomes, href: routes.facilities(lang, { type: "nursing-home" }) },
    { label: d.facilityTypes.transitionCare, href: routes.facilities(lang, { type: "transition-care" }) },
    { label: d.facilityTypes.hospice, href: routes.facilities(lang, { type: "hospice-palliative" }) },
    { label: d.facilityTypes.dialysis, href: routes.facilities(lang, { type: "dialysis-centre" }) },
  ];
  return (
    <section aria-labelledby="home-top" className="on-dark mt-8 bg-ink text-cream">
      <Container className="flex flex-col gap-5.5 py-13">
        <SectionHeader
          id="home-top"
          tone="dark"
          size="xl"
          kicker={latest ? fmt(d.topLists.kicker, { month: monthYear(lang, latest) }) : undefined}
          title={d.topLists.title}
          description={<span className="text-15 leading-[1.6] text-on-dark">{d.topLists.desc}</span>}
          action={
            <ButtonLink href={routes.topLists(lang)} variant="saffron" size="md">
              {d.topLists.cta}
            </ButtonLink>
          }
        />
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15.625rem),1fr))] gap-3.5">
          {data.topLists.map((l) => (
            <li key={l.slug} className="flex">
              <Link
                href={routes.topList(lang, l.slug)}
                className="flex w-full flex-col overflow-hidden rounded-22 bg-white text-ink transition-shadow hover:text-ink hover:ring-2 hover:ring-saffron"
              >
                <span className={`flex items-end justify-between gap-2 px-4.5 pt-4 pb-3 ${BANDS[l.bandGroup] ?? BANDS.DOCTORS}`}>
                  <span className="text-36 leading-none font-bold tracking-[-0.05em]">{fmt(t.topN, { n: l.countLabel })}</span>
                  <span className="mono-label text-10">{tl.hub.bands[l.bandGroup] ?? l.bandGroup}</span>
                </span>
                <span className="flex flex-col gap-1.25 px-4.5 pt-3.5 pb-4.5">
                  <span className="text-16.5 leading-[1.3] font-semibold tracking-card">{tlData(lang, l.title)}</span>
                  <span className="text-12.5 font-light text-muted">{tlData(lang, l.hubMeta)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <ul aria-label={t.facilityChipsLabel} className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="inline-flex min-h-11 items-center rounded-pill border border-night-edge px-3.5 text-13 text-cream hover:border-cream hover:text-cream">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ── Patient stories ──────────────────────────────────────────────────────────

const STORY_TONES: Record<string, string> = { private: "bg-ink text-cream", government: "bg-gov text-white", charitable: "bg-caution text-white" };

function Stories({ lang, data }: { lang: Lang; data: Homepage }) {
  const d = getDictionary(lang).home.stories;
  const t = homeStrings(lang);
  const tl = topListsStrings(lang);
  if (data.stories.length === 0) return null;
  return (
    <section aria-labelledby="home-stories">
      <Container className="flex flex-col gap-5.5 pt-13 pb-3">
        <SectionHeader
          id="home-stories"
          title={d.title}
          description={d.desc}
          action={
            <>
              <ButtonLink href={routes.stories(lang)} variant="outline" size="sm">
                {d.all}
              </ButtonLink>
              <ButtonLink href={withQuery(routes.stories(lang), { share: 1 })} variant="primary" size="sm">
                {d.share}
              </ButtonLink>
            </>
          }
        />
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.75rem),1fr))] gap-3.5">
          {data.stories.map((s) => {
            const own = tl.ownership[s.ownership] ?? s.ownershipLabel;
            const kind = storyKind(s.meta);
            const kindText = kind ? tlData(lang, kind) : null;
            const tag = kindText && kindText.toLowerCase() !== own.toLowerCase() ? `${own} · ${kindText}` : own;
            const title = tlData(lang, s.title);
            return (
              <li key={s.slug} className="flex">
                <Link
                  href={withQuery(routes.stories(lang), { story: s.slug })}
                  aria-label={fmt(t.storyAria, { title, duration: s.duration })}
                  className="group flex w-full flex-col gap-2.25 text-ink hover:text-ink"
                >
                  <span className="relative block aspect-[4/5] rounded-20 bg-[repeating-linear-gradient(135deg,#e3d6c0_0_12px,#ecdfca_12px_24px)] transition-shadow group-hover:ring-2 group-hover:ring-teal">
                    <span className="absolute top-2.5 left-2.5 max-w-[calc(100%-1.25rem)] truncate rounded-5 bg-cream px-1.75 py-0.75 font-mono text-10 text-subtle">
                      {fmt(t.storyVideo, { place: placeText(lang, storyPlace(s.who)) })}
                    </span>
                    <span aria-hidden="true" className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-18 text-saffron">
                      ▶
                    </span>
                    {s.duration && <span className="absolute right-2.5 bottom-2.5 rounded-5 bg-ink px-1.75 py-0.75 font-mono text-11 font-medium text-cream">{s.duration}</span>}
                  </span>
                  <span className="text-15 leading-[1.35] font-semibold">{title}</span>
                  <span className={`self-start rounded-pill px-2.5 py-0.75 text-11.5 font-semibold ${STORY_TONES[s.ownership] ?? STORY_TONES.private}`}>{tag}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

// ── Recently verified near … ─────────────────────────────────────────────────

function RecentlyVerified({ lang, data, names }: { lang: Lang; data: Homepage; names: Record<string, string> }) {
  const d = getDictionary(lang).home.recentlyVerified;
  const t = homeStrings(lang);
  const panels: Record<string, ReactNode> = Object.fromEntries(
    HOME_PLACES.map((slug) => {
      const cards = data.recentlyVerified[slug] ?? [];
      const panel =
        cards.length > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.875rem),1fr))] gap-3.5">
            {cards.map((c) => (
              <li key={c.slug} className="flex">
                <RecentCard lang={lang} card={c} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-20 bg-cream p-7">
            <div className="flex max-w-[38.75rem] flex-col gap-1.5">
              <p className="text-18 font-semibold">{fmt(d.emptyTitle, { place: names[slug] })}</p>
              <p className="text-14.5 leading-[1.55] font-light text-muted">{d.emptyBody}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {slug !== DEFAULT_PLACE && (
                <ShowPlaceButton
                  slug={DEFAULT_PLACE}
                  className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-ink bg-white px-4 text-14 text-ink hover:bg-cream"
                >
                  {fmt(d.showPlace, { place: names[DEFAULT_PLACE] })}
                </ShowPlaceButton>
              )}
              <ButtonLink href={routes.suggestListing(lang, { locality: slug })} variant="primary" size="sm" className="text-14">
                {d.suggestListing}
              </ButtonLink>
            </div>
          </div>
        );
      return [slug, panel];
    }),
  );
  return (
    <section aria-labelledby="home-recent">
      <Container className="flex flex-col gap-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="home-recent" className="text-26 font-bold tracking-h2 sm:text-30">
              <PlaceText template={d.title} />
            </h2>
            <p className="text-14.5 font-light text-subtle">
              {d.desc} <Link href={routes.trust(lang, "ordering")}>{d.howOrder}</Link>
            </p>
          </div>
          <PlaceTabs tabs={[...HOME_LOCALITY_TABS]} label={t.tabsLabel} />
        </div>
        <p role="status" className="sr-only">
          <PlaceText template={t.showingNear} />
        </p>
        <PlaceSwitch panels={panels} />
      </Container>
    </section>
  );
}

// ── Featured hospitals ───────────────────────────────────────────────────────

function FeaturedHospitals({ lang, data, names }: { lang: Lang; data: Homepage; names: Record<string, string> }) {
  const dict = getDictionary(lang);
  const d = dict.home.featuredHospitals;
  const t = homeStrings(lang);
  const tl = topListsStrings(lang);
  const panels: Record<string, HospitalItem[]> = Object.fromEntries(
    HOME_PLACES.map((slug) => [
      slug,
      (data.featuredHospitals[slug] ?? []).map((h) => ({
        key: h.provider.slug,
        ownership: h.ownership,
        sponsored: h.sponsored,
        node: h.sponsored ? (
          <SponsoredBox lang={lang} label={dict.badges.sponsored} className="w-full">
            <HospitalCard lang={lang} h={h} />
          </SponsoredBox>
        ) : (
          <HospitalCard lang={lang} h={h} />
        ),
      })),
    ]),
  );
  const ownership = Object.fromEntries(
    (["private", "government", "charitable"] as const).map((o) => [o, { chip: dict.badges.ownership[o], lower: tl.ownershipLower[o] ?? o }]),
  );
  return (
    <section aria-labelledby="home-hospitals">
      <Container className="flex flex-col gap-5 pt-8 pb-2">
        <HospitalsBoard
          headingId="home-hospitals"
          panels={panels}
          names={names}
          defaultPlace={DEFAULT_PLACE}
          labels={{
            kicker: d.kicker,
            title: d.title,
            desc: d.desc,
            filterLabel: t.ownershipLabel,
            all: d.all,
            noneOfType: d.noneOfType,
            showAll: d.showAll,
            noFeatured: t.noFeatured,
            allHospitals: d.allHospitals,
            allHospitalsHref: routes.facilities(lang),
            ownership,
          }}
        />
        <p className="text-12 leading-[1.55] font-light text-subtle">
          {d.note}{" "}
          <Link href={routes.facilities(lang)} className="inline-flex min-h-11 items-center">
            {d.allHospitals}
          </Link>
        </p>
      </Container>
    </section>
  );
}

// ── Health camps & events ────────────────────────────────────────────────────

function Events({ lang, data }: { lang: Lang; data: Homepage }) {
  const d = getDictionary(lang).home;
  const e = d.eventsSection;
  const t = homeStrings(lang);
  const items: EventItem[] = data.upcomingEvents.map((ev) => ({ key: ev.slug, type: ev.type, isFree: ev.isFree, node: <EventRow lang={lang} e={ev} /> }));
  return (
    <section aria-labelledby="home-events" className="mt-6 bg-cream">
      <Container className="flex flex-col gap-5.5 py-14">
        <SectionHeader
          id="home-events"
          title={d.events}
          description={e.desc}
          action={
            <>
              <ButtonLink href={routes.events(lang)} variant="outline" size="sm">
                {e.fullCalendar}
              </ButtonLink>
              <ButtonLink href={routes.submitEvent(lang)} variant="dark" size="sm">
                {e.submit}
              </ButtonLink>
            </>
          }
        />
        <EventsBoard
          items={items}
          filters={EVENT_FILTERS.map((key) => ({ key, label: e.filters[key] }))}
          labels={{ filterLabel: t.eventsLabel, none: t.noEvents, noneLink: t.noEventsLink, noneHref: routes.events(lang) }}
        />
      </Container>
    </section>
  );
}

// ── Healthcare by locality ───────────────────────────────────────────────────

function Localities({ lang, data }: { lang: Lang; data: Homepage }) {
  const d = getDictionary(lang).home;
  const t = homeStrings(lang);
  return (
    <section aria-labelledby="home-localities">
      <Container className="flex flex-col gap-5.5 pt-14 pb-6">
        <SectionHeader
          id="home-localities"
          title={d.localities}
          description={d.localitiesSection.desc}
          action={<ArrowLink href={routes.localities(lang)}>{d.localitiesSection.all.replace(/\s*→$/, "")}</ArrowLink>}
        />
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,11.875rem),1fr))] gap-3">
          {data.localityTiles.map((l) => {
            const text = localityTileText(lang, l);
            return (
              <li key={l.slug} className="flex">
                <Link
                  href={routes.locality(lang, l.slug)}
                  className="flex w-full flex-col overflow-hidden rounded-20 border border-line text-ink transition-colors hover:border-ink hover:text-ink"
                >
                  <span className="flex h-23 items-end bg-stripes p-2">
                    <span className="rounded-4 bg-cream px-1.5 py-0.5 font-mono text-10 text-subtle">{fmt(t.photo, { photo: text.photo })}</span>
                  </span>
                  <span className="flex flex-col gap-1 p-3.5">
                    <span className="text-15.5 font-semibold tracking-snug">{localityName(l.slug, lang)}</span>
                    <span className="text-12.5 leading-[1.4] font-light text-subtle">{text.desc}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

// ── Ask your neighbourhood + The Gurgaon Health Report ───────────────────────

const STATUS_TONE: Record<string, string> = { resolved: "text-success", answered: "text-teal", open: "text-caution" };

function AskAndReport({ lang, data }: { lang: Lang; data: Homepage }) {
  const d = getDictionary(lang).home;
  const a = d.askSection;
  const t = homeStrings(lang);
  const ct = contentTrustStrings(lang);
  return (
    <Container className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,28.75rem),1fr))] gap-6 py-10">
        <section aria-labelledby="home-ask" className="flex flex-col gap-4 rounded-24 border border-line bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="home-ask" className="text-24 font-bold tracking-h3">
              {d.ask}
            </h2>
            <ButtonLink href={routes.ask(lang)} variant="primary" size="sm">
              {a.cta}
            </ButtonLink>
          </div>
          <ul className="flex flex-col">
            {data.questions.map((q) => {
              const status =
                q.status === "resolved"
                  ? { tone: "resolved", text: a.status.resolved }
                  : q.statusLabel.endsWith(" answered")
                    ? { tone: "answered", text: fmt(t.answered, { who: homeData(lang, q.statusLabel.replace(/ answered$/, "")) }) }
                    : q.replyCount === 0
                      ? { tone: "open", text: t.unanswered }
                      : { tone: "open", text: a.status.open };
              const replies = q.replyCount === 1 ? t.replyOne : fmt(a.replies, { count: q.replyCount });
              return (
                <li key={q.id} className="border-t border-line">
                  <Link href={routes.thread(lang, q.id)} className="flex flex-col gap-1.5 py-3.5 text-ink hover:text-teal">
                    <span lang={dataLang(lang)} className="text-15.5 leading-[1.4] font-medium">
                      {q.title}
                    </span>
                    <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-12.5 font-light text-subtle">
                      {q.areaLabel && <span>{placeText(lang, q.areaLabel)}</span>}
                      <span>· {replies}</span>
                      <span className={`font-semibold ${STATUS_TONE[status.tone]}`}>{status.text}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-line pt-3 text-12.5 leading-normal font-light text-subtle">
            {getDictionary(lang).disclaimers.community} <Link href={routes.community(lang)}>{a.guidelines}</Link>
          </p>
        </section>

        <section aria-labelledby="home-report" className="on-dark flex flex-col gap-4 rounded-24 bg-ink p-6 text-cream">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="home-report" className="text-24 font-bold tracking-h3">
              {d.healthReport.title}
            </h2>
            <ArrowLink href={routes.news(lang)} size="sm" tone="saffron">
              {d.healthReport.allUpdates.replace(/\s*→$/, "")}
            </ArrowLink>
          </div>
          <ul className="flex flex-col">
            {data.news.map((n) => (
              <li key={n.slug} className="border-t border-night-line">
                <Link href={routes.article(lang, n.slug)} className="flex flex-col gap-1.5 py-3.5 text-cream hover:text-saffron-soft">
                  <span className="flex flex-wrap items-center gap-2.5">
                    <span className="mono-label text-10.5 text-saffron">{ctDataLabel(ct, n.category)}</span>
                    <time dateTime={isoDate(n.publishedAt)} className="font-mono text-10.5 text-on-dark-muted uppercase">
                      {formatDate(lang, n.publishedAt)}
                    </time>
                  </span>
                  <span lang={dataLang(lang)} className="text-16 leading-[1.4] font-medium">
                    {n.title}
                  </span>
                  <span className="text-12.5 font-light text-on-dark-muted">{[n.sourceNote, ct.labels[n.label] ?? n.labelName].filter(Boolean).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
    </Container>
  );
}

// ── Local health guides ──────────────────────────────────────────────────────

function Guides({ lang, data }: { lang: Lang; data: Homepage }) {
  const d = getDictionary(lang);
  const ct = contentTrustStrings(lang);
  return (
    <section aria-labelledby="home-guides">
      <Container className="flex flex-col gap-5.5 pt-6 pb-14">
        <SectionHeader
          id="home-guides"
          title={d.home.guides}
          action={<ArrowLink href={routes.guides(lang)}>{d.home.guidesSection.library.replace(/\s*→$/, "")}</ArrowLink>}
        />
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-3.5">
          {data.guides.map((g) => {
            const meta = [g.reviewNote ? ctDataLabel(ct, g.reviewNote) : null, fmt(d.stamps.updated, { date: formatDate(lang, g.updatedAt, "monthYear") })].filter(Boolean).join(" · ");
            return (
              <li key={g.slug} className="flex">
                <Link
                  href={routes.guide(lang, g.slug)}
                  className="flex min-h-47.5 w-full flex-col gap-2.5 rounded-22 bg-cream p-5.5 text-ink transition-colors hover:bg-cream-deep hover:text-ink"
                >
                  <span className="mono-label text-10.5 text-teal">{ctDataLabel(ct, g.tag)}</span>
                  <span lang={dataLang(lang)} className="text-19 leading-[1.3] font-semibold tracking-title text-pretty">
                    {g.title}
                  </span>
                  <span className="mt-auto text-12.5 font-light text-subtle">{meta}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

// ── Healthy Neighbourhoods ───────────────────────────────────────────────────

function HealthyNeighbourhoods({ lang, exampleSociety }: { lang: Lang; exampleSociety: string | null }) {
  const r = getDictionary(lang).home.rwa;
  return (
    <section aria-labelledby="home-rwa" className="bg-teal text-white">
      <Container className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,26.25rem),1fr))] items-center gap-10 py-15">
        <div className="flex flex-col gap-4.5">
          <span className="self-start rounded-pill bg-cream px-3 py-1.25 text-12.5 font-semibold text-ink">{r.badge}</span>
          <h2 id="home-rwa" className="text-30 leading-[1.08] font-bold tracking-h1 text-pretty sm:text-38">
            {r.title}
          </h2>
          <p className="max-w-[33.75rem] text-16.5 leading-[1.6] font-light text-teal-tint">{r.body}</p>
          <div className="flex flex-wrap gap-2.5">
            <ButtonLink href={`${routes.healthyNeighbourhoods(lang)}#rwaform`} variant="cream" size="lg" className="text-15">
              {r.register}
            </ButtonLink>
            <ButtonLink href={exampleSociety ? routes.society(lang, exampleSociety) : routes.healthyNeighbourhoods(lang)} variant="outlineLight" size="lg" className="text-15">
              {r.how}
            </ButtonLink>
          </div>
        </div>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3">
          {r.steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2.5 rounded-20 bg-teal-dark p-5">
              <span aria-hidden="true" className="flex size-8.5 items-center justify-center rounded-full bg-saffron font-bold text-ink">
                {i + 1}
              </span>
              <span className="text-16 font-semibold">{s.title}</span>
              <span className="text-13 leading-normal font-light text-teal-tint">{s.desc}</span>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

// ── Help keep Gurugram's health information right ────────────────────────────

function GetInvolved({ lang }: { lang: Lang }) {
  const d = getDictionary(lang).home;
  const v = d.involve;
  const cards = [
    { ...v.champion, href: routes.volunteer(lang) },
    { ...v.correction, href: routes.search(lang, { intent: "report" }) },
    { ...v.claim, href: routes.search(lang, { intent: "claim" }) },
  ];
  return (
    <section aria-labelledby="home-involved" id="involved">
      <Container className="flex flex-col gap-5.5 py-14">
        <h2 id="home-involved" className="text-26 font-bold tracking-h2 sm:text-30">
          {d.involved}
        </h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.25rem),1fr))] gap-3.5">
          {cards.map((c) => (
            <li key={c.title} className="flex">
              <Link href={c.href} className="flex w-full flex-col gap-2.5 rounded-22 border-[1.5px] border-line p-5.5 text-ink transition-colors hover:border-ink hover:text-ink">
                <span className="mono-label text-10.5 text-caution">{c.who}</span>
                <span className="text-19 font-semibold tracking-title">{c.title}</span>
                <span className="text-13.5 leading-[1.55] font-light text-muted">{c.desc}</span>
                <span className="mt-auto text-14 font-medium text-teal">{c.cta} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ── The weekly Gurgaon Health Report, on WhatsApp ────────────────────────────

function WeeklyReport({ lang }: { lang: Lang }) {
  const w = getDictionary(lang).home.whatsapp;
  return (
    <section aria-labelledby="home-weekly">
      <Container className="mb-14">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,23.75rem),1fr))] items-center gap-6 rounded-28 bg-cream p-6 sm:p-8">
          <div className="flex flex-col gap-2">
            <h2 id="home-weekly" className="text-24 font-bold tracking-h3 sm:text-26">
              {w.title}
            </h2>
            <p className="text-14.5 leading-[1.55] font-light text-muted">{w.desc}</p>
          </div>
          <WeeklyReportSignup lang={lang} from="homepage" labels={weeklyReportLabels(lang)} />
        </div>
      </Container>
    </section>
  );
}
