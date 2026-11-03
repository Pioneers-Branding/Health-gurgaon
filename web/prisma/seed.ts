// Loads the prototype's sample data. Idempotent: wipes every table, then reloads.
//
//   npm run db:seed        (or `npm run setup` for generate + push + seed)
//
// Refuses to run when NODE_ENV=production unless SEED_ALLOW_PRODUCTION=1, because it deletes
// everything first. Every row it creates has sample = true where the model has that column.

import { existsSync } from "node:fs";
import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

import { consentWording, CONSENT_VERSION } from "../src/lib/consent-text";
import { LOCALITIES } from "../src/lib/localities";
import { CONSENT_LINES, CONSENT_STATE_EXTRAS, FOLLOWS, FULL_RECORD_USERS, SAVED } from "./seed-data/account";
import { FLAGS, SOCIETIES, THREADS, VOLUNTEER_ROLES } from "./seed-data/community";
import { ARTICLES, CORRECTIONS, GUIDES } from "./seed-data/content";
import { EVENTS } from "./seed-data/events";
import { LOCALITY_EXTRAS } from "./seed-data/localities";
import { MENTION_SPECS } from "./seed-data/neighbours";
import { AFFILIATIONS, FEATURED, PROVIDER_QUESTIONS, PROVIDERS } from "./seed-data/providers";
import { REVIEWS } from "./seed-data/reviews";
import { FACILITY_TYPES, SPECIALTIES } from "./seed-data/specialties";
import { REFERENCE, d, optionalDate } from "./seed-data/time";
import { STORIES, TOP_LISTS, TOP_LISTS_UPDATED } from "./seed-data/top-lists";
import { AUDIT, CLAIMS, DISPUTES, LISTING_CHANGES, REPORTS } from "./seed-data/trust";
import type { SeedConsentLine, SeedMentionSpec, SeedTimelineEntry } from "./seed-data/types";
import { USERS } from "./seed-data/users";

const envFile = path.join(process.cwd(), ".env");
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);

if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "1") {
  console.error("Refusing to seed: NODE_ENV=production. The seed deletes all data first. Set SEED_ALLOW_PRODUCTION=1 to override.");
  process.exit(1);
}

const db = new PrismaClient();

const J = (value: unknown) => value as Prisma.InputJsonValue;

/** Seed timelines use IST wall-clock strings; the database stores ISO instants. */
const timeline = (entries: SeedTimelineEntry[]) => J(entries.map((t) => ({ status: t.status, at: d(t.at).toISOString(), ...(t.note ? { note: t.note } : {}) })));

/** When sample accounts first signed in, unless users.ts says otherwise. */
const DEFAULT_FIRST_SIGN_IN = "2026-09-01 10:00";

/** Next ref numbers continue after the highest sample ref ("HG-RV-8831" is the next review). */
const SEQUENCES: Record<string, number> = {
  review: 8830,
  report: 3107,
  concern: 112,
  event: 5190,
  dispute: 419,
  claim: 311,
  volunteer: 412,
  story: 221,
  flag: 1904,
  society: 100,
  locality: 2206,
};

function initialsOf(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, "")
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w));
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "HG";
}

function need<T>(map: Map<string, T>, key: string | undefined | null, what: string): T {
  if (!key) throw new Error(`Missing ${what} reference`);
  const v = map.get(key);
  if (v === undefined) throw new Error(`Unknown ${what}: ${key}`);
  return v;
}

function maybe<T>(map: Map<string, T>, key: string | undefined | null, what: string): T | null {
  return key ? need(map, key, what) : null;
}

async function wipe() {
  // Children before parents.
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.sequence.deleteMany(),
    db.stopListEntry.deleteMany(),
    db.emailChallenge.deleteMany(),
    db.consentState.deleteMany(),
    db.consent.deleteMany(),
    db.follow.deleteMany(),
    db.savedItem.deleteMany(),
    db.session.deleteMany(),
    db.otpChallenge.deleteMany(),
    db.reviewHelpful.deleteMany(),
    db.postReaction.deleteMany(),
    db.neighbourMention.deleteMany(),
    db.contentFlag.deleteMany(),
    db.post.deleteMany(),
    db.thread.deleteMany(),
    db.review.deleteMany(),
    db.report.deleteMany(),
    db.dispute.deleteMany(),
    db.claim.deleteMany(),
    db.correction.deleteMany(),
    db.article.deleteMany(),
    db.guide.deleteMany(),
    db.initiative.deleteMany(),
    db.volunteerNeed.deleteMany(),
    db.volunteerOffer.deleteMany(),
    db.societyMember.deleteMany(),
    db.event.deleteMany(),
    db.society.deleteMany(),
    db.volunteerApplication.deleteMany(),
    db.volunteerRole.deleteMany(),
    db.topListEntry.deleteMany(),
    db.topList.deleteMany(),
    db.story.deleteMany(),
    db.providerQuestion.deleteMany(),
    db.featuredProvider.deleteMany(),
    db.providerAffiliation.deleteMany(),
    db.verificationRecord.deleteMany(),
    db.listingChange.deleteMany(),
    db.provider.deleteMany(),
    db.user.deleteMany(),
    db.facilityType.deleteMany(),
    db.specialty.deleteMany(),
    db.locality.deleteMany(),
  ]);
}

/** Deterministic spread of dates for generated mentions. */
function mentionDate(index: number, total: number, opts: { older?: boolean; newAccount?: boolean }): Date {
  const day = 86_400_000;
  if (opts.newAccount) return new Date(REFERENCE.getTime() - (3 + (index % 20)) * day);
  if (opts.older) return new Date(REFERENCE.getTime() - (400 + ((index * 37) % 200)) * day);
  const span = 330;
  const offset = 2 + Math.floor(((index + 1) * span) / (total + 1));
  return new Date(REFERENCE.getTime() - offset * day);
}

function buildMentions(spec: SeedMentionSpec, providerId: string): Prisma.NeighbourMentionCreateManyInput[] {
  const rows: Prisma.NeighbourMentionCreateManyInput[] = [];
  const recent = spec.recentPositive;
  const older = spec.olderPositive ?? 0;
  const verified = spec.verifiedVisit ?? 0;
  const newAccounts = spec.newAccounts ?? 0;
  const mild = spec.mild ?? 0;
  const themeEntries = Object.entries(spec.themes ?? {});
  const quotes = spec.quotes ?? [];
  for (let i = 0; i < recent + older; i++) {
    const isOlder = i >= recent;
    const trust = i < verified ? "verified_visit" : i < verified + newAccounts && !isOlder ? "new_account" : "established";
    const themes = themeEntries.filter(([, count], t) => (i + t) % recent < count).map(([label]) => label);
    const quote = !isOlder ? quotes[i] : undefined;
    rows.push({
      providerId,
      residentKey: `sample:${spec.provider}:${i + 1}`,
      localitySlug: spec.locality ?? null,
      specialtySlug: spec.specialty ?? null,
      sentiment: i >= recent - mild && !isOlder ? "mild_positive" : "strong_positive",
      trust,
      mentionedAt: quote ? d(quote.on) : mentionDate(i, recent, { older: isOlder, newAccount: trust === "new_account" }),
      themes: J(themes),
      quote: quote?.text ?? null,
      quoteMeta: quote?.meta ?? null,
      counted: true,
      sample: true,
    });
  }
  const negThemes = Object.entries(spec.negativeThemes ?? {});
  for (let j = 0; j < (spec.negative ?? 0); j++) {
    rows.push({
      providerId,
      residentKey: `sample:${spec.provider}:neg-${j + 1}`,
      localitySlug: spec.locality ?? null,
      specialtySlug: spec.specialty ?? null,
      sentiment: "negative",
      trust: "established",
      mentionedAt: mentionDate(j * 5 + 3, 40, {}),
      themes: J(negThemes.filter(([, count]) => j < count).map(([label]) => label)),
      counted: true,
      sample: true,
    });
  }
  return rows;
}

/** SQLite only: write-ahead logging lets the dev server keep reading while actions write. The
 * setting is stored in the database file; it's a no-op for PostgreSQL URLs. */
async function enableWal() {
  if (!(process.env.DATABASE_URL ?? "").startsWith("file:")) return;
  try {
    await db.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
  } catch (error) {
    console.warn("Could not switch SQLite to WAL mode (is another process holding the database?):", (error as Error).message);
  }
}

async function main() {
  const started = Date.now();
  await enableWal();
  await wipe();

  // ── Taxonomies ────────────────────────────────────────────────────────────
  const extras = new Map(LOCALITY_EXTRAS.map((e) => [e.slug, e]));
  await db.locality.createMany({
    data: LOCALITIES.map((L, i) => {
      const e = need(extras, L.slug, "locality extras");
      return {
        slug: L.slug,
        name: L.name,
        nameHi: L.nameHi,
        covers: L.covers,
        aliases: J(L.aliases),
        sectors: J(L.sectors),
        mapX: L.map.x,
        mapY: L.map.y,
        live: L.live,
        description: e.description ?? null,
        gettingCare: e.gettingCare ?? null,
        editorLabel: e.editorLabel ?? null,
        stats: J(e.stats),
        statsCheckedAt: d(e.statsChecked),
        pageUpdatedAt: optionalDate(e.pageUpdated),
        sortOrder: i,
        sample: true,
      };
    }),
  });
  const localitySlugs = new Map(LOCALITIES.map((L) => [L.slug, L.slug]));

  await db.specialty.createMany({
    data: SPECIALTIES.map((s, i) => ({
      slug: s.slug,
      name: s.name,
      nameHi: s.nameHi,
      doctorNoun: s.doctorNoun,
      doctorNounPlural: s.doctorNounPlural,
      summary: s.summary ?? null,
      whenToSee: s.whenToSee ?? null,
      emergencyNote: s.emergencyNote ?? null,
      synonyms: J(s.synonyms),
      conditions: J(s.conditions),
      relatedSearches: J(s.relatedSearches ?? []),
      faqs: J(s.faqs ?? []),
      relatedGuideSlugs: J(s.relatedGuides ?? []),
      reviewedBy: s.reviewedBy ?? null,
      reviewedAt: optionalDate(s.reviewed),
      sortOrder: i,
      sample: true,
    })),
  });
  const specialtySlugs = new Map(SPECIALTIES.map((s) => [s.slug, s.slug]));

  await db.facilityType.createMany({
    data: FACILITY_TYPES.map((f, i) => ({ slug: f.slug, name: f.name, description: f.description ?? null, inDirectory: f.inDirectory, sortOrder: i })),
  });
  const facilityTypeSlugs = new Map(FACILITY_TYPES.map((f) => [f.slug, f.slug]));

  // ── Users ─────────────────────────────────────────────────────────────────
  const userIds = new Map<string, string>();
  for (const u of USERS) {
    const firstSignIn = d(u.firstSignIn ?? DEFAULT_FIRST_SIGN_IN);
    const row = await db.user.create({
      data: {
        phone: u.phone,
        phoneVerifiedAt: firstSignIn,
        lastSignInAt: firstSignIn,
        role: u.role,
        displayName: u.displayName,
        lang: u.lang ?? "en",
        localitySlug: maybe(localitySlugs, u.locality, "locality"),
        area: u.area ?? null,
        reviewLabel: u.reviewLabel ?? null,
        email: u.email ?? null,
        emailVerifiedAt: optionalDate(u.emailVerified),
        professionalLabel: u.professionalLabel ?? null,
        sample: true,
        createdAt: firstSignIn,
      },
    });
    userIds.set(u.key, row.id);
  }

  // ── Providers ─────────────────────────────────────────────────────────────
  const providerIds = new Map<string, string>();
  for (const p of PROVIDERS) {
    const row = await db.provider.create({
      data: {
        slug: p.slug,
        kind: p.kind,
        name: p.name,
        initials: p.initials ?? initialsOf(p.name),
        headline: p.headline,
        specialtySlug: maybe(specialtySlugs, p.specialty, "specialty"),
        qualifications: p.qualifications ?? null,
        registrationCouncil: p.registration?.council ?? null,
        registrationNumber: p.registration?.number ?? null,
        yearsInPractice: p.years ?? null,
        gender: p.gender ?? null,
        ownership: p.ownership,
        facilityTypeSlug: maybe(facilityTypeSlugs, p.facilityType, "facility type"),
        sizeLabel: p.sizeLabel ?? null,
        bedCount: p.beds ?? null,
        addressLine: p.address ?? null,
        areaLabel: p.area ?? null,
        sector: p.sector ?? null,
        localitySlug: maybe(localitySlugs, p.locality, "locality"),
        servesLocalities: J((p.serves ?? []).map((s) => need(localitySlugs, s, "locality"))),
        distanceKm: p.distanceKm ?? null,
        languages: J(p.languages ?? []),
        consultationFee: p.fee ?? null,
        feeVerified: p.feeVerified ?? false,
        followUpTerms: p.followUp ?? null,
        openingHours: p.hours ? J(p.hours) : undefined,
        open24h: p.open24h ?? false,
        hoursSummary: p.hoursSummary ?? null,
        hoursSource: p.hoursSource ?? null,
        hoursCheckedAt: optionalDate(p.hoursChecked),
        practiceLabel: p.practiceLabel ?? null,
        wheelchairAccess: p.wheelchair ?? null,
        accessibility: J(p.accessibility ?? []),
        services: J(p.services ?? []),
        tags: J(p.tags ?? []),
        keywords: p.keywords ?? "",
        keyFact: p.keyFact ?? null,
        departments: J(p.departments ?? []),
        emergency: p.emergency ? J(p.emergency) : undefined,
        homeVisits: p.homeVisits ?? false,
        homeCollection: p.homeCollection ? J(p.homeCollection) : undefined,
        delivery: p.delivery ?? false,
        tests: J(p.tests ?? []),
        visitingInfo: p.visiting ? J(p.visiting) : undefined,
        publicPhone: p.phone ?? null,
        badges: J(p.badges),
        sponsored: p.sponsored ?? false,
        sponsorLabel: p.sponsorLabel ?? null,
        claimed: p.claimed ?? false,
        status: "published",
        reviewStats: p.reviewStats ? J(p.reviewStats) : undefined,
        lastCheckedAt: optionalDate(p.checked),
        nextCheckAt: optionalDate(p.nextCheck),
        sample: true,
        verifications: {
          create: (p.verifications ?? []).map((v, i) => ({
            field: v.field,
            label: v.label,
            value: v.value ?? null,
            method: v.method ?? null,
            result: v.result,
            note: v.note ?? null,
            showAsFact: v.fact ?? false,
            showInLog: v.log ?? true,
            checkedAt: optionalDate(v.checked),
            sortOrder: i,
          })),
        },
      },
    });
    providerIds.set(p.slug, row.id);
  }

  await db.providerAffiliation.createMany({
    data: AFFILIATIONS.map((a, i) => ({
      doctorId: need(providerIds, a.doctor, "provider"),
      facilityId: need(providerIds, a.facility, "provider"),
      days: a.days ?? null,
      department: a.department ?? null,
      verified: a.verified,
      source: a.source ?? null,
      sortOrder: i,
    })),
  });

  const featuredOrder = new Map<string, number>();
  await db.featuredProvider.createMany({
    data: FEATURED.map((f) => {
      const key = `${f.locality}:${f.placement}`;
      const order = featuredOrder.get(key) ?? 0;
      featuredOrder.set(key, order + 1);
      return {
        localitySlug: need(localitySlugs, f.locality, "locality"),
        providerId: need(providerIds, f.provider, "provider"),
        placement: f.placement,
        sortOrder: order,
        metaLine: f.metaLine,
        highlights: J(f.highlights),
        photoLabel: f.photoLabel ?? null,
      };
    }),
  });

  await db.providerQuestion.createMany({
    data: PROVIDER_QUESTIONS.map((q) => ({
      providerId: need(providerIds, q.provider, "provider"),
      question: q.question,
      answer: q.answer,
      answeredAt: d(q.answered),
      published: true,
      sample: true,
      createdAt: d(q.answered),
    })),
  });

  // ── Reviews ───────────────────────────────────────────────────────────────
  for (const r of REVIEWS) {
    await db.review.create({
      data: {
        ref: r.ref,
        providerId: need(providerIds, r.provider, "provider"),
        authorId: maybe(userIds, r.author, "user"),
        authorLabel: r.authorLabel,
        visitMonth: r.visitMonth,
        visitType: r.visitType ?? null,
        department: r.department ?? null,
        answers: J(r.answers ?? {}),
        text: r.text,
        redactions: J(r.redactions ?? []),
        noConflict: r.noConflict,
        verificationTags: J(r.verificationTags),
        status: r.status,
        autoChecks: J(r.autoChecks ?? []),
        flags: J(r.flags ?? []),
        privateNote: r.privateNote ?? null,
        moderationReason: r.moderationReason ?? null,
        suggestion: r.suggestion ?? null,
        moderatedAt: optionalDate(r.moderated),
        providerReply: r.reply ?? null,
        providerReplyAt: optionalDate(r.replied),
        helpfulCount: r.helpful ?? 0,
        publishedAt: optionalDate(r.published),
        sample: true,
        createdAt: d(r.created),
      },
    });
  }

  // ── Societies, events ─────────────────────────────────────────────────────
  const societyIds = new Map<string, string>();
  for (const s of SOCIETIES) {
    const row = await db.society.create({
      data: {
        slug: s.slug,
        name: s.name,
        shortName: s.shortName,
        badgeText: s.badgeText,
        localitySlug: maybe(localitySlugs, s.locality, "locality"),
        areaLabel: s.area,
        groupType: s.groupType,
        status: "verified",
        verifiedAt: d(s.verified),
        memberSince: d(s.memberSince),
        contactName: s.contactName,
        contactRole: s.contactRole,
        contactChannel: "whatsapp",
        contactPhone: s.contactUser ? USERS.find((u) => u.key === s.contactUser)?.phone ?? null : null,
        localResources: s.localResources,
        profileViews30d: s.profileViews30d,
        registeredById: maybe(userIds, s.contactUser, "user"),
        sample: true,
        members: { create: s.members.map((m) => ({ name: m.name, title: m.title, permission: m.permission, userId: maybe(userIds, m.user, "user") })) },
        initiatives: { create: s.initiatives.map((i) => ({ title: i.title, heldOn: d(i.on), summary: i.summary, sample: true })) },
        volunteerNeeds: { create: s.needs.map((n) => ({ title: n.title, detail: n.detail })) },
        volunteerOffers: { create: s.offers.map((o) => ({ displayName: o.name, detail: o.detail })) },
      },
    });
    societyIds.set(s.slug, row.id);
  }

  const eventIds = new Map<string, string>();
  for (const e of EVENTS) {
    const row = await db.event.create({
      data: {
        slug: e.slug,
        ref: e.ref ?? null,
        title: e.title,
        type: e.type,
        template: e.template ?? null,
        description: e.description ?? null,
        bring: e.bring ?? null,
        organiserName: e.organiserName,
        organiserType: e.organiserType,
        organiserVerified: e.organiserVerified,
        organiserNote: e.organiserNote ?? null,
        societyId: maybe(societyIds, e.society, "society"),
        startsAt: d(e.starts),
        endsAt: optionalDate(e.ends),
        timeLabel: e.timeLabel,
        venue: e.venue ?? null,
        localitySlug: maybe(localitySlugs, e.locality, "locality"),
        isOnline: e.online ?? false,
        eligibility: e.eligibility ?? null,
        audience: J(e.audience ?? []),
        cost: e.cost,
        isFree: e.cost === "Free",
        registration: e.registration ?? null,
        capacity: e.capacity ?? null,
        services: J(e.services ?? []),
        status: e.status,
        source: e.source ?? null,
        verifiedAt: optionalDate(e.verified),
        submitterId: maybe(userIds, e.submitter, "user"),
        submittedAt: optionalDate(e.submitted),
        contactName: e.contactName ?? null,
        contactRole: e.contactRole ?? null,
        consents: J([]),
        autoChecks: J(e.autoChecks ?? []),
        flags: J(e.flags ?? []),
        reportSummary: e.reportSummary ?? null,
        requestedChanges: e.requestedChanges ?? null,
        timeline: e.timeline ? timeline(e.timeline) : Prisma.JsonNull,
        sample: true,
        createdAt: optionalDate(e.submitted) ?? optionalDate(e.verified) ?? REFERENCE,
      },
    });
    eventIds.set(e.slug, row.id);
  }

  // ── Content ───────────────────────────────────────────────────────────────
  for (const a of ARTICLES) {
    await db.article.create({
      data: {
        slug: a.slug,
        label: a.label,
        category: a.category,
        title: a.title,
        dek: a.dek,
        body: J([]),
        sourceNote: a.sourceNote,
        sponsorName: a.sponsorName ?? null,
        status: "published",
        publishedAt: d(a.published),
        sample: true,
      },
    });
  }
  await db.listingChange.createMany({
    data: LISTING_CHANGES.map((c) => ({
      providerId: need(providerIds, c.provider, "provider"),
      field: c.field,
      summary: c.summary,
      source: c.source ?? null,
      reportRef: c.reportRef ?? null,
      changedAt: d(c.at),
      sample: true,
      createdAt: d(c.at),
    })),
  });
  await db.correction.createMany({
    data: CORRECTIONS.map((c) => ({
      kind: c.kind,
      text: c.text,
      happenedAt: d(c.on),
      providerId: maybe(providerIds, c.provider, "provider"),
      eventId: maybe(eventIds, c.event, "event"),
      sample: true,
    })),
  });
  await db.guide.createMany({
    data: GUIDES.map((g, i) => ({
      slug: g.slug,
      title: g.title,
      category: g.category,
      tag: g.tag,
      summary: g.summary ?? null,
      reviewedBy: g.reviewedBy ?? null,
      reviewNote: g.reviewNote ?? null,
      writtenBy: g.writtenBy ?? null,
      contentUpdatedAt: d(g.updated),
      nextReviewAt: optionalDate(g.nextReview),
      sections: J(g.sections),
      emergencyNote: g.emergencyNote ?? null,
      localNote: g.localNote ? J(g.localNote) : undefined,
      disclaimer: g.disclaimer ?? null,
      relatedSpecialtySlugs: J((g.relatedSpecialties ?? []).map((s) => need(specialtySlugs, s, "specialty"))),
      relatedGuideSlugs: J(g.relatedGuides ?? []),
      status: "published",
      sortOrder: i,
      sample: true,
    })),
  });

  // ── Community ─────────────────────────────────────────────────────────────
  const postIds = new Map<string, string>();
  for (const t of THREADS) {
    await db.thread.create({
      data: {
        id: t.id,
        title: t.title,
        body: t.body ?? null,
        topicSlug: t.topic,
        localitySlug: maybe(localitySlugs, t.locality, "locality"),
        areaLabel: t.area,
        authorId: maybe(userIds, t.author, "user"),
        authorLabel: `a resident of ${t.area}`,
        anonymous: true,
        status: t.status,
        resolvedAt: t.status === "resolved" ? d(t.lastActivity ?? t.created) : null,
        providerId: maybe(providerIds, t.provider, "provider"),
        replyCount: t.replyCount,
        helpfulCount: t.helpful,
        answeredBy: t.answeredBy ?? null,
        autoChecks: J([]),
        flags: J([]),
        lastActivityAt: d(t.lastActivity ?? t.created),
        sample: true,
        createdAt: d(t.created),
      },
    });
    for (const p of t.posts ?? []) {
      const row = await db.post.create({
        data: {
          threadId: t.id,
          authorId: maybe(userIds, p.author, "user"),
          authorLabel: p.authorLabel,
          professionalLabel: p.professionalLabel ?? null,
          isProviderAnswer: p.isProviderAnswer ?? false,
          body: p.body,
          redactions: J(p.body.includes("[number removed]") ? [{ kind: "phone", count: 1 }] : []),
          helpfulCount: p.helpful,
          isBest: p.best ?? false,
          status: p.status ?? "published",
          autoChecks: J(p.autoChecks ?? []),
          flags: J(p.flags ?? []),
          sample: true,
          createdAt: d(p.created),
        },
      });
      postIds.set(`${t.id}:${p.key}`, row.id);
    }
  }
  for (const f of FLAGS) {
    await db.contentFlag.create({
      data: {
        ref: f.ref,
        targetKind: "post",
        targetId: need(postIds, `${f.thread}:${f.post}`, "post"),
        targetLabel: f.targetLabel,
        excerpt: THREADS.find((t) => t.id === f.thread)?.posts?.find((p) => p.key === f.post)?.body ?? null,
        reason: f.reason,
        autoChecks: J(f.autoChecks),
        flags: J(f.flags),
        privateNote: f.privateNote,
        sample: true,
        createdAt: d(f.created),
      },
    });
  }

  await db.volunteerRole.createMany({
    data: VOLUNTEER_ROLES.map((r, i) => ({
      slug: r.slug,
      title: r.title,
      description: r.description,
      timeCommitment: r.time,
      pay: r.pay,
      payLabel: r.payLabel,
      audience: r.audience,
      access: r.access,
      requiresRegistration: r.requiresRegistration ?? false,
      sortOrder: i,
    })),
  });

  // ── Neighbour mentions ────────────────────────────────────────────────────
  const mentionRows = MENTION_SPECS.flatMap((spec) => buildMentions(spec, need(providerIds, spec.provider, "provider")));
  await db.neighbourMention.createMany({ data: mentionRows });

  // ── Top lists, stories ────────────────────────────────────────────────────
  for (const [i, l] of TOP_LISTS.entries()) {
    await db.topList.create({
      data: {
        slug: l.slug,
        title: l.title,
        h1: l.h1,
        crumb: l.crumb,
        tabLabel: l.tabLabel,
        hubGroup: l.hubGroup,
        bandGroup: l.bandGroup,
        countLabel: l.countLabel,
        intro: l.intro,
        basis: l.basis,
        hubMeta: l.hubMeta,
        badgeLabel: l.badgeLabel,
        sourceListSlug: l.sourceList ?? null,
        presetOwnership: l.presetOwnership ?? null,
        published: true,
        listUpdatedAt: d(TOP_LISTS_UPDATED),
        sortOrder: i,
        sample: true,
        entries: {
          create: l.entries.map((e, j) => ({
            providerId: maybe(providerIds, e.provider, "provider"),
            name: e.name,
            ownership: e.ownership,
            typeLabel: e.typeLabel,
            meta: e.meta,
            quote: e.quote,
            score: e.score,
            reviewCount: e.reviews,
            subScores: J(e.sub),
            localitySlug: maybe(localitySlugs, e.locality, "locality"),
            hasStory: e.hasStory,
            movement: e.movement,
            sortOrder: j,
            sample: true,
          })),
        },
      },
    });
  }
  await db.story.createMany({
    data: STORIES.map((s, i) => ({
      slug: s.slug,
      title: s.title,
      whoLabel: s.who,
      providerId: maybe(providerIds, s.provider, "provider"),
      providerName: s.providerName,
      ownership: s.ownership,
      category: s.category,
      durationLabel: s.duration,
      meta: s.meta,
      transcript: s.transcript,
      format: "video",
      consented: true,
      visitConfirmed: true,
      privacyEdited: true,
      notPaid: true,
      status: "published",
      publishedAt: d(s.published),
      sortOrder: i,
      sample: true,
      createdAt: d(s.published),
    })),
  });

  // ── Reports, disputes, claims, audit ──────────────────────────────────────
  for (const r of REPORTS) {
    await db.report.create({
      data: {
        ref: r.ref,
        type: r.type,
        targetKind: r.targetKind ?? null,
        targetId: r.targetKind === "provider" ? maybe(providerIds, r.target, "provider") : (r.target ?? null),
        targetLabel: r.targetLabel,
        field: r.field ?? null,
        details: r.details,
        firsthand: r.firsthand ?? false,
        isAllegation: r.type === "complaint",
        reporterId: maybe(userIds, r.reporter, "user"),
        status: r.status,
        timeline: timeline(
          r.timeline ?? [{ status: "received", at: r.created }, ...(r.resolved ? [{ status: r.status, at: r.resolved, ...(r.resolution ? { note: r.resolution } : {}) }] : [])],
        ),
        resolution: r.resolution ?? null,
        resolvedAt: optionalDate(r.resolved),
        autoChecks: J(r.autoChecks ?? []),
        flags: J(r.flags ?? []),
        privateNote: r.privateNote ?? null,
        sample: true,
        createdAt: d(r.created),
      },
    });
  }
  for (const x of DISPUTES) {
    await db.dispute.create({
      data: {
        ref: x.ref,
        target: x.target,
        providerId: maybe(providerIds, x.provider, "provider"),
        topListSlug: x.topList ?? null,
        itemLabel: x.itemLabel,
        filerRole: x.filerRole,
        filerId: maybe(userIds, x.filer, "user"),
        reason: x.reason,
        details: x.details,
        links: J([]),
        evidenceFiles: J([]),
        declared: true,
        status: x.status,
        outcomeText: x.outcomeText ?? null,
        outcomePublishedAt: optionalDate(x.outcomePublished),
        sample: true,
        createdAt: d(x.created),
      },
    });
  }
  for (const c of CLAIMS) {
    await db.claim.create({
      data: {
        ref: c.ref,
        providerId: need(providerIds, c.provider, "provider"),
        claimantId: maybe(userIds, c.claimant, "user"),
        claimantRole: c.role,
        registrationNumber: c.registrationNumber ?? null,
        otpVerified: c.otpVerified,
        status: c.status,
        autoChecks: J(c.autoChecks ?? []),
        flags: J([]),
        privateNote: c.privateNote ?? null,
        decisionReason: c.decisionReason ?? null,
        decidedAt: optionalDate(c.decided),
        sample: true,
        createdAt: d(c.created),
      },
    });
  }
  await db.auditLog.createMany({
    data: AUDIT.map((a) => ({
      actorId: maybe(userIds, a.actor, "user"),
      actorLabel: a.actorLabel,
      actorRole: a.actorRole ?? null,
      action: a.action,
      targetKind: a.targetKind ?? null,
      targetLabel: a.targetLabel,
      reason: a.reason ?? null,
      createdAt: d(a.at),
    })),
  });

  // ── Account samples ───────────────────────────────────────────────────────
  await db.savedItem.createMany({
    data: SAVED.map((s) => ({ userId: need(userIds, s.user, "user"), kind: s.kind, targetId: s.target, createdAt: d(s.at) })),
  });
  await db.follow.createMany({
    data: FOLLOWS.map((f) => ({ userId: need(userIds, f.user, "user"), kind: f.kind, targetId: f.target, alert: f.alert ?? "in_app", createdAt: d(f.at), updatedAt: d(f.at) })),
  });

  // The consent record: each account's first sign-in, then the sample resident's full record.
  // The current state per type and channel is the latest granted/withdrawn line.
  const lines: SeedConsentLine[] = [
    ...USERS.filter((u) => !FULL_RECORD_USERS.includes(u.key)).map(
      (u): SeedConsentLine => ({
        user: u.key,
        at: u.firstSignIn ?? DEFAULT_FIRST_SIGN_IN,
        action: "sign_in_only",
        channel: "sms",
        summary: "Gave your mobile number, for sign-in codes only",
        context: "On the sign-in page. The code came by SMS.",
        source: "sign_in",
      }),
    ),
    ...CONSENT_LINES,
  ];
  const states = new Map<string, Prisma.ConsentStateCreateManyInput>();
  for (const c of lines) {
    const userId = need(userIds, c.user, "user");
    const wording = c.wording ?? (c.action === "granted" && c.purpose && c.channel ? consentWording(c.purpose, c.channel, c.subject) : null) ?? c.summary;
    const row = await db.consent.create({
      data: {
        userId,
        purpose: c.purpose ?? null,
        channel: c.channel ?? null,
        action: c.action,
        summary: c.summary,
        context: c.context ?? null,
        source: c.source,
        wording,
        wordingVersion: CONSENT_VERSION,
        createdAt: d(c.at),
      },
    });
    if (c.purpose && c.channel && (c.action === "granted" || c.action === "withdrawn")) {
      const extra = CONSENT_STATE_EXTRAS.find((x) => x.user === c.user && x.purpose === c.purpose && x.channel === c.channel);
      const granted = c.action === "granted";
      states.set(`${userId}|${c.purpose}|${c.channel}`, {
        userId,
        purpose: c.purpose,
        channel: c.channel,
        granted,
        lastConsentId: row.id,
        confirmedAt: granted ? optionalDate(extra?.confirmed) : null,
        lastSentAt: optionalDate(extra?.lastSent),
        updatedAt: d(c.at),
      });
    }
  }
  await db.consentState.createMany({ data: [...states.values()] });

  await db.sequence.createMany({ data: Object.entries(SEQUENCES).map(([prefix, value]) => ({ prefix, value })) });

  const counts = {
    localities: LOCALITIES.length,
    providers: PROVIDERS.length,
    reviews: REVIEWS.length,
    events: EVENTS.length,
    articles: ARTICLES.length,
    guides: GUIDES.length,
    threads: THREADS.length,
    mentions: mentionRows.length,
    topLists: TOP_LISTS.length,
    stories: STORIES.length,
    users: USERS.length,
  };
  console.log(`Seeded in ${((Date.now() - started) / 1000).toFixed(1)}s:`, counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
