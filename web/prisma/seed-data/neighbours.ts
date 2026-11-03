// Neighbour Recommendation System sample data.
// Source: "Neighbour Recommendation System.dc.html" (the live demo's DOCS, the locality widget,
// Dr. Kavya Menon's profile block: themes, quotes, "Also mentioned with concerns by 2 residents")
// and every "Recommended by N neighbours" line on the Homepage, Find care and Local and Events.
// The seed turns each spec into individual mention rows (one per resident) so the counts shown
// are computed by src/lib/ranking.ts, not stored.

import type { SeedMentionSpec } from "./types";

export const MENTION_SPECS: SeedMentionSpec[] = [
  {
    provider: "dr-ananya-rao",
    locality: "sector-56",
    specialty: "paediatrics",
    recentPositive: 19,
    themes: { "Explains clearly": 9, "Good with toddlers": 6 },
  },
  {
    provider: "dr-kavya-menon",
    locality: "sohna-road",
    specialty: "paediatrics",
    recentPositive: 24,
    olderPositive: 2,
    negative: 2,
    verifiedVisit: 9,
    newAccounts: 2,
    themes: { "Great with toddlers": 11, "Explains clearly": 9, "Answers calls after hours": 6, "Newborn care": 5 },
    negativeThemes: { "Waiting time": 2 },
    quotes: [
      { text: "Calm with our newborn and answered our call at 10 pm when we panicked.", meta: "SECTOR 49 · SEP 2026", on: "2026-09-14" },
      { text: "Took time to explain the vaccine schedule. Highly recommend.", meta: "NIRVANA COUNTRY · AUG 2026", on: "2026-08-22" },
      { text: "Dr. Menon on Sohna Road is brilliant with toddlers, highly recommend.", meta: "SOHNA ROAD · JUL 2026", on: "2026-07-11" },
    ],
  },
  // Below the minimum of 5 residents: "Not enough neighbour discussion yet" (the 3 Oct dispute outcome).
  { provider: "movewell-physio", locality: "sohna-road", specialty: "physiotherapy", recentPositive: 4 },
  // Hospitals and care centres ("Recommended by N neighbours" on featured cards). The prototype
  // gives only the count, so every resident is an established, strongly positive one.
  { provider: "aravali-multispeciality-hospital", locality: "golf-course-ext-road", recentPositive: 41 },
  { provider: "district-civil-hospital", locality: "sector-56", recentPositive: 28 },
  { provider: "sohna-road-care-hospital", locality: "sohna-road", recentPositive: 19 },
  { provider: "homebridge-recovery", locality: "sohna-road", recentPositive: 8 },
  { provider: "sector-56-care-hospital", locality: "sector-56", recentPositive: 12 },
  { provider: "urban-primary-health-centre-sector-31", locality: "sector-56", recentPositive: 9 },
  { provider: "gurgaon-super-speciality-institute", locality: "golf-course-road", recentPositive: 63 },
  { provider: "shanti-nursing-home", locality: "dlf-phases-1-5", recentPositive: 15 },
  { provider: "esic-hospital", locality: "golf-course-road", recentPositive: 11 },
  { provider: "sukoon-palliative-care", locality: "dlf-phases-1-5", recentPositive: 7 },
  { provider: "sewa-trust-hospital", locality: "new-gurgaon", recentPositive: 14 },
  { provider: "new-gurgaon-24h-diagnostics-hospital", locality: "new-gurgaon", recentPositive: 6 },
  { provider: "community-health-centre-new-gurgaon", locality: "new-gurgaon", recentPositive: 5 },
];

// The method page's live demo doctors are illustrative aggregates, not listings: they live in
// src/lib/neighbour-demo.ts (NEIGHBOUR_DEMO_DOCS) and are not seeded.
