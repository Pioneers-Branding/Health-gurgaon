import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

/**
 * Pill buttons from the prototype. Every size is at least 44px tall.
 *
 *   primary       teal, white text            "Search", "Show clinic phone"
 *   dark          ink, cream text             "Sign in", "View profile", "Write a review"
 *   outline       1.5px ink border, white     "Contribute", "Directions", "Suggest a correction"
 *   soft          1.5px hairline border       "Save", "Back"
 *   ghost         text-only teal              "Clear all", "Helpful (12)"
 *   saffron       saffron, ink text           "All top lists →", "Sign in with OTP"
 *   cream         cream on teal/dark bands    "Register your society"
 *   outlineLight  cream border on dark bands  "See how it works"
 *   danger        emergency red               "Reject", "SOS 112"
 */
export type ButtonVariant =
  | "primary"
  | "dark"
  | "outline"
  | "soft"
  | "ghost"
  | "saffron"
  | "cream"
  | "outlineLight"
  | "danger";

/** sm 44px · 13.5px text | md 44px · 14.5px | lg 48px · 14.5px | xl 56px · 16px */
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center gap-2 text-center font-medium leading-tight whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-45 aria-disabled:opacity-45 no-underline";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-teal text-white hover:bg-teal-dark hover:text-white",
  dark: "bg-ink text-cream hover:bg-ink-soft hover:text-cream",
  outline: "border-[1.5px] border-ink bg-white text-ink hover:bg-cream hover:text-ink",
  soft: "border-[1.5px] border-line-strong bg-white text-ink hover:border-ink hover:text-ink",
  ghost: "text-teal hover:text-ink hover:underline underline-offset-4",
  saffron: "bg-saffron font-semibold text-ink hover:bg-saffron-soft hover:text-ink",
  cream: "bg-cream font-semibold text-ink hover:bg-white hover:text-ink",
  outlineLight: "border-[1.5px] border-cream text-white hover:bg-white/10 hover:text-white",
  danger: "bg-emergency font-semibold text-white hover:bg-[#8f1c13] hover:text-white",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 text-13.5",
  md: "min-h-11 px-4.5 text-14.5",
  lg: "min-h-12 px-5 text-14.5",
  xl: "min-h-14 px-6.5 text-16",
};

const ghostSizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-1.5 text-13",
  md: "min-h-11 px-1.5 text-14",
  lg: "min-h-12 px-1.5 text-14.5",
  xl: "min-h-14 px-2 text-16",
};

/** pill: radius 999 (default) · rounded: radius 14 (phone menu sheet, big tiles) */
export type ButtonShape = "pill" | "rounded";

export function buttonClasses({
  variant = "dark",
  size = "md",
  shape = "pill",
  full = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  full?: boolean;
  className?: string;
} = {}): string {
  return cn(
    base,
    shape === "pill" ? "rounded-pill" : "rounded-14",
    variants[variant],
    variant === "ghost" ? ghostSizes[size] : sizes[size],
    full && "w-full",
    className,
  );
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  /** Stretch to the container width. */
  full?: boolean;
  children: ReactNode;
};

export type ButtonProps = CommonProps & Omit<ComponentProps<"button">, "children">;

/** A real <button>. Defaults to type="button" so it never submits by accident. */
export function Button({ variant, size, shape, full, className, type = "button", children, ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, shape, full, className })} {...rest}>
      {children}
    </button>
  );
}

export type ButtonLinkProps = CommonProps &
  Omit<ComponentProps<typeof Link>, "href" | "children"> & {
    /** Internal path, always from "@/lib/routes". */
    href: string;
  };

/** An internal link (next/link) that looks like a button. */
export function ButtonLink({ variant, size, shape, full, className, href, children, ...rest }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, shape, full, className })} {...rest}>
      {children}
    </Link>
  );
}

export type ButtonAnchorProps = CommonProps & Omit<ComponentProps<"a">, "children"> & { href: string };

/** A plain <a> that looks like a button: tel:112, mailto:, outside websites. */
export function ButtonAnchor({ variant, size, shape, full, className, children, ...rest }: ButtonAnchorProps) {
  return (
    <a className={buttonClasses({ variant, size, shape, full, className })} {...rest}>
      {children}
    </a>
  );
}
