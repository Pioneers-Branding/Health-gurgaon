import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { cn } from "@/components/ui/cn";
import { Container } from "@/components/ui/container";
import { fmt, type Lang } from "@/lib/i18n";
import { accountStrings } from "@/lib/i18n/areas/account";
import { routes } from "@/lib/routes";

export type AccountPage = "saved" | "activity" | "consent";

const HREF: Record<AccountPage, (lang: Lang) => string> = {
  saved: routes.accountSaved,
  activity: routes.accountActivity,
  consent: routes.accountConsent,
};

/** The signed-in person: avatar, masked number and area, "Only you can see this page", Sign out. */
export function AccountHeader({
  lang,
  page,
  phoneMasked,
  area,
  attention,
}: {
  lang: Lang;
  page: AccountPage;
  phoneMasked: string;
  area: string | null;
  /** "2 things need you": the badge on My reviews & reports. */
  attention: number;
}) {
  const t = accountStrings(lang).common;
  return (
    <div className="border-b border-line-strong bg-cream">
      <Container className="flex flex-col gap-2.5 pt-3">
        <Breadcrumbs lang={lang} items={[{ label: t.myAccount, href: routes.accountSaved(lang) }, { label: t.tabs[page] }]} />
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <span aria-hidden="true" className="flex size-13 flex-none items-center justify-center rounded-full bg-white">
              <svg width="26" height="26" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4.2" fill="#0F766E" />
                <path d="M3.8 21.5c0-4.6 3.7-7.6 8.2-7.6s8.2 3 8.2 7.6z" fill="#0F766E" />
              </svg>
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="m-0 text-[2.125rem] font-bold leading-[1.1] tracking-h1 hi:tracking-normal">{t.titles[page]}</h1>
              <p className="text-14 leading-normal text-ink-soft">
                {t.signedInAs}{" "}
                <b className="whitespace-nowrap font-semibold" lang="en">
                  {phoneMasked}
                </b>
                {area ? fmt(t.areaNote, { area }) : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-10 items-center gap-1.75 rounded-pill bg-white px-3.5 text-13.5 text-ink-soft">
              <svg aria-hidden="true" width="14" height="16" viewBox="0 0 14 16">
                <rect x="1" y="7" width="12" height="8.5" rx="2" fill="#0F766E" />
                <path d="M3.8 7V5a3.2 3.2 0 0 1 6.4 0v2" fill="none" stroke="#0F766E" strokeWidth="1.8" />
              </svg>
              {t.onlyYou}
            </span>
            <SignOutButton lang={lang} label={t.signOut} className="min-h-11 px-4.5 text-14" />
          </div>
        </div>
        <nav aria-label={t.navLabel} className="grid max-w-[45rem] grid-cols-3 gap-1">
          {(["saved", "activity", "consent"] as const).map((id) => {
            const on = id === page;
            const badge = id === "activity" && attention > 0 ? attention : 0;
            const label = t.tabs[id];
            return (
              <Link
                key={id}
                href={HREF[id](lang)}
                aria-current={on ? "page" : undefined}
                aria-label={badge ? fmt(badge === 1 ? t.tabNeedsOne : t.tabNeeds, { label, n: badge }) : undefined}
                className={cn(
                  "flex min-h-13 flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 border-b-3 px-2 py-1.5 text-center text-14.5 leading-tight text-ink hover:text-ink",
                  on ? "border-teal font-semibold" : "border-transparent font-normal hover:border-line-strong",
                )}
              >
                {label}
                {badge ? (
                  <span aria-hidden="true" className="min-w-5.5 rounded-pill bg-saffron px-1.75 py-px text-center text-12 font-bold leading-normal text-ink">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </Container>
    </div>
  );
}

/** A plain form, so signing out works without JavaScript. Keeps saved items and choices. */
export function SignOutButton({ lang, label, className }: { lang: Lang; label: string; className?: string }) {
  return (
    <form action={signOut}>
      <input type="hidden" name="lang" value={lang} />
      <button
        type="submit"
        className={cn("inline-flex items-center justify-center rounded-pill border-[1.5px] border-ink bg-white font-medium text-ink hover:bg-cream", className)}
      >
        {label}
      </button>
    </form>
  );
}
