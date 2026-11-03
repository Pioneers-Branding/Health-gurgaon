"use client";

// Community Health Champions: the role cards (tap one to apply for it) and the application form.
// The cards are real radio inputs belonging to the form (form="volunteer-form"), so choosing a role
// and applying work without JavaScript. Posts applyToVolunteer; professional roles also ask for a
// registration number.

import Link from "next/link";
import { useActionState, useState, type ChangeEvent, type ReactNode } from "react";

import { applyToVolunteer, type ApplyData } from "@/app/actions/volunteer";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/form";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";

import { CheckChips, TickBox } from "./bits";
import { fill } from "./logic";

export type BoardRole = { slug: string; title: string; description: string; time: string; pay: string; payLabel: string; access: string; requiresRegistration: boolean };

export type BoardLabels = {
  chooseRole: string;
  access: string;
  noRoles: string;
  apply: string;
  applyingFor: string;
  tapToChange: string;
  name: string;
  namePlaceholder: string;
  locality: string;
  localityPlaceholder: string;
  skills: string;
  skillsPlaceholder: string;
  optional: string;
  availability: string;
  availabilityOptions: Record<string, string>;
  registration: string;
  registrationPlaceholder: string;
  consent: string;
  pay: Record<string, string>;
  submit: string;
  sending: string;
  doneTitle: string;
  doneBody: string;
  signInLink: string;
  seeActivity: string;
};

const AVAILABILITY = ["Weekdays", "Weekday evenings", "Weekends", "Online only"];

export function VolunteerBoard({
  lang,
  roles,
  visible,
  initialRole,
  labels,
  howItWorks,
  signInNote,
  hrefs,
}: {
  lang: Lang;
  /** Every role (to name the chosen one even when the filter hides it). */
  roles: BoardRole[];
  /** Slugs shown with the current filter. */
  visible: string[];
  initialRole: string;
  labels: BoardLabels;
  /** "How it works" and the code of conduct (server-rendered). */
  howItWorks: ReactNode;
  /** Shown to signed-out visitors above the form. */
  signInNote: ReactNode;
  hrefs: { signIn: string; activity: string };
}) {
  const [selected, setSelected] = useState(initialRole);
  const [state, action, pending] = useActionState<ActionState<ApplyData>, FormData>(applyToVolunteer, idle);
  const [values, setValues] = useState({ name: "", locality: "", skills: "", registrationNumber: "" });
  const [availability, setAvailability] = useState<string[]>(["Weekends"]);
  const [consent, setConsent] = useState(false);
  const role = roles.find((r) => r.slug === selected) ?? roles[0];
  const shown = roles.filter((r) => visible.includes(r.slug));
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const summary =
    state.status === "error"
      ? (errors.name?.[0] ?? errors.locality?.[0] ?? errors.registrationNumber?.[0] ?? errors.consent?.[0] ?? errors.role?.[0] ?? errors.skills?.[0] ?? errors.availability?.[0] ?? state.message)
      : null;
  const set = (k: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) => setValues({ ...values, [k]: e.currentTarget.value });
  const done = state.status === "success" ? state.data : undefined;
  const doneRole = done ? (roles.find((r) => r.slug === done.roleSlug)?.title ?? done.role) : "";

  const text: { key: keyof typeof values; label: string; placeholder: string; optional?: boolean; auto?: string }[] = [
    { key: "name", label: labels.name, placeholder: labels.namePlaceholder, auto: "name" },
    { key: "locality", label: labels.locality, placeholder: labels.localityPlaceholder },
    { key: "skills", label: labels.skills, placeholder: labels.skillsPlaceholder, optional: true },
  ];

  return (
    <>
      <fieldset className="min-w-0">
        <legend className="sr-only">{labels.chooseRole}</legend>
        {shown.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.875rem),1fr))] gap-3">
            {shown.map((r) => {
              const on = r.slug === selected;
              return (
                <label
                  key={r.slug}
                  className={cn(
                    "flex cursor-pointer flex-col gap-2 rounded-20 p-4.5 text-ink transition-colors has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal",
                    on ? "border-2 border-teal bg-[#F2FAF7]" : "border-[1.5px] border-line bg-white hover:border-subtle",
                  )}
                >
                  <input type="radio" form="volunteer-form" name="role" value={r.slug} checked={on} onChange={() => setSelected(r.slug)} className="sr-only" />
                  <span className="flex items-center justify-between gap-2">
                    <span className="mono-label text-10.5 text-caution">{r.time}</span>
                    <span className={cn("rounded-pill px-2.25 py-0.75 text-11.5 font-semibold", r.pay === "voluntary" ? "bg-cream text-ink" : "bg-success-tint text-success")}>{r.payLabel}</span>
                  </span>
                  <span className="text-17 font-semibold tracking-snug">{r.title}</span>
                  <span className="text-13.5 leading-[1.5] font-light text-muted">{r.description}</span>
                  <span className="text-12 font-light text-subtle">{fill(labels.access, { access: r.access })}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="rounded-20 bg-cream p-4.5 text-14 font-light text-muted">{labels.noRoles}</p>
        )}
      </fieldset>

      <div className="grid items-start gap-7 lg:grid-cols-2">
        {howItWorks}
        <section id="apply" aria-labelledby="apply-title" className="flex scroll-mt-24 flex-col gap-3.5 rounded-24 border-[1.5px] border-ink p-6">
          {done ? (
            <div role="status" tabIndex={-1} ref={(el) => el?.focus()} className="flex flex-col gap-3.5 outline-offset-4">
              <h2 id="apply-title" className="text-22 font-bold">
                {labels.doneTitle}
              </h2>
              <p className="text-14.5 leading-[1.55] font-light text-muted">{fill(labels.doneBody, { role: doneRole, ref: done.ref })}</p>
              <Link href={hrefs.activity} className="inline-flex min-h-11 items-center self-start text-14 font-medium">
                {labels.seeActivity}
              </Link>
            </div>
          ) : (
            <form id="volunteer-form" action={action} noValidate className="flex flex-col gap-3.5">
              <h2 id="apply-title" className="text-19 font-semibold">
                {labels.apply}
              </h2>
              {signInNote}
              <input type="hidden" name="lang" value={lang} />
              {!visible.includes(selected) && <input type="hidden" name="role" value={selected} />}
              <p className="rounded-14 bg-success-tint px-3.5 py-2.5 text-13.5">
                <span className="font-light">{labels.applyingFor}</span> <b className="font-semibold">{role?.title}</b> <span className="font-light text-muted">{labels.tapToChange}</span>
              </p>
              {text.map((f) => {
                const invalid = !!errors[f.key]?.length;
                return (
                  <div key={f.key} className="flex flex-col gap-1.5">
                    <label htmlFor={`vol-${f.key}`} className="text-14 font-medium">
                      {f.label}
                      {f.optional && <span className="font-light text-subtle"> ({labels.optional})</span>}
                    </label>
                    <Input
                      id={`vol-${f.key}`}
                      name={f.key}
                      value={values[f.key]}
                      onChange={set(f.key)}
                      placeholder={f.placeholder}
                      autoComplete={f.auto ?? "off"}
                      aria-invalid={invalid || undefined}
                      aria-describedby={invalid ? "vol-error" : undefined}
                      className="py-3 font-light"
                    />
                  </div>
                );
              })}
              <CheckChips id="vol-availability" name="availability" legend={labels.availability} options={AVAILABILITY.map((a) => ({ value: a, label: labels.availabilityOptions[a] ?? a }))} values={availability} onChange={setAvailability} />
              {role?.requiresRegistration && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vol-registration" className="text-14 font-medium">
                    {labels.registration}
                  </label>
                  <Input
                    id="vol-registration"
                    name="registrationNumber"
                    value={values.registrationNumber}
                    onChange={set("registrationNumber")}
                    placeholder={labels.registrationPlaceholder}
                    autoComplete="off"
                    aria-invalid={errors.registrationNumber?.length ? true : undefined}
                    aria-describedby={errors.registrationNumber?.length ? "vol-error" : undefined}
                    className="py-3 font-light"
                  />
                </div>
              )}
              <TickBox id="vol-consent" name="consent" checked={consent} onChange={setConsent}>
                {fill(labels.consent, { pay: labels.pay[role?.pay ?? "voluntary"] ?? role?.payLabel ?? "" })}
              </TickBox>
              {summary && (
                <p id="vol-error" role="alert" className="text-13 font-medium text-emergency">
                  {summary}{" "}
                  {state.status === "error" && state.code === "sign_in_required" && (
                    <Link href={hrefs.signIn} className="inline-flex min-h-11 items-center">
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
          )}
        </section>
      </div>
    </>
  );
}
