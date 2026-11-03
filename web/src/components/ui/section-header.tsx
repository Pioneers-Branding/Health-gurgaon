import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { MonoLabel } from "./mono-label";

/**
 * Section heading row: optional mono kicker, h2, optional description on the
 * left; an optional action (ArrowLink or buttons) on the right. Wraps on phones.
 *   size md  24px (cards, side panels)
 *   size lg  30px (homepage sections; default)
 *   size xl  36px (dark feature bands)
 * tone "dark" for ink/teal bands: saffron kicker, cream text.
 */
export function SectionHeader({
  title,
  kicker,
  description,
  action,
  as = "h2",
  size = "lg",
  tone = "light",
  id,
  className,
}: {
  title: ReactNode;
  kicker?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: "md" | "lg" | "xl";
  tone?: "light" | "dark";
  id?: string;
  className?: string;
}) {
  const Heading = as;
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex max-w-[45rem] flex-col gap-1.5">
        {kicker && (
          <MonoLabel tone={tone === "dark" ? "saffron" : "teal"} size="11">
            {kicker}
          </MonoLabel>
        )}
        <Heading
          id={id}
          className={cn(
            "font-bold",
            size === "md" && "text-24 tracking-h3",
            size === "lg" && "text-26 tracking-h2 sm:text-30",
            size === "xl" && "text-30 leading-[1.06] tracking-h1 sm:text-36",
            tone === "dark" ? "text-cream" : "text-ink",
          )}
        >
          {title}
        </Heading>
        {description && (
          <p className={cn("text-14.5 font-light leading-[1.55]", tone === "dark" ? "text-on-dark" : "text-subtle")}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/** "All services →": teal 500 link with an arrow, 44px tall hit area. */
export function ArrowLink({
  href,
  children,
  size = "md",
  tone = "teal",
  className,
}: {
  href: string;
  children: ReactNode;
  size?: "sm" | "md";
  tone?: "teal" | "saffron";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center gap-1 font-medium",
        size === "sm" ? "text-13.5" : "text-14.5",
        tone === "saffron" ? "text-saffron hover:text-cream" : "text-teal",
        className,
      )}
    >
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
