import { Suspense, type ReactNode } from "react";
import { getDictionary, localityName, type Lang } from "@/lib/i18n";
import { LOCALITIES } from "@/lib/localities";
import { routes } from "@/lib/routes";
import { AccountLink, AccountLinkFallback } from "./account-link";
import { LanguageSwitch } from "./language-switch";
import { MobileBar, type MobileBarItem } from "./mobile-bar";
import { MenuSheet, type MenuSection } from "./mobile-menu";
import { PreferencesProvider, type LocalityOption } from "./preferences";
import { SearchOverlay } from "./search-overlay";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SkipLink } from "./skip-link";
import { TopStrip } from "./top-strip";

/**
 * Everything around a page: skip link, dark top strip, sticky header, <main>,
 * footer, and on phones the bottom bar, full-screen search and menu sheet.
 * Rendered once by app/[lang]/layout.tsx; pages only render their content.
 * Everything here is static except the URL-dependent bits (language switch,
 * active nav) and the session (Sign in / My account), each inside its own
 * <Suspense>, so every page keeps a prerendered shell.
 */
export function AppShell({ lang, children }: { lang: Lang; children: ReactNode }) {
  const dict = getDictionary(lang);
  const m = dict.menuSheet;

  const localities: LocalityOption[] = LOCALITIES.map((l) => ({
    slug: l.slug,
    name: localityName(lang, l),
    live: l.live,
  }));

  const mobileTabs: MobileBarItem[] = [
    { key: "home", href: routes.home(lang), label: dict.mobileNav.home },
    { key: "search", href: routes.search(lang), label: dict.mobileNav.search },
    { key: "events", href: routes.events(lang), label: dict.mobileNav.events },
    { key: "ask", href: routes.community(lang), label: dict.mobileNav.ask },
    { key: "saved", href: routes.accountSaved(lang), label: dict.mobileNav.saved },
  ];

  const sections: MenuSection[] = [
    {
      title: m.findCare.title,
      links: [
        { href: routes.search(lang, { type: "doctor" }), label: m.findCare.doctors },
        { href: routes.search(lang, { type: "hospital" }), label: m.findCare.hospitals },
        { href: routes.search(lang, { type: "lab" }), label: m.findCare.diagnostics },
        { href: routes.search(lang, { type: "pharmacy" }), label: m.findCare.chemists },
        { href: routes.emergency(lang, "blood-banks"), label: m.findCare.bloodBanks },
        { href: routes.emergency(lang), label: m.findCare.emergency },
      ],
    },
    {
      title: m.topLists.title,
      links: [
        { href: routes.topLists(lang), label: m.topLists.lists },
        { href: routes.stories(lang), label: m.topLists.stories },
        { href: routes.facilities(lang), label: m.topLists.facilities },
      ],
    },
    {
      title: m.localities.title,
      links: [
        ...localities.filter((l) => l.live).map((l) => ({ href: routes.locality(lang, l.slug), label: l.name })),
        { href: routes.localities(lang), label: m.localities.all },
      ],
    },
    {
      title: m.events.title,
      links: [
        { href: routes.events(lang), label: m.events.calendar },
        { href: routes.submitEvent(lang), label: m.events.submit },
      ],
    },
    {
      title: m.community.title,
      links: [
        { href: routes.community(lang), label: m.community.ask },
        { href: routes.healthyNeighbourhoods(lang), label: m.community.healthy },
        { href: routes.volunteer(lang), label: m.community.volunteer },
      ],
    },
    {
      title: m.trust.title,
      links: [
        { href: routes.trust(lang), label: m.trust.how },
        { href: routes.search(lang, { intent: "report" }), label: m.trust.report },
        { href: routes.news(lang), label: m.trust.news },
        { href: routes.guides(lang), label: m.trust.guides },
      ],
    },
  ];

  return (
    <PreferencesProvider localities={localities}>
      <SkipLink label={dict.common.skipToContent} />
      <TopStrip lang={lang} dict={dict} />
      <SiteHeader lang={lang} dict={dict} />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col focus-visible:shadow-none focus-visible:outline-none">
        {children}
      </main>
      <SiteFooter lang={lang} dict={dict} />
      <MobileBar items={mobileTabs} label={dict.mobileNav.label} />
      <SearchOverlay lang={lang} labels={dict.searchOverlay} />
      <MenuSheet
        title={m.title}
        closeLabel={m.close}
        homeHref={routes.home(lang)}
        homeLabel={dict.header.homeLink}
        sections={sections}
        textLabel={dict.topStrip.larger}
        contrastLabel={dict.topStrip.contrast}
        language={<LanguageSwitch lang={lang} label={dict.topStrip.language} variant="sheet" />}
        account={
          <Suspense fallback={<AccountLinkFallback lang={lang} dict={dict} variant="sheet" />}>
            <AccountLink lang={lang} dict={dict} variant="sheet" />
          </Suspense>
        }
      />
    </PreferencesProvider>
  );
}
