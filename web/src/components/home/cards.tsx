// Homepage cards (Server Components): a "Recently verified" listing, a featured hospital, an
// event row and the hero's next camp. Prototype: "Health Gurgaon Homepage.dc.html".

import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge, isOwnership, OwnershipBadge, VerificationBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { FreshnessStamp } from "@/components/ui/freshness-stamp";
import { EventStatusPill, eventStatusKind, statusLabel, tileParts } from "@/components/local-events/bits";
import { timeText } from "@/components/local-events/format";
import type { EventCard } from "@/lib/data/events";
import type { FeaturedProviderCard } from "@/lib/data/providers";
import type { ProviderCard } from "@/lib/data/mappers";
import { fmt, formatDate, getDictionary, isoDate, type Lang } from "@/lib/i18n";
import { homeData, homeStrings } from "@/lib/i18n/areas/home";
import { dataText, localEventsStrings } from "@/lib/i18n/areas/local-events";
import { localityName } from "@/lib/localities";
import { routes } from "@/lib/routes";

import { cardFacts, heroWhen, metaText, placeText } from "./format";

/** Stored data is English: mark it on Hindi pages so screen readers pronounce it right. */
export function dataLang(lang: Lang): "en" | undefined {
  return lang === "hi" ? "en" : undefined;
}

function OwnershipPill({ lang, ownership, label }: { lang: Lang; ownership: string; label: string }) {
  return isOwnership(ownership) ? <OwnershipBadge ownership={ownership} lang={lang} /> : <Badge tone="dark">{label}</Badge>;
}

/** "Recently verified near …": initials, name, type, three facts, badge + CHECKED date, View profile / Contact. */
export function RecentCard({ lang, card }: { lang: Lang; card: ProviderCard }) {
  const t = homeStrings(lang);
  const d = getDictionary(lang).home.recentlyVerified;
  const href = routes.provider(lang, card.profileKind, card.slug);
  const facts = cardFacts(lang, t, { ...card, localityName: card.localitySlug ? localityName(card.localitySlug, lang) : null });
  return (
    <article className="flex w-full flex-col gap-3 rounded-20 border border-line bg-white p-4.5">
      <div className="flex items-center gap-3">
        <Avatar name={card.name} size="md" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 lang={dataLang(lang)} className="text-16 font-semibold tracking-card">
            {card.name}
          </h3>
          <span lang={dataLang(lang)} className="text-13 font-light text-muted">
            {card.headline}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-1.25 text-13 font-light text-ink-soft">
        {facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {card.badge && <VerificationBadge kind="verified" lang={lang} label={homeData(lang, card.badge)} />}
        {card.lastCheckedAt && <FreshnessStamp date={card.lastCheckedAt} lang={lang} />}
      </div>
      <div className="mt-auto flex gap-2">
        <ButtonLink href={href} variant="dark" size="sm" className="flex-1" aria-label={fmt(t.profileAria, { name: card.name })}>
          {d.viewProfile}
        </ButtonLink>
        <ButtonLink href={href} variant="soft" size="sm" className="flex-1" aria-label={fmt(t.contactAria, { name: card.name })}>
          {d.contact}
        </ButtonLink>
      </div>
    </article>
  );
}

/** "Hospitals serving …": photo strip (24×7 emergency), ownership + type, name, meta, highlights, neighbours + checked month. */
export function HospitalCard({ lang, h }: { lang: Lang; h: FeaturedProviderCard & { recommendedBy: number } }) {
  const t = homeStrings(lang);
  const d = getDictionary(lang).home.featuredHospitals;
  const reco = h.recommendedBy === 1 ? t.recommendedOne : h.recommendedBy > 1 ? fmt(d.recommendedBy, { count: h.recommendedBy }) : null;
  return (
    <Link
      href={routes.provider(lang, h.provider.profileKind, h.provider.slug)}
      className="flex w-full flex-col overflow-hidden rounded-22 border border-line bg-white text-ink transition-shadow hover:text-ink hover:ring-2 hover:ring-teal"
    >
      <span className="relative block h-30 bg-stripes">
        {h.photoLabel && (
          <span className="absolute top-3 left-3 rounded-5 bg-cream px-1.75 py-0.75 font-mono text-10 text-subtle">
            {fmt(t.photo, { photo: homeData(lang, h.photoLabel) })}
          </span>
        )}
        {h.emergency24x7 && (
          <span className="absolute bottom-3 left-3 rounded-pill bg-emergency px-2.25 py-0.75 text-11 font-semibold text-white">{d.emergency247}</span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-2 px-4 pt-4 pb-4.5">
        <span className="flex flex-wrap gap-1.5">
          <OwnershipPill lang={lang} ownership={h.ownership} label={h.ownershipLabel} />
          {h.facilityType && <Tag tone="type">{homeData(lang, h.facilityType)}</Tag>}
        </span>
        <span lang={dataLang(lang)} className="text-17 leading-[1.3] font-semibold tracking-card">
          {h.provider.name}
        </span>
        <span className="text-13 font-light text-muted">{metaText(lang, h.metaLine)}</span>
        {h.highlights.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {h.highlights.map((x) => (
              <Tag key={x} tone="outline">
                {homeData(lang, x)}
              </Tag>
            ))}
          </span>
        )}
        <span className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
          {reco && <span className="text-12.5 font-medium text-teal">{reco}</span>}
          {h.checkedAt && <FreshnessStamp date={h.checkedAt} lang={lang} tone="success" precision="month" size="10" />}
        </span>
      </span>
    </Link>
  );
}

/** The place an event happens, short: "Sector 57 Community Centre" (venue up to the first comma), or the locality. */
function eventWhere(lang: Lang, e: EventCard): string {
  if (e.isOnline) return localEventsStrings(lang).online;
  const venue = e.venue?.split(",")[0]?.trim();
  return venue || (e.localitySlug ? localityName(e.localitySlug, lang) : "");
}

/** "Health camps & events" row: date tile, status + type, title, place · time · cost · organiser. */
export function EventRow({ lang, e }: { lang: Lang; e: EventCard }) {
  const le = localEventsStrings(lang);
  const kind = eventStatusKind(e);
  const tile = tileParts(lang, le, e);
  const meta = [e.venue ? placeText(lang, e.venue) : eventWhere(lang, e), timeText(lang, e.timeLabel), dataText(lang, e.cost), e.organiserName].filter(Boolean).join(" · ");
  return (
    <Link href={routes.event(lang, e.slug)} className="flex w-full items-center gap-4 rounded-20 bg-white p-4 text-ink transition-shadow hover:text-ink hover:ring-2 hover:ring-teal">
      <span aria-hidden="true" className="flex w-17 flex-none flex-col items-center rounded-14 bg-ink py-2.5 text-cream">
        <span className="font-mono text-11 font-medium text-saffron">{tile.dow}</span>
        <span className="text-26 leading-[1.1] font-bold">{tile.day}</span>
        <span className="font-mono text-11">{tile.mon}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.25">
        <span className="flex flex-wrap items-center gap-1.5">
          <EventStatusPill kind={kind} label={statusLabel(le, kind)} />
          <span className="text-11.5 font-medium text-subtle">{le.types[e.type]?.one ?? e.typeLabel}</span>
          <time dateTime={isoDate(e.startsAt)} className="sr-only">
            {formatDate(lang, e.startsAt, "long")}
          </time>
        </span>
        <span lang={dataLang(lang)} className="text-16.5 leading-[1.3] font-semibold tracking-card">
          {e.title}
        </span>
        <span className="text-13 font-light text-muted">{meta}</span>
      </span>
    </Link>
  );
}

/** The hero photo's card: NEXT CAMP NEAR <PLACE> · ✓ Organiser verified · title · when · where · cost. */
export function NextCampCard({ lang, place, e }: { lang: Lang; place: string; e: EventCard | null }) {
  const t = homeStrings(lang);
  const d = getDictionary(lang).home;
  return (
    <div className="absolute right-5 bottom-5 left-5 flex flex-col gap-2 rounded-20 bg-white px-5 py-4.5 shadow-float">
      <div className="flex items-center justify-between gap-2.5">
        <span className="mono-label text-11 text-teal">{fmt(d.nextCampNear, { place })}</span>
        {e && <VerificationBadge kind="organiser" lang={lang} className="whitespace-normal" />}
      </div>
      {e ? (
        <>
          <Link href={routes.event(lang, e.slug)} lang={dataLang(lang)} className="text-19 leading-[1.25] font-semibold tracking-title text-ink hover:text-teal">
            {e.title}
          </Link>
          <span className="text-13.5 font-light text-muted">
            {[heroWhen(lang, t, e.startsAt, e.timeLabel), eventWhere(lang, e), dataText(lang, e.cost)].filter(Boolean).join(" · ")}
          </span>
        </>
      ) : (
        <>
          <span className="text-15 font-medium">{t.noCamp}</span>
          <Link href={routes.events(lang)} className="text-13.5 font-medium">
            {t.seeCalendar}
          </Link>
        </>
      )}
    </div>
  );
}
