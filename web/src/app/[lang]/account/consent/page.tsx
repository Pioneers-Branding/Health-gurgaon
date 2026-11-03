// /account/consent: WhatsApp & email messages, the consent record, your data.
// ?confirm_email=<token> confirms an email address (signed in or out). Prototype:
// "Health Gurgaon Account.dc.html" #consent.
import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountHeader } from "@/components/account/account-header";
import { ConfirmEmail } from "@/components/account/consent-controls";
import { ConsentView } from "@/components/account/consent-view";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { PageSkeleton } from "@/components/ui/skeleton";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { getAccountNow, getMyAccount, getMyActivity, getMyConsent, getMyFollows } from "@/lib/data/account";
import { getDictionary, type Lang } from "@/lib/i18n";
import { accountStrings } from "@/lib/i18n/areas/account";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.accountConsent;
  return pageMetadata({ lang, href: (l) => routes.accountConsent(l), title: t.title, description: t.description, noindex: true });
}

type SP = PageProps<"/[lang]/account/consent">["searchParams"];

export default async function AccountConsentPage({ searchParams }: PageProps<"/[lang]/account/consent">) {
  const lang = await getLang();
  return (
    <Suspense fallback={<PageSkeleton label={getDictionary(lang).common.loading} />}>
      <Consent lang={lang} searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const KEYS = ["weekly", "camps", "local", "replies", "saved"];

async function Consent({ lang, searchParams }: { lang: Lang; searchParams: SP }) {
  const sp = await searchParams;
  const token = one(sp.confirm_email);
  const confirmToken = token && /^[A-Za-z0-9_-]{20,200}$/.test(token) ? token : null;

  // The email link works signed out too: just the confirmation.
  if (confirmToken && !(await getCurrentUser())) {
    const c = accountStrings(lang).consent;
    return (
      <Container size="form" className="flex flex-col gap-4 pt-6 pb-16">
        <Breadcrumbs lang={lang} items={[{ label: c.confirmPageTitle }]} />
        <h1 className="m-0 text-[2.125rem] font-bold leading-[1.1] tracking-h1">{c.confirmPageTitle}</h1>
        <ConfirmEmail lang={lang} token={confirmToken} title={c.confirmTitle} body={c.confirmBody} button={c.confirmBtn} after={c.confirmDone} />
      </Container>
    );
  }

  const user = await requireUser({ lang, next: routes.accountConsent(lang) });
  const [account, consent, follows, activity, now] = await Promise.all([getMyAccount(), getMyConsent(), getMyFollows(), getMyActivity(), getAccountNow()]);
  if (!account || !consent) return null;
  const ask = one(sp.ask);
  return (
    <>
      <AccountHeader lang={lang} page="consent" phoneMasked={user.phoneMasked} area={account.area} attention={activity?.attention.length ?? 0} />
      <ConsentView
        lang={lang}
        now={now}
        account={account}
        consent={consent}
        follows={follows ?? []}
        activity={activity}
        ask={ask && KEYS.includes(ask) ? ask : null}
        openDelete={one(sp.delete) === "1"}
        confirmToken={confirmToken}
      />
    </>
  );
}
