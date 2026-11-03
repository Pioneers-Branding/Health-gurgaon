// /gurgaon/emergency (prototype #emergency): Call 112 / Ambulance 108, red flags, 24×7 emergency
// departments ordered from the reader's locality (?from=), blood banks with phones on request,
// 24-hour chemists, mental health support and the "Keep ready" checklist.
// Anchors used by the shell: #emergency-departments, #ambulance, #blood-banks.

import Link from "next/link";
import { Suspense } from "react";

import { ButtonAnchor, ButtonLink } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/ui/json-ld";
import type { EmergencyDirectory } from "@/lib/data/providers";
import { emergencyLocalityOptions, orderEmergencyDepartments } from "@/lib/emergency";
import { fmt, formatDate, getDictionary, type Lang } from "@/lib/i18n";
import { findCareStrings, type FindCareStrings } from "@/lib/i18n/areas/find-care";
import { SITE_URL } from "@/lib/i18n/metadata";
import { ALL_GURUGRAM, getLocality, localityName } from "@/lib/localities";
import { routes } from "@/lib/routes";

import { AutoSubmitForm } from "./auto-submit-form";
import { CheckBadge, OwnershipPill } from "./bits";
import { directionsUrl } from "./format";
import { KeepReady } from "./list-finders";
import { PhoneButton } from "./phone-button";

type Raw = Record<string, string | string[] | undefined>;

function confirmedText(t: FindCareStrings, lang: Lang, source: string | null, date: string | null, template: string): string | null {
  if (source && date && /confirmed by call/i.test(source)) return fmt(template, { date: formatDate(lang, date) });
  return source;
}

export function EmergencyView({ lang, directory, searchParams }: { lang: Lang; directory: EmergencyDirectory; searchParams: Promise<Raw> }) {
  const t = findCareStrings(lang);
  const e = t.emergency;
  const dict = getDictionary(lang);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home, item: `${SITE_URL}${routes.home(lang)}` },
            { "@type": "ListItem", position: 2, name: e.h1, item: `${SITE_URL}${routes.emergency(lang)}` },
          ],
        }}
      />
      <div className="bg-cream">
        <Container className="grid items-start gap-7 pt-7 pb-9 min-[916px]:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3.5">
            <Breadcrumbs lang={lang} items={[{ label: t.crumbs.emergency }]} />
            <h1 className="text-36 leading-[1.05] font-bold tracking-display sm:text-44">{e.h1}</h1>
            <p className="max-w-[35rem] text-16.5 leading-[1.6] font-light text-muted">{e.intro}</p>
            <div id="ambulance" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11.875rem),1fr))] gap-3">
              <a href="tel:112" className="flex min-h-23 flex-col justify-center gap-1 rounded-20 bg-emergency px-5 py-4.5 text-white no-underline hover:bg-[#8f1c13] hover:text-white">
                <span className="text-30 leading-[1.1] font-bold tracking-h3">{e.call112}</span>
                <span className="text-13.5 font-light">{e.call112Sub}</span>
              </a>
              <a href="tel:108" className="flex min-h-23 flex-col justify-center gap-1 rounded-20 bg-ink px-5 py-4.5 text-cream no-underline hover:bg-ink-soft hover:text-cream">
                <span className="text-30 leading-[1.1] font-bold tracking-h3">{e.ambulance}</span>
                <span className="text-13.5 font-light text-on-dark">{e.ambulanceSub}</span>
              </a>
            </div>
          </div>
          <section aria-labelledby="red-flags-title" className="flex flex-col gap-3 rounded-20 border-2 border-emergency bg-white px-5.5 py-5">
            <h2 id="red-flags-title" className="text-17 leading-[1.4] font-semibold text-emergency">
              {e.redTitle}
            </h2>
            <ul className="flex flex-col gap-2.25">
              {e.redFlags.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-15 leading-[1.45]">
                  <span aria-hidden="true" className="mt-1.75 size-2 flex-none rounded-full bg-emergency" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-14 leading-[1.55] font-light text-muted">{e.redMore}</p>
          </section>
        </Container>
      </div>

      <Container className="flex flex-col gap-9 pt-8 pb-14">
        <Suspense fallback={<Departments lang={lang} t={t} directory={directory} from={null} />}>
          <DepartmentsFromParams lang={lang} t={t} directory={directory} searchParams={searchParams} />
        </Suspense>

        <div className="flex flex-wrap items-start gap-6">
          <section id="blood-banks" aria-labelledby="blood-title" className="flex min-w-0 flex-[2_1_32.5rem] flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <h2 id="blood-title" className="text-26 font-bold tracking-h3">
                {e.bloodTitle}
              </h2>
              <p className="text-13 font-light text-subtle">{e.bloodSub}</p>
            </div>
            <p className="rounded-14 bg-emergency-tint px-4 py-3 text-14 leading-normal">
              <b className="font-semibold">{e.callAhead}</b>
              {e.callAheadBody}
            </p>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,14.375rem),1fr))] gap-2.5">
              {directory.bloodBanks.map((b) => {
                const src = confirmedText(t, lang, b.source, b.checkedAt, e.hoursConfirmedByCall);
                const hours = b.hours && /^open 24 hours$/i.test(b.hours) ? t.hours.open24 : b.hours;
                return (
                  <li key={b.slug} className="flex flex-col gap-2 rounded-20 border border-line p-4">
                    <h3 className="text-15.5 leading-[1.35] font-semibold">
                      <Link href={routes.hospital(lang, b.slug)} className="text-ink hover:text-teal">
                        {b.name}
                      </Link>
                    </h3>
                    {b.areaLabel && <p className="text-13 font-light text-muted">{b.areaLabel}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      <OwnershipPill ownership={b.ownership} t={t} />
                      {b.badges.includes("Licence seen") && <CheckBadge lang={lang} label="Licence seen" />}
                    </div>
                    {hours && <p className="text-14 font-medium">{hours}</p>}
                    {src && <p className="text-12 font-light text-success">✓ {src}</p>}
                    <div className="mt-auto pt-1">
                      <PhoneButton
                        lang={lang}
                        slug={b.slug}
                        variant="outline"
                        labels={{ show: t.profile.showPhoneGeneric, loading: t.profile.phoneLoading, shown: "{phone}", call: t.profile.call, none: t.profile.noPhone }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link href={routes.events(lang, { type: "blood_drive" })} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
              {e.drives}
            </Link>
          </section>
          <aside className="flex min-w-0 flex-[1_1_16.25rem] flex-col gap-3">
            <section aria-labelledby="chemists-title" className="flex flex-col gap-2 rounded-20 bg-cream p-4.5">
              <h2 id="chemists-title" className="text-16 font-semibold">
                {e.chemistsTitle}
              </h2>
              <p className="text-13.5 leading-normal font-light text-muted">{e.chemistsBody}</p>
              <ButtonLink href={routes.search(lang, { q: "chemist", kind: "pharmacy", open: true, sort: "dist" })} variant="dark" size="sm" className="self-start">
                {e.chemistsCta}
              </ButtonLink>
            </section>
            <section aria-labelledby="mental-title" className="flex flex-col gap-2 rounded-20 border border-line p-4.5">
              <h2 id="mental-title" className="text-16 font-semibold">
                {e.mentalTitle}
              </h2>
              <p className="text-13.5 leading-normal font-light text-muted">{e.mentalBody}</p>
              <ButtonAnchor href="tel:14416" variant="primary" size="sm" className="self-start">
                {e.mentalCta}
              </ButtonAnchor>
            </section>
            <KeepReady title={e.readyTitle} items={e.readyItems} countLabel={e.readyCount} />
          </aside>
        </div>
        <p className="border-t border-line pt-4 text-12.5 leading-[1.55] font-light text-subtle">{e.footer}</p>
      </Container>
    </>
  );
}

async function DepartmentsFromParams({ lang, t, directory, searchParams }: { lang: Lang; t: FindCareStrings; directory: EmergencyDirectory; searchParams: Promise<Raw> }) {
  const raw = await searchParams;
  const v = Array.isArray(raw.from) ? raw.from[0] : raw.from;
  return <Departments lang={lang} t={t} directory={directory} from={v ?? null} />;
}

function Departments({ lang, t, directory, from }: { lang: Lang; t: FindCareStrings; directory: EmergencyDirectory; from: string | null }) {
  const e = t.emergency;
  const options = emergencyLocalityOptions(directory.departments);
  const valid = from && options.some((o) => o.slug === from) ? from : ALL_GURUGRAM.slug;
  const ordered = orderEmergencyDepartments(directory.departments, valid);
  const L = getLocality(valid);
  const note = L ? fmt(e.erNoteFrom, { place: localityName(L.slug, lang) }) : e.erNoteCentral;
  return (
    <section id="emergency-departments" aria-labelledby="er-list-title" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="er-list-title" className="text-26 font-bold tracking-h3">
            {e.erTitle}
          </h2>
          <p aria-live="polite" className="text-13 font-light text-subtle">
            {note}
          </p>
        </div>
        <AutoSubmitForm key={valid} action={routes.emergency(lang)} label={e.yourLocality} submitLabel={e.show} className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="er-from" className="text-13.5 font-medium">
            {e.yourLocality}
          </label>
          <select
            id="er-from"
            name="from"
            defaultValue={valid}
            className="min-h-11 cursor-pointer rounded-12 border-[1.5px] border-line-strong bg-white px-3 text-14"
          >
            {options.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.slug === ALL_GURUGRAM.slug ? t.allGurugram : localityName(o.slug, lang)}
              </option>
            ))}
          </select>
        </AutoSubmitForm>
      </div>
      {ordered.length > 0 ? (
        <ol className="flex flex-col gap-2.5">
          {ordered.map((d) => {
            const src = confirmedText(t, lang, d.source, d.checkedAt, e.confirmedByCall);
            return (
              <li key={d.slug} className="flex flex-wrap items-center gap-3.5 rounded-20 border border-line px-4.5 py-4">
                <span className="flex h-14 w-16 flex-none flex-col items-center justify-center rounded-16 bg-emergency-tint text-emergency">
                  {d.distanceKm !== null ? (
                    <>
                      <span aria-hidden="true" className="text-18 leading-none font-bold">
                        {d.distanceKm.toFixed(1)}
                      </span>
                      <span aria-hidden="true" className="mt-0.75 font-mono text-9.5 font-medium">
                        {e.km}
                      </span>
                      <span className="sr-only">{fmt(e.distance, { km: d.distanceKm.toFixed(1) })}</span>
                    </>
                  ) : (
                    <span className="px-1 text-center text-10 leading-tight">{e.noDistance}</span>
                  )}
                </span>
                <div className="flex min-w-[min(100%,15rem)] flex-1 flex-col gap-1.5">
                  <h3 className="text-17 font-semibold tracking-card">{d.name}</h3>
                  <p lang="en" className="text-13.5 font-light text-muted">
                    {d.areaLabel}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <OwnershipPill ownership={d.ownership} t={t} />
                    <span
                      className={
                        d.children
                          ? "inline-flex rounded-pill bg-success-tint px-2.5 py-0.75 text-11.5 font-semibold text-success"
                          : "inline-flex rounded-pill bg-cream px-2.5 py-0.75 text-11.5 font-semibold text-caution"
                      }
                    >
                      {d.children ? e.kidsYes : e.kidsNo}
                    </span>
                  </div>
                  {src && <p className="text-12 font-light text-success">✓ {src}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonAnchor
                    href={directionsUrl([d.name, d.areaLabel])}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outline"
                    size="sm"
                    aria-label={t.profile.directionsLabel.replace("{name}", d.name)}
                  >
                    {t.profile.directions}
                  </ButtonAnchor>
                  <ButtonLink href={routes.provider(lang, d.profileKind, d.slug)} variant="dark" size="sm">
                    {t.card.viewProfile}
                  </ButtonLink>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-20 bg-cream p-4.5 text-14 font-light text-muted">{e.none}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <p className="max-w-[40rem] text-13 leading-[1.55] font-light text-muted">{e.erFooter}</p>
        <ButtonLink href={routes.search(lang, { intent: "report", type: "hospital" })} variant="outline" size="sm">
          {e.suggestCorrection}
        </ButtonLink>
      </div>
    </section>
  );
}
