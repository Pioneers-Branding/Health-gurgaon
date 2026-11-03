"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { IconClose, IconMenu } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { ContrastToggle, TextSizeToggle } from "./pref-toggles";

const OPEN_EVENT = "hg:open-menu";

export function openMenu() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** "☰ Menu" in the phone header. */
export function MenuButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={openMenu}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border-[1.5px] border-line-strong px-3 text-13.5 font-medium text-ink hover:border-ink"
    >
      <IconMenu size={18} />
      {label}
    </button>
  );
}

export type MenuSection = { title: string; links: Array<{ href: string; label: string }> };

/**
 * The dark phone menu sheet (Admin and Mobile #mobile, phone 3): accordion
 * sections, EN | हिं, larger text, high contrast, and "Sign in with OTP".
 * `language` and `account` are server-rendered slots (they read the URL / the
 * session inside their own Suspense boundaries).
 */
export function MenuSheet({
  title,
  closeLabel,
  homeHref,
  homeLabel,
  sections,
  language,
  account,
  textLabel,
  contrastLabel,
}: {
  title: string;
  closeLabel: string;
  homeHref: string;
  homeLabel: string;
  sections: MenuSection[];
  language: ReactNode;
  account: ReactNode;
  textLabel: string;
  contrastLabel: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const open = () => {
      const dialog = ref.current;
      if (dialog && !dialog.open) dialog.showModal();
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  function close() {
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClick={(event) => {
        // Close after following any link inside the sheet.
        if ((event.target as HTMLElement).closest("a")) close();
      }}
      className="on-dark fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-ink p-0 text-cream open:flex open:flex-col"
    >
      <div className="flex items-center justify-between px-4.5 pt-3 pb-4">
        <Link href={homeHref} aria-label={homeLabel} className="inline-flex min-h-11 items-center">
          <Logo size="sm" tone="dark" withMark={false} />
        </Link>
        <button
          type="button"
          onClick={close}
          aria-label={closeLabel}
          className="flex size-11 items-center justify-center rounded-full bg-night-raise text-cream hover:bg-night-line"
        >
          <IconClose size={18} />
        </button>
      </div>
      <nav aria-label={title} className="flex flex-1 flex-col overflow-y-auto px-4.5 pb-4.5">
        {sections.map((section, i) => (
          <details key={section.title} name="hg-menu" open={i === 0} className="group border-b border-night-line">
            <summary className="flex min-h-14 items-center justify-between py-3 text-18 font-semibold text-cream">
              {section.title}
              <span aria-hidden="true" className="text-20 text-saffron group-open:hidden">
                +
              </span>
              <span aria-hidden="true" className="hidden text-20 text-saffron group-open:inline">
                −
              </span>
            </summary>
            <ul className="flex flex-col pb-3">
              {section.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="flex min-h-11 items-center text-14.5 font-light text-on-dark hover:text-saffron"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
        <div className="mt-4 flex gap-2">
          {language}
          <TextSizeToggle label={textLabel} variant="sheet" />
        </div>
        <div className="mt-2 flex gap-2">
          <ContrastToggle label={contrastLabel} variant="sheet" />
        </div>
        {account}
      </nav>
    </dialog>
  );
}
