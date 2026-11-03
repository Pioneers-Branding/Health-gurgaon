import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Callout / notice box (radius 18, 13.5px light text).
 *   info     cream: guidance ("Please don't include names of patients…")
 *   success  green tint: confirmations ("Thank you. Your review is with a moderator.")
 *   warning  amber: privacy warnings while typing, "awaiting review"
 *   danger   red tint: errors that block an action
 *   dark     ink: high-emphasis notes
 * `live` makes it an announced region: "polite" for status, "assertive" for errors.
 */
export type CalloutTone = "info" | "success" | "warning" | "danger" | "dark";

const tones: Record<CalloutTone, string> = {
  info: "bg-cream text-muted",
  success: "bg-success-tint text-ink-soft",
  warning: "border border-sponsored bg-pending-tint text-pending",
  danger: "border border-emergency/40 bg-emergency-tint text-ink-soft",
  dark: "on-dark bg-ink text-on-dark",
};

const titleTones: Record<CalloutTone, string> = {
  info: "text-ink",
  success: "text-success",
  warning: "text-pending",
  danger: "text-emergency",
  dark: "text-cream",
};

export function Callout({
  tone = "info",
  title,
  live,
  className,
  children,
}: {
  tone?: CalloutTone;
  title?: ReactNode;
  live?: "polite" | "assertive";
  className?: string;
  children?: ReactNode;
}) {
  const role = live === "assertive" ? "alert" : live === "polite" ? "status" : undefined;
  return (
    <div
      role={role}
      className={cn("flex flex-col gap-1.5 rounded-18 px-4.5 py-4 text-13.5 font-light leading-[1.6]", tones[tone], className)}
    >
      {title && <p className={cn("text-15 font-semibold leading-snug", titleTones[tone])}>{title}</p>}
      {children && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}
