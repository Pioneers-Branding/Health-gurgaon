// Patient stories. Prototype: "Health Gurgaon Top Lists and Stories.dc.html" #stories.
// Every published story renders into the static shell (the Suspense fallback shows them all); the
// topic filter (?category=) applies under <Suspense>. "Share your story" opens a three-step
// dialog that posts to the submitStory Server Action (moderation queue, ref HG-ST-…); whether the
// reader is signed in is request-time, so that part waits under its own <Suspense>.
import type { Metadata } from "next";
import { Suspense } from "react";

import { parseStoryCategory } from "@/components/top-lists/format";
import { ShareStoryButton, StoriesGrid, StoriesHeader, StoryRules } from "@/components/top-lists/stories-view";
import { getCurrentUser } from "@/lib/auth/session";
import { getStories, type StoryCard } from "@/lib/data/top-lists";
import { getDictionary, type Lang } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/stories">;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.stories;
  return pageMetadata({ lang, href: (l) => routes.stories(l), title: t.title, description: t.description });
}

export default async function StoriesPage({ searchParams }: Props) {
  const lang = await getLang();
  const stories = await getStories();
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-6 pt-8 pb-14">
      <StoriesHeader
        lang={lang}
        share={
          <Suspense fallback={<ShareStoryButton lang={lang} signedIn={null} />}>
            <ShareForReader lang={lang} />
          </Suspense>
        }
      />
      <Suspense fallback={<StoriesGrid lang={lang} stories={stories} category={null} />}>
        <GridForRequest lang={lang} stories={stories} searchParams={searchParams} />
      </Suspense>
      <StoryRules lang={lang} />
    </div>
  );
}

async function ShareForReader({ lang }: { lang: Lang }) {
  const user = await getCurrentUser();
  return <ShareStoryButton lang={lang} signedIn={!!user} />;
}

async function GridForRequest({ lang, stories, searchParams }: { lang: Lang; stories: StoryCard[]; searchParams: Props["searchParams"] }) {
  const category = parseStoryCategory(await searchParams);
  return <StoriesGrid lang={lang} stories={stories} category={category} />;
}
