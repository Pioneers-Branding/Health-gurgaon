// Events calendar. Prototype: "Health Gurgaon Local and Events.dc.html" #calendar.
// Filters (type, locality, free, verified), the month and the selected day are in the URL. The
// default view (all events of the opening month) renders into the static shell as the Suspense
// fallback, so the calendar is there without JavaScript and for crawlers; the URL's filters
// render under <Suspense>.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CALENDAR_LOCALITIES, CalendarBody } from "@/components/local-events/events-calendar";
import { parseEventFilters, type EventFilters } from "@/components/local-events/format";
import { getDefaultEventMonth } from "@/lib/data/events";
import { EVENT_TYPES } from "@/lib/domain";
import { getDictionary, type Lang } from "@/lib/i18n";
import { localEventsStrings, type LocalEventsStrings } from "@/lib/i18n/areas/local-events";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

type Props = PageProps<"/[lang]/gurgaon/events">;

const NO_FILTERS: EventFilters = { type: null, locality: null, free: false, verified: false, month: null, day: null };

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.events;
  return pageMetadata({ lang, href: (l) => routes.events(l), title: t.title, description: t.description });
}

export default async function EventsPage({ searchParams }: Props) {
  const lang = await getLang();
  const t = localEventsStrings(lang);
  const dict = getDictionary(lang);
  const defaultMonth = await getDefaultEventMonth();
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-5 px-6 pt-7 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2.5rem] leading-[1.1] font-bold tracking-display">{dict.pages.events.title}</h1>
          <p className="text-15 font-light text-muted">{t.calendar.sub}</p>
        </div>
        <Link href={routes.submitEvent(lang)} className="inline-flex min-h-12 items-center rounded-pill bg-ink px-5 text-14.5 font-medium text-cream hover:bg-ink-soft hover:text-cream">
          {t.calendar.submit}
        </Link>
      </div>
      <Suspense fallback={<CalendarBody lang={lang} t={t} filters={NO_FILTERS} defaultMonth={defaultMonth} />}>
        <CalendarForRequest lang={lang} t={t} defaultMonth={defaultMonth} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CalendarForRequest({ lang, t, defaultMonth, searchParams }: { lang: Lang; t: LocalEventsStrings; defaultMonth: { year: number; month: number }; searchParams: Props["searchParams"] }) {
  const filters = parseEventFilters(await searchParams, { types: EVENT_TYPES, localities: CALENDAR_LOCALITIES });
  return <CalendarBody lang={lang} t={t} filters={filters} defaultMonth={defaultMonth} />;
}
