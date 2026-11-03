// "Report incorrect information". Prototype: "Health Gurgaon Content and Trust.dc.html" #report.
// About one listing, event, article or thread; unknown kinds or items get a real 404. No account
// needed (the plan's permission table: visitors can report too). ?review=<ref> reports a single
// review against the review policy.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportPageView, type ReportTarget } from "@/components/content-trust/report-page";
import { getThread, getThreads } from "@/lib/data/community";
import { getArticle, listArticleSlugs } from "@/lib/data/content";
import { getEvent, listEventSlugs } from "@/lib/data/events";
import { getProviderForRoute, listProviderSlugs } from "@/lib/data/providers";
import { getDictionary, type Lang } from "@/lib/i18n";
import { contentTrustStrings } from "@/lib/i18n/areas/content-trust";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { isProviderKind, isReportableKind, PROVIDER_KINDS, routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/report/[kind]/[slug]">;

export async function generateStaticParams() {
  const [providers, events, articles, threads] = await Promise.all([
    Promise.all(PROVIDER_KINDS.map(async (kind) => (await listProviderSlugs(kind)).map((slug) => ({ kind: kind as string, slug })))),
    listEventSlugs(),
    listArticleSlugs(),
    getThreads({ limit: 100 }),
  ]);
  return [
    ...providers.flat(),
    ...events.map((slug) => ({ kind: "event", slug })),
    ...articles.map((slug) => ({ kind: "article", slug })),
    ...threads.map((t) => ({ kind: "thread", slug: t.id })),
  ];
}

async function resolveTarget(lang: Lang, kind: string, slug: string): Promise<ReportTarget | null> {
  if (!isReportableKind(kind)) return null;
  const back = contentTrustStrings(lang).common.backToListing;
  if (isProviderKind(kind)) {
    const p = await getProviderForRoute(kind, slug);
    return p ? { kind, slug, label: p.areaLabel ? `${p.name}, ${p.areaLabel}` : p.name, backHref: routes.provider(lang, kind, slug), backLabel: back } : null;
  }
  if (kind === "event") {
    const e = await getEvent(slug);
    return e ? { kind, slug, label: e.title, backHref: routes.event(lang, slug), backLabel: back } : null;
  }
  if (kind === "article") {
    const a = await getArticle(slug);
    return a ? { kind, slug, label: a.title, backHref: routes.article(lang, slug), backLabel: back } : null;
  }
  const t = await getThread(slug);
  return t ? { kind, slug, label: t.title, backHref: routes.thread(lang, slug), backLabel: back } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { kind, slug } = await params;
  const target = await resolveTarget(lang, kind, slug);
  if (!target || !isReportableKind(kind)) notFound();
  const t = getDictionary(lang).pages.report;
  return pageMetadata({ lang, href: (l) => routes.report(l, kind, slug), title: `${t.title}: ${target.label}`, description: t.description, noindex: true });
}

export default async function ReportPage({ params, searchParams }: Props) {
  const lang = await getLang();
  const { kind, slug } = await params;
  const target = await resolveTarget(lang, kind, slug);
  if (!target) notFound();
  return <ReportPageView lang={lang} target={target} searchParams={searchParams} />;
}
