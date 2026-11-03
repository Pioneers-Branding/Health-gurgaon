import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Underlined tabs (doctor profile: Overview · Timings & location · Reviews ·
 * Verification record). TabLinks is for tabs that are separate URLs or
 * #sections and works without JavaScript; for in-page panels use <Tabs> from
 * ./tabs (a Client Component with the ARIA tab pattern).
 */
export const tabBase =
  "inline-flex min-h-11 items-center gap-1.75 border-b-3 px-3.5 py-3 text-14.5 text-ink leading-tight transition-colors hover:text-ink";
export const tabOn = "border-teal font-semibold";
export const tabOff = "border-transparent font-normal hover:border-line-strong";

/** Small "PHASE 2" marker shown after a tab label for later features. */
export function TabMarker({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-pill bg-saffron px-2 py-0.5 font-mono text-10 font-medium tracking-mono text-ink uppercase">
      {children}
    </span>
  );
}

export type TabLinkItem = { label: ReactNode; href: string; current?: boolean; marker?: ReactNode };

export function TabLinks({ label, items, className }: { label: string; items: TabLinkItem[]; className?: string }) {
  return (
    <nav aria-label={label} className={cn("flex flex-wrap gap-1 border-b border-line-strong", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cn(tabBase, item.current ? tabOn : tabOff)}
        >
          {item.label}
          {item.marker && <TabMarker>{item.marker}</TabMarker>}
        </Link>
      ))}
    </nav>
  );
}
