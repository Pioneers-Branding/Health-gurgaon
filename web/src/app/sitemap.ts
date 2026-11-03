import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { tags } from "@/lib/cache";
import { db } from "@/lib/db";
import { PROFILE_KIND_OF } from "@/lib/domain";
import { LANGS, HREFLANG } from "@/lib/i18n/config";
import { SITE_URL, type LocalizedHref } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

/**
 * /sitemap.xml: every indexable public page, in English with its Hindi alternate.
 * The rules match each page's own noindex: no private, form or pending pages; localities only
 * when live, specialties only with doctors, guides only when written, top lists only when
 * something is ranked, a provider's reviews page only once it has a published review. Refreshed hourly and whenever listings or content change.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.providers, tags.events, tags.threads, tags.articles, tags.guides, tags.topLists, tags.stories);

  const [providers, specialties, localities, events, articles, guides, threads, societies, lists] = await Promise.all([
    db.provider.findMany({
      where: { status: "published" },
      select: { slug: true, kind: true, updatedAt: true, _count: { select: { reviews: { where: { status: "published" } } } } },
    }),
    db.specialty.findMany({ where: { providers: { some: { status: "published", kind: "doctor" } } }, select: { slug: true } }),
    db.locality.findMany({ where: { live: true }, select: { slug: true, updatedAt: true } }),
    db.event.findMany({ where: { status: { in: ["verified", "completed"] } }, select: { slug: true } }),
    db.article.findMany({ where: { status: "published" }, select: { slug: true, updatedAt: true } }),
    db.guide.findMany({ where: { status: "published" }, select: { slug: true, sections: true, updatedAt: true } }),
    db.thread.findMany({ where: { status: { in: ["open", "resolved"] } }, select: { id: true, updatedAt: true } }),
    db.society.findMany({ where: { status: "verified" }, select: { slug: true, updatedAt: true } }),
    db.topList.findMany({
      where: { published: true, OR: [{ entries: { some: {} } }, { sourceListSlug: { not: null } }] },
      select: { slug: true },
    }),
  ]);

  const entry = (href: LocalizedHref, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${href("en")}`,
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages: Object.fromEntries(LANGS.map((l) => [HREFLANG[l], `${SITE_URL}${href(l)}`])) },
  });

  return [
    entry((l) => routes.home(l)),
    entry((l) => routes.search(l)),
    entry((l) => routes.emergency(l)),
    entry((l) => routes.topLists(l)),
    entry((l) => routes.stories(l)),
    entry((l) => routes.facilities(l)),
    entry((l) => routes.localities(l)),
    entry((l) => routes.events(l)),
    entry((l) => routes.news(l)),
    entry((l) => routes.guides(l)),
    entry((l) => routes.community(l)),
    entry((l) => routes.healthyNeighbourhoods(l)),
    entry((l) => routes.volunteer(l)),
    entry((l) => routes.trust(l)),
    entry((l) => routes.disputes(l)),
    entry((l) => routes.neighbourRecommendations(l)),
    ...providers.map((p) => entry((l) => routes.provider(l, PROFILE_KIND_OF[p.kind], p.slug), p.updatedAt)),
    ...providers.filter((p) => p._count.reviews > 0).map((p) => entry((l) => routes.providerReviews(l, PROFILE_KIND_OF[p.kind], p.slug))),
    ...specialties.map((s) => entry((l) => routes.specialty(l, s.slug))),
    ...localities.map((x) => entry((l) => routes.locality(l, x.slug), x.updatedAt)),
    ...events.map((e) => entry((l) => routes.event(l, e.slug))),
    ...articles.map((a) => entry((l) => routes.article(l, a.slug), a.updatedAt)),
    ...guides.filter((g) => Array.isArray(g.sections) && g.sections.length > 0).map((g) => entry((l) => routes.guide(l, g.slug), g.updatedAt)),
    ...threads.map((t) => entry((l) => routes.thread(l, t.id), t.updatedAt)),
    ...societies.map((s) => entry((l) => routes.society(l, s.slug), s.updatedAt)),
    ...lists.map((t) => entry((l) => routes.topList(l, t.slug))),
  ];
}
