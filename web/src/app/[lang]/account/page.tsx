// /account: sign in with a one-time code (Your number → Code → Choices → Done), with ?next=.
// Signed in: the "Welcome back" done state, linking on. After a deletion: ?deleted=1&review=…
// Prototype: "Health Gurgaon Account.dc.html" #signin.
import type { Metadata } from "next";
import { Suspense } from "react";

import { listText } from "@/components/account/format";
import { SignInFlow, type SignedInInfo } from "@/components/account/sign-in-flow";
import { DeletedView, SignInAside } from "@/components/account/sign-in-parts";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageSkeleton } from "@/components/ui/skeleton";
import { getCurrentUser, safeNextPath } from "@/lib/auth/session";
import { getMyActivity, getMyConsent } from "@/lib/data/account";
import { getEvent } from "@/lib/data/events";
import { getProviderProfile } from "@/lib/data/providers";
import { fmt, getDictionary, type Lang } from "@/lib/i18n";
import { accountStrings } from "@/lib/i18n/areas/account";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { LOCALITIES, getLocality } from "@/lib/localities";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.account;
  return pageMetadata({ lang, href: (l) => routes.account(l), title: t.title, description: t.description, noindex: true });
}

export default async function AccountPage({ searchParams }: PageProps<"/[lang]/account">) {
  const lang = await getLang();
  return (
    <Suspense fallback={<PageSkeleton label={getDictionary(lang).common.loading} />}>
      <AccountEntry lang={lang} searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** "You were looking at Dr. Ananya Rao": the name behind a profile or event path. */
async function nameForPath(path: string): Promise<string | null> {
  const p = path.split(/[?#]/)[0];
  const profile = p.match(/^(?:\/hi)?\/gurgaon\/(?:doctor|hospital|lab|pharmacy)\/([a-z0-9-]+)(?:\/reviews)?\/?$/);
  if (profile) return (await getProviderProfile(profile[1]))?.name ?? null;
  const event = p.match(/^(?:\/hi)?\/gurgaon\/events\/([a-z0-9-]+)\/?$/);
  if (event && event[1] !== "submit") return (await getEvent(event[1]))?.title ?? null;
  return null;
}

async function AccountEntry({ lang, searchParams }: { lang: Lang; searchParams: PageProps<"/[lang]/account">["searchParams"] }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user && one(sp.deleted) === "1") {
    const review = one(sp.review);
    return <DeletedView lang={lang} review={review === "keep" || review === "remove" ? review : "none"} kept={one(sp.kept) === "1"} />;
  }

  const t = accountStrings(lang);
  // Only same-site paths, and never back to the sign-in page itself.
  const candidate = safeNextPath(one(sp.next));
  const next = candidate && !/^(?:\/hi)?\/account\/?(?:[?#]|$)/.test(candidate) ? candidate : null;
  const nextName = next ? await nameForPath(next) : null;
  const placeName = (name: string) => {
    const L = LOCALITIES.find((l) => l.name === name);
    return lang === "hi" && L ? L.nameHi : name;
  };

  let signedIn: SignedInInfo | null = null;
  if (user) {
    const [consent, activity] = await Promise.all([getMyConsent(), getMyActivity()]);
    const names = t.signin.msgNames;
    const messages = (consent?.types ?? [])
      .filter((m) => m.on)
      .map((m) =>
        m.purpose === "weekly_report"
          ? names.weekly
          : m.purpose === "city_channel"
            ? names.camps
            : m.purpose === "locality_updates"
              ? consent?.alertLocalities.length
                ? fmt(names.local, { place: listText(consent.alertLocalities.map(placeName), t.common.and) })
                : names.localAny
              : m.purpose === "community_replies"
                ? names.replies
                : names.saved,
      );
    signedIn = {
      phoneMasked: user.phoneMasked,
      messages,
      attention: activity?.attention.length ?? 0,
      hasActivity: (activity?.items.length ?? 0) > 0,
    };
  }

  const localities = LOCALITIES.filter((l) => l.live).map((l) => ({ slug: l.slug, name: lang === "hi" ? l.nameHi : l.name, nameEn: l.name }));
  // A user's own locality first in the choices, when they have one.
  const own = getLocality(user?.localitySlug);
  if (own) localities.sort((a, b) => (a.slug === own.slug ? -1 : b.slug === own.slug ? 1 : 0));

  return (
    <SignInFlow
      lang={lang}
      t={t.signin}
      common={t.common}
      links={{
        privacy: routes.trust(lang, "privacy"),
        saved: routes.accountSaved(lang),
        activity: routes.accountActivity(lang),
        consent: routes.accountConsent(lang),
        restart: routes.account(lang, { next: next ?? undefined }),
      }}
      next={next}
      nextName={nextName}
      signedOut={one(sp.signed_out) === "1"}
      signedIn={signedIn}
      localities={localities}
      crumbs={<Breadcrumbs lang={lang} items={[{ label: t.signin.crumb }]} />}
      aside={<SignInAside lang={lang} />}
    />
  );
}
