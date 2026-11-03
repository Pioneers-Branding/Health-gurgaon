// Neighbour recommendations ("Recommended by N neighbours", locality rankings). Server-only.
// Scores are computed from NeighbourMention rows by src/lib/ranking.ts, once per cache lifetime,
// for every provider; the exported functions read from that one cached result.

import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { tags } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { asStringArray } from "@/lib/json-types";
import { getLocality } from "@/lib/localities";
import { NOT_ENOUGH_LABEL, scoreNeighbourMentions, type MentionInput, type NeighbourScore } from "@/lib/ranking";

import { toProviderLink, type ProviderLink } from "./mappers";

export type NeighbourSummary = {
  provider: ProviderLink;
  status: NeighbourScore["status"];
  /** "Recommended by 24 neighbours", or "Not enough neighbour discussion yet". */
  label: string;
  recommendedBy: number;
  concernedResidents: number;
  score: number;
  themes: { label: string; count: number }[];
  concerns: { label: string; count: number }[];
  quotes: { text: string; meta: string }[];
  /** "#1 ON SOHNA ROAD · PAEDIATRICS" (doctors with a specialty only). */
  rank: { position: number; of: number; localitySlug: string; localityName: string; specialtySlug: string; specialtyName: string } | null;
};

export type NeighbourRankingRow = {
  rank: number | null;
  provider: ProviderLink;
  status: NeighbourScore["status"];
  score: number;
  recommendedBy: number;
  topTheme: string | null;
};

type NeighbourData = {
  summaries: Record<string, NeighbourSummary>;
  /** Key "<locality>|<specialty>" → ranked providers (ranked first, then not enough discussion). */
  rankings: Record<string, NeighbourRankingRow[]>;
  computedAt: string;
};

function recommendedLabel(s: NeighbourScore): string {
  if (s.status === "not_enough") return NOT_ENOUGH_LABEL;
  return `Recommended by ${s.recommendedBy} neighbour${s.recommendedBy === 1 ? "" : "s"}`;
}

async function getNeighbourData(): Promise<NeighbourData> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.mentions, tags.providers);
  const now = new Date();
  const [rows, specialties] = await Promise.all([
    db.neighbourMention.findMany({
      where: { provider: { status: "published" } },
      select: {
        residentKey: true,
        sentiment: true,
        trust: true,
        mentionedAt: true,
        counted: true,
        excludedReason: true,
        themes: true,
        quote: true,
        quoteMeta: true,
        localitySlug: true,
        specialtySlug: true,
        provider: { select: { slug: true, name: true, kind: true } },
      },
      orderBy: { mentionedAt: "desc" },
    }),
    db.specialty.findMany({ select: { slug: true, name: true } }),
  ]);
  const specialtyName = new Map(specialties.map((s) => [s.slug, s.name]));

  const byProvider = new Map<string, typeof rows>();
  const byScope = new Map<string, Map<string, typeof rows>>();
  for (const r of rows) {
    byProvider.set(r.provider.slug, [...(byProvider.get(r.provider.slug) ?? []), r]);
    if (r.localitySlug && r.specialtySlug) {
      const key = `${r.localitySlug}|${r.specialtySlug}`;
      const scope = byScope.get(key) ?? new Map<string, typeof rows>();
      scope.set(r.provider.slug, [...(scope.get(r.provider.slug) ?? []), r]);
      byScope.set(key, scope);
    }
  }
  const toInput = (r: (typeof rows)[number]): MentionInput => ({
    residentKey: r.residentKey,
    sentiment: r.sentiment,
    trust: r.trust,
    mentionedAt: r.mentionedAt,
    counted: r.counted,
    excludedReason: r.excludedReason,
    themes: asStringArray(r.themes),
  });

  const rankings: Record<string, NeighbourRankingRow[]> = {};
  for (const [key, providers] of byScope) {
    const scored = [...providers.entries()].map(([, list]) => ({ provider: toProviderLink(list[0].provider), s: scoreNeighbourMentions(list.map(toInput), now) }));
    const ranked = scored.filter((x) => x.s.status === "ranked").sort((a, b) => b.s.score - a.s.score || a.provider.name.localeCompare(b.provider.name));
    const rest = scored.filter((x) => x.s.status !== "ranked").sort((a, b) => a.provider.name.localeCompare(b.provider.name));
    rankings[key] = [
      ...ranked.map((x, i) => ({ rank: i + 1, provider: x.provider, status: x.s.status, score: x.s.score, recommendedBy: x.s.recommendedBy, topTheme: x.s.themes[0]?.label ?? null })),
      ...rest.map((x) => ({ rank: null, provider: x.provider, status: x.s.status, score: 0, recommendedBy: x.s.recommendedBy, topTheme: x.s.themes[0]?.label ?? null })),
    ];
  }

  const summaries: Record<string, NeighbourSummary> = {};
  for (const [slug, list] of byProvider) {
    const s = scoreNeighbourMentions(list.map(toInput), now);
    // The provider's main scope: where most of its mentions are.
    const scopeCounts = new Map<string, number>();
    for (const r of list) if (r.localitySlug && r.specialtySlug) scopeCounts.set(`${r.localitySlug}|${r.specialtySlug}`, (scopeCounts.get(`${r.localitySlug}|${r.specialtySlug}`) ?? 0) + 1);
    const mainScope = [...scopeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    let rank: NeighbourSummary["rank"] = null;
    if (mainScope && s.status === "ranked") {
      const table = rankings[mainScope] ?? [];
      const row = table.find((x) => x.provider.slug === slug);
      const [localitySlug, specialtySlug] = mainScope.split("|");
      if (row?.rank) {
        rank = {
          position: row.rank,
          of: table.filter((x) => x.rank !== null).length,
          localitySlug,
          localityName: getLocality(localitySlug)?.name ?? localitySlug,
          specialtySlug,
          specialtyName: specialtyName.get(specialtySlug) ?? specialtySlug,
        };
      }
    }
    summaries[slug] = {
      provider: toProviderLink(list[0].provider),
      status: s.status,
      label: recommendedLabel(s),
      recommendedBy: s.recommendedBy,
      concernedResidents: s.concernedResidents,
      score: s.score,
      themes: s.themes.slice(0, 4),
      concerns: s.concerns.slice(0, 3),
      quotes: list
        .filter((r) => r.quote && r.counted && r.sentiment !== "negative")
        .slice(0, 2)
        .map((r) => ({ text: r.quote!, meta: r.quoteMeta ?? "" })),
      rank,
    };
  }
  return { summaries, rankings, computedAt: now.toISOString() };
}

/** The neighbour block on a profile; null when nobody has mentioned the provider yet. */
export async function getNeighbourSummary(providerSlug: string): Promise<NeighbourSummary | null> {
  return (await getNeighbourData()).summaries[providerSlug] ?? null;
}

/** "Recommended by N neighbours" for many cards at once (0 when none). */
export async function getNeighbourCounts(providerSlugs: string[]): Promise<Record<string, number>> {
  const { summaries } = await getNeighbourData();
  return Object.fromEntries(providerSlugs.map((slug) => [slug, summaries[slug]?.recommendedBy ?? 0]));
}

/** "Most recommended by neighbours: paediatricians on Sohna Road" (locality page widget). */
export async function getNeighbourRanking(localitySlug: string, specialtySlug: string): Promise<{ rows: NeighbourRankingRow[]; computedAt: string }> {
  const data = await getNeighbourData();
  return { rows: data.rankings[`${localitySlug}|${specialtySlug}`] ?? [], computedAt: data.computedAt };
}
