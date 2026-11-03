"use client";

// The top lists hub's "Find a list" box, group chips and list cards. Filtering is live as you
// type (as in the prototype) and kept in the URL (?group=&q=) with history.replaceState, so a
// filtered hub can be shared. Without JavaScript the box is a GET form and the chips are links.

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useHydrated } from "@/components/find-care/auto-submit-form";
import { chipClasses } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";

import { filterHubCards, plural, withQuery, type HubFilters, type HubGroupKey } from "./format";

export type HubCard = {
  slug: string;
  href: string;
  /** "Top 10" */
  top: string;
  /** Band group (DOCTORS…) and its label in the page language. */
  bandKey: string;
  bandLabel: string;
  title: string;
  meta: string;
  updated: string;
  groupKey: HubGroupKey | null;
  /** Title in both languages, for the search box. */
  search: string;
};

export type HubLabels = {
  findLabel: string;
  findPlaceholder: string;
  findSubmit: string;
  groupsLabel: string;
  all: string;
  groups: Record<string, string>;
  noLists: string;
  noListsGroup: string;
  countOne: string;
  countMany: string;
  listsLabel: string;
  howWeRank: string;
};

const BANDS: Record<string, string> = {
  DOCTORS: "bg-teal text-white",
  HOSPITALS: "bg-ink text-saffron",
  "CARE CENTRES": "bg-caution text-white",
  DIAGNOSTICS: "bg-gov text-white",
  GOVERNMENT: "bg-gov text-white",
};

export function HubFinder({
  basePath,
  cards,
  groups,
  labels,
  initial,
  hero,
  howWeRankHref,
  aside,
}: {
  basePath: string;
  cards: HubCard[];
  groups: readonly HubGroupKey[];
  labels: HubLabels;
  initial: HubFilters;
  hero: ReactNode;
  howWeRankHref: string;
  aside: ReactNode;
}) {
  const hydrated = useHydrated();
  const [group, setGroup] = useState<HubGroupKey | null>(initial.group);
  const [q, setQ] = useState(initial.q);
  const shown = filterHubCards(cards, { group, q });

  function sync(nextGroup: HubGroupKey | null, nextQ: string) {
    window.history.replaceState(null, "", withQuery(basePath, { group: nextGroup, q: nextQ.trim() || null }));
  }

  const chip = (key: HubGroupKey | null, label: string) => {
    const selected = group === key;
    return (
      <Link
        key={key ?? "all"}
        href={withQuery(basePath, { group: key, q: q.trim() || null })}
        scroll={false}
        aria-current={selected ? "true" : undefined}
        className={chipClasses(selected)}
        onClick={(e) => {
          e.preventDefault();
          setGroup(key);
          sync(key, q);
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <section className="on-dark bg-ink text-cream">
        <div className="mx-auto flex w-full max-w-page flex-col gap-3.5 px-6 py-11">
          {hero}
          <div className="flex flex-wrap gap-2.5">
            <Link href={howWeRankHref} className="inline-flex min-h-11 items-center rounded-pill bg-saffron px-4.5 text-14 font-semibold text-ink hover:bg-saffron-soft hover:text-ink">
              {labels.howWeRank}
            </Link>
            <form
              role="search"
              method="get"
              action={basePath}
              className="flex min-w-0 flex-[0_1_22.5rem] gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sync(group, q);
              }}
            >
              {group && <input type="hidden" name="group" value={group} />}
              <label htmlFor="list-finder" className="sr-only">
                {labels.findLabel}
              </label>
              <input
                id="list-finder"
                type="search"
                name="q"
                value={q}
                autoComplete="off"
                placeholder={labels.findPlaceholder}
                onChange={(e) => {
                  setQ(e.target.value);
                  sync(group, e.target.value);
                }}
                className="min-h-11 w-full min-w-0 rounded-pill border-0 bg-white px-4.5 text-14.5 text-ink placeholder:text-subtle"
              />
              <button type="submit" hidden={hydrated} className="min-h-11 flex-none rounded-pill bg-cream px-4 text-13.5 font-medium text-ink">
                {labels.findSubmit}
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-page flex-col gap-7 px-6 pt-8 pb-14">
        <nav aria-label={labels.groupsLabel} className="flex flex-wrap gap-1.5">
          {chip(null, labels.all)}
          {groups.map((g) => chip(g, labels.groups[g] ?? g))}
        </nav>
        <p role="status" className="sr-only">
          {plural(shown.length, labels.countOne, labels.countMany)}
        </p>
        {shown.length > 0 && (
          <ul aria-label={labels.listsLabel} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-3.5">
            {shown.map((c) => (
              <li key={c.slug} className="flex">
                <Link
                  href={c.href}
                  className="flex w-full flex-col overflow-hidden rounded-22 border border-line bg-white text-ink transition-colors hover:border-ink hover:text-ink"
                >
                  <span className={cn("flex items-end justify-between gap-2 px-4.5 pt-4.5 pb-3.5", BANDS[c.bandKey] ?? BANDS.DOCTORS)}>
                    <span className="text-44 leading-none font-bold tracking-[-0.05em]">{c.top}</span>
                    <span className="mono-label text-10.5">{c.bandLabel}</span>
                  </span>
                  <span className="flex flex-col gap-1.5 px-4.5 pt-4 pb-4.5">
                    <span className="text-17.5 leading-[1.3] font-semibold tracking-card">{c.title}</span>
                    <span className="text-13 font-light text-muted">{c.meta}</span>
                    <span className="font-mono text-10.5 text-subtle uppercase">{c.updated}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {shown.length === 0 && (
          <p className="rounded-20 bg-cream p-5.5 text-15">{q.trim() ? labels.noLists.replace("{q}", q.trim()) : labels.noListsGroup}</p>
        )}
        {aside}
      </div>
    </>
  );
}
