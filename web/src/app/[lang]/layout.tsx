import type { Metadata, Viewport } from "next";
import "../globals.css";
import { fontVariables } from "../fonts";
import { AppShell } from "@/components/shell/app-shell";
import { InlineScript } from "@/components/shell/inline-script";
import { PREFS_HEAD_SCRIPT } from "@/components/shell/prefs-script";
import { getDictionary, HTML_LANG, LANGS } from "@/lib/i18n";
import { SITE_URL } from "@/lib/i18n/metadata";
import { langFromParams } from "@/lib/i18n/server";

/**
 * Root layout. Every route lives under app/[lang] ("en" | "hi"); src/proxy.ts
 * maps public URLs onto it (English unprefixed, Hindi under /hi).
 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const lang = await langFromParams(params);
  const t = getDictionary(lang).meta;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.defaultTitle, template: t.titleTemplate },
    description: t.description,
    applicationName: t.siteName,
    // Numbers like 112/108 are shown as deliberate tel: links only.
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#2b1d14",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const lang = await langFromParams(params);
  return (
    <html lang={HTML_LANG[lang]} className={fontVariables} suppressHydrationWarning>
      <head>
        {/* Larger text / high contrast from localStorage, applied before first paint. */}
        <InlineScript html={PREFS_HEAD_SCRIPT} />
      </head>
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before hydration. */}
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <AppShell lang={lang}>{children}</AppShell>
      </body>
    </html>
  );
}
