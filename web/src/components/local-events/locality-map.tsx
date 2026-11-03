"use client";

// The schematic (not to scale) map of Gurugram's localities on the locality index.
//
// Map lesson from the prototype review: a tap anywhere on a locality's name must select that
// locality. Each locality is ONE <button>: an invisible 44px circle round its dot plus its name
// label. The button itself has no size and no z-index, so its circle (z 2, the selected one z 4)
// and its label (z 5, the selected one z 6) stack with every other locality's in the map's own
// stacking context: every label sits above every circle, and a tap on a name never reaches a
// neighbour. Label positions and sizes follow the prototype (12px names, 11px and the shorter
// names when the map is under 340px wide), in px so "Larger text" can't push labels together.

import { cn } from "@/components/ui/cn";

export type MapPin = {
  slug: string;
  name: string;
  /** Shorter name for maps under 340px wide (may contain a line break). */
  short: string | null;
  live: boolean;
  x: number;
  y: number;
  side: "l" | "r" | "t" | "b";
  aria: string;
};

const ROAD_CORNERS: [keyof RoadLabels, number, number, "tl" | "tr" | "bl" | "br"][] = [
  ["delhi", 186, 14, "tr"],
  ["mg", 500, 14, "tr"],
  ["spr", 392, 300, "bl"],
  ["nh48", 128, 428, "bl"],
  ["sohna", 414, 428, "bl"],
];

export type RoadLabels = { delhi: string; mg: string; spr: string; nh48: string; sohna: string };

/** Which road is highlighted for a selected locality. */
const ROAD_OF: Record<string, "gcr" | "gcer" | "sohna" | "dwarka"> = {
  "golf-course-road": "gcr",
  "golf-course-ext-road": "gcer",
  "sohna-road": "sohna",
  "dwarka-expressway": "dwarka",
};

const LABEL_SHIFT: Record<MapPin["side"], string> = {
  r: "translate(12px,-50%)",
  l: "translate(calc(-100% - 12px),-50%)",
  t: "translate(-50%,calc(-100% - 12px))",
  b: "translate(-50%,12px)",
};

const pos = (p: { x: number; y: number }) => ({ left: `${p.x / 5.2}%`, top: `${p.y / 4.4}%` });

export function LocalityMap({
  pins,
  selected,
  dimmed,
  onSelect,
  label,
  roads,
}: {
  pins: MapPin[];
  selected: string;
  /** Localities that don't match the current search (shown faded). */
  dimmed: Set<string>;
  onSelect: (slug: string) => void;
  label: string;
  roads: RoadLabels;
}) {
  const road = ROAD_OF[selected];
  const roadStroke = (key: string) => (road === key ? "#F0B43C" : "#fff");
  return (
    <div role="group" aria-label={label} className="@container relative isolate overflow-hidden rounded-24 border border-line bg-white">
      <svg viewBox="0 0 520 440" width="100%" className="block h-auto" aria-hidden="true" focusable="false">
        <rect x="0" y="0" width="520" height="440" fill="#fff" />
        <path d="M58 34 C160 8 360 6 478 28 C514 130 512 330 468 412 C330 440 168 436 44 404 C16 300 22 126 58 34 Z" fill="#FBF4E8" stroke="#efe3cf" strokeWidth="2" />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M372 0 L318 96 L262 196 L196 306 L118 440" stroke="#e8dcc8" strokeWidth="15" />
          <path d="M210 0 L160 110 L132 210 L146 280 L192 312" stroke="#e8dcc8" strokeWidth="13" />
          <path d="M520 34 L318 96 M446 57 L452 250 L440 318 L382 392 M262 196 L300 270 L336 330 L382 392 L404 440 M209 284 L336 330 L444 296" stroke="#e8dcc8" strokeWidth="10" />
          <path d="M372 0 L318 96 L262 196 L196 306 L118 440" stroke="#fff" strokeWidth="9" />
          <path d="M210 0 L160 110 L132 210 L146 280 L192 312" stroke={roadStroke("dwarka")} strokeWidth="7" />
          <path d="M520 34 L318 96 M209 284 L336 330 L444 296" stroke="#fff" strokeWidth="5" />
          <path d="M446 57 L452 250" stroke={roadStroke("gcr")} strokeWidth="5" />
          <path d="M452 250 L440 318 L382 392" stroke={roadStroke("gcer")} strokeWidth="5" />
          <path d="M262 196 L300 270 L336 330 L382 392 L404 440" stroke={roadStroke("sohna")} strokeWidth="5" />
        </g>
      </svg>

      {ROAD_CORNERS.map(([key, x, y, c]) => (
        <span
          key={key}
          aria-hidden="true"
          className="pointer-events-none absolute font-mono text-[10.5px] leading-none tracking-[.5px] whitespace-nowrap text-subtle"
          style={{
            [c[1] === "l" ? "left" : "right"]: `${(c[1] === "l" ? x : 520 - x) / 5.2}%`,
            [c[0] === "t" ? "top" : "bottom"]: `${(c[0] === "t" ? y : 440 - y) / 4.4}%`,
          }}
        >
          {roads[key]}
        </span>
      ))}

      {pins.map((p) => {
        const sel = p.slug === selected;
        const dim = dimmed.has(p.slug);
        const alpha = sel ? 0.3 : dim ? 0.04 : p.live ? 0.12 : 0.22;
        return (
          <span
            key={`zone-${p.slug}`}
            aria-hidden="true"
            className={cn("pointer-events-none absolute aspect-square w-[13.1%] -translate-x-1/2 -translate-y-1/2 rounded-full", sel && "border-[1.5px] border-dashed border-ink")}
            style={{ ...pos(p), background: `${p.live ? "rgba(15,118,110," : "rgba(240,180,60,"}${alpha})` }}
          />
        );
      })}

      {pins.map((p) => {
        const sel = p.slug === selected;
        const dim = dimmed.has(p.slug);
        return (
          <button
            key={p.slug}
            type="button"
            data-pin={p.slug}
            aria-label={p.aria}
            aria-pressed={sel}
            onClick={() => onSelect(p.slug)}
            className="group absolute size-0 border-0 bg-transparent p-0 focus-visible:shadow-none focus-visible:outline-none"
            style={pos(p)}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-0 left-0 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full group-focus-visible:outline-3 group-focus-visible:outline-offset-0 group-focus-visible:outline-teal group-focus-visible:outline-solid",
                sel ? "z-[4]" : "z-[2]",
              )}
            >
              <span
                className={cn(
                  "block rounded-full border-[3px] border-white",
                  sel ? "size-6 bg-ink shadow-[0_0_0_3px_#F0B43C]" : cn("size-4.5 shadow-[0_1px_3px_rgba(43,29,20,.4)]", p.live ? "bg-teal" : "bg-saffron"),
                  dim && "opacity-35",
                )}
              />
            </span>
            <span
              aria-hidden="true"
              data-pin-label={p.slug}
              className={cn("absolute top-0 left-0 p-0.5", sel ? "z-[6]" : "z-[5]", dim && "opacity-40")}
              style={{ transform: LABEL_SHIFT[p.side] }}
            >
              <span
                className={cn(
                  "block rounded-7 px-[7px] py-[2px] text-[12px] leading-[1.25] whitespace-pre @max-[340px]:px-[5px] @max-[340px]:py-px @max-[340px]:text-[11px] hi:leading-[1.3]",
                  p.side === "l" ? "text-right" : "text-center",
                  sel ? "bg-ink font-semibold text-cream" : "bg-white/92 font-medium text-ink",
                )}
              >
                {p.short ? (
                  <>
                    <span className="@max-[340px]:hidden">{p.name}</span>
                    <span className="hidden @max-[340px]:inline">{p.short}</span>
                  </>
                ) : (
                  p.name
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
