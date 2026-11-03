"use client";

// The locality index's interactive part (prototype #localities): "Find your locality" search,
// the schematic map, the selected locality's summary and the list of every locality, with
// Follow on each. The search text and the selected locality live in the URL (?q=…&sel=…, kept
// up to date with history.replaceState once the reader changes them). Follow uses the account
// area's toggleFollow action; a signed-out reader gets a sign-in link that comes back here.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { suggestLocality } from "@/app/actions/events";
import { toggleFollow } from "@/app/actions/saved";
import { cn } from "@/components/ui/cn";
import { idle } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";
import { LOCALITIES, locText, searchLocalities } from "@/lib/localities";
import type { LocalEventsStrings } from "@/lib/i18n/areas/local-events";

import { fill, plural } from "./format";
import { LocalityMap, type MapPin } from "./locality-map";

export type ExplorerEvent = { slug: string; href: string; title: string; day: string; mon: string; verified: boolean; status: string };

export type ExplorerLocality = {
  slug: string;
  name: string;
  /** Shorter map label for narrow maps. */
  short: string | null;
  live: boolean;
  covers: string;
  coverage: { doctors: number; careFacilities: number; pharmaciesLabs: number; total: number };
  extra: string | null;
  /** "14 OCT 2026" */
  checked: string;
  editor: string | null;
  map: { x: number; y: number; side: "l" | "r" | "t" | "b" };
  events: ExplorerEvent[];
  href: string;
  searchHref: string;
  suggestHref: string;
};

type Strings = Pick<LocalEventsStrings, "index" | "follow" | "status">;

/** `signIn` is the sign-in page without a query; `?next=` is added here. */
export type ExplorerLinks = { calendar: string; submit: string; champion: string; accountSaved: string; signIn: string; base: string };

type FollowNote = { slug: string; where: "summary" | "card"; text: string; tone: "ok" | "signin" | "error" };

const followClasses = (on: boolean) =>
  cn(
    "inline-flex min-h-11 items-center justify-center rounded-pill border-[1.5px] px-4 text-13.5 font-medium transition-colors disabled:opacity-60",
    on ? "border-success bg-success-tint text-success" : "border-line-strong bg-white text-ink hover:border-ink",
  );

const pill44 = "inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-line-strong bg-white px-4 text-13.5 text-ink hover:border-ink";

function statusPill(live: boolean, label: string) {
  return (
    <span
      className={cn(
        "self-start rounded-pill px-2.5 py-0.75 text-12 leading-tight font-semibold",
        live ? "bg-success-tint text-success" : "border border-dashed border-sponsored bg-pending-tint text-caution",
      )}
    >
      {label}
    </span>
  );
}

export function LocalityExplorer({
  lang,
  t,
  localities,
  intro,
  footer,
  initialQuery,
  initialSel,
  followed,
  signedIn,
  links,
  minListings,
}: {
  lang: Lang;
  t: Strings;
  localities: ExplorerLocality[];
  /** The hero's left column (breadcrumb, h1, intro, stats line): server-rendered. */
  intro: ReactNode;
  /** The "Help your locality get its page" band. */
  footer: ReactNode;
  initialQuery: string;
  initialSel: string | null;
  /** Followed locality slugs (empty when signed out or not known yet). */
  followed: string[];
  /** null while the session isn't known (the static page). */
  signedIn: boolean | null;
  links: ExplorerLinks;
  minListings: number;
}) {
  const bySlug = useMemo(() => new Map(localities.map((l) => [l.slug, l])), [localities]);
  const [query, setQuery] = useState(initialQuery);
  const firstHit = (q: string) => searchLocalities(q.trim(), LOCALITIES).hits[0]?.locality.slug;
  const [sel, setSel] = useState<string>(() => (initialSel && bySlug.has(initialSel) ? initialSel : (initialQuery && firstHit(initialQuery)) || localities[0].slug));
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<FollowNote | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<{ q: string; message: string; ok: boolean } | null>(null);
  const [, startTransition] = useTransition();
  const touched = useRef(false);
  const scrollFrom = useRef<"pin" | "card" | "match" | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const q = query.trim();
  const hasQ = locText(q) !== "";
  const search = useMemo(() => searchLocalities(q, LOCALITIES), [q]);
  const hits = search.hits.filter((h) => bySlug.has(h.locality.slug));
  const hitSlugs = new Set(hits.map((h) => h.locality.slug));
  const dimmed = new Set(hasQ && hits.length ? localities.filter((l) => !hitSlugs.has(l.slug)).map((l) => l.slug) : []);
  const selected = bySlug.get(sel) ?? localities[0];
  const isOn = (slug: string) => (slug in overrides ? overrides[slug] : followed.includes(slug));
  const followCount = localities.filter((l) => isOn(l.slug)).length;

  // Keep ?q= and ?sel= in the URL once the reader has changed something.
  useEffect(() => {
    if (!touched.current) return;
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    sp.set("sel", sel);
    const url = `${links.base}?${sp.toString()}`;
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(window.history.state, "", url);
  }, [q, sel, links.base]);

  // Bring the summary into view after a selection (the prototype's showLocSummary).
  useEffect(() => {
    const how = scrollFrom.current;
    scrollFrom.current = null;
    const el = summaryRef.current;
    if (!how || !el) return;
    const header = document.querySelector("header");
    const hh = header ? header.getBoundingClientRect().height : 0;
    const top = el.getBoundingClientRect().top;
    const vh = window.innerHeight;
    if (how === "pin") {
      if (top > vh - 120) window.scrollBy({ top: top - vh * 0.5, behavior: "smooth" });
    } else if (top < hh + 8 || top > vh * 0.5) {
      window.scrollBy({ top: top - hh - 12, behavior: "smooth" });
    }
  }, [sel]);

  function pick(slug: string, how: "pin" | "card" | "match") {
    touched.current = true;
    scrollFrom.current = how;
    setSel(slug);
    if (slug === sel) scrollFrom.current = null;
  }

  function setQueryValue(v: string) {
    touched.current = true;
    setQuery(v);
    setSuggested(null);
    const matches = searchLocalities(v.trim(), LOCALITIES).hits.map((h) => h.locality.slug).filter((s) => bySlug.has(s));
    if (matches.length && !matches.includes(sel)) setSel(matches[0]);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (hasQ && hits.length) pick(hits[0].locality.slug, "match");
  }

  function toggle(slug: string, where: FollowNote["where"]) {
    const on = isOn(slug);
    if (signedIn === false) {
      setNote({ slug, where, text: t.follow.signIn, tone: "signin" });
      return;
    }
    setBusy(`${where}:${slug}`);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("kind", "locality");
      fd.set("targetId", slug);
      fd.set("want", on ? "unfollow" : "follow");
      fd.set("from", "page");
      fd.set("lang", lang);
      try {
        const res = await toggleFollow(idle, fd);
        if (res.status === "success") {
          setOverrides((o) => ({ ...o, [slug]: res.data?.following ?? !on }));
          setNote({ slug, where, text: res.message, tone: "ok" });
        } else if (res.status === "error" && res.code === "sign_in_required") {
          setNote({ slug, where, text: t.follow.signIn, tone: "signin" });
        } else if (res.status === "error") {
          setNote({ slug, where, text: res.message, tone: "error" });
        }
      } finally {
        setBusy(null);
      }
    });
  }

  function suggest() {
    const name = q;
    setBusy("suggest");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("lang", lang);
      try {
        const res = await suggestLocality(idle, fd);
        setSuggested({ q: name, message: res.status === "idle" ? "" : res.message, ok: res.status === "success" });
      } finally {
        setBusy(null);
      }
    });
  }

  const followHere = (slug: string) => `${links.base}?sel=${encodeURIComponent(slug)}`;

  function noteFor(slug: string, where: FollowNote["where"]) {
    if (!note || note.slug !== slug || note.where !== where) return null;
    return (
      <span
        role={note.tone === "error" ? "alert" : "status"}
        className={cn("basis-full text-13 leading-normal", note.tone === "ok" ? "text-success" : note.tone === "error" ? "font-medium text-emergency" : "font-light text-muted")}
      >
        {note.text}
        {note.tone === "signin" && (
          <>
            {" "}
            <Link href={`${links.signIn}?next=${encodeURIComponent(followHere(slug))}`} className="font-medium">
              {t.follow.signInLink}
            </Link>
          </>
        )}
      </span>
    );
  }

  const longStats = (l: ExplorerLocality) => {
    const s = t.index.long;
    return [
      [l.coverage.doctors, s.doctorsOne, s.doctorsMany],
      [l.coverage.careFacilities, s.careOne, s.careMany],
      [l.coverage.pharmaciesLabs, s.pharmOne, s.pharmMany],
      [l.events.length, s.eventsOne, s.eventsMany],
    ] as const;
  };
  const shortStats = (l: ExplorerLocality) => {
    const s = t.index.short;
    return [
      [l.coverage.doctors, s.doctorsOne, s.doctorsMany],
      [l.coverage.careFacilities, s.careOne, s.careMany],
      [l.coverage.pharmaciesLabs, s.pharmOne, s.pharmMany],
      [l.events.length, s.eventsOne, s.eventsMany],
    ] as const;
  };

  const pins: MapPin[] = localities.map((l) => ({
    slug: l.slug,
    name: l.name,
    short: l.short,
    live: l.live,
    x: l.map.x,
    y: l.map.y,
    side: l.map.side,
    aria: fill(l.live ? t.index.pinLive : t.index.pinThin, { name: l.name }),
  }));

  const near = hasQ && !hits.length ? search.near.filter((L) => bySlug.has(L.slug)) : [];
  const listed = hasQ && hits.length ? hits.map((h) => ({ l: bySlug.get(h.locality.slug)!, hit: h })) : localities.map((l) => ({ l, hit: null }));
  const matchNote = (h: (typeof hits)[number]) => (h.alias ? fill(t.index.matched, { alias: h.alias }) : h.sector ? fill(t.index.includesSector, { n: h.sector }) : "");
  const listTitle = !hasQ
    ? fill(t.index.listAll, { n: localities.length })
    : hits.length
      ? fill(plural(hits.length, t.index.listMatchOne, t.index.listMatchMany), { q })
      : fill(t.index.listNoMatch, { q, n: localities.length });

  const selOn = isOn(selected.slug);
  const selFollowLabel = selected.live ? (selOn ? fill(t.follow.following, { name: selected.name }) : t.follow.follow) : selOn ? t.follow.tellingYou : t.follow.tellMe;
  const summaryFollow = (
    <button type="button" aria-pressed={selOn} disabled={busy === `summary:${selected.slug}`} onClick={() => toggle(selected.slug, "summary")} className={followClasses(selOn)}>
      {selFollowLabel}
    </button>
  );

  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto grid w-full max-w-page grid-cols-[repeat(auto-fit,minmax(min(100%,27.5rem),1fr))] items-start gap-7 px-6 pt-7 pb-9">
          {intro}
          <form role="search" onSubmit={onSubmit} action={links.base} method="get" className="flex min-w-0 flex-col gap-3 rounded-22 border border-line bg-white p-5">
            <label htmlFor="loc-q" className="text-17 font-semibold">
              {t.index.findLabel}
            </label>
            <div className="flex gap-2">
              <input
                id="loc-q"
                name="q"
                type="text"
                value={query}
                onChange={(e) => setQueryValue(e.target.value)}
                placeholder={t.index.placeholder}
                autoComplete="off"
                className="min-h-12 min-w-0 flex-1 rounded-pill border-[1.5px] border-line-strong bg-white px-4.5 text-16 font-light text-ink placeholder:text-subtle focus-visible:border-teal"
              />
              {query !== "" && (
                <button type="button" onClick={() => setQueryValue("")} className="min-h-12 flex-none rounded-pill border-[1.5px] border-line-strong bg-white px-4 text-14 text-ink hover:border-ink">
                  {t.index.clear}
                </button>
              )}
            </div>
            <div aria-live="polite" className="flex flex-col gap-2.5">
              {!hasQ && (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-0.5 text-13 font-light text-subtle">{t.index.try}</span>
                    {["GCER", "Sector 65", "Sohna Rd", "DLF 3", "Sec 56"].map((x) => (
                      <button key={x} type="button" onClick={() => setQueryValue(x)} className={pill44}>
                        {x}
                      </button>
                    ))}
                  </div>
                  <span className="text-12.5 leading-normal font-light text-subtle">{t.index.tryHelp}</span>
                </>
              )}
              {hasQ && hits.length > 0 && (
                <>
                  <span className="mono-label text-10.5 text-subtle">{plural(hits.length, t.index.matchOne, t.index.matchMany)}</span>
                  {hits.slice(0, 3).map((h) => {
                    const l = bySlug.get(h.locality.slug)!;
                    const n = matchNote(h);
                    return (
                      <button
                        key={l.slug}
                        type="button"
                        onClick={() => pick(l.slug, "match")}
                        aria-pressed={l.slug === selected.slug}
                        className={cn(
                          "flex min-h-12 w-full items-center justify-between gap-2.5 rounded-14 border-[1.5px] bg-cream px-3.5 py-1.5 text-left text-ink",
                          l.slug === selected.slug ? "border-ink" : "border-cream",
                        )}
                      >
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-15 font-semibold">{l.name}</span>
                          {n ? <span className="font-mono text-10.5 font-medium text-teal">{n}</span> : <span className="text-12.5 font-light text-muted">{l.live ? t.status.pageLive : t.status.notEnough}</span>}
                        </span>
                        <span className="flex-none text-13 font-medium text-teal">{t.index.view}</span>
                      </button>
                    );
                  })}
                  {hits.length > 3 && <span className="text-12.5 font-light text-subtle">{fill(t.index.moreMatches, { n: hits.length - 3 })}</span>}
                </>
              )}
              {hasQ && hits.length === 0 && (
                <div className="flex flex-col gap-2 rounded-16 bg-cream p-4 [overflow-wrap:anywhere]">
                  <span className="text-15.5 font-semibold">{fill(t.index.noMatchTitle, { q })}</span>
                  <span className="text-13.5 leading-[1.55] font-light text-muted">{t.index.noMatchBody}</span>
                  {near.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-0.5 text-13 font-light text-subtle">{t.index.didYouMean}</span>
                      {near.map((L) => (
                        <button key={L.slug} type="button" onClick={() => setQueryValue(bySlug.get(L.slug)!.name)} className={pill44}>
                          {bySlug.get(L.slug)!.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {suggested && suggested.q === q ? (
                    <div role="status" className={cn("rounded-12 px-3.5 py-3 text-13.5 leading-normal", suggested.ok ? "bg-success-tint text-success" : "bg-emergency-tint font-medium text-emergency")}>
                      {suggested.message}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={suggest}
                        disabled={busy === "suggest"}
                        className="min-h-11 rounded-pill bg-teal px-4.5 text-14 font-medium text-white [overflow-wrap:anywhere] hover:bg-teal-dark disabled:opacity-60"
                      >
                        {busy === "suggest" ? t.index.suggesting : fill(t.index.suggest, { q })}
                      </button>
                      <button type="button" onClick={() => setQueryValue("")} className={cn(pill44, "text-14")}>
                        {t.index.clearSearch}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-page flex-col gap-8 px-6 pt-8 pb-14">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,26.25rem),1fr))] items-start gap-6">
          <div className="flex min-w-0 flex-col gap-2.5">
            <LocalityMap pins={pins} selected={selected.slug} dimmed={dimmed} onSelect={(s) => pick(s, "pin")} label={t.index.mapLabel} roads={t.index.roads} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-12.5 font-light text-subtle">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-teal" />
                {t.index.legendLive}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-saffron" />
                {t.index.legendThin}
              </span>
              <span>{t.index.mapNote}</span>
            </div>
          </div>

          <div id="loc-summary" ref={summaryRef} className="flex min-w-0 flex-col overflow-hidden rounded-22 border-[1.5px] border-ink">
            <div className="flex flex-col gap-3 px-5.5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="mono-label text-10.5 text-subtle">{t.index.selected}</span>
                {statusPill(selected.live, selected.live ? t.status.pageLive : t.status.notEnough)}
              </div>
              <div className="flex flex-col gap-1">
                <h2 aria-live="polite" className="text-30 leading-[1.1] font-bold tracking-h1">
                  {selected.name}
                </h2>
                <span className="text-14 leading-normal font-light text-muted">{fill(t.index.covers, { covers: selected.covers })}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {longStats(selected).map(([n, one, many], i) => (
                  <div key={i} className="flex flex-col gap-px rounded-14 bg-cream px-3 py-2.5">
                    <span className="text-24 font-bold tracking-h3">{n}</span>
                    <span className="text-12.5 leading-[1.35] text-muted">{n === 1 ? one : many}</span>
                  </div>
                ))}
              </div>
              {selected.extra && <span className="text-12.5 font-light text-subtle">{selected.extra}</span>}
            </div>

            {!selected.live && (
              <div className="flex flex-col gap-2 border-t border-line px-5.5 py-4">
                <span className="text-15.5 font-semibold">{t.index.thinTitle}</span>
                <span className="text-13.5 leading-[1.55] font-light text-muted">
                  {fill(t.index.thinText, { min: minListings, name: selected.name, n: selected.coverage.total })}
                </span>
                <div className="h-2 overflow-hidden rounded-pill bg-line" aria-hidden="true">
                  <div className="h-full rounded-pill bg-saffron" style={{ width: `${Math.min(100, Math.round((selected.coverage.total / minListings) * 100))}%` }} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="mono-label text-10.5 text-caution">{fill(t.index.progress, { n: selected.coverage.total, min: minListings })}</span>
                  <Link href={selected.searchHref} className="inline-flex min-h-11 items-center text-13.5 font-medium">
                    {t.index.searchCare}
                  </Link>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-line px-5.5 pt-3 pb-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-15.5 font-semibold">{fill(t.index.comingUp, { name: selected.name })}</span>
                <Link href={links.calendar} className="inline-flex min-h-11 flex-none items-center px-0.5 text-13.5">
                  {t.index.calendar}
                </Link>
              </div>
              {selected.events.map((e) => (
                <Link key={e.slug} href={e.href} className="flex min-h-11 items-center gap-3 rounded-16 bg-cream px-3 py-2.5 text-ink hover:text-ink hover:ring-2 hover:ring-teal">
                  <span aria-hidden="true" className="min-w-12.5 flex-none rounded-10 bg-ink px-2 py-1.5 text-center text-16 leading-[1.15] font-bold text-cream">
                    {e.day}
                    <br />
                    <span className="font-mono text-9.5 font-normal">{e.mon}</span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-14 leading-[1.35] font-semibold">{e.title}</span>
                    <span
                      className={cn(
                        "self-start rounded-pill px-2.25 py-0.75 text-11.5 leading-tight font-semibold",
                        e.verified ? "bg-success-tint text-success" : "border border-dashed border-sponsored bg-pending-tint text-pending",
                      )}
                    >
                      {e.status}
                    </span>
                  </span>
                </Link>
              ))}
              {selected.events.length === 0 && (
                <div className="flex flex-col items-start gap-2">
                  <span className="text-13.5 leading-normal font-light text-muted">{t.index.noEvents}</span>
                  <Link href={links.submit} className={cn(pill44, "font-normal")}>
                    {t.index.submitEvent}
                  </Link>
                </div>
              )}
            </div>

            {selected.live ? (
              <div className="flex flex-col gap-2 bg-cream px-5.5 py-4">
                <div className="flex flex-wrap gap-2">
                  <Link href={selected.href} className="inline-flex min-h-11 items-center rounded-pill bg-teal px-5 text-14.5 font-semibold text-white hover:bg-teal-dark hover:text-white">
                    {fill(t.index.openPage, { name: selected.name })}
                  </Link>
                  {summaryFollow}
                  {noteFor(selected.slug, "summary")}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 bg-cream px-5.5 py-4">
                <span className="text-15 font-semibold">{fill(t.index.helpGet, { name: selected.name })}</span>
                <div className="flex flex-wrap gap-2">
                  <Link href={selected.suggestHref} className="inline-flex min-h-11 items-center rounded-pill bg-teal px-4.5 text-14 font-medium text-white hover:bg-teal-dark hover:text-white">
                    {t.index.suggestListing}
                  </Link>
                  <Link href={links.champion} className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-ink px-4.5 text-14 font-medium text-ink hover:bg-white hover:text-ink">
                    {t.index.becomeChampion}
                  </Link>
                  {summaryFollow}
                  {noteFor(selected.slug, "summary")}
                </div>
              </div>
            )}
            <div className="border-t border-line px-5.5 py-3">
              <span className="font-mono text-10.5 leading-[1.6] text-subtle uppercase">
                {fill(t.index.source, { date: selected.checked })}
                {selected.live && selected.editor ? fill(t.index.sourceEditor, { editor: selected.editor }) : ""}
              </span>
            </div>
          </div>
        </div>

        <section aria-labelledby="loc-list-title" className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
            <h2 id="loc-list-title" className="text-22 font-semibold tracking-title [overflow-wrap:anywhere]">
              {listTitle}
            </h2>
            {followCount > 0 && (
              <span className="flex flex-wrap items-center gap-x-2.5 text-13.5 font-light text-muted">
                <span>{plural(followCount, t.index.followNoteOne, t.index.followNoteMany)}</span>
                <Link href={links.accountSaved} className="inline-flex min-h-11 items-center font-medium">
                  {t.follow.seeAccount}
                </Link>
              </span>
            )}
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-3">
            {listed.map(({ l, hit }) => {
              const sel = l.slug === selected.slug;
              const on = isOn(l.slug);
              const n = hit && hasQ ? matchNote(hit) : "";
              return (
                <li key={l.slug} className={cn("flex min-w-0 flex-col gap-2.5 rounded-20", sel ? "border-2 border-ink bg-cream p-3.75" : "border border-line bg-white p-4")}>
                  <button type="button" onClick={() => pick(l.slug, "card")} aria-pressed={sel} className="flex w-full flex-col gap-2.5 text-left text-ink">
                    <span className="flex flex-col gap-1.25">
                      <span className="text-17 font-semibold tracking-snug">{l.name}</span>
                      {statusPill(l.live, l.live ? t.status.pageLive : t.status.notEnough)}
                    </span>
                    <span className="text-13 leading-[1.45] font-light text-muted">{l.covers}</span>
                    {n && <span className="font-mono text-10.5 font-medium text-teal">{n}</span>}
                    <span className="grid w-full grid-cols-2 gap-x-2.5 gap-y-2">
                      {shortStats(l).map(([num, one, many], i) => (
                        <span key={i} className="flex min-w-0 items-baseline gap-1.5">
                          <span className="text-19 font-bold tracking-title">{num}</span>
                          <span className="text-12.5 leading-[1.3] font-light text-muted">{num === 1 ? one : many}</span>
                        </span>
                      ))}
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
                    <span className="font-mono text-10.5 text-subtle uppercase">{fill(t.index.lastChecked, { date: l.checked })}</span>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={fill(on ? t.follow.shortOnAria : t.follow.shortAria, { name: l.name })}
                      disabled={busy === `card:${l.slug}`}
                      onClick={() => toggle(l.slug, "card")}
                      className={followClasses(on)}
                    >
                      {on ? t.follow.shortOn : t.follow.short}
                    </button>
                    {noteFor(l.slug, "card")}
                  </div>
                </li>
              );
            })}
          </ul>
          <span className="text-12.5 font-light text-subtle">{t.index.countsNote}</span>
        </section>
        {footer}
      </div>
    </>
  );
}
