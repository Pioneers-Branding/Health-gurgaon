// Scores. Pure.
//
// 1. Neighbour Recommendation System ("Neighbour Recommendation System.dc.html"):
//      score = Σ unique residents ( sentiment × trust × recency ) × balance
//    - Count people, not posts: one vote per resident per provider (their most recent mention).
//    - Sentiment: +1 strong recommendation, +0.5 mild, −1 negative experience.
//    - Trust: 1.5× verified visit · 1× established resident · 0.3× account under 30 days.
//    - Recency: full weight for 12 months, then 0.4×.
//    - Balance: multiplied by the share of positive residents, so polarising doctors don't top
//      lists. As in the page's live demo (x = x² / (x + negatives)), negatives enter only through
//      this factor; here they are weighted by trust and recency like positives.
//    - Exclusions: questions aren't counted, conflicts of interest are removed, allegations are
//      held for a moderator and never scored, rows a moderator excluded (misattributed, dispute
//      upheld) don't count.
//    - Minimum: at least 5 different residents recommending in the last 12 months, otherwise
//      "Not enough neighbour discussion yet", never a low score.
//    - Burst detection: a spike of praise from new accounts freezes the score pending review.
//
// 2. Top lists (patient-experience score): weighted sub-scores, see topListScore().

import type { MentionSentiment, MentionTrust } from "@prisma/client";

export const NEIGHBOUR_RULES = {
  minResidents: 5,
  windowDays: 365,
  sentiment: { strong_positive: 1, mild_positive: 0.5, negative: -1 } as Record<"strong_positive" | "mild_positive" | "negative", number>,
  trust: { verified_visit: 1.5, established: 1, new_account: 0.3 } as Record<MentionTrust, number>,
  oldMentionWeight: 0.4,
  burst: { windowDays: 7, newAccountPositives: 5 },
} as const;

export const NOT_ENOUGH_LABEL = "Not enough neighbour discussion yet";

export type MentionInput = {
  residentKey: string;
  sentiment: MentionSentiment;
  trust: MentionTrust;
  mentionedAt: Date | string;
  counted: boolean;
  excludedReason?: string | null;
  themes?: string[];
};

export type NeighbourScore = {
  status: "ranked" | "not_enough" | "frozen";
  /** 0 unless status is "ranked". */
  score: number;
  /** "Recommended by N neighbours": different residents with a positive mention in the last 12 months. */
  recommendedBy: number;
  /** Residents whose current view is negative ("Also mentioned with concerns by N residents"). */
  concernedResidents: number;
  /** Share of positive weight, 0–1. */
  balance: number;
  themes: { label: string; count: number }[];
  concerns: { label: string; count: number }[];
  excluded: { reason: string; count: number }[];
  notes: string[];
};

const DAY = 86_400_000;

function toTime(d: Date | string): number {
  return typeof d === "string" ? new Date(d).getTime() : d.getTime();
}

function exclusionReason(m: MentionInput): string | null {
  if (!m.counted) return m.excludedReason || "excluded_by_moderator";
  if (m.sentiment === "question") return "question";
  if (m.sentiment === "conflict") return "conflict_of_interest";
  if (m.sentiment === "allegation") return "allegation_held";
  return null;
}

function tally(map: Map<string, number>): { label: string; count: number }[] {
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** The neighbour score for one provider (in one locality × specialty scope: pass only the
 * mentions in that scope). `now` is explicit so results are reproducible and cacheable. */
export function scoreNeighbourMentions(mentions: MentionInput[], now: Date): NeighbourScore {
  const nowT = now.getTime();
  const windowStart = nowT - NEIGHBOUR_RULES.windowDays * DAY;
  const excluded = new Map<string, number>();
  const byResident = new Map<string, MentionInput[]>();

  for (const m of mentions) {
    const reason = exclusionReason(m);
    if (reason) {
      excluded.set(reason, (excluded.get(reason) ?? 0) + 1);
      continue;
    }
    const list = byResident.get(m.residentKey) ?? [];
    list.push(m);
    byResident.set(m.residentKey, list);
  }

  let positive = 0;
  let negative = 0;
  let recommendedBy = 0;
  let concernedResidents = 0;
  let oldFaded = 0;
  let newAccounts = 0;
  let burstPositives = 0;
  const themes = new Map<string, number>();
  const concerns = new Map<string, number>();

  for (const list of byResident.values()) {
    list.sort((a, b) => toTime(b.mentionedAt) - toTime(a.mentionedAt));
    const latest = list[0];
    const sentiment = latest.sentiment as "strong_positive" | "mild_positive" | "negative";
    const trust: MentionTrust = list.some((m) => m.trust === "verified_visit") ? "verified_visit" : latest.trust;
    const t = toTime(latest.mentionedAt);
    const recent = t >= windowStart;
    const weight = Math.abs(NEIGHBOUR_RULES.sentiment[sentiment]) * NEIGHBOUR_RULES.trust[trust] * (recent ? 1 : NEIGHBOUR_RULES.oldMentionWeight);
    const sameSide = list.filter((m) => (m.sentiment === "negative") === (sentiment === "negative"));
    const labels = new Set(sameSide.flatMap((m) => m.themes ?? []));
    if (!recent) oldFaded += 1;
    if (trust === "new_account") newAccounts += 1;

    if (sentiment === "negative") {
      negative += weight;
      if (recent) {
        concernedResidents += 1;
        for (const l of labels) concerns.set(l, (concerns.get(l) ?? 0) + 1);
      }
    } else {
      positive += weight;
      if (recent) {
        recommendedBy += 1;
        for (const l of labels) themes.set(l, (themes.get(l) ?? 0) + 1);
      }
      if (trust === "new_account" && t >= nowT - NEIGHBOUR_RULES.burst.windowDays * DAY) burstPositives += 1;
    }
  }

  const balance = positive + negative > 0 ? positive / (positive + negative) : 0;
  const raw = positive * balance;
  const notes: string[] = [];
  const conflicts = excluded.get("conflict_of_interest") ?? 0;
  if (conflicts) notes.push(`${conflicts} staff/relative mentions removed`);
  if (newAccounts > 5) notes.push(`${newAccounts} new-account mentions discounted`);
  if (oldFaded > 5) notes.push(`${oldFaded} mentions over a year old faded`);
  if (concernedResidents > 4) notes.push(`${concernedResidents} residents shared negative experiences`);

  let status: NeighbourScore["status"] = "ranked";
  if (recommendedBy < NEIGHBOUR_RULES.minResidents) status = "not_enough";
  else if (burstPositives >= NEIGHBOUR_RULES.burst.newAccountPositives) {
    status = "frozen";
    notes.push("Score frozen pending review: a sudden spike of praise from new accounts");
  }

  return {
    status,
    score: status === "ranked" ? Math.round(raw * 10) / 10 : 0,
    recommendedBy,
    concernedResidents,
    balance: Math.round(balance * 1000) / 1000,
    themes: tally(themes),
    concerns: tally(concerns),
    excluded: tally(excluded).map(({ label, count }) => ({ reason: label, count })),
    notes,
  };
}

/** Order providers by neighbour score: ranked first (highest score), then frozen, then
 * "not enough discussion" (never ranked, kept alphabetical). */
export function rankByNeighbourScore<T extends { name: string; neighbour: NeighbourScore }>(items: T[]): (T & { rank: number | null })[] {
  const ranked = items.filter((i) => i.neighbour.status === "ranked").sort((a, b) => b.neighbour.score - a.neighbour.score || a.name.localeCompare(b.name));
  const rest = items
    .filter((i) => i.neighbour.status !== "ranked")
    .sort((a, b) => (a.neighbour.status === b.neighbour.status ? a.name.localeCompare(b.name) : a.neighbour.status === "frozen" ? -1 : 1));
  return [...ranked.map((i, idx) => ({ ...i, rank: idx + 1 })), ...rest.map((i) => ({ ...i, rank: null }))];
}

// ── The method page's live demo (aggregate form, exactly as the prototype computes it) ──────

export type DemoSafeguard = "unique" | "conflict" | "trust" | "recency" | "balance" | "threshold";
export const DEMO_SAFEGUARDS: { key: DemoSafeguard; label: string; detail: string }[] = [
  { key: "unique", label: "Count people, not posts", detail: "One resident = one vote per doctor, however many times they post." },
  { key: "conflict", label: "Remove conflicts of interest", detail: "Staff, relatives and self-promotion (declared or detected) are excluded." },
  { key: "trust", label: "Weight by trust", detail: "Accounts under 30 days count 0.3×; verified-visit residents count 1.5×." },
  { key: "recency", label: "Fade old mentions", detail: "Mentions older than 12 months count 0.4×." },
  { key: "balance", label: "Balance negative experiences", detail: "Score scales by share of positive vs negative residents." },
  { key: "threshold", label: "Minimum 5 residents", detail: "Below that: “not enough discussion yet”, never ranked." },
];

export type DemoDoc = { name: string; raw: number; unique: number; newAcct: number; verified: number; old: number; neg: number; conflict: number };

export function scoreDemoDoc(d: DemoDoc, on: Record<DemoSafeguard, boolean>): { x: number; notes: string[]; below: boolean } {
  let x = on.unique ? d.unique : d.raw;
  const notes: string[] = [];
  if (on.conflict && d.conflict) {
    x -= d.conflict;
    notes.push(`${d.conflict} staff/relative mentions removed`);
  }
  if (on.trust) {
    x += -d.newAcct * 0.7 + d.verified * 0.5;
    if (d.newAcct > 5) notes.push(`${d.newAcct} new-account mentions discounted`);
  }
  if (on.recency && d.old) {
    x -= d.old * 0.6;
    if (d.old > 5) notes.push(`${d.old} mentions over a year old faded`);
  }
  if (on.balance && d.neg) {
    x = (x * x) / (x + d.neg);
    if (d.neg > 4) notes.push(`${d.neg} residents shared negative experiences`);
  }
  const below = on.threshold && d.unique - (on.conflict ? d.conflict : 0) < 5;
  return { x: Math.max(0, x), notes, below };
}

/** The demo ranking: safeguarded order, with movement against the raw-count order. */
export function rankDemo(docs: DemoDoc[], on: Record<DemoSafeguard, boolean>) {
  const anyOn = Object.values(on).some(Boolean);
  const rawOrder = [...docs].sort((a, b) => b.raw - a.raw).map((d) => d.name);
  const scored = docs.map((d) => ({ d, ...scoreDemoDoc(d, on) }));
  const ranked = scored.filter((s) => !s.below).sort((a, b) => b.x - a.x);
  const unranked = scored.filter((s) => s.below);
  return {
    ranked: ranked.map((r, i) => ({
      rank: i + 1,
      name: r.d.name,
      score: anyOn ? Math.round(r.x * 10) / 10 : r.d.raw,
      unit: anyOn ? "NEIGHBOUR SCORE" : "RAW MENTIONS",
      delta: rawOrder.indexOf(r.d.name) - i,
      notes: r.notes,
      doc: r.d,
    })),
    unranked: unranked.map((r) => ({ name: r.d.name, residents: r.d.unique, doc: r.d })),
  };
}

// ── Top lists: patient-experience score ─────────────────────────────────────

/** The four parts of a list score and their weights ("How this list is ranked"). */
export const TOP_LIST_METHOD = [
  { key: "experience", label: "Patient experience", weight: 0.4, detail: "From verified reviews only: explanation, respect, outcome as described by patients." },
  { key: "access", label: "Wait & access", weight: 0.2, detail: "Reported waiting time, appointment availability, accessibility, languages." },
  { key: "information", label: "Information quality", weight: 0.2, detail: "How complete and recently verified the listing is." },
  { key: "value", label: "Value & transparency", weight: 0.2, detail: "Fee clarity, billing complaints, responses to reviews." },
] as const;

/** Providers need at least this many verified reviews in the last 12 months to be ranked. */
export const TOP_LIST_MIN_REVIEWS = 15;

/** Weighted score out of 100, rounded down (the prototype's published scores). */
export function topListScore(sub: readonly [number, number, number, number]): number {
  const total = TOP_LIST_METHOD.reduce((sum, part, i) => sum + part.weight * (sub[i] ?? 0), 0);
  return Math.floor(total + 1e-9);
}

export function isRankable(verifiedReviewsLast12Months: number): boolean {
  return verifiedReviewsLast12Months >= TOP_LIST_MIN_REVIEWS;
}
