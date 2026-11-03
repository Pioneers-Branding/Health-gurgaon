// /admin: every queue the signed-in role can open, with what's waiting, plus the records
// (verification desk, listings editor, audit log) and, for admins, staff & roles.

import Link from "next/link";

import { canOpenQueue, ROLES, type AdminQueue } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/types";
import { ROLE_REASONS } from "@/lib/data/admin-format";
import { fmt, formatDate, getDictionary, type Lang } from "@/lib/i18n";
import { reasonLabel, type AdminStrings } from "@/lib/i18n/areas/admin";
import { routes } from "@/lib/routes";
import { Callout } from "@/components/ui/callout";
import { cn } from "@/components/ui/cn";

import { GrantRoleForm, RoleChangeForm, type RoleFormLabels } from "./role-forms";

type QueueCount = { queue: AdminQueue; waiting: number; atRisk: number };
type StaffRow = { id: string; displayName: string | null; phoneMasked: string; role: Role; lastSignInAt: string | null };

export function OverviewView({
  lang,
  t,
  role,
  queues,
  staff,
  meId,
  changed,
}: {
  lang: Lang;
  t: AdminStrings;
  role: Role;
  queues: QueueCount[];
  staff: StaffRow[] | null;
  meId: string;
  /** After a role change: who, and their role now. */
  changed: { label: string; role: string } | null;
}) {
  const dict = getDictionary(lang);
  const o = t.overview;
  const records = (["verification", "listings", "audit"] as AdminQueue[]).filter((q) => canOpenQueue(role, q));
  const recordNote: Record<string, string> = { verification: o.verificationNote, listings: o.listingsNote, audit: o.auditNote };
  const roleOptions = ROLES.map((r) => ({ value: r, label: t.roles[r] ?? r }));
  const reasonOptions = ROLE_REASONS.map((r) => ({ value: r, label: reasonLabel(t, r) }));
  const roleLabels: RoleFormLabels = {
    newRole: t.staff.newRole,
    reason: t.staff.reason,
    change: t.staff.change,
    working: t.staff.working,
    phone: t.staff.phone,
    add: t.staff.add,
    choose: t.decide.chooseReason,
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex max-w-[47.5rem] flex-col gap-1.5">
        <h1 className="m-0 text-24 leading-tight font-bold tracking-h3">{dict.pages.admin.title}</h1>
        <p className="m-0 text-13.5 leading-normal font-light text-muted">{o.intro}</p>
      </div>

      <section aria-labelledby="hg-queues" className="flex flex-col gap-3">
        <h2 id="hg-queues" className="mono-label m-0 text-10.5 text-subtle">
          {o.queuesTitle}
        </h2>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,13.75rem),1fr))] gap-3 p-0">
          {queues.map((q) => (
            <li key={q.queue}>
              <Link
                href={routes.adminQueue(lang, q.queue)}
                className="flex h-full min-h-28 flex-col gap-2 rounded-18 border border-line bg-white p-4 text-ink no-underline hover:border-ink hover:text-ink"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-16 font-semibold tracking-card">{dict.adminQueues[q.queue]}</span>
                  <span className={cn("min-w-5.5 rounded-pill px-1.75 py-px text-center text-11.5 font-bold", q.waiting ? "bg-saffron text-ink" : "bg-stone text-muted")}>{q.waiting}</span>
                </span>
                <span className="text-13 font-light text-muted">{q.waiting === 0 ? o.nothing : q.waiting === 1 ? o.waitingOne : fmt(o.waiting, { n: q.waiting })}</span>
                {q.atRisk > 0 && <span className="text-12.5 font-medium text-emergency">{fmt(o.atRisk, { n: q.atRisk })}</span>}
                <span className="mt-auto text-13.5 font-medium text-teal">{o.open} →</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="m-0 text-12.5 leading-normal font-light text-subtle">{o.sla}</p>
      </section>

      <section aria-labelledby="hg-records" className="flex flex-col gap-3">
        <h2 id="hg-records" className="mono-label m-0 text-10.5 text-subtle">
          {o.recordsTitle}
        </h2>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-3 p-0">
          {records.map((q) => (
            <li key={q}>
              <Link href={routes.adminQueue(lang, q)} className="flex h-full flex-col gap-1.5 rounded-18 bg-cream p-4 text-ink no-underline hover:bg-cream-deep hover:text-ink">
                <span className="text-16 font-semibold tracking-card">{dict.adminQueues[q]}</span>
                <span className="text-13 leading-normal font-light text-muted">{recordNote[q]}</span>
                <span className="mt-auto text-13.5 font-medium text-teal">{o.open} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {staff && (
        <section aria-labelledby="hg-staff" className="flex flex-col gap-3">
          <div className="flex max-w-[47.5rem] flex-col gap-1">
            <h2 id="hg-staff" className="m-0 text-20 font-bold tracking-title">
              {t.staff.title}
            </h2>
            <p className="m-0 text-13.5 leading-normal font-light text-muted">{t.staff.intro}</p>
          </div>
          {changed && (
            <Callout tone="success" live="polite" className="max-w-[47.5rem]">
              <p className="m-0 font-medium text-ink">
                {fmt(t.staff.changed, { role: t.roles[changed.role] ?? changed.role })} <span className="font-light">({changed.label})</span>
              </p>
            </Callout>
          )}
          <ul className="m-0 flex list-none flex-col overflow-hidden rounded-18 border border-line p-0">
            {staff.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-line px-4 py-3 first:border-t-0">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-14.5 font-medium">
                    {u.displayName ?? u.phoneMasked}
                    {u.id === meId ? <span className="font-light text-subtle"> · {t.staff.you}</span> : null}
                  </span>
                  <span className="text-12.5 font-light text-muted">
                    {t.roles[u.role] ?? u.role} · {u.displayName ? `${u.phoneMasked} · ` : ""}
                    {u.lastSignInAt ? fmt(t.staff.lastSignIn, { date: formatDate(lang, u.lastSignInAt) }) : t.staff.neverSignedIn}
                  </span>
                </span>
                {u.id !== meId && <RoleChangeForm lang={lang} userId={u.id} current={u.role} roles={roleOptions} reasons={reasonOptions} labels={roleLabels} />}
              </li>
            ))}
          </ul>
          <div className="flex max-w-[47.5rem] flex-col gap-2 rounded-18 bg-cream p-4">
            <h3 className="m-0 text-15 font-semibold">{t.staff.addTitle}</h3>
            <p className="m-0 text-13 font-light text-muted">{t.staff.addIntro}</p>
            <GrantRoleForm lang={lang} roles={roleOptions} reasons={reasonOptions} labels={roleLabels} />
          </div>
        </section>
      )}
    </div>
  );
}
