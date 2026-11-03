// /trust/neighbour-recommendations: the public method behind "Recommended by N neighbours".
// Prototype: "Neighbour Recommendation System.dc.html" (all eight sections). Section 05 shows the
// live blocks the locality page and doctor profiles render, with today's data, so the page always
// describes what the site actually does.

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { JsonLd } from "@/components/ui/json-ld";
import type { NeighbourRankingRow, NeighbourSummary } from "@/lib/data/neighbours";
import { fmt, formatNumber, getDictionary, type Lang } from "@/lib/i18n";
import { dataLabel, findCareStrings } from "@/lib/i18n/areas/find-care";
import { localEventsStrings } from "@/lib/i18n/areas/local-events";
import { topListsStrings } from "@/lib/i18n/areas/top-lists";
import { SITE_URL } from "@/lib/i18n/metadata";
import { localityName } from "@/lib/localities";
import { MENTION_EXAMPLES, NEIGHBOUR_DEMO_DOCS } from "@/lib/neighbour-demo";
import { NEIGHBOUR_RULES } from "@/lib/ranking";
import { routes } from "@/lib/routes";

import { Kicker, breadcrumbLd } from "./bits";
import { fill, plural } from "./format";
import { NeighbourDemo } from "./neighbour-demo";

/** Pill colours per classification (prototype), with caution instead of emergency red: red is
 * kept for emergencies and errors on this site. */
const EXAMPLE_TONES = ["bg-success-tint text-success", "bg-success-tint text-success", "bg-cream-deep text-caution", "bg-cream text-muted", "bg-pending-tint text-pending", "bg-ink text-saffron"];

export type MethodLive = {
  localitySlug: string;
  ranking: NeighbourRankingRow[];
  /** The locality's top doctor: their profile block. */
  profile: NeighbourSummary | null;
  threadHref: string | null;
};

function SectionHead({ kicker, title, id, children, size = "lg" }: { kicker: string; title: string; id: string; children?: ReactNode; size?: "lg" | "md" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Kicker>{kicker}</Kicker>
      <h2 id={id} className={cn("font-bold", size === "lg" ? "text-26 tracking-h2 sm:text-30" : "text-26 tracking-h3")}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export function MethodView({ lang, live }: { lang: Lang; live: MethodLive }) {
  const t = topListsStrings(lang);
  const m = t.method;
  const dict = getDictionary(lang);
  const fc = findCareStrings(lang).neighbours;
  const le = localEventsStrings(lang).locality;
  const place = localityName(live.localitySlug, lang);
  const top = live.ranking.filter((r) => r.rank !== null && r.status === "ranked").slice(0, 3);
  const prof = live.profile && live.profile.status === "ranked" ? live.profile : null;

  const [introBefore, introAfter] = m.intro.split("{different}");
  const [decisionBefore, decisionAfter] = m.decision.split("{unique}");
  const [formulaBefore, formulaAfter] = m.formula.split("{sub}");

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: dict.breadcrumbs.home, url: `${SITE_URL}${routes.home(lang)}` },
          { name: dict.pages.trust.title, url: `${SITE_URL}${routes.trust(lang)}` },
          { name: dict.pages.neighbourRecommendations.title, url: `${SITE_URL}${routes.neighbourRecommendations(lang)}` },
        ])}
      />
      <section className="on-dark bg-ink text-cream">
        <div className="mx-auto flex w-full max-w-[73.75rem] flex-col gap-3.5 px-6 pt-11 pb-10">
          <div className="flex flex-wrap justify-between gap-3">
            <span className="mono-label text-11 text-saffron">{m.kicker}</span>
            <Link href={routes.trust(lang)} className="inline-flex min-h-11 items-center text-13 text-on-dark hover:text-cream">
              ← {dict.pages.trust.title}
            </Link>
          </div>
          <h1 className="max-w-[55rem] text-36 leading-[1.02] font-bold tracking-display text-balance sm:text-[3rem]">{m.title}</h1>
          <p className="max-w-[48.75rem] text-17 leading-[1.6] font-light text-on-dark">
            {introBefore}
            <b className="font-semibold text-cream">{m.introDifferent}</b>
            {introAfter}
          </p>
          <div className="flex max-w-[55rem] flex-col gap-1.5 rounded-18 bg-night-raise px-4.5 py-4">
            <span className="mono-label text-10.5 text-saffron">{m.decisionKicker}</span>
            <p className="text-14.5 leading-[1.6] font-light text-cream">
              {decisionBefore}
              <b className="font-semibold">{m.decisionUnique}</b>
              {decisionAfter}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[73.75rem] flex-col gap-14 px-6 pt-10 pb-16">
        <section aria-labelledby="m-how" className="flex flex-col gap-4.5">
          <SectionHead kicker={m.s1} title={m.s1Title} id="m-how" />
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-3">
            {m.pipeline.map((p, i) => (
              <li key={p.t} className="flex flex-col gap-2 rounded-20 bg-cream p-4.5">
                <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-ink text-14 font-bold text-saffron">
                  {i + 1}
                </span>
                <h3 className="text-16 font-semibold">{p.t}</h3>
                <p className="text-13 leading-[1.55] font-light text-muted">{p.d}</p>
                <span className="font-mono text-10.5 text-teal uppercase">{p.who}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="m-counts" className="flex flex-col gap-4.5">
          <SectionHead kicker={m.s2} title={m.s2Title} id="m-counts">
            <p className="max-w-[47.5rem] text-15 font-light text-muted">{m.s2Intro}</p>
          </SectionHead>
          <ul aria-label={m.examplesLabel} className="divide-y divide-line overflow-hidden rounded-22 border border-line">
            {MENTION_EXAMPLES.map((e, i) => (
              <li
                key={e.quote}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4.5 py-4 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_5.625rem]"
              >
                <q lang="en" className="col-span-full text-14.5 leading-[1.55] font-light italic sm:col-span-1">
                  {e.quote}
                </q>
                <span className={cn("justify-self-start rounded-pill px-2.75 py-1 text-12.5 font-semibold", EXAMPLE_TONES[i])}>{m.exampleLabels[e.label] ?? e.label}</span>
                <span className="text-right font-mono text-14 font-semibold text-ink">{e.weight === "hold" ? m.hold : e.weight}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="m-score" className="flex flex-col gap-4.5">
          <SectionHead kicker={m.s3} title={m.s3Title} id="m-score" />
          <div className="on-dark flex flex-col gap-3.5 rounded-22 bg-ink p-6 text-cream">
            <p className="font-mono text-15 leading-[1.8] font-medium text-saffron">
              {formulaBefore}
              <sub>{m.formulaSub}</sub>
              {formulaAfter}
            </p>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-3.5">
              {m.factors.map((f) => (
                <div key={f.k} className="flex flex-col gap-1">
                  <dt className="text-15 font-semibold">{f.k}</dt>
                  <dd className="text-13 leading-[1.55] font-light text-on-dark">{f.d}</dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-night-line pt-3 text-12.5 font-light text-on-dark-muted">{fill(m.threshold, { min: NEIGHBOUR_RULES.minResidents })}</p>
          </div>
        </section>

        <section aria-labelledby="m-demo" className="flex flex-col gap-4.5">
          <NeighbourDemo
            lang={lang}
            docs={NEIGHBOUR_DEMO_DOCS}
            heading={
              <div className="flex max-w-[42.5rem] flex-col gap-1.5">
                <Kicker>{m.s4}</Kicker>
                <h2 id="m-demo" className="text-26 font-bold tracking-h2 sm:text-30">
                  {m.s4Title}
                </h2>
                <p className="text-15 font-light text-muted">
                  {m.s4Intro} {m.s4Illustrative}
                </p>
              </div>
            }
            labels={{
              rawCount: m.rawCount,
              allSafeguards: m.allSafeguards,
              safeguards: m.safeguards,
              safeguardText: m.safeguardText,
              demoSub: m.demoSub,
              demoBelow: m.demoBelow,
              unitScore: m.unitScore,
              unitRaw: m.unitRaw,
              unitNotRanked: m.unitNotRanked,
              moveUp: m.moveUp,
              moveDown: m.moveDown,
              moveSame: m.moveSame,
              moveUpLabel: m.moveUpLabel,
              moveDownLabel: m.moveDownLabel,
              moveSameLabel: m.moveSameLabel,
              notes: m.notes,
              demoLabel: m.demoLabel,
              demoStatus: m.demoStatus,
              rank: t.common.rank,
            }}
          />
        </section>

        <section aria-labelledby="m-site" className="flex flex-col gap-4.5">
          <SectionHead kicker={m.s5} title={m.s5Title} id="m-site">
            <p className="text-15 font-light text-muted">{m.s5Intro}</p>
          </SectionHead>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22.5rem),1fr))] items-start gap-5">
            <article aria-labelledby="m-site-locality" className="flex flex-col gap-3 rounded-22 border border-line p-5">
              <span className="mono-label text-10.5 text-subtle">{m.onLocality}</span>
              <h3 id="m-site-locality" className="text-20 font-bold tracking-title">
                {fill(le.neighboursTitle, { name: place })}
              </h3>
              {top.length > 0 ? (
                <ol className="flex flex-col gap-3">
                  {top.map((r) => (
                    <li key={r.provider.slug} className="flex items-center gap-3 border-t border-line pt-3">
                      <span aria-hidden="true" className="flex size-8.5 flex-none items-center justify-center rounded-10 bg-saffron font-bold">
                        {r.rank}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <Link href={routes.provider(lang, r.provider.profileKind, r.provider.slug)} className="text-15 font-semibold text-ink hover:text-teal">
                          {r.provider.name}
                        </Link>
                        <span className="text-12.5 font-light text-muted">
                          {plural(r.recommendedBy, le.recommendedOne, le.recommendedMany)}
                          {r.topTheme ? ` · “${lang === "hi" ? dataLabel(lang, r.topTheme) : r.topTheme.charAt(0).toLowerCase() + r.topTheme.slice(1)}”` : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-13.5 font-light text-muted">{m.noLiveData}</p>
              )}
              <p className="text-12 leading-normal font-light text-subtle">{le.neighboursNote}</p>
              <Link href={routes.locality(lang, live.localitySlug)} className="inline-flex min-h-11 items-center self-start text-13 font-medium">
                {fill(m.seeLocality, { place })}
              </Link>
            </article>

            <article aria-labelledby="m-site-profile" className="flex flex-col gap-3 rounded-22 border border-line p-5">
              <span className="mono-label text-10.5 text-subtle">{m.onProfile}</span>
              {prof ? (
                <>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 id="m-site-profile" className="rounded-pill bg-success-tint px-3 py-1.25 text-13 font-semibold text-success">
                      {prof.recommendedBy === 1 ? fc.recommendedOne : fmt(fc.recommended, { count: formatNumber(lang, prof.recommendedBy) })}
                    </h3>
                    {prof.rank && (
                      <span className="font-mono text-11 text-subtle uppercase">
                        {fmt(fc.rank, { rank: prof.rank.position, place: localityName(prof.rank.localitySlug, lang), specialty: dataLabel(lang, prof.rank.specialtyName) })}
                      </span>
                    )}
                  </div>
                  <p className="text-15 font-semibold">{prof.provider.name}</p>
                  {prof.themes.length > 0 && (
                    <>
                      <h4 className="text-15 font-semibold">{fc.mention}</h4>
                      <ul className="flex flex-wrap gap-1.5">
                        {prof.themes.map((th) => (
                          <li key={th.label} className="rounded-pill bg-cream px-3 py-1.5 text-13">
                            {dataLabel(lang, th.label)} ({formatNumber(lang, th.count)})
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {prof.quotes.map((q) => (
                    <Link
                      key={q.text}
                      href={live.threadHref ?? routes.provider(lang, prof.provider.profileKind, prof.provider.slug)}
                      className="flex flex-col gap-1 rounded-14 bg-cream px-3.5 py-3 text-ink hover:text-ink hover:ring-2 hover:ring-teal"
                    >
                      <q lang="en" className="text-14 leading-[1.55] font-light">
                        {q.text}
                      </q>
                      <span className="font-mono text-10.5 text-teal uppercase">
                        {q.meta} {fc.readThread}
                      </span>
                    </Link>
                  ))}
                  {prof.concernedResidents > 0 && (
                    <p className="text-12.5 font-light text-muted">
                      {fmt(prof.concernedResidents === 1 ? fc.concernsOne : fc.concerns, {
                        count: formatNumber(lang, prof.concernedResidents),
                        themes: prof.concerns.map((c) => dataLabel(lang, c.label).toLowerCase()).join(", "),
                      })}
                    </p>
                  )}
                  <p className="text-12 leading-normal font-light text-subtle">{fc.basis}</p>
                  <Link href={routes.doctor(lang, prof.provider.slug)} className="inline-flex min-h-11 items-center self-start text-13 font-medium">
                    {fill(m.seeProfile, { name: prof.provider.name })}
                  </Link>
                </>
              ) : (
                <>
                  <h3 id="m-site-profile" className="text-15 font-semibold">
                    {fc.notEnough}
                  </h3>
                  <p className="text-13 leading-normal font-light text-muted">{fc.notEnoughBody}</p>
                </>
              )}
            </article>
          </div>
        </section>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] gap-5">
          <section aria-labelledby="m-rules" className="flex flex-col gap-3">
            <SectionHead kicker={m.s6} title={m.s6Title} id="m-rules" size="md" />
            <ol className="flex flex-col gap-2.5">
              {m.rules.map((r, i) => (
                <li key={r.t} className="flex items-start gap-3 border-t border-line pt-2.5">
                  <span aria-hidden="true" className="flex-none pt-0.5 font-mono text-12 font-semibold text-caution">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-14.5 font-semibold">{r.t}</h3>
                    <p className="text-13 leading-normal font-light text-muted">{r.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="m-fair" className="flex flex-col gap-3">
            <SectionHead kicker={m.s7} title={m.s7Title} id="m-fair" size="md" />
            <ul className="flex flex-col gap-2.5">
              {m.fairness.map((r) => (
                <li key={r.t} className="flex items-start gap-3 border-t border-line pt-2.5">
                  <span aria-hidden="true" className="flex-none pt-px font-bold text-success">
                    ✓
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-14.5 font-semibold">{r.t}</h3>
                    <p className="text-13 leading-normal font-light text-muted">{r.d}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="border-t border-line pt-2.5 text-13 leading-normal font-light text-muted">
              {m.disputeHow}{" "}
              <Link href={routes.disputes(lang)} className="font-medium">
                {m.disputeLog}
              </Link>
            </p>
          </section>
        </div>

        <section aria-labelledby="m-rollout" className="flex flex-col gap-4.5">
          <SectionHead kicker={m.s8} title={m.s8Title} id="m-rollout" />
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16.25rem),1fr))] gap-3">
            {m.phases.map((p, i) => (
              <li key={p.when} className={cn("flex flex-col gap-2 rounded-20 p-5", i === 1 ? "bg-success-tint" : "bg-cream")}>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="mono-label text-10.5 text-caution">{p.when}</span>
                  {i === 1 && <span className="rounded-pill bg-ink px-2 py-0.5 text-11 font-semibold text-cream">{m.now}</span>}
                </span>
                <h3 className="text-19 font-bold tracking-title">{p.t}</h3>
                <p className="text-13.5 leading-[1.6] font-light text-muted">{p.d}</p>
                <p className="border-t border-line-strong pt-2 text-12.5 font-medium text-teal">{fill(m.gate, { gate: p.gate })}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] gap-5">
          <section aria-labelledby="m-metrics" className="flex flex-col gap-2.5 rounded-22 bg-cream p-5.5">
            <h2 id="m-metrics" className="text-20 font-bold">
              {m.metricsTitle}
            </h2>
            <ul className="flex flex-col gap-2">
              {m.metrics.map((x) => (
                <li key={x} className="border-t border-line pt-2 text-13.5 leading-[1.55] font-light">
                  {x}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="m-risks" className="flex flex-col gap-2.5 rounded-22 bg-sand p-5.5">
            <h2 id="m-risks" className="text-20 font-bold text-caution">
              {m.risksTitle}
            </h2>
            <ul className="flex flex-col gap-2">
              {m.risks.map((r) => (
                <li key={r.t} className="flex flex-col gap-0.5 border-t border-line-strong pt-2">
                  <h3 className="text-14 font-semibold">{r.t}</h3>
                  <p className="text-13 leading-normal font-light">{r.d}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <Link href={routes.topLists(lang)} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
          {m.topListsLink}
        </Link>
      </div>
    </>
  );
}
