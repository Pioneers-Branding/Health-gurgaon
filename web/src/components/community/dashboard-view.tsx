// A society's private dashboard. Prototype: "Health Gurgaon Community.dc.html" #dashboard. Stats,
// "Your events" (with "Submit report" after an event), volunteer offers (Accept / Decline for the
// society's admins and editors) and the team. Request-time: rendered under <Suspense>.

import Link from "next/link";

import { Callout } from "@/components/ui/callout";
import { cn } from "@/components/ui/cn";
import type { SocietyDashboardView } from "@/lib/data/community";
import { formatNumber, type Lang } from "@/lib/i18n";
import type { CommunityStrings } from "@/lib/i18n/areas/community";
import { routes } from "@/lib/routes";

import { dataLang } from "./bits";
import { InitiativeReport, OfferDecision } from "./dashboard-actions";
import { dayMonth, venueShort } from "./logic";

type EventRow = SocietyDashboardView["events"][number];

/** The status word on "Your events". Needs-you states use caution, not emergency red. */
function eventState(e: EventRow): { key: string; tone: string } {
  if (e.status === "completed") return e.reportDue ? { key: "report_due", tone: "bg-pending-tint text-caution" } : { key: "report_submitted", tone: "bg-success-tint text-success" };
  if (e.status === "verified") return { key: "verified", tone: "bg-success-tint text-success" };
  if (e.status === "awaiting_review") return { key: "awaiting_review", tone: "bg-pending-tint text-pending" };
  if (e.status === "changes_requested") return { key: "changes_requested", tone: "bg-pending-tint text-caution" };
  return { key: e.status, tone: "bg-stone text-muted" };
}

export function DashboardView({ lang, t, d }: { lang: Lang; t: CommunityStrings; d: SocietyDashboardView }) {
  const k = t.dashboard;
  const stats = [
    { n: d.stats.eventsThisQuarter, label: k.stats.events },
    { n: d.stats.awaitingVerification, label: k.stats.awaiting },
    { n: d.stats.volunteerOffers, label: k.stats.offers },
    { n: d.stats.profileViews30d, label: k.stats.views },
  ];
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-5.5 px-6 pt-7 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="mono-label text-11 text-subtle">{k.kicker}</span>
          <h1 lang={dataLang(lang)} className="text-[2.125rem] leading-[1.1] font-bold tracking-h1">
            {d.society.shortName}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {d.society.verified && (
            <Link href={routes.society(lang, d.society.slug)} className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-ink px-4 text-14 text-ink hover:bg-cream hover:text-ink">
              {k.viewPublic}
            </Link>
          )}
          <Link href={routes.submitEvent(lang)} className="inline-flex min-h-11 items-center rounded-pill bg-teal px-4.5 text-14 font-semibold text-white hover:bg-teal-dark hover:text-white">
            {k.newEvent}
          </Link>
        </div>
      </div>

      {!d.society.verified && (
        <Callout tone="warning" title={k.pendingTitle}>
          <p>{k.pendingBody}</p>
        </Callout>
      )}

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,12.5rem),1fr))] gap-3">
        {stats.map((s) => (
          <li key={s.label} className="flex flex-col gap-1 rounded-20 bg-cream p-4.5">
            <span className="text-30 font-bold tracking-h3">{formatNumber(lang, s.n)}</span>
            <span className="text-13.5 font-light text-muted">{s.label}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,26.25rem),1fr))] items-start gap-5">
        <section aria-labelledby="dash-events" className="overflow-hidden rounded-22 border border-line">
          <h2 id="dash-events" className="px-4.5 py-4 text-17 font-semibold">
            {k.yourEvents}
          </h2>
          {d.events.length ? (
            <ul>
              {d.events.map((e) => {
                const st = eventState(e);
                const when = dayMonth(lang, e.startsAt);
                const where = e.status === "completed" ? k.completedLine : venueShort(e.venue);
                return (
                  <li key={e.slug} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4.5 py-3.5">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link href={routes.event(lang, e.slug)} lang={dataLang(lang)} className="text-14.5 font-medium text-ink hover:text-teal">
                        {e.title}
                      </Link>
                      <span className="text-12.5 font-light text-subtle">
                        {when}
                        {where && (
                          <>
                            {" · "}
                            <span lang={e.status === "completed" ? undefined : dataLang(lang)}>{where}</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className={cn("rounded-pill px-2.5 py-1 text-12 font-semibold", st.tone)}>{k.eventStatus[st.key] ?? e.statusLabel}</span>
                      {e.reportDue && d.canManage && (
                        <InitiativeReport
                          lang={lang}
                          societySlug={d.society.slug}
                          eventSlug={e.slug}
                          labels={{
                            submitReport: k.submitReport,
                            reportLabel: k.reportLabel,
                            reportPlaceholder: k.reportPlaceholder,
                            reportHelp: k.reportHelp,
                            publishReport: k.publishReport,
                            sending: t.common.sending,
                            submitted: k.eventStatus.report_submitted,
                          }}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="border-t border-line px-4.5 py-3.5 text-13.5 font-light text-muted">{k.noEvents}</p>
          )}
        </section>

        <section aria-labelledby="dash-offers" className="overflow-hidden rounded-22 border border-line">
          <h2 id="dash-offers" className="px-4.5 py-4 text-17 font-semibold">
            {k.offers}
          </h2>
          {d.offers.length ? (
            <ul>
              {d.offers.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4.5 py-3.5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span lang={dataLang(lang)} className="text-14.5 font-medium">
                      {o.displayName}
                    </span>
                    <span lang={dataLang(lang)} className="text-12.5 font-light text-subtle">
                      {o.detail}
                    </span>
                  </div>
                  {o.status === "pending" ? (
                    d.canManage ? (
                      <OfferDecision lang={lang} societySlug={d.society.slug} offerId={o.id} labels={{ accept: k.accept, decline: k.decline, accepted: k.accepted, declined: k.declined }} />
                    ) : null
                  ) : (
                    <span className="text-12.5 font-semibold text-success">{o.status === "accepted" ? k.accepted : k.declined}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-line px-4.5 py-3.5 text-13.5 font-light text-muted">{k.noOffers}</p>
          )}
          <p className="border-t border-line px-4.5 py-3 text-12 font-light text-subtle">
            {k.offersNote}
            {!d.canManage && <> {k.viewerNote}</>}
          </p>
        </section>
      </div>

      <section aria-labelledby="dash-team" className="flex flex-col gap-2.5 rounded-22 border border-line p-4.5">
        <h2 id="dash-team" className="text-17 font-semibold">
          {k.team}
        </h2>
        <ul className="flex flex-wrap gap-2.5">
          {d.team.map((m) => (
            <li key={`${m.name}-${m.title}`} className="flex min-w-45 flex-col gap-0.5 rounded-16 bg-cream px-3.5 py-3">
              <span lang={dataLang(lang)} className="text-14 font-medium">
                {m.name}
              </span>
              <span className="text-12.5 font-light text-subtle">
                {m.title && (
                  <>
                    <span lang={dataLang(lang)}>{m.title}</span> ·{" "}
                  </>
                )}
                {k.permissions[m.permission] ?? m.permission}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
