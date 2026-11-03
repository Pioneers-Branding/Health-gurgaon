import { cn } from "./cn";
import { Container } from "./container";

/** A soft cream block shown while content streams in. Decorative. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block animate-pulse rounded-12 bg-cream", className)} />;
}

/**
 * Generic page-loading layout (used by app/[lang]/loading.tsx and as a
 * Suspense fallback for whole sections). `label` is read to screen readers.
 */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="bg-cream/60">
        <Container className="flex flex-col gap-4 py-10">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full max-w-[32rem] bg-line" />
          <Skeleton className="h-5 w-full max-w-[40rem]" />
        </Container>
      </div>
      <Container className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3.5 py-10">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-20" />
        ))}
      </Container>
    </div>
  );
}
