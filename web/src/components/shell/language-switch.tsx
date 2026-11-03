import { Suspense } from "react";
import { otherLang, type Lang } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";
import { LanguageLinks } from "./language-links";
import { LanguageSwitchClient } from "./language-switch-client";

/**
 * EN | हिं switch that keeps the current page. The static fallback (in the
 * prerendered HTML and for readers without JavaScript) links to the other
 * language's homepage; once the browser knows the URL it links to the same page.
 */
export function LanguageSwitch({ lang, label, variant = "strip" }: { lang: Lang; label: string; variant?: "strip" | "sheet" }) {
  return (
    <Suspense fallback={<LanguageLinks lang={lang} href={routes.home(otherLang(lang))} label={label} variant={variant} />}>
      <LanguageSwitchClient lang={lang} label={label} variant={variant} />
    </Suspense>
  );
}
