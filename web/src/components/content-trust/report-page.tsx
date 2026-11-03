// /report/[kind]/[slug]: "Report incorrect information". Prototype: "Health Gurgaon Content and
// Trust.dc.html" #report. The three forms are in the static shell (a fact is wrong, open first);
// ?type= and ?field= pre-select a form and a field, and ?review=<ref> turns the page into
// "Report a review" (checked by a moderator against the review policy). Those read the URL, so
// they render under <Suspense>.

import Link from "next/link";
import { Suspense } from "react";

import { getProviderReviews } from "@/lib/data/providers";
import { fmt, type Lang } from "@/lib/i18n";
import { contentTrustStrings, type ContentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { getLocality, localityName } from "@/lib/localities";
import { isProviderKind, routes } from "@/lib/routes";

import { reportFieldsFor, type ReportFormKind } from "@/app/actions/report-schemas";
import { REVIEW_REF } from "@/lib/validation/review";

import { FormHeader } from "./bits";
import { ReportForms, ReviewFlagForm, SuggestListingForm, type ReportCommon } from "./report-forms";

export type ReportTarget = { kind: ReportFormKind; slug: string; label: string; backHref: string; backLabel: string };

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function ReportPageView({ lang, target, searchParams }: { lang: Lang; target: ReportTarget; searchParams: SP }) {
  const t = contentTrustStrings(lang);
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-5 px-6 pt-7 pb-16">
      <Suspense fallback={<StandardReport lang={lang} t={t} target={target} type="fact" field="" />}>
        <ReportSwitch lang={lang} t={t} target={target} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function common(t: ContentTrustStrings): ReportCommon {
  return {
    optional: t.common.optional,
    sending: t.common.sending,
    trackIt: t.common.trackIt,
    emailPlaceholder: t.forms.emailPlaceholder,
    emailInvalid: t.forms.emailInvalid,
    phoneWarning: t.forms.phoneWarningReport,
    medicalWarning: t.forms.medicalWarningReport,
  };
}

function StandardReport({ lang, t, target, type, field, notice }: { lang: Lang; t: ContentTrustStrings; target: ReportTarget; type: "fact" | "complaint" | "missing"; field: string; notice?: string }) {
  const fieldNames = target.kind === "event" ? t.report.eventFields : t.report.fields;
  return (
    <>
      <FormHeader title={t.report.title}>{t.report.intro}</FormHeader>
      {notice && <p className="rounded-18 bg-cream px-4.5 py-3.5 text-13.5 leading-[1.6] font-light text-muted">{notice}</p>}
      <ReportForms
        lang={lang}
        kind={target.kind}
        slug={target.slug}
        itemLabel={target.label}
        fields={reportFieldsFor(target.kind).map((f) => ({ value: f, label: fieldNames[f] ?? f }))}
        initialType={type}
        initialField={field}
        labels={t.report}
        common={common(t)}
        backHref={target.backHref}
        backLabel={target.backLabel}
        activityHref={routes.accountActivity(lang)}
      />
    </>
  );
}

async function ReportSwitch({ lang, t, target, searchParams }: { lang: Lang; t: ContentTrustStrings; target: ReportTarget; searchParams: SP }) {
  const sp = await searchParams;
  const reviewRef = first(sp.review);
  const rawType = first(sp.type);
  const type = rawType === "complaint" || rawType === "missing" ? rawType : "fact";
  const field = first(sp.field);

  if (reviewRef && isProviderKind(target.kind)) {
    const data = REVIEW_REF.test(reviewRef) ? await getProviderReviews(target.slug) : null;
    const review = data?.reviews.find((r) => r.ref === reviewRef);
    if (!review) return <StandardReport lang={lang} t={t} target={target} type={type} field={field} notice={t.report.reviewMissing} />;
    const kind = target.kind;
    return (
      <>
        <FormHeader title={t.report.reviewTitle}>{t.report.reviewIntro}</FormHeader>
        <ReviewFlagForm
          lang={lang}
          providerSlug={target.slug}
          review={{ ref: review.ref, byline: fmt(t.report.reviewBy, { author: review.authorLabel, month: review.visitMonth }), text: review.text }}
          labels={t.report}
          common={common(t)}
          rankingHref={routes.dispute(lang, kind, target.slug, { target: "ranking" })}
          policyHref={routes.trust(lang, "reviews")}
          reviewsHref={routes.providerReviews(lang, kind, target.slug)}
          activityHref={routes.accountActivity(lang)}
        />
      </>
    );
  }
  return <StandardReport lang={lang} t={t} target={target} type={type} field={field} />;
}

// ── /report/missing: "Suggest a listing" ────────────────────────────────────

/** The report form's "Something is missing" option on its own page, for "Suggest a listing"
 * links (locality pages, no-results, facilities). ?locality=<slug> pre-fills the locality; it is
 * read under <Suspense>, so the form itself is in the static shell. */
export function SuggestListingPageView({ lang, searchParams }: { lang: Lang; searchParams: SP }) {
  const t = contentTrustStrings(lang);
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-5 px-6 pt-7 pb-16">
      <FormHeader title={t.report.missingTitle}>{t.report.missingBody}</FormHeader>
      <Suspense fallback={<SuggestListingForm lang={lang} labels={t.report} common={common(t)} />}>
        <PrefilledSuggestForm lang={lang} t={t} searchParams={searchParams} />
      </Suspense>
      <p className="text-14 leading-[1.55] font-light text-muted">
        {t.report.suggestOther}{" "}
        <Link href={routes.search(lang, { intent: "report" })} className="inline-flex min-h-11 items-center font-medium">
          {t.report.suggestOtherLink}
        </Link>
      </p>
    </div>
  );
}

async function PrefilledSuggestForm({ lang, t, searchParams }: { lang: Lang; t: ContentTrustStrings; searchParams: SP }) {
  const slug = first((await searchParams).locality);
  const locality = slug && getLocality(slug) ? localityName(slug, lang) : "";
  return <SuggestListingForm key={locality} lang={lang} labels={t.report} common={common(t)} defaultLocality={locality} />;
}
