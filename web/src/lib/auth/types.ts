// Auth types shared by server and client code. Pure: no runtime imports.
// `Role` and `SessionUser` are also re-exported from src/lib/auth/session.ts (the contract the
// app shell imports); client components should import them from here.

export type Role = "resident" | "champion" | "provider" | "rwa" | "moderator" | "editor" | "admin";

export type SessionUser = {
  id: string;
  role: Role;
  /** e.g. "+91 98XXX XX321" — never expose the full number in UI */
  phoneMasked: string;
  displayName: string | null;
  lang: "en" | "hi";
  /** How their reviews and posts are signed: "Parent of a 2-year-old · Sector 57". */
  reviewLabel: string;
  /** "Verified pharmacist": shown next to answers from checked professionals. */
  professionalLabel: string | null;
  /** The area they chose ("Sector 57") and its locality slug, to show what's near them first. */
  area: string | null;
  localitySlug: string | null;
};
