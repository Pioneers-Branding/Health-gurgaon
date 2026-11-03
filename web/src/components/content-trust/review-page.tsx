// /review/[kind]/[slug]: "Share your experience". Prototype: "Health Gurgaon Content and Trust.dc.html"
// #review. The heading and the form are in the static shell; who is writing (sign-in, the label
// the review will be signed with, an earlier review of the same listing) is checked under
// <Suspense>, and the Server Action checks again.

import Link from "next/link";
import { Suspense } from "react";

import { Callout } from "@/components/ui/callout";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getMyActivity } from "@/lib/data/account";
import type { ProviderProfile } from "@/lib/data/providers";
import { REVIEW_QUESTIONS, REVIEW_VISIT_TYPES } from "@/lib/domain";
import { fmt, type Lang } from "@/lib/i18n";
import { contentTrustStrings, type ContentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { routes, type ProviderKind } from "@/lib/routes";

import { dataLang, FormHeader } from "./bits";
import { providerLine, visitMonthDisplay } from "./format";
import { ReviewForm, type ReviewFormProps } from "./review-form";

export function ReviewPageView({ lang, kind, profile, months }: { lang: Lang; kind: ProviderKind; profile: ProviderProfile; months: string[] }) {
  const t = contentTrustStrings(lang);
  const tr = t.review;
  const profileHref = routes.provider(lang, kind, profile.slug);
  const doctor = kind === "doctor";
  const formProps: ReviewFormProps = {
    lang,
    kind,
    slug: profile.slug,
    months: months.map((m) => ({ value: m, label: visitMonthDisplay(lang, m, tr.earlierIn) })),
    visitTypes: REVIEW_VISIT_TYPES.map((v) => ({ value: v, label: tr.visitTypes[v] ?? v })),
    departments: kind === "hospital" && profile.departments.length ? profile.departments.map((d) => ({ value: d.name, label: d.name })) : null,
    questions: REVIEW_QUESTIONS.map((q) => ({
      key: q.key,
      q: q.key === "explained" ? (doctor ? tr.questions.explained : tr.questions.explainedStaff) : q.key === "access" ? (doctor ? tr.questions.access : tr.questions.accessPlace) : tr.questions[q.key],
      options: q.options.map((o) => ({ value: o, label: tr.options[o] ?? o })),
    })),
    labels: {
      guidance: tr.guidance,
      when: tr.when,
      chooseMonth: tr.chooseMonth,
      type: tr.type,
      choose: tr.choose,
      department: tr.department,
      anyDepartment: tr.anyDepartment,
      words: tr.words,
      placeholder: tr.placeholder,
      characters: t.common.characters,
      conflict: tr.conflict,
      submit: tr.submit,
      sending: t.common.sending,
      errVisit: tr.errVisit,
      errText: tr.errText,
      errConflict: tr.errConflict,
      phoneWarning: t.forms.phoneWarningReview,
      medicalWarning: t.forms.medicalWarningReview,
      doneTitle: tr.doneTitle,
      doneBody: tr.doneBody,
      redacted: tr.redacted,
      backToProfile: t.common.backToProfile,
      trackIt: t.common.trackIt,
      signIn: t.common.signIn,
    },
    profileHref,
    activityHref: routes.accountActivity(lang),
    signInHref: routes.account(lang, { next: routes.review(lang, kind, profile.slug) }),
  };
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-5 px-6 pt-7 pb-16">
      <FormHeader title={tr.title}>
        {tr.reviewing}{" "}
        <Link href={profileHref} lang={dataLang(lang)} className="font-semibold text-ink hover:text-teal">
          {profile.name}
        </Link>
        , <span lang={dataLang(lang)}>{providerLine(profile)}</span>
      </FormHeader>
      <Suspense fallback={<ReviewForm {...formProps} />}>
        <ReviewGate lang={lang} t={t} kind={kind} slug={profile.slug} name={profile.name} formProps={formProps} />
      </Suspense>
    </div>
  );
}

/** Who is writing. The form stays mounted in the same place whatever the gate finds, so the
 * thank-you panel survives the refresh that follows a submission (which makes this review the
 * person's "earlier review"). */
async function ReviewGate({ lang, t, kind, slug, name, formProps }: { lang: Lang; t: ContentTrustStrings; kind: ProviderKind; slug: string; name: string; formProps: ReviewFormProps }) {
  const user = await requireUser({ lang, next: routes.review(lang, kind, slug) });
  if (!can(user.role, "write_review")) {
    return (
      <Callout tone="warning" title={t.review.notAllowed}>
        <Link href={routes.provider(lang, kind, slug)} className="inline-flex min-h-11 items-center font-medium">
          {t.common.backToProfile}
        </Link>
      </Callout>
    );
  }
  const activity = await getMyActivity();
  const existing = activity?.reviews.find((r) => r.provider.slug === slug && (r.status === "pending" || r.status === "published" || r.status === "needs_changes"));
  return (
    <>
      <p className="-mt-1 text-13.5 leading-normal font-light text-muted">
        {fmt(t.review.signedAs, { label: user.reviewLabel })}{" "}
        <Link href={routes.accountConsent(lang)} className="font-normal">
          {t.review.changeLabel}
        </Link>
      </p>
      <ReviewForm {...formProps} already={existing ? { title: fmt(t.review.already, { name }), linkLabel: t.review.alreadyLink } : null} />
    </>
  );
}
