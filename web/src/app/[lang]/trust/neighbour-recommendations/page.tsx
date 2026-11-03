// How neighbour recommendations work: the public method page. Prototype: "Neighbour
// Recommendation System.dc.html". Static: the method, the live demo (client) and, in "On the
// website", the real Sohna Road paediatrics widget and its top doctor's profile block from the
// cached neighbour scores.
import type { Metadata } from "next";

import { MethodView } from "@/components/top-lists/method-view";
import { getNeighbourRanking, getNeighbourSummary } from "@/lib/data/neighbours";
import { getProviderDiscussions } from "@/lib/data/providers";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

/** The example the method page shows (the prototype's "Paediatricians, Sohna Road"). */
const EXAMPLE = { locality: "sohna-road", specialty: "paediatrics" } as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.neighbourRecommendations;
  return pageMetadata({ lang, href: (l) => routes.neighbourRecommendations(l), title: t.title, description: t.description });
}

export default async function NeighbourRecommendationsPage() {
  const lang = await getLang();
  const { rows } = await getNeighbourRanking(EXAMPLE.locality, EXAMPLE.specialty);
  const first = rows.find((r) => r.rank === 1 && r.status === "ranked") ?? null;
  const [profile, threads] = first ? await Promise.all([getNeighbourSummary(first.provider.slug), getProviderDiscussions(first.provider.slug, 1)]) : [null, []];
  return (
    <MethodView
      lang={lang}
      live={{
        localitySlug: EXAMPLE.locality,
        ranking: rows,
        profile,
        threadHref: threads[0] ? routes.thread(lang, threads[0].id) : null,
      }}
    />
  );
}
