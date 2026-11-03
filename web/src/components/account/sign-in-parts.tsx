import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import type { Lang } from "@/lib/i18n";
import { accountStrings } from "@/lib/i18n/areas/account";
import { routes } from "@/lib/routes";

import { FocusOnMount } from "./focus-on-mount";

/** Beside the sign-in card: what happens to your number, why you'd sign in, not for emergencies. */
export function SignInAside({ lang }: { lang: Lang }) {
  const t = accountStrings(lang).signin;
  return (
    <aside className="flex min-w-0 flex-[2_1_20rem] flex-col gap-3.5">
      <div className="on-dark flex flex-col gap-3 rounded-20 bg-ink p-5.5 text-cream">
        <h2 className="mono-label m-0 text-11 text-saffron">{t.promiseTitle}</h2>
        {t.promises.map((p) => (
          <div key={p} className="flex items-start gap-3 text-14.5 leading-normal">
            <span aria-hidden="true" className="flex-none font-bold text-saffron">
              ✓
            </span>
            <span>{p}</span>
          </div>
        ))}
        <Link href={routes.trust(lang, "privacy")} className="inline-flex min-h-11 items-center self-start text-14 font-medium text-saffron hover:text-cream">
          {t.privacyLink}
        </Link>
      </div>
      <div className="flex flex-col gap-2.5 rounded-20 border border-line p-5">
        <h2 className="m-0 text-17 font-semibold leading-[1.35]">{t.noAccountTitle}</h2>
        <p className="text-14 font-light leading-[1.6] text-ink-soft">{t.noAccountBody}</p>
        <p className="mt-1 text-14.5 font-semibold">{t.signInWhen}</p>
        <ul className="m-0 flex list-none flex-col gap-1.75 p-0">
          {t.why.map((w) => (
            <li key={w} className="flex items-baseline gap-2.5 text-14 leading-normal">
              <span aria-hidden="true" className="size-1.75 flex-none -translate-y-0.5 rounded-full bg-teal" />
              {w}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-16 bg-emergency-tint px-4 py-3.5 text-14 leading-normal">
        <b className="font-semibold text-emergency">{t.emergencyStrong}</b>
        {t.emergencyRest}
      </div>
    </aside>
  );
}

/** After "Yes, delete my account": what happened. */
export function DeletedView({ lang, review, kept }: { lang: Lang; review: "keep" | "remove" | "none"; kept: boolean }) {
  const t = accountStrings(lang).deleted;
  const lines = [t.line1, t.line2, review === "keep" ? t.reviewKeep : review === "remove" ? t.reviewRemove : t.reviewNone, kept ? t.line4 : ""].filter(Boolean);
  return (
    <div className="mx-auto flex w-full max-w-[55rem] flex-col gap-4.5 px-6 pt-10 pb-16">
      <FocusOnMount id="hg-deleted-h" />
      <div className="flex items-center gap-3.5">
        <span aria-hidden="true" className="flex size-12 flex-none items-center justify-center rounded-full bg-success text-22 font-bold text-white">
          ✓
        </span>
        <h1 id="hg-deleted-h" tabIndex={-1} className="m-0 text-[2.125rem] font-bold leading-[1.1] tracking-h1">
          {t.title}
        </h1>
      </div>
      <div role="status" className="flex flex-col gap-2 rounded-20 border border-line px-5 py-4.5">
        {lines.map((l) => (
          <span key={l} className="flex items-baseline gap-3 text-15 leading-[1.55]">
            <span aria-hidden="true" className="flex-none font-bold text-success">
              ✓
            </span>
            {l}
          </span>
        ))}
      </div>
      <p className="text-15 font-light leading-[1.6] text-ink-soft">{t.after}</p>
      <div className="flex flex-wrap gap-2.5">
        <ButtonLink href={routes.home(lang)} variant="dark" size="lg">
          {t.home}
        </ButtonLink>
      </div>
    </div>
  );
}
