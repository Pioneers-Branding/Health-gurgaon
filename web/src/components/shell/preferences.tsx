"use client";

import { createContext, use, useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";
import { PREF_KEYS } from "./prefs-script";

/**
 * Reader preferences on this device: text size, contrast, locality and recent
 * searches. A tiny external store over localStorage, read with
 * useSyncExternalStore so the server render and hydration use the defaults
 * (no hydration warnings) and the real values apply right after.
 * Visual state that must not flash (larger text, high contrast) is applied to
 * <html> by an inline script before paint; style toggles with the
 * `large-text:` and `hc:` Tailwind variants rather than with React state.
 *
 * For pages:
 *   const { locality } = useLocality();   // { slug, name, live } | null (null = all of Gurugram)
 *   const prefs = usePreferences();       // { text, contrast, locality, recent }
 * Both return the defaults during the server render; render a sensible
 * "all of Gurugram" state first.
 */
export type TextSize = "normal" | "large";
export type Contrast = "normal" | "high";
export type Prefs = {
  text: TextSize;
  contrast: Contrast;
  /** Locality slug, or null for all of Gurugram. */
  locality: string | null;
  recent: string[];
};

const SERVER_PREFS: Prefs = { text: "normal", contrast: "normal", locality: null, recent: [] };
const MAX_RECENT = 6;

/** Fallback when localStorage is unavailable (private mode, blocked storage). */
const memory = new Map<string, string | null>();

function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeKey(key: string, value: string | null) {
  memory.set(key, value);
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the in-memory value is used for this visit */
  }
}

function prefersMoreContrast(): boolean {
  try {
    return window.matchMedia("(prefers-contrast: more)").matches;
  } catch {
    return false;
  }
}

function parseRecent(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function read(): Prefs {
  const contrast = readKey(PREF_KEYS.contrast);
  return {
    text: readKey(PREF_KEYS.text) === "large" ? "large" : "normal",
    contrast: contrast === "high" || (contrast === null && prefersMoreContrast()) ? "high" : "normal",
    locality: readKey(PREF_KEYS.locality) || null,
    recent: parseRecent(readKey(PREF_KEYS.recent)),
  };
}

let snapshot: Prefs | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Prefs {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

function getServerSnapshot(): Prefs {
  return SERVER_PREFS;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith("hg:")) {
      snapshot = null;
      applyPreferencesToDocument();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function changed() {
  snapshot = null;
  applyPreferencesToDocument();
  for (const listener of listeners) listener();
}

/** Mirror text size and contrast onto <html> (the CSS reads data-text / data-contrast). */
export function applyPreferencesToDocument() {
  const prefs = getSnapshot();
  const root = document.documentElement;
  if (prefs.text === "large") root.setAttribute("data-text", "large");
  else root.removeAttribute("data-text");
  if (prefs.contrast === "high") root.setAttribute("data-contrast", "high");
  else root.removeAttribute("data-contrast");
}

export function setTextSize(value: TextSize) {
  writeKey(PREF_KEYS.text, value);
  changed();
}

export function setContrast(value: Contrast) {
  writeKey(PREF_KEYS.contrast, value);
  changed();
}

/** Save the reader's locality (slug), or null for all of Gurugram. */
export function setLocality(slug: string | null) {
  writeKey(PREF_KEYS.locality, slug);
  changed();
}

/** Remember a search on this device (most recent first, max 6, no duplicates). */
export function addRecentSearch(query: string) {
  const q = query.trim().slice(0, 80);
  if (!q) return;
  const next = [q, ...getSnapshot().recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
  writeKey(PREF_KEYS.recent, JSON.stringify(next));
  changed();
}

export function clearRecentSearches() {
  writeKey(PREF_KEYS.recent, null);
  changed();
}

export function usePreferences(): Prefs {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type LocalityOption = { slug: string; name: string; live: boolean };

const LocalitiesContext = createContext<LocalityOption[]>([]);

/** The canonical locality list with names in the page language (set by the root layout). */
export function useLocalityOptions(): LocalityOption[] {
  return use(LocalitiesContext);
}

/** The reader's chosen locality, or null for all of Gurugram. */
export function useLocality(): { locality: LocalityOption | null; setLocality: typeof setLocality } {
  const { locality } = usePreferences();
  const options = use(LocalitiesContext);
  return { locality: locality ? (options.find((o) => o.slug === locality) ?? null) : null, setLocality };
}

/**
 * Wraps the app in the root layout. Re-applies text size and contrast after
 * mount: React's dev remount resets <html> attributes the head script set
 * (a no-op in production).
 */
export function PreferencesProvider({ localities, children }: { localities: LocalityOption[]; children: ReactNode }) {
  useLayoutEffect(() => {
    applyPreferencesToDocument();
  }, []);
  return <LocalitiesContext value={localities}>{children}</LocalitiesContext>;
}
