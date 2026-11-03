// "Recent dispute outcomes": every decided dispute with its one-line reason, never who raised it.
// Used on the dispute form and on /trust/disputes.

import { cn } from "@/components/ui/cn";
import type { DisputeOutcome } from "@/lib/data/content";
import { formatDate, isoDate, type Lang } from "@/lib/i18n";
import type { ContentTrustStrings } from "@/lib/i18n/areas/content-trust";

import { dataLang, PhaseTag } from "./bits";

export function DisputesLog({ lang, t, outcomes }: { lang: Lang; t: ContentTrustStrings; outcomes: DisputeOutcome[] }) {
  if (!outcomes.length) return <p className="rounded-20 border border-line px-4.5 py-4 text-14 font-light text-muted">{t.disputes.empty}</p>;
  return (
    <ul className="overflow-hidden rounded-20 border border-line">
      {outcomes.map((o, i) => (
        <li key={o.ref} className={cn("flex flex-col gap-1.5 px-4.5 py-3.5", i > 0 && "border-t border-line")}>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span
              className={cn(
                "rounded-pill px-2.25 py-0.75 font-mono text-10.5 font-medium whitespace-nowrap uppercase",
                o.status === "upheld" ? "bg-success-tint text-success" : o.status === "not_upheld" ? "bg-line text-ink-soft" : "bg-cream text-caution",
              )}
            >
              {t.disputes.outcomes[o.status] ?? o.outcome}
            </span>
            <time dateTime={isoDate(o.publishedAt)} className="font-mono text-11 text-subtle uppercase">
              {formatDate(lang, o.publishedAt)}
            </time>
            {o.aboutMentions && <PhaseTag soft>{t.common.phase2b}</PhaseTag>}
          </div>
          <p lang={dataLang(lang)} className="text-14.5 leading-[1.4] font-semibold">
            {o.item}
          </p>
          <p lang={dataLang(lang)} className="text-14 leading-[1.55] font-light text-ink-soft">
            {o.why}
          </p>
        </li>
      ))}
    </ul>
  );
}
