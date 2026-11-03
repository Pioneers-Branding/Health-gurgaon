import { PageSkeleton } from "@/components/ui/skeleton";
import { getDictionary } from "@/lib/i18n";
import { getLang } from "@/lib/i18n/server";

/**
 * Loading UI for the account pages, which wait for the session before they
 * can show anything. (The loading pattern: a segment-level loading.tsx where a
 * whole page has to wait; otherwise small <Suspense> boundaries inside the page.)
 */
export default async function AccountLoading() {
  const lang = await getLang();
  return <PageSkeleton label={getDictionary(lang).common.loading} />;
}
