/**
 * English strings. This object defines the shape of every dictionary:
 * hi.ts is typed as `Dictionary`, so TypeScript fails if Hindi misses a key
 * (or adds one). Values are plain strings; use {placeholders} with fmt() from
 * "@/lib/i18n" instead of functions, so slices can be passed to Client Components.
 *
 * Naming rule: the brand is always "HealthGurgaon"; the city in copy is
 * "Gurugram". "New Gurgaon", "(sample)" names and "The Gurgaon Health Report"
 * keep "Gurgaon".
 */
export const en = {
  meta: {
    siteName: "HealthGurgaon",
    defaultTitle: "HealthGurgaon · Verified local healthcare in Gurugram",
    titleTemplate: "%s · HealthGurgaon",
    description:
      "Find verified doctors, hospitals, labs and chemists in Gurugram, each checked and dated. Plus health camps, trusted local health news and guides, and neighbours who can help.",
  },

  common: {
    skipToContent: "Skip to main content",
    loading: "Loading…",
    close: "Close",
    back: "Back",
    menu: "Menu",
    sample: "sample",
    seeAll: "See all",
    opensInNewTab: "opens in a new tab",
    required: "Required",
    optional: "optional",
    error: "Error",
  },

  topStrip: {
    label: "Emergency numbers",
    emergency: "Emergency? Call 112",
    ambulance: "Ambulance 108",
    notForEmergencies: "Not for emergencies · 24×7 emergency departments →",
    emergencyNote: "Ambulance 108 · This site is not for emergencies",
    language: "Language",
    larger: "Larger text",
    contrast: "High contrast",
  },

  locality: {
    city: "Gurugram",
    all: "All of Gurugram",
    buttonLabel: "Your locality: {name}. Change",
    title: "Choose your locality",
    help: "We show what’s near you first. Your choice stays on this device.",
    allLocalities: "All localities",
    comingSoon: "Page coming soon",
  },

  header: {
    homeLink: "HealthGurgaon home",
    navLabel: "Main",
    nav: {
      findCare: "Find care",
      topLists: "Top lists",
      localities: "Localities",
      events: "Events",
      community: "Community",
      healthyNeighbourhoods: "Healthy Neighbourhoods",
    },
    contribute: "Contribute",
    contributeMenu: {
      writeReview: "Write a review",
      reportIncorrect: "Report incorrect information",
      submitEvent: "Submit an event",
      volunteer: "Volunteer",
    },
    signIn: "Sign in",
    myAccount: "My account",
    sos: "SOS 112",
    sosLabel: "SOS 112: call emergency services",
    menu: "Menu",
  },

  mobileNav: {
    label: "Quick links",
    home: "Home",
    search: "Search",
    events: "Events",
    ask: "Ask",
    saved: "Saved",
  },

  searchOverlay: {
    title: "Search healthcare",
    placeholder: "Search healthcare in Gurugram",
    close: "Close search",
    submit: "Search",
    localities: "Choose a locality",
    allCity: "All Gurugram",
    recent: "Recent",
    clearRecent: "Clear",
    noRecent: "Your recent searches will show here. They stay on this device.",
    popularIn: "Popular in {place}",
    popular: ["Child doctor", "Lab", "Physio", "Chemist", "Vaccination"],
    emergencyTitle: "Emergency?",
    emergencyCall: "Call 112",
    ambulance: "Ambulance 108",
    emergencyDepartments: "24×7 emergency departments →",
  },

  menuSheet: {
    title: "Menu",
    close: "Close menu",
    findCare: {
      title: "Find care",
      doctors: "Doctors",
      hospitals: "Hospitals & clinics",
      diagnostics: "Diagnostics",
      chemists: "Chemists",
      bloodBanks: "Blood banks",
      emergency: "Emergency departments",
    },
    topLists: {
      title: "Top lists",
      lists: "All top lists",
      stories: "Patient stories",
      facilities: "Hospitals & care centres",
    },
    localities: {
      title: "Localities",
      all: "All localities",
    },
    events: {
      title: "Events & camps",
      calendar: "Calendar",
      submit: "Submit an event",
    },
    community: {
      title: "Community",
      ask: "Ask your neighbourhood",
      healthy: "Healthy Neighbourhoods",
      volunteer: "Volunteer",
    },
    trust: {
      title: "Trust centre",
      how: "How verification works",
      report: "Report incorrect info",
      news: "The Gurgaon Health Report",
      guides: "Local health guides",
    },
    signInOtp: "Sign in with OTP",
    myAccount: "My account",
  },

  footer: {
    tagline:
      "Your neighbourhood's health network. Independent, verified local healthcare information for Gurugram. Basic listings are free for every provider; paid placements are always labelled.",
    findCare: {
      title: "Find care",
      doctors: "Doctors",
      hospitals: "Hospitals & clinics",
      diagnostics: "Diagnostics",
      chemists: "24-hour chemists",
      bloodBanks: "Blood banks",
    },
    community: {
      title: "Community",
      events: "Events calendar",
      ask: "Ask your neighbourhood",
      healthy: "Healthy Neighbourhoods",
      volunteer: "Volunteer",
    },
    read: {
      title: "Read",
      news: "The Gurgaon Health Report",
      guides: "Local health guides",
      topLists: "Top lists",
      stories: "Patient stories",
    },
    trust: {
      title: "Trust centre",
      how: "How verification works",
      editorial: "Editorial policy",
      sponsorship: "Sponsorship policy",
      reviews: "Review policy",
      privacy: "Privacy",
      recommendations: "Neighbour recommendations",
      disputes: "Dispute outcomes",
    },
    notAdvice: "Information on this site is not medical advice. In an emergency call 112 (ambulance 108).",
    sampleNote: "Names marked (sample) are fictional examples.",
    comingSoon: "Delhi, Noida coming soon",
  },

  /** Homepage copy. The first block is the prototype's EN/HI table, verbatim. */
  home: {
    kicker: "GURUGRAM · VERIFIED LOCAL HEALTHCARE",
    h1: "Find healthcare around your neighbourhood.",
    sub: "Doctors, clinics, labs and chemists near you, each checked and dated. Plus health camps, local updates and neighbours who can help.",
    searchPh: "Doctor, clinic, lab, chemist…",
    search: "Search",
    trust: "Every listing shows when we last checked it.",
    howVerify: "How verification works",
    browse: "Browse healthcare in Gurugram",
    events: "Health camps & events",
    localities: "Healthcare by locality",
    ask: "Ask your neighbourhood",
    guides: "Local health guides",
    involved: "Help keep Gurugram’s health information right",

    searchLabel: "What do you need",
    localityLabel: "Locality",
    emptyQuery: "Type what you need, for example “child doctor” or “MRI”.",
    quickSearches: ["Paediatrician", "Open-now chemist", "Home sample collection", "Physiotherapy at home", "Dentist on Sunday"],
    heroPhoto: "PHOTO · residents at a society health camp, Gurugram",
    nextCampNear: "Next camp near {place}",
    allServices: "All services →",
    categories: {
      doctors: { name: "Doctors", desc: "By specialty and language" },
      hospitals: { name: "Hospitals", desc: "Departments and emergency" },
      clinics: { name: "Clinics", desc: "Neighbourhood practices" },
      diagnostics: { name: "Diagnostics", desc: "Labs and home collection" },
      imaging: { name: "Imaging", desc: "X-ray, MRI, CT, ultrasound" },
      dental: { name: "Dental", desc: "Clinics and orthodontists" },
      physiotherapy: { name: "Physiotherapy", desc: "Clinic and home visits" },
      mentalHealth: { name: "Mental health", desc: "Counsellors and psychiatrists" },
      homeHealthcare: { name: "Home healthcare", desc: "Nursing and elder care" },
      chemists: { name: "24-hour chemists", desc: "Open-late pharmacies" },
      bloodBanks: { name: "Blood banks", desc: "Licensed banks and drives" },
      vaccination: { name: "Vaccination", desc: "Children and adults" },
      governmentHospitals: { name: "Government hospitals", desc: "Free and low-cost care" },
      nursingHomes: { name: "Nursing homes", desc: "Small in-patient facilities" },
      transitionCare: { name: "Transition care", desc: "Between hospital and home" },
      hospice: { name: "Hospice & palliative", desc: "Comfort care, home visits" },
    },
    topLists: {
      kicker: "Top lists · {month}",
      title: "Gurugram’s top-rated healthcare, ranked by verified patients",
      desc: "One published method for every list. Government, private and charitable facilities are compared like for like. Nobody can pay to rank.",
      cta: "All top lists →",
    },
    facilityTypes: {
      government: "Government",
      private: "Private",
      charitable: "Charitable / trust",
      nursingHomes: "Nursing homes",
      transitionCare: "Transition care",
      hospice: "Hospice & palliative",
      dialysis: "Dialysis centres",
    },
    stories: {
      title: "Patient stories",
      desc: "Video experiences from Gurugram residents: consented, visit-confirmed, privacy-edited and never paid for.",
      all: "All stories",
      share: "Share your story",
    },
    recentlyVerified: {
      title: "Recently verified near {place}",
      desc: "Listed by most recently checked, not by who pays.",
      howOrder: "How we order lists",
      viewProfile: "View profile",
      contact: "Contact",
      emptyTitle: "No recently verified listings in {place} yet.",
      emptyBody:
        "We only show what we've checked. Try a nearby locality, or tell us about a clinic, lab or chemist you use.",
      showPlace: "Show {place}",
      suggestListing: "Suggest a listing",
    },
    featuredHospitals: {
      kicker: "Featured hospitals",
      title: "Hospitals serving {place}",
      desc: "The main hospitals residents of this area use, chosen by our editors for coverage and access, with government and private facilities shown side by side.",
      all: "All",
      emergency247: "24×7 emergency",
      recommendedBy: "Recommended by {count} neighbours",
      noneOfType: "No verified {type} hospitals serving {place} yet.",
      showAll: "Show all",
      note: "Featured hospitals are chosen editorially for coverage and access, not ranked by quality. At most one sponsored hospital appears, always labelled.",
      allHospitals: "All hospitals & care centres →",
    },
    eventsSection: {
      desc: "Verified events are checked with the organiser. Others are clearly marked until reviewed.",
      fullCalendar: "Full calendar",
      submit: "+ Submit an event",
      filters: { all: "All", camps: "Camps", bloodDrives: "Blood drives", workshops: "Workshops", free: "Free" },
    },
    localitiesSection: {
      desc: "What's verified, open late and coming up in each part of the city.",
      all: "All localities →",
    },
    askSection: {
      cta: "Ask a question",
      guidelines: "Community guidelines",
      replies: "{count} replies",
      status: { resolved: "Resolved", pharmacistAnswered: "Pharmacist answered", open: "Open" },
    },
    healthReport: {
      title: "The Gurgaon Health Report",
      allUpdates: "All updates →",
    },
    guidesSection: {
      library: "Guide library →",
    },
    rwa: {
      badge: "Healthy Neighbourhoods",
      title: "Run a health camp in your society? Let the neighbourhood know.",
      body: "RWAs, resident groups and NGOs can list verified camps, blood drives and workshops, find volunteers and share what they've done. Free to join. We don't promise sponsors or free services; we help the right people hear about your work.",
      register: "Register your society",
      how: "See how it works",
      steps: [
        { title: "Register", desc: "Society name, locality and one authorised contact. Informal resident groups welcome." },
        { title: "We verify", desc: "A quick call or letterhead check. Usually within 3 working days." },
        { title: "Publish", desc: "Use a template to list your camp. Share it straight to your society WhatsApp." },
      ],
    },
    involve: {
      champion: {
        who: "Residents, students, professionals",
        title: "Become a Community Health Champion",
        desc: "Help check listings, report events and support camps. Voluntary roles, with training and clear limits on what you can access.",
        cta: "See roles",
      },
      correction: {
        who: "Anyone",
        title: "Suggest a correction",
        desc: "Wrong timings, closed clinic, outdated fee? Tell us and we'll check it. You'll see the status of your report.",
        cta: "Report incorrect info",
      },
      claim: {
        who: "Doctors, clinics, labs",
        title: "Claim your profile",
        desc: "Basic listings are free. Verify your identity to update timings, services and contact details.",
        cta: "Claim a profile",
      },
    },
    whatsapp: {
      title: "The weekly Gurgaon Health Report, on WhatsApp",
      desc: "One message a week: verified camps, new services and public health notices. No ads, no forwards. Leave anytime by replying STOP.",
      phoneLabel: "WhatsApp number",
      subscribe: "Subscribe",
      consent: "I agree to receive one weekly message from HealthGurgaon. My number won't be shared or added to groups.",
      errorPhone: "Enter a 10-digit mobile number.",
      errorConsent: "Please tick the consent box so we can message you.",
      done: "You'll get a confirmation message on WhatsApp. Reply YES to start.",
    },
  },

  /** Title and description of every route (metadata and page headings). */
  pages: {
    home: {
      title: "Find healthcare around your neighbourhood",
      description:
        "Verified doctors, hospitals, labs and chemists in Gurugram, each checked and dated. Plus health camps, local health news and neighbours who can help.",
    },
    search: {
      title: "Search healthcare",
      description: "Search verified doctors, hospitals, clinics, labs and chemists in Gurugram by specialty, locality, language and fee.",
    },
    specialty: {
      title: "Doctors by specialty",
      description: "Verified doctors in Gurugram for this specialty, the localities they serve and when each listing was checked.",
    },
    doctor: {
      title: "Doctor profile",
      description: "Registration, qualifications, fees, languages, timings and reviews, each with its source and the date it was checked.",
    },
    hospital: {
      title: "Hospital profile",
      description: "Departments, doctors, emergency information and accessibility, each with its source and the date it was checked.",
    },
    lab: {
      title: "Diagnostic centre",
      description: "Tests offered, home collection and opening hours, with the date each detail was confirmed.",
    },
    pharmacy: {
      title: "Pharmacy",
      description: "Opening hours, delivery and accessibility, with the date each detail was confirmed.",
    },
    reviews: {
      title: "Reviews and discussions",
      description: "Moderated patient experiences and neighbourhood discussions. Reviews describe experiences, not clinical quality.",
    },
    emergency: {
      title: "Emergency care and blood banks",
      description: "24×7 emergency departments, ambulance numbers and licensed blood banks in Gurugram. In an emergency, call 112.",
    },
    localities: {
      title: "Healthcare by locality",
      description: "What's verified, open late and coming up in each part of Gurugram.",
    },
    locality: {
      title: "Healthcare in {name}",
      description: "Verified doctors, hospitals, labs and chemists in {name}, plus upcoming health camps and local discussions.",
    },
    events: {
      title: "Health camps & events",
      description: "Health camps, blood drives and workshops across Gurugram. Verified events are checked with the organiser.",
    },
    event: {
      title: "Event details",
      description: "Date, venue, eligibility, cost and how the organiser was verified.",
    },
    submitEvent: {
      title: "Submit an event",
      description: "List a health camp, blood drive or workshop. We check every organiser before an event is marked verified.",
    },
    news: {
      title: "The Gurgaon Health Report",
      description: "Dated, sourced local health news for Gurugram, with opinion and sponsored content clearly labelled.",
    },
    article: {
      title: "Article",
      description: "A dated, sourced story from The Gurgaon Health Report.",
    },
    guides: {
      title: "Local health guides",
      description: "Practical guides to finding and using healthcare in Gurugram, reviewed by professionals.",
    },
    guide: {
      title: "Guide",
      description: "A practical health guide for Gurugram residents, reviewed by a professional.",
    },
    community: {
      title: "Ask your neighbourhood",
      description: "Questions and answers from Gurugram residents. Neighbours share experiences, not medical advice.",
    },
    thread: {
      title: "Discussion",
      description: "A neighbourhood discussion. Phone numbers and personal details are removed automatically.",
    },
    ask: {
      title: "Ask a question",
      description: "Ask your neighbours about local healthcare. Please don’t share medical records or personal details.",
    },
    healthyNeighbourhoods: {
      title: "Healthy Neighbourhoods",
      description: "How RWAs, resident groups and NGOs in Gurugram list verified health camps and find volunteers.",
    },
    society: {
      title: "Society profile",
      description: "Health initiatives, upcoming camps and completed activities of a Gurugram housing society.",
    },
    societyDashboard: {
      title: "Society dashboard",
      description: "Private dashboard for verified society representatives.",
    },
    volunteer: {
      title: "Become a Community Health Champion",
      description: "Voluntary roles to help check listings, report events and support camps, with training and clear limits.",
    },
    topLists: {
      title: "Top lists",
      description: "Gurugram’s top-rated healthcare, ranked by verified patients with one published method. Nobody can pay to rank.",
    },
    topList: {
      title: "Top list",
      description: "A ranked list with its published method, data window and minimum number of verified reviews.",
    },
    stories: {
      title: "Patient stories",
      description: "Video experiences from Gurugram residents: consented, visit-confirmed, privacy-edited and never paid for.",
    },
    facilities: {
      title: "Hospitals & care centres",
      description: "Government, private and charitable hospitals, nursing homes, transition care and hospices in Gurugram.",
    },
    trust: {
      title: "Trust centre",
      description: "How verification works, what each badge means, and our editorial, sponsorship, review and privacy policies.",
    },
    neighbourRecommendations: {
      title: "How neighbour recommendations work",
      description: "The published method behind “Recommended by neighbours”: what counts, what doesn’t, and how to dispute it.",
    },
    disputes: {
      title: "Dispute outcomes",
      description: "A public log of disputed rankings, mentions and reviews, with each outcome and its reason.",
    },
    review: {
      title: "Write a review",
      description: "Share a genuine experience to help your neighbours. Every review is checked for privacy before it appears.",
    },
    claim: {
      title: "Claim a profile",
      description: "Providers verify their identity and registration to update timings, services and contact details.",
    },
    report: {
      title: "Report incorrect information",
      description: "Tell us what’s wrong. Facts go to our editors; concerns about care go to a separate review.",
    },
    dispute: {
      title: "Dispute a ranking or review",
      description: "Ask an editor to check a ranking, a neighbour mention or a review against the published method.",
    },
    account: {
      title: "Sign in",
      description: "Sign in with your mobile number and a one-time code. No passwords.",
    },
    accountSaved: {
      title: "Saved & followed",
      description: "Doctors, places and events you saved, and the localities and topics you follow.",
    },
    accountActivity: {
      title: "My reviews & reports",
      description: "The reviews, reports and events you submitted, and where each one is in review.",
    },
    accountConsent: {
      title: "WhatsApp & email",
      description: "What you’ve agreed to receive, with a one-tap way to stop.",
    },
    admin: {
      title: "Moderation",
      description: "Queues, verification desk and audit log for moderators, editors and admins.",
    },
    adminQueue: {
      title: "{queue}",
      description: "Items waiting for review, with time limits and the reason for every decision.",
    },
    styleguide: {
      title: "Style guide",
      description: "HealthGurgaon design tokens and components.",
    },
  },

  adminQueues: {
    reviews: "Reviews queue",
    reports: "Reports queue",
    events: "Events queue",
    claims: "Claims queue",
    disputes: "Disputes queue",
    community: "Community queue",
    stories: "Stories queue",
    verification: "Verification desk",
    listings: "Listings editor",
    audit: "Audit log",
  },

  placeholder: {
    kicker: "Coming in the next phase",
    body: "This page is being built in the next phase. Its design is final in the clickable prototype.",
    builtFrom: "Built from the prototype",
    details: "This address",
    back: "Back to the homepage",
  },

  notFound: {
    kicker: "404 · Page not found",
    title: "We couldn’t find that page",
    body: "The link may be old, or the page may have moved. Try a search, or start again from the homepage.",
    home: "Go to the homepage",
    search: "Search healthcare",
    urgent: "Need urgent help? Call 112.",
  },

  breadcrumbs: {
    label: "Breadcrumb",
    home: "Gurugram",
  },

  badges: {
    registrationChecked: "Registration checked",
    facilityChecked: "Facility checked",
    organiserVerified: "Organiser verified",
    communitySubmitted: "Awaiting review",
    credentialsChecked: "Credentials checked",
    hoursChecked: "Hours checked",
    verified: "Verified",
    sponsored: "Sponsored",
    notSponsored: "Not sponsored",
    ownership: {
      private: "Private",
      government: "Government",
      charitable: "Charitable",
      ppp: "PPP",
    },
  },

  stamps: {
    checked: "Checked {date}",
    lastChecked: "Last checked {date}",
    updated: "Updated {date}",
    confirmed: "Confirmed {date}",
  },

  sponsored: {
    label: "Sponsored · Not part of these results",
    region: "Sponsored listing",
  },

  disclaimers: {
    medical: "This page is general information, not medical advice.",
    listing: "Listing order and this profile are not influenced by payment.",
    community: "Neighbours share experiences, not medical advice. For anything urgent, call 112 or see a doctor.",
    emergency: "In an emergency call 112 (ambulance 108).",
    verification:
      "Verification confirms identity, registration and listed details. It doesn’t rate or guarantee clinical quality or outcomes.",
  },

  stepper: {
    progress: "Step {current} of {total}",
    done: "done",
    current: "current step",
  },

  timeline: {
    done: "Done",
    next: "Next",
    later: "Later",
  },
};

export type Dictionary = typeof en;
