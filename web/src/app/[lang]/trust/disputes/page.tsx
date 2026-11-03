// Dispute outcomes: the public log from the dispute screen ("Health Gurgaon Content and
// Trust.dc.html" #dispute, "Recent dispute outcomes"), on its own page.
import type { Metadata } from "next";

import { DisputesView } from "@/components/content-trust/disputes-view";
import { getDisputeOutcomes } from "@/lib/data/content";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.disputes;
  return pageMetadata({ lang, href: (l) => routes.disputes(l), title: t.title, description: t.description });
}

export default async function DisputesPage() {
  const lang = await getLang();
  const outcomes = await getDisputeOutcomes(50);
  return <DisputesView lang={lang} outcomes={outcomes} />;
}
