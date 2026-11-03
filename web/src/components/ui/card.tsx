import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

/**
 * Cards. Default: white, 1px #efe3cf hairline, radius 20, 18px padding.
 *
 *   default    listings, facts, review cards
 *   cream      soft panels ("Are you Dr. …? Claim this profile")
 *   dark       ink panels (Health Report box, admin sidebar)
 *   outline    1.5px hairline, for "Is something wrong here?" style boxes
 *   sponsored  dashed saffron border on #FFFBF0 (use SponsoredBox for results)
 *
 * CardLink adds the prototype's hover ring (2px teal) to a whole-card link.
 */
export type CardTone = "default" | "cream" | "dark" | "outline" | "sponsored";
export type CardPadding = "none" | "sm" | "md" | "lg";

const tones: Record<CardTone, string> = {
  default: "border border-line bg-white text-ink",
  cream: "bg-cream text-ink",
  dark: "on-dark bg-ink text-cream",
  outline: "border-[1.5px] border-line bg-white text-ink",
  sponsored: "border-[1.5px] border-dashed border-sponsored bg-sponsored-tint text-ink",
};

const paddings: Record<CardPadding, string> = {
  none: "",
  sm: "p-3.5",
  md: "p-4.5",
  lg: "p-6",
};

export function cardClasses({
  tone = "default",
  padding = "md",
  className,
}: { tone?: CardTone; padding?: CardPadding; className?: string } = {}) {
  return cn("flex flex-col gap-3 rounded-card", tones[tone], paddings[padding], className);
}

type CardElement = "div" | "article" | "section" | "li" | "aside";

export type CardProps = {
  as?: CardElement;
  tone?: CardTone;
  padding?: CardPadding;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"div">, "children" | "className" | "ref">;

export function Card({ as = "div", tone, padding, className, children, ...rest }: CardProps) {
  const Element = as as "div";
  return (
    <Element className={cardClasses({ tone, padding, className })} {...rest}>
      {children}
    </Element>
  );
}

export type CardLinkProps = Omit<ComponentProps<typeof Link>, "children" | "className"> & {
  tone?: CardTone;
  padding?: CardPadding;
  className?: string;
  children: ReactNode;
};

export function CardLink({ tone = "default", padding, className, children, ...rest }: CardLinkProps) {
  return (
    <Link
      className={cardClasses({
        tone,
        padding,
        className: cn(
          "text-ink transition-shadow hover:text-ink hover:ring-2",
          tone === "dark" ? "text-cream hover:text-cream hover:ring-saffron" : "hover:ring-teal",
          className,
        ),
      })}
      {...rest}
    >
      {children}
    </Link>
  );
}
