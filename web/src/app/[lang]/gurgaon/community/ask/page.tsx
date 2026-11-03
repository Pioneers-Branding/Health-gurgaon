// "Ask your neighbourhood": ask a question. Prototype: "Health Gurgaon Community.dc.html" #ask.
// The form is in the static shell; asking needs sign-in, checked under <Suspense> with ?next= back
// here (and again by the Server Action). ?topic= and ?locality= pre-select the form. The question
// waits for a moderator; it never goes straight onto the forum.
import type { Metadata } from "next";
import { Suspense } from "react";

import { AskForm, type AskLabels } from "@/components/community/ask-form";
import { topicOptions } from "@/components/community/forum-view";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireUser } from "@/lib/auth/session";
import { FORUM_TOPICS } from "@/lib/domain";
import { getDictionary, type Lang } from "@/lib/i18n";
import { communityStrings } from "@/lib/i18n/areas/community";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { getLocality, LOCALITIES, localityName } from "@/lib/localities";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/community/ask">;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.ask;
  return pageMetadata({ lang, href: (l) => routes.ask(l), title: t.title, description: t.description, noindex: true });
}

/** The prototype's defaults: Pharmacy & after-hours, Sector 56. */
const DEFAULT_TOPIC = FORUM_TOPICS[0].slug;
const DEFAULT_LOCALITY = "sector-56";

function formProps(lang: Lang) {
  const t = communityStrings(lang);
  const labels: AskLabels = {
    question: t.ask.question,
    questionPlaceholder: t.ask.questionPlaceholder,
    detail: t.ask.detail,
    detailPlaceholder: t.ask.detailPlaceholder,
    optional: t.common.optional,
    advice: t.ask.advice,
    adviceLink: t.ask.adviceLink,
    topic: t.ask.topic,
    locality: t.ask.locality,
    anonymous: t.ask.anonymous,
    signedAs: t.ask.signedAs,
    changeLabel: t.ask.changeLabel,
    post: t.ask.post,
    posting: t.ask.posting,
    postedTitle: t.ask.postedTitle,
    postedFirst: t.ask.postedFirst,
    postedReturning: t.ask.postedReturning,
    postedRedacted: t.ask.postedRedacted,
    backToCommunity: t.ask.backToCommunity,
    seeActivity: t.common.seeActivity,
    urgentTitle: t.thread.urgentTitle,
    urgentBody: t.thread.urgentBody,
    selfHarm: t.thread.selfHarm,
    phoneWarning: t.thread.phoneWarning,
    signInLink: t.common.signIn,
  };
  return {
    lang,
    labels,
    topics: topicOptions(lang),
    localities: LOCALITIES.map((L) => ({ value: L.slug, label: localityName(L.slug, lang) })),
    hrefs: {
      findDoctor: routes.search(lang, { type: "doctor" }),
      community: routes.community(lang),
      activity: routes.accountActivity(lang),
      consent: routes.accountConsent(lang),
      signIn: routes.account(lang, { next: routes.ask(lang) }),
    },
  };
}

export default async function AskPage({ searchParams }: Props) {
  const lang = await getLang();
  const dict = getDictionary(lang);
  const t = communityStrings(lang);
  const props = formProps(lang);
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-4.5 px-6 pt-5 pb-16">
      <Breadcrumbs lang={lang} items={[{ label: t.thread.crumbCommunity, href: routes.community(lang) }, { label: dict.pages.ask.title }]} />
      <h1 className="text-36 leading-[1.1] font-bold tracking-h1">{t.ask.title}</h1>
      <p className="-mt-1.5 text-13.5 leading-normal font-light text-muted">{t.ask.privacy}</p>
      <Suspense fallback={<AskForm {...props} defaultTopic={DEFAULT_TOPIC} defaultLocality={DEFAULT_LOCALITY} signedAs={null} />}>
        <AskGate lang={lang} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** Who is asking: sign-in (with ?next= back here), how their questions are signed, and the
 * topic and locality to start from (the URL's, else their own locality). */
async function AskGate({ lang, searchParams }: { lang: Lang; searchParams: Props["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const topic = FORUM_TOPICS.some((x) => x.slug === one(sp.topic)) ? one(sp.topic) : DEFAULT_TOPIC;
  const wanted = getLocality(one(sp.locality))?.slug;
  const next = routes.ask(lang, { topic: one(sp.topic) || undefined, locality: wanted });
  const user = await requireUser({ lang, next });
  const locality = wanted ?? getLocality(user.localitySlug)?.slug ?? DEFAULT_LOCALITY;
  return <AskForm {...formProps(lang)} defaultTopic={topic} defaultLocality={locality} signedAs={user.reviewLabel} />;
}
