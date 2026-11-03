// One story from The Gurgaon Health Report. The prototype's news list opens articles; there is no
// article screen, so the page follows the guide article's layout. Unknown slugs are a real 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleView } from "@/components/content-trust/article-view";
import { getArticle, getArticles, listArticleSlugs } from "@/lib/data/content";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/news/[slug]">;

export async function generateStaticParams() {
  return (await listArticleSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  return pageMetadata({ lang, href: (l) => routes.article(l, slug), title: article.title, description: article.dek, ogType: "article" });
}

export default async function ArticlePage({ params }: Props) {
  const lang = await getLang();
  const { slug } = await params;
  const [article, all] = await Promise.all([getArticle(slug), getArticles({ includeSponsored: false, limit: 5 })]);
  if (!article) notFound();
  return <ArticleView lang={lang} article={article} more={all.filter((a) => a.slug !== slug).slice(0, 3)} />;
}
