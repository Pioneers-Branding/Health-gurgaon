import { cn } from "./cn";

/**
 * The circle-of-neighbours mark: 8 alternating teal/saffron dots around three
 * bars (a skyline / a bar chart of care). Copied from the prototype header.
 * On dark backgrounds the bars turn cream.
 */
export function LogoMark({ size = 34, tone = "light", className }: { size?: number; tone?: "light" | "dark"; className?: string }) {
  const bar = tone === "dark" ? "#FBF4E8" : "#2B1D14";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={cn("flex-none", className)}>
      <circle cx="84" cy="50" r="9" fill="#0F766E" />
      <circle cx="74.04" cy="74.04" r="9" fill="#F0B43C" />
      <circle cx="50" cy="84" r="9" fill="#0F766E" />
      <circle cx="25.96" cy="74.04" r="9" fill="#F0B43C" />
      <circle cx="16" cy="50" r="9" fill="#0F766E" />
      <circle cx="25.96" cy="25.96" r="9" fill="#F0B43C" />
      <circle cx="50" cy="16" r="9" fill="#0F766E" />
      <circle cx="74.04" cy="25.96" r="9" fill="#F0B43C" />
      <rect x="36" y="42" width="8" height="20" rx="1.5" fill={bar} />
      <rect x="46" y="32" width="9" height="30" rx="1.5" fill={bar} />
      <rect x="57" y="45" width="7" height="17" rx="1.5" fill={bar} />
      <rect x="48.5" y="36" width="4" height="4" fill="#F0B43C" />
    </svg>
  );
}

const sizes = {
  sm: { mark: 28, text: "text-19", gap: "gap-2" },
  md: { mark: 34, text: "text-21", gap: "gap-2.25" },
  lg: { mark: 38, text: "text-23", gap: "gap-2.5" },
} as const;

/**
 * Mark + wordmark "Health" + "Gurgaon" (teal; saffron on dark). The brand is
 * always HealthGurgaon, in every language. Wrap it in a link with an
 * aria-label such as dict.header.homeLink.
 */
export function Logo({
  size = "md",
  tone = "light",
  withMark = true,
  className,
}: {
  size?: keyof typeof sizes;
  tone?: "light" | "dark";
  withMark?: boolean;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      {withMark && <LogoMark size={s.mark} tone={tone} />}
      <span
        lang="en"
        className={cn("font-sans font-bold tracking-display", s.text, tone === "dark" ? "text-cream" : "text-ink")}
      >
        Health<span className={tone === "dark" ? "text-saffron" : "text-teal"}>Gurgaon</span>
      </span>
    </span>
  );
}
