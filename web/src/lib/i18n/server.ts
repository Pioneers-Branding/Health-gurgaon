import { lang as rootLang } from "next/root-params";
import { notFound } from "next/navigation";
import { isLang, type Lang } from "./config";

/**
 * The current language in any Server Component, layout, page, loading/not-found
 * file or generateMetadata, without awaiting the page's `params`.
 *
 * `lang` is the root parameter (app/[lang]/layout.tsx) and is prerendered for
 * "en" and "hi", so reading it never makes a page dynamic. That matters on
 * routes with other dynamic params (e.g. /gurgaon/doctor/[slug]): awaiting the
 * whole `params` object there suspends, reading the root param does not.
 *
 * Not available in Client Components, Server Actions or Route Handlers:
 * pass `lang` in (props, a hidden form field, or a bound argument).
 */
export async function getLang(): Promise<Lang> {
  const value = await rootLang();
  if (!isLang(value)) notFound();
  return value;
}

/** Same check for code that already has the params object (e.g. layouts). */
export async function langFromParams(params: Promise<{ lang: string }>): Promise<Lang> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return lang;
}
