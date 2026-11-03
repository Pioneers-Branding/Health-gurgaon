"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { fmt } from "@/lib/i18n/format";
import { InlineScript } from "./inline-script";
import { setLocality, useLocalityOptions, usePreferences } from "./preferences";
import { localityLabelScript } from "./prefs-script";

export type LocalityPickerLabels = {
  city: string;
  all: string;
  buttonLabel: string;
  title: string;
  help: string;
  allLocalities: string;
  comingSoon: string;
};

const LABEL_ID = "hg-locality-label";

/**
 * "Gurugram ▾" in the top strip: choose your locality (kept on this device,
 * shared with the search overlay and useLocality()). The saved name is put in
 * place before first paint by an inline script, so it doesn't flash.
 */
export function LocalityPicker({ labels, localitiesHref }: { labels: LocalityPickerLabels; localitiesHref: string }) {
  const options = useLocalityOptions();
  const { locality } = usePreferences();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const current = locality ? options.find((o) => o.slug === locality) : undefined;
  const name = current?.name ?? labels.city;

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(slug: string | null) {
    setLocality(slug);
    setOpen(false);
    buttonRef.current?.focus();
  }

  const names = Object.fromEntries(options.map((o) => [o.slug, o.name]));
  const optionClass =
    "flex min-h-11 w-full items-center justify-between gap-3 rounded-12 px-3 text-left text-14 text-ink hover:bg-cream aria-pressed:bg-cream aria-pressed:font-semibold";

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={fmt(labels.buttonLabel, { name })}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap text-12.5 text-on-dark hover:text-saffron"
      >
        <span id={LABEL_ID} suppressHydrationWarning>
          {name}
        </span>
        <span aria-hidden="true" className="text-10">
          ▾
        </span>
      </button>
      <InlineScript html={localityLabelScript(LABEL_ID, names)} />
      <div
        id={panelId}
        role="dialog"
        aria-label={labels.title}
        hidden={!open}
        className="absolute top-full right-0 z-50 mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-20 border border-line bg-white p-3 text-ink shadow-menu"
      >
        <p className="px-2 pt-1 text-15 font-semibold">{labels.title}</p>
        <p className="px-2 pb-2 text-12.5 font-light leading-normal text-muted">{labels.help}</p>
        <ul className="flex max-h-[min(22rem,60vh)] flex-col gap-0.5 overflow-y-auto">
          <li>
            <button ref={firstRef} type="button" aria-pressed={!current} onClick={() => choose(null)} className={optionClass}>
              {labels.all}
            </button>
          </li>
          {options.map((o) => (
            <li key={o.slug}>
              <button type="button" aria-pressed={o.slug === current?.slug} onClick={() => choose(o.slug)} className={optionClass}>
                <span>{o.name}</span>
                {!o.live && <span className="text-11.5 font-light text-subtle">{labels.comingSoon}</span>}
              </button>
            </li>
          ))}
        </ul>
        <Link
          href={localitiesHref}
          onClick={() => setOpen(false)}
          className={cn("mt-1 inline-flex min-h-11 items-center px-2 text-13.5 font-medium")}
        >
          {labels.allLocalities} <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
    </div>
  );
}
