// Ordering 24×7 emergency departments by distance from a locality. Pure, so the emergency page
// can re-sort when the "Your locality" select changes.

import { ALL_GURUGRAM, getLocality, LOCALITIES } from "./localities";

export type EmergencyDepartment = {
  slug: string;
  name: string;
  areaLabel: string;
  ownership: string;
  children: boolean;
  source: string;
  checkedAt: string;
  /** km from each locality centre; "gurugram" = Rajiv Chowk. */
  kmFrom: Record<string, number>;
};

/** Locality choices offered on the emergency page (the localities we have distances for). */
export function emergencyLocalityOptions(departments: EmergencyDepartment[]): { slug: string; name: string }[] {
  const known = new Set(departments.flatMap((d) => Object.keys(d.kmFrom)));
  return [{ slug: ALL_GURUGRAM.slug, name: ALL_GURUGRAM.name }, ...LOCALITIES.filter((L) => known.has(L.slug)).map((L) => ({ slug: L.slug, name: L.name }))];
}

/** Nearest first from `fromSlug` ("gurugram" or a locality slug). Departments without a
 * distance for that place go last. Each row gets `distanceKm`. */
export function orderEmergencyDepartments<T extends EmergencyDepartment>(departments: T[], fromSlug: string | null): (T & { distanceKm: number | null })[] {
  const from = fromSlug && (fromSlug === ALL_GURUGRAM.slug || getLocality(fromSlug)) ? fromSlug : ALL_GURUGRAM.slug;
  return departments
    .map((d) => ({ ...d, distanceKm: d.kmFrom[from] ?? null }))
    .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name));
}

/** "Nearest first, by approximate distance from Rajiv Chowk in central Gurugram…" */
export function emergencyOrderNote(fromSlug: string | null): string {
  const L = getLocality(fromSlug);
  return L
    ? `Nearest first, by approximate distance from the centre of ${L.name}.`
    : "Nearest first, by approximate distance from Rajiv Chowk in central Gurugram. Choose your locality to reorder.";
}

/** Red flags: "Go straight to emergency, don't wait for an appointment, if someone has:" */
export const RED_FLAGS = ["Chest pain", "Trouble breathing", "Signs of stroke: face drooping, arm weakness, slurred speech", "Heavy bleeding", "A seizure"] as const;

export const EMERGENCY_NUMBERS = {
  all: { number: "112", label: "All emergencies: ambulance, police, fire" },
  ambulance: { number: "108", label: "Emergency ambulance" },
  mentalHealth: { number: "14416", label: "Tele-MANAS (free, 24×7, national)" },
} as const;
