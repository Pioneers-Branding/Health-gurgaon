import type { ReactNode } from "react";
import { getDictionary, type Lang } from "@/lib/i18n";
import { cn } from "./cn";

export type TimelineStatus = "done" | "next" | "later";
export type TimelineItem = { title: ReactNode; description?: ReactNode; status: TimelineStatus };

const dot: Record<TimelineStatus, string> = {
  done: "bg-success",
  next: "bg-saffron",
  later: "bg-line",
};

/**
 * What happens after you submit: "Received → Organiser check → Verified & shared".
 * Green = done, saffron = happening next, beige = later. Status is also
 * spelled out for screen readers.
 */
export function StatusTimeline({ lang, items, className }: { lang: Lang; items: TimelineItem[]; className?: string }) {
  const t = getDictionary(lang).timeline;
  return (
    <ol className={cn("flex flex-col", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-3.5 py-3">
          <span aria-hidden="true" className={cn("mt-0.75 size-4 flex-none rounded-full", dot[item.status])} />
          <div className="flex flex-col gap-0.5">
            <span className="text-15 font-semibold">
              <span className="sr-only">{t[item.status]}: </span>
              {item.title}
            </span>
            {item.description && <span className="text-13.5 font-light leading-normal text-muted">{item.description}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}
