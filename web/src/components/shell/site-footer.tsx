import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import type { Dictionary, Lang } from "@/lib/i18n";
import { routes } from "@/lib/routes";

type Column = { title: string; links: Array<{ href: string; label: string }> };

/**
 * Dark footer (Homepage reference): brand blurb, link columns, and the
 * not-medical-advice / emergency line. Links keep the prototype's 26px rhythm
 * for mouse users and grow to 44px tap targets on touch screens (pointer: coarse).
 */
export function SiteFooter({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  const t = dict.footer;
  const columns: Column[] = [
    {
      title: t.findCare.title,
      links: [
        { href: routes.search(lang, { type: "doctor" }), label: t.findCare.doctors },
        { href: routes.search(lang, { type: "hospital" }), label: t.findCare.hospitals },
        { href: routes.search(lang, { type: "lab" }), label: t.findCare.diagnostics },
        { href: routes.search(lang, { type: "pharmacy" }), label: t.findCare.chemists },
        { href: routes.emergency(lang, "blood-banks"), label: t.findCare.bloodBanks },
      ],
    },
    {
      title: t.community.title,
      links: [
        { href: routes.events(lang), label: t.community.events },
        { href: routes.community(lang), label: t.community.ask },
        { href: routes.healthyNeighbourhoods(lang), label: t.community.healthy },
        { href: routes.volunteer(lang), label: t.community.volunteer },
      ],
    },
    {
      title: t.read.title,
      links: [
        { href: routes.news(lang), label: t.read.news },
        { href: routes.guides(lang), label: t.read.guides },
        { href: routes.topLists(lang), label: t.read.topLists },
        { href: routes.stories(lang), label: t.read.stories },
      ],
    },
    {
      title: t.trust.title,
      links: [
        { href: routes.trust(lang), label: t.trust.how },
        { href: routes.trust(lang, "editorial"), label: t.trust.editorial },
        { href: routes.trust(lang, "sponsorship"), label: t.trust.sponsorship },
        { href: routes.trust(lang, "reviews"), label: t.trust.reviews },
        { href: routes.trust(lang, "privacy"), label: t.trust.privacy },
        { href: routes.neighbourRecommendations(lang), label: t.trust.recommendations },
        { href: routes.disputes(lang), label: t.trust.disputes },
      ],
    },
  ];

  return (
    <footer id="site-footer" className="on-dark bg-ink text-on-dark max-lg:pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-page flex-col gap-8 px-6 pt-12 pb-7">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-x-5 gap-y-7">
          <div className="col-span-full flex min-w-0 flex-col gap-3 lg:col-span-2">
            <Logo size="lg" tone="dark" withMark={false} />
            <p className="max-w-[22.5rem] text-13.5 font-light leading-[1.6]">{t.tagline}</p>
          </div>
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-2">
              <h2 className="mono-label text-11 text-saffron">{column.title}</h2>
              <ul className="flex flex-col">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-6.5 items-center text-13.5 font-light text-on-dark hover:text-saffron pointer-coarse:min-h-11"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 border-t border-night-line pt-4.5 text-12 font-light text-on-dark-muted">
          <p>{t.notAdvice}</p>
          <p>
            {t.sampleNote} · {t.comingSoon}
          </p>
        </div>
      </div>
    </footer>
  );
}
