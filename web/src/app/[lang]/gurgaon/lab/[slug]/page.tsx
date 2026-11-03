// Lab profile. Prototype: "Health Gurgaon Find Care.dc.html" #lab ("Diagnostic / pharmacy").
// Known slugs are prerendered; unknown ones get a real 404. "Open now", today's row and the save
// state are request-time and render under <Suspense>.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LabProfile } from "@/components/find-care/lab-profile";
import { getProviderForRoute, listProviderSlugs } from "@/lib/data/providers";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/lab/[slug]">;

export async function generateStaticParams() {
  return (await listProviderSlugs("lab")).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { slug } = await params;
  const profile = await getProviderForRoute("lab", slug);
  if (!profile) notFound();
  const t = getDictionary(lang).pages.lab;
  return pageMetadata({
    lang,
    href: (l) => routes.lab(l, slug),
    title: profile.name,
    description: `${profile.name}: ${profile.headline}. ${t.description}`,
  });
}

export default async function LabPage({ params }: Props) {
  const lang = await getLang();
  const { slug } = await params;
  const profile = await getProviderForRoute("lab", slug);
  if (!profile) notFound();
  return <LabProfile lang={lang} profile={profile} kind="lab" />;
}
