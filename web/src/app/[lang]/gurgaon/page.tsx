// The city homepage. Prototype: "Health Gurgaon Homepage.dc.html" (EN and HI).
// Everything comes from cached reads (getHomepage, getSocieties), so the whole page is in the
// static shell; the locality tabs and filters switch on the client (src/components/home/*).
import type { Metadata } from "next";

import { HomeView } from "@/components/home/home-view";
import { getSocieties } from "@/lib/data/community";
import { getHomepage } from "@/lib/data/home";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const dict = getDictionary(lang);
  return pageMetadata({
    lang,
    href: (l) => routes.home(l),
    title: dict.meta.defaultTitle,
    absoluteTitle: true,
    description: dict.pages.home.description,
  });
}

export default async function HomePage() {
  const lang = await getLang();
  const [data, societies] = await Promise.all([getHomepage(), getSocieties()]);
  return <HomeView lang={lang} data={data} exampleSociety={societies[0]?.slug ?? null} />;
}
