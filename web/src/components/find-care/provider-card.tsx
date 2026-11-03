// A Find care result card (prototype "results": initials, name + specialty, place · languages ·
// fee, ownership / type / verification / tags / CHECKED N DAYS AGO, View profile + Save).

import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { localityName as localityDisplayName } from "@/lib/localities";
import type { Lang } from "@/lib/i18n";
import { dataLabel, type FindCareStrings } from "@/lib/i18n/areas/find-care";
import { routes } from "@/lib/routes";
import type { SearchCard } from "@/lib/search";

import { CheckBadge, OwnershipPill, Stamp, TagPill, TypePill } from "./bits";
import { checkedAgo, feeLine, kmLabel } from "./format";
import { SaveButton } from "./save-button";

export function providerHref(lang: Lang, card: { profileKind: SearchCard["profileKind"]; slug: string }): string {
  return routes.provider(lang, card.profileKind, card.slug);
}

export function placeLabel(lang: Lang, card: { localitySlug: string | null; areaLabel: string | null }): string | null {
  if (card.localitySlug) return localityDisplayName(card.localitySlug, lang);
  return card.areaLabel;
}

export function languagesLabel(t: FindCareStrings, languages: string[]): string {
  return languages.map((l) => t.languages[l] ?? l).join(", ");
}

export function ProviderResultCard({
  lang,
  t,
  card,
  saved,
  signInHref,
  intent,
  headingAs: Heading = "h2",
}: {
  headingAs?: "h2" | "h3" | "p";
  lang: Lang;
  t: FindCareStrings;
  card: SearchCard;
  saved: boolean;
  signInHref: string;
  intent: "review" | "report" | "claim" | null;
}) {
  const href = providerHref(lang, card);
  const place = placeLabel(lang, card);
  const km = kmLabel(lang, t.km, card.distanceKm);
  const fee = feeLine(lang, t.card, card);
  const checked = checkedAgo(t.card, card.checkedDaysAgo);
  const facility = card.facilityType ? dataLabel(lang, card.facilityType.name) : null;

  return (
    <div className="flex flex-wrap items-start gap-3.5">
      <Avatar name={card.name} size="lg" className="text-16" />
      <div className="flex min-w-[min(100%,13.75rem)] flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Heading className="text-17.5 leading-snug font-semibold tracking-card">
            <Link href={href} className="text-ink hover:text-teal">
              {card.name}
            </Link>
          </Heading>
          <span className="text-13.5 font-light text-muted">{card.headline}</span>
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1.5 text-13 font-light text-ink-soft">
          {(place || km) && <span>{[place, km].filter(Boolean).join(" · ")}</span>}
          {card.languages.length > 0 && <span>{languagesLabel(t, card.languages)}</span>}
          {fee && <span>{fee}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <OwnershipPill ownership={card.ownership} t={t} />
          {facility && <TypePill>{facility}</TypePill>}
          {card.badge && <CheckBadge lang={lang} label={card.badge} />}
          {card.tags.map((tag) => (
            <TagPill key={tag}>{dataLabel(lang, tag)}</TagPill>
          ))}
          {checked && (
            <Stamp size="10.5" tone="subtle">
              {checked}
            </Stamp>
          )}
        </div>
      </div>
      <div className="flex min-w-35 flex-col gap-2">
        <ButtonLink href={href} variant="dark" size="sm">
          {t.card.viewProfile}
        </ButtonLink>
        {intent === "review" ? (
          <ButtonLink href={routes.review(lang, card.profileKind, card.slug)} variant="soft" size="sm">
            {t.card.writeReview}
          </ButtonLink>
        ) : intent === "report" ? (
          <ButtonLink href={routes.report(lang, card.profileKind, card.slug)} variant="soft" size="sm" className="whitespace-normal">
            {t.card.report}
          </ButtonLink>
        ) : intent === "claim" ? (
          <ButtonLink href={routes.claim(lang, card.profileKind, card.slug)} variant="soft" size="sm" className="whitespace-normal">
            {t.card.claim}
          </ButtonLink>
        ) : (
          <SaveButton
            lang={lang}
            slug={card.slug}
            name={card.name}
            initialSaved={saved}
            signInHref={signInHref}
            labels={{ save: t.card.save, saved: t.card.saved, saveLabel: t.card.saveLabel, signIn: t.card.signInToSave }}
          />
        )}
      </div>
    </div>
  );
}
