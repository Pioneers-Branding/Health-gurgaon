// /gurgaon/stories: patient stories. Prototype: "Health Gurgaon Top Lists and Stories.dc.html"
// #stories. Server Components around the client story cards (player dialog) and the "Share your
// story" dialog.

import Link from "next/link";

import { chipClasses } from "@/components/ui/chip";
import { JsonLd } from "@/components/ui/json-ld";
import type { StoryCard } from "@/lib/data/top-lists";
import { getDictionary, type Lang } from "@/lib/i18n";
import { topListsStrings } from "@/lib/i18n/areas/top-lists";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { Kicker, breadcrumbLd } from "./bits";
import { STORY_CATEGORIES, plural, storyCategoryValue, withQuery, type StoryCategorySlug } from "./format";
import { ShareStory, type ShareLabels } from "./share-story";
import { StoryCard as StoryCardView } from "./story-player";
import { playerLabels, toStoryView } from "./story-model";

export function shareLabels(lang: Lang): ShareLabels {
  const t = topListsStrings(lang);
  return { ...t.share, open: t.stories.share };
}

export function shareSignInHref(lang: Lang): string {
  return routes.account(lang, { next: withQuery(routes.stories(lang), { share: 1 }) });
}

/** The page's "Share your story" button before the session is known. */
export function ShareStoryButton({ lang, signedIn }: { lang: Lang; signedIn: boolean | null }) {
  return <ShareStory lang={lang} labels={shareLabels(lang)} signedIn={signedIn} signInHref={shareSignInHref(lang)} activityHref={routes.accountActivity(lang)} />;
}

export function StoriesHeader({ lang, share }: { lang: Lang; share: React.ReactNode }) {
  const t = topListsStrings(lang);
  const dict = getDictionary(lang);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <JsonLd
        data={breadcrumbLd([
          { name: dict.breadcrumbs.home, url: `${SITE_URL}${routes.home(lang)}` },
          { name: dict.pages.stories.title, url: `${SITE_URL}${routes.stories(lang)}` },
        ])}
      />
      <div className="flex max-w-[45rem] flex-col gap-1.5">
        <Kicker>{t.stories.kicker}</Kicker>
        <h1 className="text-36 leading-[1.04] font-bold tracking-display text-balance sm:text-44">{t.stories.title}</h1>
        <p className="text-15.5 leading-[1.6] font-light text-muted">{t.stories.intro}</p>
      </div>
      {share}
    </div>
  );
}

export function StoriesGrid({ lang, stories, category }: { lang: Lang; stories: StoryCard[]; category: StoryCategorySlug | null }) {
  const t = topListsStrings(lang);
  const value = storyCategoryValue(category);
  const shown = value ? stories.filter((s) => s.category === value) : stories;
  const labels = playerLabels(lang);
  const base = routes.stories(lang);
  return (
    <>
      <nav aria-label={t.stories.filtersLabel} className="flex flex-wrap gap-1.5">
        {[null, ...STORY_CATEGORIES.map((c) => c.slug)].map((slug) => {
          const on = category === slug;
          return (
            <Link key={slug ?? "all"} href={withQuery(base, { category: slug })} scroll={false} aria-current={on ? "true" : undefined} className={chipClasses(on)}>
              {slug ? t.stories.categories[slug] : t.stories.all}
            </Link>
          );
        })}
      </nav>
      <p role="status" className="sr-only">
        {plural(shown.length, t.stories.countOne, t.stories.countMany)}
      </p>
      {shown.length > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.875rem),1fr))] gap-4">
          {shown.map((s) => (
            <li key={s.slug}>
              <StoryCardView story={toStoryView(lang, s)} labels={labels} deepLink />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-20 bg-cream p-5.5 text-15">
          {t.stories.empty}{" "}
          <Link href={base} className="font-medium">
            {t.stories.emptyLink}
          </Link>
        </p>
      )}
    </>
  );
}

export function StoryRules({ lang }: { lang: Lang }) {
  const t = topListsStrings(lang);
  return (
    <section aria-label={t.stories.rulesLabel} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.75rem),1fr))] gap-4 rounded-22 bg-cream p-5.5">
      {t.stories.rules.map((r) => (
        <div key={r.t} className="flex flex-col gap-1">
          <h2 className="text-15 font-semibold">{r.t}</h2>
          <p className="text-13 leading-[1.55] font-light text-muted">{r.d}</p>
        </div>
      ))}
    </section>
  );
}
