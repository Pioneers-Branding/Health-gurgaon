import { Suspense } from "react";
import { MobileBarActive } from "./mobile-bar-active";
import { MobileBarView, type MobileBarItem } from "./mobile-bar-view";

export type { MobileBarItem };

/**
 * Thumb-reach bottom bar on phones and tablets (hidden from lg up):
 * Home · Search · Events · Ask · Saved. "Search" opens the full-screen search
 * (and is a plain link to the search page before JavaScript loads).
 */
export function MobileBar({ items, label }: { items: MobileBarItem[]; label: string }) {
  return (
    <Suspense fallback={<MobileBarView items={items} active={null} label={label} />}>
      <MobileBarActive items={items} label={label} />
    </Suspense>
  );
}
