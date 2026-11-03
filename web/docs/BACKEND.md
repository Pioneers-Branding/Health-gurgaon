# HealthGurgaon backend

How data, auth and mutations work in the Next.js app, for everyone building pages on top of them.
Read this before adding a page that reads data or a Server Action that changes it.

- Next.js 16 with **Cache Components** (`cacheComponents: true`): catalogue reads are `'use cache'`
  functions tagged per entity; anything that reads the request (session, `searchParams`, per-user
  state) renders under `<Suspense>`. See `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`.
- Prisma 6 on **SQLite** in development (`prisma/dev.db`), switchable to **PostgreSQL** (below).
- Mutations are **Server Actions** validated with **zod**, returning one `ActionState` shape for `useActionState`.

## Contents

1. [Running it](#1-running-it)
2. [Where things live](#2-where-things-live)
3. [Data model](#3-data-model)
4. [Reading data in pages](#4-reading-data-in-pages)
5. [Writing data: Server Action conventions](#5-writing-data-server-action-conventions)
6. [Cache tags and what to expire](#6-cache-tags-and-what-to-expire)
7. [Auth, sessions and roles](#7-auth-sessions-and-roles)
8. [Privacy rules in code](#8-privacy-rules-in-code)
9. [Search and ranking](#9-search-and-ranking)
10. [Switching to PostgreSQL](#10-switching-to-postgresql)
11. [Plugging in a real SMS/WhatsApp sender](#11-plugging-in-a-real-smswhatsapp-sender)
12. [Sample data and reseeding](#12-sample-data-and-reseeding)
13. [Decisions and open questions](#13-decisions-and-open-questions)

---

## 1. Running it

```bash
cp .env.example .env          # then set AUTH_SECRET (see the comment in the file)
npm run setup                 # prisma generate + db push + seed (wipes and reloads sample data)
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run setup` | Generate the client, create/update tables, load sample data. |
| `npm run db:seed` | Wipe every table and reload the prototype's sample data (idempotent). |
| `npm run db:push` | Apply `prisma/schema.prisma` to the database, then regenerate the client. |
| `npm run db:generate` | Regenerate the Prisma client. |
| `npm run db:reset` | Drop the database and reseed. |
| `npm run db:studio` | Browse the database. |
| `npm test` | Unit tests (`tests/unit`, Node's test runner via tsx). No database needed. |
| `npm run test:data` | Reseed, then exercise every data function and the OTP/session flow against the database with Next stubbed (`scripts/smoke-data`), then reseed again. |
| `npm run build` | Generate the client, then `next build`. **The database must exist and be seeded**: pages prerender from it. |

**Windows and the dev server.** While `next dev` runs, the Prisma query engine file is locked.
`scripts/prisma-generate.mjs` (used by `build`, `setup`, `db:generate`, `db:push`) continues when the
generated client already matches the schema. After a **schema change**, stop the dev server, run
`npm run setup` (or `npm run db:push` then `npm run db:seed`), and start it again (the running server
also keeps the old client in memory). A new required column needs a `@default` (or an empty table)
for `db push` to apply it to an existing database; `db:reset` drops everything instead.

**Test accounts** (seeded; in development the code is shown on the sign-in screen):

| Phone | Role | Name |
| --- | --- | --- |
| +91 90000 00001 | admin (also in `ADMIN_PHONES`) | Admin |
| +91 90000 00002 | editor | S. Bansal |
| +91 90000 00003 | moderator | R. Mehta |
| +91 90000 00004 | champion | Meena |
| +91 90000 00005 | provider (claimed Little Steps Children’s Clinic) | Little Steps Clinic (manager) |
| +91 90000 00006 | rwa (Sector 57 RWA admin) | R. Kapoor |
| +91 90000 00007 | resident: **the Account prototype's sample resident** (a parent in Sector 57, first signed in 20 Sep 2026): 3 saved places + 1 event, 3 follows, email for messages, 7-line consent record, 3 reviews, 3 reports + 1 concern, 3 submitted events, 1 dispute | Resident, Sector 57 |
| +91 90000 00008 | resident (pending claim of Dr. Vikram Sethi) | Dr. Vikram Sethi |
| +91 90000 00009 | resident with "Verified pharmacist" badge | Pharmacist, Sector 66 |
| +91 90000 00010 | resident: the first-time reviewer behind RV-8830 in the reviews queue | New resident, Sector 57 |

Any other Indian mobile number signs up on first sign-in (and gets the "Choices" step).

## 2. Where things live

```
prisma/schema.prisma          the data model
prisma/seed.ts                loader (wipes, then loads prisma/seed-data/*)
prisma/seed-data/*.ts         typed sample data, one module per prototype area
src/lib/db.ts                 Prisma client singleton (server-only)
src/lib/data/*.ts             read functions for pages (server-only, cached, return plain objects)
src/lib/auth/*                OTP, senders, sessions, getCurrentUser/requireUser/requireRole, permissions, phones
src/lib/validation/*.ts       zod schemas for every form (pure: usable in client components too)
src/lib/action-state.ts       ActionState + parseForm/ok/fail helpers for Server Actions
src/lib/cache-tags.ts         cache tag names; src/lib/cache.ts expireTags()/refreshTags()
src/lib/audit.ts              writeAudit() for every moderator/editor/admin action
src/lib/consent.ts            the consent record (setConsent, changeConsentChannel, withdrawAll,
                              recordAccountEvent, getConsentSummary, getConsentHistory, hasConsent)
src/lib/consent-text.ts       the five message types and the exact words people agree to
src/lib/review-label.ts       how reviews and posts are signed ("Parent · Sector 57", "Former resident")
src/lib/auth/email-verification.ts  confirming an email address for messages (24-hour link)
src/lib/messaging/            dev email sender; the stop list kept after an account is deleted
src/lib/redact.ts             removes phones, emails, Aadhaar-like numbers from public text
src/lib/content-safety.ts     urgent-symptom, medical-advice and dosage detection for forms
src/lib/search.ts             Find care search engine (pure)
src/lib/ranking.ts            neighbour score, top-list score, the method page's live demo
src/lib/localities.ts         canonical locality list, aliases, matching (pure; the shell uses it)
src/lib/domain.ts             vocabularies and labels (pure)
src/lib/dates.ts, hours.ts    India-time dates and opening hours (pure)
src/lib/emergency.ts          ordering 24×7 emergency departments by locality (pure)
src/lib/targets.ts            what saved items and follows point at
src/lib/refs.ts               reference codes ("HG-RV-8831")
src/app/actions/auth.ts       requestOtp, verifyOtp, saveWelcomeChoices, signOut
src/app/actions/saved.ts      toggleSaved, toggleFollow, setFollowAlert, importDeviceSaved
src/app/actions/consent.ts    setConsent, changeMessageChannel, setMessageLanguage, requestEmailChange,
                              confirmEmail, setReviewLabel, stopAllWhatsApp, undoStopAllWhatsApp,
                              subscribeWeeklyReport, exportMyData, deleteMyAccount
```

Rules of thumb:

- Pages never import `@/lib/db`. They call `src/lib/data/*`. Mutations go through Server Actions.
- `server-only` modules: `db`, `data/*`, `auth/session`, `auth/otp-service`, `auth/sign-in`, `audit`,
  `consent`, `refs`, `targets`, `cache`. Pure modules (safe in client components): `domain`,
  `localities`, `validation/*`, `action-state`, `search`, `ranking`, `redact`, `content-safety`,
  `dates`, `hours`, `emergency`, `consent-text`, `review-label`, `auth/types`, `auth/permissions`,
  `auth/phone`, `auth/otp-constants`, `json-types`, `cache-tags`, `neighbour-demo`.
- Types for the Prisma enums come from `@prisma/client` (`import type { ProviderKind } from "@prisma/client"`);
  value lists and labels from `src/lib/domain.ts`. `tests/unit/domain.test.ts` keeps them in sync.

## 3. Data model

All models are in `prisma/schema.prisma` (commented). Groups:

| Area | Models |
| --- | --- |
| Places & taxonomies | `Locality` (aliases, sector ranges, schematic-map position, `live`, coverage `stats` snapshot), `Specialty` (explainer, synonyms, conditions it handles, FAQs), `FacilityType` |
| Providers | `Provider` (doctor, clinic, hospital, lab, pharmacy, blood bank, ambulance, emergency dept, home care: specialty, qualifications, registration, ownership, facility type/size, address, locality, languages, verified fee + follow-up terms, opening hours, accessibility checklist, services, departments, emergency info, home collection/delivery/visits, tests, business phone revealed on click, sponsorship, claimed, review-stats snapshot), `ProviderAffiliation` (doctor ↔ facility + days), `VerificationRecord` (field, method, result, source note, checked date), `FeaturedProvider` (editor-chosen hospitals per locality), `ProviderQuestion` ("Ask the hospital") |
| Trust | `Review` (guided answers, visit month/type, text, conflict declaration, status, moderation reason + `suggestion` for the author, `editText` = an edit of a published review waiting for a moderator, provider reply, helpful count), `ReviewHelpful`, `Report` (fact / complaint / missing; field; `timeline` the reporter sees), `Dispute` (ranking / mention / review; filer role; reason; published outcome), `Claim`, `Correction` (public corrections log), `ListingChange` (a listing fact that changed, before → after, with its source: "changed since you saved it", locality alerts), `ContentFlag` (reported posts) |
| Events | `Event` (type, organiser + verified, dates, venue, locality, eligibility, cost, registration, services, status verified / awaiting review / **changes requested** (not public) / rejected / cancelled / completed, `requestedChanges`, `timeline` the submitter sees, source, private contact) |
| Content | `Article` (news: label reporting / roundup / opinion / sponsored, category, dek, body, source), `Guide` (reviewed by, updated, sections, local note, related) |
| Community | `Thread` (topic, locality, status incl. resolved, `answeredBy`), `Post` (verified-professional label, best answer, helpful), `PostReaction`, `NeighbourMention` (resident, sentiment, trust, date, counted/excluded + reason, themes, quote) |
| Healthy Neighbourhoods | `Society`, `SocietyMember` (team permissions), `Initiative` (completed activity reports), `VolunteerNeed`, `VolunteerOffer`, `VolunteerRole`, `VolunteerApplication` |
| Lists & stories | `TopList`, `TopListEntry` (score, four sub-scores, movement), `Story` (consented, visit-confirmed video/written stories) |
| Accounts | `User` (phone, role, display name, language for messages and codes, `area`, `reviewLabel`, confirmed `email` for messages, `deletedAt`), `OtpChallenge` (+ channel SMS/WhatsApp), `Session`, `EmailChallenge`, `SavedItem`, `Follow` (+ alert preference), `Consent` (the append-only consent record: message-type lines and account lines) + `ConsentState` (on/off per type and channel, confirmed, last sent), `StopListEntry`, `AuditLog`, `Sequence` (reference counters) |

Conventions:

- **Enums** are Prisma enums (supported by SQLite and PostgreSQL). Labels live in `src/lib/domain.ts`.
- **Lists and small structures are `Json`** (SQLite has no scalar lists). Shapes are in
  `src/lib/json-types.ts`; read them with `asStringArray`, `asArray<T>`, `asObject<T>`, `asOpeningHours`.
  Json columns have **no database defaults** (Prisma can't push them to SQLite), so every `create`
  must pass every required Json column (`[]` / `{}`); TypeScript enforces it.
- **Slugs** identify public entities in URLs (`Provider.slug`, `Event.slug`, …); `Locality`,
  `Specialty`, `FacilityType`, `VolunteerRole` and `TopList` use the slug as primary key. Threads use
  short ids (`@default(nanoid(10))`) for `/community/t/[id]`.
- **`sample: true`** marks every row loaded from the prototype.
- **Reference codes** (`HG-RV-8831`, `HG-3108`, `HG-CC-0113` for concerns, `HG-EV-5191`, `HG-DS-0420`,
  `HG-CL-0312`, `HG-VOL-413`, `HG-ST-222`, `HG-CM-1905`) come from `nextRef(kind)` in `src/lib/refs.ts`.
- **Snapshots**: `Locality.stats` (verified listing counts, category counts), `Provider.reviewStats`
  (review totals, "what patients mention", department scores) and `Thread.replyCount/helpfulCount`
  hold the prototype's numbers. Recompute them when real data flows in (see §13).
- **Times** are stored in UTC and shown in India time (`src/lib/dates.ts`); opening hours are minutes
  since midnight IST per weekday (`src/lib/hours.ts`).

## 4. Reading data in pages

Every function below is **server-only**. Public reads are `'use cache'` with `cacheLife("hours")`
and tags; per-user and admin reads are request-time. They return JSON-safe objects (ISO date strings).

| Route | Call |
| --- | --- |
| `/gurgaon` | `getHomepage()` (`data/home`) |
| `/gurgaon/search` | `parseSearchParams(await searchParams)` (`lib/search`), then `runSearch(params)` (`data/search`) **inside `<Suspense>`**; `resultTitle(outcome)`; `toSearchQuery(params)` for links |
| `/gurgaon/doctors/[specialty]` | `getSpecialtyPage(slug)` → `notFound()` on null; `listSpecialtySlugs()` for `generateStaticParams` |
| `/gurgaon/doctor/[slug]` | `getProviderForRoute("doctor", slug)`; `getNeighbourSummary(slug)`; `getProviderReviews(slug)`; save state via `isSaved()` under `<Suspense>` |
| `/gurgaon/hospital/[slug]` | `getProviderForRoute("hospital", slug)` (hospitals, clinics, home care, blood banks); `getProviderReviews(slug, { department })`; `getProviderDiscussions(slug)`; `getStories({ provider: slug })`; profile `.questions` |
| `/gurgaon/lab/[slug]`, `/gurgaon/pharmacy/[slug]` | `getProviderForRoute("lab" \| "pharmacy", slug)`; `openStatus(hours, open24h, now)` from `lib/hours` under `<Suspense>` (needs the request time). Every profile has `hours.underRecheck` (show “hours being re-checked” while a timings report is open) and `recentChanges` |
| `/gurgaon/[kind]/[slug]/reviews` | `getProviderForRoute(kind, slug)` + `getProviderReviews` + `getProviderDiscussions` + `getStories({ provider })` |
| "Show clinic phone" | Server Action calling `getPublicPhone(slug)`: the number is never in page HTML |
| `/gurgaon/emergency` | `getEmergencyDirectory()`; order with `orderEmergencyDepartments(list, localitySlug)` and `emergencyOrderNote()` (`lib/emergency`) |
| `/gurgaon/localities` | `getLocalityIndex()` + `searchLocalities(query)` (`lib/localities`, pure, works client-side) |
| `/gurgaon/[locality]` | `getLocalityPage(slug)` → `notFound()` on null; `robots: { index: page.indexable }` (noindex unless live); `getNeighbourRanking(slug, "paediatrics")` for the Phase 2B widget |
| `/gurgaon/events` | `getEventMonth(year, month)` and/or `getUpcomingEvents(filter)` |
| `/gurgaon/events/[slug]` | `getEvent(slug)`; `eventShareText(event, url)`; `listEventSlugs()` |
| `/gurgaon/news`, `/gurgaon/news/[slug]` | `getArticles({ label })`, `getNewsUpdatedAt()`, `getCorrections(1)`; `getArticle(slug)` |
| `/gurgaon/guides`, `/gurgaon/guides/[slug]` | `getGuides()`; `getGuide(slug)` (`hasContent` false = card only, text not written yet) |
| `/gurgaon/community` | `getThreads({ topic, locality, sort })`, `getTopicCounts()` |
| `/gurgaon/community/t/[id]` | `getThread(id)` |
| `/gurgaon/healthy-neighbourhoods` | `getSocieties()` |
| `/gurgaon/society/[slug]` | `getSociety(slug)` |
| `/gurgaon/society/[slug]/dashboard` | `getSocietyDashboard(slug)` **under `<Suspense>`**; `notFound()` on null (not on the team) |
| `/gurgaon/volunteer` | `getVolunteerRoles()` |
| `/gurgaon/top`, `/gurgaon/top/[list]` | `getTopLists()`; `getTopList(slug)` (filter by ownership/locality on the page) |
| `/gurgaon/stories` | `getStories({ category })` |
| `/gurgaon/facilities` | `getFacilityDirectory()` |
| `/trust` | `getCorrections()`, `BADGES`/`RECHECK_DAYS` (`lib/domain`) |
| `/trust/neighbour-recommendations` | `NEIGHBOUR_DEMO_DOCS`, `MENTION_EXAMPLES` (`lib/neighbour-demo`), `rankDemo()`, `DEMO_SAFEGUARDS`, `NEIGHBOUR_RULES` (`lib/ranking`) |
| `/trust/disputes` | `getDisputeOutcomes()` |
| `/review/[kind]/[slug]` | `getProviderForRoute`; `REVIEW_QUESTIONS`, `REVIEW_VISIT_TYPES`, `visitMonthOptions(now)` (`lib/domain`); `reviewSchema` |
| `/claim/[kind]/[slug]` | `getProviderForRoute`; `findClaimCandidates(query)`; `claimDetailsSchema`, `claimCodeSchema` |
| `/report/missing` | "Suggest a listing": the missing-listing form on its own (`suggestListing` in `actions/find-care.ts`, `missingListingSchema`); `?locality=` pre-fills the locality |
| `/report/[kind]/[slug]` | `getProviderForRoute`; `factReportSchema`, `complaintSchema` (optional `topic`: `CONCERN_TOPICS`, stored in `Report.field`), `missingListingSchema`; `REPORT_FIELDS`. Refs: `nextRef("report")` → `HG-3108`, concerns `nextRef("concern")` → `HG-CC-0113`; write a `timeline` (`[{ status: "received", at }]`) |
| `/dispute/[kind]/[slug]` | `getProviderForRoute`; `getTopList` / `getNeighbourSummary`; `disputeStep{1..4}Schema`, `disputeSchema` |
| `/account` (sign in) | actions `requestOtp` → `verifyOtp` → (first sign-in) `saveWelcomeChoices`; `?signed_out=1` after `signOut`, `?deleted=1&review=keep\|remove\|none` after `deleteMyAccount`; locality choices from `LOCALITIES` |
| `/account/*` header | `getMyAccount()`: masked phone/email, pending email, language, area, review label + options, "What we keep" counts |
| `/account/saved` | `getMySaved()` (places carry `changesSinceSaved`, `recheckedSinceSaved`, `myReports`; events `verifiedSinceSaved`), `getMyFollows()` (`alertsOn`, `news`); actions `toggleSaved`, `toggleFollow`, `setFollowAlert`, `setConsent` (from=saved, purpose `saved_changes`) |
| `/account/activity` | `getMyActivity()`: `attention`, `reviews`, `reports`, `concerns`, `events`, `disputes`, `sent` (claims, patient stories, community questions and replies, volunteer applications, and "Report" flags the person sent on reviews and stories, each with its reference, status, date and a link) (+ flat `items`) |
| `/account/consent` | `getMyConsent()` (types + record) and `getMyAccount()` (email, language); actions in `actions/consent.ts`; `?confirm_email=<token>` → a button posting `confirmEmail` |
| `/admin` | `getAdminOverview()`; admins also see staff & roles (`getStaffMember(id)`; actions `changeRole`, `grantRole`) |
| `/admin/[queue]` | `getModerationQueue(queue, filter)`, `getModerationItem(queue, id)`, `getItemHistory(queue, id)`; `verification` → `getVerificationDesk()`; `listings` → `getListings()`, `getListingForEdit(slug)`; `audit` → `getAuditLog()`. Actions in `src/app/actions/admin.ts`: `decideQueueItem` (approve / reject / request changes / escalate, audit row in the same transaction, cache tags expired), `revealPrivate` (calls `revealPrivateDetails()`, audited), `recordCheck` (verification desk), `updateListing`, `exportAuditLog` (CSV, admins, audited) |

### The rules Cache Components imposes

- **Request-time data goes under `<Suspense>`**: `getCurrentUser()`, `searchParams`, `cookies()`,
  `getMy*()`, `isSaved()`, `getSocietyDashboard()`, all `data/admin` functions, and anything using
  `new Date()` outside a cached function (open-now badges, "checked 4 days ago" computed at render).
  Cached functions already return `checkedDaysAgo` and `openNow` computed when the cache was filled
  (hourly), which is fine for static shells.
- **Never call `getCurrentUser()` at the top of a layout**: put it in a small component in a
  `<Suspense>` boundary (the shell's `AccountLink` does this).
- **Never read cookies/headers inside `'use cache'`.** Per-user cached reads follow the docs' pattern:
  the exported function reads the session, an unexported cached function takes the user id
  (see `data/account.ts`).
- **Slugs from the URL are untrusted**: the data functions return null for unknown or unpublished
  items; call `notFound()`.

## 5. Writing data: Server Action conventions

Feature agents add action files under `src/app/actions/`. Copy this shape:

```ts
"use server";

import { fail, formLang, needsSignIn, ok, parseForm, type ActionState } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { expireTags, tags } from "@/lib/cache";
import { db } from "@/lib/db";
import { nextRef } from "@/lib/refs";
import { redactPersonalData } from "@/lib/redact";
import { reviewAnswers, reviewSchema } from "@/lib/validation";

export async function submitReview(_prev: ActionState<{ ref: string }>, formData: FormData): Promise<ActionState<{ ref: string }>> {
  const user = await getCurrentUser();                       // 1. who (re-check in every action)
  if (!user) return needsSignIn();
  if (!can(user.role, "write_review")) return fail("forbidden", "You can’t review providers.");
  const parsed = parseForm(reviewSchema, formData);           // 2. validate (zod)
  if (!parsed.ok) return parsed.state;
  const provider = await db.provider.findUnique({ where: { slug: parsed.data.providerSlug } });
  if (!provider || provider.status !== "published") return fail("not_found", "We couldn’t find that provider.");
  const clean = redactPersonalData(parsed.data.text);         // 3. never store phones/emails in public text
  const ref = await nextRef("review");
  await db.review.create({ data: { ref, providerId: provider.id, authorId: user.id, authorLabel: "Resident", visitMonth: parsed.data.visitMonth,
    visitType: parsed.data.visitType, answers: reviewAnswers(parsed.data), text: clean.text, redactions: clean.redactions,
    noConflict: true, verificationTags: [], autoChecks: [], flags: [] } });
  expireTags(tags.activity(user.id));                         // 4. expire what changed (§6)
  return ok(`Thank you. Your review is with a moderator. Ref ${ref}.`, { ref });
}
```

Client side:

```tsx
"use client";
const [state, action, pending] = useActionState(submitReview, idle);
<form action={action}>…<input type="hidden" name="lang" value={lang} />
  {state.status === "error" && <p role="alert">{state.message}</p>}
  {state.status === "error" && state.fieldErrors?.text?.[0]}
```

- **`ActionState`**: `{ status: "idle" } | { status: "success", message, data? } | { status: "error", code, message, fieldErrors?, data? }`.
  `code` is stable (`sign_in_required`, `invalid_input`, `forbidden`, `not_found`, `consent_required`, …);
  `message` is English, or Hindi when the form posts `lang=hi` (core actions do this). An error that
  must carry data for the form (what to ask before turning alerts on) uses `failWith(code, message, data)`.
- **Forms work without JS**: actions take `(prevState, formData)`; pass them to `useActionState` and put
  the action on `<form action>`. Ids go in hidden inputs and are re-checked on the server.
- **Moderator/editor/admin actions** call `requireRole`-style checks (`getCurrentUser()` + `isStaff()` /
  `can()` / `canOpenQueue()`), require a reason (`moderationDecisionSchema`) and call
  `writeAudit({ actor: user, action, target, reason }, tx)` in the same transaction as the change.
- **Text residents write** (reviews, questions, replies, stories, dispute details) goes through
  `redactPersonalData()` before saving; show `findPersonalData()`, `detectMedicalDetails()`,
  `detectDosageAdvice()`, `detectUrgency()` warnings while typing (pure, client-safe) with the
  wording in `SAFETY_MESSAGES`.
- **Rate limits**: OTP has its own. For other public forms, keep them simple: one submission per user
  per item (unique checks) and the moderation queue.
- Return only what the UI needs (never whole rows).

## 6. Cache tags and what to expire

Tag builders: `tags` from `@/lib/cache-tags` (re-exported by `@/lib/cache`). In a Server Action call
`expireTags(...)` (Next's `updateTag`: the user sees their change immediately). From Route Handlers or
jobs use `refreshTags(...)` (Next's `revalidateTag(tag, "max")`).

| Change | Expire |
| --- | --- |
| Provider details edited (editor, claimed provider), verification recorded, listing closed/merged | `tags.provider(slug)`, `tags.providers` (+ `tags.featured` if featured, `tags.corrections` if a correction is logged) |
| Opening hours changed | `tags.provider(slug)`, `tags.providers` |
| Review submitted (pending) | `tags.activity(userId)` |
| Review approved / rejected / withdrawn, provider reply, helpful vote | `tags.reviews(providerSlug)`, `tags.provider(providerSlug)`, `tags.activity(authorId)` |
| Review stats recomputed | `tags.reviews(slug)`, `tags.provider(slug)` |
| Report submitted | `tags.activity(userId)` |
| Report resolved with a change | the provider's tags + `tags.corrections` |
| Claim approved | `tags.provider(slug)`, `tags.providers` |
| Dispute decided / outcome published | `tags.disputes` (+ `tags.topList(slug)`, `tags.topLists` or `tags.mentions` when the ranking changes) |
| Event submitted (shown as "awaiting review") | `tags.events`, `tags.activity(userId)` |
| Event approved / rejected / cancelled / edited | `tags.event(slug)`, `tags.events` (+ `tags.society(slug)` for society events) |
| Question posted and published, reply posted, resolved, best answer, post hidden | `tags.thread(id)`, `tags.threads` |
| Helpful reaction on a post | `tags.thread(id)` |
| Mention classified, excluded or moved | `tags.mentions` |
| Society verified / profile or initiative changed | `tags.society(slug)`, `tags.societies` |
| Locality coverage or `live` changed | `tags.locality(slug)`, `tags.localities` |
| Article published / edited / corrected | `tags.article(slug)`, `tags.articles` (+ `tags.corrections`) |
| Guide published / edited | `tags.guide(slug)`, `tags.guides` |
| Top list updated | `tags.topList(slug)`, `tags.topLists` |
| Story published / withdrawn | `tags.stories` |
| Saved / unsaved | `tags.saved(userId)` (done by `toggleSaved`) |
| Follow / unfollow / alert changed | `tags.follows(userId)` (+ `tags.consent(userId)` when it turned a message type on/off; done by the follow actions) |
| Consent, channel, language, email or review label changed | `tags.consent(userId)` (+ `tags.reviews(slug)`/`tags.thread(id)` for a new review label; done by the consent actions) |
| A listing fact changes (`ListingChange` row) | `tags.provider(slug)`, `tags.providers` (saved places read it through `tags.providers`) |
| A fact report on hours opened or closed | `tags.provider(slug)` (the profile's "hours being re-checked") + `tags.activity(userId)` |
| A review edit, needs-changes reply or event change request | `tags.activity(authorId)` |

## 7. Auth, sessions and roles

**Sign-in is a phone number and a 6-digit code.** No passwords.

The steps follow the Account prototype (#signin: 1 · Your number → 2 · Code → 3 · Choices → Done):

1. `requestOtp(prev, formData{ phone, via: sms|whatsapp, resend?, lang?, next? })` normalises the
   number (Indian mobiles only, stored as `+91XXXXXXXXXX`; field errors in the prototype's words:
   "Please enter all 10 digits. You’ve typed 8."), checks the limits, creates an `OtpChallenge` and
   sends the code by SMS or WhatsApp through the configured `OtpSender` (WhatsApp only sends the code;
   it signs the person up for nothing). The challenge id goes into an httpOnly cookie (`hg_otp`), so
   step 2 needs only the code. `data`: `phoneMasked`, `via`, `resent`, `resendAt` (the 0:30
   countdown), `expiresAt`, and in development with `OTP_PROVIDER=dev` `devCode` for the
   "Development mode: your code is 123456" note. "Send a new code by SMS" / "Send it by WhatsApp
   instead" post again with `resend=1` (message: "… Earlier codes no longer work.").
2. `verifyOtp(prev, formData{ code, lang?, next? })` checks the code, creates the user on first
   sign-in (recording "Gave your mobile number, for sign-in codes only" in the consent record),
   applies `ADMIN_PHONES` and starts a session. Then: first sign-in → `data.firstSignIn = true` (show
   "Choices"); returning with `next` → redirect there (same-site paths only); returning without →
   `data.firstSignIn = false` ("Welcome back").
3. `saveWelcomeChoices(prev, formData{ messageLang: en|hi, weekly?, local?, locality?, next? })`, first
   sign-in only and all optional: the language for messages and codes, the Weekly Gurgaon Health
   Report on WhatsApp, alerts for one locality (follows it with WhatsApp alerts). Each choice is a
   line in the consent record ("At your first sign-in").
4. `signOut(formData{ lang?, next? })` deletes the session and goes to `next` or `/account?signed_out=1`.

Code rules (`src/lib/auth/otp.ts`, unit-tested): 6 digits; stored only as
`HMAC-SHA256(AUTH_SECRET, challengeId:phone:code)`; expire after 10 minutes; **3 wrong tries** per code
("That code didn’t match 3 times, so it has stopped working", each attempt counted atomically before
comparing); 30 seconds between sends; at most 5 codes per phone and 20 per network (hashed IP) per
rolling hour (`OTP_MAX_PER_PHONE_PER_HOUR`, `OTP_MAX_PER_IP_PER_HOUR`); a new code invalidates
earlier ones. Messages: `codeMismatchMessage(n)` in `validation/auth.ts`.

**Sessions** (`src/lib/auth/session.ts`): a random 32-byte token in an httpOnly, `SameSite=Lax`
cookie (`hg_session`; `__Host-hg_session` and `Secure` in production); the database stores only its
SHA-256; 30-day expiry, no sliding. Deleting the account or `deleteAllSessions(userId)` signs out
everywhere.

**In pages**:

```tsx
<Suspense fallback={<SignedOutView />}>
  <MyThing />
</Suspense>

async function MyThing() {
  const user = await getCurrentUser();   // SessionUser | null — { id, role, phoneMasked, displayName, lang,
                                         //   reviewLabel, professionalLabel, area, localitySlug }
  …
}
```

- `getCurrentUser()` is deduplicated per request (React `cache`), reads the cookie and the session
  row. Never call it inside `'use cache'` or at the top of a layout.
- `requireUser({ next, lang })` redirects signed-out visitors to `/account?next=…` (`/hi/account` for Hindi).
  `src/proxy.ts` does the same earlier, as a real 307 that works without JavaScript, for the private
  pages in its `PRIVATE` list (account pages, `/admin`, society dashboards, "Ask", "Submit an event")
  when there is no session cookie at all. It is only an optimistic check: pages keep calling
  `requireUser`/`requireRole`. Add a new private page to `PRIVATE` too.
- `requireRole(roles, opts)` / `requirePermission(permission, opts)` additionally show the 404 page to
  signed-in users without the role (private areas don't reveal they exist; Next's `forbidden()` needs
  the experimental `authInterrupts` flag, which isn't enabled).
- In **Server Actions**, use `getCurrentUser()` and return `needsSignIn()` / `notAllowed()` instead of
  redirecting; check roles with `can()` / `isStaff()` / `canOpenQueue()`.

**Roles** (`src/lib/auth/permissions.ts`): `resident | champion | provider | rwa | moderator | editor | admin`.
`PERMISSIONS` transcribes the Website Plan's table as rendered (● full, ◐ own items only / after
verification: pass `{ own: true }`). Admin queues: moderators get reviews, reports, events, community
and the audit log; editors and admins also claims, disputes, verification and listings, can verify
credentials and reveal private contact details (logged). `ADMIN_PHONES` grants admin on sign-in; it
never demotes.

## 8. Privacy rules in code

- Phone numbers are never public: `SessionUser.phoneMasked` (`+91 98XXX XX321`), `maskPhone()`.
  Provider business phones are fetched on click (`getPublicPhone()` from a Server Action).
  Organiser, reporter and claimant contact details stay in private columns; admins reveal them with
  `revealPrivateDetails()`, which writes `private.reveal` to the audit log.
- Personal data typed into public text is removed on the server with `redactPersonalData()`
  (phones incl. landlines, emails, Aadhaar-like 12-digit numbers, PAN). Helplines (112, 108, 14416,
  1800 toll-free) are kept.
- No personal data in URLs or cache tags (ids and slugs only).
- **Messages and consent** (`src/lib/consent.ts`, wording in `src/lib/consent-text.ts`): five message
  types (Weekly Gurgaon Health Report `weekly_report`, Gurugram camps & public-health alerts
  `city_channel`, Locality alerts `locality_updates`, Replies to my questions `community_replies`,
  Changes to things I saved `saved_changes`), each on or off and coming by **one** channel, WhatsApp or
  email (SMS is only for sign-in codes). Every change appends a `Consent` line in the account page's
  words: `summary` ("Turned on: Locality alerts for Sohna Road"), `context` ("On the Sohna Road
  locality page. You tapped Follow and chose WhatsApp alerts."), tag AGREED / STOPPED / CHANGED /
  SETTING / SIGN-IN ONLY, the exact `wording` agreed to and `CONSENT_VERSION`. Account lines (language,
  email confirmed, number for codes only) have no purpose. `ConsentState` holds on/off per type and
  channel, `confirmedAt` and `lastSentAt` ("Last sent Fri 23 Oct"). Senders must call
  `hasConsent(userId, purpose)` (a homepage yes counts only after the WhatsApp "YES") and
  `isOnStopList(phone)`.
- Follow alerts ride on a message type: locality/society → Locality alerts, thread/topic → Replies,
  provider → Changes to things I saved. Turning alerts on while the type is off returns code
  `consent_required` with `data.ask` ("Send alerts about X?"); posting again with `confirm=1` turns
  the type on. Turning off or unfollowing the last alerting locality turns Locality alerts off.
- `stopAllWhatsApp` stops every type that comes by WhatsApp in one tap (`data.stopped` for
  `undoStopAllWhatsApp`, allowed for 30 minutes). The homepage WhatsApp sign-up
  (`subscribeWeeklyReport`) needs no account: it keeps the number as an unverified contact and records
  the homepage's own tick-box wording, pending the WhatsApp "YES".
- Email for messages: `requestEmailChange` sends a 24-hour link (dev: logged, and returned as
  `data.devLink`); the page at `?confirm_email=<token>` posts `confirmEmail`. The record stores the
  address masked (`a•••••@example.com`) so nothing identifying survives an account deletion.
- How reviews and posts are signed: `reviewLabelOptions(user)` (`src/lib/review-label.ts`), saved with
  `setReviewLabel`, which relabels every review and post the person wrote.
- `exportMyData` returns everything held about the person as JSON (the prototype's sections, full
  number included). `deleteMyAccount(publishedReviews: keep|remove)`: required choice when there is a
  published review; withdraws every consent, deletes saved items, follows, sessions, email links and
  reviews waiting for a moderator or for changes; a published review stays signed “Former resident”
  (keep) or is withdrawn (remove); reports, events, disputes and claims stay without the person's
  details; the phone goes on the stop list as an HMAC for a year; then redirects to
  `/account?deleted=1&review=…`.
- We never collect medical records: forms warn about diagnoses and prescriptions; there is no upload
  storage.

## 9. Search and ranking

**Search** (`src/lib/search.ts`, pure; `runSearch()` loads the cached catalogue):

- URL parameters: `q, locality, kind (doctor|clinic|hospital|lab|pharmacy), own, ftype (facility type
  slug), lang (repeat), fee (500|1000|1500), open, wheelchair, female, homevisits, fresh, sort
  (fresh|dist|name), page`. Use `parseSearchParams()` / `toSearchQuery()`.
- Locality aliases: "GCER", "Sec 56", "DLF 3", "Sohna Rd", Hindi names and sector numbers ("Sector 65"
  → Golf Course Ext. Road) both in the locality picker (`searchLocalities()`) and inside a query
  ("chemist gcer").
- Specialties: names, synonyms ("child doctor", "pediatrician") and conditions ("child fever",
  "toothache", "knee rehab") from the `Specialty` table; several concepts must all match
  ("paediatric cardiologist").
- Typos: one edit for 5–8 letters, two for longer (adjacent swaps count once), with `didYouMean`.
- Filters only use verified values ("Unknown values are never assumed"): unknown hours aren't open,
  unknown fees don't pass a fee ceiling.
- Sponsored listings are never inside the ordered results: at most one comes back in `sponsored`
  (shown only when there are other results), with the prototype's sort notes.
- No results returns `noResults`: broader searches, nearby live localities (schematic map) + "All
  Gurugram", and how many results the filters hid; `emergency.urgent` flags red-flag symptoms.
- Sorts: most recently verified (then distance), nearest (distance from the provider's locality
  centre, the number on the card), name.

**Neighbour score** (`scoreNeighbourMentions()` in `src/lib/ranking.ts`, as "Neighbour Recommendation
System" defines it): one vote per resident (their latest mention); weight = sentiment (+1 strong,
+0.5 mild, −1 negative) × trust (1.5 verified visit, 1 established, 0.3 new account) × recency (0.4
after 12 months); score = positive weight × share of positive weight (negatives enter only through
this balance, as in the page's demo `x²/(x+negatives)`); questions, conflicts of interest and
allegations never count; at least 5 different residents recommending in the last 12 months, else
"Not enough neighbour discussion yet"; a burst of new-account praise freezes the score. The method
page's demo is `rankDemo()` over `NEIGHBOUR_DEMO_DOCS` (reproduces the prototype's order).

**Top lists**: `topListScore([experience, access, information, value])` = 40/20/20/20, rounded down;
providers need 15 verified reviews in 12 months (`TOP_LIST_MIN_REVIEWS`).

## 10. Switching to PostgreSQL

1. In `prisma/schema.prisma`, set `provider = "postgresql"`.
2. Set `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/healthgurgaon?schema=public"`.
3. `npm run setup` (development) — or, for production, create migrations instead of pushing:
   `npx prisma migrate dev --name init` once, then `npx prisma migrate deploy` on deploy.
   Seed only non-production databases (`db:seed` refuses when `NODE_ENV=production` unless
   `SEED_ALLOW_PRODUCTION=1`).

Nothing else changes: enums become PostgreSQL enums, `Json` becomes `jsonb`, ids are generated by
Prisma, the code avoids SQLite-only features (case-insensitive `contains`, Json null filters and
scalar lists are not used; name matching is done in JS), and the seed's WAL pragma only runs for
`file:` URLs.

## 11. Plugging in a real SMS/WhatsApp sender

`src/lib/auth/otp-sender.ts` defines:

```ts
export interface OtpSender {
  readonly name: string;
  send(message: { phone: string; code: string; expiresAt: Date; lang: "en" | "hi"; purpose: "sign_in"; channel: "sms" | "whatsapp" }): Promise<{ delivered: boolean; reference?: string }>;
}
```

To add one (for example MSG91):

1. Create `src/lib/auth/otp-sender-msg91.ts` exporting an `OtpSender` that calls the provider's HTTP API
   with `fetch`, reading its credentials from env vars (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`; for Twilio
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`; for WhatsApp Cloud API `WHATSAPP_TOKEN`,
   `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_OTP_TEMPLATE`). Throw on a failed send; never log the code.
2. In `getOtpSender()`, return it when `OTP_PROVIDER` is `"msg91"` (throw `OtpConfigError` when its env
   vars are missing).
3. Document the variables in `.env.example`, set `OTP_PROVIDER=msg91` in the deployment.

Notes: Indian SMS needs a DLT-registered template whose text matches `otpMessageText()` exactly;
WhatsApp needs an approved "authentication" template. The dev sender refuses to run in production
unless `OTP_DEV_ALLOW_IN_PRODUCTION=1` (staging only: codes end up in server logs). Claim
verification texts the clinic number on record; landlines need a voice-call sender. A sender that
can't do `channel: "whatsapp"` should throw, so the page can offer "Send it by SMS instead".

Emails (address confirmation links) go through `src/lib/messaging/email-sender.ts` the same way
(`EMAIL_PROVIDER`, default `dev`, which logs the email and shows the link on screen in development).
Message senders (weekly report, alerts) don't exist yet; they must check `hasConsent()`,
`isOnStopList()` and update `ConsentState.lastSentAt`.

## 12. Sample data and reseeding

`npm run db:seed` wipes every table and reloads `prisma/seed-data/*`, taken from the prototype:

| File | Source |
| --- | --- |
| `localities.ts` | Local and Events `LOCALITIES` (coverage, checked dates, the Sohna Road page); names/aliases/map from `src/lib/localities.ts` |
| `specialties.ts` | Find care specialty page (Paediatrics explainer, reviewer, FAQs); facility types from Top Lists `TYPES` |
| `providers.ts` | Find care `PROVIDERS`, `ER`, `BLOOD`, profiles; Homepage providers and featured hospitals; Sohna Road lists; Top Lists entries and `FAC`; claim search |
| `reviews.ts` | Find care reviews, `HOSP_REV`; Admin queue RV-8830 and RV-8826; Account HG-RV-8412 (the Find care profile's first review), HG-RV-8796 (returned for changes), HG-RV-8817 (in moderation) |
| `events.ts` | Local and Events `EVENTS` + the eye-camp page; Homepage details; Admin EV-5182; society dashboard; Account "Events I submitted" (HG-EV-5190 changes requested, 5182, 5179) with their progress |
| `content.ts` | Content and Trust `NEWS`, corrections log, the specialist guide; guide titles linked elsewhere |
| `community.ts` | Community `THREADS`, the GCER chemist thread, `ROLES`, Sector 57 RWA; locality and hospital discussions; Admin CM-1904 |
| `top-lists.ts` | Top Lists `LISTS`, `CATS`, `STORIES`; hospital stories tab |
| `neighbours.ts` | Neighbour Recommendation System and every "Recommended by N neighbours" (mention rows are generated per resident) |
| `trust.ts` | Admin CL-0311 and the audit log; Content and Trust dispute outcomes; Account reports HG-3107 (checking), HG-2041 (couldn’t verify), HG-1987 (fixed), concern HG-CC-0112, dispute HG-DS-0402; `LISTING_CHANGES` (Prakash Path Labs’ Sunday hours, Sai Medicos 24 h) |
| `users.ts`, `account.ts` | test accounts; the Account prototype's sample resident: saved places and the eye camp, follows, the 7-line consent record (`LEDGER0`), confirmation and last-sent dates |

Most prototype screens are set on 16 Oct 2026 (`SAMPLE_REFERENCE_DATE`): "checked 4 days ago" became
12 Oct 2026, and so on. The Account prototype is set on Tue 27 Oct 2026 and its later dates win where
they overlap (HG-2041, waiting in the Admin queue on 16 Oct, was answered on 20 Oct; the reports queue
now holds HG-3107). Opening hours that the prototype doesn't print are sample placeholders consistent
with its open/closed flags (`hoursSource: "Sample hours (not yet verified)"`).

## 13. Decisions and open questions

- **Permissions table**: several rows of the plan's table have 9 characters for 8 roles, so the last
  column is cut off when rendered. `PERMISSIONS` follows the table as rendered: "Write a review" =
  Resident, Provider, Editor, Admin (not Champion, RWA rep, Moderator); "Edit own provider profile" =
  Provider ◐, Admin; "Manage society profile" = RWA ◐, Admin. Product should confirm; it's one table.
- **Account prototype** (integrated): message types, consent record lines, sign-in steps (3 tries,
  SMS or WhatsApp, first-sign-in choices), email for messages, review signatures and deletion follow
  it. Where it disagrees with another screen, the other screen's content wins: the resident follows
  the 24-hour chemist discussion from 14 Oct (not 24 Oct) so "2 new replies" still holds against the
  Community thread's dates; HG-RV-8790 became HG-RV-8412 (same review). The purpose once called
  `event_updates` is `saved_changes` ("Changes to things I saved").
- **Stop all, one line or several**: the prototype writes one "Stopped all WhatsApp messages (2)"
  line; the record writes one STOPPED line per message type (same time and context), so each type's
  history stays complete.
- **Snapshots vs live counts**: locality coverage, provider review totals, department scores and thread
  reply counts are the prototype's numbers. When real data accumulates, recompute them (a job that
  counts verified providers per locality/category and published reviews) and expire the tags.
- **Content gaps**: articles have no body text and six guides have no sections in the prototype
  (`hasContent: false`); top lists for gynaecologists, dentists and physiotherapists have no entries.
- **Added topic** "Hospitals & insurance" for hospital discussions about insurance (not in the
  prototype's topic list).
- **Dates**: the prototype calls 16 Oct 2026 a Thursday; it was a Friday. Where the Homepage and the
  events calendar disagree (eye camp 26 Oct vs 15 Nov), the calendar and event page win.
- **`.gitignore`**: add `prisma/*.db`, `prisma/*.db-journal`, `prisma/*.db-wal`, `prisma/*.db-shm`
  so the development database isn't committed.
