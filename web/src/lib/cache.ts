// Expiring cached reads after a change. Server-only.
//
// In a Server Action use expireTags(): the next read (including the re-render that ships with
// the action's response) waits for fresh data, so the person sees their own change.
// Outside Server Actions (Route Handlers, webhooks, scripts run by Next) use refreshTags():
// stale-while-revalidate, the next visit refreshes in the background.

import "server-only";

import { revalidateTag, updateTag } from "next/cache";

export { tags } from "./cache-tags";

/** Server Actions only (Next's updateTag). */
export function expireTags(...list: (string | null | undefined | false)[]): void {
  for (const tag of new Set(list.filter((t): t is string => !!t))) updateTag(tag);
}

/** Anywhere on the server (Next's revalidateTag with the "max" profile). */
export function refreshTags(...list: (string | null | undefined | false)[]): void {
  for (const tag of new Set(list.filter((t): t is string => !!t))) revalidateTag(tag, "max");
}
