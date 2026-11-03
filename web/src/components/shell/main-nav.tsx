import { Suspense } from "react";
import { MainNavActive } from "./main-nav-active";
import { NavLinks, type NavItem } from "./nav-links";

export type { NavItem };

/**
 * Header navigation. The active state needs the URL, which suspends while
 * prerendering, so the static version (no highlight) is the fallback.
 */
export function MainNav({ items, label }: { items: NavItem[]; label: string }) {
  return (
    <Suspense fallback={<NavLinks items={items} active={null} label={label} />}>
      <MainNavActive items={items} label={label} />
    </Suspense>
  );
}
