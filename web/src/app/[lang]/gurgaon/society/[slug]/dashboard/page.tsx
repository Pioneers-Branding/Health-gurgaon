// A society's private dashboard. Prototype: "Health Gurgaon Community.dc.html" #dashboard.
// noindex. Unknown societies get a real 404. Signed-out visitors go to sign-in (?next= back here);
// signed-in people who aren't on the society's team (or site admins) see the 404 page, so the
// dashboard doesn't reveal itself. The team and decisions render under <Suspense>.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardView } from "@/components/community/dashboard-view";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";
import { getSocietyDashboardView, getSocietyMeta, listSocietySlugs } from "@/lib/data/community";
import { getDictionary, type Lang } from "@/lib/i18n";
import { communityStrings } from "@/lib/i18n/areas/community";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/society/[slug]/dashboard">;

export async function generateStaticParams() {
  return (await listSocietySlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { slug } = await params;
  const t = getDictionary(lang).pages.societyDashboard;
  return pageMetadata({ lang, href: (l) => routes.societyDashboard(l, slug), title: t.title, description: t.description, noindex: true });
}

export default async function SocietyDashboardPage({ params }: Props) {
  const lang = await getLang();
  const { slug } = await params;
  if (!(await getSocietyMeta(slug))) notFound();
  return (
    <Suspense fallback={<PageSkeleton label={getDictionary(lang).common.loading} />}>
      <Dashboard lang={lang} slug={slug} />
    </Suspense>
  );
}

async function Dashboard({ lang, slug }: { lang: Lang; slug: string }) {
  await requireUser({ lang, next: routes.societyDashboard(lang, slug) });
  const d = await getSocietyDashboardView(slug);
  if (!d) notFound();
  return <DashboardView lang={lang} t={communityStrings(lang)} d={d} />;
}
