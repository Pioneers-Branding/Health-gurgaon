// The Gurgaon Health Report (news), the corrections log and guides.
// Source: "Health Gurgaon Content and Trust.dc.html" (NEWS, corrections, the guide article) and
// the Homepage guide cards; guide titles linked from Find care, Local and Events and Top Lists.
// The prototype has no article bodies and only one written guide: other guides carry their
// title, kicker and review line with empty sections until editors write them.

import type { SeedArticle, SeedCorrection, SeedGuide } from "./types";

export const ARTICLES: SeedArticle[] = [
  {
    slug: "dengue-season-district-health-department-advice",
    label: "reporting",
    category: "PUBLIC HEALTH",
    title: "Dengue season: what the district health department is advising this month",
    dek: "Fogging schedules by sector, where to get tested, and the warning signs that need a doctor.",
    sourceNote: "Sources: district health department advisory; interviews with two physicians",
    published: "2026-10-15 08:00",
  },
  {
    slug: "new-24-hour-diagnostic-centre-new-gurgaon",
    label: "reporting",
    category: "NEW SERVICES",
    title: "A new 24-hour diagnostic centre opens in New Gurgaon",
    dek: "What it offers, its hours, and how it fills a gap for Sectors 82–95.",
    sourceNote: "Verified with the facility on 12 Oct",
    published: "2026-10-13 08:00",
  },
  {
    slug: "five-health-camps-this-week",
    label: "roundup",
    category: "THIS WEEK",
    title: "Five health camps this week, and how to check one before you go",
    dek: "Eye, diabetes and women’s health camps across Sohna Road, Sector 56 and GCER.",
    sourceNote: "All organisers confirmed by phone",
    published: "2026-10-16 07:00",
  },
  {
    slug: "why-every-society-should-train-guards-in-cpr",
    label: "opinion",
    category: "COMMUNITY",
    title: "Why every society should train its guards in CPR",
    dek: "An RWA president on what changed after their first workshop.",
    sourceNote: "Opinion: views are the author’s own",
    published: "2026-10-11 08:00",
  },
  {
    slug: "free-bone-density-screening-women-over-50",
    label: "sponsored",
    category: "PARTNER",
    title: "Free bone-density screening for women over 50 this month",
    dek: "Information provided by Aravali Hospital. Not editorial content.",
    sourceNote: "Paid announcement · labelled per our sponsorship policy",
    sponsorName: "Aravali Multispeciality Hospital",
    published: "2026-10-10 08:00",
  },
  {
    slug: "planned-sector-level-health-centres",
    label: "reporting",
    category: "INFRASTRUCTURE",
    title: "What the planned sector-level health centres could mean for residents",
    dek: "We read the plan documents and asked officials about timelines.",
    sourceNote: "Sources: municipal planning documents; official statement",
    published: "2026-10-08 08:00",
  },
];

/** "LOCAL HEALTH NEWS · UPDATED 16 OCT 2026". */
export const NEWS_UPDATED = "2026-10-16";

export const CORRECTIONS: SeedCorrection[] = [
  { kind: "corrected", text: "Clinic opening date in Sector 82 corrected from 10 Oct to 20 Oct (news article).", on: "2026-10-12" },
  { kind: "verified", text: "Sai Medicos hours updated after resident report: open 24h confirmed.", on: "2026-10-09", provider: "sai-medicos" },
  { kind: "merged", text: "Duplicate listing of a dental clinic on Sohna Road merged.", on: "2026-10-05", provider: "smile-square-dental" },
  { kind: "updated", text: "Event cancelled by organiser; marked cancelled within 2 hours.", on: "2026-10-01" },
];

export const GUIDES: SeedGuide[] = [
  {
    slug: "how-to-find-the-right-specialist",
    title: "How to find the right specialist in Gurugram when you're not sure who to see",
    category: "Navigating care",
    tag: "GUIDE · NON-EMERGENCY CARE",
    reviewedBy: "Dr. P. Sharma, MD (General Medicine)",
    reviewNote: "Reviewed by a general physician",
    writtenBy: "the HealthGurgaon guides desk",
    updated: "2026-10-04",
    nextReview: "2027-04-04",
    sections: [
      {
        heading: "Start with a general physician",
        body: "For most new, non-emergency problems, a general physician (GP) or family doctor is the right first stop. They can treat many conditions directly and know which specialist to refer you to, which saves time and avoids paying for the wrong consultation.",
      },
      {
        heading: "When going straight to a specialist makes sense",
        body: "If you already have a diagnosed condition (diabetes, thyroid, a heart condition) or a clear problem in one area (a child’s routine vaccinations, pregnancy, dental pain, eye check-ups), you can usually see the relevant specialist directly.",
      },
      {
        heading: "Questions to ask before you book",
        body: "Does the doctor see this kind of problem often? Which days are they at this clinic? What does a consultation cost and is a follow-up included? Do they speak a language you’re comfortable in? Is the clinic step-free if you need it?",
      },
      {
        heading: "How to use HealthGurgaon to compare",
        body: "Filter by locality, language and verified fee. Check the “last checked” date and the verification record. Read reviews for practical details like waiting times, but remember they describe individual experiences, not clinical quality.",
      },
    ],
    emergencyNote:
      "If it's an emergency (chest pain, difficulty breathing, signs of stroke, heavy bleeding) don't look for a specialist. Call 112 or go to the nearest emergency department.",
    localNote: {
      text: "Many neighbourhood clinics have a general physician with OPD in the morning and evening. Large hospitals on Golf Course Road and Golf Course Ext. Road run specialist OPDs most weekdays; most need an appointment by phone. Government health centres provide free consultations; see the district health department for current timings.",
      ctaLabel: "Find a verified general physician near you",
      ctaKind: "search",
      ctaQuery: "General physician",
    },
    disclaimer: "This guide is general information to help you navigate local services. It isn't medical advice and can't replace a consultation.",
    relatedSpecialties: ["general-medicine"],
    relatedGuides: ["choosing-a-diagnostic-centre"],
  },
  {
    slug: "choosing-a-diagnostic-centre",
    title: "What to check before choosing a diagnostic centre",
    category: "Diagnostics",
    tag: "GUIDE · DIAGNOSTICS",
    reviewNote: "Reviewed by a pathologist",
    updated: "2026-09-15",
    sections: [],
    relatedSpecialties: ["pathology", "radiology"],
  },
  {
    slug: "organise-a-health-camp-in-your-society",
    title: "How to organise a health camp in your housing society, step by step",
    category: "For RWAs",
    tag: "GUIDE · FOR RWAs",
    reviewNote: "Written with Gurugram RWAs",
    updated: "2026-10-06",
    sections: [],
  },
  {
    slug: "child-vaccination-schedule-gurugram",
    title: "Your child's vaccination schedule, and where to get vaccines in Gurugram",
    category: "Children",
    tag: "GUIDE · CHILDREN",
    updated: "2026-10-02",
    sections: [],
    relatedSpecialties: ["paediatrics"],
  },
  {
    slug: "questions-first-paediatric-visit",
    title: "Questions to ask at your first paediatric visit",
    category: "Children",
    tag: "GUIDE · CHILDREN",
    updated: "2026-10-02",
    sections: [],
    relatedSpecialties: ["paediatrics"],
  },
  {
    slug: "planning-for-emergencies-in-your-society",
    title: "Planning for emergencies in your society",
    category: "For RWAs",
    tag: "GUIDE · EMERGENCIES",
    updated: "2026-10-06",
    sections: [],
  },
  {
    slug: "choosing-transition-care",
    title: "Choosing transition care",
    category: "Care after hospital",
    tag: "GUIDE · TRANSITION CARE",
    updated: "2026-10-06",
    sections: [],
  },
];
