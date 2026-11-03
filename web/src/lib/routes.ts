/**
 * Typed URL builders for every HealthGurgaon route. Never hand-write a path:
 *
 *   <Link href={routes.doctor(lang, doctor.slug)}>…</Link>
 *   redirect(routes.accountSaved(lang))
 *   pageMetadata({ lang, href: (l) => routes.event(l, slug), … })
 *
 * Every builder takes the language first and returns the public URL
 * (English unprefixed, Hindi under /hi). Slugs are URI-encoded; empty, null,
 * undefined and false query values are dropped; `true` becomes "1".
 * Slugs are lowercase a-z, 0-9 and hyphens: a path containing a dot skips the
 * language proxy (it is treated as a file) and would 404.
 * Never put personal data (phone numbers, emails, names of patients) in a URL.
 */
import { ADMIN_QUEUES, type AdminQueue } from "@/lib/auth/permissions";
import type { Lang } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/paths";

/** City segment of every city route. The city in copy is "Gurugram". */
export const CITY_SLUG = "gurgaon";

export const PROVIDER_KINDS = ["doctor", "hospital", "lab", "pharmacy"] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];

/** Things that can be reported as incorrect (/report/[kind]/[slug]). */
export const REPORTABLE_KINDS = [...PROVIDER_KINDS, "event", "article", "thread"] as const;
export type ReportableKind = (typeof REPORTABLE_KINDS)[number];

/** The admin queues (/admin/[queue]); one list, kept with the role table that gates them. */
export { ADMIN_QUEUES, type AdminQueue } from "@/lib/auth/permissions";

/** Anchors on /trust. The trust page must give these ids to its sections ("ordering" is the
 * "How lists are ordered" card). */
export const TRUST_SECTIONS = ["verification", "badges", "editorial", "ordering", "sponsorship", "reviews", "privacy", "corrections"] as const;
export type TrustSection = (typeof TRUST_SECTIONS)[number];

/** Anchors on /gurgaon/emergency. */
export const EMERGENCY_SECTIONS = ["emergency-departments", "ambulance", "blood-banks"] as const;
export type EmergencySection = (typeof EMERGENCY_SECTIONS)[number];

export const isProviderKind = (v: string): v is ProviderKind => (PROVIDER_KINDS as readonly string[]).includes(v);
export const isReportableKind = (v: string): v is ReportableKind => (REPORTABLE_KINDS as readonly string[]).includes(v);
export const isAdminQueue = (v: string): v is AdminQueue => (ADMIN_QUEUES as readonly string[]).includes(v);

type QueryValue = string | number | boolean | null | undefined | ReadonlyArray<string | number>;
type Query = Record<string, QueryValue>;

/**
 * /gurgaon/search query. Known keys are typed; feature pages may add more
 * (the index signature accepts any string key).
 *  - intent: "review" | "report" | "claim" — global "Write a review" / "Report incorrect
 *    information" / "Claim your profile" links: the search page asks the reader to pick the
 *    listing, and each result's action goes to that listing's review, report or claim form.
 */
export type SearchParams = {
  q?: string;
  locality?: string;
  type?: ProviderKind | (string & {});
  intent?: "review" | "report" | "claim";
  sort?: string;
  view?: "list" | "map";
  page?: number;
  [key: string]: QueryValue;
};

/** /report/[kind]/[slug] query (see routes.report). */
export type ReportParams = {
  type?: "fact" | "complaint" | "missing";
  field?: string;
  review?: string;
};

/** /dispute/[kind]/[slug] query (see routes.dispute). */
export type DisputeParams = {
  target?: "ranking" | "mention" | "review";
  list?: string;
};

function seg(value: string): string {
  return encodeURIComponent(value);
}

function withQuery(path: string, query?: Query, hash?: string): string {
  const sp = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "" || value === false) continue;
      if (Array.isArray(value)) {
        for (const v of value) sp.append(key, String(v));
      } else {
        sp.append(key, value === true ? "1" : String(value));
      }
    }
  }
  const qs = sp.toString();
  return `${path}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}

function at(lang: Lang, path: string, query?: Query, hash?: string): string {
  return localizePath(lang, withQuery(path, query, hash));
}

const city = (rest = "") => `/${CITY_SLUG}${rest}`;

function provider(lang: Lang, kind: ProviderKind, slug: string): string {
  return at(lang, city(`/${kind}/${seg(slug)}`));
}

export const routes = {
  /** Homepage. "/" redirects here. */
  home: (lang: Lang) => at(lang, city()),

  // Find care
  search: (lang: Lang, params?: SearchParams) => at(lang, city("/search"), params),
  specialty: (lang: Lang, specialty: string) => at(lang, city(`/doctors/${seg(specialty)}`)),
  provider,
  doctor: (lang: Lang, slug: string) => provider(lang, "doctor", slug),
  hospital: (lang: Lang, slug: string) => provider(lang, "hospital", slug),
  lab: (lang: Lang, slug: string) => provider(lang, "lab", slug),
  pharmacy: (lang: Lang, slug: string) => provider(lang, "pharmacy", slug),
  providerReviews: (lang: Lang, kind: ProviderKind, slug: string) => at(lang, city(`/${kind}/${seg(slug)}/reviews`)),
  emergency: (lang: Lang, section?: EmergencySection) => at(lang, city("/emergency"), undefined, section),

  // Local & events
  localities: (lang: Lang) => at(lang, city("/localities")),
  locality: (lang: Lang, slug: string) => at(lang, city(`/${seg(slug)}`)),
  events: (lang: Lang, params?: { type?: string; locality?: string; free?: boolean; verified?: boolean; month?: string; day?: number }) =>
    at(lang, city("/events"), params),
  event: (lang: Lang, slug: string) => at(lang, city(`/events/${seg(slug)}`)),
  submitEvent: (lang: Lang) => at(lang, city("/events/submit")),

  // Content
  news: (lang: Lang, params?: { category?: string }) => at(lang, city("/news"), params),
  article: (lang: Lang, slug: string) => at(lang, city(`/news/${seg(slug)}`)),
  guides: (lang: Lang) => at(lang, city("/guides")),
  guide: (lang: Lang, slug: string) => at(lang, city(`/guides/${seg(slug)}`)),

  // Community
  /** sort: recent | helpful | unanswered. */
  community: (lang: Lang, params?: { topic?: string; locality?: string; sort?: string }) => at(lang, city("/community"), params),
  thread: (lang: Lang, id: string) => at(lang, city(`/community/t/${seg(id)}`)),
  ask: (lang: Lang, params?: { topic?: string; locality?: string }) => at(lang, city("/community/ask"), params),
  healthyNeighbourhoods: (lang: Lang) => at(lang, city("/healthy-neighbourhoods")),
  society: (lang: Lang, slug: string) => at(lang, city(`/society/${seg(slug)}`)),
  societyDashboard: (lang: Lang, slug: string) => at(lang, city(`/society/${seg(slug)}/dashboard`)),
  /** for: residents | professionals; role: a volunteer role id. */
  volunteer: (lang: Lang, params?: { for?: string; role?: string }) => at(lang, city("/volunteer"), params),

  // Top lists & stories
  /** group: doctors | hospitals | care-centres | diagnostics | government; q: the list search. */
  topLists: (lang: Lang, params?: { group?: string; q?: string }) => at(lang, city("/top"), params),
  /** own: private | government | charitable; locality: a locality slug ("Best in Sohna Road"). */
  topList: (lang: Lang, list: string, params?: { own?: string; locality?: string }) => at(lang, city(`/top/${seg(list)}`), params),
  /** category: a story topic; share: open "Share your story"; story: open one story's player. */
  stories: (lang: Lang, params?: { category?: string; share?: boolean; story?: string }) => at(lang, city("/stories"), params),
  facilities: (lang: Lang, params?: { type?: string; ownership?: string }) => at(lang, city("/facilities"), params),

  // Trust
  trust: (lang: Lang, section?: TrustSection) => at(lang, "/trust", undefined, section),
  neighbourRecommendations: (lang: Lang) => at(lang, "/trust/neighbour-recommendations"),
  disputes: (lang: Lang) => at(lang, "/trust/disputes"),

  // Contributions (about one listing or item). The optional query only pre-selects the form.
  review: (lang: Lang, kind: ProviderKind, slug: string) => at(lang, `/review/${kind}/${seg(slug)}`),
  claim: (lang: Lang, kind: ProviderKind, slug: string) => at(lang, `/claim/${kind}/${seg(slug)}`),
  /**
   *  - type: which form opens first ("Something is missing", "A concern about care or conduct").
   *  - field: the fact to pre-select ("timings", "accessibility"…, REPORT_FIELDS keys).
   *  - review: a published review's reference ("HG-RV-8412"): "Report" under a single review,
   *    checked by a moderator against the review policy.
   */
  report: (lang: Lang, kind: ReportableKind, slug: string, params?: ReportParams) => at(lang, `/report/${kind}/${seg(slug)}`, params),
  /** target: "ranking" | "mention" | "review"; list: the top list being disputed. */
  dispute: (lang: Lang, kind: ProviderKind, slug: string, params?: DisputeParams) => at(lang, `/dispute/${kind}/${seg(slug)}`, params),
  /**
   * "Suggest a listing" / "Suggest a provider we're missing": the report form's "Something is
   * missing" option on its own (there is no listing to report against yet).
   *  - locality: a locality slug, pre-filled in the form ("sohna-road").
   */
  suggestListing: (lang: Lang, params?: { locality?: string }) => at(lang, "/report/missing", params),

  // Account (private)
  /** Sign in. `next` must be a path from this builder, never an outside URL. */
  account: (lang: Lang, params?: { next?: string }) => at(lang, "/account", params),
  accountSaved: (lang: Lang) => at(lang, "/account/saved"),
  accountActivity: (lang: Lang) => at(lang, "/account/activity"),
  accountConsent: (lang: Lang) => at(lang, "/account/consent"),

  // Admin (private)
  admin: (lang: Lang) => at(lang, "/admin"),
  adminQueue: (lang: Lang, queue: AdminQueue) => at(lang, `/admin/${queue}`),

  /** Design system reference (noindex). */
  styleguide: (lang: Lang) => at(lang, "/styleguide"),
} as const;

export type Routes = typeof routes;
