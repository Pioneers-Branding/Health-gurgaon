"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during the server render and hydration, true afterwards: lets a form show its
 * no-JavaScript fallback (a Save button, an always-open select) only when it is needed. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** Move focus to an element after an action, and bring it into view below the sticky header.
 * Non-focusable targets get tabIndex -1. */
export function focusElement(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName) && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  const header = document.querySelector("header");
  const hh = header ? header.getBoundingClientRect().height : 0;
  const r = el.getBoundingClientRect();
  if (r.top < hh + 8 || r.bottom > window.innerHeight - 8) {
    window.scrollTo({ top: Math.max(0, r.top + window.scrollY - hh - 16), behavior: "smooth" });
  }
}

/** Run `effect` when `value` changes after the first render (not on mount). */
export function useOnChange<T>(value: T, effect: (value: T) => void) {
  // Compare with the previous value (not a "first run" flag), so React's development double
  // effects don't fire it on mount.
  const prev = useRef(value);
  const fn = useRef(effect);
  useEffect(() => {
    fn.current = effect;
  });
  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    prev.current = value;
    fn.current(value);
  }, [value]);
}

/** Ask for focus on an element once it is on the page: after this component's next render (the
 * status line or Undo button an action has just made appear). */
export function useFocusLater(): (id: string) => void {
  const want = useRef<string | null>(null);
  const [, bump] = useState(0);
  useEffect(() => {
    const id = want.current;
    if (id && document.getElementById(id)) {
      want.current = null;
      focusElement(id);
    }
  });
  return useCallback((id: string) => {
    want.current = id;
    bump((n) => n + 1);
  }, []);
}
