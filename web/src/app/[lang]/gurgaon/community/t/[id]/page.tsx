// A discussion. Prototype: "Health Gurgaon Community.dc.html" #thread. Published threads are
// prerendered; unknown, pending or removed ones get a real 404. Who is reading (helpful marks, the
// asker's buttons, their replies waiting for a moderator) renders under <Suspense>.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ThreadPageView } from "@/components/community/thread-view";
import { getCommunityNow, getThreadView, listThreadIds } from "@/lib/data/community";
import { getDictionary } from "@/lib/i18n";
import { communityStrings } from "@/lib/i18n/areas/community";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/community/t/[id]">;

export async function generateStaticParams() {
  return (await listThreadIds()).map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { id } = await params;
  const view = await getThreadView(id);
  if (!view) notFound();
  const t = getDictionary(lang).pages.thread;
  const body = view.thread.body;
  return pageMetadata({
    lang,
    href: (l) => routes.thread(l, id),
    title: view.thread.title,
    description: body ? (body.length > 155 ? `${body.slice(0, 154)}…` : body) : t.description,
    ogType: "article",
  });
}

export default async function ThreadPage({ params }: Props) {
  const lang = await getLang();
  const { id } = await params;
  const [view, now] = await Promise.all([getThreadView(id), getCommunityNow()]);
  if (!view) notFound();
  return <ThreadPageView lang={lang} t={communityStrings(lang)} view={view} now={now} />;
}
