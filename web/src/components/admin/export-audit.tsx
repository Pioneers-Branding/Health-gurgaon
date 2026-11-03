"use client";

// "Export CSV" (admins): the Server Action returns the latest audit lines as CSV and logs the
// export; the browser saves the file.

import { useActionState, useEffect } from "react";

import { exportAuditLog, type ExportData } from "@/app/actions/admin";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { SubmitButton } from "@/components/ui/submit-button";

type Labels = { export: string; exporting: string; exported: string; note: string; download: string };

function save(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportAudit({ lang, labels }: { lang: Lang; labels: Labels }) {
  const [state, action] = useActionState<ActionState<ExportData>, FormData>(exportAuditLog, idle);
  const data = state.status === "success" ? state.data : undefined;

  useEffect(() => {
    if (data) save(data.csv, data.filename);
  }, [data]);

  return (
    <form action={action} className="flex max-w-80 flex-col items-start gap-1">
      <input type="hidden" name="lang" value={lang} />
      <SubmitButton variant="soft" size="sm" pendingLabel={labels.exporting}>
        {labels.export}
      </SubmitButton>
      <span className="text-12 font-light text-subtle">{labels.note}</span>
      {data && (
        <span role="status" className="text-12.5 text-success">
          {fmt(labels.exported, { n: data.rows })}{" "}
          <button type="button" onClick={() => save(data.csv, data.filename)} className="min-h-11 cursor-pointer bg-transparent font-medium text-teal hover:text-ink">
            {labels.download}
          </button>
        </span>
      )}
      {state.status === "error" && (
        <span role="alert" className="text-12.5 font-medium text-emergency">
          {state.message}
        </span>
      )}
    </form>
  );
}
