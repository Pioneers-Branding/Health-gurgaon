import type { Metadata } from "next";
import { HREFLANG, LANGS, OG_LOCALE, type Lang } from "./config";
import { getDictionary } from "./index";

/**
 * Public origin used for canonical URLs, hreflang and Open Graph.
 * NEXT_PUBLIC_SITE_URL in .env (e.g. https://healthgurgaon.in).
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** A page's URL in each language, e.g. (l) => routes.doctor(l, slug). */
export type LocalizedHref = (lang: Lang) => string;

/** canonical + hreflang alternates (en-IN, hi-IN, x-default -> English). */
export function alternatesFor(lang: Lang, href: LocalizedHref): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of LANGS) languages[HREFLANG[l]] = href(l);
  languages["x-default"] = href("en");
  return { canonical: href(lang), languages };
}

export type PageMetadataInput = {
  lang: Lang;
  /** The same page in each language. Query strings are usually left out. */
  href: LocalizedHref;
  title: string;
  description?: string;
  /** Private, thin or unfinished pages: noindex, but links are still followed. */
  noindex?: boolean;
  /** Use the title as-is instead of "%s · HealthGurgaon". */
  absoluteTitle?: boolean;
  /** Open Graph type; "article" for news and guides. */
  ogType?: "website" | "article";
};

/**
 * Metadata for one page. Use it from every page's generateMetadata:
 *
 *   export async function generateMetadata(): Promise<Metadata> {
 *     const lang = await getLang();
 *     const t = getDictionary(lang).pages.events;
 *     return pageMetadata({ lang, href: (l) => routes.events(l), title: t.title, description: t.description });
 *   }
 */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const { lang, href, title, description, noindex, absoluteTitle, ogType = "website" } = input;
  const dict = getDictionary(lang);
  const otherLocales = LANGS.filter((l) => l !== lang).map((l) => OG_LOCALE[l]);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternatesFor(lang, href),
    openGraph: {
      type: ogType,
      siteName: dict.meta.siteName,
      title,
      description,
      url: href(lang),
      locale: OG_LOCALE[lang],
      alternateLocale: otherLocales,
    },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}
