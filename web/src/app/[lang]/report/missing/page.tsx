// "Suggest a listing": the report form's "Something is missing" option on its own page (a clinic,
// lab or chemist we haven't listed has no /report/[kind]/[slug] to report against). Prototype:
// "Health Gurgaon Content and Trust.dc.html" #report, third card. ?locality=<slug> pre-fills the
// locality. Suggestions go to the editors' reports queue (suggestListing); nothing is published
// straight from one.
import type { Metadata } from "next";

import { SuggestListingPageView } from "@/components/content-trust/report-page";
import { contentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = contentTrustStrings(lang).report;
  return pageMetadata({ lang, href: (l) => routes.suggestListing(l), title: t.missingTitle, description: t.missingBody, noindex: true });
}

export default async function SuggestListingPage({ searchParams }: PageProps<"/[lang]/report/missing">) {
  const lang = await getLang();
  return <SuggestListingPageView lang={lang} searchParams={searchParams} />;
}
