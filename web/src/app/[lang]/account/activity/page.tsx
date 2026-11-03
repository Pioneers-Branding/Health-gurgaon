// /account/activity: My reviews & reports. Prototype: "Health Gurgaon Account.dc.html" #activity.
import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountHeader } from "@/components/account/account-header";
import { ActivityView } from "@/components/account/activity-view";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";
import { getAccountNow, getMyAccount, getMyActivity } from "@/lib/data/account";
import { getDictionary, type Lang } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.accountActivity;
  return pageMetadata({ lang, href: (l) => routes.accountActivity(l), title: t.title, description: t.description, noindex: true });
}

export default async function AccountActivityPage({ searchParams }: PageProps<"/[lang]/account/activity">) {
  const lang = await getLang();
  return (
    <Suspense fallback={<PageSkeleton label={getDictionary(lang).common.loading} />}>
      <Activity lang={lang} searchParams={searchParams} />
    </Suspense>
  );
}

const ref = (v: string | string[] | undefined) => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^HG-RV-\d{4,}$/.test(s) ? s : null;
};

async function Activity({ lang, searchParams }: { lang: Lang; searchParams: PageProps<"/[lang]/account/activity">["searchParams"] }) {
  const user = await requireUser({ lang, next: routes.accountActivity(lang) });
  const [sp, account, activity, now] = await Promise.all([searchParams, getMyAccount(), getMyActivity(), getAccountNow()]);
  if (!account || !activity) return null;
  return (
    <>
      <AccountHeader lang={lang} page="activity" phoneMasked={user.phoneMasked} area={account.area} attention={activity.attention.length} />
      <ActivityView lang={lang} now={now} account={account} activity={activity} edit={ref(sp.edit)} withdraw={ref(sp.withdraw)} />
    </>
  );
}
