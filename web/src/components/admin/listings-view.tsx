// /admin/listings: the listings editor. Search by name and status (in the URL), pick a listing,
// correct its facts with a reason and a source. Editors and admins.

import type { ProviderKind } from "@prisma/client";
import Link from "next/link";

import { LISTING_REASONS } from "@/lib/data/admin-format";
import { PROFILE_KIND_OF } from "@/lib/domain";
import { fmt, formatDate, getDictionary, type Lang } from "@/lib/i18n";
import { reasonLabel, type AdminStrings } from "@/lib/i18n/areas/admin";
import { routes } from "@/lib/routes";
import { cn } from "@/components/ui/cn";
import { Input, Select } from "@/components/ui/form";

import { adminHref, dayStamp } from "./format";
import { ListingForm } from "./listing-form";

type Row = { slug: string; name: string; kind: ProviderKind; status: string; locality: string | null; claimed: boolean; sponsored: boolean; lastCheckedAt: string | null; sample: boolean };

export type ListingDetail = {
  slug: string;
  name: string;
  kind: ProviderKind;
  profileKind: string;
  status: string;
  headline: string;
  areaLabel: string | null;
  locality: string | null;
  hoursSummary: string | null;
  hoursSource: string | null;
  consultationFee: number | null;
  feeVerified: boolean;
  keyFact: string | null;
  changes: { field: string; summary: string; source: string | null; changedAt: string }[];
};

export const LISTING_STATUSES = ["published", "hidden", "closed", "pending", "merged"] as const;

export function ListingsView({
  lang,
  t,
  q,
  status,
  page,
  total,
  rows,
  selected,
}: {
  lang: Lang;
  t: AdminStrings;
  q: string;
  status: string;
  page: number;
  total: number;
  rows: Row[];
  selected: ListingDetail | null;
}) {
  const dict = getDictionary(lang);
  const l = t.listings;
  const pages = Math.max(1, Math.ceil(total / 50));
  const query = (extra: Record<string, string | number | null>) => ({ q: q || null, status: status || null, page: page > 1 ? page : null, ...extra });
  const editable = selected && ["published", "hidden", "closed"].includes(selected.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-[47.5rem] flex-col gap-1.5">
        <h1 className="m-0 text-24 leading-tight font-bold tracking-h3">{dict.adminQueues.listings}</h1>
        <p className="m-0 text-13.5 leading-normal font-light text-muted">{l.intro}</p>
      </div>
      <form action={routes.adminQueue(lang, "listings")} method="get" role="search" className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-[1_1_16rem] flex-col gap-1.5 text-14 font-medium">
          {l.search}
          <Input type="search" name="q" defaultValue={q} maxLength={80} />
        </label>
        <label className="flex flex-[0_1_13rem] flex-col gap-1.5 text-14 font-medium">
          {l.status}
          <Select name="status" defaultValue={status} className="text-14">
            <option value="">{l.statusAll}</option>
            {LISTING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {l.statuses[s]}
              </option>
            ))}
          </Select>
        </label>
        <button type="submit" className="inline-flex min-h-11 cursor-pointer items-center rounded-pill bg-ink px-4.5 text-14 font-medium text-cream hover:bg-ink-soft">
          {l.searchButton}
        </button>
      </form>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,23.75rem),1fr))] items-start gap-5">
        <div className="flex min-w-0 flex-col gap-2.5">
          <span className="text-14 font-medium" role="status">
            {total === 0 ? fmt(l.none, { q }) : total === 1 ? l.totalOne : fmt(l.total, { n: total })}
          </span>
          {rows.length > 0 && (
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-18 border border-line p-0">
              {rows.map((r) => {
                const isSel = selected?.slug === r.slug;
                return (
                  <li key={r.slug} className="border-t border-line first:border-t-0">
                    <Link
                      href={adminHref(lang, "listings", query({ listing: r.slug }), "listing")}
                      aria-current={isSel ? "true" : undefined}
                      className={cn("flex min-h-11 flex-col gap-0.5 px-4 py-2.75 text-ink no-underline hover:bg-cream hover:text-ink", isSel && "bg-cream shadow-[inset_3px_0_0_var(--color-ink)]")}
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="text-14.5 font-semibold" lang={lang === "hi" ? "en" : undefined}>
                          {r.name}
                        </span>
                        <span className="font-mono text-10.5 font-medium tracking-mono text-subtle">{l.statuses[r.status] ?? r.status}</span>
                      </span>
                      <span className="text-12.5 font-light text-muted">
                        {[t.providerKinds[r.kind] ?? r.kind, r.locality, r.claimed ? l.claimed : null, r.sponsored ? l.sponsored : null, r.sample ? l.sample : null].filter(Boolean).join(" · ")}
                        {" · "}
                        {r.lastCheckedAt ? fmt(l.lastChecked, { date: formatDate(lang, r.lastCheckedAt) }) : l.neverChecked}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {pages > 1 && (
            <nav aria-label={fmt(l.page, { n: page })} className="flex items-center justify-between gap-2">
              {page > 1 ? (
                <Link href={adminHref(lang, "listings", query({ page: page - 1 > 1 ? page - 1 : null }))} className="inline-flex min-h-11 items-center text-14 font-medium">
                  {l.prev}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-13 font-light text-muted">{fmt(l.page, { n: page })}</span>
              {page < pages ? (
                <Link href={adminHref(lang, "listings", query({ page: page + 1 }))} className="inline-flex min-h-11 items-center text-14 font-medium">
                  {l.next}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>

        <section id="listing" aria-labelledby="listing-title" className="flex min-w-0 scroll-mt-24 flex-col gap-3.5 rounded-22 border-[1.5px] border-ink p-4.5 sm:p-5.5 lg:sticky lg:top-24">
          {selected ? (
            <>
              <span className="mono-label text-10.5 text-subtle">
                {l.panelTitle} · {t.providerKinds[selected.kind] ?? selected.kind}
              </span>
              <h2 id="listing-title" className="m-0 text-20 leading-[1.3] font-bold tracking-title" lang={lang === "hi" ? "en" : undefined}>
                {selected.name}
              </h2>
              <span className="-mt-2 text-13 font-light text-muted" lang={lang === "hi" ? "en" : undefined}>
                {[selected.headline, selected.areaLabel ?? selected.locality].filter(Boolean).join(" · ")}
              </span>
              {selected.status === "published" && (
                <Link href={routes.provider(lang, PROFILE_KIND_OF[selected.kind], selected.slug)} className="-my-1 inline-flex min-h-11 items-center self-start text-14 font-medium">
                  {l.viewProfile}
                </Link>
              )}
              {editable ? (
                <ListingForm
                  key={selected.slug}
                  lang={lang}
                  listing={{
                    slug: selected.slug,
                    status: selected.status,
                    hoursSummary: selected.hoursSummary ?? "",
                    hoursSource: selected.hoursSource ?? "",
                    consultationFee: selected.consultationFee === null ? "" : String(selected.consultationFee),
                    feeVerified: selected.feeVerified,
                    keyFact: selected.keyFact ?? "",
                  }}
                  statuses={(["published", "hidden", "closed"] as const).map((s) => ({ value: s, label: l.statuses[s] }))}
                  reasons={LISTING_REASONS.map((r) => ({ value: r, label: reasonLabel(t, r) }))}
                  labels={{
                    ...l.fields,
                    reason: l.reason,
                    source: l.source,
                    sourceHelp: l.sourceHelp,
                    save: l.save,
                    saving: l.saving,
                    choose: t.decide.chooseReason,
                    optional: t.decide.optional,
                  }}
                />
              ) : (
                <p className="m-0 text-13.5 font-light text-muted">{l.statuses[selected.status] ?? selected.status}</p>
              )}
              <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                <span className="mono-label text-10.5 text-subtle">{l.recent}</span>
                {selected.changes.length ? (
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {selected.changes.map((c) => (
                      <li key={`${c.changedAt}-${c.field}`} className="flex flex-col gap-0.5 text-13 leading-snug">
                        <span className="font-mono text-10.5 font-medium tracking-mono text-subtle">{dayStamp(lang, c.changedAt)}</span>
                        <span lang={lang === "hi" ? "en" : undefined}>
                          {c.summary}
                          {c.source ? <span className="font-light text-muted"> · {c.source}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-13 font-light text-subtle">{l.noRecent}</span>
                )}
              </div>
            </>
          ) : (
            <p id="listing-title" className="m-0 text-14 font-light text-muted">
              {l.choose}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
