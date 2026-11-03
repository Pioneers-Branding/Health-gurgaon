/**
 * Languages. English is served without a prefix (/gurgaon), Hindi under /hi
 * (/hi/gurgaon). Internally every route lives under app/[lang]; src/proxy.ts
 * rewrites unprefixed URLs to /en/... and redirects /en/... to the bare URL.
 */
export const LANGS = ["en", "hi"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "en";

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "hi";
}

export function otherLang(lang: Lang): Lang {
  return lang === "en" ? "hi" : "en";
}

/** Value for <html lang>. */
export const HTML_LANG: Record<Lang, string> = { en: "en", hi: "hi" };

/** hreflang codes used in <link rel="alternate">. */
export const HREFLANG: Record<Lang, string> = { en: "en-IN", hi: "hi-IN" };

/** Open Graph locale. */
export const OG_LOCALE: Record<Lang, string> = { en: "en_IN", hi: "hi_IN" };

/** Intl locale for dates and numbers. */
export const INTL_LOCALE: Record<Lang, string> = { en: "en-IN", hi: "hi-IN" };

/** Short labels shown in the EN | हिं switch (never translated). */
export const LANG_SHORT_LABEL: Record<Lang, string> = { en: "EN", hi: "हिं" };

/** Names shown to screen readers, in their own language. */
export const LANG_NAME: Record<Lang, string> = { en: "English", hi: "हिन्दी" };

/** All dates on the site are shown in Indian Standard Time. */
export const TIME_ZONE = "Asia/Kolkata";
