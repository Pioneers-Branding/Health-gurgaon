// Badge colours and sizes as plain class strings, with no dictionary import, so Client Components
// can draw a badge too (they get the label as a prop). Server Components use the components in
// badge.tsx, which build on these.

import { cn } from "./cn";

export type BadgeTone =
  | "success"
  | "pending"
  | "neutral"
  | "white"
  | "dark"
  | "gov"
  | "caution"
  | "olive"
  | "info"
  | "emergency"
  | "saffron";

export type BadgeSize = "sm" | "md" | "lg";

export const BADGE_TONES: Record<BadgeTone, string> = {
  success: "bg-success-tint text-success",
  pending: "border border-dashed border-sponsored bg-pending-tint text-pending",
  neutral: "bg-cream text-ink",
  white: "bg-white text-ink font-medium",
  dark: "bg-ink text-cream",
  gov: "bg-gov text-white",
  caution: "bg-caution text-white",
  olive: "bg-olive text-white",
  info: "bg-gov-tint text-gov",
  emergency: "bg-emergency text-white",
  saffron: "bg-saffron text-ink",
};

/** sm: 11.5px cards · md: 12px profile headers · lg: 12.5px trust centre */
export const BADGE_SIZES: Record<BadgeSize, string> = {
  sm: "px-2.5 py-0.75 text-11.5",
  md: "px-2.75 py-1 text-12",
  lg: "px-3 py-1.25 text-12.5",
};

export function badgeClasses(tone: BadgeTone = "neutral", size: BadgeSize = "sm", className?: string): string {
  return cn("inline-flex items-center gap-1 rounded-pill font-semibold leading-tight whitespace-nowrap", BADGE_TONES[tone], BADGE_SIZES[size], className);
}

/** Who runs a facility (the Prisma `Ownership` enum): Private (ink) · Government (blue) ·
 * Charitable (brown) · PPP, a public-private partnership (olive). */
export const OWNERSHIPS = ["private", "government", "charitable", "ppp"] as const;
export type Ownership = (typeof OWNERSHIPS)[number];

export const isOwnership = (value: string | null | undefined): value is Ownership => !!value && (OWNERSHIPS as readonly string[]).includes(value);

export const OWNERSHIP_TONE: Record<Ownership, BadgeTone> = { private: "dark", government: "gov", charitable: "caution", ppp: "olive" };
