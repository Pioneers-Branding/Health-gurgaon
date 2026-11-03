import Link from "next/link";
import { Suspense } from "react";
import { ButtonAnchor } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import type { Dictionary, Lang } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { AccountLink, AccountLinkFallback } from "./account-link";
import { ContributeMenu } from "./contribute-menu";
import { MainNav, type NavItem } from "./main-nav";
import { MenuButton } from "./mobile-menu";

/**
 * Sticky white header (Find Care reference): logo + wordmark, six section
 * links, "Contribute ▾" and "Sign in" / "My account". Below lg the nav moves
 * into the menu sheet and the header shows SOS 112 and Menu instead.
 */
export function SiteHeader({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  const t = dict.header;
  const nav: NavItem[] = [
    { key: "findCare", href: routes.search(lang), label: t.nav.findCare },
    { key: "topLists", href: routes.topLists(lang), label: t.nav.topLists },
    { key: "localities", href: routes.localities(lang), label: t.nav.localities },
    { key: "events", href: routes.events(lang), label: t.nav.events },
    { key: "community", href: routes.community(lang), label: t.nav.community },
    { key: "healthyNeighbourhoods", href: routes.healthyNeighbourhoods(lang), label: t.nav.healthyNeighbourhoods },
  ];
  const contribute = [
    { href: routes.search(lang, { intent: "review" }), label: t.contributeMenu.writeReview },
    { href: routes.search(lang, { intent: "report" }), label: t.contributeMenu.reportIncorrect },
    { href: routes.submitEvent(lang), label: t.contributeMenu.submitEvent },
    { href: routes.volunteer(lang), label: t.contributeMenu.volunteer },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-2 lg:py-3">
        <Link href={routes.home(lang)} aria-label={t.homeLink} className="inline-flex min-h-11 items-center text-ink hover:text-ink">
          <Logo size="md" className="max-lg:hidden" />
          <Logo size="sm" withMark={false} className="lg:hidden" />
        </Link>

        <div className="hidden lg:block">
          <MainNav items={nav} label={t.navLabel} />
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <ContributeMenu label={t.contribute} items={contribute} />
          <Suspense fallback={<AccountLinkFallback lang={lang} dict={dict} />}>
            <AccountLink lang={lang} dict={dict} />
          </Suspense>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ButtonAnchor href="tel:112" aria-label={t.sosLabel} variant="danger" size="sm">
            {t.sos}
          </ButtonAnchor>
          <MenuButton label={t.menu} />
        </div>
      </div>
    </header>
  );
}
