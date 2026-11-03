// Structured data for search engines (schema.org JSON-LD). One component for every page:
//
//   <JsonLd data={{ "@context": "https://schema.org", "@type": "Physician", name, … }} />
//
// Only put facts in it that the page itself shows, and only true values (no placeholders).
// Server-Component friendly; renders a single <script type="application/ld+json">.

export type JsonLdData = Record<string, unknown> | Record<string, unknown>[];

/**
 * The script's text: JSON with every `<` written as `<`. A value such as "</script>" or "<!--"
 * (a name, a quote, a review excerpt) can then never close the script early or start an HTML
 * comment, and the JSON still parses to exactly the same data.
 */
export function jsonLdText(data: JsonLdData): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: JsonLdData }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
