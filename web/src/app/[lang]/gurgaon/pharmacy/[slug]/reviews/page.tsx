// Pharmacy reviews & discussions. Prototype: "Health Gurgaon Top Lists and Stories.dc.html" #business.
// Shared page: src/components/find-care/provider-reviews-page.tsx. Unknown slugs are a real 404.
import type { Metadata } from "next";

import { ProviderReviewsPage, providerReviewsMetadata } from "@/components/find-care/provider-reviews-page";
import { listProviderSlugs } from "@/lib/data/providers";

type Props = PageProps<"/[lang]/gurgaon/pharmacy/[slug]/reviews">;

export async function generateStaticParams() {
  return (await listProviderSlugs("pharmacy")).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return providerReviewsMetadata("pharmacy", params);
}

export default function PharmacyReviewsPage({ params, searchParams }: Props) {
  return <ProviderReviewsPage kind="pharmacy" params={params} searchParams={searchParams} />;
}
