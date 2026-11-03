// /admin: the moderation overview. Prototype: "Health Gurgaon Admin and Mobile.dc.html" #admin
// (sidebar, the four tiles) and the Website Plan's roles and queues. Moderators, editors and
// admins only; everyone else gets sign-in (signed out) or the 404 page.
import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { OverviewView } from "@/components/admin/overview-view";
import { PageSkeleton } from "@/components/ui/skeleton";
import { STAFF_ROLES } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { getAdminOverview, getStaffAndRoles, getStaffMember } from "@/lib/data/admin";
import { getDictionary, type Lang } from "@/lib/i18n";
import { adminStrings } from "@/lib/i18n/areas/admin";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.admin;
  return pageMetadata({ lang, href: (l) => routes.admin(l), title: t.title, description: t.description, noindex: true });
}

export default async function AdminPage({ searchParams }: PageProps<"/[lang]/admin">) {
  const lang = await getLang();
  return (
    <Suspense fallback={<PageSkeleton label={getDictionary(lang).common.loading} />}>
      <Overview lang={lang} searchParams={searchParams} />
    </Suspense>
  );
}

async function Overview({ lang, searchParams }: { lang: Lang; searchParams: PageProps<"/[lang]/admin">["searchParams"] }) {
  const user = await requireRole(STAFF_ROLES, { lang, next: routes.admin(lang) });
  const t = adminStrings(lang);
  const isAdmin = user.role === "admin";
  const changedParam = (await searchParams).changed;
  const changedId = typeof changedParam === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(changedParam) ? changedParam : null;
  const [overview, staff, changed] = await Promise.all([
    getAdminOverview(),
    isAdmin ? getStaffAndRoles() : Promise.resolve(null),
    isAdmin && changedId ? getStaffMember(changedId) : Promise.resolve(null),
  ]);
  return (
    <AdminFrame lang={lang} t={t} active="overview" overview={overview}>
      <OverviewView lang={lang} t={t} role={overview.role} queues={overview.queues} staff={staff} meId={user.id} changed={changed} />
    </AdminFrame>
  );
}
