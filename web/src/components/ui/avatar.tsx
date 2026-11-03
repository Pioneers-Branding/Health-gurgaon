import type { ReactNode } from "react";
import { cn } from "./cn";

/** "Dr. Ananya Rao" -> "AR", "Sector 56 Care Hospital" -> "SC" (words that start with a letter). */
export function initials(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, " ")
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "")
    .split(/[\s\-–]+/)
    .filter((w) => /^\p{L}/u.test(w));
  const letters = words.slice(0, 2).map((w) => w[0]);
  return letters.join("").toUpperCase() || "?";
}

const sizes = {
  sm: "size-10 text-13",
  md: "size-12 text-15",
  lg: "size-14 text-16",
} as const;

/**
 * Initials in a cream circle (teal letters): listing cards, reviews.
 * Decorative next to a visible name, so it is hidden from screen readers.
 */
export function Avatar({ name, size = "md", className }: { name: string; size?: keyof typeof sizes; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex flex-none items-center justify-center rounded-full bg-cream font-semibold text-teal",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Striped stand-in for a photo we don't have yet, with a mono caption
 * ("PHOTO · residents at a society health camp"). Give it a size or aspect
 * ratio with className. Real photos replace it later; never show stock photos
 * of patients.
 */
export function PhotoPlaceholder({
  caption,
  captionPosition = "top-left",
  small = false,
  className,
  children,
}: {
  caption?: ReactNode;
  captionPosition?: "top-left" | "bottom-left" | "bottom-center";
  /** Tighter stripes for small tiles (profile photos). */
  small?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden", small ? "bg-stripes-sm" : "bg-stripes", className)}>
      {caption && (
        <span
          className={cn(
            "absolute rounded-6 bg-cream px-2 py-1 font-mono text-10.5 text-subtle",
            captionPosition === "top-left" && "top-3 left-3",
            captionPosition === "bottom-left" && "bottom-2 left-2",
            captionPosition === "bottom-center" && "bottom-2 left-1/2 -translate-x-1/2 bg-transparent px-0 py-0 text-9.5",
          )}
        >
          {caption}
        </span>
      )}
      {children}
    </div>
  );
}
