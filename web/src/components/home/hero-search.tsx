"use client";

// The hero search: "Doctor, clinic, lab, chemist…" + locality + Search, then the quick searches.
// A GET form to /gurgaon/search (q, locality), so it works without JavaScript; with JavaScript an
// empty search shows the prototype's hint instead of leaving the page, and the search is kept in
// the reader's recent searches (the shell's search overlay shows them).

import Form from "next/form";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { addRecentSearch } from "@/components/shell/preferences";

import { withQuery } from "./format";
import { PlaceSelect, usePlace } from "./place";

export type HeroSearchLabels = {
  searchLabel: string;
  localityLabel: string;
  searchPh: string;
  search: string;
  emptyQuery: string;
  quickLabel: string;
};

export function HeroSearch({
  action,
  labels,
  localities,
  quick,
}: {
  /** routes.search(lang) */
  action: string;
  labels: HeroSearchLabels;
  /** Locality slugs offered in the list (names come from the page's place names). */
  localities: string[];
  /** Quick searches: the label in the page language and the query sent to search. */
  quick: { label: string; q: string }[];
}) {
  const place = usePlace();
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    if (!q) {
      event.preventDefault();
      setToast(labels.emptyQuery);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(""), 4500);
      input.current?.focus();
      return;
    }
    addRecentSearch(q);
  }

  return (
    <>
      <Form
        action={action}
        onSubmit={onSubmit}
        role="search"
        className="flex max-w-[38.75rem] flex-wrap overflow-hidden rounded-22 border-2 border-ink bg-white"
      >
        <label htmlFor="home-q" className="sr-only">
          {labels.searchLabel}
        </label>
        <input
          ref={input}
          id="home-q"
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={120}
          placeholder={labels.searchPh}
          className="min-h-14 min-w-0 flex-[1_1_15rem] bg-transparent px-4.5 py-4 text-16 text-ink outline-offset-[-4px] placeholder:text-subtle"
        />
        <label htmlFor="home-locality" className="sr-only">
          {labels.localityLabel}
        </label>
        <PlaceSelect
          id="home-locality"
          name="locality"
          options={localities}
          className="min-h-14 min-w-0 flex-[0_1_11.875rem] cursor-pointer max-sm:flex-[1_1_11.875rem] border-l border-line bg-white px-3.5 text-15 text-ink outline-offset-[-4px]"
        />
        <button
          type="submit"
          className="min-h-14 flex-none cursor-pointer bg-teal px-6.5 text-16 font-semibold text-white outline-offset-[-4px] transition-colors hover:bg-teal-dark"
        >
          {labels.search}
        </button>
      </Form>
      <ul aria-label={labels.quickLabel} className="flex flex-wrap gap-2">
        {quick.map((item) => (
          <li key={item.q}>
            <Link
              href={withQuery(action, { q: item.q, locality: place })}
              className="inline-flex min-h-11 items-center rounded-pill border border-line-strong bg-white px-3.5 text-13.5 text-ink hover:border-ink hover:text-ink"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">
        {toast}
      </p>
      {toast && (
        <p aria-hidden="true" className="max-w-[38.75rem] rounded-14 bg-ink px-4 py-3 text-14 text-cream">
          {toast}
        </p>
      )}
    </>
  );
}
