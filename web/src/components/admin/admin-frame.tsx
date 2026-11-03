// The admin console around every /admin page: the dark sidebar (queues with their waiting
// counts, records, who is signed in) and the four overview tiles. Prototype: "Health Gurgaon
// Admin and Mobile.dc.html" #admin. On phones the sidebar becomes a scrolling row of links.

import Link from "next/link";
import type { ReactNode } from "react";

import { canOpenQueue, type AdminQueue } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/types";
import { fmt, type Lang } from "@/lib/i18n";
import type { AdminStrings } from "@/lib/i18n/areas/admin";
import { routes } from "@/lib/routes";
import { cn } from "@/components/ui/cn";

import { ageText } from "./format";

export type AdminOverviewData = {
  role: Role;
  displayName: string | null;
  queues: { queue: AdminQueue; waiting: number; atRisk: number }[];
  waiting: number;
  oldest: { shortRef: string; kindLabel: string; kind: string | null; hours: number } | null;
  slaAtRisk: number;
  medianResponseHours: number | null;
};

const RECORDS: AdminQueue[] = ["verification", "listings", "audit"];

function NavLink({ href, active, children, count, countLabel }: { href: string; active: boolean; children: ReactNode; count?: number; countLabel?: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-none items-center justify-between gap-2.5 rounded-10 px-2.5 text-14 whitespace-nowrap text-cream no-underline hover:bg-night-raise hover:text-cream lg:whitespace-normal",
        active ? "bg-night-raise" : "bg-transparent",
      )}
    >
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={cn("min-w-5.5 rounded-pill px-1.75 py-px text-center text-11.5 font-bold", count ? "bg-saffron text-ink" : "bg-night-line text-on-dark")}
          aria-label={countLabel}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

export function AdminFrame({
  lang,
  t,
  active,
  overview,
  children,
}: {
  lang: Lang;
  t: AdminStrings;
  active: "overview" | AdminQueue;
  overview: AdminOverviewData;
  children: ReactNode;
}) {
  const { role } = overview;
  const records = RECORDS.filter((q) => canOpenQueue(role, q));
  const oldestKind = overview.oldest ? (overview.oldest.kind ? (t.kinds[overview.oldest.kind] ?? overview.oldest.kindLabel) : overview.oldest.kindLabel) : "";
  const stats = [
    { k: t.stats.waiting, n: String(overview.waiting), sub: t.stats.waitingSub, alarm: false },
    {
      k: t.stats.oldest,
      n: overview.oldest ? ageText(t.stats, overview.oldest.hours) : "–",
      sub: overview.oldest ? fmt(t.stats.oldestSub, { ref: overview.oldest.shortRef, kind: lang === "en" ? oldestKind.toLowerCase() : oldestKind }) : t.stats.oldestNone,
      alarm: false,
    },
    { k: t.stats.slaAtRisk, n: String(overview.slaAtRisk), sub: t.stats.slaSub, alarm: overview.slaAtRisk > 0 },
    {
      k: t.stats.median,
      n: overview.medianResponseHours === null ? "–" : overview.medianResponseHours < 48 ? fmt(t.stats.hours, { n: overview.medianResponseHours }) : ageText(t.stats, overview.medianResponseHours),
      sub: overview.medianResponseHours === null ? t.stats.medianNone : t.stats.medianSub,
      alarm: false,
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-1 bg-white lg:min-h-[calc(100vh-7.5rem)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="on-dark flex min-w-0 flex-col gap-1 bg-ink px-3.5 py-4 text-on-dark lg:py-5">
        <nav aria-label={t.nav.label} className="flex min-w-0 flex-col gap-1">
          <span className="mono-label px-2.5 pb-1.5 text-10.5 text-saffron lg:pb-2.5">{t.nav.moderation}</span>
          <div className="-mx-1 flex gap-1 overflow-x-auto scrollbar-none px-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            <NavLink href={routes.admin(lang)} active={active === "overview"}>
              {t.nav.overview}
            </NavLink>
            {overview.queues.map((q) => (
              <NavLink key={q.queue} href={routes.adminQueue(lang, q.queue)} active={active === q.queue} count={q.waiting} countLabel={fmt(t.nav.waitingSr, { n: q.waiting })}>
                {t.queueNames[q.queue]}
              </NavLink>
            ))}
          </div>
          <span className="mono-label px-2.5 pt-3 pb-1.5 text-10.5 text-saffron lg:pt-4.5 lg:pb-2.5">{t.nav.records}</span>
          <div className="-mx-1 flex gap-1 overflow-x-auto scrollbar-none px-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {records.map((q) => (
              <NavLink key={q} href={routes.adminQueue(lang, q)} active={active === q}>
                {t.queueNames[q]}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="mt-3 flex flex-col gap-2 px-2.5 lg:mt-auto lg:py-3">
          <span className="mono-label text-10.5 text-on-dark-muted">{t.nav.signedInAs}</span>
          <span className="rounded-10 border border-night-edge bg-night-raise px-2.5 py-2 text-13 font-medium text-cream">
            {t.roles[role] ?? role}
            {overview.displayName ? <span className="font-light text-on-dark-muted"> · {overview.displayName}</span> : null}
          </span>
          <span className="text-11.5 leading-normal font-light text-on-dark-muted">{t.roleNote[role] ?? ""}</span>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col gap-5 px-4 pt-5 pb-12 sm:px-7 sm:pt-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(11.25rem,1fr))] sm:gap-3">
          {stats.map((s) => (
            <div key={s.k} className={cn("flex min-w-0 flex-col gap-1 rounded-18 p-3.5 sm:p-4", s.alarm ? "bg-emergency-tint" : "bg-cream")}>
              <span className="mono-label text-10.5 text-subtle">{s.k}</span>
              <span className="text-28 leading-tight font-bold tracking-h3">{s.n}</span>
              <span className="text-12 font-light break-words text-muted">{s.sub}</span>
            </div>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
