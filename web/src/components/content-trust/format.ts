// Pure text helpers for the content & trust pages (unit-tested in tests/unit/content-trust.test.ts).

import type { Lang } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्तूबर", "नवंबर", "दिसंबर"];

/** "When did you visit?" option labels: "October 2026" → "अक्तूबर 2026"; "Earlier in 2026" →
 * the template ("Earlier in {year}" / "{year} में पहले"). The value posted stays English. */
export function visitMonthDisplay(lang: Lang, value: string, earlierTemplate: string): string {
  const earlier = /^Earlier in (\d{4})$/.exec(value);
  if (earlier) return fmt(earlierTemplate, { year: earlier[1] });
  if (lang !== "hi") return value;
  const m = /^([A-Z][a-z]+) (\d{4})$/.exec(value);
  const i = m ? MONTHS_EN.indexOf(m[1]) : -1;
  return m && i >= 0 ? `${MONTHS_HI[i]} ${m[2]}` : value;
}

/** "Paediatrician, Sushant Lok 1 clinic": what and where, under a form's heading. */
export function providerLine(profile: { headline: string; areaLabel: string | null; localityName: string | null }): string {
  const what = profile.headline.split(" · ")[0];
  const where = profile.areaLabel ?? profile.localityName;
  return [what, where].filter(Boolean).join(", ");
}
