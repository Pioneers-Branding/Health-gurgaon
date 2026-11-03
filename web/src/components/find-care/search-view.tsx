// /gurgaon/search: the search box, filters (all in the URL), sort, list/map, results, the
// sponsored listing kept apart, pagination, the no-results state and the ?intent=review|report
// banner. Request-time (reads searchParams and the session): render under <Suspense>.

import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { cn } from "@/components/ui/cn";
import { ChoiceChips } from "@/components/ui/form";
import { MapPlaceholder } from "@/components/ui/schematic-map";
import { SponsoredBox } from "@/components/ui/sponsored-box";
import { isSaved } from "@/lib/data/account";
import { getSearchCatalogue, runSearch } from "@/lib/data/search";
import { FEE_CEILINGS, FILTER_LANGUAGES, KIND_FILTERS } from "@/lib/domain";
import { fmt, formatNumber, formatRupees, type Lang } from "@/lib/i18n";
import { dataLabel, findCareStrings, type FindCareStrings } from "@/lib/i18n/areas/find-care";
import { getLocality, LOCALITIES, localityName } from "@/lib/localities";
import { routes } from "@/lib/routes";
import { parseSearchParams, toSearchQuery, type SearchOutcome, type SearchParams } from "@/lib/search";

import { AutoSubmitForm, SubmitOnChangeSelect } from "./auto-submit-form";
import { PhaseTag } from "./bits";
import { withParams } from "./format";
import { ProviderResultCard } from "./provider-card";
import { SuggestListingForm } from "./suggest-listing-form";

type Raw = Record<string, string | string[] | undefined>;

const FILTER_FORM_ID = "search-filters";
const OWNERSHIP_CHIPS = ["private", "government", "charitable"] as const;

function one(raw: Raw, key: string): string | null {
  const v = raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
}

/** The search URL for a set of parameters (keeps intent and view). */
function searchHref(lang: Lang, p: Partial<SearchParams>, extra: { intent?: string | null; view?: string | null; suggest?: boolean } = {}): string {
  const qs = toSearchQuery(p);
  const base = routes.search(lang);
  const href = qs ? `${base}?${qs}` : base;
  return withParams(href, { intent: extra.intent ?? null, view: extra.view ?? null, suggest: extra.suggest ?? null });
}

export async function SearchView({ lang, searchParams }: { lang: Lang; searchParams: Promise<Raw> }) {
  const raw = await searchParams;
  const t = findCareStrings(lang);
  const params = parseSearchParams(raw);
  const intentRaw = one(raw, "intent");
  const intent = intentRaw === "review" || intentRaw === "report" || intentRaw === "claim" ? intentRaw : null;
  const view = one(raw, "view") === "map" ? "map" : "list";
  const suggest = one(raw, "suggest") === "1";

  const [outcome, catalogue] = await Promise.all([runSearch(params), getSearchCatalogue()]);
  const p = outcome.params;
  const placeName = outcome.interpreted.locality ? localityName(outcome.interpreted.locality.slug, lang) : t.results.inGurugram;
  const currentHref = searchHref(lang, p, { intent, view });
  const signInHref = routes.account(lang, { next: currentHref });

  const cards = [...outcome.results, ...(outcome.sponsored ? [outcome.sponsored] : [])];
  const savedFlags = intent ? cards.map(() => false) : await Promise.all(cards.map((c) => isSaved("provider", c.slug)));
  const savedBySlug = new Map(cards.map((c, i) => [c.slug, savedFlags[i]]));

  const title = resultTitle(t, outcome, placeName, lang);
  const sortNote = sortNoteText(t, p.sort, !!outcome.sponsored);
  const clearHref = searchHref(lang, { q: p.q, locality: params.locality, sort: p.sort }, { intent, view });

  return (
    <>
      {intent && <IntentBanner lang={lang} t={t} intent={intent} params={p} />}

      {outcome.emergency.urgent && (
        <Callout tone="danger" live="polite" title={outcome.emergency.selfHarm ? t.results.selfHarm : t.results.urgent}>
          <p>
            <Link href={routes.emergency(lang)} className="font-medium">
              {t.results.seeEmergency}
            </Link>
          </p>
        </Callout>
      )}

      <SearchBox lang={lang} t={t} params={p} localityParam={params.locality} intent={intent} view={view} />

      {(outcome.didYouMean || outcome.interpreted.localityFromQuery) && (
        <div className="flex flex-col gap-1 text-14 font-light text-muted">
          {outcome.didYouMean && (
            <p>
              {t.results.didYouMean}{" "}
              <Link href={searchHref(lang, { ...p, q: outcome.didYouMean, page: 1 }, { intent, view })} className="font-medium">
                “{outcome.didYouMean}”
              </Link>
              ?
            </p>
          )}
          {outcome.interpreted.localityFromQuery && outcome.interpreted.locality && (
            <p>
              {fmt(t.results.localityFromQuery, { place: placeName })}{" "}
              <Link href={searchHref(lang, { ...p, locality: null, q: p.q, page: 1 }, { intent, view })} className="font-medium">
                {t.results.allOfGurugram}
              </Link>
            </p>
          )}
        </div>
      )}

      <div className="grid items-start gap-6 min-[876px]:grid-cols-3">
        <Filters lang={lang} t={t} params={p} localityParam={params.locality} intent={intent} view={view} clearHref={clearHref} facilityTypes={catalogue.facilityTypes} />

        <section aria-labelledby="search-results-title" className="flex min-w-0 flex-col gap-3.5 min-[876px]:col-span-2">
          {suggest && (
            <SuggestListingForm
              lang={lang}
              labels={t.suggest}
              defaultLocality={outcome.interpreted.locality ? localityName(outcome.interpreted.locality.slug, lang) : undefined}
              closeHref={searchHref(lang, p, { intent: null, view })}
            />
          )}

          {outcome.sponsored && (
            <SponsoredBox lang={lang}>
              <ProviderResultCard
                lang={lang}
                t={t}
                card={outcome.sponsored}
                saved={savedBySlug.get(outcome.sponsored.slug) ?? false}
                signInHref={signInHref}
                intent={intent}
                headingAs="p"
              />
            </SponsoredBox>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.75">
              <h1 id="search-results-title" className="text-26 leading-tight font-bold tracking-h3">
                {title}
              </h1>
              <p className="text-13 font-light text-subtle">{sortNote}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="contents">
                <span className="sr-only">{t.results.sort}</span>
                <SubmitOnChangeSelect
                  key={p.sort}
                  form={FILTER_FORM_ID}
                  name="sort"
                  defaultValue={p.sort}
                  className="min-h-11 cursor-pointer rounded-pill border-[1.5px] border-line-strong bg-white px-3 text-13.5"
                >
                  <option value="fresh">{t.results.sortOptions.fresh}</option>
                  <option value="dist">{t.results.sortOptions.dist}</option>
                  <option value="name">{t.results.sortOptions.name}</option>
                </SubmitOnChangeSelect>
              </label>
              <nav aria-label={t.results.view} className="flex overflow-hidden rounded-pill border-[1.5px] border-line-strong">
                {(["list", "map"] as const).map((v) => (
                  <Link
                    key={v}
                    href={searchHref(lang, p, { intent, view: v === "map" ? "map" : null })}
                    scroll={false}
                    aria-current={view === v ? "true" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center px-4 text-13",
                      view === v ? "bg-ink text-cream hover:text-cream" : "bg-white text-ink hover:text-ink",
                    )}
                  >
                    {v === "list" ? t.results.list : t.results.map}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {view === "map" && <MapPlaceholder caption={t.results.mapCaption} />}

          {outcome.results.length > 0 ? (
            <ol className="flex flex-col gap-3">
              {outcome.results.map((card) => (
                <li key={card.slug} className="rounded-20 border border-line bg-white p-4.5">
                  <ProviderResultCard
                    lang={lang}
                    t={t}
                    card={card}
                    saved={savedBySlug.get(card.slug) ?? false}
                    signInHref={signInHref}
                    intent={intent}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <NoResults lang={lang} t={t} outcome={outcome} placeName={placeName} clearHref={clearHref} intent={intent} view={view} />
          )}

          {outcome.pageCount > 1 && (
            <nav aria-label={t.results.pagination} className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {outcome.page > 1 ? (
                <ButtonLink href={searchHref(lang, { ...p, page: outcome.page - 1 }, { intent, view })} variant="soft" size="sm">
                  {t.results.previous}
                </ButtonLink>
              ) : (
                <span />
              )}
              <span className="text-13 font-light text-subtle">{fmt(t.results.page, { page: outcome.page, count: outcome.pageCount })}</span>
              {outcome.page < outcome.pageCount ? (
                <ButtonLink href={searchHref(lang, { ...p, page: outcome.page + 1 }, { intent, view })} variant="soft" size="sm">
                  {t.results.next}
                </ButtonLink>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}

function resultTitle(t: FindCareStrings, outcome: SearchOutcome, place: string, lang: Lang): string {
  const n = outcome.total;
  const q = outcome.params.q;
  const count = formatNumber(lang, n);
  if (q) return fmt(n === 1 ? t.results.titleOne : t.results.titleMany, { count, q, place });
  return fmt(n === 1 ? t.results.titleOneNoQuery : t.results.titleManyNoQuery, { count, place });
}

function sortNoteText(t: FindCareStrings, sort: SearchParams["sort"], sponsored: boolean): string {
  const spon = sponsored ? t.results.sponsoredNote : "";
  if (sort === "fresh") return t.results.sortFresh + (spon || t.results.sortFreshSponsored);
  if (sort === "dist") return t.results.sortDist + spon;
  return t.results.sortName + spon;
}

/** Search box: query, locality and Search (a GET form; filters ride along as hidden fields). */
export function SearchBox({
  lang,
  t,
  params,
  localityParam,
  intent,
  view,
}: {
  lang: Lang;
  t: FindCareStrings;
  params: SearchParams | null;
  localityParam: string | null;
  intent: string | null;
  view: string;
}) {
  const p = params;
  return (
    <form
      method="get"
      action={routes.search(lang)}
      role="search"
      className="flex max-w-[51.25rem] flex-wrap overflow-hidden rounded-20 border-2 border-ink bg-white focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-teal"
    >
      <label className="flex min-w-0 flex-[1_1_16.25rem]">
        <span className="sr-only">{t.search.label}</span>
        <input
          type="search"
          name="q"
          defaultValue={p?.q ?? ""}
          placeholder={t.search.placeholder}
          maxLength={120}
          className="min-h-13.5 w-full min-w-0 border-0 bg-white px-4.5 py-3.75 text-16 outline-none placeholder:font-light placeholder:text-subtle"
        />
      </label>
      <label className="flex min-w-0 flex-[1_1_12.5rem] border-t border-line sm:flex-[0_1_12.5rem] sm:border-t-0 sm:border-l">
        <span className="sr-only">{t.search.locality}</span>
        <select name="locality" defaultValue={localityParam ?? ""} className="min-h-13.5 w-full min-w-0 cursor-pointer border-0 bg-white px-3 text-15 outline-none">
          <option value="">{t.allGurugram}</option>
          {LOCALITIES.map((L) => (
            <option key={L.slug} value={L.slug}>
              {localityName(L.slug, lang)}
            </option>
          ))}
        </select>
      </label>
      {p?.kind && <input type="hidden" name="kind" value={p.kind} />}
      {p?.own && <input type="hidden" name="own" value={p.own} />}
      {p?.ftype && <input type="hidden" name="ftype" value={p.ftype} />}
      {p?.langs.map((l) => <input key={l} type="hidden" name="lang" value={l} />)}
      {p?.fee && <input type="hidden" name="fee" value={p.fee} />}
      {p?.open && <input type="hidden" name="open" value="1" />}
      {p?.wheelchair && <input type="hidden" name="wheelchair" value="1" />}
      {p?.female && <input type="hidden" name="female" value="1" />}
      {p?.homeVisits && <input type="hidden" name="homevisits" value="1" />}
      {p?.fresh && <input type="hidden" name="fresh" value="1" />}
      {p && p.sort !== "fresh" && <input type="hidden" name="sort" value={p.sort} />}
      {intent && <input type="hidden" name="intent" value={intent} />}
      {view === "map" && <input type="hidden" name="view" value="map" />}
      <button type="submit" className="min-h-13.5 flex-none bg-teal px-6 text-15.5 font-semibold text-white hover:bg-teal-dark">
        {t.search.submit}
      </button>
    </form>
  );
}

function Filters({
  lang,
  t,
  params: p,
  localityParam,
  intent,
  view,
  clearHref,
  facilityTypes,
}: {
  lang: Lang;
  t: FindCareStrings;
  params: SearchParams;
  localityParam: string | null;
  intent: string | null;
  view: string;
  clearHref: string;
  facilityTypes: { slug: string; name: string }[];
}) {
  const f = t.filters;
  const key = toSearchQuery(p);
  return (
    <aside aria-labelledby="filters-title" className="flex w-full flex-col gap-5 rounded-20 bg-cream p-5 min-[876px]:max-w-[21.25rem]">
      <div className="flex items-center justify-between">
        <h2 id="filters-title" className="text-16 font-semibold">
          {f.title}
        </h2>
        <Link href={clearHref} scroll={false} className="inline-flex min-h-11 items-center px-1.5 text-13">
          {f.clear}
        </Link>
      </div>
      <AutoSubmitForm key={key} id={FILTER_FORM_ID} action={routes.search(lang)} label={f.title} submitLabel={f.apply} className="flex flex-col gap-5">
        {p.q && <input type="hidden" name="q" value={p.q} />}
        {localityParam && <input type="hidden" name="locality" value={localityParam} />}
        {intent && <input type="hidden" name="intent" value={intent} />}
        {view === "map" && <input type="hidden" name="view" value="map" />}
        {p.female && <input type="hidden" name="female" value="1" />}
        {p.homeVisits && <input type="hidden" name="homevisits" value="1" />}

        <ChoiceChips
          name="kind"
          legend={f.type}
          legendStyle="mono"
          defaultValue={p.kind ?? "all"}
          options={[{ value: "all", label: t.kinds.all }, ...KIND_FILTERS.map((k) => ({ value: k.key, label: t.kinds[k.key] }))]}
        />
        <ChoiceChips
          name="own"
          legend={f.ownership}
          legendStyle="mono"
          defaultValue={p.own ?? "all"}
          options={[{ value: "all", label: t.ownership.all }, ...OWNERSHIP_CHIPS.map((o) => ({ value: o, label: t.ownership[o] }))]}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-ftype" className="mono-label text-10.5 text-subtle">
            {f.facility}
          </label>
          <select
            id="filter-ftype"
            name="ftype"
            defaultValue={p.ftype ?? ""}
            className="min-h-11 cursor-pointer rounded-12 border-[1.5px] border-line-strong bg-white p-2.5 text-14"
          >
            <option value="">{f.allTypes}</option>
            {facilityTypes.map((ft) => (
              <option key={ft.slug} value={ft.slug}>
                {dataLabel(lang, ft.name)}
              </option>
            ))}
          </select>
          <Link href={routes.facilities(lang)} className="inline-flex min-h-11 items-center text-13.5 font-medium">
            {f.browseFacilities}
          </Link>
        </div>
        <fieldset className="flex flex-col gap-0">
          <legend className="mono-label mb-2 text-10.5 text-subtle">{f.language}</legend>
          {FILTER_LANGUAGES.map((l) => (
            <label key={l} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-14">
              <input type="checkbox" name="lang" value={l} defaultChecked={p.langs.includes(l)} className="size-4.5 flex-none cursor-pointer accent-teal" />
              {t.languages[l] ?? l}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-fee" className="mono-label text-10.5 text-subtle">
            {f.fee}
          </label>
          <select
            id="filter-fee"
            name="fee"
            defaultValue={p.fee ? String(p.fee) : ""}
            className="min-h-11 cursor-pointer rounded-12 border-[1.5px] border-line-strong bg-white p-2.5 text-14"
          >
            <option value="">{f.anyFee}</option>
            {FEE_CEILINGS.map((n) => (
              <option key={n} value={n}>
                {fmt(f.upTo, { amount: formatRupees(lang, n) })}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="flex flex-col gap-0">
          <legend className="mono-label mb-2.5 text-10.5 text-subtle">{f.access}</legend>
          {(
            [
              ["open", f.openNow, p.open],
              ["wheelchair", f.wheelchair, p.wheelchair],
              ["fresh", f.fresh, p.fresh],
            ] as const
          ).map(([name, label, on]) => (
            <label key={name} className="flex min-h-11 cursor-pointer items-center justify-between gap-2.5 text-14">
              {label}
              <input type="checkbox" name={name} value="1" defaultChecked={on} className="size-4.5 flex-none cursor-pointer accent-teal" />
            </label>
          ))}
        </fieldset>
        <p className="text-12 leading-normal font-light text-subtle">{f.note}</p>
      </AutoSubmitForm>
    </aside>
  );
}

function IntentBanner({ lang, t, intent, params }: { lang: Lang; t: FindCareStrings; intent: "review" | "report" | "claim"; params: SearchParams }) {
  const title = intent === "review" ? t.intent.reviewTitle : intent === "claim" ? t.intent.claimTitle : t.intent.reportTitle;
  const body = intent === "review" ? t.intent.reviewBody : intent === "claim" ? t.intent.claimBody : t.intent.reportBody;
  return (
    <Callout tone="info" live="polite" title={title} className="max-w-[51.25rem]">
      <p>
        {body}
        {intent !== "review" && (
          <>
            {" "}
            <Link href={routes.suggestListing(lang, { locality: params.locality ?? undefined })} className="font-medium">
              {t.intent.suggest}
            </Link>
          </>
        )}
      </p>
      <p>
        <Link href={searchHref(lang, params)} className="inline-flex min-h-11 items-center text-13.5 font-medium">
          {t.intent.cancel}
        </Link>
      </p>
    </Callout>
  );
}

function NoResults({
  lang,
  t,
  outcome,
  placeName,
  clearHref,
  intent,
  view,
}: {
  lang: Lang;
  t: FindCareStrings;
  outcome: SearchOutcome;
  placeName: string;
  clearHref: string;
  intent: string | null;
  view: string;
}) {
  const n = t.noResults;
  const nr = outcome.noResults;
  const p = outcome.params;
  const chip =
    "inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-line-strong bg-white px-3.25 text-13 text-ink hover:border-ink hover:text-ink";
  return (
    <div className="flex flex-col gap-5 rounded-24 bg-cream p-6 sm:p-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-24 leading-tight font-bold tracking-h3">{p.q ? fmt(n.title, { q: p.q, place: placeName }) : fmt(n.titleNoQuery, { place: placeName })}</h2>
        <p className="max-w-[40rem] text-15 leading-[1.6] font-light text-muted">{n.body}</p>
        {nr && nr.hiddenByFilters > 0 && (
          <p className="text-14 font-light text-ink-soft">
            {nr.hiddenByFilters === 1 ? n.hiddenOne : fmt(n.hidden, { count: formatNumber(lang, nr.hiddenByFilters) })}{" "}
            <Link href={clearHref} className="font-medium">
              {n.clearFilters}
            </Link>
          </p>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-3">
        {nr && nr.suggestions.length > 0 && (
          <div className="flex flex-col gap-2 rounded-18 bg-white p-4.5">
            <h3 className="font-semibold">{n.broader}</h3>
            <ul className="flex flex-wrap gap-1.5">
              {nr.suggestions.map((s) => (
                <li key={s.q}>
                  <Link href={searchHref(lang, { q: s.q }, { intent, view })} className={chip}>
                    {dataLabel(lang, s.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {nr && nr.nearbyLocalities.length > 0 && (
          <div className="flex flex-col gap-2 rounded-18 bg-white p-4.5">
            <h3 className="font-semibold">{n.nearby}</h3>
            <ul className="flex flex-wrap gap-1.5">
              {nr.nearbyLocalities.map((l) => (
                <li key={l.slug ?? "all"}>
                  <Link href={searchHref(lang, { ...p, locality: l.slug, page: 1 }, { intent, view })} className={chip}>
                    {l.slug && getLocality(l.slug) ? localityName(l.slug, lang) : t.allGurugram}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href={routes.suggestListing(lang, { locality: p.locality ?? undefined })} className="flex flex-col gap-1.5 rounded-18 bg-white p-4.5 text-ink hover:text-ink hover:ring-2 hover:ring-teal">
          <span className="font-semibold">{n.missingTitle}</span>
          <span className="text-13 font-light text-muted">{n.missingBody}</span>
          <span className="text-13.5 font-medium text-teal">{n.missingCta}</span>
        </Link>
        <Link href={routes.ask(lang, p.locality ? { locality: p.locality } : undefined)} className="flex flex-col gap-1.5 rounded-18 bg-white p-4.5 text-ink hover:text-ink hover:ring-2 hover:ring-teal">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{n.askTitle}</span>
            <PhaseTag>{n.phase2}</PhaseTag>
          </span>
          <span className="text-13 font-light text-muted">{n.askBody}</span>
          <span className="text-13.5 font-medium text-teal">{n.askCta}</span>
        </Link>
      </div>
      <p className="text-13 font-light text-muted">
        {n.urgentBefore}
        <b className="font-semibold text-ink">112</b>
        {n.urgentAfter}{" "}
        <Link href={routes.emergency(lang)} className="font-medium">
          {n.urgentLink}
        </Link>
      </p>
    </div>
  );
}
