// The Gurgaon Health Report (news), guides, the corrections log and published dispute outcomes.
// Server-only, cached.

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { ArticleLabel, CorrectionKind, DisputeStatus } from "@prisma/client";

import { tags } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import type { DisputeItem } from "@/app/actions/dispute-schemas";
import { DISPUTE_OUTCOME_LABELS, visitMonthOptions, type ProfileKind } from "@/lib/domain";
import { asArray, asObject, asStringArray, type GuideSection, type LocalNote } from "@/lib/json-types";

import { articleCardSelect, iso, toArticleCard, type ArticleCard } from "./mappers";
import { getNeighbourSummary } from "./neighbours";
import { getProviderForRoute } from "./providers";
import { getTopList } from "./top-lists";

export type { ArticleCard };

// ── News ────────────────────────────────────────────────────────────────────

/** Newest first. `label` filters (Reporting / Roundup / Opinion / Sponsored). */
export async function getArticles(opts: { label?: ArticleLabel | null; limit?: number; includeSponsored?: boolean } = {}): Promise<ArticleCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.articles);
  const rows = await db.article.findMany({
    where: {
      status: "published",
      ...(opts.label ? { label: opts.label } : opts.includeSponsored === false ? { label: { not: "sponsored" } } : {}),
    },
    select: articleCardSelect,
    orderBy: { publishedAt: "desc" },
    take: opts.limit ?? 50,
  });
  return rows.map(toArticleCard);
}

export type ArticleDetail = ArticleCard & {
  body: string[];
  authorName: string | null;
  corrections: { on: string; text: string }[];
};

export async function getArticle(slug: string): Promise<ArticleDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.article(slug), tags.articles, tags.corrections);
  const a = await db.article.findUnique({
    where: { slug },
    select: { ...articleCardSelect, status: true, body: true, authorName: true, corrections: { orderBy: { happenedAt: "desc" } } },
  });
  if (!a || a.status !== "published") return null;
  return {
    ...toArticleCard(a),
    body: asStringArray(a.body),
    authorName: a.authorName,
    corrections: a.corrections.map((c) => ({ on: c.happenedAt.toISOString(), text: c.text })),
  };
}

/** "LOCAL HEALTH NEWS · UPDATED 16 OCT 2026": the newest article's date. */
export async function getNewsUpdatedAt(): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.articles);
  const a = await db.article.findFirst({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, select: { publishedAt: true } });
  return iso(a?.publishedAt);
}

export async function listArticleSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.articles);
  return (await db.article.findMany({ where: { status: "published" }, select: { slug: true } })).map((a) => a.slug);
}

// ── Corrections and disputes ────────────────────────────────────────────────

export const CORRECTION_LABELS: Record<CorrectionKind, string> = { corrected: "CORRECTED", verified: "VERIFIED", merged: "MERGED", updated: "UPDATED" };

export type CorrectionRow = { on: string; text: string; kind: CorrectionKind; label: string };

/** The public corrections log (Trust centre; "Full corrections log"). */
export async function getCorrections(limit = 50): Promise<CorrectionRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.corrections);
  const rows = await db.correction.findMany({ orderBy: { happenedAt: "desc" }, take: limit });
  return rows.map((c) => ({ on: c.happenedAt.toISOString(), text: c.text, kind: c.kind, label: CORRECTION_LABELS[c.kind] }));
}

export type DisputeOutcome = {
  ref: string;
  publishedAt: string;
  status: DisputeStatus;
  /** "UPHELD" | "PARTLY UPHELD" | "NOT UPHELD" */
  outcome: string;
  item: string;
  why: string;
  /** Neighbour mentions (Phase 2B) rather than a top-list ranking. */
  aboutMentions: boolean;
};

/** "Recent dispute outcomes": every decided dispute, with its reason, never who raised it. */
export async function getDisputeOutcomes(limit = 20): Promise<DisputeOutcome[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.disputes);
  const rows = await db.dispute.findMany({
    where: { outcomePublishedAt: { not: null }, outcomeText: { not: null }, status: { in: ["upheld", "partly_upheld", "not_upheld"] } },
    orderBy: { outcomePublishedAt: "desc" },
    take: limit,
    select: { ref: true, outcomePublishedAt: true, status: true, itemLabel: true, outcomeText: true, target: true },
  });
  return rows.map((d) => ({
    ref: d.ref,
    publishedAt: d.outcomePublishedAt!.toISOString(),
    status: d.status,
    outcome: DISPUTE_OUTCOME_LABELS[d.status] ?? d.status.toUpperCase(),
    item: d.itemLabel,
    why: d.outcomeText!,
    aboutMentions: d.target === "mention",
  }));
}

// ── Guides ──────────────────────────────────────────────────────────────────

export type GuideCard = {
  slug: string;
  title: string;
  category: string;
  /** "GUIDE · NON-EMERGENCY CARE" */
  tag: string;
  /** "Reviewed by a general physician" */
  reviewNote: string | null;
  updatedAt: string;
  /** False while the guide's text is still being written (only its card exists). */
  hasContent: boolean;
};

const guideCardSelect = { slug: true, title: true, category: true, tag: true, reviewNote: true, contentUpdatedAt: true, sections: true } as const;

function toGuideCard(g: { slug: string; title: string; category: string; tag: string; reviewNote: string | null; contentUpdatedAt: Date; sections: unknown }): GuideCard {
  return {
    slug: g.slug,
    title: g.title,
    category: g.category,
    tag: g.tag,
    reviewNote: g.reviewNote,
    updatedAt: g.contentUpdatedAt.toISOString(),
    hasContent: asArray<GuideSection>(g.sections).length > 0,
  };
}

export async function getGuides(opts: { limit?: number } = {}): Promise<GuideCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.guides);
  const rows = await db.guide.findMany({ where: { status: "published" }, select: guideCardSelect, orderBy: [{ sortOrder: "asc" }, { contentUpdatedAt: "desc" }], take: opts.limit ?? 100 });
  return rows.map(toGuideCard);
}

export type GuideDetail = GuideCard & {
  summary: string | null;
  /** "Dr. P. Sharma, MD (General Medicine)": "Medically reviewed by …" */
  reviewedBy: string | null;
  writtenBy: string | null;
  nextReviewAt: string | null;
  sections: GuideSection[];
  emergencyNote: string | null;
  localNote: LocalNote | null;
  disclaimer: string | null;
  relatedSpecialties: { slug: string; name: string; doctorNounPlural: string }[];
  relatedGuides: GuideCard[];
};

export async function getGuide(slug: string): Promise<GuideDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.guide(slug), tags.guides);
  const g = await db.guide.findUnique({ where: { slug } });
  if (!g || g.status !== "published") return null;
  const specialtySlugs = asStringArray(g.relatedSpecialtySlugs);
  const guideSlugs = asStringArray(g.relatedGuideSlugs);
  const [specialties, related] = await Promise.all([
    specialtySlugs.length ? db.specialty.findMany({ where: { slug: { in: specialtySlugs } }, select: { slug: true, name: true, doctorNounPlural: true } }) : [],
    guideSlugs.length ? db.guide.findMany({ where: { slug: { in: guideSlugs }, status: "published" }, select: guideCardSelect }) : [],
  ]);
  return {
    ...toGuideCard(g),
    summary: g.summary,
    reviewedBy: g.reviewedBy,
    writtenBy: g.writtenBy,
    nextReviewAt: iso(g.nextReviewAt),
    sections: asArray<GuideSection>(g.sections),
    emergencyNote: g.emergencyNote,
    localNote: asObject<LocalNote>(g.localNote),
    disclaimer: g.disclaimer,
    relatedSpecialties: specialties,
    relatedGuides: related.map(toGuideCard),
  };
}

export async function listGuideSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.guides);
  return (await db.guide.findMany({ where: { status: "published" }, select: { slug: true } })).map((g) => g.slug);
}

// ── Contribution forms ──────────────────────────────────────────────────────

/** "When did you visit?": this month, the two before it and "Earlier in <year>" (India time).
 * Cached for an hour, so pages never read the clock while rendering. */
export async function getVisitMonthOptions(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  return visitMonthOptions(new Date());
}

/** What a provider can be disputed on (/dispute/[kind]/[slug], step 2): its top-list positions
 * (or one "not in a top list" item) and its neighbour mentions. Null for an unknown provider. */
export async function getDisputeItems(profileKind: ProfileKind, slug: string): Promise<{ ranking: DisputeItem[]; mention: DisputeItem[] } | null> {
  const profile = await getProviderForRoute(profileKind, slug);
  if (!profile) return null;
  const [lists, neighbours] = await Promise.all([Promise.all(profile.topLists.map((l) => getTopList(l.slug))), getNeighbourSummary(slug)]);
  const ranking: DisputeItem[] = [];
  profile.topLists.forEach((l, i) => {
    const list = lists[i];
    const entry = list?.entries.find((e) => e.provider?.slug === slug);
    if (!list || !entry) return;
    ranking.push({
      id: entry.id,
      kind: "ranking",
      listSlug: list.slug,
      listTitle: list.title,
      rank: entry.rank,
      of: list.entries.length,
      score: entry.score,
      reviewCount: entry.reviewCount,
      listUpdatedAt: list.updatedAt,
      mentionStatus: null,
      recommendedBy: null,
      themes: [],
    });
  });
  if (!ranking.length) {
    ranking.push({ id: slug, kind: "ranking", listSlug: null, listTitle: null, rank: null, of: null, score: null, reviewCount: null, listUpdatedAt: null, mentionStatus: null, recommendedBy: null, themes: [] });
  }
  const mention: DisputeItem[] = [
    {
      id: slug,
      kind: "mention",
      listSlug: null,
      listTitle: null,
      rank: neighbours?.rank?.position ?? null,
      of: neighbours?.rank?.of ?? null,
      score: neighbours?.score ?? null,
      reviewCount: null,
      listUpdatedAt: null,
      mentionStatus: neighbours?.status ?? "not_enough",
      recommendedBy: neighbours?.recommendedBy ?? 0,
      themes: neighbours?.themes.slice(0, 3) ?? [],
    },
  ];
  return { ranking, mention };
}
