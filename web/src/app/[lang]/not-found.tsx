import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MonoLabel } from "@/components/ui/mono-label";
import { getDictionary } from "@/lib/i18n";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

/**
 * 404 inside the site shell, in the page's language. Shown for notFound()
 * (unknown slugs) and, through app/[lang]/[...rest], for any unknown URL.
 * Next.js adds <meta name="robots" content="noindex"> automatically.
 */
export default async function NotFound() {
  const lang = await getLang();
  const t = getDictionary(lang).notFound;
  return (
    <div className="bg-cream">
      <Container className="flex flex-col gap-4 py-16 sm:py-24">
        <MonoLabel tone="teal" size="11">
          {t.kicker}
        </MonoLabel>
        <h1 className="max-w-[40rem] text-32 leading-[1.08] font-bold tracking-h1 sm:text-38">{t.title}</h1>
        <p className="max-w-[36rem] text-16 leading-[1.6] font-light text-muted">{t.body}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <ButtonLink href={routes.home(lang)} variant="dark">
            {t.home}
          </ButtonLink>
          <ButtonLink href={routes.search(lang)} variant="outline">
            {t.search}
          </ButtonLink>
        </div>
        <p className="pt-2 text-13.5 font-medium text-emergency">{t.urgent}</p>
      </Container>
    </div>
  );
}
