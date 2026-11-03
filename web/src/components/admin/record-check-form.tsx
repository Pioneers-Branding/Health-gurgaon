"use client";

// Verification desk: "Record check" on one listing (how it was checked + the source). On success
// the Server Action returns to the desk with a confirmation; errors stay here, announced.

import { useActionState, useEffect, useRef } from "react";

import { recordCheck, type CheckData } from "@/app/actions/admin";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

type Labels = { reason: string; source: string; sourceHelp: string; record: string; publish: string; working: string; choose: string; optional: string };

export function RecordCheckForm({
  lang,
  slug,
  within,
  publish,
  reasons,
  labels,
}: {
  lang: Lang;
  slug: string;
  within: number;
  publish: boolean;
  reasons: { value: string; label: string }[];
  labels: Labels;
}) {
  const [state, action] = useActionState<ActionState<CheckData>, FormData>(recordCheck, idle);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "error") formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
  }, [state]);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const repeated = state.status === "error" && Object.values(errors).some((v) => v?.[0] === state.message);
  return (
    <form ref={formRef} action={action} noValidate className="flex min-w-0 flex-col gap-2.5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="within" value={within} />
      <input type="hidden" name="lang" value={lang} />
      <Field id={`check-reason-${slug}`} label={labels.reason} error={errors.reason}>
        <Select name="reason" defaultValue="" className="text-14">
          <option value="">{labels.choose}</option>
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field id={`check-source-${slug}`} label={labels.source} optional={labels.optional} help={labels.sourceHelp} error={errors.source}>
        <Input name="source" maxLength={200} />
      </Field>
      {state.status === "error" && !repeated && (
        <p tabIndex={-1} role="alert" className="m-0 text-13 font-medium text-emergency outline-none">
          {state.message}
        </p>
      )}
      <SubmitButton variant={publish ? "primary" : "dark"} size="sm" pendingLabel={labels.working} className="self-start">
        {publish ? labels.publish : labels.record}
      </SubmitButton>
    </form>
  );
}
