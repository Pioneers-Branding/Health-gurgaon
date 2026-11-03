// Doctor profile. Prototype: "Health Gurgaon Find Care.dc.html" #doctor.
// Known slugs are prerendered; unknown ones get a real 404. Tabs (?tab=) and the save state are
// request-time and render under <Suspense>.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DoctorProfile } from "@/components/find-care/doctor-profile";
import { getProviderForRoute, listProviderSlugs } from "@/lib/data/providers";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/doctor/[slug]">;

export async function generateStaticParams() {
  return (await listProviderSlugs("doctor")).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { slug } = await params;
  const profile = await getProviderForRoute("doctor", slug);
  if (!profile) notFound();
  const t = getDictionary(lang).pages.doctor;
  return pageMetadata({
    lang,
    href: (l) => routes.doctor(l, slug),
    title: profile.name,
    description: `${profile.name}: ${profile.headline}. ${t.description}`,
  });
}

export default async function DoctorPage({ params, searchParams }: Props) {
  const lang = await getLang();
  const { slug } = await params;
  const profile = await getProviderForRoute("doctor", slug);
  if (!profile) notFound();
  return <DoctorProfile lang={lang} profile={profile} searchParams={searchParams} />;
}
