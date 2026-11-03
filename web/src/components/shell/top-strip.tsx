import Link from "next/link";
import type { Dictionary, Lang } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { LanguageSwitch } from "./language-switch";
import { LocalityPicker } from "./locality-picker";
import { ContrastToggle, TextSizeToggle } from "./pref-toggles";

function Dot() {
  return (
    <span aria-hidden="true" className="px-1 text-night-edge">
      ·
    </span>
  );
}

/**
 * The dark strip above the header (Find Care reference):
 *   [Emergency? Call 112] Ambulance 108  Not for emergencies · 24×7 emergency departments →
 *                                        EN | हिं · A+ Larger text · ◐ High contrast · Gurugram ▾
 * Emergency numbers are tel: links and always visible. On phones the display
 * options move into the menu sheet; the language switch stays on the first row.
 */
export function TopStrip({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  const t = dict.topStrip;
  return (
    <div className="on-dark bg-ink text-12.5 text-cream">
      <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-3 px-6">
        <div role="group" aria-label={t.label} className="order-1 flex flex-wrap items-center gap-x-2.5">
          <a href="tel:112" className="inline-flex min-h-11 items-center text-cream hover:text-cream">
            <span className="rounded-pill bg-emergency px-2.25 py-0.5 font-semibold whitespace-nowrap text-white">{t.emergency}</span>
          </a>
          <a
            href="tel:108"
            className="inline-flex min-h-11 items-center font-light whitespace-nowrap text-on-dark hover:text-saffron"
          >
            {t.ambulance}
          </a>
        </div>
        <Link
          href={routes.emergency(lang)}
          className="order-3 inline-flex min-h-11 basis-full items-center font-light text-on-dark hover:text-saffron lg:order-2 lg:basis-auto"
        >
          {t.notForEmergencies}
        </Link>
        <div className="order-2 ml-auto flex flex-wrap items-center lg:order-3">
          <LanguageSwitch lang={lang} label={t.language} />
          <span className="hidden items-center lg:flex">
            <Dot />
            <TextSizeToggle label={t.larger} />
            <Dot />
            <ContrastToggle label={t.contrast} />
            <Dot />
            <LocalityPicker labels={dict.locality} localitiesHref={routes.localities(lang)} />
          </span>
        </div>
      </div>
    </div>
  );
}
