// Sample data for the method page's live demo (/trust/neighbour-recommendations):
// "Paediatricians, Sohna Road: raw count vs safeguarded". Aggregates exactly as the prototype
// ("Neighbour Recommendation System.dc.html", DOCS); rank them with rankDemo() from ./ranking.
// Pure. These doctors are illustrative and are not listings.

import type { DemoDoc } from "./ranking";

export const NEIGHBOUR_DEMO_DOCS: DemoDoc[] = [
  { name: "Dr. Kavya Menon", raw: 34, unique: 26, newAcct: 2, verified: 9, old: 4, neg: 2, conflict: 0 },
  { name: "Dr. Sunil Arora", raw: 58, unique: 21, newAcct: 15, verified: 1, old: 2, neg: 1, conflict: 5 },
  { name: "Dr. Ritu Saxena", raw: 40, unique: 30, newAcct: 1, verified: 5, old: 22, neg: 6, conflict: 0 },
  { name: "Dr. Imran Qureshi", raw: 22, unique: 18, newAcct: 1, verified: 8, old: 1, neg: 1, conflict: 0 },
  { name: "Dr. Vivek Jain", raw: 30, unique: 24, newAcct: 2, verified: 4, old: 3, neg: 16, conflict: 0 },
  { name: "Dr. Pooja Nair", raw: 5, unique: 4, newAcct: 0, verified: 3, old: 0, neg: 0, conflict: 0 },
];

/** How each mention is classified (the page's examples). */
export const MENTION_EXAMPLES = [
  { quote: "Dr. Menon on Sohna Road is brilliant with toddlers, highly recommend.", label: "Strong positive", weight: "+1.0" },
  { quote: "We went to Dr. Qureshi, he was fine, clinic was clean.", label: "Mild positive", weight: "+0.5" },
  { quote: "Dr. Jain kept us waiting 2 hours and barely explained anything.", label: "Negative experience", weight: "−1.0" },
  { quote: "Does anyone know if Dr. Saxena still practises in Sector 49?", label: "Question only, not counted", weight: "0" },
  { quote: "As Dr. Arora’s clinic manager, I can say he’s the best in Gurgaon!", label: "Conflict of interest, excluded", weight: "0" },
  { quote: "Dr. X is a fraud who ruined my son’s life.", label: "Allegation, held for moderator", weight: "hold" },
] as const;
