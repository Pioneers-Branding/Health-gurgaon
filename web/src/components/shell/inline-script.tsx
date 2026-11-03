"use client";

/**
 * An inline <script> that runs while the HTML is parsed, before first paint
 * (see the bundled guide 02-guides/preventing-flash-before-hydration.md).
 * Server-rendered it is type="text/javascript"; whenever React renders it in
 * the browser (hydration, a client-rendered 404, soft navigations) it is
 * text/plain, so it never runs twice and React doesn't warn about scripts.
 * suppressHydrationWarning covers the type difference. It is a Client
 * Component so this also holds when a Server Component (the root layout) uses it.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
