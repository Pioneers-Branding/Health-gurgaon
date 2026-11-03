// A society's public profile (Healthy Neighbourhoods). Prototype: "Health Gurgaon Community.dc.html"
// #society. Verified societies are prerendered; unknown or unverified ones get a real 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SocietyPageView } from "@/components/community/society-view";
import { getSociety, getSocietyMeta, listSocietySlugs } from "@/lib/data/community";
import { fmt, getDictionary } from "@/lib/i18n";
import { communityStrings } from "@/lib/i18n/areas/community";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/society/[slug]">;

export async function generateStaticParams() {
  return (await listSocietySlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { slug } = await params;
  const society = await getSociety(slug);
  if (!society) notFound();
  const t = getDictionary(lang).pages.society;
  const since = society.memberSince ? ` ${fmt(communityStrings(lang).society.memberSince, { date: society.memberSince.slice(0, 4) })}.` : "";
  return pageMetadata({ lang, href: (l) => routes.society(l, slug), title: society.name, description: `${t.description}${since}` });
}

export default async function SocietyPage({ params }: Props) {
  const lang = await getLang();
  const { slug } = await params;
  const [society, meta] = await Promise.all([getSociety(slug), getSocietyMeta(slug)]);
  if (!society) notFound();
  return <SocietyPageView lang={lang} t={communityStrings(lang)} society={society} meta={meta} />;
}
