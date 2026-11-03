"use client";

// The homepage's two in-page filters, as in the prototype: "Hospitals serving <locality>"
// (All / Private / Government / Charitable, per locality) and "Health camps & events" (All /
// Camps / Blood drives / Workshops / Free). Cards are rendered on the server and passed in as
// nodes; these components only choose which to show. The unfiltered view is the static HTML.

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ChipButton } from "@/components/ui/chip";
import { fmt } from "@/lib/i18n/format";

import { eventMatches, type EventFilter } from "./format";
import { PlaceText, usePlace } from "./place";

export type HospitalItem = { key: string; ownership: string; sponsored: boolean; node: ReactNode };

export type HospitalsLabels = {
  kicker: string;
  title: string;
  desc: string;
  filterLabel: string;
  all: string;
  /** "No verified {type} hospitals serving {place} yet." */
  noneOfType: string;
  showAll: string;
  /** "No featured hospitals for {place} yet." */
  noFeatured: string;
  allHospitals: string;
  allHospitalsHref: string;
  /** Chip labels and the lower-case word used in sentences, by ownership. */
  ownership: Record<string, { chip: string; lower: string }>;
};

const OWNERSHIP_CHIPS = ["private", "government", "charitable"] as const;

export function HospitalsBoard({
  headingId,
  panels,
  names,
  defaultPlace,
  labels,
}: {
  headingId: string;
  panels: Record<string, HospitalItem[]>;
  names: Record<string, string>;
  defaultPlace: string;
  labels: HospitalsLabels;
}) {
  const place = usePlace();
  const [own, setOwn] = useState<string | null>(null);
  const items = panels[place] ?? panels[defaultPlace] ?? [];
  const shown = own ? items.filter((h) => h.ownership === own) : items;
  const editorial = shown.filter((h) => !h.sponsored);
  const sponsored = shown.filter((h) => h.sponsored);
  const placeName = names[place] ?? place;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[43.75rem] flex-col gap-1.5">
          <span className="mono-label text-11 text-teal">{labels.kicker}</span>
          <h2 id={headingId} className="text-26 font-bold tracking-h2 sm:text-30">
            <PlaceText template={labels.title} />
          </h2>
          <p className="text-14.5 leading-[1.55] font-light text-subtle">{labels.desc}</p>
        </div>
        {items.length > 0 && (
          <div role="group" aria-label={labels.filterLabel} className="flex flex-wrap gap-1.5">
            <ChipButton selected={own === null} onClick={() => setOwn(null)}>
              {labels.all}
            </ChipButton>
            {OWNERSHIP_CHIPS.map((o) => (
              <ChipButton key={o} selected={own === o} onClick={() => setOwn(o)}>
                {labels.ownership[o]?.chip ?? o}
              </ChipButton>
            ))}
          </div>
        )}
      </div>

      {shown.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-3.5">
          {[...editorial, ...sponsored].map((h) => (
            <li key={h.key} className="flex">
              {h.node}
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 ? (
        <p className="rounded-20 bg-cream p-5 text-14.5">
          {fmt(labels.noFeatured, { place: placeName })}{" "}
          <Link href={labels.allHospitalsHref} className="font-medium">
            {labels.allHospitals}
          </Link>
        </p>
      ) : (
        shown.length === 0 && (
          <p className="rounded-20 bg-cream p-5 text-14.5">
            {fmt(labels.noneOfType, { type: own ? (labels.ownership[own]?.lower ?? own) : "", place: placeName })}{" "}
            <button type="button" onClick={() => setOwn(null)} className="inline-flex min-h-11 items-center px-0.5 text-14.5 text-teal hover:text-ink">
              {labels.showAll}
            </button>
          </p>
        )
      )}
    </>
  );
}

export type EventItem = { key: string; type: string; isFree: boolean; node: ReactNode };

export function EventsBoard({
  items,
  filters,
  labels,
  limit = 5,
}: {
  items: EventItem[];
  filters: { key: EventFilter; label: string }[];
  labels: { filterLabel: string; none: string; noneLink: string; noneHref: string };
  limit?: number;
}) {
  const [filter, setFilter] = useState<EventFilter>("all");
  const shown = items.filter((e) => eventMatches(filter, e)).slice(0, limit);
  return (
    <>
      <div role="group" aria-label={labels.filterLabel} className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <ChipButton key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </ChipButton>
        ))}
      </div>
      {shown.length > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,32.5rem),1fr))] gap-3">
          {shown.map((e) => (
            <li key={e.key} className="flex">
              {e.node}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-20 bg-white p-5 text-14.5">
          {labels.none}{" "}
          <Link href={labels.noneHref} className="font-medium">
            {labels.noneLink}
          </Link>
        </p>
      )}
    </>
  );
}
