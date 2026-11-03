// Community Health Champions. Prototype: "Health Gurgaon Community.dc.html" #volunteer.
// Roles (filter ?for=resident|student|professional, pre-select ?role=<slug>), how it works, and the
// application (a Server Action, signed-in; the reference appears in the person's activity). All
// roles render into the static shell as the Suspense fallback; the URL's filter renders under it.
import type { Metadata } from "next";
import { Suspense } from "react";

import { NumberedSteps, SignInNote } from "@/components/community/bits";
import { parseRoleFilter, ROLE_AUDIENCES, type RoleAudience } from "@/components/community/logic";
import { VolunteerBoard, type BoardRole } from "@/components/community/volunteer-board";
import { ChipLink } from "@/components/ui/chip";
import { getCurrentUser } from "@/lib/auth/session";
import { getVolunteerRoles, type VolunteerRoleDTO } from "@/lib/data/community";
import { getDictionary, type Lang } from "@/lib/i18n";
import { communityStrings, type CommunityStrings } from "@/lib/i18n/areas/community";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/volunteer">;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.volunteer;
  return pageMetadata({ lang, href: (l) => routes.volunteer(l), title: t.title, description: t.description });
}

function boardRoles(t: CommunityStrings, roles: VolunteerRoleDTO[]): BoardRole[] {
  return roles.map((r) => {
    const tr = t.volunteer.roleText[r.slug];
    return {
      slug: r.slug,
      title: tr?.title ?? r.title,
      description: tr?.description ?? r.description,
      time: tr?.time ?? r.timeCommitment,
      pay: r.pay,
      payLabel: t.volunteer.payLabels[r.pay] ?? r.payLabel,
      access: tr?.access ?? r.access,
      requiresRegistration: r.requiresRegistration,
    };
  });
}

export default async function VolunteerPage({ searchParams }: Props) {
  const lang = await getLang();
  const t = communityStrings(lang);
  const v = t.volunteer;
  const roles = await getVolunteerRoles();
  return (
    <>
      <section className="on-dark bg-ink text-cream">
        <div className="mx-auto flex w-full max-w-page flex-col gap-3.5 px-6 py-12">
          <span className="mono-label text-11 text-saffron">{v.kicker}</span>
          <h1 className="max-w-[51.25rem] text-[2.875rem] leading-[1.04] font-bold tracking-display text-balance">{v.title}</h1>
          <p className="max-w-[45rem] text-17 leading-[1.6] font-light text-on-dark">{v.intro}</p>
        </div>
      </section>
      <div className="mx-auto flex w-full max-w-page flex-col gap-8 px-6 pt-9 pb-14">
        <Suspense fallback={<Roles lang={lang} t={t} roles={roles} filter={null} role={null} />}>
          <RolesForRequest lang={lang} t={t} roles={roles} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function RolesForRequest({ lang, t, roles, searchParams }: { lang: Lang; t: CommunityStrings; roles: VolunteerRoleDTO[]; searchParams: Props["searchParams"] }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.role) ? sp.role[0] : sp.role;
  return <Roles lang={lang} t={t} roles={roles} filter={parseRoleFilter(sp)} role={roles.some((r) => r.slug === raw) ? (raw ?? null) : null} />;
}

function Roles({ lang, t, roles, filter, role }: { lang: Lang; t: CommunityStrings; roles: VolunteerRoleDTO[]; filter: RoleAudience | null; role: string | null }) {
  const v = t.volunteer;
  const visible = roles.filter((r) => !filter || r.audience === filter).map((r) => r.slug);
  const initialRole = role ?? visible[0] ?? roles[0]?.slug ?? "";
  const signInHref = routes.account(lang, { next: `${routes.volunteer(lang)}#apply` });
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-28 font-bold tracking-h3">{v.roles}</h2>
        <div role="group" aria-label={v.filterLabel} className="flex flex-wrap gap-1.5">
          {[null, ...ROLE_AUDIENCES].map((a) => (
            <ChipLink key={a ?? "all"} href={a ? `${routes.volunteer(lang)}?for=${a}` : routes.volunteer(lang)} selected={filter === a} scroll={false}>
              {v.filters[a ?? "all"]}
            </ChipLink>
          ))}
        </div>
      </div>
      <VolunteerBoard
        // A new key per filter keeps the chosen role in step with the URL.
        key={`${filter ?? "all"}-${role ?? ""}`}
        lang={lang}
        roles={boardRoles(t, roles)}
        visible={visible}
        initialRole={initialRole}
        hrefs={{ signIn: signInHref, activity: routes.accountActivity(lang) }}
        signInNote={
          <Suspense fallback={null}>
            <SignedOutNote t={t} href={signInHref} />
          </Suspense>
        }
        howItWorks={
          <section aria-labelledby="vol-how" className="flex flex-col gap-3.5">
            <h2 id="vol-how" className="text-24 font-bold tracking-h3">
              {v.howTitle}
            </h2>
            <NumberedSteps steps={v.steps} descClassName="leading-[1.5]" />
            <p className="rounded-18 bg-cream p-4 text-13 leading-[1.6] font-light text-muted">
              <b className="font-semibold text-ink">{v.codeTitle}</b> {v.code}
            </p>
          </section>
        }
        labels={{
          chooseRole: v.chooseRole,
          access: v.access,
          noRoles: v.noRoles,
          apply: v.apply,
          applyingFor: v.applyingFor,
          tapToChange: v.tapToChange,
          name: v.name,
          namePlaceholder: v.namePlaceholder,
          locality: v.locality,
          localityPlaceholder: v.localityPlaceholder,
          skills: v.skills,
          skillsPlaceholder: v.skillsPlaceholder,
          optional: t.common.optional,
          availability: v.availability,
          availabilityOptions: v.availabilityOptions,
          registration: v.registration,
          registrationPlaceholder: v.registrationPlaceholder,
          consent: v.consent,
          pay: v.pay,
          submit: v.submit,
          sending: t.common.sending,
          doneTitle: v.doneTitle,
          doneBody: v.doneBody,
          signInLink: t.common.signIn,
          seeActivity: t.common.seeActivity,
        }}
      />
    </>
  );
}

async function SignedOutNote({ t, href }: { t: CommunityStrings; href: string }) {
  if (await getCurrentUser()) return null;
  return <SignInNote text={t.volunteer.signInNote} href={href} linkLabel={t.common.signIn} className="rounded-14 bg-cream px-3.5 py-2.5" />;
}
