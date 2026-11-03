/** First focusable element on every page: jumps past the strip and header. */
export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#main"
      className="sr-only z-[60] rounded-pill bg-saffron px-4 py-3 text-14 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      {label}
    </a>
  );
}
