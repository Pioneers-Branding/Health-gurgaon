"use client";

import { usePathname } from "next/navigation";
import { MobileBarView, type MobileBarItem } from "./mobile-bar-view";
import { mobileTabFor } from "./nav-model";

export function MobileBarActive({ items, label }: { items: MobileBarItem[]; label: string }) {
  const pathname = usePathname();
  return <MobileBarView items={items} active={mobileTabFor(pathname)} label={label} />;
}
