// /gurgaon/facilities: hospitals & care centres by ownership and type. Prototype: "Health Gurgaon
// Top Lists and Stories.dc.html" #facilities. The ownership and type cards are links
// (?ownership=&type=), so the filters work without JavaScript.

import Link from "next/link";

import { OwnershipBadge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { JsonLd } from "@/components/ui/json-ld";
import type { FacilityCatalogue } from "@/lib/data/top-lists";
import { formatDate, getDictionary, type Lang } from "@/lib/i18n";
import { facilityCountTitle, tlData, topListsStrings } from "@/lib/i18n/areas/top-lists";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { Kicker, TypePill, breadcrumbLd } from "./bits";
import { FACILITY_OWNERSHIPS, TRANSITION_TYPES, fill, filterFacilities, type FacilityFilters } from "./format";

const cardBase = "flex h-full flex-col gap-1.25 rounded-18 p-3.5 text-left text-ink hover:text-ink";
const cardOff = "border-[1.5px] border-line bg-white hover:border-ink";
const cardOn = "border-2 border-teal bg-[#F2FAF7]";

export function FacilitiesHeader({ lang }: { lang: Lang }) {
  const t = topListsStrings(lang);
  const dict = getDictionary(lang);
  return (
    <section className="bg-cream">
      <JsonLd
        data={breadcrumbLd([
          { name: dict.breadcrumbs.home, url: `${SITE_URL}${routes.home(lang)}` },
          { name: dict.pages.facilities.title, url: `${SITE_URL}${routes.facilities(lang)}` },
        ])}
      />
      <div className="mx-auto flex w-full max-w-page flex-col gap-3.5 px-6 py-8">
        <Kicker>{t.facilities.kicker}</Kicker>
        <h1 className="text-36 leading-[1.04] font-bold tracking-display text-balance sm:text-44">{t.facilities.title}</h1>
        <p className="max-w-[47.5rem] text-16 leading-[1.6] font-light text-muted">{t.facilities.intro}</p>
      </div>
    </section>
  );
}

export function FacilitiesBody({ lang, catalogue, filters }: { lang: Lang; catalogue: FacilityCatalogue; filters: FacilityFilters }) {
  const t = topListsStrings(lang);
  const all = catalogue.facilities;
  const shown = filterFacilities(all, filters);
  const type = filters.type ? (catalogue.types.find((x) => x.slug === filters.type) ?? null) : null;
  const href = (p: FacilityFilters) => routes.facilities(lang, { ownership: p.ownership ?? undefined, type: p.type ?? undefined });
  const showTransition = !!filters.type && (TRANSITION_TYPES as readonly string[]).includes(filters.type);

  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-6.5 px-6 pt-7 pb-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: t.facilities.title,
          numberOfItems: shown.length,
          itemListElement: shown.map((f, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "MedicalOrganization",
              name: f.name,
              url: `${SITE_URL}${routes.provider(lang, f.provider.profileKind, f.provider.slug)}`,
              ...(f.place ? { address: { "@type": "PostalAddress", addressLocality: "Gurugram", streetAddress: f.place, addressRegion: "Haryana", addressCountry: "IN" } } : {}),
            },
          })),
        }}
      />
      <nav aria-labelledby="fac-ownership" className="flex flex-col gap-2.5">
        <h2 id="fac-ownership" className="mono-label text-10.5 text-subtle">
          {t.facilities.ownership}
        </h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,12.5rem),1fr))] gap-2.5">
          {[null, ...FACILITY_OWNERSHIPS].map((o) => {
            const on = filters.ownership === o;
            const n = o ? all.filter((f) => f.ownership === o).length : all.length;
            return (
              <li key={o ?? "all"}>
                <Link href={href({ ownership: o, type: filters.type })} scroll={false} aria-current={on ? "true" : undefined} className={cn(cardBase, on ? cardOn : cardOff)}>
                  {o ? <OwnershipBadge ownership={o} lang={lang} size="md" className="self-start" /> : <span className="text-15 font-semibold">{t.facilities.allOwnership}</span>}
                  <span className="text-12.5 leading-[1.45] font-light text-muted">{o ? t.facilities.ownershipText[o] : t.facilities.allOwnershipText}</span>
                  <span className="font-mono text-11 font-medium text-subtle uppercase">{fill(t.facilities.listed, { n })}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav aria-labelledby="fac-type" className="flex flex-col gap-2.5">
        <h2 id="fac-type" className="mono-label text-10.5 text-subtle">
          {t.facilities.type}
        </h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.125rem),1fr))] gap-2.5">
          {catalogue.types.map((ty) => {
            const on = filters.type === ty.slug;
            const n = all.filter((f) => f.type.slug === ty.slug).length;
            return (
              <li key={ty.slug}>
                <Link
                  href={href({ ownership: filters.ownership, type: on ? null : ty.slug })}
                  scroll={false}
                  aria-current={on ? "true" : undefined}
                  className={cn(cardBase, on ? cardOn : cardOff)}
                >
                  <span className="text-15 font-semibold">{tlData(lang, ty.name)}</span>
                  {ty.description && <span className="text-12.5 leading-[1.45] font-light text-muted">{tlData(lang, ty.description)}</span>}
                  <span className="font-mono text-11 font-medium text-subtle uppercase">{fill(t.facilities.listed, { n })}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {showTransition && (
        <aside aria-labelledby="fac-transition" className="on-dark grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-4.5 rounded-22 bg-ink p-5.5 text-cream">
          <div className="flex flex-col gap-2">
            <span className="mono-label text-10.5 text-saffron">{t.facilities.transitionKicker}</span>
            <h2 id="fac-transition" className="text-19 leading-[1.3] font-semibold">
              {t.facilities.transitionTitle}
            </h2>
            <p className="text-13.5 leading-[1.6] font-light text-on-dark">{t.facilities.transitionText}</p>
          </div>
          <div className="flex flex-col gap-1.5 text-13.5 leading-[1.6] font-light text-on-dark">
            <h3 className="font-semibold text-cream">{t.facilities.transitionAsk}</h3>
            <p>{t.facilities.transitionQuestions}</p>
          </div>
          <Link href={routes.guide(lang, "choosing-transition-care")} className="inline-flex min-h-11 items-center self-end font-medium text-saffron hover:text-cream">
            {t.facilities.transitionGuide}
          </Link>
        </aside>
      )}

      <section aria-labelledby="fac-results" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2.5">
          <h2 id="fac-results" aria-live="polite" className="text-22 font-semibold tracking-title">
            {facilityCountTitle(t, lang, shown.length, filters.ownership, type)}
          </h2>
          {(filters.ownership || filters.type) && (
            <Link href={routes.facilities(lang)} scroll={false} className="inline-flex min-h-11 items-center px-1.5 text-13.5">
              {t.facilities.clear}
            </Link>
          )}
        </div>
        {shown.length > 0 ? (
          <ul aria-label={t.facilities.listLabel} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18.75rem),1fr))] gap-3">
            {shown.map((f) => (
              <li key={f.provider.slug} className="flex">
                <Link
                  href={routes.provider(lang, f.provider.profileKind, f.provider.slug)}
                  className="flex w-full flex-col gap-2 rounded-20 border border-line bg-white p-4.5 text-ink transition-colors hover:border-ink hover:text-ink"
                >
                  <span className="flex flex-wrap gap-1.5">
                    <OwnershipBadge ownership={f.ownership} lang={lang} />
                    <TypePill>{tlData(lang, f.type.name)}</TypePill>
                  </span>
                  <span className="text-16.5 font-semibold tracking-snug">{f.name}</span>
                  {f.place && <span className="text-13 font-light text-muted">{fill(t.common.place, { place: tlData(lang, f.place) })}</span>}
                  {f.facts.length > 0 && (
                    <span className="flex flex-wrap gap-x-2.5 gap-y-1 text-12 font-light text-ink-soft">
                      {f.facts.map((x) => (
                        <span key={x}>· {tlData(lang, x)}</span>
                      ))}
                    </span>
                  )}
                  {f.facilityCheckedAt && <span className="font-mono text-10.5 text-success uppercase">{fill(t.facilities.checked, { month: formatDate(lang, f.facilityCheckedAt, "monthYear") })}</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-20 bg-cream p-5.5 text-15">
            {t.facilities.none}{" "}
            <Link href={routes.suggestListing(lang)} className="font-medium">
              {t.facilities.suggest}
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}
