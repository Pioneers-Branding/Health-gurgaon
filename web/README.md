# HealthGurgaon

HealthGurgaon is a local health directory and community site for Gurugram, in English and Hindi.
Residents can:

- find doctors, clinics, hospitals, labs, pharmacies and emergency care, with every fact showing its
  source and when it was last checked;
- read reviews, top lists, patient stories, the weekly Gurgaon Health Report and local health guides;
- follow their locality's health camps and events;
- ask their neighbours, and run "Healthy Neighbourhoods" programmes in their RWA.

Residents can also take part: write reviews, report wrong information, suggest missing listings,
submit events, share stories and volunteer. Providers can claim their profile. Everything people
send goes to a moderation queue in `/admin` before it is published.

This folder is the Next.js app. The clickable prototype in the folder above (`../*.dc.html`) is the
design source of truth for layout, copy and behaviour, and `Health Gurgaon Website Plan.dc.html` is
the source for the sitemap, features and roles.

**Stack:** Next.js 16.4 (App Router, Cache Components), React 19, Tailwind CSS v4, Prisma 6
(SQLite in development, PostgreSQL in production) and zod. There is no client-side state library
and no CSS framework beyond Tailwind.

## Read these next

| Document | What's in it |
| --- | --- |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | How to build a page: URLs and languages, Cache Components rules, strings and Hindi, styling tokens, the UI components, accessibility, checking against the prototype. |
| [`docs/BACKEND.md`](docs/BACKEND.md) | Data model, reading data, Server Action conventions, cache tags, auth and roles, privacy rules, search and ranking, PostgreSQL, SMS/WhatsApp senders, sample data. |
| [`AGENTS.md`](AGENTS.md) | Next.js 16 differs from older versions: the docs bundled in `node_modules/next/dist/docs/` are the reference. |
| [`.env.example`](.env.example) | Every environment variable, with comments. |

## Setup

You need Node.js 20.9 or newer (the app is developed on Node 24) and npm.

```bash
cp .env.example .env     # then set AUTH_SECRET (the comment in the file shows how to generate one)
npm install
npm run setup            # generates the Prisma client, creates prisma/dev.db and loads the sample data
npm run dev              # http://localhost:3000
```

`/` redirects to `/gurgaon`. English pages have no prefix; Hindi pages are under `/hi`
(`/hi/gurgaon`). The component library is at `/styleguide`.

`npm run setup` wipes the database and reloads the prototype's sample data, so run it again
whenever you want a clean start. Every fictional institution keeps "(sample)" in its name.

On Windows, the running dev server locks the Prisma engine file. After a change to
`prisma/schema.prisma`, stop `npm run dev`, run `npm run setup` (or `npm run db:push`), then start
it again. See [BACKEND.md §1](docs/BACKEND.md#1-running-it).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | The development server, with hot reload. |
| `npm run build` | Generates the Prisma client, then runs `next build`. The database must exist and hold data, because pages prerender from it. |
| `npm start` | Serves the production build. |
| `npm run lint` | ESLint. It also blocks hand-written internal links: build every URL with `@/lib/routes`. |
| `npm test` | The unit tests in `tests/unit` (Node's test runner via tsx). No database needed. |
| `npm run test:data` | Reseeds, runs every data function and the sign-in flow against the database, then reseeds again. |
| `npm run setup` | Generates the client, creates or updates the tables, and loads the sample data. |
| `npm run db:seed` | Wipes every table and reloads the sample data. It refuses to run when `NODE_ENV=production`. |
| `npm run db:push` | Applies `prisma/schema.prisma` to the database, then regenerates the client. |
| `npm run db:generate` | Regenerates the Prisma client. |
| `npm run db:reset` | Drops the database and reseeds it. |
| `npm run db:studio` | Opens Prisma Studio to browse the data. |

## Environment variables

They are all listed and explained in [`.env.example`](.env.example). In short:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` for SQLite in development, or a `postgresql://…` URL. |
| `AUTH_SECRET` | At least 32 random bytes. Used to hash sign-in codes and IP addresses for rate limits. |
| `ADMIN_PHONES` | Comma-separated mobile numbers that become admin when they sign in. |
| `OTP_PROVIDER` | Who sends sign-in codes. Only `dev` exists so far (see below). |
| `OTP_MAX_PER_PHONE_PER_HOUR`, `OTP_MAX_PER_IP_PER_HOUR` | Optional limits on codes (defaults 5 and 20). |
| `EMAIL_PROVIDER` | Who sends email confirmation links. Only `dev` exists so far. |
| `NEXT_PUBLIC_SITE_URL` | The public origin, used for canonical URLs, hreflang, share links and email links. |

Only variables that start with `NEXT_PUBLIC_` ever reach the browser.

## Signing in during development

Sign-in is a mobile number and a 6-digit code; there are no passwords. With `OTP_PROVIDER="dev"`
no SMS or WhatsApp message is sent. Instead:

- the code is printed in the dev server's terminal on a line like
  `[otp:dev] sms code for +91 98XXX XX321: 123456 (expires 10:42 UTC)` (claim codes say `claim code`);
- outside production, the code step of `/account` also says "Development only: your code is …".

Email confirmation links work the same way (`[email:dev]` in the log, and the link on screen).

Any Indian mobile number signs up on its first sign-in. The seed also creates test accounts
(+91 90000 00001 to 00010) for each role, including a resident with a full history; they are listed
in [BACKEND.md §1](docs/BACKEND.md#1-running-it).

The limits still apply in development: a new code every 30 seconds, 5 codes per number per hour and
3 wrong tries per code.

## Making yourself admin

1. Put your number in `ADMIN_PHONES` in `.env`, for example `ADMIN_PHONES="+919812345678"`. Several
   numbers are separated by commas, and any common format works.
2. If the dev server is running, restart it so it reads the new value.
3. Sign in with that number at `/account` (if you are already signed in, sign out first). You
   become admin at that sign-in. Then open `/admin`.

Removing a number from `ADMIN_PHONES` never demotes anyone. Change roles from `/admin` instead.
In development the seeded admin, +91 90000 00001, is already in `.env.example`.

Moderators, editors and admins see different queues: see the roles section in
[BACKEND.md §7](docs/BACKEND.md#7-auth-sessions-and-roles).

## Moving from SQLite to PostgreSQL

1. In `prisma/schema.prisma`, set `provider = "postgresql"`.
2. Set `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/healthgurgaon?schema=public"`.
3. In development, run `npm run setup`. For production, create migrations once with
   `npx prisma migrate dev --name init` and apply them on each deploy with `npx prisma migrate deploy`.

Nothing else in the code changes. The details, including what the code avoids so that both
databases behave the same, are in [BACKEND.md §10](docs/BACKEND.md#10-switching-to-postgresql).

## Plugging in a real SMS or WhatsApp sender

Codes go through the `OtpSender` interface in `src/lib/auth/otp-sender.ts`. To add a provider such as
MSG91, Twilio or the WhatsApp Cloud API:

1. Write a sender that calls the provider's API, reading its keys from environment variables.
2. Return it from `getOtpSender()` when `OTP_PROVIDER` names it.
3. Add its variables to `.env.example`, and set `OTP_PROVIDER` in the deployment.

Indian SMS needs a DLT-registered template that matches the message text exactly, and WhatsApp
needs an approved authentication template. The dev sender refuses to run in production unless
`OTP_DEV_ALLOW_IN_PRODUCTION=1` (for staging only, because the codes end up in the logs). The
step-by-step guide is [BACKEND.md §11](docs/BACKEND.md#11-plugging-in-a-real-smswhatsapp-sender).
Emails go through `src/lib/messaging/email-sender.ts` in the same way (`EMAIL_PROVIDER`). Senders
for the weekly report and alerts don't exist yet; they must check consent first (BACKEND.md §8).

## Deploying

The app is a standard Next.js server app (Server Components, Server Actions, a database). It runs
on any Node host (`npm run build`, then `npm start`) or on a platform that supports Next.js 16, such
as Vercel.

1. Use PostgreSQL (see above). SQLite is a single file and only suits development or a single server.
2. Set the environment variables in the host: `DATABASE_URL`, a new `AUTH_SECRET`, `ADMIN_PHONES`,
   `NEXT_PUBLIC_SITE_URL` (the real https origin), and a real `OTP_PROVIDER`.
3. Apply the migrations (`npx prisma migrate deploy`) and load the data before the build.
   `npm run build` prerenders pages from the database, so the build must be able to reach it.
   Don't run `db:seed` against production: it deletes everything first, and refuses to run
   unless `SEED_ALLOW_PRODUCTION=1`.
4. Serve it over HTTPS. In production the session cookie is `__Host-hg_session`, which browsers
   only accept on a secure origin.
5. Put it behind a proxy or platform that **overwrites** `X-Forwarded-For` (Vercel, Cloudflare,
   nginx with `proxy_set_header X-Forwarded-For $remote_addr`). The per-network sign-in code limit
   reads the first address in that header, so a host that passes the browser's own value through
   lets anyone get around that limit. The per-phone limits don't depend on it.

Published content is cached with tags. Server Actions expire the right tags when something changes,
so approved reviews, events and stories appear straight away. Jobs or webhooks that change data
outside a Server Action should call `refreshTags()` from `src/lib/cache.ts`
([BACKEND.md §6](docs/BACKEND.md#6-cache-tags-and-what-to-expire)).

## Working without JavaScript

Each page's main content comes from cached data and is in the static HTML: provider profiles, lists,
events, articles, guides and the forum. It is there without JavaScript and for search engines, and
most forms post as normal HTML forms.

Two kinds of thing need JavaScript, because they are rendered per request and streamed into the page:

- **Filters and sorting** that read the URL, for example search filters, the events calendar's
  filters and the forum's topic filter. Without JavaScript the page shows its unfiltered content
  or a placeholder.
- **Signed-in parts**: account pages, Save and Follow states, "your review is waiting" notes and
  the admin screens.

Private pages also get a real redirect without JavaScript: `src/proxy.ts` sends a signed-out visitor
to `/account?next=…` with a 307 (it only checks that a session cookie is present; each page still
checks the session itself). This is a deliberate trade-off of Cache Components; see
[FRONTEND.md §2](docs/FRONTEND.md#2-anatomy-of-a-page).

## Known limitations and next steps

The final QA (28 Oct 2026) found these. None blocks browsing, searching or contributing, but they
are the next things to build:

- **Sign-in needs JavaScript.** `/account` is a signed-in-aware page inside `<Suspense>`, so
  without JavaScript it shows only its loading placeholders. Fix: render the sign-in form as that
  Suspense boundary's fallback (its forms already post as plain HTML forms).
- **No provider dashboard yet.** Approving a claim marks the listing claimed and gives the claimant
  the provider role, but there is no screen yet to reply to reviews or edit the profile, although
  the claim page lists those as things a claimed profile can do (`reviewReplySchema` in
  `src/lib/validation/review.ts` is ready for the reply action). Until then, editors make changes
  through the listings editor in `/admin/listings`.
- **"Report" under a forum reply reports the whole thread** (a confidential concern about the
  thread), so a moderator can't hide just that reply. Next: a post flag (ContentFlag with
  `targetKind: "post"`; `/admin/community` already handles Keep/Remove for those).
- **Society activity reports** need an event linked to the society, and nothing links one yet, so a
  newly registered society never sees "Submit report".
- **Not-found status codes:** pages that call `notFound()` inside a streamed (`<Suspense>`) part,
  such as role-gated admin queues and some unknown forum threads, send the not-found page with
  status 200 (and `noindex`). On the production server the very first request for any unknown
  address is also a 200 + `noindex`; later ones are 404. Search engines don't index these pages.
- **No uploads:** dispute evidence, story videos and photos are collected later by a moderator.
- **Sample data:** names marked “(sample)” are fictional; the sponsor note on top lists is sample
  text shown on every list.

## Where things are

```
src/
  proxy.ts               language routing (English unprefixed, Hindi under /hi) and the signed-out redirect
  app/[lang]/            every route; app/actions/ holds the Server Actions
  components/<area>/     one folder per area (find-care, account, content-trust, local-events,
                         community, top-lists, home, admin); components/ui/ is the shared library
  lib/                   data (lib/data), auth, validation, routes, i18n, search, ranking, privacy helpers
prisma/                  schema.prisma, seed.ts and the sample data in seed-data/
tests/unit/              unit tests (npm test)
docs/                    FRONTEND.md and BACKEND.md
```
