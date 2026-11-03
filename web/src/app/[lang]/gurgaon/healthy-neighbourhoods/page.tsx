// Healthy Neighbourhoods: the RWA programme. Prototype: "Health Gurgaon Community.dc.html" #rwa.
// Benefits, ideas, how verification works and "Register your society" (a Server Action; the society
// waits for verification and isn't public until then). Registering needs sign-in: signed-out
// visitors see a note (under <Suspense>) and the action asks again.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { NumberedSteps, SignInNote } from "@/components/community/bits";
import { RwaForm } from "@/components/community/rwa-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getSocieties } from "@/lib/data/community";
import { getDictionary } from "@/lib/i18n";
import { communityStrings, type CommunityStrings } from "@/lib/i18n/areas/community";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.healthyNeighbourhoods;
  return pageMetadata({ lang, href: (l) => routes.healthyNeighbourhoods(l), title: t.title, description: t.description });
}

export default async function HealthyNeighbourhoodsPage() {
  const lang = await getLang();
  const t = communityStrings(lang);
  const r = t.rwa;
  const societies = await getSocieties();
  const example = societies[0] ?? null;
  const signInHref = routes.account(lang, { next: `${routes.healthyNeighbourhoods(lang)}#rwaform` });

  return (
    <>
      <section className="bg-teal text-white">
        <div className="mx-auto grid w-full max-w-page items-center gap-8 px-6 py-12 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="self-start rounded-pill bg-cream px-3 py-1.25 text-12.5 font-semibold text-ink">{r.badge}</span>
            <h1 className="text-[2.875rem] leading-[1.04] font-bold tracking-display text-balance">{r.title}</h1>
            <p className="text-17 leading-[1.6] font-light text-teal-tint">{r.intro}</p>
            <div className="on-dark flex flex-wrap gap-2.5">
              <a href="#rwaform" className="inline-flex min-h-12 items-center rounded-pill bg-cream px-5 font-semibold text-ink hover:bg-white hover:text-ink">
                {r.register}
              </a>
              {example && (
                <Link href={routes.society(lang, example.slug)} className="inline-flex min-h-12 items-center rounded-pill border-[1.5px] border-cream px-5 font-medium text-white hover:bg-white/10 hover:text-white">
                  {r.example}
                </Link>
              )}
            </div>
          </div>
          <div aria-hidden="true" className="relative h-75 rounded-24 bg-[repeating-linear-gradient(135deg,#0B5E57_0_12px,#0d6a62_12px_24px)]">
            <span className="absolute top-3.5 left-4 rounded-6 bg-cream px-2 py-1 font-mono text-11 text-ink">{r.photo}</span>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-page flex-col gap-9 px-6 pt-10 pb-14">
        <section aria-labelledby="rwa-benefits" className="flex flex-col gap-3.5">
          <h2 id="rwa-benefits" className="text-28 font-bold tracking-h3">
            {r.benefitsTitle}
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15.625rem),1fr))] gap-3">
            {r.benefits.map((b) => (
              <li key={b.t} className="flex flex-col gap-1.5 rounded-20 bg-cream p-4.5">
                <span className="text-16 font-semibold">{b.t}</span>
                <span className="text-13.5 leading-[1.55] font-light text-muted">{b.d}</span>
              </li>
            ))}
          </ul>
          <p className="text-13 font-light text-subtle">{r.noPromise}</p>
        </section>

        <section aria-labelledby="rwa-ideas" className="flex flex-col gap-3.5">
          <h2 id="rwa-ideas" className="text-28 font-bold tracking-h3">
            {r.ideasTitle}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {r.ideas.map((a) => (
              <li key={a} className="rounded-pill border-[1.5px] border-line px-3.75 py-2.25 text-14">
                {a}
              </li>
            ))}
          </ul>
        </section>

        <div id="rwaform" className="grid scroll-mt-24 items-start gap-7 lg:grid-cols-2">
          <section aria-labelledby="rwa-verify" className="flex flex-col gap-3">
            <h2 id="rwa-verify" className="text-28 font-bold tracking-h3">
              {r.verifyTitle}
            </h2>
            <p className="text-15 leading-[1.65] font-light text-muted">{r.verifyBody}</p>
            <NumberedSteps steps={r.steps} />
          </section>
          <section aria-label={r.formTitle} className="flex flex-col gap-3.5 rounded-24 border-[1.5px] border-ink p-6">
            <RwaForm
              lang={lang}
              signInHref={signInHref}
              notice={
                <Suspense fallback={null}>
                  <SignedOutNote t={t} href={signInHref} />
                </Suspense>
              }
              labels={{
                formTitle: r.formTitle,
                name: r.name,
                namePlaceholder: r.namePlaceholder,
                locality: r.locality,
                localityPlaceholder: r.localityPlaceholder,
                contact: r.contact,
                contactPlaceholder: r.contactPlaceholder,
                role: r.role,
                rolePlaceholder: r.rolePlaceholder,
                optional: t.common.optional,
                groupType: r.groupType,
                groupTypes: r.groupTypes,
                channel: r.channel,
                channels: r.channels,
                channelsLower: r.channelsLower,
                consent: r.consent,
                submit: r.submit,
                sending: t.common.sending,
                doneTitle: r.doneTitle,
                doneBody: r.doneBody,
                doneRef: r.doneRef,
                dashboard: r.dashboard,
                signInLink: t.common.signIn,
              }}
            />
          </section>
        </div>
      </div>
    </>
  );
}

async function SignedOutNote({ t, href }: { t: CommunityStrings; href: string }) {
  if (await getCurrentUser()) return null;
  return <SignInNote text={t.rwa.signInNote} href={href} linkLabel={t.common.signIn} className="rounded-14 bg-cream px-3.5 py-2.5" />;
}
