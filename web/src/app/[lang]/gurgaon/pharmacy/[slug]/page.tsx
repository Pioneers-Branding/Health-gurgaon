// Pharmacy profile. No prototype screen of its own: follows the lab layout ("Health Gurgaon Find Care.dc.html" #lab).
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

type Props = PageProps<"/[lang]/gurgaon/pharmacy/[slug]">;

export async function generateStaticParams() {
  return (await listProviderSlugs("pharmacy")).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { slug } = await params;
  const profile = await getProviderForRoute("pharmacy", slug);
  if (!profile) notFound();
  const t = getDictionary(lang).pages.pharmacy;
  return pageMetadata({
    lang,
    href: (l) => routes.pharmacy(l, slug),
    title: profile.name,
    description: `${profile.name}: ${profile.headline}. ${t.description}`,
  });
}

export default async function PharmacyPage({ params }: Props) {
  const lang = await getLang();
  const { slug } = await params;
  const profile = await getProviderForRoute("pharmacy", slug);
  if (!profile) notFound();
  return <LabProfile lang={lang} profile={profile} kind="pharmacy" />;
}
