"use server";

// "Ask your neighbourhood": asking a question, replying, helpful reactions, the asker's "most
// helpful" and "resolved" marks, and following the whole community.
//
// New questions and replies are never published straight away: they're saved as `pending`, go
// through the content-safety checks (personal data removed, urgent symptoms and dosage advice
// flagged, medical-advice questions refused by the schema) and wait in the community moderation
// queue (a ContentFlag row, "HG-CM-…") for a moderator. Every action re-checks the signed-in user.

import type { Prisma } from "@prisma/client";

import { fail, formLang, idle, needsSignIn, notAllowed, ok, parseForm, type ActionState } from "@/lib/action-state";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { detectDosageAdvice, detectUrgency } from "@/lib/content-safety";
import { db } from "@/lib/db";
import { FORUM_TOPICS } from "@/lib/domain";
import type { AutoCheck } from "@/lib/json-types";
import { getLocality } from "@/lib/localities";
import { redactPersonalData } from "@/lib/redact";
import { nextRef } from "@/lib/refs";
import { answerSchema, helpfulSchema, markBestSchema, questionSchema, resolveThreadSchema } from "@/lib/validation/community";

import { localizeState, msg, type Lang } from "./community-messages";
import { toggleFollow } from "./saved";

const J = (value: unknown) => value as Prisma.InputJsonValue;
const PUBLIC = ["open", "resolved"] as const;
const MAX_PENDING_QUESTIONS = 3;

function excerpt(text: string, max = 300): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Has this person had anything published in the community before? (First-time posters are told
 * a moderator approves their question.) */
async function isFirstTimePoster(userId: string): Promise<boolean> {
  const [threads, posts] = await Promise.all([
    db.thread.count({ where: { authorId: userId, status: { in: [...PUBLIC] } } }),
    db.post.count({ where: { authorId: userId, status: "published" } }),
  ]);
  return threads + posts === 0;
}

// ── Ask a question ─────────────────────────────────────────────────────────

export type AskData = { firstTime: boolean; redacted: boolean; urgent: boolean };

export async function askQuestion(_prev: ActionState<AskData>, formData: FormData): Promise<ActionState<AskData>> {
  const lang: Lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(msg("signInAsk", lang));
  if (!can(user.role, "ask_answer_community")) return notAllowed(msg("notAllowed", lang));
  const parsed = parseForm(questionSchema, formData);
  if (!parsed.ok) return localizeState(parsed.state, lang);
  const input = parsed.data;
  const locality = getLocality(input.locality);
  if (!locality) return fail("invalid_input", msg("localityUnknown", lang), { locality: [msg("localityUnknown", lang)] });

  const title = redactPersonalData(input.title);
  const body = input.body ? redactPersonalData(input.body) : null;
  const mine = await db.thread.findMany({ where: { authorId: user.id, status: { in: ["pending", ...PUBLIC] } }, select: { title: true, status: true } });
  const same = (a: string) => a.trim().toLowerCase().replace(/\s+/g, " ");
  if (mine.some((t) => same(t.title) === same(title.text))) return fail("duplicate", msg("duplicateQuestion", lang));
  if (mine.filter((t) => t.status === "pending").length >= MAX_PENDING_QUESTIONS) return fail("rate_limited", msg("tooManyPending", lang));

  const firstTime = await isFirstTimePoster(user.id);
  const urgency = detectUrgency(`${title.text} ${body?.text ?? ""}`);
  const redacted = title.changed || !!body?.changed;
  const autoChecks: AutoCheck[] = [
    { ok: !redacted, text: redacted ? "Personal data auto-redacted" : "No phone numbers or personal data" },
    { ok: true, text: "Not asking for medical advice" },
    { ok: !urgency.urgent, text: urgency.urgent ? "Mentions urgent symptoms (emergency message shown)" : "No urgent symptoms mentioned" },
  ];
  const flags = ["Awaiting approval", ...(firstTime ? ["First-time poster"] : []), ...(urgency.urgent ? ["Urgent symptoms"] : [])];
  const now = new Date();

  await db.$transaction(async (tx) => {
    const thread = await tx.thread.create({
      data: {
        title: title.text,
        body: body?.text ?? null,
        topicSlug: input.topic,
        localitySlug: locality.slug,
        areaLabel: locality.name,
        authorId: user.id,
        authorLabel: input.anonymous ? `a resident of ${locality.name}` : user.reviewLabel,
        anonymous: input.anonymous,
        status: "pending",
        lastActivityAt: now,
        autoChecks: J(autoChecks),
        flags: J(flags),
      },
    });
    await tx.contentFlag.create({
      data: {
        ref: await nextRef("flag", tx),
        targetKind: "thread",
        targetId: thread.id,
        targetLabel: `New question: “${excerpt(title.text, 120)}”`,
        excerpt: excerpt(body?.text ? `${title.text} ${body.text}` : title.text),
        reason: "New question awaiting approval",
        autoChecks: J(autoChecks),
        flags: J(flags),
        privateNote: `Asked by: ${user.reviewLabel}${input.anonymous ? ` (shown as “a resident of ${locality.name}”)` : ""}`,
      },
    });
    // "You'll be notified of replies": follow the question on the site (no messages are sent
    // unless the person turns on "Replies to my questions").
    await tx.follow.upsert({
      where: { userId_kind_targetId: { userId: user.id, kind: "thread", targetId: thread.id } },
      create: { userId: user.id, kind: "thread", targetId: thread.id, alert: "in_app" },
      update: {},
    });
  });
  expireTags(tags.activity(user.id), tags.follows(user.id));
  return ok(msg("questionPosted", lang), { firstTime, redacted, urgent: urgency.urgent });
}

// ── Reply ─────────────────────────────────────────────────────────────────

export type ReplyData = { postId: string; redacted: boolean; dosage: boolean };

export async function postReply(_prev: ActionState<ReplyData>, formData: FormData): Promise<ActionState<ReplyData>> {
  const lang: Lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(msg("signInReply", lang));
  if (!can(user.role, "ask_answer_community")) return notAllowed(msg("notAllowed", lang));
  const parsed = parseForm(answerSchema, formData);
  if (!parsed.ok) return localizeState(parsed.state, lang);
  const { threadId } = parsed.data;
  const thread = await db.thread.findUnique({ where: { id: threadId }, select: { id: true, title: true, status: true } });
  if (!thread || !(PUBLIC as readonly string[]).includes(thread.status)) return fail("not_found", msg("threadNotFound", lang));

  const clean = redactPersonalData(parsed.data.body);
  const duplicate = await db.post.findFirst({ where: { threadId, authorId: user.id, body: clean.text, status: { in: ["pending", "published"] } }, select: { id: true } });
  if (duplicate) return fail("duplicate", msg("duplicateReply", lang));

  const dosage = detectDosageAdvice(parsed.data.body);
  const urgency = detectUrgency(parsed.data.body);
  const firstTime = await isFirstTimePoster(user.id);
  const autoChecks: AutoCheck[] = [
    { ok: !clean.changed, text: clean.changed ? "Phone number or personal data auto-redacted" : "No phone numbers or personal data" },
    { ok: !dosage, text: dosage ? "May give dosage or treatment advice" : "No dosage or treatment advice found" },
    { ok: !urgency.urgent, text: urgency.urgent ? "Mentions urgent symptoms" : "No urgent symptoms mentioned" },
  ];
  const flags = ["Awaiting approval", ...(firstTime ? ["First-time poster"] : []), ...(dosage ? ["Possible dosage advice"] : []), ...(user.professionalLabel ? [user.professionalLabel] : [])];

  const post = await db.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        threadId,
        authorId: user.id,
        authorLabel: user.reviewLabel,
        professionalLabel: user.professionalLabel,
        body: clean.text,
        redactions: J(clean.redactions),
        status: "pending",
        autoChecks: J(autoChecks),
        flags: J(flags),
      },
      select: { id: true },
    });
    await tx.contentFlag.create({
      data: {
        ref: await nextRef("flag", tx),
        targetKind: "post",
        targetId: created.id,
        targetLabel: `New reply in “${excerpt(thread.title, 120)}”`,
        excerpt: excerpt(clean.text),
        reason: "New reply awaiting approval",
        autoChecks: J(autoChecks),
        flags: J(flags),
        privateNote: `Posted by: ${user.reviewLabel}`,
      },
    });
    return created;
  });
  // "Other things I sent" on /account/activity lists the reply straight away.
  expireTags(tags.activity(user.id));
  return ok(msg("replySent", lang), { postId: post.id, redacted: clean.changed, dosage });
}

// ── Helpful, most helpful, resolved ─────────────────────────────────────────

export type HelpfulData = { on: boolean; count: number };

/** "▲ Helpful · 14": one per person per reply; adds to the reply's and the thread's count.
 * Optional `want` (on | off) makes a repeated post harmless. */
export async function toggleHelpful(_prev: ActionState<HelpfulData>, formData: FormData): Promise<ActionState<HelpfulData>> {
  const lang: Lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(msg("signInAct", lang));
  const parsed = parseForm(helpfulSchema, formData);
  if (!parsed.ok) return localizeState(parsed.state, lang);
  const { postId } = parsed.data;
  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true, status: true, threadId: true, helpfulCount: true, thread: { select: { status: true } } } });
  if (!post || post.status !== "published" || !(PUBLIC as readonly string[]).includes(post.thread.status)) return fail("not_found", msg("postNotFound", lang));
  if (post.authorId === user.id) return fail("own_post", msg("ownPost", lang));

  const key = { postId_userId_kind: { postId, userId: user.id, kind: "helpful" } };
  const want = formData.get("want");
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.postReaction.findUnique({ where: key });
    if ((want === "on" && existing) || (want === "off" && !existing)) return { on: !!existing, count: post.helpfulCount, changed: false };
    if (existing) {
      await tx.postReaction.delete({ where: key });
      const p = await tx.post.update({ where: { id: postId }, data: { helpfulCount: { decrement: 1 } }, select: { helpfulCount: true } });
      await tx.thread.update({ where: { id: post.threadId }, data: { helpfulCount: { decrement: 1 } } });
      return { on: false, count: Math.max(0, p.helpfulCount), changed: true };
    }
    await tx.postReaction.create({ data: { postId, userId: user.id, kind: "helpful" } });
    const p = await tx.post.update({ where: { id: postId }, data: { helpfulCount: { increment: 1 } }, select: { helpfulCount: true } });
    await tx.thread.update({ where: { id: post.threadId }, data: { helpfulCount: { increment: 1 } } });
    return { on: true, count: p.helpfulCount, changed: true };
  });
  if (result.changed) expireTags(tags.thread(post.threadId), tags.threads);
  return ok(msg(result.on ? "helpfulOn" : "helpfulOff", lang), { on: result.on, count: result.count });
}

/** The asker's own thread, or an error state. */
async function askersThread(threadId: string, userId: string, lang: Lang) {
  const thread = await db.thread.findUnique({ where: { id: threadId }, select: { id: true, authorId: true, status: true } });
  if (!thread || !(PUBLIC as readonly string[]).includes(thread.status)) return { error: fail("not_found", msg("threadNotFound", lang)) };
  if (!thread.authorId || thread.authorId !== userId) return { error: fail("forbidden", msg("askerOnly", lang)) };
  return { thread };
}

export type BestData = { bestPostId: string | null };

/** "Mark most helpful" / "Unmark most helpful": the asker only, one reply at a time. */
export async function markBestAnswer(_prev: ActionState<BestData>, formData: FormData): Promise<ActionState<BestData>> {
  const lang: Lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(msg("signInAct", lang));
  const parsed = parseForm(markBestSchema, formData);
  if (!parsed.ok) return localizeState(parsed.state, lang);
  const { threadId, postId } = parsed.data;
  const owned = await askersThread(threadId, user.id, lang);
  if (owned.error) return owned.error;
  const post = await db.post.findFirst({ where: { id: postId, threadId, status: "published" }, select: { id: true, isBest: true } });
  if (!post) return fail("not_found", msg("postNotFound", lang));
  const on = !post.isBest;
  await db.$transaction([
    db.post.updateMany({ where: { threadId, isBest: true }, data: { isBest: false } }),
    ...(on ? [db.post.update({ where: { id: postId }, data: { isBest: true } })] : []),
  ]);
  expireTags(tags.thread(threadId), tags.threads);
  return ok(msg(on ? "bestOn" : "bestOff", lang), { bestPostId: on ? postId : null });
}

export type ResolvedData = { resolved: boolean };

/** "Mark as resolved" / "Reopen": the asker only. */
export async function setThreadResolved(_prev: ActionState<ResolvedData>, formData: FormData): Promise<ActionState<ResolvedData>> {
  const lang: Lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(msg("signInAct", lang));
  const parsed = parseForm(resolveThreadSchema, formData);
  if (!parsed.ok) return localizeState(parsed.state, lang);
  const { threadId, resolved } = parsed.data;
  const owned = await askersThread(threadId, user.id, lang);
  if (owned.error) return owned.error;
  if ((owned.thread.status === "resolved") !== resolved) {
    await db.thread.update({ where: { id: threadId }, data: { status: resolved ? "resolved" : "open", resolvedAt: resolved ? new Date() : null } });
    expireTags(tags.thread(threadId), tags.threads);
  }
  return ok(msg(resolved ? "resolved" : "reopened", lang), { resolved });
}

// ── Follow the whole community ─────────────────────────────────────────────

export type CommunityFollowData = { following: boolean };

/** "+ Follow community" (with "All topics" selected): follows every topic, on the site only;
 * "✓ Following community" unfollows them all. Each topic goes through toggleFollow, so alerts and
 * the consent record are handled the same way as a single topic. `want` = follow | unfollow. */
export async function toggleFollowCommunity(_prev: ActionState<CommunityFollowData>, formData: FormData): Promise<ActionState<CommunityFollowData>> {
  const lang: Lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(msg("signInFollow", lang));
  const followed = new Set((await db.follow.findMany({ where: { userId: user.id, kind: "topic" }, select: { targetId: true } })).map((f) => f.targetId));
  const all = FORUM_TOPICS.every((t) => followed.has(t.slug));
  const want = formData.get("want");
  const follow = want === "follow" ? true : want === "unfollow" ? false : !all;
  for (const t of FORUM_TOPICS) {
    if (follow === followed.has(t.slug)) continue;
    const fd = new FormData();
    fd.set("kind", "topic");
    fd.set("targetId", t.slug);
    fd.set("want", follow ? "follow" : "unfollow");
    fd.set("from", "page");
    fd.set("lang", lang);
    const r = await toggleFollow(idle, fd);
    if (r.status === "error") return fail(r.code, r.message);
  }
  return ok(msg(follow ? "followingCommunity" : "unfollowedCommunity", lang), { following: follow });
}
