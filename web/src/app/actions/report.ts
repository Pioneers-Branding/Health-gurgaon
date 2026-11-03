"use server";

// "Report incorrect information" (/report/[kind]/[slug]) and the guide's "Suggest a correction":
//   submitFactReport  a fact is wrong → the editors' reports queue (ref HG-2187)
//   submitConcern     a concern about care or conduct → confidential, never published (HG-CC-0113)
//   flagReview        "Report" under a single review → a moderator checks it against the review
//                     policy (community queue, HG-CM-1905); the review stays up meanwhile
// "Something is missing" uses suggestListing (src/app/actions/find-care.ts).
// Anyone may report (the plan's permission table: visitors too); signed-in people also see their
// reports under My reviews & reports. Emails are private and only used for updates.

import { fail, formDataToObject, formLang, ok, parseForm, type ActionState } from "@/lib/action-state";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { detectMedicalDetails } from "@/lib/content-safety";
import { db } from "@/lib/db";
import { KINDS_FOR_PROFILE } from "@/lib/domain";
import type { AutoCheck } from "@/lib/json-types";
import { redactPersonalData } from "@/lib/redact";
import { nextRef } from "@/lib/refs";
import { isProviderKind } from "@/lib/routes";
import { complaintSchema, factReportSchema } from "@/lib/validation/report";
import { REVIEW_FLAG_REASON_TEXT, reviewFlagSchema } from "@/lib/validation/review";

import { factReportWithoutFieldSchema, isReportFormKind, reportFieldsFor, type ReportFormKind } from "./report-schemas";

type Lang = "en" | "hi";

const T = {
  notFound: { en: "We couldn’t find what you’re reporting.", hi: "जिसकी आप शिकायत कर रहे हैं, वह नहीं मिला।" },
  forbidden: { en: "You can’t report information with this account.", hi: "इस खाते से आप जानकारी की शिकायत नहीं कर सकते।" },
  field: { en: "Choose what’s wrong.", hi: "चुनें कि क्या ग़लत है।" },
  factDone: { en: "Thanks. Reference {ref}.", hi: "धन्यवाद। संदर्भ {ref}।" },
  factOpen: { en: "You’ve already reported this ({ref}). An editor is checking it.", hi: "आप यह पहले ही बता चुके हैं ({ref})। एक संपादक इसकी जाँच कर रहे हैं।" },
  concernDone: { en: "Shared confidentially. Reference {ref}.", hi: "गोपनीय रूप से भेजा गया। संदर्भ {ref}।" },
  reviewNotFound: { en: "We couldn’t find that review.", hi: "वह समीक्षा नहीं मिली।" },
  flagDone: { en: "Thanks. A moderator will check this review. Reference {ref}.", hi: "धन्यवाद। एक मॉडरेटर इस समीक्षा की जाँच करेंगे। संदर्भ {ref}।" },
  flagOpen: { en: "You’ve already reported this review ({ref}). A moderator is checking it.", hi: "आप इस समीक्षा की शिकायत पहले ही कर चुके हैं ({ref})। एक मॉडरेटर इसकी जाँच कर रहे हैं।" },
} as const;

function tr(key: keyof typeof T, lang: Lang, vars: Record<string, string> = {}): string {
  return Object.entries(vars).reduce<string>((s, [k, v]) => s.replaceAll(`{${k}}`, v), T[key][lang]);
}

const one = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

type Target = { targetKind: string; targetId: string; label: string; providerSlug: string | null };

/** The item a report is about, from the route's kind and slug (never from the reporter's text). */
async function resolveTarget(kind: ReportFormKind, slug: string): Promise<Target | null> {
  if (!slug || slug.length > 120) return null;
  if (isProviderKind(kind)) {
    const p = await db.provider.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, kind: true, status: true, areaLabel: true } });
    if (!p || p.status !== "published" || !KINDS_FOR_PROFILE[kind].includes(p.kind)) return null;
    return { targetKind: "provider", targetId: p.id, label: p.areaLabel ? `${p.name}, ${p.areaLabel}` : p.name, providerSlug: p.slug };
  }
  if (kind === "event") {
    const e = await db.event.findUnique({ where: { slug }, select: { id: true, title: true, status: true } });
    if (!e || e.status === "rejected" || e.status === "changes_requested") return null;
    return { targetKind: "event", targetId: e.id, label: e.title, providerSlug: null };
  }
  if (kind === "article") {
    const a = await db.article.findUnique({ where: { slug }, select: { id: true, title: true, status: true } });
    if (!a || a.status !== "published") return null;
    return { targetKind: "article", targetId: a.id, label: a.title, providerSlug: null };
  }
  if (kind === "guide") {
    const g = await db.guide.findUnique({ where: { slug }, select: { id: true, title: true, status: true } });
    if (!g || g.status !== "published") return null;
    return { targetKind: "guide", targetId: g.id, label: g.title, providerSlug: null };
  }
  const t = await db.thread.findUnique({ where: { id: slug }, select: { id: true, title: true, status: true } });
  if (!t || (t.status !== "open" && t.status !== "resolved")) return null;
  return { targetKind: "thread", targetId: t.id, label: t.title, providerSlug: null };
}

// ── A fact is wrong ─────────────────────────────────────────────────────────

export type ReportData = {
  ref: string | null;
  signedIn: boolean;
  duplicate: boolean;
  /** On an error, what was sent, so the form keeps it (also without JavaScript). */
  values: Record<string, string> | null;
};

type State = ActionState<ReportData>;

function keepValues(state: State, formData: FormData): State {
  if (state.status !== "error") return state;
  const values = Object.fromEntries(Object.entries(formDataToObject(formData)).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  return { ...state, data: { ref: null, signedIn: false, duplicate: false, values } };
}

export async function submitFactReport(prev: State, formData: FormData): Promise<State> {
  return keepValues(await factReport(prev, formData), formData);
}

export async function submitConcern(prev: State, formData: FormData): Promise<State> {
  return keepValues(await concern(prev, formData), formData);
}

export async function flagReview(prev: State, formData: FormData): Promise<State> {
  return keepValues(await reviewFlag(prev, formData), formData);
}

async function factReport(_prev: State, formData: FormData): Promise<State> {
  const lang = formLang(formData);
  const kind = one(formData.get("kind"));
  if (!isReportFormKind(kind)) return fail("not_found", tr("notFound", lang));
  const fields = reportFieldsFor(kind);
  const raw = {
    item: one(formData.get("item")),
    field: one(formData.get("field")),
    details: one(formData.get("details")),
    firsthand: one(formData.get("firsthand")),
    email: one(formData.get("email")),
    lang,
  };
  const parsed = fields.length ? parseForm(factReportSchema, raw) : parseForm(factReportWithoutFieldSchema, raw);
  if (!parsed.ok) return parsed.state;
  const field = "field" in parsed.data ? (parsed.data.field as string) : null;
  if (field && !(fields as string[]).includes(field)) return fail("invalid_input", tr("field", lang), { field: [T.field.en] });

  const user = await getCurrentUser();
  if (user && !can(user.role, "report_incorrect_info")) return fail("forbidden", tr("forbidden", lang));
  const target = await resolveTarget(kind, one(formData.get("slug")));
  if (!target) return fail("not_found", tr("notFound", lang));

  if (user) {
    const open = await db.report.findFirst({
      where: { type: "fact", targetKind: target.targetKind, targetId: target.targetId, field, reporterId: user.id, status: { in: ["received", "checking"] } },
      select: { ref: true },
    });
    if (open) return ok(tr("factOpen", lang, { ref: open.ref }), { ref: open.ref, signedIn: true, duplicate: true, values: null });
  }

  const item = redactPersonalData(parsed.data.item).text;
  const details = redactPersonalData(parsed.data.details);
  const accepted = user ? await db.report.count({ where: { reporterId: user.id, status: "resolved" } }) : 0;
  const autoChecks: AutoCheck[] = [
    { ok: true, text: "Factual field, not an allegation" },
    ...(details.changed ? [{ ok: true, text: "Personal data removed automatically" }] : []),
    ...(detectMedicalDetails(parsed.data.details) ? [{ ok: false, text: "Possible medical details in the report" }] : []),
    ...(accepted ? [{ ok: true, text: `Reporter has ${accepted} accepted report${accepted === 1 ? "" : "s"}` }] : []),
  ];
  const at = new Date().toISOString();
  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("report", tx);
    await tx.report.create({
      data: {
        ref: r,
        type: "fact",
        targetKind: target.targetKind,
        targetId: target.targetId,
        targetLabel: item || target.label,
        field,
        details: details.text,
        firsthand: parsed.data.firsthand,
        reporterId: user?.id ?? null,
        reporterEmail: parsed.data.email ?? null,
        timeline: [{ status: "received", at }],
        autoChecks,
        flags: [],
        privateNote: user ? null : "Reported without signing in",
      },
    });
    return r;
  });
  // Open timings reports show "hours being re-checked" on the profile.
  expireTags(user && tags.activity(user.id), field === "timings" && target.providerSlug && tags.provider(target.providerSlug));
  return ok(tr("factDone", lang, { ref }), { ref, signedIn: !!user, duplicate: false, values: null });
}

// ── A concern about care or conduct ─────────────────────────────────────────

async function concern(_prev: State, formData: FormData): Promise<State> {
  const lang = formLang(formData);
  const kind = one(formData.get("kind"));
  if (!isReportFormKind(kind)) return fail("not_found", tr("notFound", lang));
  const parsed = parseForm(complaintSchema, {
    item: one(formData.get("item")),
    topic: one(formData.get("topic")),
    details: one(formData.get("details")),
    email: one(formData.get("email")),
    lang,
  });
  if (!parsed.ok) return parsed.state;
  const user = await getCurrentUser();
  if (user && !can(user.role, "report_incorrect_info")) return fail("forbidden", tr("forbidden", lang));
  const target = await resolveTarget(kind, one(formData.get("slug")));
  if (!target) return fail("not_found", tr("notFound", lang));

  const details = redactPersonalData(parsed.data.details);
  const at = new Date().toISOString();
  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("concern", tx);
    await tx.report.create({
      data: {
        ref: r,
        type: "complaint",
        isAllegation: true,
        targetKind: target.targetKind,
        targetId: target.targetId,
        targetLabel: redactPersonalData(parsed.data.item).text || target.label,
        field: parsed.data.topic ?? null,
        details: details.text,
        reporterId: user?.id ?? null,
        reporterEmail: parsed.data.email ?? null,
        timeline: [{ status: "received", at }],
        autoChecks: [
          { ok: true, text: "Confidential path: never published" },
          ...(details.changed ? [{ ok: true, text: "Personal data removed automatically" }] : []),
          ...(detectMedicalDetails(parsed.data.details) ? [{ ok: false, text: "Possible medical details: delete them before sharing" }] : []),
        ],
        flags: ["Allegation"],
        privateNote: user ? null : "Shared without signing in",
      },
    });
    return r;
  });
  if (user) expireTags(tags.activity(user.id));
  return ok(tr("concernDone", lang, { ref }), { ref, signedIn: !!user, duplicate: false, values: null });
}

// ── "Report" under a single review ──────────────────────────────────────────

async function reviewFlag(_prev: State, formData: FormData): Promise<State> {
  const lang = formLang(formData);
  const parsed = parseForm(reviewFlagSchema, formData);
  if (!parsed.ok) return parsed.state;
  const user = await getCurrentUser();
  if (user && !can(user.role, "report_incorrect_info")) return fail("forbidden", tr("forbidden", lang));
  const review = await db.review.findUnique({
    where: { ref: parsed.data.reviewRef },
    select: { id: true, ref: true, status: true, text: true, provider: { select: { slug: true, name: true, status: true } } },
  });
  if (!review || review.status !== "published" || review.provider.slug !== parsed.data.providerSlug || review.provider.status !== "published") {
    return fail("not_found", tr("reviewNotFound", lang));
  }
  if (user) {
    const open = await db.contentFlag.findFirst({
      where: { targetKind: "review", targetId: review.id, reporterId: user.id, status: "open" },
      select: { ref: true },
    });
    if (open) return ok(tr("flagOpen", lang, { ref: open.ref }), { ref: open.ref, signedIn: true, duplicate: true, values: null });
  }
  const details = parsed.data.details ? redactPersonalData(parsed.data.details).text : "";
  const reason = REVIEW_FLAG_REASON_TEXT[parsed.data.reason];
  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("flag", tx);
    await tx.contentFlag.create({
      data: {
        ref: r,
        targetKind: "review",
        targetId: review.id,
        targetLabel: `Review of ${review.provider.name} (${review.ref})`,
        excerpt: review.text.slice(0, 600),
        reason: details ? `${reason}: “${details}”` : reason,
        reporterId: user?.id ?? null,
        autoChecks: [{ ok: true, text: "Review stays published while it’s checked" }],
        flags: parsed.data.reason === "personal" ? ["Privacy"] : [],
        privateNote: user ? `Reported by a signed-in ${user.role}` : "Reported without signing in",
      },
    });
    return r;
  });
  if (user) expireTags(tags.activity(user.id));
  return ok(tr("flagDone", lang, { ref }), { ref, signedIn: !!user, duplicate: false, values: null });
}
