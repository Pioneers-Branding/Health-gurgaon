"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { otherLang, type Lang } from "@/lib/i18n/config";
import { switchLangPath } from "@/lib/i18n/paths";
import { LanguageLinks } from "./language-links";

/**
 * Keeps the current path and query when switching language. Reading the URL
 * suspends during prerendering, so this always sits inside <Suspense> (see
 * ./language-switch.tsx). The pathname is normalised with stripLangPrefix,
 * so the internal "/en/..." form and the browser's "/..." give the same link.
 */
export function LanguageSwitchClient({
  lang,
  label,
  variant,
}: {
  lang: Lang;
  label: string;
  variant?: "strip" | "sheet";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const href = switchLangPath(pathname, otherLang(lang), query ? `?${query}` : "");
  return <LanguageLinks lang={lang} href={href} label={label} variant={variant} />;
}
