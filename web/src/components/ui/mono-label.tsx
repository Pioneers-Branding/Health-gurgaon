import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * The prototype's small uppercase label: Spline Sans Mono 500, 10.5px,
 * letter-spacing .06em. Used for kickers ("GURUGRAM · VERIFIED LOCAL
 * HEALTHCARE"), field captions ("REGISTRATION") and filter group titles.
 * Write the text in sentence case; CSS uppercases it (Hindi is unaffected).
 * The same style is available as the `mono-label` utility (add a size: `mono-label text-10.5`).
 */
export type MonoTone = "subtle" | "teal" | "saffron" | "caution" | "success" | "emergency" | "ink" | "onDark";
export type MonoSize = "10" | "10.5" | "11" | "12";

const tones: Record<MonoTone, string> = {
  subtle: "text-subtle",
  teal: "text-teal",
  saffron: "text-saffron",
  caution: "text-caution",
  success: "text-success",
  emergency: "text-emergency",
  ink: "text-ink",
  onDark: "text-on-dark-muted",
};

const sizes: Record<MonoSize, string> = {
  "10": "text-10",
  "10.5": "text-10.5",
  "11": "text-11",
  "12": "text-12",
};

type MonoElement = "span" | "p" | "div" | "h2" | "h3" | "dt" | "legend";

export function MonoLabel({
  as = "span",
  tone = "subtle",
  size = "10.5",
  className,
  children,
  id,
}: {
  as?: MonoElement;
  tone?: MonoTone;
  size?: MonoSize;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  const Element = as;
  return (
    <Element id={id} className={cn("mono-label", sizes[size], tones[tone], className)}>
      {children}
    </Element>
  );
}
