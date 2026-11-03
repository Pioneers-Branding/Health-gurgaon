import { en, type Dictionary } from "./dictionaries/en";
import { hi } from "./dictionaries/hi";
import type { Lang } from "./config";

export * from "./config";
export * from "./paths";
export * from "./format";
export type { Dictionary };

const dictionaries: Record<Lang, Dictionary> = { en, hi };

/**
 * All UI strings for a language. Synchronous and cheap: call it in Server
 * Components (pages, layouts, generateMetadata) and pass the slices a Client
 * Component needs as props, e.g. <SearchBox labels={dict.searchOverlay} />.
 * Don't import it inside "use client" files: that ships both languages.
 */
export function getDictionary(lang: Lang): Dictionary {
  return dictionaries[lang];
}

/** A locality's display name in the page language (Hindi from the data's `nameHi`). */
export function localityName(lang: Lang, locality: { name: string; nameHi?: string | null }): string {
  return lang === "hi" && locality.nameHi ? locality.nameHi : locality.name;
}
