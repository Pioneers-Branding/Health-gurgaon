// Story data → what the client player needs, in the page language. Server-side helpers (they read
// the strings module, which client components must not import).

import type { StoryCard } from "@/lib/data/top-lists";
import type { Lang } from "@/lib/i18n";
import { tlData, topListsStrings } from "@/lib/i18n/areas/top-lists";
import { routes } from "@/lib/routes";
import { FLAG_REASONS } from "@/lib/validation/community";

import { firstSentence } from "./format";
import type { PlayerLabels, StoryView } from "./story-player";

export function toStoryView(lang: Lang, s: StoryCard): StoryView {
  const t = topListsStrings(lang);
  return {
    slug: s.slug,
    title: tlData(lang, s.title),
    who: tlData(lang, s.who),
    providerName: s.provider ? s.provider.name : s.providerName,
    providerHref: s.provider ? routes.provider(lang, s.provider.profileKind, s.provider.slug) : null,
    ownership: s.ownership,
    ownershipLabel: t.ownership[s.ownership] ?? s.ownershipLabel,
    duration: s.duration,
    meta: tlData(lang, s.meta),
    transcript: s.transcript,
    caption: firstSentence(s.transcript),
    written: s.format === "written",
    checks: { consented: s.checks.consented, visitConfirmed: s.checks.visitConfirmed, notPaid: s.checks.notPaid },
  };
}

export function playerLabels(lang: Lang): PlayerLabels {
  const t = topListsStrings(lang);
  return {
    lang,
    ...t.player,
    reasons: FLAG_REASONS.map((r) => ({ value: r, label: t.player.reasons[r] ?? r })),
    close: t.common.close,
    video: t.stories.video,
    written: t.stories.written,
    consent: t.stories.consent,
    play: t.stories.play,
    read: t.stories.read,
    watch: t.list.watchStory,
  };
}
