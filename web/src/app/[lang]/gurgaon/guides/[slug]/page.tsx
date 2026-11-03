// A guide. Prototype: "Health Gurgaon Content and Trust.dc.html" #guide. Guides whose text isn't
// written yet are noindex. Unknown slugs are a real 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuideView } from "@/components/content-trust/guide-view";
import { getGuide, getGuides, listGuideSlugs } from "@/lib/data/content";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/guides/[slug]">;

export async function generateStaticParams() {
  return (await listGuideSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();
  const t = getDictionary(lang).pages.guide;
  return pageMetadata({
    lang,
    href: (l) => routes.guide(l, slug),
    title: guide.title,
    description: guide.summary ?? t.description,
    ogType: "article",
    noindex: !guide.hasContent,
  });
}

export default async function GuidePage({ params }: Props) {
  const lang = await getLang();
  const { slug } = await params;
  const [guide, all] = await Promise.all([getGuide(slug), getGuides()]);
  if (!guide) notFound();
  return <GuideView lang={lang} guide={guide} others={all.filter((g) => g.hasContent)} />;
}
