// The Gurgaon Health Report. Prototype: "Health Gurgaon Content and Trust.dc.html" #news.
// Every story is in the static shell; the label filter (?category=) applies under <Suspense>.
import type { Metadata } from "next";

import { NewsView } from "@/components/content-trust/news-view";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.news;
  return pageMetadata({ lang, href: (l) => routes.news(l), title: t.title, description: t.description });
}

export default async function NewsPage({ searchParams }: PageProps<"/[lang]/gurgaon/news">) {
  const lang = await getLang();
  return <NewsView lang={lang} searchParams={searchParams} />;
}
