"use client";

// "Register your society" (Healthy Neighbourhoods). Posts registerSociety (works without
// JavaScript). Signed-in only: the coordinator calls the number on the account to verify, and it is
// never shown. On success: "✓ Thanks, {name}" and a link to the society's (private) dashboard.

import Link from "next/link";
import { useActionState, useState, type ChangeEvent, type ReactNode } from "react";

import { registerSociety, type RegisterData } from "@/app/actions/rwa";
import { Input } from "@/components/ui/form";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";

import { RadioChips, TickBox } from "./bits";
import { fill } from "./logic";

export type RwaLabels = {
  formTitle: string;
  name: string;
  namePlaceholder: string;
  locality: string;
  localityPlaceholder: string;
  contact: string;
  contactPlaceholder: string;
  role: string;
  rolePlaceholder: string;
  optional: string;
  groupType: string;
  groupTypes: Record<string, string>;
  channel: string;
  channels: Record<string, string>;
  channelsLower: Record<string, string>;
  consent: string;
  submit: string;
  sending: string;
  doneTitle: string;
  doneBody: string;
  doneRef: string;
  dashboard: string;
  signInLink: string;
};

const GROUP_TYPES = ["registered_rwa", "apartment_association", "informal_group"];
const CHANNELS = ["whatsapp", "phone", "email"];

export function RwaForm({ lang, labels, signInHref, notice }: { lang: Lang; labels: RwaLabels; signInHref: string; /** Shown under the title (the signed-out note). */ notice?: ReactNode }) {
  const [state, action, pending] = useActionState<ActionState<RegisterData>, FormData>(registerSociety, idle);
  const [values, setValues] = useState({ name: "", locality: "", contact: "", role: "" });
  const [groupType, setGroupType] = useState("registered_rwa");
  const [channel, setChannel] = useState("whatsapp");
  const [consent, setConsent] = useState(false);

  if (state.status === "success" && state.data) {
    const d = state.data;
    return (
      <div role="status" tabIndex={-1} ref={(el) => el?.focus()} className="flex flex-col gap-3.5 outline-offset-4">
        <p className="text-22 font-bold">{fill(labels.doneTitle, { name: d.name })}</p>
        <p className="text-14.5 leading-[1.55] font-light text-muted">{fill(labels.doneBody, { contact: d.contact, channel: labels.channelsLower[d.channel] ?? d.channel })}</p>
        <p className="mono-label text-11 text-subtle">{fill(labels.doneRef, { ref: d.ref })}</p>
        <Link href={routes.societyDashboard(lang, d.slug)} className="inline-flex min-h-11 items-center self-start rounded-pill bg-ink px-4.5 text-14 text-cream hover:bg-ink-soft hover:text-cream">
          {labels.dashboard}
        </Link>
      </div>
    );
  }

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const set = (k: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) => setValues({ ...values, [k]: e.currentTarget.value });
  const fields: { key: keyof typeof values; label: string; placeholder: string; optional?: boolean; auto?: string }[] = [
    { key: "name", label: labels.name, placeholder: labels.namePlaceholder },
    { key: "locality", label: labels.locality, placeholder: labels.localityPlaceholder },
    { key: "contact", label: labels.contact, placeholder: labels.contactPlaceholder, auto: "name" },
    { key: "role", label: labels.role, placeholder: labels.rolePlaceholder, optional: true, auto: "organization-title" },
  ];
  // One message for the three required fields, as in the prototype: show it once, under the form.
  const required = errors.name?.[0] ?? errors.locality?.[0] ?? errors.contact?.[0] ?? errors.role?.[0];
  const summary = state.status === "error" ? (required ?? errors.consent?.[0] ?? (Object.values(errors).some((v) => v?.length) ? null : state.message)) : null;

  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <h2 className="text-19 font-semibold">{labels.formTitle}</h2>
      {notice}
      <input type="hidden" name="lang" value={lang} />
      {fields.map((f) => {
        const invalid = !!errors[f.key]?.length;
        return (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label htmlFor={`rwa-${f.key}`} className="text-14 font-medium text-ink">
              {f.label}
              {f.optional && <span className="font-light text-subtle"> ({labels.optional})</span>}
            </label>
            <Input
              id={`rwa-${f.key}`}
              name={f.key}
              value={values[f.key]}
              onChange={set(f.key)}
              placeholder={f.placeholder}
              autoComplete={f.auto ?? "off"}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? "rwa-error" : undefined}
              className="py-3 font-light"
            />
          </div>
        );
      })}
      <RadioChips id="rwa-group" name="groupType" legend={labels.groupType} options={GROUP_TYPES.map((v) => ({ value: v, label: labels.groupTypes[v] }))} value={groupType} onChange={setGroupType} error={errors.groupType?.[0]} />
      <RadioChips id="rwa-channel" name="channel" legend={labels.channel} options={CHANNELS.map((v) => ({ value: v, label: labels.channels[v] }))} value={channel} onChange={setChannel} error={errors.channel?.[0]} />
      <TickBox id="rwa-consent" name="consent" checked={consent} onChange={setConsent}>
        {labels.consent}
      </TickBox>
      {summary && (
        <p id="rwa-error" role="alert" className="text-13 font-medium text-emergency">
          {summary}{" "}
          {state.status === "error" && state.code === "sign_in_required" && (
            <Link href={signInHref} className="inline-flex min-h-11 items-center">
              {labels.signInLink}
            </Link>
          )}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="inline-flex min-h-12 items-center self-start rounded-pill bg-teal px-5.5 text-15 font-semibold text-white hover:bg-teal-dark disabled:opacity-60"
      >
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
