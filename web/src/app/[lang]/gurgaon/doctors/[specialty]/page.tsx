// Specialty directory. Prototype: "Health Gurgaon Find Care.dc.html" #specialty.
// Every specialty is prerendered; unknown ones get a real 404. The locality filter (?loc=) is
// request-time and renders under <Suspense>.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SpecialtyView, specialtyTitle } from "@/components/find-care/specialty-view";
import { getSpecialtyPage, listSpecialtySlugs } from "@/lib/data/providers";
import { getDictionary } from "@/lib/i18n";
import { specialtyTextHi } from "@/lib/i18n/areas/find-care";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/doctors/[specialty]">;

export async function generateStaticParams() {
  return (await listSpecialtySlugs()).map((specialty) => ({ specialty }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { specialty } = await params;
  const page = await getSpecialtyPage(specialty);
  if (!page) notFound();
  const t = getDictionary(lang).pages.specialty;
  const hi = specialtyTextHi(lang, specialty);
  return pageMetadata({
    lang,
    href: (l) => routes.specialty(l, specialty),
    title: specialtyTitle(lang, page),
    description: hi?.summary ?? (lang === "en" ? page.specialty.summary : null) ?? t.description,
    // A specialty with no verified doctors yet is a thin page.
    noindex: page.doctors.length === 0,
  });
}

export default async function SpecialtyPage({ params, searchParams }: Props) {
  const lang = await getLang();
  const { specialty } = await params;
  const page = await getSpecialtyPage(specialty);
  if (!page) notFound();
  return <SpecialtyView lang={lang} page={page} searchParams={searchParams} />;
}
