// /admin/audit: the audit log, newest first, 50 at a time ("Older entries →" pages by time).
// Read-only. Admins can export it (the export is logged too).

import Link from "next/link";

import type { AuditRow } from "@/lib/data/admin";
import { fmt, getDictionary, type Lang } from "@/lib/i18n";
import { reasonLabel, type AdminStrings } from "@/lib/i18n/areas/admin";
import { routes } from "@/lib/routes";

import { ExportAudit } from "./export-audit";
import { adminHref, stamp } from "./format";

export function AuditView({ lang, t, rows, before, canExport, pageSize }: { lang: Lang; t: AdminStrings; rows: AuditRow[]; before: string | null; canExport: boolean; pageSize: number }) {
  const dict = getDictionary(lang);
  const a = t.audit;
  const older = rows.length === pageSize ? rows[rows.length - 1].at : null;
  const enText = lang === "hi" ? "en" : undefined;

  /** "Approved review RV-8830 · reason: …" in the reader's language (names and refs as stored). */
  const what = (r: AuditRow) => {
    const verb = r.verb ? t.verbs[r.verb] : undefined;
    if (!verb) return <span lang={enText}>{r.summary}</span>;
    const entity = r.entity ? (lang === "hi" ? (t.entities[r.entity] ?? r.entity) : r.entity) : "";
    return (
      <>
        {lang === "hi" ? (
          <>
            {entity ? `${entity} ` : ""}
            <span lang="en">{r.target}</span>: {verb}
          </>
        ) : (
          [verb, entity, r.target].filter(Boolean).join(" ")
        )}
        {r.reason ? <> · {fmt(t.auditReason, { reason: reasonLabel(t, r.reason) })}</> : null}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-[47.5rem] flex-col gap-2.5">
          <h1 className="m-0 text-24 leading-tight font-bold tracking-h3">{dict.adminQueues.audit}</h1>
          <p className="m-0 text-13.5 font-light text-muted">{a.intro}</p>
        </div>
        {canExport && <ExportAudit lang={lang} labels={{ export: a.export, exporting: a.exporting, exported: a.exported, note: a.exportNote, download: a.download }} />}
      </div>
      {rows.length === 0 ? (
        <p className="m-0 rounded-18 bg-cream p-5 text-14 font-light text-muted">{a.empty}</p>
      ) : (
        <ol className="m-0 list-none overflow-hidden rounded-18 border border-line p-0">
          {rows.map((r, i) => (
            <li key={r.id} className={`grid grid-cols-1 gap-x-3.5 gap-y-1 px-4 py-3 text-13.5 sm:grid-cols-[9.375rem_6.875rem_minmax(0,1fr)] ${i ? "border-t border-line" : ""}`}>
              <span className="font-mono text-11 leading-normal text-subtle">
                <span className="sr-only">{a.when}: </span>
                <time dateTime={r.at}>{stamp(lang, r.at, { comma: false })}</time>
              </span>
              <span className="font-medium">
                <span className="sr-only">{a.who}: </span>
                {r.actor}
                {r.actorRole && r.actorRole !== "system" ? <span className="sr-only"> ({t.roles[r.actorRole] ?? r.actorRole})</span> : null}
              </span>
              <span className="min-w-0 font-light break-words">
                <span className="sr-only">{a.what}: </span>
                {what(r)}
              </span>
            </li>
          ))}
        </ol>
      )}
      <nav aria-label={dict.adminQueues.audit} className="flex items-center justify-between gap-3">
        {before ? (
          <Link href={routes.adminQueue(lang, "audit")} className="inline-flex min-h-11 items-center text-14 font-medium">
            {a.newest}
          </Link>
        ) : (
          <span />
        )}
        {older ? (
          <Link href={adminHref(lang, "audit", { before: older })} className="inline-flex min-h-11 items-center text-14 font-medium">
            {a.older}
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
