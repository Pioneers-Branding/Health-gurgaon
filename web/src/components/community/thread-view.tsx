// A discussion: the question, verified listings that answer it, the replies (most helpful first),
// "Add a reply". Prototype: "Health Gurgaon Community.dc.html" #thread. The thread and its replies
// are cached data in the static shell; who is reading (helpful marks, the asker's buttons, their
// own replies waiting for a moderator) renders under <Suspense>.

import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { JsonLd } from "@/components/ui/json-ld";
import type { PostDTO, ThreadView, ThreadViewer } from "@/lib/data/community";
import { getThreadViewer } from "@/lib/data/community";
import { formatDate, getDictionary, isoDate, type Lang } from "@/lib/i18n";
import type { CommunityStrings } from "@/lib/i18n/areas/community";
import { SITE_URL } from "@/lib/i18n/metadata";
import { getLocality, localityName } from "@/lib/localities";
import { routes } from "@/lib/routes";

import { dataLang, SignInNote } from "./bits";
import { FollowButton } from "./follow-button";
import { fill, formatAgo, placeShort, plural } from "./logic";
import { ReplyForm } from "./reply-form";
import { BestButton, HelpfulButton, ResolveButton } from "./thread-actions";

type Props = { lang: Lang; t: CommunityStrings; view: ThreadView; now: string };

function ago(lang: Lang, t: CommunityStrings, at: string, now: string) {
  return formatAgo(t.ago, at, now, (iso) => formatDate(lang, iso));
}

/** "About {name}" with a link in place of {name}, in either word order. */
function withNode(template: string, key: string, node: ReactNode): ReactNode {
  const [before, after = ""] = template.split(`{${key}}`);
  return (
    <>
      {before}
      {node}
      {after}
    </>
  );
}

function signInHref(lang: Lang, id: string) {
  return routes.account(lang, { next: routes.thread(lang, id) });
}

export function ThreadPageView({ lang, t, view, now }: Props) {
  const { thread } = view;
  const dict = getDictionary(lang);
  const topic = lang === "hi" ? thread.topic.labelHi : thread.topic.label;
  const url = `${SITE_URL}${routes.thread(lang, thread.id)}`;
  const askedBy = view.anonymous
    ? thread.areaLabel
      ? fill(t.thread.askedByArea, { area: thread.areaLabel })
      : t.thread.askedByUnknown
    : fill(t.thread.askedBy, { label: thread.askedBy });
  const resolved = thread.status === "resolved";

  return (
    <div className="mx-auto flex w-full max-w-[56.25rem] flex-col gap-4.5 px-6 pt-7 pb-14">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "DiscussionForumPosting",
            headline: thread.title,
            ...(thread.body ? { text: thread.body } : {}),
            url,
            datePublished: thread.createdAt,
            inLanguage: "en-IN",
            author: { "@type": "Person", name: view.anonymous && thread.areaLabel ? `A resident of ${thread.areaLabel}` : thread.askedBy },
            interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: thread.posts.length },
            comment: thread.posts.map((p) => ({
              "@type": "Comment",
              text: p.body,
              datePublished: p.createdAt,
              author: { "@type": "Person", name: p.authorLabel },
              upvoteCount: p.helpfulCount,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: dict.breadcrumbs.home, item: `${SITE_URL}${routes.home(lang)}` },
              { "@type": "ListItem", position: 2, name: dict.pages.community.title, item: `${SITE_URL}${routes.community(lang)}` },
              { "@type": "ListItem", position: 3, name: topic, item: `${SITE_URL}${routes.community(lang, { topic: thread.topic.slug })}` },
              { "@type": "ListItem", position: 4, name: thread.title, item: url },
            ],
          },
        ]}
      />
      <nav aria-label={dict.breadcrumbs.label} className="text-13 font-light text-subtle">
        <ol className="flex flex-wrap items-center gap-x-1.5">
          <li className="inline-flex items-center gap-x-1.5">
            <Link href={routes.community(lang)} className="inline-flex min-h-11 items-center">
              {t.thread.crumbCommunity}
            </Link>
            <span aria-hidden="true">›</span>
          </li>
          <li>
            <Link href={routes.community(lang, { topic: thread.topic.slug })} className="inline-flex min-h-11 items-center">
              {topic}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-pill px-2.75 py-1 text-12 font-semibold", resolved ? "bg-success-tint text-success" : "bg-pending-tint text-pending")}>
            {resolved ? t.status.resolvedTick : t.status.open}
          </span>
          <span className="text-13 font-light text-subtle">
            <span lang={view.anonymous ? undefined : dataLang(lang)}>{askedBy}</span> · <time dateTime={thread.createdAt}>{ago(lang, t, thread.createdAt, now)}</time>
          </span>
        </div>
        <h1 lang={dataLang(lang)} className="text-32 leading-[1.15] font-bold tracking-h2">
          {thread.title}
        </h1>
        {thread.body && (
          <p lang={dataLang(lang)} className="text-16 leading-[1.65] font-light text-ink-soft">
            {thread.body}
          </p>
        )}
        {thread.provider && (
          <p className="text-13.5 font-light text-muted">
            {withNode(
              t.forum.about,
              "name",
              <Link href={routes.provider(lang, thread.provider.profileKind, thread.provider.slug)} lang={dataLang(lang)} className="font-medium">
                {thread.provider.name}
              </Link>,
            )}
          </p>
        )}
        <Suspense fallback={<ThreadButtons lang={lang} t={t} id={thread.id} resolved={resolved} viewer={null} />}>
          <ViewerThreadButtons lang={lang} t={t} id={thread.id} resolved={resolved} />
        </Suspense>
      </div>

      {view.matches && <MatchesBox lang={lang} t={t} matches={view.matches} />}

      <h2 className="text-17 font-semibold">{thread.posts.length ? plural(thread.posts.length, t.thread.reply, t.thread.replies) : t.thread.noReplies}</h2>
      <Suspense fallback={<PostList lang={lang} t={t} view={view} now={now} viewer={null} />}>
        <ViewerPostList lang={lang} t={t} view={view} now={now} />
      </Suspense>

      <Suspense fallback={null}>
        <ReplySignInNote lang={lang} t={t} id={thread.id} />
      </Suspense>
      <ReplyForm
        lang={lang}
        threadId={thread.id}
        signInHref={signInHref(lang, thread.id)}
        labels={{
          addReply: t.thread.addReply,
          replyLabel: t.thread.replyLabel,
          replyPlaceholder: t.thread.replyPlaceholder,
          replyNote: t.thread.replyNote,
          postReply: t.thread.postReply,
          posting: t.thread.posting,
          phoneWarning: t.thread.phoneWarning,
          dosageWarning: t.thread.dosageWarning,
          urgentTitle: t.thread.urgentTitle,
          urgentBody: t.thread.urgentBody,
          selfHarm: t.thread.selfHarm,
          replySent: t.thread.replySent,
          replyRedacted: t.thread.replyRedacted,
          signInLink: t.common.signIn,
          seeActivity: t.common.seeActivity,
        }}
        activityHref={routes.accountActivity(lang)}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-12.5 font-light text-subtle">
        <span>{dict.disclaimers.community}</span>
        <Link href={routes.report(lang, "thread", thread.id)} className="inline-flex min-h-11 items-center text-13 text-subtle hover:text-ink">
          {t.thread.reportThread}
        </Link>
      </div>
    </div>
  );
}

function MatchesBox({ lang, t, matches }: { lang: Lang; t: CommunityStrings; matches: NonNullable<ThreadView["matches"]> }) {
  const L = getLocality(matches.localitySlug);
  const place = L ? (lang === "hi" ? localityName(L.slug, "hi") : placeShort(L)) : "";
  const text =
    matches.kind === "pharmacy_24h"
      ? plural(matches.count, t.thread.pharmacy24hOne, t.thread.pharmacy24h)
      : plural(matches.count, t.thread.labHomeOne, t.thread.labHome);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-18 bg-success-tint px-4 py-3.5">
      <p className="min-w-55 flex-1 text-14 font-medium">
        {t.thread.matchesLabel} {fill(text, { place })}
      </p>
      <Link
        href={routes.search(lang, { type: matches.search.type, q: matches.search.q })}
        className="inline-flex min-h-11 items-center rounded-pill bg-success px-4 text-13.5 font-medium text-white hover:bg-teal-dark hover:text-white"
      >
        {matches.count === 1 ? t.thread.seeIt : t.thread.seeThem}
      </Link>
    </div>
  );
}

// ── Who is reading ───────────────────────────────────────────────────────────

async function ViewerThreadButtons({ lang, t, id, resolved }: { lang: Lang; t: CommunityStrings; id: string; resolved: boolean }) {
  const viewer = await getThreadViewer(id);
  return <ThreadButtons lang={lang} t={t} id={id} resolved={resolved} viewer={viewer} />;
}

function ThreadButtons({ lang, t, id, resolved, viewer }: { lang: Lang; t: CommunityStrings; id: string; resolved: boolean; viewer: ThreadViewer | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-start gap-2.5">
        {viewer?.isAsker && <ResolveButton lang={lang} threadId={id} resolved={resolved} labels={{ markResolved: t.thread.markResolved, reopen: t.thread.reopen, signInLink: t.common.signIn }} signInHref={signInHref(lang, id)} />}
        <FollowButton
          lang={lang}
          kind="thread"
          targetId={id}
          initial={viewer?.following ?? false}
          variant="softLg"
          labels={{ follow: t.thread.followReplies, following: t.thread.following, signIn: t.thread.signInToAct, signInLink: t.common.signIn }}
          signInHref={signInHref(lang, id)}
        />
      </div>
      {viewer?.isAsker && <p className="text-12 font-light text-subtle">{t.thread.askerNote}</p>}
    </div>
  );
}

async function ViewerPostList(props: Props) {
  const viewer = await getThreadViewer(props.view.thread.id);
  return (
    <>
      <PostList {...props} viewer={viewer} />
      {viewer.pending.map((p) => (
        <PostCard key={p.id} lang={props.lang} t={props.t} badge={<span className="rounded-pill bg-pending-tint px-2.25 py-0.75 text-11.5 font-semibold text-pending">{props.t.thread.pendingBadge}</span>} who={p.authorLabel} pro={p.professionalLabel} at={p.createdAt} now={props.now} body={p.body} pending>
          <p className="text-12.5 font-light text-subtle">{props.t.thread.pendingNote}</p>
        </PostCard>
      ))}
    </>
  );
}

async function ReplySignInNote({ lang, t, id }: { lang: Lang; t: CommunityStrings; id: string }) {
  const viewer = await getThreadViewer(id);
  if (viewer.signedIn) return null;
  return <SignInNote text={t.thread.signInToReply} href={signInHref(lang, id)} linkLabel={t.common.signIn} className="-mb-2" />;
}

function PostList({ lang, t, view, now, viewer }: Props & { viewer: ThreadViewer | null }) {
  const { thread } = view;
  if (!thread.posts.length) return null;
  return (
    <ol className="flex flex-col gap-4.5">
      {thread.posts.map((p) => (
        <li key={p.id}>
          <PublishedPost lang={lang} t={t} threadId={thread.id} post={p} now={now} viewer={viewer} />
        </li>
      ))}
    </ol>
  );
}

function PublishedPost({ lang, t, threadId, post, now, viewer }: { lang: Lang; t: CommunityStrings; threadId: string; post: PostDTO; now: string; viewer: ThreadViewer | null }) {
  const own = !!viewer?.ownPosts.includes(post.id);
  return (
    <PostCard
      lang={lang}
      t={t}
      who={post.authorLabel}
      pro={post.professionalLabel}
      at={post.createdAt}
      now={now}
      body={post.body}
      best={post.isBest}
      badge={post.isBest ? <span className="rounded-pill bg-ink px-2.25 py-0.75 text-11.5 font-semibold text-saffron">{t.thread.best}</span> : null}
    >
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3">
        <HelpfulButton lang={lang} postId={post.id} count={post.helpfulCount} on={!!viewer?.helpful.includes(post.id)} own={own} labels={{ helpful: t.thread.helpful, signInLink: t.common.signIn }} signInHref={signInHref(lang, threadId)} />
        {viewer?.isAsker && <BestButton lang={lang} threadId={threadId} postId={post.id} isBest={post.isBest} labels={{ markBest: t.thread.markBest, unmarkBest: t.thread.unmarkBest, signInLink: t.common.signIn }} signInHref={signInHref(lang, threadId)} />}
        {own ? (
          <span className="text-13 font-light text-subtle">{t.thread.ownPost}</span>
        ) : (
          <Link
            href={routes.report(lang, "thread", threadId, { type: "complaint" })}
            className="relative inline-flex min-h-8 items-center text-13 text-subtle after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:text-ink"
          >
            {t.thread.reportReply}
          </Link>
        )}
      </div>
    </PostCard>
  );
}

function PostCard({
  lang,
  t,
  who,
  pro,
  at,
  now,
  body,
  best = false,
  pending = false,
  badge,
  children,
}: {
  lang: Lang;
  t: CommunityStrings;
  who: string;
  pro: string | null;
  at: string;
  now: string;
  body: string;
  best?: boolean;
  pending?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className={cn("flex flex-col gap-2.5 rounded-20 bg-white p-4.5", best ? "border-2 border-ink" : pending ? "border-[1.5px] border-dashed border-sponsored" : "border border-line")}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span lang={dataLang(lang)} className="text-14.5 font-semibold">
            {who}
          </span>
          {pro && <span className="rounded-pill bg-success-tint px-2.25 py-0.75 text-11.5 font-semibold text-success">{fill(t.thread.verifiedPro, { label: t.thread.proLabels[pro] ?? pro })}</span>}
          {badge}
        </div>
        <time dateTime={isoDate(at)} className="mono-label text-11 text-subtle">
          {ago(lang, t, at, now)}
        </time>
      </div>
      <p lang={dataLang(lang)} className="text-15 leading-[1.65] font-light whitespace-pre-line">
        {body}
      </p>
      {children}
    </article>
  );
}
