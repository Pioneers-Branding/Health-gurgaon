# HealthGurgaon frontend guide

How to build a page in this app. Read this before you replace a placeholder.
The clickable prototype (`../*.dc.html`) is the source of truth for design, copy,
sample data and behaviour; `Health Gurgaon Website Plan.dc.html` for the sitemap,
features and roles. Next.js here is **16.4** (App Router, Cache Components,
Partial Prefetching): the bundled docs in `node_modules/next/dist/docs/` win over
anything you remember.

```
src/
  proxy.ts                  language routing (unprefixed = English, /hi = Hindi) + signed-out 307 for private pages
  app/
    globals.css             design tokens (Tailwind v4 @theme) + base styles
    fonts.ts                Lexend, Spline Sans Mono, Mukta (next/font)
    [lang]/layout.tsx       root layout: <html lang>, fonts, prefs script, AppShell
    [lang]/…/page.tsx       every route (placeholders until you replace them)
    [lang]/not-found.tsx    404 in the shell · [lang]/[...rest] sends unknown URLs there
    [lang]/error.tsx        error boundary (strip, header, footer stay)
    [lang]/account/loading.tsx   segment loading UI (account pages wait for the session; admin
                            pages have their own in-page loading state instead, so an unknown
                            queue still returns a real 404)
    global-error.tsx        last resort if the root layout fails
    robots.ts, icon.svg
  components/
    ui/                     the component library (one component family per file)
    shell/                  top strip, header, footer, phone bar, search, menu, prefs
    placeholder-page.tsx    TEMPORARY "being built" page used by skeleton routes
  lib/
    routes.ts               typed URL builders for every route (always use these)
    i18n/                   dictionaries, getDictionary, getLang, formatting, metadata
```

`src/lib` outside `i18n/` and `routes.ts` (database, auth, localities, actions) belongs
to the core layer. Import the user only through `getCurrentUser()` from
`@/lib/auth/session` and localities through `LOCALITIES` from `@/lib/localities`.

---

## 1. URLs and languages

| Public URL | Served by | `lang` |
| --- | --- | --- |
| `/` | 307 → `/gurgaon` | |
| `/gurgaon/events` | rewritten to `/en/gurgaon/events` | `en` |
| `/hi/gurgaon/events` | as is | `hi` |
| `/en/gurgaon/events` | 308 → `/gurgaon/events` | |

All routes live under `app/[lang]`. `lang` is the root param (`"en" | "hi"`, both
prerendered). The city segment is always `gurgaon` (copy says **Gurugram**).

**Never hand-write a path.** Use `@/lib/routes`; ESLint fails on `href="/…"`,
``href={`/…`}`` and `redirect("/…")` in `src/app` and `src/components`.

```ts
import { routes } from "@/lib/routes";
routes.home(lang)                          // /gurgaon  or /hi/gurgaon
routes.search(lang, { q: "dentist", locality: "sohna-road", type: "doctor" })
routes.doctor(lang, slug)                  // /gurgaon/doctor/dr-ananya-rao
routes.providerReviews(lang, "hospital", slug)
routes.locality(lang, "sohna-road")
routes.report(lang, "event", slug)         // ReportableKind: doctor|hospital|lab|pharmacy|event|article|thread
routes.trust(lang, "sponsorship")          // /trust#sponsorship
routes.emergency(lang, "blood-banks")      // /gurgaon/emergency#blood-banks
routes.adminQueue(lang, "reviews")
```

Every builder: `lang` first; slugs URI-encoded; empty/`undefined`/`false` query values
dropped, `true` → `"1"`. Slugs are lowercase `a-z0-9-` (a path with a dot is treated
as a file by the proxy and 404s). Constants and guards: `PROVIDER_KINDS`, `REPORTABLE_KINDS`,
`ADMIN_QUEUES`, `TRUST_SECTIONS`, `EMERGENCY_SECTIONS`, `isProviderKind`,
`isReportableKind`, `isAdminQueue`. Global "Write a review" / "Report incorrect
information" / "Claim your profile" links go to
`routes.search(lang, { intent: "review" | "report" | "claim" })`: the search page asks the
reader to pick the listing, and each result's action opens that listing's form. "Suggest a
listing" links (a provider we haven't listed) go to `routes.suggestListing(lang, { locality? })`
(`/report/missing`, the report form's "Something is missing" option on its own page).

Anchors other pages link to (give these ids to your sections): `/trust#verification`,
`#badges`, `#editorial`, `#ordering` ("How lists are ordered"), `#sponsorship`, `#reviews`,
`#privacy`, `#corrections`;
`/gurgaon/emergency#emergency-departments`, `#ambulance`, `#blood-banks`.

Language switch: the shell's EN | हिं keeps the current path and query. Nothing to do
in pages.

## 2. Anatomy of a page

### Static route

```tsx
// src/app/[lang]/gurgaon/events/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.events;
  return pageMetadata({ lang, href: (l) => routes.events(l), title: t.title, description: t.description });
}

export default async function EventsPage({ searchParams }: PageProps<"/[lang]/gurgaon/events">) {
  const lang = await getLang();
  const dict = getDictionary(lang);
  return (
    <section className="bg-cream">
      <Container className="flex flex-col gap-5 py-14">
        <SectionHeader as="h1" title={dict.pages.events.title} />
        {/* cached catalogue reads render straight into the static shell */}
        <Suspense fallback={<EventListSkeleton />}>
          {/* anything reading searchParams / cookies goes inside Suspense */}
          <FilteredEvents lang={lang} searchParams={searchParams} />
        </Suspense>
      </Container>
    </section>
  );
}
```

### Dynamic route (`/gurgaon/doctor/[slug]`)

```tsx
type Props = PageProps<"/[lang]/gurgaon/doctor/[slug]">;

export async function generateStaticParams() {
  // Optional: prerender known slugs. With Cache Components return at least one.
  return (await listDoctorSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await getLang();
  const { slug } = await params;
  const doctor = await getDoctor(slug);          // a 'use cache' read from the core layer
  if (!doctor) notFound();
  return pageMetadata({ lang, href: (l) => routes.doctor(l, slug), title: doctor.name, description: … });
}

export default async function DoctorPage({ params }: Props) {
  const lang = await getLang();                  // never suspends: lang is a prerendered root param
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <DoctorProfile lang={lang} params={params} />  {/* awaits params, calls notFound() */}
    </Suspense>
  );
}
```

With `generateStaticParams` in place you may instead `await params` at the top of the
page and call `notFound()` there: unknown slugs then get a real 404 status (see
`gurgaon/[locality]/page.tsx`). Without it, keep the param read inside `<Suspense>`.

Rules that keep pages fast and the build green (Cache Components):

* **Language:** `const lang = await getLang()` (from `@/lib/i18n/server`) in pages,
  layouts, `generateMetadata`, `loading`/`not-found`. It reads the root param and never
  makes a page dynamic. Client Components get `lang` as a prop; Server Actions get it
  from a hidden field or a bound argument (`next/root-params` doesn't work there).
* **params / searchParams / cookies / headers / the session are request-time data.**
  Read them inside a component wrapped in `<Suspense>` (or after `generateStaticParams`
  made the param known). Don't `await params` at the top of a page or layout unless the
  route has `generateStaticParams`. Pass the promise down instead.
* **Catalogue data** comes from the core layer's `'use cache'` functions (tagged per
  entity; mutations call `revalidateTag`/`updateTag`). Call them freely; they land in
  the static shell.
* **The signed-in user:** `await getCurrentUser()` inside `<Suspense>` (see
  `components/shell/account-link.tsx`). Never at the top of a layout. Private pages use
  the core layer's `requireUser({ lang, next })` / `requireRole(roles, { lang })` /
  `requirePermission(…)` from `@/lib/auth/session` (sign-in redirect, or 404 for the
  wrong role) and Server Actions check again themselves.
* **No "now" in Server Components** (`new Date()`, `Date.now()`, `Math.random()` throw
  during prerender). Format stored dates; compute "4 days ago" from data, or in a
  Client Component.
* **Client hooks that read the URL** (`usePathname`, `useSearchParams`, `useParams`)
  suspend while prerendering: put the component inside `<Suspense>` with a static
  fallback (see `components/shell/main-nav.tsx`).
* **404s:** call `notFound()`; it renders `app/[lang]/not-found.tsx` in the reader's
  language with `noindex`. The HTTP status is 404 only if `notFound()` runs before the
  response starts streaming: at the top of the page or a layout, for a param that
  `generateStaticParams` makes known (see `gurgaon/[locality]/page.tsx`, `admin/[queue]`)
  or for a route that waits anyway. Inside a `<Suspense>` boundary (or under a
  `loading.tsx`) the reader still sees the 404 page, but with status 200 + noindex.
  That's why there is no root `loading.tsx`: unknown URLs (`app/[lang]/[...rest]`)
  return a real 404.
* **Loading pattern:** keep real content visible and put `<Suspense fallback={…}>` around
  just the parts that wait (use `Skeleton` / `PageSkeleton` as fallbacks). Add a
  segment `loading.tsx` only where a whole page must wait (the account pages, which check
  the session first, have one; admin doesn't, so `/admin/nope` stays a real 404).

### Metadata

`pageMetadata({ lang, href, title, description, noindex?, absoluteTitle?, ogType? })`
from `@/lib/i18n/metadata` gives the title (`%s · HealthGurgaon`), description,
canonical, hreflang `en-IN` / `hi-IN` / `x-default`, Open Graph locale and robots.
`href` is the page in each language: `(l) => routes.event(l, slug)`. Use `noindex: true`
for private pages (account, admin, society dashboard), form pages for a single item
(review/claim/report/dispute) and thin pages (locality pages that aren't `live`).
`NEXT_PUBLIC_SITE_URL` (env, in `.env.example`) is the public origin for absolute URLs.

## 3. Strings and Hindi

* `getDictionary(lang)` returns all UI strings (`src/lib/i18n/dictionaries/en.ts` and
  `hi.ts`). `hi.ts` is typed as `Dictionary`, so a key missing (or extra) in Hindi is a
  type error. Add every new string to **both** files.
* Interpolate with placeholders, never functions: `fmt(dict.home.nextCampNear, { place })`.
* Already there: the whole shell, every page title/description (`dict.pages.*`), all
  homepage copy (`dict.home`, prototype EN/HI table verbatim + the rest), badges,
  stamps, disclaimers, 404 (`notFound`), admin queue names (`adminQueues`).
* Page-specific copy: add a section for your area (e.g. `findCare: {...}`) to both
  dictionaries. Sample **data** (provider names, events) is data, not dictionary text.
* Dates/numbers: `formatDate(lang, date, "short" | "long" | "monthYear")` (IST, Hindi
  month names), `isoDate(date)` for `<time dateTime>`, `formatNumber`, `formatRupees`.
* Localities: `localityName(lang, locality)` for display names.
* Client Components: pass the strings they need as props (`labels={dict.searchOverlay}`).
  Don't import the dictionaries in `"use client"` files (it ships both languages).
* Naming rule: brand **HealthGurgaon** everywhere (also in Hindi); the city in copy and
  metadata is **Gurugram** / गुरुग्राम; slugs stay `/gurgaon`. "New Gurgaon",
  "(sample)" names, "The Gurgaon Health Report" and residents' quoted words keep
  "Gurgaon". Hindi uses आप.
* Hindi typography is automatic on `/hi`: body font Mukta, no negative letter-spacing,
  looser h1–h3, mono labels switch to Mukta at 12.5px. Mark English fragments inside
  Hindi pages with `lang="en"` when it matters (brand, code).

## 4. Styling

Tailwind v4, tokens in `src/app/globals.css`. The default Tailwind palette, type scale
and radii are **switched off**: only these tokens exist (plus arbitrary values for
one-offs, sparingly).

**Mapping prototype CSS to classes** (names are the prototype's px values; sizes are
rem so Larger text scales the page):

| Prototype | Class |
| --- | --- |
| `font-size: 13.5px` | `text-13.5` (available: 9.5 10 10.5 11 11.5 12 12.5 13 13.5 14 14.5 15 15.5 16 16.5 17 17.5 18 19 20 21 22 23 24 26 28 30 32 36 38 44 52 56) |
| `font-weight: 300/400/500/600/700` | `font-light/normal/medium/semibold/bold` |
| `border-radius: 20px` / `999px` | `rounded-20` (3 4 5 6 7 10 12 14 16 18 20 22 24 28 44) / `rounded-pill` (`rounded-card` = 20) |
| `letter-spacing: -.045em / -.04 / -.035 / -.03 / -.02 / -.015 / -.01 / .06em` | `tracking-display / h1 / h2 / h3 / title / card / snug / mono` |
| `padding: 18px` / `11px` / `9px 12px` | `p-4.5` / `px-2.75` / `px-3 py-2.25` (4px scale, quarter steps) |
| `line-height: 1.55` | `leading-[1.55]` (body default is `normal`, like the prototype) |
| `font: 500 10.5px 'Spline Sans Mono'; letter-spacing:.06em` | `mono-label text-10.5` or `<MonoLabel>` |
| `max-width:1240px; margin:0 auto; padding:0 24px` | `<Container>` (`mx-auto max-w-page px-6`) |
| `repeating-linear-gradient(135deg,#efe3cf…)` | `bg-stripes` / `bg-stripes-sm` |
| `box-shadow: 0 12px 30px -12px rgba(43,29,20,.35)` | `shadow-float` |

**Colours** (`bg-*`, `text-*`, `border-*`): `ink` #2B1D14, `ink-soft` #3d2e22,
`muted` #5a473a, `subtle` #6e5a4b, `cream` #FBF4E8, `cream-deep` #f4e8d4, `sand`
#f6ecdc, `stone` #ECE6DA, `line` #efe3cf, `line-strong` #e8dcc8, `phase` #d9c6a5,
`teal` #0F766E, `teal-dark` #0B5E57, `teal-tint` #d8efea, `saffron` #F0B43C,
`saffron-soft` #F7D58A, `emergency` #B42318, `emergency-tint` #FBEDEB, `success`
#1E7A4F, `success-tint` #E6F1EC, `caution` #9A5418, `pending` #7A5200, `pending-tint`
#FFF4D6, `sponsored` #C99A2E, `sponsored-tint` #FFFBF0, `gov` #2C4F9E, `gov-tint`
#E8ECF7, `olive` #5E6B1F (PPP ownership), `white`; on dark surfaces `on-dark` #e8dccb, `on-dark-muted` #c9b8a4,
`night-raise` #3a2a1e, `night-line` #4a3a2e, `night-edge` #5a473a.

Rules:

* **Phones first, no sideways scroll at 390px.** Use `flex-wrap` and
  `grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))]`; give flex children
  `min-w-0`; use `col-span-full`, never a fixed `col-span-2` in auto-fit grids.
  Horizontal chip rows that scroll use `overflow-x-auto scrollbar-none`.
* **44px minimum** for anything you can tap: `min-h-11` (buttons, chips, links in
  lists, breadcrumb links).
* Don't pass a class that fights the component's own (two `bg-*`/`rounded-*`/`gap-*`/
  `text-*` on one element): Tailwind doesn't guarantee which wins. Use props
  (`variant`, `size`, `shape`, `tone`) or wrap.
* Dark regions (ink bands): add `on-dark` so the focus ring turns saffron.
* Preference variants: `large-text:` (Larger text on), `hc:` (high contrast), `hi:`
  (Hindi page). High contrast already darkens `muted/subtle/line/teal…`, so most pages
  need nothing.
* Links: base style is teal → ink on hover. Body text is ink; secondary text `text-muted`
  or `text-subtle` with `font-light`, as in the prototype.
* The header is sticky; `html` has `scroll-padding-top` so `#anchors` land below it.

## 5. Components (`src/components/ui`)

All are Server-Component friendly unless marked *client*. Components that print
standard labels take `lang`.

| Prototype pattern | Component | File |
| --- | --- | --- |
| 1240px column with 24px gutters | `Container` (`size="page" \| "form" \| "prose"`) | `container.tsx` |
| Pill buttons (teal, dark, outline, soft, ghost, saffron, cream, outlineLight, danger) | `Button`, `ButtonLink` (internal), `ButtonAnchor` (tel:/mailto:/external), `buttonClasses()` | `button.tsx` |
| Filter chips (Find Care), static pills | `ChipButton` (*aria-pressed*), `ChipLink` (URL filter), `Tag`, `ChipRow`, `chipClasses()` | `chip.tsx` |
| White hairline cards, cream/dark/outline/sponsored panels, whole-card links | `Card`, `CardLink`, `cardClasses()` | `card.tsx` |
| ✓ Registration checked · Facility checked · Organiser verified · Awaiting review (community) · Credentials/Hours checked | `VerificationBadge kind=…` | `badge.tsx` |
| Private / Government / Charitable / PPP | `OwnershipBadge` (Client Components: `badgeClasses()` + `OWNERSHIP_TONE` from `badge-styles.ts`, with the label as a prop) | `badge.tsx` |
| SPONSORED label, "Not sponsored" | `SponsoredTag`, `NotSponsoredBadge`, generic `Badge tone=…` | `badge.tsx` |
| Small uppercase mono kicker/caption | `MonoLabel` (or `mono-label text-10.5`) | `mono-label.tsx` |
| CHECKED 12 OCT 2026 / LAST CHECKED … | `FreshnessStamp` | `freshness-stamp.tsx` |
| ✓ Confirmed by clinic, 12 Oct 2026 / Stated by doctor | `SourceNote tone="verified" \| "stated" \| "muted"` | `source-note.tsx` |
| Gurugram › Paediatrics › Dr. … | `Breadcrumbs` (adds Gurugram) | `breadcrumbs.tsx` |
| Underlined profile tabs | `TabLinks` (URL tabs), `Tabs` (*client*, in-page ARIA tabs), `TabMarker` ("Phase 2") | `tab-links.tsx`, `tabs.tsx` |
| 4-step progress bars | `Stepper` | `stepper.tsx` |
| Received → check → verified | `StatusTimeline` | `status-timeline.tsx` |
| Labels, help, errors | `Field` + `Input` / `Select` / `Textarea`; `Checkbox`, `Radio`, `RadioGroup`, `Toggle`, `ChoiceChips` (pill radios/checkboxes), `ChoiceCards`, `FieldError`, `FieldHelp` | `form.tsx` |
| Submit with pending state | `SubmitButton` (*client*, `useFormStatus`) | `submit-button.tsx` |
| Guidance, success, warning, error panels | `Callout tone=… live=…` | `callout.tsx` |
| SPONSORED · NOT PART OF THESE RESULTS | `SponsoredBox` | `sponsored-box.tsx` |
| No results / nothing yet | `EmptyState` | `empty-state.tsx` |
| h2 + kicker + description + "All … →" | `SectionHeader`, `ArrowLink` | `section-header.tsx` |
| Initials circle, PHOTO placeholder | `Avatar`, `initials()`, `PhotoPlaceholder` | `avatar.tsx` |
| Logo + wordmark | `Logo`, `LogoMark` | `logo.tsx` |
| Schematic SVG maps, map placeholder | `SchematicMap`, `MapPlaceholder` | `schematic-map.tsx` |
| Small print | `Disclaimer kinds={["medical","listing","community","emergency","verification"]}` | `disclaimer.tsx` |
| Loading | `Skeleton`, `PageSkeleton` | `skeleton.tsx` |
| Icons (home, search, calendar, chat, bookmark, menu, close, arrows, check, phone…) | `Icon*` | `icons.tsx` |
| Structured data (schema.org JSON-LD), `<` escaped so text can't end the script | `JsonLd data={…}` | `json-ld.tsx` |

See them all, in both languages, at **`/styleguide`** and **`/hi/styleguide`**.

Shell helpers for pages (`src/components/shell`):

* `useLocality()` (*client*) → `{ locality: { slug, name, live } | null, setLocality }`;
  `usePreferences()` → `{ text, contrast, locality, recent }`. Both return defaults
  during the server render: show the "all of Gurugram" state first.
* `openSearch()` / `<SearchTrigger>` (*client*) open the phone full-screen search.
* `addRecentSearch(q)` to remember a search made from your own search box.

### Forms

Server Actions live in `src/app/actions/**` (core layer) and are validated with zod.
Use them with `useActionState` in a small Client Component; render fields with `Field`
so errors are announced:

```tsx
"use client";
const [state, action, pending] = useActionState(submitReport, { errors: {} });
<form action={action} noValidate>
  <input type="hidden" name="lang" value={lang} />
  <Field id="report-text" label={t.whatIsCorrect} error={state.errors?.text}>
    <Textarea name="text" defaultValue={state.values?.text} />
  </Field>
  {state.message && <Callout tone="danger" live="assertive">{state.message}</Callout>}
  <SubmitButton pendingLabel={t.sending}>{t.send}</SubmitButton>
</form>
```

Forms must work without JavaScript where reasonable (plain `<form action>`; chips and
cards are real inputs). Warn about phone numbers / medical details while typing, and
let the server redact them anyway.

## 6. Trust and privacy in the UI

* Every fact shows its source and the date it was checked (`SourceNote`,
  `FreshnessStamp`). Never show a verification badge the data can't back.
* Sponsored content is always labelled and kept out of results (`SponsoredBox` above
  or beside the list, plus a line saying it doesn't change the order).
* No phone numbers or personal data shown publicly; show `phoneMasked` from the
  session user only to that user. No personal data in URLs.
* Fictional institutions keep "(sample)" in their names.
* Emergency: 112 / ambulance 108 are always visible (the shell does this). Pages about
  urgent care repeat it.

## 7. Accessibility checklist

- [ ] One `h1` per page; headings in order; landmarks: the shell gives
      `header`/`nav`/`main#main`/`footer` — don't add another `main`.
- [ ] Every control has a visible label (`Field`, `Checkbox`…); help and errors via
      `aria-describedby`; errors in a live region (`Callout live="assertive"`).
- [ ] Tap targets ≥ 44px (`min-h-11`); focus ring visible (don't remove outlines).
- [ ] Toggle state with `aria-pressed` (`ChipButton`) or real inputs; current item with
      `aria-current`.
- [ ] Images: meaningful `alt`, decorative `alt=""`; SVG maps/icons `aria-hidden` with
      the same information available as text.
- [ ] Works at 390px with no sideways scroll, with Larger text on, and in high contrast.
- [ ] Hindi page reads naturally (strings from the dictionary, no hard-coded English).
- [ ] Colour is never the only signal (badges have text, timeline has words for screen
      readers).
- [ ] Usable without JavaScript where reasonable; nothing depends on hover.

## 8. Checking a page against the prototype

The shared dev server runs on http://localhost:3000 (`python <tools>/devserver.py
ensure|status|logs`). Never start another one.

```bash
T=C:/Users/GCV/AppData/Local/Temp/claude/c--Users-GCV-Desktop-Health-Gurgaon/d9abe1d5-434f-49b9-ba92-34a3343b74ae/scratchpad/tools
export PYTHONIOENCODING=utf-8                       # Hindi in the JSON report
# your page, both widths (prints console errors, overflow_x, too_wide, h1)
python $T/shot.py "http://localhost:3000/gurgaon/doctor/dr-ananya-rao" - 1366 out/doctor-1366.png
python $T/shot.py "http://localhost:3000/hi/gurgaon/doctor/dr-ananya-rao" - 390 out/doctor-hi-390.png
# the prototype screen it comes from (already rendered in shots/before/)
python $T/shot.py "C:/Users/GCV/Desktop/Health-Gurgaon/Health Gurgaon Find Care.dc.html" doctor 1366 out/proto.png
# cut tall shots into tiles and compare them side by side with the Read tool
python $T/tiles.py out/tiles out/doctor-1366.png
```

Done means: zero console errors/warnings (hydration warnings included), no overflow at
390 and 1366, both languages render, and the tiles match the prototype's sizes,
colours, radii and spacing.

## 9. Commands

* `npm run lint` (ESLint 9; `next lint` no longer exists)
* `python <tools>/nextbuild.py typecheck` (tsc) and `python <tools>/nextbuild.py` (next
  build); always through the tool, builds are serialized.
* Route types (`PageProps<"/[lang]/…">`, `LayoutProps`) and `next/root-params` types are
  generated by `next dev` / `next build` / `next typegen`.
