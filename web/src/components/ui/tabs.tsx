"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";
import { TabMarker, tabBase, tabOff, tabOn } from "./tab-links";

export type TabItem = {
  id: string;
  label: ReactNode;
  /** Panel content. Server-rendered content can be passed in from a Server Component. */
  content: ReactNode;
  /** e.g. "Phase 2" */
  marker?: ReactNode;
};

/**
 * In-page tabs with the ARIA tab pattern (arrow keys, Home/End). All panels
 * are rendered (inactive ones hidden), so content stays in the HTML for
 * search engines and for readers without JavaScript the first tab shows.
 * For tabs that are separate URLs use <TabLinks>.
 */
export function Tabs({
  label,
  items,
  defaultTab,
  className,
  panelClassName,
}: {
  /** Accessible name of the tab list, e.g. "Doctor profile sections". */
  label: string;
  items: TabItem[];
  defaultTab?: string;
  className?: string;
  panelClassName?: string;
}) {
  const base = useId();
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((t) => t.id === active);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    setActive(items[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-1 border-b border-line-strong">
        {items.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(tabBase, selected ? tabOn : tabOff)}
            >
              {tab.label}
              {tab.marker && <TabMarker>{tab.marker}</TabMarker>}
            </button>
          );
        })}
      </div>
      {items.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className={cn("pt-5 focus-visible:outline-offset-4", panelClassName)}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
