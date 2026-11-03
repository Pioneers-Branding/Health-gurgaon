// Small building blocks shared by the Find care pages (Server Components).

import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, type BadgeSize } from "@/components/ui/badge";
import { isOwnership, OWNERSHIP_TONE } from "@/components/ui/badge-styles";
import { cn } from "@/components/ui/cn";
import { tabBase, tabOff, tabOn } from "@/components/ui/tab-links";
import type { Lang } from "@/lib/i18n";
import { dataLabel, type FindCareStrings } from "@/lib/i18n/areas/find-care";

/** Private (ink) · Government (blue) · Charitable (brown) · PPP (olive): the shared ownership colours. */
export function OwnershipPill({ ownership, t, size = "sm" }: { ownership: string; t: FindCareStrings; size?: BadgeSize }) {
  const label = t.ownership[ownership as keyof FindCareStrings["ownership"]] ?? ownership;
  const tone = isOwnership(ownership) ? OWNERSHIP_TONE[ownership] : "dark";
  return (
    <Badge tone={tone} size={size}>
      {label}
    </Badge>
  );
}

/** ✓ Registration checked (green), in the page language. */
export function CheckBadge({ lang, label, size = "sm" }: { lang: Lang; label: string; size?: BadgeSize }) {
  return (
    <Badge tone="success" size={size}>
      <span aria-hidden="true">✓</span>
      {dataLabel(lang, label)}
    </Badge>
  );
}

/** Cream pill with bold 11.5px text: facility type ("Large hospital"). */
export function TypePill({ children, size = "sm", tone = "cream" }: { children: ReactNode; size?: "sm" | "md"; tone?: "cream" | "white" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill leading-tight font-semibold text-ink",
        tone === "white" ? "bg-white" : "bg-cream",
        size === "md" ? "px-2.75 py-1 text-12" : "px-2.5 py-0.75 text-11.5",
      )}
    >
      {children}
    </span>
  );
}

/** Cream pill, 500 weight: a listing tag ("Vaccinations", "Sunday OPD"). */
export function TagPill({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-pill bg-cream px-2.5 py-0.75 text-11.5 leading-tight font-medium text-ink">{children}</span>;
}

/** Saffron "PHASE 2" marker. */
export function PhaseTag({ children, tone = "saffron", className }: { children: ReactNode; tone?: "saffron" | "soft"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center self-start rounded-pill px-2.25 py-0.75 font-mono text-10.5 font-medium whitespace-nowrap text-ink uppercase",
        tone === "soft" ? "bg-saffron-soft" : "bg-saffron",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Mono uppercase stamp ("LAST CHECKED 12 OCT 2026", "SOURCE: …"). */
export function Stamp({
  children,
  tone = "subtle",
  size = "11",
  caps = true,
  className,
}: {
  children: ReactNode;
  tone?: "subtle" | "success";
  size?: "10" | "10.5" | "11";
  /** Upper case (default), as the prototype's stamps. */
  caps?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono leading-tight font-normal",
        caps && "uppercase",
        size === "10" ? "text-10" : size === "10.5" ? "text-10.5" : "text-11",
        tone === "success" ? "text-success" : "text-subtle",
        className,
      )}
    >
      {children}
    </span>
  );
}

export type ProfileTab = { id: string; label: ReactNode; href: string; marker?: ReactNode };

/** Underlined profile tabs as links (?tab=…), so they work without JavaScript and can be shared. */
export function ProfileTabs({
  label,
  tabs,
  current,
  underline = true,
  className,
}: {
  label: string;
  tabs: ProfileTab[];
  current: string;
  /** The hairline under the whole tab row (off on the reviews page band). */
  underline?: boolean;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("flex flex-wrap gap-1", underline && "border-b border-line-strong", className)}>
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          scroll={false}
          aria-current={tab.id === current ? "page" : undefined}
          className={cn(tabBase, tab.id === current ? tabOn : tabOff)}
        >
          {tab.label}
          {tab.marker && <PhaseTag>{tab.marker}</PhaseTag>}
        </Link>
      ))}
    </nav>
  );
}

/** The weekly hours table; `today` (0 = Monday) gets the prototype's green row. */
export function HoursTable({
  days,
  today,
  t,
  header,
}: {
  days: { day: number; text: string }[];
  today: number | null;
  t: FindCareStrings;
  header?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-20 border border-line">
      {header}
      <table className="w-full border-collapse text-14">
        <caption className="sr-only">{t.hours.title}</caption>
        <tbody>
          {days.map((d, i) => {
            const isToday = today === d.day;
            const dayName = t.weekdays[d.day] ?? "";
            const text = d.text.trim().toLowerCase() === "closed" ? t.hours.closed : d.text;
            return (
              <tr
                key={d.day}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  (i > 0 || !!header) && "border-t border-line",
                  isToday ? "bg-success-tint font-semibold text-success" : "bg-white font-light text-ink",
                )}
              >
                <th scope="row" className="px-4.5 py-2.75 text-left [font-weight:inherit]">
                  {isToday ? t.hours.today.replace("{day}", dayName) : dayName}
                </th>
                <td className="px-4.5 py-2.75 text-right">{text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
