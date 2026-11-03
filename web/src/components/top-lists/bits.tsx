// Small pieces shared by the top lists, stories, facilities and method pages.

import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

/** Cream type pill ("Clinic", "Large hospital"). */
export function TypePill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-pill bg-cream px-2.5 py-0.75 text-11.5 leading-tight font-semibold", className)}>{children}</span>;
}

/** Green "✓ …" pill. */
export function CheckPill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-pill bg-success-tint px-2.5 py-0.75 text-11.5 leading-tight font-semibold text-success", className)}>{children}</span>;
}

/** Teal mono kicker above an h1/h2 ("PATIENT STORIES", "01 · HOW IT WORKS"). */
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("mono-label text-11 text-teal", className)}>{children}</span>;
}

/** A BreadcrumbList for JSON-LD from absolute URLs. */
export function breadcrumbLd(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}
