import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

/**
 * The content column: max 1240px, 24px gutters, centred. Every section of
 * every page sits in one. Full-bleed colour bands wrap a Container:
 *
 *   <section className="bg-cream"><Container className="py-14">…</Container></section>
 *
 * `size`: "page" (1240, default) · "form" (820, single-column forms) · "prose" (720).
 */
export function Container({
  as = "div",
  size = "page",
  className,
  children,
  ...rest
}: {
  as?: "div" | "section" | "header" | "footer" | "nav" | "article";
  size?: "page" | "form" | "prose";
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"div">, "children" | "className" | "ref">) {
  const Element = as as "div";
  return (
    <Element
      className={cn(
        "mx-auto w-full px-6",
        size === "page" && "max-w-page",
        size === "form" && "max-w-form",
        size === "prose" && "max-w-reading",
        className,
      )}
      {...rest}
    >
      {children}
    </Element>
  );
}
