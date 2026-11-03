import type { ReactNode } from "react";
import { getDictionary, type Lang } from "@/lib/i18n";
import { SponsoredTag } from "./badge";
import { cn } from "./cn";

/**
 * Sponsored content, kept apart from results and always labelled:
 * "SPONSORED · NOT PART OF THESE RESULTS" on a dashed saffron box.
 * Never mix a sponsored item into a ranked or sorted list, and say under the
 * list that the sponsored item doesn't change its order.
 */
export function SponsoredBox({
  lang,
  label,
  className,
  children,
}: {
  lang: Lang;
  /** Override the label, e.g. "Sponsored announcement". */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const t = getDictionary(lang).sponsored;
  return (
    <aside
      aria-label={t.region}
      className={cn(
        "flex flex-col gap-3 rounded-20 border-[1.5px] border-dashed border-sponsored bg-sponsored-tint px-4.5 py-4",
        className,
      )}
    >
      <SponsoredTag lang={lang}>{label ?? t.label}</SponsoredTag>
      {children}
    </aside>
  );
}
