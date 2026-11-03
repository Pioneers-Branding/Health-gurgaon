// /admin/[queue]: one moderation queue (reviews, reports, events, claims, disputes, community,
// stories), the verification desk, the listings editor or the audit log. Prototype: "Health
// Gurgaon Admin and Mobile.dc.html" #admin. Private: each queue is open to the roles in
// QUEUE_ACCESS (src/lib/auth/permissions.ts); the page checks the role and so does every action.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { AuditView } from "@/components/admin/audit-view";
import { ListingsView, LISTING_STATUSES } from "@/components/admin/listings-view";
import { QueueView, type QueueFilter } from "@/components/admin/queue-view";
import { VerificationView, WITHIN_DAYS } from "@/components/admin/verification-view";
import { PageSkeleton } from "@/components/ui/skeleton";
import { QUEUE_ACCESS } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import {
  getAdminOverview,
  getAuditLog,
  getItemHistory,
  getListingForEdit,
  getListings,
  getModerationItem,
  getModerationQueue,
  getVerificationDesk,
  MODERATION_QUEUES,
  type ModerationQueue,
} from "@/lib/data/admin";
import { getDictionary, type Lang } from "@/lib/i18n";
import { adminStrings } from "@/lib/i18n/areas/admin";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { ADMIN_QUEUES, isAdminQueue, routes, type AdminQueue } from "@/lib/routes";

type Props = PageProps<"/[lang]/admin/[queue]">;
type SearchParams = Props["searchParams"];

export function generateStaticParams() {
  return ADMIN_QUEUES.map((queue) => ({ queue }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { queue } = await params;
  if (!isAdminQueue(queue)) notFound();
  const dict = getDictionary(lang);
  return pageMetadata({
    lang,
    href: (l) => routes.adminQueue(l, queue),
    title: dict.adminQueues[queue],
    description: dict.pages.adminQueue.description,
    noindex: true,
  });
}

export default async function AdminQueuePage({ params, searchParams }: Props) {
  const lang = await getLang();
  const { queue } = await params;
  if (!isAdminQueue(queue)) notFound();
  return (
    <Suspense fallback={<PageSkeleton label={getDictionary(lang).common.loading} />}>
      <Queue lang={lang} queue={queue} searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));
const isModerationQueue = (q: AdminQueue): q is ModerationQueue => (MODERATION_QUEUES as string[]).includes(q);
const ID = /^[A-Za-z0-9_-]{1,120}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function Queue({ lang, queue, searchParams }: { lang: Lang; queue: AdminQueue; searchParams: SearchParams }) {
  const user = await requireRole(QUEUE_ACCESS[queue], { lang, next: routes.adminQueue(lang, queue) });
  const t = adminStrings(lang);
  const sp = await searchParams;
  const overview = await getAdminOverview();

  let body: ReactNode;
  if (isModerationQueue(queue)) {
    const f = one(sp.filter);
    const filter: QueueFilter = f === "done" || f === "all" ? f : "waiting";
    const itemParam = one(sp.item);
    const [items, waiting, picked] = await Promise.all([
      getModerationQueue(queue, filter),
      filter === "waiting" ? null : getModerationQueue(queue, "waiting"),
      ID.test(itemParam) ? getModerationItem(queue, itemParam) : null,
    ]);
    const selected = picked ?? items[0] ?? null;
    const history = selected ? await getItemHistory(queue, selected.id) : [];
    const nextId = (waiting ?? items).find((i) => i.id !== selected?.id && (i.status === "waiting" || i.status === "escalated"))?.id ?? null;
    body = (
      <QueueView
        lang={lang}
        t={t}
        queue={queue}
        filter={filter}
        items={items}
        selected={selected}
        history={history}
        nextId={nextId}
        canReveal={user.role === "editor" || user.role === "admin"}
      />
    );
  } else if (queue === "verification") {
    const w = Number(one(sp.within));
    const within = (WITHIN_DAYS as readonly number[]).includes(w) ? w : 14;
    const checkedSlug = one(sp.checked);
    const [rows, checked] = await Promise.all([getVerificationDesk({ withinDays: within }), SLUG.test(checkedSlug) ? getListingForEdit(checkedSlug) : null]);
    body = (
      <VerificationView
        lang={lang}
        t={t}
        rows={rows}
        within={within}
        checked={
          checked
            ? { name: checked.name, published: one(sp.published) === "1", href: checked.status === "published" ? routes.provider(lang, checked.profileKind, checked.slug) : null }
            : null
        }
      />
    );
  } else if (queue === "listings") {
    const q = one(sp.q).trim().slice(0, 80);
    const s = one(sp.status);
    const status = (LISTING_STATUSES as readonly string[]).includes(s) ? s : "";
    const page = Math.min(Math.max(1, Math.floor(Number(one(sp.page))) || 1), 1000);
    const listingSlug = one(sp.listing);
    const [list, selected] = await Promise.all([getListings({ q, status: status || undefined, page }), SLUG.test(listingSlug) ? getListingForEdit(listingSlug) : null]);
    body = <ListingsView lang={lang} t={t} q={q} status={status} page={list.page} total={list.total} rows={list.items} selected={selected} />;
  } else {
    const b = one(sp.before);
    const before = b && !Number.isNaN(Date.parse(b)) ? b : null;
    const pageSize = 50;
    const rows = await getAuditLog({ limit: pageSize, before });
    body = <AuditView lang={lang} t={t} rows={rows} before={before} canExport={user.role === "admin"} pageSize={pageSize} />;
  }

  return (
    <AdminFrame lang={lang} t={t} active={queue} overview={overview}>
      {body}
    </AdminFrame>
  );
}
