// Saved & followed: what's new, saved places, saved events and follows, each with its latest
// checks. Prototype: "Health Gurgaon Account.dc.html" #saved.

import Link from "next/link";
import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import type { FollowEntry, MyAccount, MyActivity, MyConsent, SavedEntry } from "@/lib/data/account";
import { topicLabel } from "@/lib/domain";
import { fmt, getDictionary, type Lang } from "@/lib/i18n";
import { accountStrings, type AccountStrings } from "@/lib/i18n/areas/account";
import { getLocality } from "@/lib/localities";
import { SITE_URL } from "@/lib/i18n/metadata";
import { routes } from "@/lib/routes";

import { CalendarLink } from "./calendar-link";
import { dateShort, dateTile, dayLong, dayMonth, dayShort, daysUntil, listText, shortTitle } from "./format";
import { FollowAlerts, SavedChangesSwitch } from "./saved-controls";
import { RemoveButton, UndoList } from "./undo-list";

const H2 = "m-0 text-22 font-bold tracking-[-.025em]";
const count = "font-normal text-subtle";
const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** Badges as the data stores them, in Hindi where we know them. */
const BADGE_HI: Record<string, string> = {
  "Registration checked": "पंजीकरण जाँचा गया",
  "Facility checked": "सुविधा जाँची गई",
  "Clinic address checked": "क्लिनिक का पता जाँचा गया",
  "NABL accreditation seen": "NABL मान्यता देखी गई",
  "Emergency details sourced": "इमरजेंसी की जानकारी स्रोत से",
  "Hours checked": "समय जाँचा गया",
  "Credentials checked": "योग्यता जाँची गई",
};
const PRO_HI: Record<string, string> = { "Verified pharmacist": "सत्यापित फ़ार्मासिस्ट", "Verified doctor": "सत्यापित डॉक्टर" };

/** Data text (provider facts, sources) is stored in English: mark it on Hindi pages. */
function En({ lang, children }: { lang: Lang; children: ReactNode }) {
  return lang === "hi" ? <span lang="en">{children}</span> : <>{children}</>;
}

function EmptyBox({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-20 bg-cream p-5">
      <span className="text-16.5 font-semibold">{title}</span>
      <span className="max-w-[40rem] text-14 font-light leading-[1.6] text-ink-soft">{body}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

const ctaPrimary = "inline-flex min-h-11 items-center self-start rounded-pill bg-teal px-5 text-14 font-semibold text-white hover:bg-teal-dark hover:text-white";
const ctaOutline = "inline-flex min-h-11 items-center self-start rounded-pill border-[1.5px] border-ink bg-white px-5 text-14 font-medium text-ink hover:bg-cream hover:text-ink";

type Props = {
  lang: Lang;
  now: string;
  account: MyAccount;
  saved: SavedEntry[];
  follows: FollowEntry[];
  activity: MyActivity | null;
  consent: MyConsent | null;
};

export function SavedView({ lang, now, account, saved, follows, activity, consent }: Props) {
  const all = accountStrings(lang);
  const t = all.saved;
  const places = saved.filter((s) => s.provider);
  const events = saved.filter((s) => s.event);
  const typeOf = (purpose: string) => consent?.types.find((m) => m.purpose === purpose);
  const channelWord = (purpose: string) => (typeOf(purpose)?.channel === "email" && account.emailMasked ? all.common.email : all.common.whatsapp);
  const destOf = (purpose: string) => (typeOf(purpose)?.channel === "email" && account.emailMasked ? account.emailMasked : account.phoneMasked);
  const savedType = typeOf("saved_changes");
  const savedOn = !!savedType?.on;

  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-9 px-6 pt-5.5 pb-14">
      <p className="max-w-[45rem] text-15 font-light leading-[1.6] text-ink-soft">{t.intro}</p>

      <WhatsNew lang={lang} t={all} now={now} places={places} events={events} follows={follows} activity={activity}>
        <SavedChangesSwitch
          lang={lang}
          on={savedOn}
          title={fmt(t.swTitle, { channel: channelWord("saved_changes") })}
          note={savedOn ? fmt(t.swNoteOn, { dest: destOf("saved_changes") }) : t.swNoteOff}
          onLabel={t.swOn}
          offLabel={t.swOff}
          allMessages={t.allMessages}
          allMessagesHref={routes.accountConsent(lang)}
        />
      </WhatsNew>

      <section aria-labelledby="hg-saved-places" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="hg-saved-places" className={H2}>
            {t.placesTitle} <span className={count}>({places.length})</span>
          </h2>
          <Link href={routes.search(lang)} className="inline-flex min-h-11 items-center text-14 font-medium">
            {t.findCare}
          </Link>
        </div>
        {places.length > 0 && <p className="-mt-1.5 text-13.5 font-light leading-normal text-muted">{t.placesNote}</p>}
        <UndoList
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] items-start gap-3.5"
          items={places.map((p) => ({ key: `place-${p.targetId}`, content: <PlaceCard lang={lang} t={all} entry={p} /> }))}
          empty={
            <EmptyBox title={t.noPlacesTitle} body={t.noPlacesBody}>
              <Link href={routes.search(lang)} className={ctaPrimary}>
                {t.noPlacesCta}
              </Link>
            </EmptyBox>
          }
        />
      </section>

      <section aria-labelledby="hg-saved-events" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="hg-saved-events" className={H2}>
            {t.eventsTitle} <span className={count}>({events.length})</span>
          </h2>
          <Link href={routes.events(lang)} className="inline-flex min-h-11 items-center text-14 font-medium">
            {t.eventsLink}
          </Link>
        </div>
        <UndoList
          className="flex flex-col gap-3.5"
          items={events.map((e) => ({ key: `event-${e.targetId}`, content: <EventCard lang={lang} t={all} now={now} entry={e} /> }))}
          empty={
            <EmptyBox title={t.noEventsTitle} body={t.noEventsBody}>
              <Link href={routes.events(lang)} className={ctaPrimary}>
                {t.noEventsCta}
              </Link>
            </EmptyBox>
          }
        />
      </section>

      <section aria-labelledby="hg-following" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="hg-following" className={H2}>
            {t.followingTitle} <span className={count}>({follows.length})</span>
          </h2>
          <p className="max-w-[47.5rem] text-14 font-light leading-[1.55] text-ink-soft">{t.followingIntro}</p>
        </div>
        <UndoList
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] items-start gap-3.5"
          items={follows.map((f) => ({
            key: `follow-${f.kind}-${f.targetId}`,
            content: <FollowCard lang={lang} t={all} entry={f} channelWord={channelWord} destOf={destOf} consent={consent} />,
          }))}
          empty={
            <EmptyBox title={t.noFollowsTitle} body={t.noFollowsBody}>
              <Link href={routes.localities(lang)} className={ctaPrimary}>
                {t.noFollowsLocality}
              </Link>
              <Link href={routes.community(lang)} className={ctaOutline}>
                {t.noFollowsTopics}
              </Link>
            </EmptyBox>
          }
        />
      </section>
    </div>
  );
}

// ── What's new for you ───────────────────────────────────────────────────────

function WhatsNew({
  lang,
  t,
  now,
  places,
  events,
  follows,
  activity,
  children,
}: {
  lang: Lang;
  t: AccountStrings;
  now: string;
  places: SavedEntry[];
  events: SavedEntry[];
  follows: FollowEntry[];
  activity: MyActivity | null;
  children: ReactNode;
}) {
  const s = t.saved;
  type Item = { key: string; dot: string; title: string; detail: string; cta: ReactNode };
  const items: Item[] = [];

  for (const p of places) {
    const change = p.provider?.changesSinceSaved[0];
    if (!change) continue;
    const date = dateShort(lang, change.changedAt);
    items.push({
      key: `c-${p.targetId}`,
      dot: "bg-saffron",
      title: fmt(s.newChanged, { name: p.title, what: s.changeWhat[change.field] ?? s.changeWhatOther }),
      detail: `${change.summary} ${change.source ? fmt(s.confirmedBy, { source: change.source, date }) : fmt(s.confirmedOn, { date })}`,
      cta: (
        <a href={`#sv-${p.targetId}`} className={ctaOutline}>
          {s.seeChange}
        </a>
      ),
    });
  }
  for (const e of events) {
    const ev = e.event;
    if (!ev || !ev.verifiedSinceSaved || !ev.verifiedAt || daysUntil(now, ev.startsAt) < 0) continue;
    const note = ev.verifiedNote?.replace(/\.$/, "");
    items.push({
      key: `e-${e.targetId}`,
      dot: "bg-teal",
      title: fmt(s.newEventVerified, { title: e.title, day: dayShort(lang, ev.startsAt) }),
      detail: `${s.savedWhileAwaiting} ${note && lang === "en" ? fmt(s.verifiedOnNote, { note, date: dayMonth(lang, ev.verifiedAt) }) : fmt(s.verifiedOn, { date: dayMonth(lang, ev.verifiedAt) })}`,
      cta: (
        <CalendarLink
          id={`hg-new-cal-${e.targetId}`}
          uid={e.targetId}
          title={e.title}
          startsAt={ev.startsAt}
          endsAt={ev.endsAt}
          location={ev.venue}
          url={`${SITE_URL}${routes.event(lang, e.targetId)}`}
          label={s.addToCalendar}
          readyText={fmt(s.calendarReady, { when: `${dayShort(lang, ev.startsAt)}, ${ev.timeLabel}` })}
        />
      ),
    });
  }
  for (const f of follows) {
    const th = f.news.thread;
    if (f.kind !== "thread" || !th || th.newReplies < 1 || f.link.type !== "thread") continue;
    const title = shortTitle(f.title);
    const who = th.bestAnswerBy ? (lang === "hi" ? (PRO_HI[th.bestAnswerBy] ?? th.bestAnswerBy) : /^verified\b/i.test(th.bestAnswerBy) ? `a ${lowerFirst(th.bestAnswerBy)}` : th.bestAnswerBy) : null;
    items.push({
      key: `t-${f.targetId}`,
      dot: "bg-teal",
      title: th.newReplies === 1 ? s.newRepliesOne : fmt(s.newReplies, { n: th.newReplies }),
      detail: th.status === "resolved" ? (who ? fmt(s.resolvedBest, { title, who }) : fmt(s.resolvedPlain, { title })) : fmt(s.stillOpen, { title }),
      cta: (
        <Link href={routes.thread(lang, f.link.id)} className={ctaOutline}>
          {s.readReplies}
        </Link>
      ),
    });
  }
  const attn = activity?.attention ?? [];
  if (attn.length) {
    const reviews = attn.filter((a) => a.kind === "review").length;
    const evs = attn.filter((a) => a.kind === "event").length;
    const parts = [reviews ? (reviews === 1 ? s.reviewToFix : fmt(s.reviewsToFix, { n: reviews })) : "", evs ? (evs === 1 ? s.eventToUpdate : fmt(s.eventsToUpdate, { n: evs })) : ""];
    const what = listText(parts, t.common.and);
    items.push({
      key: "attn",
      dot: "bg-saffron",
      title: attn.length === 1 ? s.newAttnOne : fmt(s.newAttn, { n: attn.length }),
      detail: `${what.charAt(0).toUpperCase()}${what.slice(1)}.`,
      cta: (
        <ButtonLink href={routes.accountActivity(lang)} variant="dark" size="sm" className="self-start">
          {s.seeNeeded}
        </ButtonLink>
      ),
    });
  }

  return (
    <section aria-labelledby="hg-new-h" className="flex min-w-0 flex-col gap-0.5 rounded-20 border-2 border-ink px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2">
        <h2 id="hg-new-h" className={H2}>
          {s.newTitle}
        </h2>
        <span className="mono-label text-10.5 text-subtle">{fmt(s.checkedForYou, { date: dateShort(lang, now) })}</span>
      </div>
      {items.map((i) => (
        <div key={i.key} className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-line py-3">
          <span aria-hidden="true" className={cn("mt-1.25 size-3 flex-none self-start rounded-full", i.dot)} />
          <div className="flex min-w-0 flex-[1_1_16.25rem] flex-col gap-0.5">
            <span className="text-15 font-medium leading-[1.4]">{i.title}</span>
            <span className="text-13.5 font-light leading-normal text-muted">{i.detail}</span>
          </div>
          {i.cta}
        </div>
      ))}
      {!items.length && <p className="border-t border-line py-3.5 text-14 font-light leading-[1.55] text-muted">{s.noNews}</p>}
      {children}
    </section>
  );
}

// ── Saved places ─────────────────────────────────────────────────────────────

function PlaceCard({ lang, t, entry }: { lang: Lang; t: AccountStrings; entry: SavedEntry }) {
  const s = t.saved;
  const p = entry.provider!;
  const href = routes.provider(lang, p.profileKind, entry.targetId);
  const change = p.changesSinceSaved[0];
  const changed = !!change;
  const what = [p.headline, p.practiceLabel ?? p.area].filter(Boolean).join(" · ");

  let tag: string;
  let body: ReactNode;
  let src: ReactNode = null;
  let box = "bg-success-tint";
  let tagTone = "text-success";
  if (change) {
    tag = s.changedTag;
    box = "bg-pending-tint";
    tagTone = "text-caution";
    body = <En lang={lang}>{change.summary}</En>;
    src = change.source ? fmt(s.sourceLine, { source: change.source, date: dateShort(lang, change.changedAt) }) : fmt(s.sourceDate, { date: dateShort(lang, change.changedAt) });
  } else if (p.recheckedSinceSaved) {
    tag = s.reconfirmedTag;
    const facts: string[] = [];
    if (p.emergency24x7) facts.push(s.emergencyConfirmed);
    if (p.fee != null && p.fee > 0) facts.push(p.followUp ? fmt(s.feeStillTerms, { fee: p.fee, terms: p.followUp }) : fmt(s.feeStill, { fee: p.fee }));
    const hours = p.hoursSummary?.replace(/^Emergency open 24 hours · /, "");
    facts.push(hours && !(p.open24h && !p.emergency24x7 && /24/.test(hours)) ? fmt(s.hoursNow, { hours }) : s.hoursUnchanged);
    body = <En lang={lang}>{facts.join(" ")}</En>;
    src = p.lastCheckedAt ? (p.hoursSource ? fmt(s.sourceLine, { source: lowerFirst(p.hoursSource), date: dateShort(lang, p.lastCheckedAt) }) : fmt(s.sourceDate, { date: dateShort(lang, p.lastCheckedAt) })) : null;
  } else {
    tag = s.unchangedTag;
    box = "bg-cream";
    tagTone = "text-subtle";
    body = s.unchangedBody;
  }

  const more = p.myReports
    .filter((r) => r.status !== "rejected")
    .map((r) => {
      const field = (t.activity.field[r.field ?? ""] ?? t.activity.fieldOther).toLowerCase();
      if (r.status === "received" || r.status === "checking") {
        return {
          key: r.ref,
          icon: "",
          dot: "box-border border-3 border-saffron bg-white",
          text: r.field === "timings" ? fmt(s.reportCheckingHours, { ref: r.ref }) : fmt(s.reportChecking, { ref: r.ref, field }),
          src: fmt(s.reportDue, { day: dayShort(lang, r.dueAt) }),
          srcTone: "text-pending",
        };
      }
      const at = r.resolvedAt ? dateShort(lang, r.resolvedAt) : "";
      return r.status === "no_change"
        ? { key: r.ref, icon: "!", dot: "bg-caution text-white", text: fmt(s.reportNoChange, { resolution: r.resolution ?? "" }), src: fmt(s.reportSrc, { date: at, ref: r.ref }), srcTone: "text-caution" }
        : { key: r.ref, icon: "✓", dot: "bg-success text-white", text: fmt(s.reportFixed, { ref: r.ref, resolution: r.resolution ?? "" }), src: fmt(s.reportSrc, { date: at, ref: r.ref }), srcTone: "text-success" };
    });

  return (
    <article id={`sv-${entry.targetId}`} className={cn("flex min-w-0 scroll-mt-24 flex-col gap-3 rounded-20 bg-white", changed ? "border-2 border-saffron p-4.25" : "border border-line p-4.5")}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-12 flex-none items-center justify-center rounded-full bg-cream font-semibold text-teal">
          {p.initials}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="mono-label text-10.5 text-subtle">
            {s.kind[p.profileKind]} · {fmt(s.savedOn, { date: dateShort(lang, entry.savedAt) })}
          </span>
          <h3 className="m-0 text-[length:inherit]">
            <Link href={href} className="inline-flex min-h-11 items-center text-17 font-semibold leading-[1.3] tracking-card text-ink hover:text-teal">
              {entry.title}
            </Link>
          </h3>
          <span className="text-13.5 font-light leading-[1.45] text-muted">
            <En lang={lang}>{what}</En>
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {p.badges.map((b) => (
          <span key={b} className="rounded-pill bg-success-tint px-2.5 py-1 text-12 font-semibold text-success">
            ✓ {lang === "hi" ? (BADGE_HI[b] ?? b) : b}
          </span>
        ))}
        {p.sponsored ? (
          <span className="rounded-6 bg-ink px-2 py-0.75 font-mono text-10 font-medium uppercase leading-normal text-saffron">{lang === "hi" ? s.sponsorWeekly : (p.sponsorLabel ?? s.sponsorWeekly)}</span>
        ) : (
          <span className="rounded-pill border border-line-strong bg-white px-2.5 py-0.75 text-12 font-medium">{getDictionary(lang).badges.notSponsored}</span>
        )}
        {p.lastCheckedAt && <span className="mono-label py-1 text-10.5 font-normal text-subtle">{fmt(getDictionary(lang).stamps.lastChecked, { date: dateShort(lang, p.lastCheckedAt) })}</span>}
      </div>
      <div className={cn("flex flex-col gap-0.75 rounded-14 px-3.5 py-2.5", box)}>
        <span className={cn("mono-label text-10.5", tagTone)}>{tag}</span>
        <span className="text-14.5 font-medium leading-[1.45]">{body}</span>
        {src && (
          <span className="text-12.5 font-light leading-normal text-ink-soft">
            <En lang={lang}>{src}</En>
          </span>
        )}
      </div>
      {more.map((m) => (
        <div key={m.key} className="flex items-start gap-2.5">
          <span aria-hidden="true" className={cn("mt-px flex size-5.5 flex-none items-center justify-center rounded-full text-12 font-bold", m.dot)}>
            {m.icon}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-13.5 leading-normal">{m.text}</span>
            <span className={cn("mono-label text-10.5 font-normal leading-[1.6]", m.srcTone)}>{m.src}</span>
          </div>
        </div>
      ))}
      <div className="mt-0.5 flex flex-wrap gap-2">
        <ButtonLink href={href} variant="dark" size="sm" className="text-14">
          {s.open[p.profileKind]}
        </ButtonLink>
        <RemoveButton
          itemKey={`place-${entry.targetId}`}
          label={t.common.remove}
          ariaLabel={fmt(s.removeAria, { name: entry.title })}
          removal={{
            kind: "saved",
            fields: { kind: "provider", targetId: entry.targetId, lang },
            restoreAt: entry.savedAt,
            text: (
              <>
                {s.removedLead} <b className="font-semibold">{entry.title}</b> {s.removedTail}
              </>
            ),
            undoLabel: t.common.undo,
            undoAria: fmt(s.undoAria, { name: entry.title }),
          }}
        />
      </div>
    </article>
  );
}

// ── Saved events ─────────────────────────────────────────────────────────────

function EventCard({ lang, t, now, entry }: { lang: Lang; t: AccountStrings; now: string; entry: SavedEntry }) {
  const s = t.saved;
  const ev = entry.event!;
  const tile = dateTile(lang, ev.startsAt);
  const days = daysUntil(now, ev.startsAt);
  const when = days < 0 ? s.tookPlace : days === 0 ? s.today : days === 1 ? s.inOneDay : fmt(s.inDays, { n: days });
  const verified = ev.status === "verified";
  const cost = ev.cost === "Free" ? t.common.free : ev.cost;
  const href = routes.event(lang, entry.targetId);
  return (
    <article id={`sv-${entry.targetId}`} className="flex min-w-0 scroll-mt-24 flex-wrap items-start gap-3.5 rounded-20 border border-line p-4.5">
      <div aria-hidden="true" className="flex w-16 flex-none flex-col items-center rounded-14 bg-ink py-2.25 text-cream">
        <span className="font-mono text-10.5 font-medium uppercase text-saffron">{tile.dow}</span>
        <span className="text-24 font-bold leading-[1.1]">{tile.day}</span>
        <span className="font-mono text-10.5 uppercase">{tile.mon}</span>
      </div>
      <div className="flex min-w-0 flex-[1_1_16.25rem] flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-pill px-2.5 py-1 text-12 font-semibold", verified ? "bg-success-tint text-success" : "border border-dashed border-sponsored bg-pending-tint text-pending")}>
            {s.eventStatus[ev.status] ?? ev.status}
          </span>
          <span className="rounded-pill bg-cream px-2.5 py-1 text-12 font-medium">{cost}</span>
          {ev.eligibility && (
            <span className="rounded-pill bg-cream px-2.5 py-1 text-12 font-medium">
              <En lang={lang}>{ev.eligibility}</En>
            </span>
          )}
          <span className="mono-label text-10.5 font-normal text-subtle">
            {when} · {fmt(s.savedOn, { date: dayMonth(lang, entry.savedAt) })}
          </span>
        </div>
        <h3 className="m-0 text-[length:inherit]">
          <Link href={href} className="inline-flex min-h-11 items-center text-17 font-semibold leading-[1.3] tracking-card text-ink hover:text-teal">
            {entry.title}
          </Link>
        </h3>
        <span className="text-14.5 leading-normal">
          {dayLong(lang, ev.startsAt)} · {ev.timeLabel}
        </span>
        <span className="text-13.5 font-light leading-normal text-ink-soft">
          <En lang={lang}>{[ev.venue, fmt(s.organisedBy, { name: ev.organiserName })].filter(Boolean).join(" · ")}</En>
        </span>
        {ev.verifiedSinceSaved && ev.verifiedAt && (
          <div className="flex flex-col gap-0.75 rounded-14 bg-success-tint px-3.5 py-2.5">
            <span className="mono-label text-10.5 text-success">{s.verifiedSinceTag}</span>
            {ev.verifiedNote && (
              <span className="text-14 leading-normal">
                <En lang={lang}>{ev.verifiedNote}</En>
              </span>
            )}
            {ev.source && (
              <span className="text-12.5 font-light leading-normal text-ink-soft">
                <En lang={lang}>{fmt(s.eventSource, { source: ev.source })}</En>
              </span>
            )}
          </div>
        )}
        <span className="text-13 font-light leading-[1.55] text-muted">{s.bookNote}</span>
      </div>
      <div className="flex flex-[1_1_100%] flex-wrap gap-2">
        {days >= 0 && (
          <CalendarLink
            uid={entry.targetId}
            title={entry.title}
            startsAt={ev.startsAt}
            endsAt={ev.endsAt}
            location={ev.venue}
            url={`${SITE_URL}${href}`}
            label={s.addToCalendar}
            readyText={fmt(s.calendarReady, { when: `${dayShort(lang, ev.startsAt)}, ${ev.timeLabel}` })}
          />
        )}
        <ButtonLink href={href} variant="dark" size="sm" className="text-14">
          {s.eventDetails}
        </ButtonLink>
        <RemoveButton
          itemKey={`event-${entry.targetId}`}
          label={t.common.remove}
          ariaLabel={fmt(s.removeAria, { name: entry.title })}
          removal={{
            kind: "saved",
            fields: { kind: "event", targetId: entry.targetId, lang },
            restoreAt: entry.savedAt,
            text: (
              <>
                {s.removedLead} <b className="font-semibold">{entry.title}</b> {s.removedTail}
              </>
            ),
            undoLabel: t.common.undo,
            undoAria: fmt(s.undoAria, { name: entry.title }),
          }}
        />
      </div>
    </article>
  );
}

// ── Following ────────────────────────────────────────────────────────────────

function followHref(lang: Lang, f: FollowEntry): string {
  const l = f.link;
  switch (l.type) {
    case "locality":
      return routes.locality(lang, l.slug);
    case "thread":
      return routes.thread(lang, l.id);
    case "topic":
      return routes.community(lang, { topic: l.slug });
    case "society":
      return routes.society(lang, l.slug);
    case "provider":
      return routes.provider(lang, l.profileKind, l.slug);
    default:
      return routes.accountSaved(lang);
  }
}

function FollowCard({
  lang,
  t,
  entry: f,
  channelWord,
  destOf,
  consent,
}: {
  lang: Lang;
  t: AccountStrings;
  entry: FollowEntry;
  channelWord: (purpose: string) => string;
  destOf: (purpose: string) => string;
  consent: MyConsent | null;
}) {
  const s = t.saved;
  const key = `follow-${f.kind}-${f.targetId}`;
  const L = f.kind === "locality" ? getLocality(f.targetId) : undefined;
  const name = L ? (lang === "hi" ? L.nameHi : L.name) : f.kind === "topic" ? topicLabel(f.targetId, lang) : f.title;
  const typeInfo = consent?.types.find((m) => m.purpose === f.purpose);
  const typeLabel = typeInfo ? (lang === "hi" ? typeInfo.labelHi : typeInfo.label) : f.purpose;

  let sub: ReactNode = null;
  let news = "";
  if (f.kind === "locality") {
    sub = L ? fmt(s.covers, { covers: L.covers }) : null;
    const up = f.news.locality?.upcoming ?? [];
    const list = listText(
      up.map((e) => fmt(s.eventItem, { title: e.title, day: dayShort(lang, e.startsAt), status: e.status === "verified" ? s.statusVerified : s.statusAwaiting })),
      t.common.and,
    );
    news = up.length === 0 ? s.noEventsComing : fmt(up.length === 1 ? s.eventComing : s.eventsComing, { n: up.length, list });
  } else if (f.kind === "thread" && f.news.thread) {
    const th = f.news.thread;
    const status = th.status === "resolved" ? s.resolved : s.openStatus;
    sub = fmt(th.area ? s.threadSub : s.threadSubNoArea, { topic: topicLabel(th.topic, lang), area: th.area ?? "", n: th.replyCount, status });
    const since = dayMonth(lang, f.followedAt);
    news = th.newReplies === 0 ? fmt(s.threadNewsNone, { date: since }) : fmt(th.newReplies === 1 ? s.threadNewsOne : s.threadNews, { n: th.newReplies, date: since });
    if (th.status === "resolved") {
      const who = th.bestAnswerBy ? (lang === "hi" ? (PRO_HI[th.bestAnswerBy] ?? th.bestAnswerBy) : /^verified\b/i.test(th.bestAnswerBy) ? `a ${lowerFirst(th.bestAnswerBy)}` : th.bestAnswerBy) : null;
      news += who ? fmt(s.threadResolvedBest, { who }) : s.threadResolved;
    }
  } else if (f.kind === "topic") {
    sub = fmt(s.topicSub, { about: s.topicAbout[f.targetId] ?? name });
    const tp = f.news.topic;
    const latest = tp?.latest;
    news = !latest
      ? s.topicNewsEmpty
      : fmt(tp.newQuestions === 0 ? s.topicNewsNone : tp.newQuestions === 1 ? s.topicNewsOne : s.topicNews, { n: tp.newQuestions, title: latest.title, replies: latest.replyCount });
  } else {
    sub = f.subtitle;
  }

  const what = f.kind === "thread" ? s.thisDiscussion : name;
  const alerts = fmt(s.alerts[f.kind] ?? s.alerts.locality, { topic: name });
  const freq = s.freq[f.purpose] ?? "";
  const channel = channelWord(f.purpose);
  const dest = destOf(f.purpose);
  const note = f.alertsOn ? fmt(s.alertsNoteOn, { alerts, freq, channel, dest }) : f.wantsAlerts ? fmt(s.alertsNoteStopped, { type: typeLabel }) : s.alertsNoteOff;
  const heading = fmt(s.alertsAbout, { channel: channel === t.common.email ? t.common.emailCap : channel, what });

  return (
    <article id={`fl-${f.targetId}`} className="flex min-w-0 flex-col gap-2 rounded-20 border border-line p-4.5">
      <span className="mono-label text-10.5 text-teal">
        {s.followKind[f.kind] ?? f.kind} · {fmt(s.followingSince, { date: dateShort(lang, f.followedAt) })}
      </span>
      <h3 className="m-0 text-[length:inherit]">
        <Link href={followHref(lang, f)} className="inline-flex min-h-11 items-center text-16.5 font-semibold leading-[1.35] text-ink hover:text-teal">
          {name}
        </Link>
      </h3>
      {sub && <span className="text-13.5 font-light leading-normal text-muted">{sub}</span>}
      <p className="text-14 leading-[1.55] text-ink">
        <b className="mr-1.5 rounded-pill bg-saffron px-2 py-0.5 font-mono text-10.5 font-medium uppercase tracking-[.04em] text-ink">{s.newBadge}</b>
        {news}
      </p>
      <FollowAlerts
        lang={lang}
        itemKey={key}
        kind={f.kind}
        targetId={f.targetId}
        on={f.alertsOn}
        heading={heading}
        note={note}
        noteTone={f.alertsOn ? "on" : f.wantsAlerts ? "stopped" : "off"}
        ask={{ title: fmt(s.askTitle, { name: f.kind === "thread" ? shortTitle(f.title) : name }), body: fmt(s.askBody, { alerts, channel, dest, freq, type: typeLabel }) }}
        labels={{ noAlerts: s.noAlerts, sendAlerts: s.sendAlerts, askYes: s.askYes, askNo: s.askNo }}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <Link href={routes.accountConsent(lang)} className="inline-flex min-h-11 items-center text-14 font-medium">
              {s.allMsgsConsent}
            </Link>
            <RemoveButton
              itemKey={key}
              label={s.unfollow}
              ariaLabel={fmt(s.unfollowAria, { name })}
              removal={{
                kind: "follow",
                fields: { kind: f.kind, targetId: f.targetId, lang, from: "saved" },
                restoreAt: f.followedAt,
                alerts: f.alertsOn,
                text: fmt(s.unfollowed, { name }),
                undoLabel: t.common.undo,
                undoAria: fmt(s.undoFollowAria, { name }),
              }}
            />
          </div>
        }
      />
    </article>
  );
}
