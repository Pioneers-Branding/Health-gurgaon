// "Share your experience". Prototype: "Health Gurgaon Content and Trust.dc.html" #review.
// Known listings are prerendered; unknown kinds or slugs get a real 404. Writing needs sign-in
// (checked under <Suspense> with ?next= back here, and again by the Server Action).
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReviewPageView } from "@/components/content-trust/review-page";
import { getVisitMonthOptions } from "@/lib/data/content";
import { getProviderForRoute, listProviderSlugs } from "@/lib/data/providers";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { isProviderKind, PROVIDER_KINDS, routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/review/[kind]/[slug]">;

export async function generateStaticParams() {
  const lists = await Promise.all(PROVIDER_KINDS.map(async (kind) => (await listProviderSlugs(kind)).map((slug) => ({ kind, slug }))));
  return lists.flat();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { kind, slug } = await params;
  if (!isProviderKind(kind)) notFound();
  const profile = await getProviderForRoute(kind, slug);
  if (!profile) notFound();
  const t = getDictionary(lang).pages.review;
  return pageMetadata({ lang, href: (l) => routes.review(l, kind, slug), title: `${t.title}: ${profile.name}`, description: t.description, noindex: true });
}

export default async function ReviewPage({ params }: Props) {
  const lang = await getLang();
  const { kind, slug } = await params;
  if (!isProviderKind(kind)) notFound();
  const [profile, months] = await Promise.all([getProviderForRoute(kind, slug), getVisitMonthOptions()]);
  if (!profile) notFound();
  return <ReviewPageView lang={lang} kind={kind} profile={profile} months={months} />;
}
