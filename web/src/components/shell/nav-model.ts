import { stripLangPrefix } from "@/lib/i18n/paths";
import { CITY_SLUG } from "@/lib/routes";

/** Header sections; a page "belongs" to one for the active nav state. */
export type NavSection = "findCare" | "topLists" | "localities" | "events" | "community" | "healthyNeighbourhoods";

/** Bottom-bar tabs on phones. */
export type MobileTab = "home" | "search" | "events" | "ask" | "saved";

const FIND_CARE = ["search", "doctors", "doctor", "hospital", "lab", "pharmacy", "emergency"];
const TOP_LISTS = ["top", "stories", "facilities"];
const HEALTHY = ["healthy-neighbourhoods", "society"];
/** The volunteer page sits under Community in the prototype's header. */
const COMMUNITY = ["community", "volunteer"];
const CITY_SECTIONS = new Set([...FIND_CARE, ...TOP_LISTS, ...HEALTHY, ...COMMUNITY, "localities", "events", "news", "guides"]);

/** Which header section a pathname belongs to (accepts /hi/... and /en/... forms). */
export function navSectionFor(pathname: string): NavSection | null {
  const segments = stripLangPrefix(pathname).path.split("/").filter(Boolean);
  if (segments[0] !== CITY_SLUG || segments.length < 2) return null;
  const s = segments[1];
  if (FIND_CARE.includes(s)) return "findCare";
  if (TOP_LISTS.includes(s)) return "topLists";
  if (HEALTHY.includes(s)) return "healthyNeighbourhoods";
  if (s === "events") return "events";
  if (COMMUNITY.includes(s)) return "community";
  if (s === "localities" || !CITY_SECTIONS.has(s)) return "localities"; // /gurgaon/sohna-road
  return null;
}

export function mobileTabFor(pathname: string): MobileTab | null {
  const path = stripLangPrefix(pathname).path;
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 1 && segments[0] === CITY_SLUG) return "home";
  if (segments[0] === "account" && segments[1] === "saved") return "saved";
  if (segments[0] !== CITY_SLUG) return null;
  if (segments[1] === "search") return "search";
  if (segments[1] === "events") return "events";
  if (segments[1] === "community") return "ask";
  return null;
}
