"use client";

// Admins: change a staff member's role, or give someone a role by their number. Each change needs
// a reason and is written to the audit log by the Server Action.

import { useActionState, useEffect, useRef } from "react";

import { changeRole, grantRole, type RoleData } from "@/app/actions/admin";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select } from "@/components/ui/form";

export type RoleFormLabels = { newRole: string; reason: string; change: string; working: string; phone: string; add: string; choose: string };
type Option = { value: string; label: string };

function Result({ state }: { state: ActionState<RoleData> }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status !== "idle") ref.current?.focus();
  }, [state]);
  if (state.status === "idle") return null;
  return (
    <p ref={ref} tabIndex={-1} role={state.status === "error" ? "alert" : "status"} className={`m-0 w-full text-13 font-medium outline-none ${state.status === "error" ? "text-emergency" : "text-success"}`}>
      {state.message}
    </p>
  );
}

export function RoleChangeForm({ lang, userId, current, roles, reasons, labels }: { lang: Lang; userId: string; current: string; roles: Option[]; reasons: Option[]; labels: RoleFormLabels }) {
  const [state, action] = useActionState<ActionState<RoleData>, FormData>(changeRole, idle);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="lang" value={lang} />
      <Field id={`role-${userId}`} label={labels.newRole} className="w-40">
        <Select name="role" defaultValue={current} className="text-14">
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field id={`role-reason-${userId}`} label={labels.reason} className="w-56 max-w-full" error={state.status === "error" ? state.fieldErrors?.reason : undefined}>
        <Select name="reason" defaultValue="" className="text-14">
          <option value="">{labels.choose}</option>
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton variant="soft" size="sm" pendingLabel={labels.working}>
        {labels.change}
      </SubmitButton>
      <Result state={state} />
    </form>
  );
}

export function GrantRoleForm({ lang, roles, reasons, labels }: { lang: Lang; roles: Option[]; reasons: Option[]; labels: RoleFormLabels }) {
  const [state, action] = useActionState<ActionState<RoleData>, FormData>(grantRole, idle);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="lang" value={lang} />
      <Field id="grant-phone" label={labels.phone} className="w-48 max-w-full" error={errors.phone}>
        <Input name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="98XXX XXXXX" />
      </Field>
      <Field id="grant-role" label={labels.newRole} className="w-40" error={errors.role}>
        <Select name="role" defaultValue="moderator" className="text-14">
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="grant-reason" label={labels.reason} className="w-56 max-w-full" error={errors.reason}>
        <Select name="reason" defaultValue="" className="text-14">
          <option value="">{labels.choose}</option>
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton variant="dark" size="sm" pendingLabel={labels.working}>
        {labels.add}
      </SubmitButton>
      <Result state={state} />
    </form>
  );
}
