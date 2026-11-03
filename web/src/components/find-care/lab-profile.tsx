// Diagnostic lab and pharmacy profiles (prototype #lab, "Diagnostic / pharmacy"; the pharmacy
// page has no prototype screen of its own and follows the lab layout): header with the open-now
// pill, opening hours with source and "These hours are wrong", home collection or delivery, and
// the tests table (labs) or the chemist's details (pharmacies).

import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { Disclaimer } from "@/components/ui/disclaimer";
import { FreshnessStamp } from "@/components/ui/freshness-stamp";
import { JsonLd } from "@/components/ui/json-ld";
import type { ProviderProfile } from "@/lib/data/providers";
import { fmt, formatDate, getDictionary, type Lang } from "@/lib/i18n";
import { dataLabel, findCareStrings, type FindCareStrings } from "@/lib/i18n/areas/find-care";
import { routes } from "@/lib/routes";

import { CheckBadge, Stamp } from "./bits";
import { doctorFacts, FactsGrid } from "./doctor-profile";
import { HoursReportButton } from "./hours-report-button";
import { TestFinder } from "./list-finders";
import { PhoneButton } from "./phone-button";
import { DirectionsLink, OpenNowPill, ProfileHoursTable, profileJsonLd, SaveForProfile } from "./profile-parts";

export function LabProfile({ lang, profile, kind }: { lang: Lang; profile: ProviderProfile; kind: "lab" | "pharmacy" }) {
  const t = findCareStrings(lang);
  const dict = getDictionary(lang);
  const href = routes.provider(lang, kind, profile.slug);
  const listLabel = kind === "lab" ? t.crumbs.diagnostics : t.crumbs.chemists;
  const listHref = routes.search(lang, { type: kind });
  const sub = [dataLabel(lang, profile.headline), profile.areaLabel, profile.sample ? t.sampleListing : null].filter(Boolean).join(" · ");
  const h = profile.hours;
  const sampleHours = !!h.source && /sample|not yet verified/i.test(h.source);

  return (
    <>
      <JsonLd
        data={profileJsonLd(lang, profile, [
          { name: dict.breadcrumbs.home, href: routes.home(lang) },
          { name: listLabel, href: listHref },
          { name: profile.name, href },
        ])}
      />
      <Container className="flex flex-col gap-6 pt-7 pb-14">
        <Breadcrumbs lang={lang} items={[{ label: listLabel, href: listHref }, { label: profile.name }]} />
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-32 leading-[1.08] font-bold tracking-h1 sm:text-38">{profile.name}</h1>
            <p className="text-15 font-light text-muted">{sub}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {profile.badges.map((b) => (
                <CheckBadge key={b} lang={lang} label={b} size="md" />
              ))}
              {profile.lastCheckedAt && <FreshnessStamp lang={lang} date={profile.lastCheckedAt} className="py-1.25" />}
            </div>
            <div className="flex flex-wrap gap-2 pt-1.5">
              {profile.hasPublicPhone && (
                <PhoneButton
                  lang={lang}
                  slug={profile.slug}
                  variant="outline"
                  labels={{ show: t.profile.showPhoneGeneric, loading: t.profile.phoneLoading, shown: "{phone}", call: t.profile.call, none: t.profile.noPhone }}
                />
              )}
              <DirectionsLink t={t} profile={profile} size="sm" />
              <SaveForProfile lang={lang} t={t} profile={profile} size="md" />
            </div>
          </div>
          <OpenNowPill lang={lang} slug={profile.slug} t={t} />
        </div>

        <div className="grid items-start gap-6 min-[1028px]:grid-cols-3">
          <section aria-labelledby="hours-title" className="flex min-w-0 flex-col gap-3">
            <h2 id="hours-title" className="text-20 font-semibold">
              {t.hours.title}
            </h2>
            {h.underRecheck && (
              <Callout tone="warning" title={t.hours.underRecheck}>
                <p>{t.hours.underRecheckBody}</p>
              </Callout>
            )}
            {h.days ? (
              <ProfileHoursTable slug={profile.slug} days={h.days} t={t} />
            ) : (
              <p className="rounded-20 bg-cream p-4.5 text-14 font-light text-muted">{h.summary ?? t.hours.notVerified}</p>
            )}
            {h.source && (
              <Stamp tone={sampleHours ? "subtle" : "success"}>
                {h.checkedAt ? fmt(t.hours.source, { source: h.source, date: formatDate(lang, h.checkedAt) }) : fmt(t.hours.sourceNoDate, { source: h.source })}
              </Stamp>
            )}
            {profile.recentChanges.slice(0, 1).map((c) => (
              <p key={c.changedAt} className="text-13 leading-normal font-light text-muted">
                <b className="font-semibold text-ink">{t.profile.lastChanged}:</b> <span lang="en">{c.summary}</span>
              </p>
            ))}
            {h.days && (
              <HoursReportButton
                lang={lang}
                slug={profile.slug}
                underRecheck={h.underRecheck}
                labels={{ wrong: t.hours.wrong, sending: t.hours.sending, signIn: t.hours.signIn }}
                signInHref={routes.account(lang, { next: href })}
              />
            )}
            {kind === "lab" && profile.homeCollection && (
              <div className="mt-2 flex flex-col gap-2 rounded-20 bg-cream p-4.5">
                <h2 className="font-semibold">{t.lab.homeCollection}</h2>
                <p lang="en" className="text-13.5 leading-[1.55] font-light text-muted">
                  {fmt(t.lab.homeCollectionBody, {
                    hours: profile.homeCollection.hours,
                    area: profile.homeCollection.area,
                    booking: profile.homeCollection.booking,
                    charge: profile.homeCollection.charge,
                  })}
                </p>
              </div>
            )}
            {kind === "pharmacy" && (
              <div className="mt-2 flex flex-col gap-2 rounded-20 bg-cream p-4.5">
                <h2 className="font-semibold">{t.pharmacy.delivery}</h2>
                <p className="text-13.5 leading-[1.55] font-light text-muted">{profile.delivery ? t.pharmacy.deliveryBody : t.pharmacy.noDelivery}</p>
              </div>
            )}
          </section>

          <div className="flex min-w-0 flex-col gap-3 min-[1028px]:col-span-2">
            {kind === "lab" ? (
              <>
                {profile.tests.length > 0 ? (
                  <TestFinder
                    tests={profile.tests}
                    labels={{ title: t.lab.tests, search: t.lab.testSearch, test: t.lab.testCol, reportIn: t.lab.reportIn, price: t.lab.price, none: t.lab.noTest }}
                  />
                ) : (
                  <section aria-labelledby="tests-title" className="flex flex-col gap-3">
                    <h2 id="tests-title" className="text-20 font-semibold">
                      {t.lab.tests}
                    </h2>
                    <p className="rounded-20 bg-cream p-4.5 text-14 font-light text-muted">{t.lab.noTests}</p>
                  </section>
                )}
                <p className="text-12 font-light text-subtle">{t.lab.priceNote}</p>
              </>
            ) : (
              <PharmacyDetails lang={lang} t={t} profile={profile} />
            )}
            <MoreLinks lang={lang} t={t} profile={profile} kind={kind} />
          </div>
        </div>
      </Container>
    </>
  );
}

function PharmacyDetails({ lang, t, profile }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile }) {
  const facts = doctorFacts(lang, t, profile).filter((f) => f.key !== "fee" && f.key !== "registration" && f.key !== "qualifications");
  const note = profile.lastCheckedAt ? fmt(t.profile.factsFallbackNote, { date: formatDate(lang, profile.lastCheckedAt) }) : null;
  const extra = [
    ...(profile.tags.length ? [{ key: "services", label: t.profile.services, value: profile.tags.map((x) => dataLabel(lang, x)).join(", "), note, tone: "muted" as const }] : []),
    { key: "delivery", label: t.profile.factLabels.delivery, value: profile.delivery ? t.profile.deliveryYes : t.pharmacy.noDelivery, note, tone: "muted" as const },
  ];
  return (
    <section aria-labelledby="details-title" className="flex flex-col gap-3">
      <h2 id="details-title" className="text-20 font-semibold">
        {t.pharmacy.details}
      </h2>
      <FactsGrid facts={[...extra, ...facts]} />
      <p className="text-12 font-light text-subtle">{t.pharmacy.chemistNote}</p>
      {profile.open24h && (
        <Link href={routes.search(lang, { q: "chemist", kind: "pharmacy", open: true, sort: "dist" })} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
          {t.pharmacy.nearby}
        </Link>
      )}
    </section>
  );
}

function MoreLinks({ lang, t, profile, kind }: { lang: Lang; t: FindCareStrings; profile: ProviderProfile; kind: "lab" | "pharmacy" }) {
  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
      <div className="flex flex-wrap gap-x-5">
        <Link href={routes.providerReviews(lang, kind, profile.slug)} className="inline-flex min-h-11 items-center text-14 font-medium">
          {t.profile.allReviews}
        </Link>
        <Link href={routes.report(lang, kind, profile.slug)} className="inline-flex min-h-11 items-center text-14 font-medium">
          {t.profile.suggestCorrection}
        </Link>
        {!profile.claimed && (
          <Link href={routes.claim(lang, kind, profile.slug)} className="inline-flex min-h-11 items-center text-14 font-medium">
            {t.profile.claimCta}
          </Link>
        )}
      </div>
      <Disclaimer lang={lang} kinds={["medical", "listing"]} />
    </div>
  );
}
