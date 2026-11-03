"use client";

import { useEffect } from "react";
import "./globals.css";
import { fontVariables } from "./fonts";
import { ERROR_STRINGS } from "@/lib/i18n/error-strings";

/**
 * Last-resort error screen, used only when the root layout itself fails.
 * It replaces the whole document, so it carries its own <html>, styles and
 * fonts, and shows both languages (the language can't be known reliably here).
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-dvh bg-cream text-ink">
        <title>HealthGurgaon</title>
        <main className="mx-auto flex max-w-page flex-col gap-10 px-6 py-16">
          <p className="font-sans text-21 font-bold tracking-display">
            Health<span className="text-teal">Gurgaon</span>
          </p>
          {(["en", "hi"] as const).map((lang) => {
            const t = ERROR_STRINGS[lang];
            return (
              <section key={lang} lang={lang} className={lang === "hi" ? "font-hindi" : undefined}>
                <h1 className="text-30 leading-tight font-bold">{t.title}</h1>
                <p className="mt-2 max-w-[36rem] text-16 leading-[1.6] font-light text-muted">{t.body}</p>
              </section>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex min-h-11 items-center rounded-pill bg-ink px-5 text-14.5 font-medium text-cream"
            >
              {ERROR_STRINGS.en.retry} · {ERROR_STRINGS.hi.retry}
            </button>
            <a href="tel:112" className="inline-flex min-h-11 items-center rounded-pill bg-emergency px-5 text-14.5 font-semibold text-white">
              112
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
