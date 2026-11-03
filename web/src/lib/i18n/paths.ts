import { DEFAULT_LANG, LANGS, type Lang } from "./config";

/**
 * Turn a language-neutral path ("/gurgaon/events") into the public URL for a
 * language: English stays unprefixed, Hindi gets /hi. Query strings and hashes
 * are kept. Prefer the typed builders in "@/lib/routes" over calling this.
 */
export function localizePath(lang: Lang, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (lang === DEFAULT_LANG) return clean;
  if (clean === "/" || clean.startsWith("/?") || clean.startsWith("/#")) return `/${lang}${clean.slice(1)}`;
  return `/${lang}${clean}`;
}

/**
 * Split a pathname into its language and the language-neutral rest.
 * Accepts browser URLs ("/hi/gurgaon", "/gurgaon") and the internal rewritten
 * form ("/en/gurgaon") that server rendering can report.
 */
export function stripLangPrefix(pathname: string): { lang: Lang; path: string } {
  for (const lang of LANGS) {
    if (pathname === `/${lang}`) return { lang, path: "/" };
    if (pathname.startsWith(`/${lang}/`)) return { lang, path: pathname.slice(lang.length + 1) };
  }
  return { lang: DEFAULT_LANG, path: pathname || "/" };
}

/** The same page in another language, e.g. "/gurgaon?q=x" -> "/hi/gurgaon?q=x". */
export function switchLangPath(pathname: string, target: Lang, search = "", hash = ""): string {
  const { path } = stripLangPrefix(pathname);
  return `${localizePath(target, path)}${search}${hash}`;
}
