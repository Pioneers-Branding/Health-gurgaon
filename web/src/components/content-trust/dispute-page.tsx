// /dispute/[kind]/[slug]: "Dispute a ranking or a mention". Prototype: "Health Gurgaon Content and
// Trust.dc.html" #dispute. The four-step form is about this provider's top-list positions and
// neighbour mentions; ?target= and ?list= pre-select them (under <Suspense>, as they read the
// URL). "Recent dispute outcomes" follow. No account needed.

import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import type { DisputeItem } from "@/app/actions/dispute-schemas";
import type { DisputeOutcome } from "@/lib/data/content";
import type { ProviderProfile } from "@/lib/data/providers";
import { fmt, formatDate, formatNumber, getDictionary, type Lang } from "@/lib/i18n";
import { contentTrustStrings, type ContentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { routes, type ProviderKind } from "@/lib/routes";

import { FormHeader, PhaseTag } from "./bits";
import { DisputeForm, type DisputeItemView } from "./dispute-form";
import { DisputesLog } from "./disputes-log";
import { providerLine } from "./format";

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function itemView(lang: Lang, t: ContentTrustStrings, name: string, it: DisputeItem): DisputeItemView {
  const d = t.dispute;
  if (it.kind === "mention") {
    const themes = it.themes.map((th) => `${th.label} (${formatNumber(lang, th.count)})`).join(", ");
    return {
      id: it.id,
      kind: "mention",
      pos: it.mentionStatus === "not_enough" || !it.recommendedBy ? d.mentionNotEnough : it.recommendedBy === 1 ? d.mentionLineOne : fmt(d.mentionLine, { count: formatNumber(lang, it.recommendedBy) }),
      meta: themes ? fmt(d.mentionMeta, { themes }) : d.mentionMetaNone,
      listHref: null,
    };
  }
  if (!it.listSlug) return { id: it.id, kind: "ranking", pos: fmt(d.notRankedLine, { name }), meta: d.notRankedMeta, listHref: null };
  return {
    id: it.id,
    kind: "ranking",
    pos: fmt(d.rankLine, { rank: it.rank ?? "", of: it.of ?? "", title: it.listTitle ?? "" }),
    meta: fmt(d.scoreLine, { score: it.score ?? "", count: formatNumber(lang, it.reviewCount ?? 0), date: it.listUpdatedAt ? formatDate(lang, it.listUpdatedAt) : "" }),
    listHref: routes.topList(lang, it.listSlug),
  };
}

export function DisputePageView({
  lang,
  kind,
  profile,
  items,
  outcomes,
  searchParams,
}: {
  lang: Lang;
  kind: ProviderKind;
  profile: ProviderProfile;
  items: { ranking: DisputeItem[]; mention: DisputeItem[] };
  outcomes: DisputeOutcome[];
  searchParams: SP;
}) {
  const t = contentTrustStrings(lang);
  const views = {
    ranking: items.ranking.map((i) => itemView(lang, t, profile.name, i)),
    mention: items.mention.map((i) => itemView(lang, t, profile.name, i)),
  };
  const form = (initialKind: "ranking" | "mention" | "review", initialItemId: string) => (
    <FormFor lang={lang} t={t} kind={kind} profile={profile} views={views} initialKind={initialKind} initialItemId={initialItemId} />
  );
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-5 px-6 pt-7 pb-16">
      <FormHeader
        title={t.dispute.title}
        kicker={
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="mono-label text-10.5 text-teal">{t.dispute.kicker}</span>
            <PhaseTag>{t.common.phase2}</PhaseTag>
          </div>
        }
      >
        {t.dispute.intro}
      </FormHeader>
      <Suspense fallback={form("ranking", views.ranking[0]?.id ?? "")}>
        <FromParams searchParams={searchParams} items={items} render={form} />
      </Suspense>
      <section aria-labelledby="outcomes-title" className="mt-2 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="outcomes-title" className="text-22 font-semibold tracking-title">
            {t.disputes.title}
          </h2>
          <p className="text-14 leading-[1.55] font-light text-muted">{t.disputes.intro}</p>
        </div>
        <DisputesLog lang={lang} t={t} outcomes={outcomes} />
        <Link href={routes.disputes(lang)} className="inline-flex min-h-11 items-center self-start text-13.5 font-medium">
          {t.disputes.all}
        </Link>
      </section>
    </div>
  );
}

async function FromParams({
  searchParams,
  items,
  render,
}: {
  searchParams: SP;
  items: { ranking: DisputeItem[]; mention: DisputeItem[] };
  render: (initialKind: "ranking" | "mention" | "review", initialItemId: string) => ReactNode;
}) {
  const sp = await searchParams;
  const target = first(sp.target);
  const initialKind = target === "mention" || target === "review" ? target : "ranking";
  const list = first(sp.list);
  const pool = initialKind === "mention" ? items.mention : items.ranking;
  const item = (list ? pool.find((i) => i.listSlug === list) : null) ?? pool[0];
  return <>{render(initialKind, item?.id ?? "")}</>;
}

function FormFor({
  lang,
  t,
  kind,
  profile,
  views,
  initialKind,
  initialItemId,
}: {
  lang: Lang;
  t: ContentTrustStrings;
  kind: ProviderKind;
  profile: ProviderProfile;
  views: { ranking: DisputeItemView[]; mention: DisputeItemView[] };
  initialKind: "ranking" | "mention" | "review";
  initialItemId: string;
}) {
  const dict = getDictionary(lang);
  return (
    <DisputeForm
      lang={lang}
      kind={kind}
      slug={profile.slug}
      provider={{ name: profile.name, line: providerLine(profile) }}
      claimed={profile.claimed}
      items={views}
      initialKind={initialKind}
      initialItemId={initialItemId}
      labels={{
        ...t.dispute,
        progress: dict.stepper.progress,
        doneStep: dict.stepper.done,
        continue: t.common.continue,
        back: t.common.back,
        sending: t.common.sending,
        characters: t.common.characters,
        phase2b: t.common.phase2b,
        phoneWarning: t.forms.phoneWarningDispute,
        medicalWarning: t.forms.medicalWarningDispute,
        emailInvalid: t.forms.emailInvalid,
        emailPlaceholder: t.forms.emailPlaceholder,
        removeItems: t.trust.remove,
      }}
      hrefs={{
        report: routes.report(lang, kind, profile.slug),
        claim: routes.claim(lang, kind, profile.slug),
        reviews: routes.providerReviews(lang, kind, profile.slug),
        policy: routes.trust(lang, "reviews"),
        profile: routes.provider(lang, kind, profile.slug),
        threads: routes.providerReviews(lang, kind, profile.slug),
      }}
    />
  );
}
