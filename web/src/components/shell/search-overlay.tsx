"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { chipClasses } from "@/components/ui/chip";
import { IconArrowLeft, IconHistory, IconSearch } from "@/components/ui/icons";
import { fmt } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";
import { addRecentSearch, clearRecentSearches, setLocality, useLocalityOptions, usePreferences } from "./preferences";

const OPEN_EVENT = "hg:open-search";

/** Open the full-screen search from any Client Component (e.g. a homepage search box on phones). */
export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export type SearchOverlayLabels = {
  title: string;
  placeholder: string;
  close: string;
  submit: string;
  localities: string;
  allCity: string;
  recent: string;
  clearRecent: string;
  noRecent: string;
  popularIn: string;
  popular: string[];
  emergencyTitle: string;
  emergencyCall: string;
  ambulance: string;
  emergencyDepartments: string;
};

/**
 * Full-screen search for phones (Admin and Mobile #mobile, phone 2): query box,
 * locality chips (shared with the top-strip picker), recent searches kept on
 * this device, popular searches and an emergency shortcut. Submitting goes to
 * /gurgaon/search?q=…&locality=…. A native <dialog>: focus is trapped, Escape
 * closes it and the page behind is inert.
 */
export function SearchOverlay({ lang, labels }: { lang: Lang; labels: SearchOverlayLabels }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [query, setQuery] = useState("");
  const { locality, recent } = usePreferences();
  const options = useLocalityOptions();
  const current = locality ? (options.find((o) => o.slug === locality) ?? null) : null;
  const place = current?.name ?? labels.allCity;

  useEffect(() => {
    const open = () => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) {
        dialog.showModal();
        inputRef.current?.focus();
      }
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  function close() {
    dialogRef.current?.close();
  }

  function search(text: string) {
    const q = text.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    addRecentSearch(q);
    close();
    router.push(routes.search(lang, { q, locality: locality ?? undefined }));
  }

  const needle = query.trim().toLowerCase();
  const recentShown = needle ? recent.filter((r) => r.toLowerCase().includes(needle)) : recent;
  const popularShown = needle ? labels.popular.filter((p) => p.toLowerCase().includes(needle)) : labels.popular;

  return (
    <dialog
      ref={dialogRef}
      aria-label={labels.title}
      onClose={() => setQuery("")}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-white p-0 text-ink open:flex open:flex-col"
    >
      <form
        role="search"
        action={routes.search(lang)}
        onSubmit={(event) => {
          event.preventDefault();
          search(query);
        }}
        className="flex items-center gap-2 px-3.5 pt-3 pb-2.5"
      >
        <button
          type="button"
          onClick={close}
          aria-label={labels.close}
          className="flex size-11 flex-none items-center justify-center rounded-full text-ink hover:bg-cream"
        >
          <IconArrowLeft />
        </button>
        <label htmlFor={inputId} className="sr-only">
          {labels.title}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={labels.placeholder}
          className="min-h-12 min-w-0 flex-1 rounded-14 border-[1.5px] border-ink bg-white px-3 text-15 text-ink placeholder:font-light placeholder:text-subtle"
        />
        {locality && <input type="hidden" name="locality" value={locality} />}
        <button
          type="submit"
          aria-label={labels.submit}
          className="flex size-12 flex-none items-center justify-center rounded-14 bg-teal text-white hover:bg-teal-dark"
        >
          <IconSearch />
        </button>
      </form>

      <div role="group" aria-label={labels.localities} className="scrollbar-none flex gap-1.5 overflow-x-auto px-3.5 pb-2.5">
        <button type="button" aria-pressed={!current} onClick={() => setLocality(null)} className={chipClasses(!current, "flex-none")}>
          {labels.allCity}
        </button>
        {options.map((o) => (
          <button
            key={o.slug}
            type="button"
            aria-pressed={o.slug === current?.slug}
            onClick={() => setLocality(o.slug)}
            className={chipClasses(o.slug === current?.slug, "flex-none")}
          >
            {o.name}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3.5 pb-4">
        <div className="flex items-center justify-between pt-2">
          <h2 className="mono-label text-10 text-subtle">{labels.recent}</h2>
          {recent.length > 0 && (
            <button type="button" onClick={clearRecentSearches} className="min-h-11 px-1.5 text-13 text-teal hover:text-ink">
              {labels.clearRecent}
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="py-2 text-13 font-light text-subtle">{labels.noRecent}</p>
        ) : (
          <ul>
            {recentShown.map((r) => (
              <li key={r} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => search(r)}
                  className="flex min-h-11 w-full items-center gap-2.5 py-2.5 text-left text-14.5 text-ink hover:text-teal"
                >
                  <IconHistory size={18} className="flex-none text-subtle" />
                  {r}
                </button>
              </li>
            ))}
          </ul>
        )}

        <h2 className="mono-label pt-3.5 pb-0.5 text-10 text-subtle">{fmt(labels.popularIn, { place })}</h2>
        <div className="flex flex-wrap gap-1.5">
          {popularShown.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => search(p)}
              className="inline-flex min-h-11 items-center rounded-pill bg-cream px-3 text-13 text-ink hover:bg-cream-deep"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="on-dark border-t border-line bg-ink px-3.5 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-cream">
        <div className="flex flex-wrap items-center gap-x-3">
          <span className="text-13 font-semibold">{labels.emergencyTitle}</span>
          <a href="tel:112" className="inline-flex min-h-11 items-center hover:text-cream">
            <span className="rounded-pill bg-emergency px-3 py-1 text-13 font-semibold text-white">{labels.emergencyCall}</span>
          </a>
          <a href="tel:108" className="inline-flex min-h-11 items-center text-13 text-on-dark hover:text-saffron">
            {labels.ambulance}
          </a>
          <Link
            href={routes.emergency(lang)}
            onClick={close}
            className={cn("inline-flex min-h-11 items-center text-13 font-light text-on-dark hover:text-saffron")}
          >
            {labels.emergencyDepartments}
          </Link>
        </div>
      </div>
    </dialog>
  );
}

/** A button that opens the full-screen search (pass your own look via className). */
export function SearchTrigger({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  return (
    <button type="button" aria-label={label} aria-haspopup="dialog" onClick={openSearch} className={className}>
      {children}
    </button>
  );
}
