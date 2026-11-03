// The events calendar (prototype #calendar): type chips, locality, Free only and Verified only;
// a month grid where days with events are links (?day=15); and the list of the month's (or the
// day's) events. Every filter is in the URL. Server Component.

import Link from "next/link";

import { ChipLink } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { getEventMonth, type EventCard } from "@/lib/data/events";
import { CALENDAR_TYPE_CHIPS } from "@/lib/domain";
import { localityName, type Lang } from "@/lib/i18n";
import type { LocalEventsStrings } from "@/lib/i18n/areas/local-events";
import { dataText } from "@/lib/i18n/areas/local-events";
import { SITE_URL } from "@/lib/i18n/metadata";
import { LOCALITIES, getLocality } from "@/lib/localities";
import { routes } from "@/lib/routes";

import { EventStatusPill, eventStatusKind, statusLabel, tileParts } from "./bits";
import { AddToCalendar, EventFilterForm } from "./event-client";
import { eventsHref, fill, filterEvents, icsHref, monthKey, monthsBetween, plural, shiftMonth, timeText, type EventFilters } from "./format";

export const CALENDAR_LOCALITIES = LOCALITIES.map((l) => l.slug);

/** Where an event is, for cards: "Sohna Road" / "Online" in the page language. */
export function eventPlace(lang: Lang, t: LocalEventsStrings, e: Pick<EventCard, "isOnline" | "localitySlug" | "venue">): string {
  if (e.isOnline) return t.online;
  const L = getLocality(e.localitySlug);
  return L ? localityName(lang, L) : (e.venue ?? "");
}

export async function CalendarBody({
  lang,
  t,
  filters,
  defaultMonth,
}: {
  lang: Lang;
  t: LocalEventsStrings;
  filters: EventFilters;
  defaultMonth: { year: number; month: number };
}) {
  const shown = filters.month ? { year: +filters.month.slice(0, 4), month: +filters.month.slice(5, 7) } : defaultMonth;
  const cal = await getEventMonth(shown.year, shown.month);
  const monthParam = filters.month;
  const all = cal.days.flatMap((d) => d.events);
  const matching = filterEvents(all, filters);
  const byDay = new Map<number, EventCard[]>();
  for (const e of matching) {
    const day = Number(e.tile.day);
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  const day = filters.day;
  const list = day ? (byDay.get(day) ?? []) : matching;
  const monthName = t.months[shown.month - 1];
  const monthLabel = `${monthName} ${shown.year}`;
  const base = { ...filters, day: null };
  const prev = shiftMonth(shown, -1);
  const next = shiftMonth(shown, 1);
  const canPrev = monthsBetween(defaultMonth, prev) >= -12;
  const canNext = monthsBetween(defaultMonth, next) <= 12;
  const tc = t.calendar;

  const listTitle = day
    ? fill(plural(list.length, tc.dayTitleOne, tc.dayTitleMany), { day, month: monthName })
    : plural(list.length, tc.monthOne, tc.monthMany);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <div role="group" aria-label={tc.typeLabel} className="contents">
          <ChipLink href={eventsHref(lang, { ...base, type: null })} selected={!filters.type} scroll={false}>
            {tc.all}
          </ChipLink>
          {CALENDAR_TYPE_CHIPS.map((type) => (
            <ChipLink key={type} href={eventsHref(lang, { ...base, type })} selected={filters.type === type} scroll={false}>
              {t.types[type].chip}
            </ChipLink>
          ))}
        </div>
        <EventFilterForm action={routes.events(lang)} label={tc.filtersLabel} applyLabel={tc.apply}>
          {filters.type && <input type="hidden" name="type" value={filters.type} />}
          {monthParam && <input type="hidden" name="month" value={monthParam} />}
          <label className="sr-only" htmlFor="ev-locality">
            {tc.locality}
          </label>
          <select
            id="ev-locality"
            name="locality"
            defaultValue={filters.locality ?? "all"}
            key={filters.locality ?? "all"}
            className="min-h-11 max-w-full cursor-pointer rounded-pill border-[1.5px] border-line-strong bg-white px-3 text-13.5 text-ink hover:border-subtle"
          >
            <option value="all">{tc.allLocalities}</option>
            {LOCALITIES.map((L) => (
              <option key={L.slug} value={L.slug}>
                {localityName(lang, L)}
              </option>
            ))}
            <option value="online">{t.online}</option>
          </select>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-13.5">
            <input type="checkbox" name="free" value="1" defaultChecked={filters.free} key={`free-${filters.free}`} className="size-4.5 accent-teal" />
            {tc.freeOnly}
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-13.5">
            <input type="checkbox" name="verified" value="1" defaultChecked={filters.verified} key={`verified-${filters.verified}`} className="size-4.5 accent-teal" />
            {tc.verifiedOnly}
          </label>
        </EventFilterForm>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 min-[880px]:grid-cols-[minmax(0,23.75rem)_minmax(0,1fr)]">
        <section aria-labelledby="ev-month" className="flex flex-col gap-2.5 rounded-22 border border-line p-4.5">
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <h2 id="ev-month" className="text-17 font-semibold whitespace-nowrap">
              {monthLabel}
            </h2>
            <div className="ml-auto flex items-center">
              {day ? (
                <Link href={eventsHref(lang, base)} scroll={false} className="inline-flex min-h-11 items-center px-1 text-13 whitespace-nowrap">
                  {tc.showAll}
                </Link>
              ) : null}
              {canPrev && (
                <Link href={eventsHref(lang, { ...base, month: monthKey(prev.year, prev.month) })} scroll={false} aria-label={tc.prev} className="inline-flex size-11 items-center justify-center rounded-pill text-18 text-ink hover:bg-cream hover:text-ink">
                  <span aria-hidden="true">‹</span>
                </Link>
              )}
              {canNext && (
                <Link href={eventsHref(lang, { ...base, month: monthKey(next.year, next.month) })} scroll={false} aria-label={tc.next} className="inline-flex size-11 items-center justify-center rounded-pill text-18 text-ink hover:bg-cream hover:text-ink">
                  <span aria-hidden="true">›</span>
                </Link>
              )}
            </div>
          </div>
          <div aria-hidden="true" className="grid grid-cols-7 gap-1 text-center font-mono text-10.5 font-medium text-subtle">
            {t.weekdaysShort.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <ol aria-label={fill(tc.calendarLabel, { month: monthLabel })} className="grid grid-cols-7 gap-1">
            {Array.from({ length: cal.firstWeekday }, (_, i) => (
              <li key={`blank-${i}`} aria-hidden="true" />
            ))}
            {cal.days.map(({ day: n }) => {
              const events = byDay.get(n) ?? [];
              const has = events.length > 0;
              const sel = day === n;
              const dot = events.some((e) => e.verified) ? "bg-teal" : events.some((e) => e.status === "awaiting_review") ? "bg-saffron" : has ? "bg-phase" : "bg-transparent";
              const weekday = (cal.firstWeekday + n - 1) % 7;
              const dateText = lang === "hi" ? `${t.weekdays[weekday]}, ${n} ${monthName}` : `${t.weekdays[weekday]} ${n} ${monthName}`;
              const cell = cn(
                "flex aspect-square flex-col items-center justify-center gap-0.75 rounded-10 text-13.5",
                sel ? "border-2 border-ink bg-ink font-semibold text-cream hover:text-cream" : has ? "border border-[#f3eadb] bg-cream font-semibold text-ink hover:border-ink hover:text-ink" : "border border-[#f3eadb] bg-white font-light text-[#b5a592]",
              );
              return (
                <li key={n}>
                  {has ? (
                    <Link
                      href={eventsHref(lang, { ...filters, day: sel ? null : n })}
                      scroll={false}
                      aria-current={sel ? "date" : undefined}
                      aria-label={fill(plural(events.length, tc.dayOne, tc.dayMany), { date: dateText })}
                      className={cell}
                    >
                      <span>{n}</span>
                      <span className={cn("size-1.5 rounded-full", sel ? "bg-saffron" : dot)} />
                    </Link>
                  ) : (
                    <span className={cell}>
                      <span>{n}</span>
                      <span className="size-1.5" />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap gap-3.5 text-11.5 font-light text-subtle">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-teal" />
              {tc.legendVerified}
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-saffron" />
              {tc.legendAwaiting}
            </span>
          </div>
        </section>

        <section aria-labelledby="ev-list-title" aria-live="polite" className="flex min-w-0 flex-col gap-2.5">
          <h2 id="ev-list-title" className="text-16 font-semibold">
            {listTitle}
          </h2>
          {list.map((e) => (
            <EventListCard key={e.slug} lang={lang} t={t} e={e} />
          ))}
          {list.length === 0 && (
            <div className="flex flex-col gap-2 rounded-20 bg-cream p-6">
              <p className="text-17 font-semibold">{tc.noneTitle}</p>
              <p className="text-14 font-light text-muted">{tc.noneBody}</p>
              <Link href={routes.submitEvent(lang)} className="inline-flex min-h-11 items-center self-start rounded-pill bg-teal px-4.5 text-14 text-white hover:bg-teal-dark hover:text-white">
                {tc.noneSubmit}
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function EventListCard({ lang, t, e }: { lang: Lang; t: LocalEventsStrings; e: EventCard }) {
  const tile = tileParts(lang, t, e);
  const kind = eventStatusKind(e);
  const href = routes.event(lang, e.slug);
  const cost = dataText(lang, e.cost);
  return (
    <article className="flex flex-wrap items-center gap-3.5 rounded-20 border border-line p-4">
      <div aria-hidden="true" className="flex w-16 flex-none flex-col items-center rounded-14 bg-ink py-2.25 text-cream">
        <span className="font-mono text-10.5 font-medium text-saffron">{tile.dow}</span>
        <span className="text-24 leading-[1.1] font-bold">{tile.day}</span>
        <span className="font-mono text-10.5">{tile.mon}</span>
      </div>
      <div className="flex min-w-[13.75rem] flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <EventStatusPill kind={kind} label={statusLabel(t, kind)} />
          <span className="text-11.5 font-medium text-subtle">
            {t.types[e.type]?.chip ?? e.typeLabel} · {cost}
          </span>
        </div>
        <h3 lang={lang === "hi" ? "en" : undefined} className="text-16 font-semibold">
          <Link href={href} className={cn("text-ink hover:text-teal", kind === "cancelled" && "line-through decoration-1")}>
            {e.title}
          </Link>
        </h3>
        <p className="text-13 font-light text-muted">
          {eventPlace(lang, t, e)} · {timeText(lang, e.timeLabel)} · {e.organiserName}
        </p>
      </div>
      <div className="flex gap-1.5">
        {kind !== "cancelled" && (
          <AddToCalendar
            href={icsHref({ uid: e.slug, title: e.title, startsAt: e.startsAt, endsAt: e.endsAt, location: e.isOnline ? t.online : [e.venue, eventPlace(lang, t, e)].filter(Boolean).join(", "), url: `${SITE_URL}${href}` })}
            fileName={`${e.slug}.ics`}
            label={t.calendar.addToCalendar}
            doneLabel={t.calendar.inCalendar}
          />
        )}
        <Link href={href} aria-label={fill(t.calendar.detailsAria, { title: e.title })} className="inline-flex min-h-11 items-center rounded-pill bg-ink px-3.5 text-13 text-cream hover:bg-ink-soft hover:text-cream">
          {t.calendar.details}
        </Link>
      </div>
    </article>
  );
}
