// An event page (prototype #event, the eye check-up camp): status, what it is, what to bring and
// the organiser on the left; the facts, Register / Add to calendar / Share on WhatsApp / Save, the
// verification source and "Report it" on the right. Awaiting-review, cancelled and completed
// events say so at the top. Server Component; the Save state comes from the session under
// <Suspense>.

import Link from "next/link";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/ui/json-ld";
import { isSaved } from "@/lib/data/account";
import type { EventDetail } from "@/lib/data/events";
import type { Lang } from "@/lib/i18n";
import { dataText, sourceText, type LocalEventsStrings } from "@/lib/i18n/areas/local-events";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { EventStatusPill, dayMonth, eventStatusKind, longDay, stampDate, statusLabel } from "./bits";
import { EventAside, ReportEvent, SaveEvent } from "./event-actions";
import { eventPlace } from "./events-calendar";
import { icsHref, organiserTile, timeText, whatsappHref } from "./format";

export function EventView({ lang, t, e }: { lang: Lang; t: LocalEventsStrings; e: EventDetail }) {
  const te = t.event;
  const kind = eventStatusKind(e);
  const href = routes.event(lang, e.slug);
  const url = `${SITE_URL}${href}`;
  const typeLabel = t.types[e.type]?.one ?? e.typeLabel;
  const when = `${longDay(lang, t, e.startsAt)} · ${timeText(lang, e.timeLabel, true)}`;
  const where = e.isOnline ? t.online : (e.venue ?? eventPlace(lang, t, e));
  const cost = dataText(lang, e.cost);
  // Event details are stored in English: mark them on Hindi pages so screen readers read them right.
  const en = lang === "hi" ? "en" : undefined;

  // [label, value, value is stored English text]
  const facts: [string, string, boolean][] = [
    [te.facts.when, when, false],
    [te.facts.where, where, !e.isOnline],
    ...(e.eligibility ? [[te.facts.who, e.eligibility, true] as [string, string, boolean]] : []),
    [te.facts.cost, cost, cost === e.cost],
    ...(e.registration ? [[te.facts.register, e.registration, true] as [string, string, boolean]] : []),
    ...(e.services.length ? [[te.facts.services, servicesLine(e.services), true] as [string, string, boolean]] : []),
  ];

  const tile = dayMonth(lang, t, e.startsAt);
  const shareText = [e.title, `${tile}, ${timeText(lang, e.timeLabel)}${e.venue ? ` · ${e.venue.split(",")[0]}` : ""}`, e.verified ? te.shareVerified : kind === "awaiting" ? te.shareAwaiting : null, url]
    .filter(Boolean)
    .join("\n");
  const source = e.source ? sourceText(lang, e.source) : null;
  const lastUpdated = e.verifiedAt ?? e.submittedAt;
  const signInHref = routes.account(lang, { next: href });

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    startDate: e.startsAt,
    ...(e.endsAt ? { endDate: e.endsAt } : {}),
    eventStatus: kind === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: e.isOnline ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
    location: e.isOnline
      ? { "@type": "VirtualLocation", url }
      : { "@type": "Place", name: e.venue ?? eventPlace("en", t, e), address: { "@type": "PostalAddress", addressLocality: "Gurugram", addressRegion: "Haryana", addressCountry: "IN" } },
    organizer: { "@type": "Organization", name: e.society?.name ?? e.organiserName },
    ...(e.description ? { description: e.description } : {}),
    isAccessibleForFree: e.isFree,
    url,
  };

  const stateBanner =
    kind === "awaiting" ? (
      <div className="rounded-18 border-[1.5px] border-dashed border-sponsored bg-pending-tint px-4.5 py-3.5 text-14 leading-[1.55] text-[#5a3d00]">
        <b className="font-semibold">{te.awaitingTitle}</b>{" "}
        {e.submittedAt ? te.awaitingBody.replace("{who}", te.submittedBy[e.organiserType] ?? te.submittedBy.other).replace("{date}", dayMonth(lang, t, e.submittedAt)) : te.awaitingBodyNoDate}
      </div>
    ) : kind === "cancelled" ? (
      <div role="note" className="rounded-18 border-[1.5px] border-caution bg-white px-4.5 py-3.5 text-14 leading-[1.55] text-caution">
        <b className="font-semibold">{te.cancelledTitle}</b> {te.cancelledBody}
      </div>
    ) : kind === "completed" ? (
      <div className="rounded-18 bg-stone px-4.5 py-3.5 text-14 leading-[1.55] text-muted">
        <b className="font-semibold text-ink">{te.completedTitle}</b> {e.reportSummary ?? ""}
      </div>
    ) : null;

  return (
    <div className="mx-auto flex w-full max-w-[68.75rem] flex-col gap-5.5 px-6 pt-7 pb-14">
      <JsonLd data={jsonLd} />
      <Breadcrumbs lang={lang} includeHome={false} items={[{ label: t.crumbs.events, href: routes.events(lang) }, { label: typeLabel }]} className="-my-3" />
      {stateBanner}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,26.25rem),1fr))] items-start gap-7">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="relative h-60 rounded-24 bg-stripes" aria-hidden="true">
            <span className="absolute top-3.5 left-4 rounded-6 bg-cream px-2 py-1 font-mono text-11 text-subtle">{te.photo}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <EventStatusPill kind={kind} label={kind === "verified" ? te.statusVerified : statusLabel(t, kind)} size="md" />
            {e.audience.map((a) => (
              <span key={a} className="rounded-pill bg-cream px-2.75 py-1 text-12 font-medium">
                {dataText(lang, a)}
              </span>
            ))}
            <span className="rounded-pill bg-cream px-2.75 py-1 text-12 font-medium">{cost}</span>
          </div>
          <h1 lang={en} className="text-38 leading-[1.08] font-bold tracking-h1">
            {e.title}
          </h1>
          {e.description && (
            <p lang={en} className="text-16 leading-[1.65] font-light text-muted">
              {e.description}
            </p>
          )}
          {e.bring && (
            <section aria-labelledby="ev-bring" className="flex flex-col gap-2">
              <h2 id="ev-bring" className="text-17 font-semibold">
                {te.pleaseBring}
              </h2>
              <p lang={en} className="text-14.5 leading-[1.6] font-light text-muted">
                {e.bring}
              </p>
            </section>
          )}
          <div className="flex flex-wrap items-center gap-3.5 rounded-20 bg-cream p-4.5">
            <div aria-hidden="true" className="flex size-13 flex-none items-center justify-center rounded-14 bg-teal font-bold text-white">
              {organiserTile(e.society?.name ?? e.organiserName, e.society?.shortName)}
            </div>
            <div className="flex min-w-[12.5rem] flex-1 flex-col gap-0.5">
              <span lang={en} className="font-semibold">
                {e.society?.name ?? e.organiserName}
              </span>
              <span className="text-13 font-light text-muted">{e.organiserNote ?? (e.organiserVerified ? te.organiserChecked : te.organiserUnchecked).replace("{type}", t.organiserTypes[e.organiserType] ?? e.organiserTypeLabel)}</span>
            </div>
            {e.society && (
              <Link href={routes.society(lang, e.society.slug)} className="inline-flex min-h-11 items-center text-13.5 font-medium">
                {te.societyProfile}
              </Link>
            )}
          </div>
        </div>

        <aside aria-label={te.factsLabel} className="flex flex-col gap-3 min-[900px]:sticky min-[900px]:top-24">
          <EventAside
            t={te}
            facts={
              <dl>
                {facts.map(([k, v, stored], i) => (
                  <div key={k} className={i === 0 ? "grid grid-cols-[6.875rem_minmax(0,1fr)] gap-3 px-4.5 py-3.25" : "grid grid-cols-[6.875rem_minmax(0,1fr)] gap-3 border-t border-line px-4.5 py-3.25"}>
                    <dt className="mono-label pt-0.5 text-10.5 text-subtle">{k}</dt>
                    <dd lang={stored ? en : undefined} className="text-14.5 leading-[1.45]">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            }
            registration={kind === "cancelled" || kind === "completed" ? null : e.registration}
            organiser={e.society?.shortName ?? e.organiserName}
            calendar={
              kind === "cancelled" || kind === "completed"
                ? null
                : { href: icsHref({ uid: e.slug, title: e.title, startsAt: e.startsAt, endsAt: e.endsAt, location: e.isOnline ? t.online : where, url }), fileName: `${e.slug}.ics` }
            }
            share={{ text: shareText, href: whatsappHref(shareText) }}
            save={
              <Suspense fallback={<SaveEvent lang={lang} slug={e.slug} title={e.title} initialSaved={false} t={te} signInHref={signInHref} />}>
                <SaveEventState lang={lang} slug={e.slug} title={e.title} t={te} signInHref={signInHref} />
              </Suspense>
            }
            source={
              source ? (
                <p className={e.verified ? "font-mono text-11 leading-[1.6] text-success uppercase" : "font-mono text-11 leading-[1.6] text-subtle uppercase"}>
                  {e.verified && lastUpdated
                    ? te.verifiedSource.replace("{source}", source).replace("{date}", stampDate(lang, lastUpdated).replace(/ \d{4}$/, ""))
                    : te.pendingSource.replace("{source}", source)}
                </p>
              ) : null
            }
            report={<ReportEvent lang={lang} slug={e.slug} t={te} signInHref={signInHref} />}
          />
        </aside>
      </div>
    </div>
  );
}

/** "Vision test, cataract screening, eye pressure check, referral". */
function servicesLine(services: string[]): string {
  return services.map((s, i) => (i > 0 && /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)).join(", ");
}

async function SaveEventState(props: { lang: Lang; slug: string; title: string; t: LocalEventsStrings["event"]; signInHref: string }) {
  const saved = await isSaved("event", props.slug);
  return <SaveEvent {...props} initialSaved={saved} />;
}
