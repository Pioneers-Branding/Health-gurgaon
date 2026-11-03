// "Claim your profile". Prototype: "Health Gurgaon Content and Trust.dc.html" #claim.
// Known listings are prerendered; unknown kinds or slugs get a real 404. Claiming needs sign-in
// (checked under <Suspense> with ?next= back here, and again by the Server Action).
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClaimPageView } from "@/components/content-trust/claim-page";
import { getProviderForRoute, listProviderSlugs } from "@/lib/data/providers";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { isProviderKind, PROVIDER_KINDS, routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/claim/[kind]/[slug]">;

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
  const t = getDictionary(lang).pages.claim;
  return pageMetadata({ lang, href: (l) => routes.claim(l, kind, slug), title: `${t.title}: ${profile.name}`, description: t.description, noindex: true });
}

export default async function ClaimPage({ params }: Props) {
  const lang = await getLang();
  const { kind, slug } = await params;
  if (!isProviderKind(kind)) notFound();
  const profile = await getProviderForRoute(kind, slug);
  if (!profile) notFound();
  return <ClaimPageView lang={lang} kind={kind} profile={profile} />;
}
