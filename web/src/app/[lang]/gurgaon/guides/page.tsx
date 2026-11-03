// The guide library. The prototype has no library screen; cards follow the Homepage's
// "Local health guides" section.
import type { Metadata } from "next";

import { GuidesView } from "@/components/content-trust/guides-view";
import { getGuides } from "@/lib/data/content";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.guides;
  return pageMetadata({ lang, href: (l) => routes.guides(l), title: t.title, description: t.description });
}

export default async function GuidesPage() {
  const lang = await getLang();
  const guides = await getGuides();
  return <GuidesView lang={lang} guides={guides} />;
}
