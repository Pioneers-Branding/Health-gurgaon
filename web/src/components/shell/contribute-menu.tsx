"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { buttonClasses } from "@/components/ui/button";
import { IconChevronDown } from "@/components/ui/icons";

export type MenuLink = { href: string; label: string };

/**
 * "Contribute ▾": Write a review · Report incorrect information · Submit an
 * event · Volunteer. A native <details> disclosure, so it opens even before
 * JavaScript loads; the script only closes it on outside click, Escape and
 * after choosing a link (the header stays mounted across navigations).
 */
export function ContributeMenu({ label, items }: { label: string; items: MenuLink[] }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const details = ref.current;
      if (details?.open && !details.contains(event.target as Node)) details.open = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const details = ref.current;
      if (event.key === "Escape" && details?.open) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function close() {
    if (ref.current) ref.current.open = false;
  }

  return (
    <details ref={ref} className="group relative">
      <summary className={buttonClasses({ variant: "outline", size: "sm" })}>
        {label}
        <IconChevronDown size={16} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute top-full right-0 z-40 mt-2 w-68 rounded-18 border border-line bg-white p-2 shadow-menu">
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={close}
                className="flex min-h-11 items-center rounded-12 px-3 text-14 text-ink hover:bg-cream hover:text-ink"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
