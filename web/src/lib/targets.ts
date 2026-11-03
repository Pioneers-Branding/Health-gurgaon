// Resolving what a saved item or a follow points at. Server-only.
// Saved items and follows store (kind, targetId) where targetId is the entity's public key: a slug
// for providers, events, articles, guides, top lists, stories, localities and societies; the id for
// threads; the topic slug for topics.

import "server-only";

import type { FollowKind, SavedKind } from "@prisma/client";

import { getLocality } from "@/lib/localities";
import { db } from "@/lib/db";
import { FORUM_TOPICS, PROFILE_KIND_OF, type ProfileKind } from "@/lib/domain";

export type TargetKind = SavedKind | FollowKind;

export type ResolvedTarget = {
  kind: TargetKind;
  targetId: string;
  title: string;
  subtitle: string | null;
  /** For building the URL with the shell's route helpers. */
  link:
    | { type: "provider"; profileKind: ProfileKind; slug: string }
    | { type: "event" | "article" | "guide" | "top_list" | "story" | "locality" | "society"; slug: string }
    | { type: "thread"; id: string }
    | { type: "topic"; slug: string };
};

/** Look up targets in bulk (missing or unpublished ones are left out). */
export async function resolveTargets(items: { kind: TargetKind; targetId: string }[]): Promise<Map<string, ResolvedTarget>> {
  const key = (k: string, id: string) => `${k}:${id}`;
  const ids = (k: TargetKind) => items.filter((i) => i.kind === k).map((i) => i.targetId);
  const out = new Map<string, ResolvedTarget>();

  const [providers, events, articles, guides, threads, lists, stories, societies] = await Promise.all([
    ids("provider").length
      ? db.provider.findMany({ where: { slug: { in: ids("provider") }, status: "published" }, select: { slug: true, name: true, kind: true, headline: true, lastCheckedAt: true } })
      : [],
    ids("event").length ? db.event.findMany({ where: { slug: { in: ids("event") }, status: { not: "rejected" } }, select: { slug: true, title: true, startsAt: true, timeLabel: true } }) : [],
    ids("article").length ? db.article.findMany({ where: { slug: { in: ids("article") }, status: "published" }, select: { slug: true, title: true, category: true } }) : [],
    ids("guide").length ? db.guide.findMany({ where: { slug: { in: ids("guide") }, status: "published" }, select: { slug: true, title: true, tag: true } }) : [],
    ids("thread").length ? db.thread.findMany({ where: { id: { in: ids("thread") }, status: { in: ["open", "resolved"] } }, select: { id: true, title: true, replyCount: true } }) : [],
    ids("top_list").length ? db.topList.findMany({ where: { slug: { in: ids("top_list") }, published: true }, select: { slug: true, title: true, hubMeta: true } }) : [],
    ids("story").length ? db.story.findMany({ where: { slug: { in: ids("story") }, status: "published" }, select: { slug: true, title: true, providerName: true } }) : [],
    ids("society").length ? db.society.findMany({ where: { slug: { in: ids("society") }, status: "verified" }, select: { slug: true, name: true, areaLabel: true } }) : [],
  ]);

  for (const p of providers) {
    out.set(key("provider", p.slug), { kind: "provider", targetId: p.slug, title: p.name, subtitle: p.headline, link: { type: "provider", profileKind: PROFILE_KIND_OF[p.kind], slug: p.slug } });
  }
  for (const e of events) out.set(key("event", e.slug), { kind: "event", targetId: e.slug, title: e.title, subtitle: e.timeLabel, link: { type: "event", slug: e.slug } });
  for (const a of articles) out.set(key("article", a.slug), { kind: "article", targetId: a.slug, title: a.title, subtitle: a.category, link: { type: "article", slug: a.slug } });
  for (const g of guides) out.set(key("guide", g.slug), { kind: "guide", targetId: g.slug, title: g.title, subtitle: g.tag, link: { type: "guide", slug: g.slug } });
  for (const t of threads) out.set(key("thread", t.id), { kind: "thread", targetId: t.id, title: t.title, subtitle: `${t.replyCount} replies`, link: { type: "thread", id: t.id } });
  for (const l of lists) out.set(key("top_list", l.slug), { kind: "top_list", targetId: l.slug, title: l.title, subtitle: l.hubMeta, link: { type: "top_list", slug: l.slug } });
  for (const s of stories) out.set(key("story", s.slug), { kind: "story", targetId: s.slug, title: s.title, subtitle: s.providerName, link: { type: "story", slug: s.slug } });
  for (const s of societies) out.set(key("society", s.slug), { kind: "society", targetId: s.slug, title: s.name, subtitle: s.areaLabel, link: { type: "society", slug: s.slug } });
  for (const id of ids("locality")) {
    const L = getLocality(id);
    if (L) out.set(key("locality", id), { kind: "locality", targetId: id, title: L.name, subtitle: L.covers, link: { type: "locality", slug: id } });
  }
  for (const id of ids("topic")) {
    const topic = FORUM_TOPICS.find((t) => t.slug === id);
    if (topic) out.set(key("topic", id), { kind: "topic", targetId: id, title: topic.label, subtitle: null, link: { type: "topic", slug: id } });
  }
  return out;
}

export async function resolveTarget(kind: TargetKind, targetId: string): Promise<ResolvedTarget | null> {
  return (await resolveTargets([{ kind, targetId }])).get(`${kind}:${targetId}`) ?? null;
}
