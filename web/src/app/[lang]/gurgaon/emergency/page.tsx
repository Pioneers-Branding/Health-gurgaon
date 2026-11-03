// Emergency care and blood banks. Prototype: "Health Gurgaon Find Care.dc.html" #emergency.
// Anchors used by the shell: #emergency-departments, #ambulance, #blood-banks. The "Your
// locality" order (?from=) is request-time and renders under <Suspense>.
import type { Metadata } from "next";

import { EmergencyView } from "@/components/find-care/emergency-view";
import { getEmergencyDirectory } from "@/lib/data/providers";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/emergency">;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.emergency;
  return pageMetadata({ lang, href: (l) => routes.emergency(l), title: t.title, description: t.description });
}

export default async function EmergencyPage({ searchParams }: Props) {
  const lang = await getLang();
  const directory = await getEmergencyDirectory();
  return <EmergencyView lang={lang} directory={directory} searchParams={searchParams} />;
}
