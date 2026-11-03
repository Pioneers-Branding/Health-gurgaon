// Hospital reviews & discussions. Prototype: "Health Gurgaon Top Lists and Stories.dc.html" #business.
// Shared page: src/components/find-care/provider-reviews-page.tsx. Unknown slugs are a real 404.
import type { Metadata } from "next";

import { ProviderReviewsPage, providerReviewsMetadata } from "@/components/find-care/provider-reviews-page";
import { listProviderSlugs } from "@/lib/data/providers";

type Props = PageProps<"/[lang]/gurgaon/hospital/[slug]/reviews">;

export async function generateStaticParams() {
  return (await listProviderSlugs("hospital")).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return providerReviewsMetadata("hospital", params);
}

export default function HospitalReviewsPage({ params, searchParams }: Props) {
  return <ProviderReviewsPage kind="hospital" params={params} searchParams={searchParams} />;
}
