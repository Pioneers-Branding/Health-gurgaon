"use client";

import { usePathname } from "next/navigation";
import { NavLinks, type NavItem } from "./nav-links";
import { navSectionFor } from "./nav-model";

export function MainNavActive({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return <NavLinks items={items} active={navSectionFor(pathname)} label={label} />;
}
