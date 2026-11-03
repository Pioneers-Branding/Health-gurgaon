import { getCurrentUser } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import type { Dictionary, Lang } from "@/lib/i18n";
import { routes } from "@/lib/routes";

/**
 * "Sign in" or "My account". Reads the session cookie (request-time data), so
 * it is always rendered inside <Suspense> with <AccountLinkFallback> as the
 * fallback: the rest of the page stays in the static shell.
 */
export async function AccountLink({
  lang,
  dict,
  variant = "header",
}: {
  lang: Lang;
  dict: Dictionary;
  variant?: "header" | "sheet";
}) {
  const user = await getCurrentUser();
  if (variant === "sheet") {
    return user ? (
      <ButtonLink href={routes.accountSaved(lang)} variant="saffron" size="lg" shape="rounded" full className="mt-3">
        {dict.menuSheet.myAccount}
      </ButtonLink>
    ) : (
      <AccountLinkFallback lang={lang} dict={dict} variant="sheet" />
    );
  }
  return user ? (
    <ButtonLink href={routes.accountSaved(lang)} variant="dark" size="sm">
      {dict.header.myAccount}
    </ButtonLink>
  ) : (
    <AccountLinkFallback lang={lang} dict={dict} />
  );
}

/** Signed-out state; also the Suspense fallback (most visitors never sign in). */
export function AccountLinkFallback({
  lang,
  dict,
  variant = "header",
}: {
  lang: Lang;
  dict: Dictionary;
  variant?: "header" | "sheet";
}) {
  if (variant === "sheet") {
    return (
      <ButtonLink href={routes.account(lang)} variant="saffron" size="lg" shape="rounded" full className="mt-3">
        {dict.menuSheet.signInOtp}
      </ButtonLink>
    );
  }
  return (
    <ButtonLink href={routes.account(lang)} variant="dark" size="sm">
      {dict.header.signIn}
    </ButtonLink>
  );
}
