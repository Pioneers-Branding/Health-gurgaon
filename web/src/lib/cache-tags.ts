// Cache tags used by the 'use cache' read functions in src/lib/data/*. Pure.
//
// After a mutation, expire the tags it affects from the Server Action:
//   import { expireTags } from "@/lib/cache";
//   expireTags(tags.provider(slug), tags.providers);
// docs/BACKEND.md has the table of which mutation expires which tags.
//
// Tags are stored in plain text: never put personal data in them (ids and slugs only).

export const tags = {
  /** Any list, search or directory of providers (search catalogue, specialty pages, emergency). */
  providers: "providers",
  provider: (slug: string) => `provider:${slug}`,
  /** Published reviews and review stats of one provider. */
  reviews: (providerSlug: string) => `reviews:${providerSlug}`,
  specialties: "specialties",
  facilityTypes: "facility-types",
  localities: "localities",
  locality: (slug: string) => `locality:${slug}`,
  /** Featured hospitals per locality (homepage, locality pages). */
  featured: "featured",
  events: "events",
  event: (slug: string) => `event:${slug}`,
  articles: "articles",
  article: (slug: string) => `article:${slug}`,
  corrections: "corrections",
  guides: "guides",
  guide: (slug: string) => `guide:${slug}`,
  threads: "threads",
  thread: (id: string) => `thread:${id}`,
  societies: "societies",
  society: (slug: string) => `society:${slug}`,
  volunteerRoles: "volunteer-roles",
  topLists: "top-lists",
  topList: (slug: string) => `top-list:${slug}`,
  stories: "stories",
  /** Neighbour mentions and every score computed from them. */
  mentions: "neighbour-mentions",
  /** Published dispute outcomes. */
  disputes: "disputes",
  /** Per-user data (cached by user id, invalidated by that user's own actions). */
  saved: (userId: string) => `user:${userId}:saved`,
  follows: (userId: string) => `user:${userId}:follows`,
  consent: (userId: string) => `user:${userId}:consent`,
  activity: (userId: string) => `user:${userId}:activity`,
} as const;
