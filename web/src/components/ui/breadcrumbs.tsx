import Link from "next/link";
import { getDictionary, type Lang } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { cn } from "./cn";

export type Crumb = { label: string; href?: string };

/**
 * "Gurugram › Paediatrics › Dr. Ananya Rao". The first crumb (Gurugram, linking
 * to the homepage) is added for you; pass the rest. The last crumb is the
 * current page and is not a link.
 */
export function Breadcrumbs({
  lang,
  items,
  includeHome = true,
  className,
}: {
  lang: Lang;
  items: Crumb[];
  includeHome?: boolean;
  className?: string;
}) {
  const dict = getDictionary(lang);
  const all: Crumb[] = includeHome ? [{ label: dict.breadcrumbs.home, href: routes.home(lang) }, ...items] : items;
  return (
    <nav aria-label={dict.breadcrumbs.label} className={cn("text-13 font-light text-subtle", className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {all.map((crumb, i) => {
          const last = i === all.length - 1;
          return (
            <li key={`${i}-${crumb.label}`} className="inline-flex items-center gap-x-1.5">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="inline-flex min-h-11 items-center">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="inline-flex items-center py-1">
                  {crumb.label}
                </span>
              )}
              {!last && <span aria-hidden="true">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
