import { Lexend, Mukta, Spline_Sans_Mono } from "next/font/google";

/**
 * The three HealthGurgaon typefaces, self-hosted by next/font.
 * Each exposes a CSS variable on <html>; globals.css maps them to the
 * Tailwind families `font-sans` (Lexend), `font-mono` (Spline Sans Mono)
 * and `font-hindi` (Mukta). Hindi pages switch the body font automatically.
 */
export const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-lexend",
  display: "swap",
});

export const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-spline-mono",
  display: "swap",
});

/** Devanagari. Not preloaded: English pages never download it. */
export const mukta = Mukta({
  subsets: ["devanagari", "latin"],
  weight: ["500", "700"],
  variable: "--font-mukta",
  display: "swap",
  preload: false,
});

export const fontVariables = `${lexend.variable} ${splineSansMono.variable} ${mukta.variable}`;
