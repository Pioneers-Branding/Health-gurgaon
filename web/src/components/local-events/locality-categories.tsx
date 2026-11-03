"use client";

// The locality page's category tiles (Clinics 14 · Labs 6 · Chemists 9 …) and the verified
// listings of the chosen category. The choice is kept in the URL (?cat=labs) without a reload;
// the page's HTML shows Clinics, so the listings are there without JavaScript too.

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { cn } from "@/components/ui/cn";

export type CategoryListing = { slug: string; href: string; name: string; line: string; checked: string };
export type LocalityCategory = { key: string; label: string; /** The tile's label when the count is 1. */ labelOne: string; count: number; title: string; listings: CategoryListing[]; seeAll: { href: string; label: string } };

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}
const urlCategory = () => new URLSearchParams(window.location.search).get("cat");
const noCategory = () => null;

export function LocalityCategories({ categories, note, label, empty }: { categories: LocalityCategory[]; note: string; label: string; empty: string }) {
  // ?cat= from the URL (the server render and the static HTML show the first category).
  const fromUrl = useSyncExternalStore(subscribe, urlCategory, noCategory);
  const [chosen, setChosen] = useState<string | null>(null);
  const current = chosen ?? (fromUrl && categories.some((c) => c.key === fromUrl) ? fromUrl : (categories[0]?.key ?? ""));

  function choose(key: string) {
    setChosen(key);
    const sp = new URLSearchParams(window.location.search);
    if (key === categories[0]?.key) sp.delete("cat");
    else sp.set("cat", key);
    const qs = sp.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }

  const cat = categories.find((c) => c.key === current) ?? categories[0];
  if (!cat) return null;
  return (
    <>
      <div className="flex flex-col gap-2.5">
        <div role="group" aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-2.5">
          {categories.map((c) => {
            const on = c.key === cat.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => choose(c.key)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-18 px-4 py-3.5 text-left text-ink transition-colors",
                  on ? "border-2 border-teal bg-success-tint px-3.75 py-3.25" : "border border-line bg-white hover:border-subtle",
                )}
              >
                <span className="text-28 font-bold tracking-h3">{c.count}</span>
                <span className="text-13.5">{c.count === 1 ? c.labelOne : c.label}</span>
              </button>
            );
          })}
        </div>
        <span className="text-12.5 font-light text-subtle">{note}</span>
      </div>
      <section aria-live="polite" aria-labelledby="loc-cat-title" className="flex flex-col gap-3">
        <h2 id="loc-cat-title" className="text-20 font-semibold">
          {cat.title}
        </h2>
        {cat.listings.length > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.25rem),1fr))] gap-2.5">
            {cat.listings.map((p) => (
              <li key={p.slug} className="flex">
                <Link href={p.href} className="flex w-full flex-col gap-1.25 rounded-18 border border-line p-4 text-ink transition-shadow hover:text-ink hover:ring-2 hover:ring-teal">
                  <span className="text-15.5 font-semibold">{p.name}</span>
                  <span className="text-13 font-light text-muted">{p.line}</span>
                  <span className="font-mono text-10.5 text-success">✓ {p.checked}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-14 font-light text-muted">{empty}</p>
        )}
        <Link href={cat.seeAll.href} className="inline-flex min-h-11 items-center self-start text-13.5 font-medium">
          {cat.seeAll.label}
        </Link>
      </section>
    </>
  );
}
