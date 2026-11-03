"use client";

import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { IconBookmark, IconCalendar, IconChat, IconHome, IconSearch } from "@/components/ui/icons";
import type { MobileTab } from "./nav-model";
import { openSearch } from "./search-overlay";

export type MobileBarItem = { key: MobileTab; href: string; label: string };

const icons: Record<MobileTab, typeof IconHome> = {
  home: IconHome,
  search: IconSearch,
  events: IconCalendar,
  ask: IconChat,
  saved: IconBookmark,
};

export function MobileBarView({ items, active, label }: { items: MobileBarItem[]; active: MobileTab | null; label: string }) {
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-[40rem] grid-cols-5 px-1 pt-1.5 pb-2">
        {items.map((item) => {
          const Icon = icons[item.key];
          const on = item.key === active;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                onClick={
                  item.key === "search"
                    ? (event) => {
                        event.preventDefault();
                        openSearch();
                      }
                    : undefined
                }
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-1 py-1 text-11 hover:text-teal",
                  on ? "font-semibold text-teal" : "font-normal text-muted",
                )}
              >
                <Icon size={22} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
