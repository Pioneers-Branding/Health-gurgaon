import { LANG_NAME, LANG_SHORT_LABEL, otherLang, type Lang } from "@/lib/i18n/config";

/**
 * "EN | हिं". The current language is marked, the other one is a link to the
 * same page in that language. Plain <a> on purpose: switching language swaps
 * the root layout (<html lang>), so it is a full page load.
 *   strip: the dark top strip
 *   sheet: the big "EN ✓ | हिं" button in the phone menu sheet
 */
export function LanguageLinks({
  lang,
  href,
  label,
  variant = "strip",
}: {
  lang: Lang;
  /** The current page in the other language. */
  href: string;
  /** Group name for screen readers, e.g. dict.topStrip.language. */
  label: string;
  variant?: "strip" | "sheet";
}) {
  const target = otherLang(lang);
  if (variant === "sheet") {
    return (
      <a
        href={href}
        hrefLang={target}
        lang={target}
        aria-label={LANG_NAME[target]}
        className="flex min-h-12 flex-1 items-center justify-center rounded-14 bg-night-raise px-3 text-14 text-cream hover:text-cream"
      >
        <span aria-hidden="true">
          {lang === "en" ? `${LANG_SHORT_LABEL.en} ✓ | ${LANG_SHORT_LABEL.hi}` : `${LANG_SHORT_LABEL.en} | ${LANG_SHORT_LABEL.hi} ✓`}
        </span>
      </a>
    );
  }
  const items: Lang[] = ["en", "hi"];
  return (
    <div role="group" aria-label={label} className="flex items-center">
      {items.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="px-0.5 text-night-edge">
              |
            </span>
          )}
          {l === lang ? (
            <span
              lang={l}
              aria-current="true"
              title={LANG_NAME[l]}
              className="inline-flex min-h-11 items-center px-1.5 font-semibold text-cream"
            >
              <span aria-hidden="true">{LANG_SHORT_LABEL[l]}</span>
              <span className="sr-only">{LANG_NAME[l]}</span>
            </span>
          ) : (
            <a
              href={href}
              hrefLang={l}
              lang={l}
              className="inline-flex min-h-11 items-center px-1.5 text-on-dark underline-offset-4 hover:text-saffron hover:underline"
            >
              <span aria-hidden="true">{LANG_SHORT_LABEL[l]}</span>
              <span className="sr-only">{LANG_NAME[l]}</span>
            </a>
          )}
        </span>
      ))}
    </div>
  );
}
