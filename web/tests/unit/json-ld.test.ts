import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { JsonLd, jsonLdText } from "../../src/components/ui/json-ld";

const hostile = {
  "@context": "https://schema.org",
  "@type": "Review",
  reviewBody: 'Great clinic </script><script>alert("x")</script> <!-- and more',
  author: { "@type": "Person", name: "Parent </SCRIPT > Sector 57" },
};

describe("JsonLd", () => {
  it("writes every < as \\u003c, so </script> and <!-- never appear", () => {
    const text = jsonLdText(hostile);
    assert.ok(!text.includes("<"), text);
    assert.ok(text.includes("\\u003c/script>"));
    assert.ok(text.includes("\\u003c!--"));
  });

  it("still parses back to exactly the same data", () => {
    assert.deepEqual(JSON.parse(jsonLdText(hostile)), hostile);
    const list = [hostile, { "@type": "BreadcrumbList", itemListElement: [] }];
    assert.deepEqual(JSON.parse(jsonLdText(list)), list);
  });

  it("renders one ld+json script that a </script> in the data cannot close early", () => {
    const html = renderToStaticMarkup(createElement(JsonLd, { data: hostile }));
    assert.ok(html.startsWith('<script type="application/ld+json">'), html);
    assert.equal(html.match(/<\/script/gi)?.length, 1, html);
    assert.ok(html.endsWith("</script>"));
    const body = html.slice('<script type="application/ld+json">'.length, -"</script>".length);
    assert.deepEqual(JSON.parse(body), hostile);
  });
});
