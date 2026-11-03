"use client";

// The homepage's one locality ("Next camp near …", "Recently verified near …", "Hospitals
// serving …" and the hero search's locality), as in the prototype. It starts as the reader's saved
// locality (the shell's locality picker, kept on this device) when we have data for it, else
// Sector 56; the tabs and the hero's locality list change it for this page only.
// The server renders every locality's panel; these components pick the one to show, so the
// default panel is in the static HTML for crawlers and readers without JavaScript.

import { createContext, use, useState, type ReactNode } from "react";

import { useLocality } from "@/components/shell/preferences";
import { ChipButton } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { fmt } from "@/lib/i18n/format";

type PlaceState = {
  place: string;
  setPlace: (slug: string) => void;
  /** Display names in the page language, by slug. */
  names: Record<string, string>;
  defaultPlace: string;
};

const PlaceContext = createContext<PlaceState | null>(null);

function usePlaceState(): PlaceState {
  const value = use(PlaceContext);
  if (!value) throw new Error("Homepage place components must be inside <HomePlaceProvider>.");
  return value;
}

export function HomePlaceProvider({
  defaultPlace,
  names,
  children,
}: {
  defaultPlace: string;
  /** Every locality we have panels for, with its name in the page language. */
  names: Record<string, string>;
  children: ReactNode;
}) {
  const { locality } = useLocality();
  const [chosen, setChosen] = useState<string | null>(null);
  const saved = locality && names[locality.slug] ? locality.slug : null;
  const place = chosen ?? saved ?? defaultPlace;
  return <PlaceContext value={{ place, setPlace: setChosen, names, defaultPlace }}>{children}</PlaceContext>;
}

/** A template with {place} filled with the current locality's name ("Recently verified near {place}"). */
export function PlaceText({ template }: { template: string }) {
  const { place, names } = usePlaceState();
  return <>{fmt(template, { place: names[place] ?? place })}</>;
}

/** Shows the current locality's panel (server-rendered nodes), or the default one. */
export function PlaceSwitch({ panels }: { panels: Record<string, ReactNode> }) {
  const { place, defaultPlace } = usePlaceState();
  return <>{place in panels ? panels[place] : panels[defaultPlace]}</>;
}

/** The locality chips. A saved locality outside the tabs gets its own chip at the end. */
export function PlaceTabs({ tabs, label, className }: { tabs: string[]; label: string; className?: string }) {
  const { place, setPlace, names } = usePlaceState();
  const shown = tabs.includes(place) ? tabs : [...tabs, place];
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {shown.map((slug) => (
        <ChipButton key={slug} selected={slug === place} onClick={() => setPlace(slug)}>
          {names[slug] ?? slug}
        </ChipButton>
      ))}
    </div>
  );
}

/** "Show Sector 56" in an empty state. */
export function ShowPlaceButton({ slug, children, className }: { slug: string; children: ReactNode; className?: string }) {
  const { setPlace } = usePlaceState();
  return (
    <button type="button" onClick={() => setPlace(slug)} className={className}>
      {children}
    </button>
  );
}

/** The hero search's locality list, bound to the page's locality. */
export function PlaceSelect({ id, name, options, className }: { id: string; name: string; options: string[]; className?: string }) {
  const { place, setPlace, names } = usePlaceState();
  const list = options.includes(place) ? options : [...options, place];
  return (
    <select id={id} name={name} value={place} onChange={(e) => setPlace(e.target.value)} className={className}>
      {list.map((slug) => (
        <option key={slug} value={slug}>
          {names[slug] ?? slug}
        </option>
      ))}
    </select>
  );
}

/** The current locality's slug, for client code (quick search links). */
export function usePlace(): string {
  return usePlaceState().place;
}
