import Link from "next/link";
import { cn } from "@/components/ui/cn";
import type { NavSection } from "./nav-model";

export type NavItem = { key: NavSection; href: string; label: string };

/** The six header links. The active section gets the cream pill (Find Care header). */
export function NavLinks({ items, active, label }: { items: NavItem[]; active: NavSection | null; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-0.5 text-14">
      {items.map((item) => {
        const on = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={on ? "true" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-10 px-2.75 text-ink hover:bg-cream hover:text-ink",
              on && "bg-cream font-medium",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
