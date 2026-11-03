import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Container for the prototype's schematic (not-to-scale) maps: an inline SVG
 * drawn by the page, plus optional positioned overlays (road labels, locality
 * buttons, numbered pins). The SVG is decorative (aria-hidden); everything a
 * reader can do on the map must also be possible from a list next to it.
 *
 *   <SchematicMap label="Schematic map of Gurugram localities"
 *                 caption="Not to scale. Tap a locality or use the list.">
 *     <svg viewBox="0 0 520 440" width="100%" aria-hidden="true" focusable="false">…</svg>
 *   </SchematicMap>
 *
 * Overlays: pass absolutely positioned elements in `overlay` (percent units
 * keep them aligned as the SVG scales).
 */
export function SchematicMap({
  label,
  caption,
  overlay,
  className,
  children,
}: {
  /** Accessible name of the map region. */
  label: string;
  caption?: ReactNode;
  overlay?: ReactNode;
  className?: string;
  /** The <svg>. Use width="100%" and a viewBox so it scales. */
  children: ReactNode;
}) {
  return (
    <figure className={cn("flex min-w-0 flex-col gap-2.5", className)}>
      <div role="group" aria-label={label} className="relative overflow-hidden rounded-24 border border-line bg-white [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">
        {children}
        {overlay}
      </div>
      {caption && <figcaption className="text-12.5 font-light leading-normal text-subtle">{caption}</figcaption>}
    </figure>
  );
}

/**
 * Striped placeholder for a map that isn't built yet (search results "Map" view).
 * The caption says what the real map will show ("verified locations only").
 */
export function MapPlaceholder({ caption, className }: { caption: ReactNode; className?: string }) {
  return (
    <div className={cn("relative h-70 rounded-20 bg-stripes", className)}>
      <span className="absolute top-3.5 left-4 rounded-6 bg-cream px-2 py-1 font-mono text-11 text-subtle">{caption}</span>
    </div>
  );
}
