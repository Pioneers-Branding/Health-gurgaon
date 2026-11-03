// /account/saved: Saved & followed. Prototype: "Health Gurgaon Account.dc.html" #saved.
import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountHeader } from "@/components/account/account-header";
import { SavedView } from "@/components/account/saved-view";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";
import { getAccountNow, getMyAccount, getMyActivity, getMyConsent, getMyFollows, getMySaved } from "@/lib/data/account";
import { getDictionary, type Lang } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.accountSaved;
  return pageMetadata({ lang, href: (l) => routes.accountSaved(l), title: t.title, description: t.description, noindex: true });
}

export default async function AccountSavedPage() {
  const lang = await getLang();
  return (
    <Suspense fallback={<PageSkeleton label={getDictionary(lang).common.loading} />}>
      <Saved lang={lang} />
    </Suspense>
  );
}

async function Saved({ lang }: { lang: Lang }) {
  const user = await requireUser({ lang, next: routes.accountSaved(lang) });
  const [account, saved, follows, activity, consent, now] = await Promise.all([getMyAccount(), getMySaved(), getMyFollows(), getMyActivity(), getMyConsent(), getAccountNow()]);
  if (!account) return null;
  return (
    <>
      <AccountHeader lang={lang} page="saved" phoneMasked={user.phoneMasked} area={account.area} attention={activity?.attention.length ?? 0} />
      <SavedView lang={lang} now={now} account={account} saved={saved ?? []} follows={follows ?? []} activity={activity} consent={consent} />
    </>
  );
}
