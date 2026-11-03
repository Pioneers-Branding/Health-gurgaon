import type { ReactNode } from "react";
import { getDictionary, type Lang } from "@/lib/i18n";
import { badgeClasses, OWNERSHIP_TONE, type BadgeSize, type BadgeTone, type Ownership } from "./badge-styles";
import { cn } from "./cn";

/**
 * Status pills. Every verification badge must be backed by a stored check
 * (who checked, how, when). Never show a badge the data can't support.
 *
 * Badge            generic: pick a tone, pass the text.
 * VerificationBadge the verification vocabulary (registration, facility,
 *                  organiser, community-submitted…), labels from the dictionary.
 * OwnershipBadge   Private (ink) · Government (blue) · Charitable (brown) · PPP (olive).
 * SponsoredTag     the black/saffron "SPONSORED" label. Sponsored content is
 *                  always labelled and kept apart from results (SponsoredBox).
 * NotSponsoredBadge white "Not sponsored" pill on profile headers.
 *
 * The colour and size classes live in badge-styles.ts (no dictionary import), so
 * Client Components, which are given their label, can draw the same pills.
 */
export { badgeClasses, isOwnership, OWNERSHIPS, type BadgeSize, type BadgeTone, type Ownership } from "./badge-styles";

export function Badge({
  tone = "neutral",
  size = "sm",
  className,
  children,
}: {
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
  children: ReactNode;
}) {
  return <span className={badgeClasses(tone, size, className)}>{children}</span>;
}

export type VerificationKind =
  | "registration"
  | "facility"
  | "organiser"
  | "community"
  | "credentials"
  | "hours"
  | "verified";

const verificationKey = {
  registration: "registrationChecked",
  facility: "facilityChecked",
  organiser: "organiserVerified",
  community: "communitySubmitted",
  credentials: "credentialsChecked",
  hours: "hoursChecked",
  verified: "verified",
} as const satisfies Record<VerificationKind, string>;

/**
 * ✓ Registration checked · ✓ Facility checked · ✓ Organiser verified ·
 * Awaiting review (community submitted, dashed) · ✓ Credentials checked …
 * `label` overrides the text (e.g. "Clinic address checked"), keeping the style.
 */
export function VerificationBadge({
  kind,
  lang,
  label,
  size = "sm",
  className,
}: {
  kind: VerificationKind;
  lang: Lang;
  label?: string;
  size?: BadgeSize;
  className?: string;
}) {
  const text = label ?? getDictionary(lang).badges[verificationKey[kind]];
  const pending = kind === "community";
  return (
    <Badge tone={pending ? "pending" : "success"} size={size} className={className}>
      {!pending && <span aria-hidden="true">✓</span>}
      {text}
    </Badge>
  );
}

export function OwnershipBadge({
  ownership,
  lang,
  size = "sm",
  className,
}: {
  ownership: Ownership;
  lang: Lang;
  size?: BadgeSize;
  className?: string;
}) {
  return (
    <Badge tone={OWNERSHIP_TONE[ownership]} size={size} className={className}>
      {getDictionary(lang).badges.ownership[ownership]}
    </Badge>
  );
}

/** Black label with saffron mono text: SPONSORED (or any label you pass). */
export function SponsoredTag({ lang, children, className }: { lang: Lang; children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center self-start rounded-6 bg-ink px-2 py-0.5 font-mono text-10.5 font-medium tracking-mono text-saffron uppercase",
        className,
      )}
    >
      {children ?? getDictionary(lang).badges.sponsored}
    </span>
  );
}

export function NotSponsoredBadge({ lang, size = "md", className }: { lang: Lang; size?: BadgeSize; className?: string }) {
  return (
    <Badge tone="white" size={size} className={className}>
      {getDictionary(lang).badges.notSponsored}
    </Badge>
  );
}
