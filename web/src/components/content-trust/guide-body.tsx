"use client";

// The guide's "In this guide" contents, the emergency note and the sections. Choosing a contents
// entry jumps to its section and marks it with the teal bar, as in the prototype (#guide). The
// text is rendered on the server too (this only adds the highlight).

import { useEffect, useState } from "react";

import { cn } from "@/components/ui/cn";

export type GuideBodySection = { id: string; heading: string; body: string };

export function GuideBody({
  sections,
  tocLabel,
  emergency,
  dataLang,
}: {
  sections: GuideBodySection[];
  tocLabel: string;
  emergency: { lead: string; rest: string } | null;
  /** "en" when the guide's text is English on a Hindi page. */
  dataLang?: "en";
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const fromHash = () => {
      const i = sections.findIndex((s) => `#${s.id}` === window.location.hash);
      if (i >= 0) setActive(i);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [sections]);

  return (
    <>
      {sections.length > 0 && (
        <nav aria-labelledby="guide-toc" className="flex flex-col gap-1.5 rounded-18 border border-line px-4.5 py-4">
          <h2 id="guide-toc" className="mono-label text-10.5 text-subtle">
            {tocLabel}
          </h2>
          <ol className="flex flex-col">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setActive(i)}
                  aria-current={active === i ? "location" : undefined}
                  className={cn("inline-flex min-h-11 items-center py-1 text-14.5 hover:text-teal", active === i ? "font-semibold text-teal" : "font-light text-ink")}
                >
                  <span lang={dataLang}>
                    {i + 1}. {s.heading}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {emergency && (
        <p className="rounded-18 bg-emergency-tint px-4.5 py-4 text-14.5 leading-[1.55]">
          <b className="font-semibold text-emergency">{emergency.lead}</b> {emergency.rest}
        </p>
      )}
      {sections.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          aria-labelledby={`${s.id}-h`}
          className={cn("flex flex-col gap-2.5 border-l-3 pl-4", active === i ? "border-teal" : "border-transparent")}
        >
          <h2 id={`${s.id}-h`} lang={dataLang} className="text-22 leading-[1.25] font-semibold tracking-h3 sm:text-24">
            {s.heading}
          </h2>
          <p lang={dataLang} className="text-16 leading-[1.7] font-light text-ink-soft sm:text-17">
            {s.body}
          </p>
        </section>
      ))}
    </>
  );
}
