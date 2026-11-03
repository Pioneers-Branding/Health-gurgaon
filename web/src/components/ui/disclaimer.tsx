import type { ReactNode } from "react";
import { getDictionary, type Lang } from "@/lib/i18n";
import { cn } from "./cn";

/**
 * Standard small print. Pass one or more kinds, your own text, or both.
 *   medical       "This page is general information, not medical advice."
 *   listing       "Listing order and this profile are not influenced by payment."
 *   community     "Neighbours share experiences, not medical advice…"
 *   emergency     "In an emergency call 112 (ambulance 108)."
 *   verification  "Verification confirms identity… It doesn't rate clinical quality."
 */
export type DisclaimerKind = "medical" | "listing" | "community" | "emergency" | "verification";

export function Disclaimer({
  lang,
  kinds = [],
  className,
  children,
}: {
  lang: Lang;
  kinds?: DisclaimerKind[];
  className?: string;
  children?: ReactNode;
}) {
  const t = getDictionary(lang).disclaimers;
  return (
    <p className={cn("text-12 font-light leading-[1.55] text-subtle", className)}>
      {kinds.map((k) => t[k]).join(" ")}
      {kinds.length > 0 && children ? " " : null}
      {children}
    </p>
  );
}
