// Locality coverage snapshots and the Sohna Road page copy.
// Source: "Health Gurgaon Local and Events.dc.html" (LOCALITIES doc/care/pharm/checked/extra,
// the Sohna Road page and its category counts). The names, aliases, sectors and map positions
// come from src/lib/localities.ts, which the seed copies into the Locality table.

import type { SeedLocalityExtra } from "./types";

export const LOCALITY_EXTRAS: SeedLocalityExtra[] = [
  {
    slug: "sohna-road",
    stats: {
      doctors: 27,
      careFacilities: 16,
      pharmaciesLabs: 15,
      extra: "Also verified here: 4 home-care agencies and 5 physiotherapists.",
      categories: { clinics: 14, labs: 6, chemists: 9, home_care: 4, physio: 5, hospitals: 2 },
    },
    statsChecked: "2026-10-14",
    description:
      "A residential stretch with many neighbourhood clinics and labs, and multi-speciality hospitals about 15 minutes away.",
    gettingCare:
      "Nearest 24×7 emergency departments are on Golf Course Ext. Road and Sector 38. During evening traffic, allow 25–40 minutes. Two chemists on this stretch are verified open 24 hours.",
    editorLabel: "Local desk",
    pageUpdated: "2026-10-14",
  },
  { slug: "sector-56", stats: { doctors: 34, careFacilities: 19, pharmaciesLabs: 17 }, statsChecked: "2026-10-14", editorLabel: "Local desk" },
  { slug: "golf-course-road", stats: { doctors: 41, careFacilities: 22, pharmaciesLabs: 13 }, statsChecked: "2026-10-11", editorLabel: "Local desk" },
  { slug: "golf-course-ext-road", stats: { doctors: 23, careFacilities: 12, pharmaciesLabs: 14 }, statsChecked: "2026-10-13", editorLabel: "Local desk" },
  { slug: "dlf-phases-1-5", stats: { doctors: 38, careFacilities: 21, pharmaciesLabs: 16 }, statsChecked: "2026-10-13", editorLabel: "Local desk" },
  { slug: "new-gurgaon", stats: { doctors: 4, careFacilities: 3, pharmaciesLabs: 2 }, statsChecked: "2026-10-15" },
  { slug: "sushant-lok-1", stats: { doctors: 6, careFacilities: 4, pharmaciesLabs: 3 }, statsChecked: "2026-10-12" },
  { slug: "palam-vihar", stats: { doctors: 3, careFacilities: 2, pharmaciesLabs: 2 }, statsChecked: "2026-10-09" },
  { slug: "dwarka-expressway", stats: { doctors: 2, careFacilities: 2, pharmaciesLabs: 1 }, statsChecked: "2026-10-06" },
];

/** "LIST CHECKED 15 OCT 2026" on the locality index. */
export const LOCALITY_LIST_CHECKED = "2026-10-15";
