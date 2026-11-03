"use server";

// Localities and events: submit a health event (into the events moderation queue, listed as
// "awaiting review" as the prototype shows), report a problem with an event, and suggest a
// locality we don't list. Every action re-checks the signed-in user itself and validates with
// zod (src/lib/validation/event.ts for events).
//
//   const [state, action, pending] = useActionState(submitEvent, idle);
//   <form action={action}>…<input type="hidden" name="lang" value={lang} />…</form>
//
// Messages come back in the form's language (hidden input name="lang").

import type { OrganiserType } from "@prisma/client";
import { z } from "zod";

import { fail, formLang, needsSignIn, ok, parseForm, type ActionState } from "@/lib/action-state";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { parseIst } from "@/lib/dates";
import { db } from "@/lib/db";
import { EVENT_TEMPLATES, PUBLIC_EVENT_STATUSES } from "@/lib/domain";
import { locText, resolveLocality } from "@/lib/localities";
import { redactPersonalData } from "@/lib/redact";
import { nextRef } from "@/lib/refs";
import { lang as langField, optionalText, text } from "@/lib/validation/common";
import { EVENT_CONSENT_TEXT, eventReportSchema, eventSubmissionSchema } from "@/lib/validation/event";

import { clockLabel, costLabel, eventSlug, fill, isOnlineText } from "@/components/local-events/format";

type Lang = "en" | "hi";

const T = {
  signInSubmit: { en: "Please sign in to submit an event. It only takes your phone number.", hi: "कार्यक्रम भेजने के लिए कृपया साइन इन करें। बस आपका फ़ोन नंबर चाहिए।" },
  forbidden: { en: "You can’t do this with this account.", hi: "इस खाते से आप यह नहीं कर सकते।" },
  check: { en: "Please check the highlighted fields.", hi: "कृपया चिह्नित जगहें देखें।" },
  submitted: {
    en: "Submitted. Your event is listed as “awaiting review” until we’ve called the organiser. Reference {ref}.",
    hi: "भेज दिया गया। आयोजक से बात होने तक आपका कार्यक्रम “समीक्षा बाकी” के रूप में दिखेगा। संदर्भ {ref}।",
  },
  duplicate: { en: "You’ve already submitted this event. Reference {ref}.", hi: "आप यह कार्यक्रम पहले ही भेज चुके हैं। संदर्भ {ref}।" },
  eventNotFound: { en: "We couldn’t find that event.", hi: "यह कार्यक्रम नहीं मिला।" },
  signInReport: {
    en: "Please sign in to report a problem with this event, so we can tell you what we find.",
    hi: "इस कार्यक्रम की समस्या बताने के लिए कृपया साइन इन करें, ताकि हम आपको बता सकें कि जाँच में क्या मिला।",
  },
  reported: { en: "Thanks, we’ll re-check this event (ref {ref})", hi: "धन्यवाद, हम इस कार्यक्रम को दोबारा जाँचेंगे (संदर्भ {ref})" },
  reportShort: { en: "Tell us what’s wrong or changed.", hi: "बताएँ कि क्या ग़लत है या क्या बदला है।" },
  suggested: {
    en: "✓ Thanks. An editor will add “{name}” or link it to the right locality, usually within a week. No account needed. Ref {ref}",
    hi: "✓ धन्यवाद। एक संपादक “{name}” को जोड़ देगा या सही इलाके से जोड़ देगा, आम तौर पर एक हफ़्ते में। खाते की ज़रूरत नहीं। संदर्भ {ref}",
  },
  suggestShort: { en: "Type the locality’s name.", hi: "इलाके का नाम लिखें।" },
} as const;

function tr(key: keyof typeof T, lang: Lang, vars: Record<string, string> = {}): string {
  return fill(T[key][lang], vars);
}

/** A failed parse with the summary in the form's language (field errors are keyed by field and
 * worded by the page). */
function invalid(state: ActionState<never>, lang: Lang): ActionState<never> {
  return state.status === "error" && lang === "hi" ? { ...state, message: T.check.hi } : state;
}

const SUBMITTER_WORD: Record<OrganiserType, string> = { rwa: "Society", resident_group: "Resident", ngo: "NGO", hospital_clinic: "Organiser", other: "Organiser" };

// ── Submit a health event ───────────────────────────────────────────────────

export type SubmitEventData = { ref: string; slug: string; title: string; duplicate: boolean };

const registrationSchema = z.object({ registration: optionalText(200) });

/** "Submit for review": the whole form (template → details → organiser → consents) checked again
 * with eventSubmissionSchema. The event goes into the events moderation queue with status
 * "awaiting review" (shown publicly, clearly labelled, as the prototype's tracker says) and the
 * organiser's contact details in private columns. One submission per person per title and time. */
export async function submitEvent(_prev: ActionState<SubmitEventData>, formData: FormData): Promise<ActionState<SubmitEventData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(T.signInSubmit[lang]);
  if (!can(user.role, "submit_event")) return fail("forbidden", T.forbidden[lang]);
  const parsed = parseForm(eventSubmissionSchema, formData);
  if (!parsed.ok) return invalid(parsed.state, lang);
  const extra = parseForm(registrationSchema, formData);
  if (!extra.ok) return invalid(extra.state, lang);
  const d = parsed.data;

  const template = EVENT_TEMPLATES.find((t) => t.name === d.template) ?? EVENT_TEMPLATES[0];
  const startsAt = parseIst(`${d.date} ${d.time}`);
  // Public text never carries phone numbers or emails.
  const clean = (s: string) => redactPersonalData(s);
  const title = clean(d.title);
  const venue = clean(d.venue);
  const localityText = clean(d.locality);
  const eligibility = d.eligibility ? clean(d.eligibility) : null;
  const org = clean(d.org);
  const registration = extra.data.registration ? clean(extra.data.registration) : null;
  const redactions = [title, venue, localityText, eligibility, org, registration].reduce((n, r) => n + (r?.redactions.reduce((m, x) => m + x.count, 0) ?? 0), 0);

  const online = isOnlineText(localityText.text) || isOnlineText(venue.text);
  const locality = online ? undefined : resolveLocality(localityText.text);
  // Keep what was typed when it isn't one of our localities, so nothing is lost.
  const venueLine = locality || online ? venue.text : `${venue.text}, ${localityText.text}`;
  const { cost, isFree } = costLabel(d.cost, d.costAmount);

  const same = await db.event.findFirst({ where: { submitterId: user.id, title: title.text, startsAt }, select: { ref: true, slug: true, title: true } });
  if (same) {
    const ref = same.ref ?? same.slug;
    return ok(tr("duplicate", lang, { ref }), { ref, slug: same.slug, title: same.title, duplicate: true });
  }

  const now = new Date();
  const created = await db.$transaction(async (tx) => {
    const ref = await nextRef("event", tx);
    const slug = eventSlug(title.text, ref);
    await tx.event.create({
      data: {
        slug,
        ref,
        title: title.text,
        type: template.type,
        template: template.name,
        organiserName: org.text,
        organiserType: d.orgType,
        organiserVerified: false,
        startsAt,
        timeLabel: clockLabel(d.time),
        venue: venueLine,
        localitySlug: locality?.slug ?? null,
        isOnline: online,
        eligibility: eligibility?.text ?? null,
        audience: [],
        cost,
        isFree,
        registration: registration?.text ?? null,
        services: [],
        status: "awaiting_review",
        source: `${SUBMITTER_WORD[d.orgType]} submission · not yet confirmed`,
        submitterId: user.id,
        submittedAt: now,
        contactName: d.contact,
        contactRole: d.role ?? null,
        contactPhone: d.phone,
        consents: [...EVENT_CONSENT_TEXT],
        autoChecks: [
          { ok: true, text: `Template: ${template.name.toLowerCase()}` },
          { ok: false, text: "Organiser not yet called" },
          {
            ok: !!locality || online,
            text: locality ? `Locality: ${locality.name}` : online ? "Online event" : `Locality not matched: “${localityText.text}”`,
          },
          { ok: redactions === 0, text: redactions ? "Personal details removed from public text" : "No personal details in public text" },
        ],
        flags: ["Needs organiser call"],
        timeline: [{ status: "received", at: now.toISOString(), note: "Listed in the calendar as “Awaiting review”, clearly labelled." }],
      },
    });
    return { ref, slug };
  });

  expireTags(tags.events, tags.activity(user.id), locality ? tags.locality(locality.slug) : null);
  return ok(tr("submitted", lang, { ref: created.ref }), { ref: created.ref, slug: created.slug, title: title.text, duplicate: false });
}

// ── "Something wrong or cancelled? Report it" ───────────────────────────────

export type EventReportData = { ref: string };

/** A fact report about an event, for the editors' reports queue. The person sees it under My
 * reports. One open report per person and event. */
export async function reportEvent(_prev: ActionState<EventReportData>, formData: FormData): Promise<ActionState<EventReportData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(T.signInReport[lang]);
  if (!can(user.role, "report_incorrect_info")) return fail("forbidden", T.forbidden[lang]);
  const parsed = parseForm(eventReportSchema, formData);
  if (!parsed.ok) {
    return parsed.state.status === "error" && parsed.state.fieldErrors?.details ? fail("invalid_input", T.reportShort[lang], { details: [T.reportShort[lang]] }) : invalid(parsed.state, lang);
  }
  const event = await db.event.findUnique({ where: { slug: parsed.data.eventSlug }, select: { id: true, title: true, status: true } });
  if (!event || !(PUBLIC_EVENT_STATUSES as readonly string[]).includes(event.status)) return fail("not_found", T.eventNotFound[lang]);

  const open = await db.report.findFirst({
    where: { targetKind: "event", targetId: event.id, reporterId: user.id, status: { in: ["received", "checking"] } },
    select: { ref: true },
  });
  if (open) return ok(tr("reported", lang, { ref: open.ref }), { ref: open.ref });

  const details = redactPersonalData(parsed.data.details).text;
  const at = new Date().toISOString();
  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("report", tx);
    await tx.report.create({
      data: {
        ref: r,
        type: "fact",
        targetKind: "event",
        targetId: event.id,
        targetLabel: event.title,
        details,
        reporterId: user.id,
        timeline: [{ status: "received", at }],
        autoChecks: [],
        flags: [],
      },
    });
    return r;
  });
  expireTags(tags.activity(user.id));
  return ok(tr("reported", lang, { ref }), { ref });
}

// ── "Suggest “…” as a locality" ─────────────────────────────────────────────

export type LocalitySuggestionData = { ref: string; duplicate: boolean };

const localitySuggestionSchema = z.object({ name: text(2, 80, "Type the locality’s name."), lang: langField });

/** A locality name we don't list, for the editors (reports queue, type "missing"). No account
 * needed; signed-in residents see it under My reports. The same open suggestion is never filed
 * twice. */
export async function suggestLocality(_prev: ActionState<LocalitySuggestionData>, formData: FormData): Promise<ActionState<LocalitySuggestionData>> {
  const lang = formLang(formData);
  const parsed = parseForm(localitySuggestionSchema, formData);
  if (!parsed.ok) return fail("invalid_input", T.suggestShort[lang], { name: [T.suggestShort[lang]] });
  const user = await getCurrentUser();
  if (user && !can(user.role, "report_incorrect_info")) return fail("forbidden", T.forbidden[lang]);
  const name = redactPersonalData(parsed.data.name).text;

  const pending = await db.report.findMany({
    where: { type: "missing", targetKind: "locality", status: { in: ["received", "checking"] } },
    select: { ref: true, targetLabel: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const same = pending.find((r) => locText(r.targetLabel) === locText(name));
  if (same) return ok(tr("suggested", lang, { name, ref: same.ref }), { ref: same.ref, duplicate: true });

  const at = new Date().toISOString();
  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("locality", tx);
    await tx.report.create({
      data: {
        ref: r,
        type: "missing",
        targetKind: "locality",
        targetLabel: name,
        details: `Suggested locality: “${name}” (typed in the locality search, no match).`,
        reporterId: user?.id ?? null,
        timeline: [{ status: "received", at }],
        autoChecks: [],
        flags: [],
      },
    });
    return r;
  });
  expireTags(user ? tags.activity(user.id) : null);
  return ok(tr("suggested", lang, { name, ref }), { ref, duplicate: false });
}
