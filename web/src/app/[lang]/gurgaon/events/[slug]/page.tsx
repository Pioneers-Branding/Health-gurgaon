// Event page. Prototype: "Health Gurgaon Local and Events.dc.html" #event.
// Public events (verified, awaiting review, cancelled, completed) are prerendered; unknown,
// rejected and "changes requested" events are real 404s. Events awaiting review are noindex until
// we've confirmed them with the organiser.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventView } from "@/components/local-events/event-view";
import { timeText } from "@/components/local-events/format";
import { getEvent, listEventSlugs } from "@/lib/data/events";
import { localEventsStrings } from "@/lib/i18n/areas/local-events";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";
import { longDay } from "@/components/local-events/bits";

type Props = PageProps<"/[lang]/gurgaon/events/[slug]">;

export async function generateStaticParams() {
  const slugs = await listEventSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) notFound();
  const t = localEventsStrings(lang);
  const when = `${longDay(lang, t, e.startsAt)}, ${timeText(lang, e.timeLabel, true)}`;
  return pageMetadata({
    lang,
    href: (l) => routes.event(l, slug),
    title: e.title,
    description: [when, e.venue, e.organiserName].filter(Boolean).join(" · "),
    noindex: e.status === "awaiting_review",
  });
}

export default async function EventPage({ params }: Props) {
  const lang = await getLang();
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) notFound();
  return <EventView lang={lang} t={localEventsStrings(lang)} e={e} />;
}
