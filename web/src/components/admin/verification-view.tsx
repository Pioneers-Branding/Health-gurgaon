// /admin/verification: the verification desk. Listings due for a re-check (every 90 days) and
// listings not yet verified, each with "Record check". Editors and admins.

import Link from "next/link";

import { VERIFY_REASONS } from "@/lib/data/admin-format";
import { PROFILE_KIND_OF } from "@/lib/domain";
import type { ProviderKind } from "@prisma/client";
import { fmt, getDictionary, type Lang } from "@/lib/i18n";
import { reasonLabel, type AdminStrings } from "@/lib/i18n/areas/admin";
import { routes } from "@/lib/routes";
import { Callout } from "@/components/ui/callout";
import { cn } from "@/components/ui/cn";

import { adminHref, dayStamp } from "./format";
import { RecordCheckForm } from "./record-check-form";

type DeskRow = { slug: string; name: string; kind: ProviderKind; status: string; locality: string | null; lastCheckedAt: string | null; nextCheckAt: string | null; reason: string };

export const WITHIN_DAYS = [14, 30, 90] as const;

export function VerificationView({ lang, t, rows, within, checked }: { lang: Lang; t: AdminStrings; rows: DeskRow[]; within: number; checked: { name: string; published: boolean; href: string | null } | null }) {
  const dict = getDictionary(lang);
  const v = t.verification;
  const reasons = VERIFY_REASONS.map((r) => ({ value: r, label: reasonLabel(t, r) }));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-[47.5rem] flex-col gap-1.5">
        <h1 className="m-0 text-24 leading-tight font-bold tracking-h3">{dict.adminQueues.verification}</h1>
        <p className="m-0 text-13.5 leading-normal font-light text-muted">{v.intro}</p>
      </div>
      {checked && (
        <Callout tone="success" live="polite">
          <p className="m-0 font-medium text-ink">{fmt(checked.published ? v.published : v.done, { name: checked.name })}</p>
          {checked.href ? (
            <Link href={checked.href} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
              {v.viewProfile}
            </Link>
          ) : null}
        </Callout>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-14 font-medium">{rows.length === 1 ? v.countOne : fmt(v.count, { n: rows.length })}</span>
        <nav aria-label={v.withinLabel} className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-13 font-light text-muted">{v.withinLabel}</span>
          {WITHIN_DAYS.map((d) => (
            <Link
              key={d}
              href={adminHref(lang, "verification", { within: d === 14 ? null : d })}
              aria-current={within === d ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-pill border-[1.5px] px-3 text-12.5 no-underline",
                within === d ? "border-ink bg-ink text-cream hover:text-cream" : "border-line-strong bg-white text-ink hover:border-ink hover:text-ink",
              )}
            >
              {fmt(v.within, { n: d })}
            </Link>
          ))}
        </nav>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 rounded-18 bg-success-tint p-5 font-medium text-success">{v.empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-18 border border-line p-0">
          {rows.map((r) => (
            <li key={r.slug} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-start gap-x-6 gap-y-3 border-t border-line px-4 py-4 first:border-t-0">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-10.5 leading-[1.35] font-medium tracking-mono text-subtle">
                  {t.providerKinds[r.kind] ?? r.kind}
                  {r.locality ? ` · ${r.locality}` : ""}
                </span>
                <span className="text-15 leading-snug font-semibold" lang={lang === "hi" ? "en" : undefined}>
                  {r.name}
                </span>
                <span className={cn("self-start rounded-pill px-2 py-0.5 text-11.5 font-semibold", r.status === "pending" ? "bg-gov-tint text-gov" : "bg-pending-tint text-pending")}>
                  {v.why[r.reason] ?? r.reason}
                </span>
                <span className="text-12.5 font-light text-muted">
                  {v.lastChecked}: {r.lastCheckedAt ? dayStamp(lang, r.lastCheckedAt) : v.never} · {v.nextCheck}: {r.nextCheckAt ? dayStamp(lang, r.nextCheckAt) : v.notSet}
                </span>
                {r.status === "published" ? (
                  <Link href={routes.provider(lang, PROFILE_KIND_OF[r.kind], r.slug)} className="inline-flex min-h-11 items-center self-start text-13.5 font-medium">
                    {v.viewProfile}
                  </Link>
                ) : (
                  <span className="text-12.5 font-light text-subtle">{v.pending}</span>
                )}
              </div>
              <RecordCheckForm
                key={`${r.slug}-${r.lastCheckedAt ?? ""}`}
                lang={lang}
                slug={r.slug}
                within={within}
                publish={r.status === "pending"}
                reasons={reasons}
                labels={{ reason: v.reason, source: v.source, sourceHelp: v.sourceHelp, record: v.record, publish: v.publish, working: v.working, choose: t.decide.chooseReason, optional: t.decide.optional }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
