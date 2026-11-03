// "Dispute a ranking or a mention". Prototype: "Health Gurgaon Content and Trust.dc.html" #dispute.
// About one provider's top-list positions and neighbour mentions; unknown kinds or slugs get a
// real 404. No account needed; ?target= (ranking | mention | review) and ?list= pre-select.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DisputePageView } from "@/components/content-trust/dispute-page";
import { getDisputeItems, getDisputeOutcomes } from "@/lib/data/content";
import { getProviderForRoute, listProviderSlugs } from "@/lib/data/providers";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { isProviderKind, PROVIDER_KINDS, routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/dispute/[kind]/[slug]">;

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
  const t = getDictionary(lang).pages.dispute;
  return pageMetadata({ lang, href: (l) => routes.dispute(l, kind, slug), title: `${t.title}: ${profile.name}`, description: t.description, noindex: true });
}

export default async function DisputePage({ params, searchParams }: Props) {
  const lang = await getLang();
  const { kind, slug } = await params;
  if (!isProviderKind(kind)) notFound();
  const [profile, items, outcomes] = await Promise.all([getProviderForRoute(kind, slug), getDisputeItems(kind, slug), getDisputeOutcomes(6)]);
  if (!profile || !items) notFound();
  return <DisputePageView lang={lang} kind={kind} profile={profile} items={items} outcomes={outcomes} searchParams={searchParams} />;
}
