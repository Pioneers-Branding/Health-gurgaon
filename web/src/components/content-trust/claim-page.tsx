// /claim/[kind]/[slug]: "Claim your profile". Prototype: "Health Gurgaon Content and Trust.dc.html"
// #claim. Claiming needs sign-in (checked under <Suspense>, with ?next= back here); the claim then
// waits for an editor in the claims queue.

import Link from "next/link";
import { Suspense } from "react";

import { Callout } from "@/components/ui/callout";
import { isStaff } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getMyActivity } from "@/lib/data/account";
import type { ProviderProfile } from "@/lib/data/providers";
import { fmt, getDictionary, type Lang } from "@/lib/i18n";
import { contentTrustStrings, type ContentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { routes, type ProviderKind } from "@/lib/routes";

import { FormHeader } from "./bits";
import { ClaimFlow, type ClaimFlowProps } from "./claim-flow";
import { providerLine } from "./format";

export function ClaimPageView({ lang, kind, profile }: { lang: Lang; kind: ProviderKind; profile: ProviderProfile }) {
  const t = contentTrustStrings(lang);
  const tc = t.claim;
  const dict = getDictionary(lang);
  const profileHref = routes.provider(lang, kind, profile.slug);
  const flowProps: ClaimFlowProps = {
    lang,
    kind,
    slug: profile.slug,
    listing: { name: profile.name, line: providerLine(profile) },
    labels: {
      steps: tc.steps,
      progress: dict.stepper.progress,
      doneStep: dict.stepper.done,
      findTitle: tc.findTitle,
      notYours: tc.notYours,
      searchLabel: tc.searchLabel,
      searchPlaceholder: tc.searchPlaceholder,
      search: tc.search,
      noMatches: tc.noMatches,
      alreadyClaimed: tc.alreadyClaimed,
      claimThis: tc.claimThis,
      notListed: tc.notListed,
      requestListing: tc.requestListing,
      notListedRest: tc.notListedRest,
      whoTitle: tc.whoTitle,
      roles: tc.roles,
      regLabel: kind === "doctor" ? tc.regLabel : tc.regLabelFacility,
      regPlaceholder: tc.regPlaceholder,
      regHelp: tc.regHelp,
      errRole: tc.errRole,
      errReg: tc.errReg,
      confirmTitle: tc.confirmTitle,
      confirmBody: tc.confirmBody,
      codeLabel: tc.codeLabel,
      codePlaceholder: tc.codePlaceholder,
      devCode: tc.devCode,
      resend: tc.resend,
      errCode: tc.errCode,
      doneTitle: tc.doneTitle,
      doneBody: tc.doneBody,
      doneBodyNoPhone: tc.doneBodyNoPhone,
      canEdit: tc.canEdit,
      canEditBody: tc.canEditBody,
      editorControlled: tc.editorControlled,
      editorControlledBody: tc.editorControlledBody,
      reference: t.common.reference,
      back: t.common.back,
      continue: t.common.continue,
      sending: t.common.sending,
      backToProfile: t.common.backToProfile,
      trackIt: t.common.trackIt,
      signIn: t.common.signIn,
    },
    profileHref,
    activityHref: routes.accountActivity(lang),
    missingHref: routes.report(lang, kind, profile.slug, { type: "missing" }),
    signInHref: routes.account(lang, { next: routes.claim(lang, kind, profile.slug) }),
  };
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-5 px-6 pt-7 pb-16">
      <FormHeader title={tc.title}>{tc.intro}</FormHeader>
      {profile.claimed ? (
        <Callout title={tc.claimedTitle}>
          <p>{tc.claimedBody}</p>
          <div className="flex flex-wrap gap-x-5">
            <Link href={routes.report(lang, kind, profile.slug)} className="inline-flex min-h-11 items-center font-medium">
              {tc.claimedLink}
            </Link>
            <Link href={profileHref} className="inline-flex min-h-11 items-center font-medium">
              {t.common.backToProfile}
            </Link>
          </div>
        </Callout>
      ) : (
        <Suspense fallback={<ClaimFlow {...flowProps} />}>
          <ClaimGate lang={lang} t={t} kind={kind} slug={profile.slug} name={profile.name} flowProps={flowProps} />
        </Suspense>
      )}
    </div>
  );
}

/** Who is claiming. The flow stays mounted in the same place whatever the gate finds, so "Claim
 * received" survives the refresh that follows sending (which makes it a pending claim). */
async function ClaimGate({ lang, t, kind, slug, name, flowProps }: { lang: Lang; t: ContentTrustStrings; kind: ProviderKind; slug: string; name: string; flowProps: ClaimFlowProps }) {
  const user = await requireUser({ lang, next: routes.claim(lang, kind, slug) });
  if (isStaff(user.role)) return <Callout tone="warning" title={t.claim.notAllowed} />;
  const activity = await getMyActivity();
  const pending = activity?.items.find(
    (i) => i.kind === "claim" && i.title === `Claim of ${name}` && (i.status === "pending" || i.status === "info_requested" || i.status === "escalated"),
  );
  return <ClaimFlow {...flowProps} pending={pending ? { title: t.claim.pendingTitle, body: fmt(t.claim.pendingBody, { ref: pending.ref ?? "" }) } : null} />;
}
