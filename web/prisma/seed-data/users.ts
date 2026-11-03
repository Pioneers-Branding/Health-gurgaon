// Test accounts, one or more per role. Sign in with these numbers; in development the code is
// shown on the sign-in screen. +91 90000 00001 must match ADMIN_PHONES in .env.
// Names come from the prototype where it names people (Admin and Mobile audit log, Community
// society team); the rest describe the account's purpose.
//
// "resident" is the Account prototype's sample resident: a parent in Sector 57 who first signed
// in on 20 Sep 2026 (saved places, follows, reviews, reports, events, a dispute and the consent
// record are in account.ts, reviews.ts, trust.ts and events.ts). The prototype masks the number
// as +91 98XXX XX321; here it is the test number +91 90000 00007.

import type { SeedUser } from "./types";

export const USERS: SeedUser[] = [
  { key: "admin", phone: "+919000000001", role: "admin", displayName: "Admin" },
  { key: "editor", phone: "+919000000002", role: "editor", displayName: "S. Bansal" },
  { key: "moderator", phone: "+919000000003", role: "moderator", displayName: "R. Mehta" },
  { key: "champion", phone: "+919000000004", role: "champion", displayName: "Meena", locality: "sector-56" },
  { key: "provider", phone: "+919000000005", role: "provider", displayName: "Little Steps Clinic (manager)", locality: "sector-56" },
  { key: "rwa", phone: "+919000000006", role: "rwa", displayName: "R. Kapoor", locality: "sector-56", area: "Sector 57" },
  {
    key: "resident",
    phone: "+919000000007",
    role: "resident",
    displayName: "Resident, Sector 57",
    locality: "sector-56",
    area: "Sector 57",
    reviewLabel: "Parent of a 2-year-old · Sector 57",
    email: "anu@example.com",
    emailVerified: "2026-10-03 20:20",
    lang: "en",
    firstSignIn: "2026-09-20 18:04",
  },
  { key: "claimant", phone: "+919000000008", role: "resident", displayName: "Dr. Vikram Sethi", locality: "sector-56" },
  { key: "pharmacist", phone: "+919000000009", role: "resident", displayName: "Pharmacist, Sector 66", locality: "golf-course-ext-road", area: "Sector 66", reviewLabel: "Pharmacist · Sector 66", professionalLabel: "Verified pharmacist" },
  // The first-time reviewer behind HG-RV-8830 in the Admin reviews queue.
  { key: "neighbour", phone: "+919000000010", role: "resident", displayName: "New resident, Sector 57", locality: "sector-56", area: "Sector 57", reviewLabel: "Resident · Sector 57", firstSignIn: "2026-10-16 09:40" },
];
