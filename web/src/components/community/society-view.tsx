// A society's public profile (Healthy Neighbourhoods). Prototype: "Health Gurgaon Community.dc.html"
// #society. Upcoming events, completed initiatives (counts only), volunteers needed and local
// resources from the cache; following, the dashboard link for its team, and the message box
// (shown with #message, no JavaScript needed) are per-reader.

import Link from "next/link";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { cn } from "@/components/ui/cn";
import { JsonLd } from "@/components/ui/json-ld";
import { getFollowState } from "@/lib/data/account";
import { getMySocietyRole, type SocietyMeta, type SocietyProfile } from "@/lib/data/community";
import { formatDate, getDictionary, type Lang } from "@/lib/i18n";
import type { CommunityStrings } from "@/lib/i18n/areas/community";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { dataLang } from "./bits";
import { ContactOrganiserForm } from "./contact-form";
import { FollowButton } from "./follow-button";
import { fill, monthYearLabel, venueShort } from "./logic";

function monthShort(lang: Lang, iso: string) {
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", month: "short" }).format(new Date(iso)).replace("Sept", "Sep");
}

export function SocietyPageView({ lang, t, society, meta }: { lang: Lang; t: CommunityStrings; society: SocietyProfile; meta: SocietyMeta | null }) {
  const dict = getDictionary(lang);
  const s = t.society;
  const url = `${SITE_URL}${routes.society(lang, society.slug)}`;
  const signInHref = routes.account(lang, { next: routes.society(lang, society.slug) });

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: society.name,
            url,
            ...(society.areaLabel ? { areaServed: society.areaLabel } : {}),
            ...(society.memberSince ? { memberOf: { "@type": "Organization", name: "HealthGurgaon Healthy Neighbourhoods", startDate: society.memberSince } } : {}),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home, item: `${SITE_URL}${routes.home(lang)}` },
              { "@type": "ListItem", position: 2, name: dict.pages.healthyNeighbourhoods.title, item: `${SITE_URL}${routes.healthyNeighbourhoods(lang)}` },
              { "@type": "ListItem", position: 3, name: society.name, item: url },
            ],
          },
        ]}
      />
      <section className="bg-cream">
        <div className="mx-auto flex w-full max-w-page flex-col gap-3 px-6 pt-4 pb-8">
          <Breadcrumbs lang={lang} items={[{ label: dict.pages.healthyNeighbourhoods.title, href: routes.healthyNeighbourhoods(lang) }, { label: society.shortName }]} />
          <div className="flex flex-wrap items-center gap-5.5">
            <span aria-hidden="true" className="flex size-24 flex-none items-center justify-center rounded-[1.625rem] bg-teal text-[2.125rem] font-bold text-white">
              {society.badgeText}
            </span>
            <div className="flex min-w-[min(100%,17.5rem)] flex-1 flex-col gap-1.5">
              {society.memberSince && (
                <span className="self-start rounded-pill bg-white px-2.75 py-1 text-12 font-semibold text-teal">{fill(s.memberSince, { date: formatDate(lang, society.memberSince, "monthYear") })}</span>
              )}
              <h1 lang={dataLang(lang)} className="text-36 leading-[1.1] font-bold tracking-h1">
                {society.name}
              </h1>
              <p className="text-14.5 font-light text-muted">
                {society.areaLabel && <span lang={dataLang(lang)}>{society.areaLabel} · </span>}
                {s.verified}
                {meta?.sample && <> · {s.sampleProfile}</>}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <Suspense fallback={<SocietyFollow lang={lang} t={t} society={society} initial={false} signInHref={signInHref} />}>
                <ReaderFollow lang={lang} t={t} society={society} signInHref={signInHref} />
              </Suspense>
              <a href="#message" className="inline-flex min-h-12 items-center rounded-pill border-[1.5px] border-ink bg-white px-4.5 text-14 text-ink hover:bg-cream hover:text-ink">
                {s.contact}
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-page items-start gap-6 px-6 pt-7 pb-14 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-2">
          <section id="message" tabIndex={-1} className="hidden scroll-mt-24 flex-col gap-2.5 rounded-20 border-[1.5px] border-teal p-4.5 target:flex">
            <ContactOrganiserForm
              lang={lang}
              societySlug={society.slug}
              signInHref={routes.account(lang, { next: `${routes.society(lang, society.slug)}#message` })}
              labels={{
                messageTitle: s.messageTitle,
                messageNote: s.messageNote,
                messageLabel: s.messageLabel,
                messagePlaceholder: s.messagePlaceholder,
                send: s.send,
                sent: s.sent,
                sending: t.common.sending,
                phoneWarning: t.thread.phoneWarning,
                signInLink: t.common.signIn,
              }}
            />
          </section>

          <section aria-labelledby="society-upcoming" className="flex flex-col gap-3">
            <h2 id="society-upcoming" className="text-20 font-semibold">
              {s.upcoming}
            </h2>
            {society.upcoming.length ? (
              <ul className="flex flex-col gap-3">
                {society.upcoming.map((e) => (
                  <li key={e.slug}>
                    <Link href={routes.event(lang, e.slug)} className="flex items-center gap-3.5 rounded-20 border border-line p-4 text-ink transition-shadow hover:text-ink hover:ring-2 hover:ring-teal">
                      <span className="flex flex-none flex-col items-center rounded-14 bg-ink px-3 py-2.5 text-center text-22 leading-tight font-bold text-cream">
                        {e.tile.day}
                        <span className="mono-label text-10.5 font-normal text-cream">{monthShort(lang, e.startsAt)}</span>
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span lang={dataLang(lang)} className="text-16 font-semibold">
                          {e.title}
                        </span>
                        <span className="text-13 font-light text-muted">
                          <span lang={dataLang(lang)}>{[venueShort(e.venue), e.timeLabel].filter(Boolean).join(" · ")}</span>
                          {" · "}
                          {e.verified ? t.common.verifiedTick : t.common.awaitingReview}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-20 bg-cream p-4.5 text-14 font-light text-muted">{s.noUpcoming}</p>
            )}
          </section>

          <section aria-labelledby="society-completed" className="flex flex-col gap-3">
            <h2 id="society-completed" className="text-20 font-semibold">
              {s.completed}
            </h2>
            {society.completed.length ? (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.75rem),1fr))] gap-3">
                {society.completed.map((c) => (
                  <li key={`${c.title}-${c.heldOn}`} className="flex flex-col gap-1.5 rounded-20 bg-cream p-4">
                    <span className="mono-label text-10.5 text-subtle">{monthYearLabel(lang, c.heldOn)}</span>
                    <span lang={dataLang(lang)} className="text-15 font-semibold">
                      {c.title}
                    </span>
                    <span lang={dataLang(lang)} className="text-13 font-light text-muted">
                      {c.summary}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-14 font-light text-muted">{s.noCompleted}</p>
            )}
            <p className="text-12 font-light text-subtle">{s.countsOnly}</p>
          </section>
        </div>

        <aside className="flex flex-col gap-3">
          <section aria-labelledby="society-needs" className="flex flex-col gap-2.5 rounded-20 border border-line p-4.5">
            <h2 id="society-needs" className="font-semibold">
              {s.volunteersNeeded}
            </h2>
            {society.volunteerNeeds.length ? (
              <ul className="flex flex-col gap-2.5">
                {society.volunteerNeeds.map((n) => (
                  <li key={n.title} className="flex flex-col gap-0.5 border-t border-line pt-2.5">
                    <span lang={dataLang(lang)} className="text-14 font-medium">
                      {n.title}
                    </span>
                    <span lang={dataLang(lang)} className="text-12.5 font-light text-muted">
                      {n.detail}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-line pt-2.5 text-13 font-light text-muted">{s.noNeeds}</p>
            )}
            <Link href={routes.volunteer(lang)} className="inline-flex min-h-11 items-center self-start text-13.5 font-medium">
              {s.becomeChampion}
            </Link>
          </section>
          {society.localResources && (
            <section aria-labelledby="society-resources" className="flex flex-col gap-1.5 rounded-20 bg-cream p-4.5">
              <h2 id="society-resources" className="font-semibold">
                {s.localResources}
              </h2>
              <p lang={dataLang(lang)} className="text-13.5 leading-[1.6] font-light text-muted">
                {society.localResources}
              </p>
            </section>
          )}
          <Suspense fallback={null}>
            <TeamLink lang={lang} t={t} slug={society.slug} />
          </Suspense>
        </aside>
      </div>
    </>
  );
}

function SocietyFollow({ lang, t, society, initial, signInHref }: { lang: Lang; t: CommunityStrings; society: SocietyProfile; initial: boolean; signInHref: string }) {
  return (
    <FollowButton
      lang={lang}
      kind="society"
      targetId={society.slug}
      initial={initial}
      variant="dark"
      labels={{ follow: t.society.follow, following: t.society.following, signIn: t.society.signInToFollow, signInLink: t.common.signIn, ariaFollow: fill(t.society.followAria, { name: society.name }) }}
      signInHref={signInHref}
    />
  );
}

async function ReaderFollow(props: { lang: Lang; t: CommunityStrings; society: SocietyProfile; signInHref: string }) {
  const state = await getFollowState("society", props.society.slug);
  return <SocietyFollow {...props} initial={!!state} />;
}

async function TeamLink({ lang, t, slug }: { lang: Lang; t: CommunityStrings; slug: string }) {
  const role = await getMySocietyRole(slug);
  if (!role) return null;
  return (
    <Link href={routes.societyDashboard(lang, slug)} className={cn("inline-flex min-h-11 items-center self-start rounded-pill bg-ink px-4.5 text-14 text-cream hover:bg-ink-soft hover:text-cream")}>
      {t.society.dashboard}
    </Link>
  );
}
