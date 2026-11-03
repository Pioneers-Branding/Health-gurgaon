// Hospital, clinic and care-centre profile. Prototype: "Health Gurgaon Find Care.dc.html" #hospital.
// Known slugs are prerendered; unknown ones get a real 404. Tabs (?tab=, ?dept=) and the save
// state are request-time and render under <Suspense>.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HospitalProfile } from "@/components/find-care/hospital-profile";
import { getProviderForRoute, listProviderSlugs } from "@/lib/data/providers";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/hospital/[slug]">;

export async function generateStaticParams() {
  return (await listProviderSlugs("hospital")).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { slug } = await params;
  const profile = await getProviderForRoute("hospital", slug);
  if (!profile) notFound();
  const t = getDictionary(lang).pages.hospital;
  return pageMetadata({
    lang,
    href: (l) => routes.hospital(l, slug),
    title: profile.name,
    description: `${profile.name}: ${profile.headline}. ${t.description}`,
  });
}

export default async function HospitalPage({ params, searchParams }: Props) {
  const lang = await getLang();
  const { slug } = await params;
  const profile = await getProviderForRoute("hospital", slug);
  if (!profile) notFound();
  return <HospitalProfile lang={lang} profile={profile} searchParams={searchParams} />;
}
