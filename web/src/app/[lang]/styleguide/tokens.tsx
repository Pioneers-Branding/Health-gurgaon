import type { ReactNode } from "react";
import { MonoLabel } from "@/components/ui/mono-label";
import { cn } from "@/components/ui/cn";

/** Building blocks for the style guide page only. */

export function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex flex-col gap-5 border-t border-line pt-10">
      <div className="flex flex-col gap-1.5">
        <h2 id={`${id}-title`} className="text-26 font-bold tracking-h2">
          {title}
        </h2>
        {intro && <p className="max-w-[45rem] text-14.5 leading-[1.55] font-light text-muted">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

export function Demo({ label, code, children, className }: { label: string; code?: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <MonoLabel>{label}</MonoLabel>
        {code && (
          <code lang="en" className="font-mono text-11 break-all text-teal">
            {code}
          </code>
        )}
      </div>
      <div className={cn("flex flex-wrap items-center gap-2.5 rounded-20 border border-line p-4", className)}>{children}</div>
    </div>
  );
}

export type Swatch = { name: string; hex: string; note?: string; dark?: boolean };

export function Swatches({ title, items }: { title: string; items: Swatch[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <MonoLabel>{title}</MonoLabel>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10.5rem),1fr))] gap-2.5">
        {items.map((s) => (
          <li key={s.name} className="overflow-hidden rounded-16 border border-line">
            <div className="h-14 border-b border-line" style={{ background: `var(--color-${s.name})` }} />
            <div className="flex flex-col gap-0.5 px-3 py-2">
              <code lang="en" className="font-mono text-12 text-ink">
                {s.name}
              </code>
              <span className="font-mono text-11 text-subtle uppercase">{s.hex}</span>
              {s.note && <span className="text-11.5 leading-snug font-light text-muted">{s.note}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
