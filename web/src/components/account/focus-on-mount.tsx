"use client";

import { useEffect } from "react";

import { focusElement } from "./hooks";

/** Moves focus to an element when the page opens (the deleted-account heading, an opened panel). */
export function FocusOnMount({ id }: { id: string }) {
  useEffect(() => {
    focusElement(id);
  }, [id]);
  return null;
}
