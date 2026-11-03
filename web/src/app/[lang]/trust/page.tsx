// The Trust centre. Prototype: "Health Gurgaon Content and Trust.dc.html" #trust, plus the Website
// Plan's trust pages as sections: #verification #badges #editorial #sponsorship #reviews
// #privacy #corrections.
import type { Metadata } from "next";

import { TrustView } from "@/components/content-trust/trust-view";
import { getCorrections } from "@/lib/data/content";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.trust;
  return pageMetadata({ lang, href: (l) => routes.trust(l), title: t.title, description: t.description });
}

export default async function TrustPage() {
  const lang = await getLang();
  const corrections = await getCorrections();
  return <TrustView lang={lang} corrections={corrections} />;
}
