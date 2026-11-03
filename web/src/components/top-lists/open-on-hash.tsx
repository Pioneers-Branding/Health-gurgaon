"use client";

import { useEffect } from "react";

/** Opens the <details id={id}> when the URL's hash points at it ("How we rank" on the hub links to
 * a list's #method). Browsers that open details on fragment navigation do it anyway. */
export function OpenOnHash({ id }: { id: string }) {
  useEffect(() => {
    const open = () => {
      if (window.location.hash !== `#${id}`) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement && !el.open) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [id]);
  return null;
}
