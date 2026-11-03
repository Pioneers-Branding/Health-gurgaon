"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MonoLabel } from "@/components/ui/mono-label";
import { isLang } from "@/lib/i18n/config";
import { ERROR_STRINGS } from "@/lib/i18n/error-strings";
import { routes } from "@/lib/routes";

/**
 * Error boundary for every page; the strip, header and footer stay. Readers
 * never see error details (server errors carry a digest that matches the log).
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const params = useParams<{ lang?: string }>();
  const lang = isLang(params?.lang) ? params.lang : "en";
  const t = ERROR_STRINGS[lang];

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-cream">
      <Container className="flex flex-col gap-4 py-16 sm:py-24">
        <MonoLabel tone="emergency" size="11">
          {t.kicker}
        </MonoLabel>
        <h1 className="max-w-[40rem] text-32 leading-[1.08] font-bold tracking-h1">{t.title}</h1>
        <p className="max-w-[36rem] text-16 leading-[1.6] font-light text-muted">{t.body}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="dark" onClick={() => retry()}>
            {t.retry}
          </Button>
          <ButtonLink href={routes.home(lang)} variant="outline">
            {t.home}
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}
