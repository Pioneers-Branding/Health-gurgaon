// Submit a health event. Prototype: "Health Gurgaon Local and Events.dc.html" #submit.
// The four-step form needs a signed-in organiser (so we can tell them when the event is checked
// and they can see it under My activity): the session is read under <Suspense>, and signed-out
// visitors get a sign-in link that comes back here. Form page: noindex.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SubmitEventForm } from "@/components/local-events/submit-event-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/session";
import { getDictionary, type Lang } from "@/lib/i18n";
import { localEventsStrings, type LocalEventsStrings } from "@/lib/i18n/areas/local-events";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.submitEvent;
  return pageMetadata({ lang, href: (l) => routes.submitEvent(l), title: localEventsStrings(lang).submit.h1, description: t.description, noindex: true });
}

export default async function SubmitEventPage() {
  const lang = await getLang();
  const t = localEventsStrings(lang);
  return (
    <div className="mx-auto flex w-full max-w-[55rem] flex-col gap-5.5 px-6 pt-7 pb-16">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-38 leading-[1.1] font-bold tracking-h1">{t.submit.h1}</h1>
        <p className="text-15 font-light text-muted">{t.submit.sub}</p>
      </div>
      <Suspense fallback={<FormSkeleton t={t} />}>
        <SubmitGate lang={lang} t={t} />
      </Suspense>
    </div>
  );
}

function FormSkeleton({ t }: { t: LocalEventsStrings }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-5.5">
      <span className="sr-only">{t.submit.loading}</span>
      <div className="grid grid-cols-4 gap-1.5">
        {t.submit.steps.map((s, i) => (
          <div key={s} className="flex flex-col gap-1.5">
            <span className={i === 0 ? "h-1.5 rounded-3 bg-teal" : "h-1.5 rounded-3 bg-line"} />
            <span className="text-12.5 font-light text-subtle">
              {i + 1} · {s}
            </span>
          </div>
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-24" />
    </div>
  );
}

async function SubmitGate({ lang, t }: { lang: Lang; t: LocalEventsStrings }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-24 border border-line p-6.5">
        <h2 className="text-19 font-semibold">{t.submit.signInTitle}</h2>
        <p className="max-w-[40rem] text-14.5 leading-[1.6] font-light text-muted">{t.submit.signInBody}</p>
        <Link
          href={routes.account(lang, { next: routes.submitEvent(lang) })}
          className="inline-flex min-h-12 items-center rounded-pill bg-teal px-6 text-15 font-semibold text-white hover:bg-teal-dark hover:text-white"
        >
          {t.submit.signInButton}
        </Link>
      </div>
    );
  }
  return (
    <SubmitEventForm
      lang={lang}
      s={t.submit}
      templates={t.templates}
      organiserTypes={t.organiserTypes}
      calendarHref={routes.events(lang)}
      activityHref={routes.accountActivity(lang)}
      eventHref={routes.event(lang, "__slug__")}
    />
  );
}
