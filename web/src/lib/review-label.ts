// How reviews and posts are signed: a description and an area, never a name, number or address.
// Pure. Source: Account → "How your reviews and posts are signed" and "Delete your account".

/** What a kept review is signed after its author deletes their account. */
export const FORMER_RESIDENT_LABEL = "Former resident";

/** The label for someone who hasn't chosen one: "Resident · Sector 57", or "Resident · Gurugram". */
export function defaultReviewLabel(area?: string | null): string {
  return area?.trim() ? `Resident · ${area.trim()}` : "Resident · Gurugram";
}

/** The choices offered, most specific first. For "Parent of a 2-year-old · Sector 57" that is
 * ["Parent of a 2-year-old · Sector 57", "Parent · Sector 57", "Resident · Gurugram"]. */
export function reviewLabelOptions(user: { reviewLabel?: string | null; area?: string | null }): string[] {
  const current = user.reviewLabel?.trim() || defaultReviewLabel(user.area);
  const [descriptor, place] = current.split(" · ").map((s) => s.trim());
  const area = user.area?.trim() || (place && place !== "Gurugram" ? place : null);
  const short = descriptor?.split(/\s+(?:of|from|with|for)\s+/i)[0]?.trim() || "Resident";
  const options = [current, area ? `${short} · ${area}` : null, "Resident · Gurugram"];
  return [...new Set(options.filter((o): o is string => !!o))];
}
