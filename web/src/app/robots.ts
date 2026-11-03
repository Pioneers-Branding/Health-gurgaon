import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/i18n/metadata";

/**
 * Private and utility areas stay out of search engines (pages also send
 * noindex). Thin locality pages are handled per page with noindex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/hi/account", "/admin", "/hi/admin", "/styleguide", "/hi/styleguide", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
