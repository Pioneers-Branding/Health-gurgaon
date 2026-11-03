// Provider reads: profiles, reviews, specialty pages, the emergency and facilities directories,
// featured and recently verified providers. Server-only; all cached with 'use cache' and tagged
// (src/lib/cache-tags.ts). Pages receive plain objects; private fields (phones, private notes)
// never leave this module except through getPublicPhone().

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";

import { tags } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { KINDS_FOR_PROFILE, OWNERSHIP_DESCRIPTIONS, OWNERSHIP_LABELS, OWNERSHIPS, PROFILE_KIND_OF, type ProfileKind } from "@/lib/domain";
import type { EmergencyDepartment } from "@/lib/emergency";
import { istWeekday, openStatusParts, WEEKDAYS, type OpenStatusParts } from "@/lib/hours";
import {
  asArray,
  asObject,
  asOpeningHours,
  asStringArray,
  asSubScores,
  type AccessibilityItem,
  type Department,
  type EmergencyInfo,
  type Faq,
  type HomeCollection,
  type LabTest,
  type ReviewStats,
  type VisitingInfo,
} from "@/lib/json-types";
import { getLocality, LOCALITIES } from "@/lib/localities";
import { TOP_LIST_METHOD } from "@/lib/ranking";
import { normalize } from "@/lib/search";

import { daysAgo, iso, providerCardSelect, threadCardSelect, toProviderCard, toProviderLink, toThreadCard, type ProviderCard, type ProviderLink, type ThreadCard } from "./mappers";

// ── Profiles ────────────────────────────────────────────────────────────────

export type VerificationFact = { field: string; label: string; value: string | null; note: string | null; result: string; checkedAt: string | null };
export type VerificationLogRow = { field: string; what: string; how: string | null; result: string; checkedAt: string | null };

export type ProviderProfile = ProviderCard & {
  specialty: { slug: string; name: string; doctorNoun: string; doctorNounPlural: string } | null;
  qualifications: string | null;
  registration: { council: string | null; number: string | null } | null;
  yearsInPractice: number | null;
  gender: string | null;
  sizeLabel: string | null;
  bedCount: number | null;
  addressLine: string | null;
  sector: string | null;
  servesLocalities: { slug: string; name: string }[];
  followUpTerms: string | null;
  hours: {
    days: { day: number; label: string; text: string }[] | null;
    open24h: boolean;
    summary: string | null;
    source: string | null;
    checkedAt: string | null;
    /** Where these timings apply: "Little Steps Clinic, Sushant Lok 1". */
    practiceLabel: string | null;
    /** A resident reported the hours and an editor is checking: show “hours being re-checked”. */
    underRecheck: boolean;
  };
  /** Recent changes to the listing's facts ("Sunday hours are now 7 am – 1 pm…"), newest first. */
  recentChanges: { field: string; summary: string; source: string | null; changedAt: string }[];
  accessibility: AccessibilityItem[];
  services: string[];
  departments: Department[];
  emergency: EmergencyInfo | null;
  homeCollection: HomeCollection | null;
  delivery: boolean;
  tests: LabTest[];
  visiting: VisitingInfo | null;
  /** The clinic phone exists; fetch it on click with getPublicPhone() (via a Server Action). */
  hasPublicPhone: boolean;
  badges: string[];
  claimed: boolean;
  nextCheckAt: string | null;
  verification: { facts: VerificationFact[]; log: VerificationLogRow[] };
  /** For doctors: where they practise. */
  practicesAt: (ProviderLink & { days: string | null; department: string | null; verified: boolean })[];
  /** For facilities: doctors practising here. */
  doctorsHere: (ProviderLink & { headline: string; days: string | null; department: string | null })[];
  /** Snapshot of review aggregates (see getProviderReviews for the reviews themselves). */
  reviewStats: ReviewStats | null;
  /** Top-list positions (Phase 2): "Ranked #1 of 10 · Paediatricians by patient experience". */
  topLists: { slug: string; title: string; rank: number; of: number; score: number; reviewCount: number }[];
  /** "Ask the hospital" (Phase 2): official answers to factual questions. */
  questions: { question: string; answer: string | null; answeredAt: string | null }[];
};

const profileInclude = {
  specialty: { select: { slug: true, name: true, doctorNoun: true, doctorNounPlural: true } },
  verifications: { orderBy: { sortOrder: "asc" as const } },
  practicesAt: { orderBy: { sortOrder: "asc" as const }, include: { facility: { select: { slug: true, name: true, kind: true, status: true } } } },
  doctorsHere: { orderBy: { sortOrder: "asc" as const }, include: { doctor: { select: { slug: true, name: true, kind: true, headline: true, status: true } } } },
  questions: { where: { published: true }, orderBy: { answeredAt: "desc" as const } },
  topListEntries: { include: { list: { select: { slug: true, title: true, published: true, entries: { select: { id: true, score: true } } } } } },
};

/** A provider's profile by slug, or null if unknown or not public. */
export async function getProviderProfile(slug: string): Promise<ProviderProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.provider(slug), tags.providers);
  const now = new Date();
  const p = await db.provider.findUnique({
    where: { slug },
    select: {
      ...providerCardSelect,
      qualifications: true,
      registrationCouncil: true,
      registrationNumber: true,
      yearsInPractice: true,
      sizeLabel: true,
      bedCount: true,
      addressLine: true,
      sector: true,
      servesLocalities: true,
      followUpTerms: true,
      hoursSource: true,
      hoursCheckedAt: true,
      practiceLabel: true,
      accessibility: true,
      emergency: true,
      tests: true,
      visitingInfo: true,
      publicPhone: true,
      claimed: true,
      status: true,
      reviewStats: true,
      nextCheckAt: true,
      ...profileInclude,
    },
  });
  if (!p || p.status !== "published") return null;
  const card = toProviderCard(p, now);
  const hours = asOpeningHours(p.openingHours);
  const [hoursReports, changes] = await Promise.all([
    db.report.count({ where: { type: "fact", targetKind: "provider", targetId: p.id, field: "timings", status: { in: ["received", "checking"] } } }),
    db.listingChange.findMany({ where: { providerId: p.id }, orderBy: { changedAt: "desc" }, take: 5 }),
  ]);
  return {
    ...card,
    specialty: p.specialty,
    qualifications: p.qualifications,
    registration: p.registrationCouncil || p.registrationNumber ? { council: p.registrationCouncil, number: p.registrationNumber } : null,
    yearsInPractice: p.yearsInPractice,
    gender: p.gender,
    sizeLabel: p.sizeLabel,
    bedCount: p.bedCount,
    addressLine: p.addressLine,
    sector: p.sector,
    servesLocalities: asStringArray(p.servesLocalities).map((s) => ({ slug: s, name: getLocality(s)?.name ?? s })),
    followUpTerms: p.followUpTerms,
    hours: {
      days: hours ? hours.map((d) => ({ day: d.day, label: WEEKDAYS[d.day], text: d.text })) : null,
      open24h: p.open24h,
      summary: p.hoursSummary,
      source: p.hoursSource,
      checkedAt: iso(p.hoursCheckedAt),
      practiceLabel: p.practiceLabel,
      underRecheck: hoursReports > 0,
    },
    recentChanges: changes.map((c) => ({ field: c.field, summary: c.summary, source: c.source, changedAt: c.changedAt.toISOString() })),
    accessibility: asArray<AccessibilityItem>(p.accessibility),
    services: asStringArray(p.services),
    departments: asArray<Department>(p.departments),
    emergency: asObject<EmergencyInfo>(p.emergency),
    homeCollection: asObject<HomeCollection>(p.homeCollection),
    delivery: p.delivery,
    tests: asArray<LabTest>(p.tests),
    visiting: asObject<VisitingInfo>(p.visitingInfo),
    hasPublicPhone: !!p.publicPhone,
    badges: asStringArray(p.badges),
    claimed: p.claimed,
    nextCheckAt: iso(p.nextCheckAt),
    verification: {
      facts: p.verifications
        .filter((v) => v.showAsFact)
        .map((v) => ({ field: v.field, label: v.label, value: v.value, note: v.note, result: v.result, checkedAt: iso(v.checkedAt) })),
      log: p.verifications
        .filter((v) => v.showInLog)
        .map((v) => ({ field: v.field, what: v.label, how: v.method, result: v.result, checkedAt: iso(v.checkedAt) })),
    },
    practicesAt: p.practicesAt
      .filter((a) => a.facility.status === "published")
      .map((a) => ({ ...toProviderLink(a.facility), days: a.days, department: a.department, verified: a.verified })),
    doctorsHere: p.doctorsHere
      .filter((a) => a.doctor.status === "published")
      .map((a) => ({ ...toProviderLink(a.doctor), headline: a.doctor.headline, days: a.days, department: a.department })),
    reviewStats: asObject<ReviewStats>(p.reviewStats),
    topLists: p.topListEntries
      .filter((e) => e.list.published)
      .map((e) => {
        const ordered = [...e.list.entries].sort((a, b) => b.score - a.score);
        return { slug: e.list.slug, title: e.list.title, rank: ordered.findIndex((x) => x.id === e.id) + 1, of: ordered.length, score: e.score, reviewCount: e.reviewCount };
      }),
    questions: p.questions.map((q) => ({ question: q.question, answer: q.answer, answeredAt: iso(q.answeredAt) })),
  };
}

/** For /gurgaon/<profileKind>/<slug>: the profile only if its kind belongs on that URL segment
 * (a hospital isn't served at /gurgaon/doctor/…). Pages call notFound() on null. */
export async function getProviderForRoute(profileKind: ProfileKind, slug: string): Promise<ProviderProfile | null> {
  const profile = await getProviderProfile(slug);
  return profile && KINDS_FOR_PROFILE[profileKind].includes(profile.kind) ? profile : null;
}

/** Slugs for generateStaticParams on profile routes. */
export async function listProviderSlugs(profileKind?: ProfileKind): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.providers);
  const rows = await db.provider.findMany({
    where: { status: "published", ...(profileKind ? { kind: { in: KINDS_FOR_PROFILE[profileKind] } } : {}) },
    select: { slug: true },
    orderBy: { slug: "asc" },
  });
  return rows.map((r) => r.slug);
}

/** The clinic phone, revealed on click. Not cached and never part of page HTML: call it from a
 * Server Action ("Show clinic phone"). */
export async function getPublicPhone(slug: string): Promise<string | null> {
  const p = await db.provider.findUnique({ where: { slug }, select: { publicPhone: true, status: true } });
  return p && p.status === "published" ? p.publicPhone : null;
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export type ReviewDTO = {
  ref: string;
  authorLabel: string;
  visitMonth: string;
  visitType: string | null;
  department: string | null;
  answers: Record<string, string>;
  text: string;
  verificationTags: string[];
  helpfulCount: number;
  providerReply: string | null;
  providerReplyAt: string | null;
  publishedAt: string | null;
  sample: boolean;
};

export type ProviderReviews = {
  provider: ProviderLink;
  /** Snapshot stats (totals, mentions, department scores). */
  stats: ReviewStats | null;
  /** Published reviews in the database. */
  publishedCount: number;
  departments: { name: string; count: number; score: number | null }[];
  reviews: ReviewDTO[];
};

/** Published reviews (newest first), optionally for one hospital department. */
export async function getProviderReviews(slug: string, opts: { department?: string | null } = {}): Promise<ProviderReviews | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.reviews(slug), tags.provider(slug));
  const p = await db.provider.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      kind: true,
      status: true,
      reviewStats: true,
      reviews: { where: { status: "published" }, orderBy: { publishedAt: "desc" } },
    },
  });
  if (!p || p.status !== "published") return null;
  const stats = asObject<ReviewStats>(p.reviewStats);
  const counted = new Map<string, number>();
  for (const r of p.reviews) if (r.department) counted.set(r.department, (counted.get(r.department) ?? 0) + 1);
  const departments = stats?.departments?.length
    ? stats.departments.map((d) => ({ name: d.name, count: d.count, score: d.score }))
    : [...counted.entries()].map(([name, count]) => ({ name, count, score: null }));
  const dept = opts.department && opts.department !== "All departments" ? opts.department : null;
  return {
    provider: toProviderLink(p),
    stats,
    publishedCount: p.reviews.length,
    departments,
    reviews: p.reviews
      .filter((r) => !dept || r.department === dept)
      .map((r) => ({
        ref: r.ref,
        authorLabel: r.authorLabel,
        visitMonth: r.visitMonth,
        visitType: r.visitType,
        department: r.department,
        answers: (asObject<Record<string, string>>(r.answers) ?? {}) as Record<string, string>,
        text: r.text,
        verificationTags: asStringArray(r.verificationTags),
        helpfulCount: r.helpfulCount,
        providerReply: r.providerReply,
        providerReplyAt: iso(r.providerReplyAt),
        publishedAt: iso(r.publishedAt),
        sample: r.sample,
      })),
  };
}

/** Discussions about a provider (hospital profile → Discussions; Reviews & discussions page). */
export async function getProviderDiscussions(slug: string, limit = 10): Promise<ThreadCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.threads, tags.provider(slug));
  const rows = await db.thread.findMany({
    where: { provider: { slug }, status: { in: ["open", "resolved"] } },
    select: threadCardSelect,
    orderBy: { lastActivityAt: "desc" },
    take: limit,
  });
  return rows.map(toThreadCard);
}

// ── Specialties ─────────────────────────────────────────────────────────────

export type SpecialtySummary = { slug: string; name: string; nameHi: string | null; doctorNoun: string; doctorNounPlural: string; doctorCount: number };

export async function getSpecialties(): Promise<SpecialtySummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.specialties, tags.providers);
  const rows = await db.specialty.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { providers: { where: { status: "published", kind: "doctor" } } } } },
  });
  return rows.map((s) => ({ slug: s.slug, name: s.name, nameHi: s.nameHi, doctorNoun: s.doctorNoun, doctorNounPlural: s.doctorNounPlural, doctorCount: s._count.providers }));
}

export type SpecialtyPage = {
  specialty: SpecialtySummary & {
    summary: string | null;
    whenToSee: string | null;
    emergencyNote: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
  };
  /** Verified doctors with this specialty, most recently checked first. */
  doctors: ProviderCard[];
  /** "Coverage by locality": verified doctors per locality (all localities, including zeros). */
  coverage: { slug: string; name: string; count: number; live: boolean }[];
  faqs: Faq[];
  relatedGuides: { slug: string; title: string }[];
};

/** /gurgaon/doctors/<specialty>. Null for an unknown specialty. */
export async function getSpecialtyPage(slug: string): Promise<SpecialtyPage | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.specialties, tags.providers, tags.guides);
  const now = new Date();
  const s = await db.specialty.findUnique({ where: { slug } });
  if (!s) return null;
  const doctors = await db.provider.findMany({
    where: { status: "published", kind: "doctor", specialtySlug: slug },
    select: providerCardSelect,
    orderBy: [{ lastCheckedAt: "desc" }, { name: "asc" }],
  });
  const guideSlugs = asStringArray(s.relatedGuideSlugs);
  const guides = guideSlugs.length ? await db.guide.findMany({ where: { slug: { in: guideSlugs }, status: "published" }, select: { slug: true, title: true } }) : [];
  return {
    specialty: {
      slug: s.slug,
      name: s.name,
      nameHi: s.nameHi,
      doctorNoun: s.doctorNoun,
      doctorNounPlural: s.doctorNounPlural,
      doctorCount: doctors.length,
      summary: s.summary,
      whenToSee: s.whenToSee,
      emergencyNote: s.emergencyNote,
      reviewedBy: s.reviewedBy,
      reviewedAt: iso(s.reviewedAt),
    },
    doctors: doctors.map((d) => toProviderCard(d, now)),
    coverage: LOCALITIES.map((L) => ({ slug: L.slug, name: L.name, live: L.live, count: doctors.filter((d) => d.localitySlug === L.slug).length })),
    faqs: asArray<Faq>(s.faqs),
    relatedGuides: guideSlugs.map((g) => guides.find((x) => x.slug === g)).filter((g): g is { slug: string; title: string } => !!g),
  };
}

export async function listSpecialtySlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.specialties);
  return (await db.specialty.findMany({ select: { slug: true }, orderBy: { sortOrder: "asc" } })).map((s) => s.slug);
}

// ── Emergency directory ─────────────────────────────────────────────────────

export type EmergencyDirectory = {
  departments: (EmergencyDepartment & { profileKind: ProfileKind; ownershipLabel: string })[];
  bloodBanks: { slug: string; name: string; areaLabel: string | null; ownership: string; ownershipLabel: string; hours: string | null; source: string | null; checkedAt: string | null; badges: string[]; hasPublicPhone: boolean }[];
  /** Chemists verified open 24 hours ("See open chemists"). */
  chemists24h: ProviderCard[];
};

/** /gurgaon/emergency. Order departments with orderEmergencyDepartments() from src/lib/emergency.ts. */
export async function getEmergencyDirectory(): Promise<EmergencyDirectory> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.providers);
  const now = new Date();
  const [hospitals, banks, chemists] = await Promise.all([
    // Json null filters differ between SQLite and PostgreSQL, so filter emergency info in JS.
    db.provider.findMany({ where: { status: "published", kind: { in: ["hospital", "emergency_dept", "clinic"] } }, select: { slug: true, name: true, kind: true, ownership: true, emergency: true } }),
    db.provider.findMany({ where: { status: "published", kind: "blood_bank" }, orderBy: { name: "asc" } }),
    db.provider.findMany({ where: { status: "published", kind: "pharmacy", open24h: true }, select: providerCardSelect }),
  ]);
  const departments = hospitals
    .map((h) => ({ h, e: asObject<EmergencyInfo>(h.emergency) }))
    .filter((x): x is { h: (typeof hospitals)[number]; e: EmergencyInfo } => !!x.e && x.e.listed && x.e.available24x7)
    .map(({ h, e }) => ({
      slug: h.slug,
      name: h.name,
      profileKind: PROFILE_KIND_OF[h.kind],
      ownership: h.ownership,
      ownershipLabel: OWNERSHIP_LABELS[h.ownership],
      areaLabel: e.areaLabel,
      children: e.children,
      source: e.source,
      checkedAt: e.checkedAt,
      kmFrom: e.kmFrom,
    }));
  return {
    departments,
    bloodBanks: banks.map((b) => ({
      slug: b.slug,
      name: b.name,
      areaLabel: b.areaLabel,
      ownership: b.ownership,
      ownershipLabel: OWNERSHIP_LABELS[b.ownership],
      hours: b.hoursSummary,
      source: b.hoursSource,
      checkedAt: iso(b.hoursCheckedAt ?? b.lastCheckedAt),
      badges: asStringArray(b.badges),
      hasPublicPhone: !!b.publicPhone,
    })),
    chemists24h: chemists.map((c) => toProviderCard(c, now)).sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99)),
  };
}

// ── Hospitals & care centres directory ──────────────────────────────────────

export type FacilityDirectory = {
  ownership: { key: string; label: string; description: string; count: number }[];
  types: { slug: string; name: string; description: string | null; count: number }[];
  facilities: { provider: ProviderLink; ownership: string; ownershipLabel: string; type: { slug: string; name: string }; place: string; facts: string[]; checkedAt: string | null }[];
};

/** /gurgaon/facilities: every facility labelled by ownership and type. Filter on the page. */
export async function getFacilityDirectory(): Promise<FacilityDirectory> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.providers, tags.facilityTypes);
  const [types, rows] = await Promise.all([
    db.facilityType.findMany({ where: { inDirectory: true }, orderBy: { sortOrder: "asc" } }),
    db.provider.findMany({
      where: { status: "published", facilityType: { inDirectory: true } },
      select: { slug: true, name: true, kind: true, ownership: true, areaLabel: true, sector: true, tags: true, lastCheckedAt: true, facilityType: { select: { slug: true, name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const facilities = rows.map((r) => ({
    provider: toProviderLink(r),
    ownership: r.ownership,
    ownershipLabel: OWNERSHIP_LABELS[r.ownership],
    type: r.facilityType!,
    place: `${r.sector ?? r.areaLabel ?? ""}, Gurugram`.replace(/^, /, ""),
    facts: asStringArray(r.tags).slice(0, 3),
    checkedAt: iso(r.lastCheckedAt),
  }));
  return {
    ownership: OWNERSHIPS.map((o) => ({ key: o, label: OWNERSHIP_LABELS[o], description: OWNERSHIP_DESCRIPTIONS[o], count: facilities.filter((f) => f.ownership === o).length })),
    types: types.map((t) => ({ slug: t.slug, name: t.name, description: t.description, count: facilities.filter((f) => f.type.slug === t.slug).length })),
    facilities,
  };
}

// ── Featured and recently verified ──────────────────────────────────────────

export type FeaturedProviderCard = {
  provider: ProviderLink;
  ownership: string;
  ownershipLabel: string;
  facilityType: string | null;
  metaLine: string;
  highlights: string[];
  photoLabel: string | null;
  emergency24x7: boolean;
  sponsored: boolean;
  sponsorLabel: string | null;
  checkedAt: string | null;
};

/** "Hospitals serving <locality>" (homepage) or "Featured hospitals serving <locality>"
 * (locality page). Chosen by editors, never ranked. Add neighbour counts with getNeighbourCounts(). */
export async function getFeaturedProviders(localitySlug: string, placement: "homepage" | "locality"): Promise<FeaturedProviderCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.featured, tags.providers, tags.locality(localitySlug));
  const rows = await db.featuredProvider.findMany({
    where: { localitySlug, placement, provider: { status: "published" } },
    orderBy: { sortOrder: "asc" },
    include: {
      provider: {
        select: { slug: true, name: true, kind: true, ownership: true, emergency: true, sponsored: true, sponsorLabel: true, lastCheckedAt: true, facilityType: { select: { name: true } } },
      },
    },
  });
  return rows.map((r) => ({
    provider: toProviderLink(r.provider),
    ownership: r.provider.ownership,
    ownershipLabel: OWNERSHIP_LABELS[r.provider.ownership],
    facilityType: r.provider.facilityType?.name ?? null,
    metaLine: r.metaLine,
    highlights: asStringArray(r.highlights),
    photoLabel: r.photoLabel,
    emergency24x7: !!asObject<EmergencyInfo>(r.provider.emergency)?.available24x7,
    sponsored: r.provider.sponsored,
    sponsorLabel: r.provider.sponsorLabel,
    checkedAt: iso(r.provider.lastCheckedAt),
  }));
}

/** "Recently verified near <locality>": doctors, clinics, labs, chemists and home care in the
 * locality, most recently checked first ("not by who pays"). */
export async function getRecentlyVerified(localitySlug: string, limit = 4): Promise<ProviderCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.providers);
  const now = new Date();
  const rows = await db.provider.findMany({
    where: { status: "published", localitySlug, kind: { in: ["doctor", "clinic", "lab", "pharmacy", "home_care"] }, lastCheckedAt: { not: null } },
    select: providerCardSelect,
    orderBy: [{ lastCheckedAt: "desc" }, { name: "asc" }],
    take: limit,
  });
  return rows.map((r) => toProviderCard(r, now));
}

/** Providers matching a name, for the claim flow's "Find your listing". Matching is done in JS
 * (case-insensitive `contains` isn't portable between SQLite and PostgreSQL). */
export async function findClaimCandidates(query: string, limit = 5): Promise<(ProviderLink & { headline: string; place: string | null; claimed: boolean })[]> {
  const q = normalize(query);
  if (q.length < 2) return [];
  const rows = await listClaimableProviders();
  return rows.filter((r) => normalize(r.name).includes(q)).slice(0, limit);
}

async function listClaimableProviders() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.providers);
  const rows = await db.provider.findMany({
    where: { status: "published", kind: { in: ["doctor", "clinic", "hospital", "lab", "pharmacy", "home_care"] } },
    select: { slug: true, name: true, kind: true, headline: true, areaLabel: true, claimed: true },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({ ...toProviderLink(r), headline: r.headline, place: r.areaLabel, claimed: r.claimed }));
}

/** Days since a provider was last checked, for "CHECKED 4 DAYS AGO" when only the date is at hand. */
export function checkedDaysAgo(lastCheckedAt: string | null, now: Date): number | null {
  return daysAgo(lastCheckedAt ? new Date(lastCheckedAt) : null, now);
}

/** Top-list method parts with weights (for the patient-experience block on profiles). */
export const PATIENT_EXPERIENCE_PARTS = TOP_LIST_METHOD.map((m) => ({ label: m.label, weightPct: Math.round(m.weight * 100) }));

/** Sub-scores of a top-list entry as labelled parts. */
export function labelledSubScores(sub: unknown): { label: string; value: number; weightPct: number }[] {
  const values = asSubScores(sub);
  return TOP_LIST_METHOD.map((m, i) => ({ label: m.label, value: values[i], weightPct: Math.round(m.weight * 100) }));
}

// ── Request-time opening status (Find care) ─────────────────────────────────

async function getProviderHoursRaw(slug: string): Promise<{ hours: ReturnType<typeof asOpeningHours>; open24h: boolean } | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.provider(slug), tags.providers);
  const p = await db.provider.findUnique({ where: { slug }, select: { openingHours: true, open24h: true, status: true } });
  return p && p.status === "published" ? { hours: asOpeningHours(p.openingHours), open24h: p.open24h } : null;
}

export type LiveHours = {
  /** Today in India time, 0 = Monday … 6 = Sunday (highlights today's row). */
  today: number;
  /** Open now / closes at / opens at, from verified hours only. */
  status: OpenStatusParts;
};

/** "Open now · Closes 8 pm today" and today's weekday for a profile. Request-time: render it
 * under <Suspense>. Null for an unknown provider. */
export async function getLiveHours(slug: string): Promise<LiveHours | null> {
  await connection();
  const raw = await getProviderHoursRaw(slug);
  if (!raw) return null;
  const now = new Date();
  return { today: istWeekday(now), status: openStatusParts(raw.hours, raw.open24h, now) };
}
