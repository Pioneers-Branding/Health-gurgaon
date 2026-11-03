"use server";

// Healthy Neighbourhoods: registering a society, messaging an organiser privately, and the society
// dashboard's decisions (volunteer offers, completed-activity reports).
//
// A new society is saved as `pending` (not public) with the person who registered it as its admin;
// HealthGurgaon calls within 3 working days to verify it. Contact details stay in private columns.
// Dashboard decisions are open to the society's admins and editors and to site admins, and each
// one writes an AuditLog row.

import { fail, formLang, needsSignIn, notAllowed, ok, parseForm, type ActionState } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/types";
import { getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { detectMedicalDetails } from "@/lib/content-safety";
import { db } from "@/lib/db";
import { resolveLocality } from "@/lib/localities";
import { redactPersonalData } from "@/lib/redact";
import { nextRef } from "@/lib/refs";
import { contactOrganiserSchema, initiativeReportSchema, rwaRegistrationSchema, volunteerOfferDecisionSchema } from "@/lib/validation/rwa";

import { societyBadge, societySlug } from "@/components/community/logic";

import { localizeState, msg, type Lang } from "./community-messages";

const MAX_PENDING_MESSAGES = 3;

// ── Register a society ─────────────────────────────────────────────────────

export type RegisterData = { name: string; contact: string; channel: string; ref: string; slug: string };

export async function registerSociety(_prev: ActionState<RegisterData>, formData: FormData): Promise<ActionState<RegisterData>> {
  const lang: Lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(msg("signInRegister", lang));
  const parsed = parseForm(rwaRegistrationSchema, formData);
  if (!parsed.ok) return localizeState(parsed.state, lang);
  const input = parsed.data;

  // Society names and roles are public-ish text: no phone numbers or emails in them.
  const name = redactPersonalData(input.name).text;
  const localityText = redactPersonalData(input.locality).text;
  const contact = redactPersonalData(input.contact).text;
  const role = input.role ? redactPersonalData(input.role).text : null;
  const locality = resolveLocality(localityText);

  const base = societySlug(name);
  const taken = async (slug: string) => !!(await db.society.findUnique({ where: { slug }, select: { id: true } }));
  let slug = base;
  if (await taken(slug)) {
    const same = await db.society.findFirst({ where: { slug: base, status: { not: "rejected" } }, select: { localitySlug: true, areaLabel: true } });
    if (same && (same.localitySlug === (locality?.slug ?? null) || same.areaLabel?.toLowerCase().startsWith(localityText.toLowerCase()))) {
      return fail("duplicate", msg("alreadyRegistered", lang), { name: [msg("alreadyRegistered", lang)] });
    }
    slug = societySlug(`${name} ${localityText}`);
    for (let n = 2; (await taken(slug)) && n < 50; n++) slug = `${societySlug(`${name} ${localityText}`)}-${n}`;
  }

  const account = await db.user.findUnique({ where: { id: user.id }, select: { phone: true, email: true } });
  const ref = await db.$transaction(async (tx) => {
    const ref = await nextRef("society", tx);
    await tx.society.create({
      data: {
        slug,
        name,
        shortName: name.length > 40 ? `${name.slice(0, 39)}…` : name,
        badgeText: societyBadge(name),
        localitySlug: locality?.slug ?? null,
        areaLabel: `${localityText}, Gurugram`,
        groupType: input.groupType,
        status: "pending",
        contactName: contact,
        contactRole: role,
        contactChannel: input.channel,
        // Private: how the coordinator reaches the person who registered (never shown publicly).
        contactPhone: account?.phone ?? null,
        contactEmail: input.channel === "email" ? (account?.email ?? null) : null,
        registeredById: user.id,
        ref,
        members: { create: { userId: user.id, name: contact, title: role ?? "", permission: "admin" } },
      },
    });
    return ref;
  });
  expireTags(tags.society(slug));
  return ok(msg("registered", lang), { name, contact, channel: input.channel, ref, slug });
}

// ── Message the organiser ──────────────────────────────────────────────────

/** "Message the organiser": forwarded privately to the society's dashboard (Volunteer offers),
 * signed with how the person's posts are signed. Neither side's number is shown. */
export async function contactOrganiser(_prev: ActionState<{ sent: true }>, formData: FormData): Promise<ActionState<{ sent: true }>> {
  const lang: Lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(msg("signInMessage", lang));
  const parsed = parseForm(contactOrganiserSchema, formData);
  if (!parsed.ok) return localizeState(parsed.state, lang);
  const society = await db.society.findUnique({ where: { slug: parsed.data.societySlug }, select: { id: true, status: true } });
  if (!society || society.status !== "verified") return fail("not_found", msg("societyNotFound", lang));
  const waiting = await db.volunteerOffer.count({ where: { societyId: society.id, userId: user.id, status: "pending" } });
  if (waiting >= MAX_PENDING_MESSAGES) return fail("rate_limited", msg("tooManyMessages", lang));
  const clean = redactPersonalData(parsed.data.message).text;
  const short = clean.length > 280 ? `${clean.slice(0, 279)}…` : clean;
  await db.volunteerOffer.create({ data: { societyId: society.id, userId: user.id, displayName: user.reviewLabel, detail: `Message: “${short}”` } });
  return ok(msg("messageSent", lang), { sent: true });
}

// ── Dashboard decisions ────────────────────────────────────────────────────

/** The society, if this person may manage it (its admins and editors, or a site admin). */
async function managedSociety(slug: string, user: SessionUser) {
  const society = await db.society.findUnique({
    where: { slug },
    select: { id: true, slug: true, shortName: true, members: { where: { userId: user.id }, select: { permission: true } } },
  });
  if (!society) return null;
  const member = society.members[0];
  const canManage = user.role === "admin" || member?.permission === "admin" || member?.permission === "editor";
  return canManage ? society : null;
}

export type OfferData = { offerId: string; status: "accepted" | "declined" };

export async function decideVolunteerOffer(_prev: ActionState<OfferData>, formData: FormData): Promise<ActionState<OfferData>> {
  const lang: Lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(msg("signInDashboard", lang));
  const parsed = parseForm(volunteerOfferDecisionSchema, formData);
  if (!parsed.ok) return localizeState(parsed.state, lang);
  const { societySlug: slug, offerId, decision } = parsed.data;
  const society = await managedSociety(slug, user);
  if (!society) return notAllowed(msg("notAllowed", lang));
  const offer = await db.volunteerOffer.findFirst({ where: { id: offerId, societyId: society.id }, select: { id: true, status: true, displayName: true } });
  if (!offer) return fail("not_found", msg("offerNotFound", lang));
  if (offer.status === "accepted" || offer.status === "declined") {
    return ok(msg(offer.status === "accepted" ? "offerAccepted" : "offerDeclined", lang), { offerId, status: offer.status });
  }
  await db.$transaction(async (tx) => {
    await tx.volunteerOffer.update({ where: { id: offerId }, data: { status: decision, decidedAt: new Date() } });
    await writeAudit(
      {
        actor: user,
        action: decision === "accepted" ? "volunteer_offer.accept" : "volunteer_offer.decline",
        target: { kind: "society", id: society.slug, label: society.shortName },
        details: { offerId, offer: offer.displayName },
      },
      tx,
    );
  });
  return ok(msg(decision === "accepted" ? "offerAccepted" : "offerDeclined", lang), { offerId, status: decision });
}

export type InitiativeData = { eventSlug: string };

/** "Submit report" for a completed event: a counts-only summary that appears under "Completed
 * initiatives" on the public profile. Names, numbers and health details are refused. */
export async function submitInitiativeReport(_prev: ActionState<InitiativeData>, formData: FormData): Promise<ActionState<InitiativeData>> {
  const lang: Lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(msg("signInDashboard", lang));
  const parsed = parseForm(initiativeReportSchema, formData);
  if (!parsed.ok) return localizeState(parsed.state, lang);
  const { societySlug: slug, eventSlug, summary } = parsed.data;
  const society = await managedSociety(slug, user);
  if (!society) return notAllowed(msg("notAllowed", lang));
  const event = await db.event.findFirst({ where: { slug: eventSlug, societyId: society.id }, select: { id: true, title: true, startsAt: true, status: true, reportSummary: true } });
  if (!event) return fail("not_found", msg("eventNotFound", lang));
  const already = await db.initiative.count({ where: { eventId: event.id } });
  if (event.status !== "completed" || event.reportSummary || already) return fail("not_due", msg("reportNotDue", lang));
  const clean = redactPersonalData(summary);
  if (clean.changed || detectMedicalDetails(summary)) {
    return fail("invalid_input", msg("reportNoNames", lang), { summary: [msg("reportNoNames", lang)] });
  }
  await db.$transaction(async (tx) => {
    await tx.initiative.create({ data: { societyId: society.id, title: event.title, heldOn: event.startsAt, summary: clean.text, eventId: event.id, published: true } });
    await tx.event.update({ where: { id: event.id }, data: { reportSummary: clean.text } });
    await writeAudit({ actor: user, action: "initiative.publish", target: { kind: "society", id: society.slug, label: society.shortName }, details: { event: eventSlug } }, tx);
  });
  expireTags(tags.society(slug), tags.societies, tags.event(eventSlug), tags.events);
  return ok(msg("reportPublished", lang), { eventSlug });
}
