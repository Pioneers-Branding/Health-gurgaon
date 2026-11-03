import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NEIGHBOUR_DEMO_DOCS } from "../../src/lib/neighbour-demo";
import {
  DEMO_SAFEGUARDS,
  NEIGHBOUR_RULES,
  NOT_ENOUGH_LABEL,
  rankByNeighbourScore,
  rankDemo,
  scoreNeighbourMentions,
  topListScore,
  type DemoSafeguard,
  type MentionInput,
} from "../../src/lib/ranking";
import { TOP_LISTS } from "../../prisma/seed-data/top-lists";

const NOW = new Date("2026-10-16T05:30:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

function residents(n: number, over: Partial<MentionInput> = {}, prefix = "r"): MentionInput[] {
  return Array.from({ length: n }, (_, i) => ({
    residentKey: `${prefix}${i}`,
    sentiment: "strong_positive",
    trust: "established",
    mentionedAt: ago(10 + i),
    counted: true,
    ...over,
  }));
}

describe("neighbour score: minimum residents", () => {
  it("needs at least 5 different residents in 12 months", () => {
    const four = scoreNeighbourMentions(residents(4), NOW);
    assert.equal(four.status, "not_enough");
    assert.equal(four.score, 0);
    assert.equal(four.recommendedBy, 4);
    assert.equal(NOT_ENOUGH_LABEL, "Not enough neighbour discussion yet");
    const five = scoreNeighbourMentions(residents(5), NOW);
    assert.equal(five.status, "ranked");
    assert.equal(five.score, 5);
  });

  it("counts people, not posts", () => {
    const spam = Array.from({ length: 12 }, (_, i) => ({ residentKey: "same", sentiment: "strong_positive" as const, trust: "established" as const, mentionedAt: ago(i + 1), counted: true }));
    const s = scoreNeighbourMentions(spam, NOW);
    assert.equal(s.recommendedBy, 1);
    assert.equal(s.status, "not_enough");
  });

  it("only counts residents from the last 12 months towards the minimum", () => {
    const s = scoreNeighbourMentions([...residents(4), ...residents(3, { mentionedAt: ago(400) }, "old")], NOW);
    assert.equal(s.recommendedBy, 4);
    assert.equal(s.status, "not_enough");
  });
});

describe("neighbour score: exclusions", () => {
  it("never counts questions, conflicts, allegations or excluded rows", () => {
    const s = scoreNeighbourMentions(
      [
        ...residents(5),
        { residentKey: "q", sentiment: "question", trust: "established", mentionedAt: ago(3), counted: true },
        { residentKey: "staff", sentiment: "conflict", trust: "established", mentionedAt: ago(3), counted: true },
        { residentKey: "alleg", sentiment: "allegation", trust: "established", mentionedAt: ago(3), counted: true },
        { residentKey: "moved", sentiment: "strong_positive", trust: "established", mentionedAt: ago(3), counted: false, excludedReason: "misattributed" },
      ],
      NOW,
    );
    assert.equal(s.recommendedBy, 5);
    assert.equal(s.score, 5);
    assert.deepEqual(
      s.excluded.map((e) => e.reason).sort(),
      ["allegation_held", "conflict_of_interest", "misattributed", "question"],
    );
    assert.match(s.notes.join(" "), /1 staff\/relative mentions removed/);
  });
});

describe("neighbour score: weights", () => {
  it("weights sentiment × trust × recency", () => {
    const base = scoreNeighbourMentions(residents(5), NOW).score;
    assert.equal(scoreNeighbourMentions([...residents(5), ...residents(1, { sentiment: "mild_positive" }, "m")], NOW).score, base + 0.5);
    assert.equal(scoreNeighbourMentions([...residents(5), ...residents(1, { trust: "verified_visit" }, "v")], NOW).score, base + 1.5);
    assert.equal(scoreNeighbourMentions([...residents(5), ...residents(1, { trust: "new_account" }, "n")], NOW).score, base + 0.3);
    assert.equal(scoreNeighbourMentions([...residents(5), ...residents(1, { mentionedAt: ago(500) }, "o")], NOW).score, base + NEIGHBOUR_RULES.oldMentionWeight);
  });

  it("balances against negative experiences", () => {
    const s = scoreNeighbourMentions([...residents(10), ...residents(10, { sentiment: "negative", themes: ["Waiting time"] }, "neg")], NOW);
    assert.equal(s.balance, 0.5);
    assert.equal(s.score, 5);
    assert.equal(s.concernedResidents, 10);
    assert.deepEqual(s.concerns, [{ label: "Waiting time", count: 10 }]);
  });

  it("uses each resident's latest view", () => {
    const changed: MentionInput[] = [
      ...residents(5),
      { residentKey: "r0", sentiment: "negative", trust: "established", mentionedAt: ago(1), counted: true },
    ];
    const s = scoreNeighbourMentions(changed, NOW);
    assert.equal(s.recommendedBy, 4);
    assert.equal(s.concernedResidents, 1);
  });

  it("freezes a burst of praise from new accounts", () => {
    const s = scoreNeighbourMentions([...residents(6), ...residents(5, { trust: "new_account", mentionedAt: ago(2) }, "new")], NOW);
    assert.equal(s.status, "frozen");
    assert.equal(s.score, 0);
  });

  it("tallies themes from recent positive residents", () => {
    const s = scoreNeighbourMentions([...residents(3, { themes: ["Explains clearly"] }), ...residents(3, { themes: ["Explains clearly", "Good with toddlers"] }, "b")], NOW);
    assert.deepEqual(s.themes, [
      { label: "Explains clearly", count: 6 },
      { label: "Good with toddlers", count: 3 },
    ]);
  });

  it("ranks ranked providers first and never ranks thin ones", () => {
    const rows = rankByNeighbourScore([
      { name: "B", neighbour: scoreNeighbourMentions(residents(6), NOW) },
      { name: "A", neighbour: scoreNeighbourMentions(residents(2), NOW) },
      { name: "C", neighbour: scoreNeighbourMentions(residents(9), NOW) },
    ]);
    assert.deepEqual(rows.map((r) => [r.name, r.rank]), [["C", 1], ["B", 2], ["A", null]]);
  });
});

describe("the method page's live demo", () => {
  const allOn = Object.fromEntries(DEMO_SAFEGUARDS.map((s) => [s.key, true])) as Record<DemoSafeguard, boolean>;
  const allOff = Object.fromEntries(DEMO_SAFEGUARDS.map((s) => [s.key, false])) as Record<DemoSafeguard, boolean>;

  it("reproduces the prototype's safeguarded order", () => {
    const { ranked, unranked } = rankDemo(NEIGHBOUR_DEMO_DOCS, allOn);
    assert.deepEqual(ranked.map((r) => r.name), ["Dr. Kavya Menon", "Dr. Imran Qureshi", "Dr. Ritu Saxena", "Dr. Vivek Jain", "Dr. Sunil Arora"]);
    assert.deepEqual(ranked.map((r) => r.score), [24.8, 19.7, 14.1, 13.4, 4]);
    assert.deepEqual(unranked.map((u) => u.name), ["Dr. Pooja Nair"]);
  });

  it("ranks by raw mentions with every safeguard off", () => {
    const { ranked, unranked } = rankDemo(NEIGHBOUR_DEMO_DOCS, allOff);
    assert.equal(ranked[0].name, "Dr. Sunil Arora");
    assert.equal(ranked[0].unit, "RAW MENTIONS");
    assert.equal(unranked.length, 0);
  });
});

describe("top-list score", () => {
  it("weights the four parts 40/20/20/20", () => {
    assert.equal(topListScore([95, 88, 94, 90]), 92);
    assert.equal(topListScore([89, 80, 90, 82]), 86);
    assert.equal(topListScore([100, 100, 100, 100]), 100);
  });

  it("matches the published sample scores within 2 points", () => {
    for (const list of TOP_LISTS) {
      for (const e of list.entries) assert.ok(Math.abs(topListScore(e.sub) - e.score) <= 2, `${e.name}: ${topListScore(e.sub)} vs ${e.score}`);
    }
  });
});
