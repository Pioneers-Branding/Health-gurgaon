// Closed vocabularies used across the site, with their display labels.
//
// The value lists mirror the Prisma enums in prisma/schema.prisma (tests/unit/domain.test.ts
// keeps them in sync). This module is pure: client components may import it, and it never
// imports @prisma/client at runtime.

import type {
  AlertPref,
  ArticleLabel,
  ClaimRole,
  ConsentChannel,
  ConsentPurpose,
  ContactChannel,
  DisputeReason,
  DisputeRole,
  DisputeStatus,
  DisputeTarget,
  EventStatus,
  EventType,
  FollowKind,
  OrganiserType,
  Ownership,
  ProviderKind,
  ReportStatus,
  ReportType,
  ReviewStatus,
  SavedKind,
  SocietyType,
  VolunteerAudience,
  VolunteerPay,
} from "@prisma/client";

export type {
  AlertPref,
  ArticleLabel,
  ClaimRole,
  ConsentChannel,
  ConsentPurpose,
  ContactChannel,
  DisputeReason,
  DisputeRole,
  DisputeStatus,
  DisputeTarget,
  EventStatus,
  EventType,
  FollowKind,
  OrganiserType,
  Ownership,
  ProviderKind,
  ReportStatus,
  ReportType,
  ReviewStatus,
  SavedKind,
  SocietyType,
  VolunteerAudience,
  VolunteerPay,
};

export type Lang = "en" | "hi";

/** The city in the path. Copy says "Gurugram"; URL slugs stay /gurgaon. */
export const CITY = { slug: "gurgaon", name: "Gurugram", nameHi: "गुरुग्राम" } as const;
export const SITE_NAME = "HealthGurgaon";

/** The prototype's "today": relative dates in the sample data ("checked 4 days ago") were
 * converted to absolute dates from this day. */
export const SAMPLE_REFERENCE_DATE = "2026-10-16";

// ── Providers ───────────────────────────────────────────────────────────────

export const PROVIDER_KINDS = [
  "doctor",
  "clinic",
  "hospital",
  "lab",
  "pharmacy",
  "blood_bank",
  "ambulance",
  "emergency_dept",
  "home_care",
] as const satisfies readonly ProviderKind[];

export const PROVIDER_KIND_LABELS: Record<ProviderKind, string> = {
  doctor: "Doctor",
  clinic: "Clinic",
  hospital: "Hospital",
  lab: "Diagnostic lab",
  pharmacy: "Chemist",
  blood_bank: "Blood bank",
  ambulance: "Ambulance",
  emergency_dept: "Emergency department",
  home_care: "Home care",
};

/** The URL segment of a provider's profile: /gurgaon/<profileKind>/<slug>. The Website Plan has
 * four profile templates: doctor, hospital / clinic, lab (diagnostics) and pharmacy. */
export type ProfileKind = "doctor" | "hospital" | "lab" | "pharmacy";
export const PROFILE_KINDS = ["doctor", "hospital", "lab", "pharmacy"] as const satisfies readonly ProfileKind[];

export const PROFILE_KIND_OF: Record<ProviderKind, ProfileKind> = {
  doctor: "doctor",
  clinic: "hospital",
  hospital: "hospital",
  emergency_dept: "hospital",
  home_care: "hospital",
  blood_bank: "hospital",
  ambulance: "hospital",
  lab: "lab",
  pharmacy: "pharmacy",
};

export function profileKindOf(kind: ProviderKind): ProfileKind {
  return PROFILE_KIND_OF[kind];
}

export function isProfileKind(value: string): value is ProfileKind {
  return (PROFILE_KINDS as readonly string[]).includes(value);
}

/** Provider kinds that each profile URL segment can show. */
export const KINDS_FOR_PROFILE: Record<ProfileKind, ProviderKind[]> = {
  doctor: ["doctor"],
  hospital: ["hospital", "clinic", "emergency_dept", "home_care", "blood_bank", "ambulance"],
  lab: ["lab"],
  pharmacy: ["pharmacy"],
};

/** The "Type" filter on Find care (prototype chips: All, Doctors, Clinics, Hospitals, Labs, Chemists). */
export const KIND_FILTERS = [
  { key: "doctor", label: "Doctors", kinds: ["doctor"] },
  { key: "clinic", label: "Clinics", kinds: ["clinic", "home_care"] },
  { key: "hospital", label: "Hospitals", kinds: ["hospital", "emergency_dept"] },
  { key: "lab", label: "Labs", kinds: ["lab"] },
  { key: "pharmacy", label: "Chemists", kinds: ["pharmacy"] },
] as const satisfies readonly { key: string; label: string; kinds: readonly ProviderKind[] }[];
export type KindFilter = (typeof KIND_FILTERS)[number]["key"];

export const OWNERSHIPS = ["private", "government", "charitable", "ppp"] as const satisfies readonly Ownership[];
export const OWNERSHIP_LABELS: Record<Ownership, string> = {
  private: "Private",
  government: "Government",
  charitable: "Charitable",
  ppp: "PPP",
};
export const OWNERSHIP_DESCRIPTIONS: Record<Ownership, string> = {
  government: "Run by central, state or municipal health departments",
  private: "Privately owned hospitals, nursing homes, clinics",
  charitable: "Trust or NGO-run, often subsidised",
  ppp: "Public-private partnership, government rates",
};

/** Languages offered as filters on Find care. */
export const FILTER_LANGUAGES = ["Hindi", "English", "Punjabi", "Tamil", "Telugu"] as const;

/** Verified consultation-fee ceilings offered on Find care (₹). */
export const FEE_CEILINGS = [500, 1000, 1500] as const;

/** Badge labels (Trust centre: "Badges explained"). */
export const BADGES = {
  registration: "Registration checked",
  facility: "Facility checked",
  hours: "Hours checked",
  credentials: "Credentials checked",
  clinicAddress: "Clinic address checked",
  emergency: "Emergency details sourced",
  licence: "Licence seen",
  nabl: "NABL accreditation seen",
  organiser: "Organiser verified",
  awaiting: "Awaiting review",
  community: "Community submitted",
  sponsored: "Sponsored",
} as const;

/** How often facts are re-checked (Trust centre). */
export const RECHECK_DAYS = { profile: 90, hours: 30, emergency: 30 } as const;

// ── Reviews ─────────────────────────────────────────────────────────────────

export const REVIEW_STATUSES = ["pending", "published", "needs_changes", "rejected", "withdrawn"] as const satisfies readonly ReviewStatus[];
/** As the author sees them (Account → My reviews & reports). */
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "In moderation",
  published: "✓ Published",
  needs_changes: "Needs your changes",
  rejected: "Not published",
  withdrawn: "Withdrawn",
};

/** A moderator checks a review within this many hours ("so by Wed 28 Oct"). */
export const REVIEW_MODERATION_HOURS = 48;

/** Guided questions on the review form (not star-only). Keys are stored in Review.answers. */
export const REVIEW_QUESTIONS = [
  { key: "explained", q: "Did the doctor explain things clearly?", options: ["Yes", "Somewhat", "No"] },
  { key: "waiting", q: "How was the waiting time?", options: ["Under 15 min", "15–45 min", "Over 45 min"] },
  { key: "access", q: "Was the clinic easy to reach and get into?", options: ["Yes", "Some difficulty", "No"] },
  { key: "fees", q: "Were the fees as stated?", options: ["Yes", "No", "Not sure"] },
] as const;
export type ReviewQuestionKey = (typeof REVIEW_QUESTIONS)[number]["key"];

export const REVIEW_VISIT_TYPES = [
  "Routine check-up / vaccination",
  "Illness consultation",
  "Follow-up",
  "Prefer not to say",
] as const;

export const REVIEW_MIN_LENGTH = 40;
export const REVIEW_MAX_LENGTH = 2000;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

/** Options for "When did you visit?": the current month and the two before it (India time),
 * then "Earlier in <year>". The prototype on 16 Oct 2026 showed October, September, August 2026
 * and "Earlier in 2026". */
export function visitMonthOptions(now: Date, count = 3): string[] {
  const ist = new Date(now.getTime() + 330 * 60_000);
  let y = ist.getUTCFullYear();
  let m = ist.getUTCMonth();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(`${MONTHS[m]} ${y}`);
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  out.push(`Earlier in ${y}`);
  return out;
}

// ── Reports, disputes, claims ───────────────────────────────────────────────

export const REPORT_TYPES = ["fact", "complaint", "missing"] as const satisfies readonly ReportType[];
export const REPORT_TYPE_LABELS: Record<ReportType, { title: string; detail: string }> = {
  fact: { title: "A fact is wrong", detail: "Timings, address, phone, fee, services, closed, duplicate" },
  complaint: { title: "A concern about care or conduct", detail: "Treatment, behaviour, billing" },
  missing: { title: "Something is missing", detail: "A clinic, lab or chemist we haven’t listed" },
};

export const REPORT_FIELDS = [
  { key: "timings", label: "Timings" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "fee", label: "Fee" },
  { key: "services", label: "Services" },
  { key: "accessibility", label: "Accessibility" },
  { key: "closed", label: "Closed" },
  { key: "duplicate", label: "Duplicate" },
] as const;
export type ReportField = (typeof REPORT_FIELDS)[number]["key"];

/** What a concern is about (stored in Report.field): "HG-CC-0112 · A CONCERN ABOUT BILLING". */
export const CONCERN_TOPICS = [
  { key: "treatment", label: "Treatment" },
  { key: "behaviour", label: "Behaviour" },
  { key: "billing", label: "Billing" },
  { key: "other", label: "Something else" },
] as const;
export type ConcernTopic = (typeof CONCERN_TOPICS)[number]["key"];

/** A fact report's status as the reporter sees it ("Fixed, or couldn’t verify"). */
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  received: "Received",
  checking: "Checking",
  resolved: "✓ Fixed",
  no_change: "Couldn’t verify",
  rejected: "Not taken forward",
};
/** A concern (type complaint) takes the separate review path and is never published. */
export const CONCERN_STATUS_LABELS: Record<ReportStatus, string> = {
  received: "Received",
  checking: "With the review team",
  resolved: "Closed",
  no_change: "Closed",
  rejected: "Closed",
};
/** Fact reports are answered within this many working days ("Answer due by Thu 29 Oct"). */
export const REPORT_ANSWER_WORKING_DAYS = 3;

export const DISPUTE_TARGETS = ["ranking", "mention", "review"] as const satisfies readonly DisputeTarget[];
export const DISPUTE_ROLES = ["provider", "resident", "other"] as const satisfies readonly DisputeRole[];
export const DISPUTE_REASONS = ["different", "fake", "conflict", "outdated", "method", "other"] as const satisfies readonly DisputeReason[];
export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  different: "About a different provider",
  fake: "Fake or coordinated",
  conflict: "Conflict of interest",
  outdated: "Outdated",
  method: "Method applied wrongly",
  other: "Other",
};
export const DISPUTE_OUTCOME_LABELS: Partial<Record<DisputeStatus, string>> = {
  upheld: "UPHELD",
  partly_upheld: "PARTLY UPHELD",
  not_upheld: "NOT UPHELD",
};
/** The filer's view (Account → My reviews & reports). */
export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  received: "Received",
  under_review: "Editor review",
  upheld: "✓ Upheld",
  partly_upheld: "Partly upheld",
  not_upheld: "Not upheld",
  withdrawn: "Withdrawn",
};
/** An editor reviews every dispute within this many working days. */
export const DISPUTE_REVIEW_WORKING_DAYS = 5;
export const DISPUTE_MIN_DETAILS = 30;

export const CLAIM_ROLES = ["doctor", "staff", "administrator"] as const satisfies readonly ClaimRole[];
export const CLAIM_ROLE_LABELS: Record<ClaimRole, string> = {
  doctor: "I’m the doctor",
  staff: "Clinic manager / staff",
  administrator: "Hospital administrator",
};

// ── Events ──────────────────────────────────────────────────────────────────

export const EVENT_TYPES = [
  "health_camp",
  "screening",
  "blood_drive",
  "vaccination",
  "workshop",
  "talk",
  "senior_activity",
  "other",
] as const satisfies readonly EventType[];

/** Singular labels (event cards) and plural chip labels (calendar filters). */
export const EVENT_TYPE_LABELS: Record<EventType, { one: string; chip: string }> = {
  health_camp: { one: "Health camp", chip: "Health camps" },
  screening: { one: "Screening", chip: "Screening" },
  blood_drive: { one: "Blood donation", chip: "Blood drives" },
  vaccination: { one: "Vaccination", chip: "Vaccination" },
  workshop: { one: "Workshop", chip: "Workshops" },
  talk: { one: "Talk", chip: "Talks" },
  senior_activity: { one: "Senior activity", chip: "Senior activities" },
  other: { one: "Event", chip: "Other" },
};

/** Calendar filter chips, in prototype order. */
export const CALENDAR_TYPE_CHIPS = ["health_camp", "screening", "blood_drive", "vaccination", "workshop", "talk"] as const satisfies readonly EventType[];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  verified: "✓ Verified",
  awaiting_review: "Awaiting review",
  changes_requested: "Changes requested",
  rejected: "Not listed",
  cancelled: "Cancelled",
  completed: "Completed",
};

/** Events anyone can see (calendar, locality pages, event pages). "Changes requested" and
 * "Not listed" are visible only to the submitter and staff. */
export const PUBLIC_EVENT_STATUSES = ["verified", "awaiting_review", "cancelled", "completed"] as const satisfies readonly EventStatus[];

/** An event submitter's view of their status (Account → Events I submitted). */
export const SUBMITTED_EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  verified: "✓ Approved",
  awaiting_review: "Awaiting review",
  changes_requested: "Changes requested",
  rejected: "Not approved",
  cancelled: "Cancelled",
  completed: "Took place",
};

/** "Submit an event" templates (step 1). */
export const EVENT_TEMPLATES = [
  { name: "Health check-up camp", detail: "Screenings, consultations, referrals", type: "health_camp" },
  { name: "Blood donation drive", detail: "With a licensed blood bank", type: "blood_drive" },
  { name: "CPR & first-aid workshop", detail: "Certified trainer required", type: "workshop" },
  { name: "Awareness talk", detail: "Expert session, in person or online", type: "talk" },
  { name: "Vaccination drive", detail: "Licensed provider only", type: "vaccination" },
  { name: "Senior citizen activity", detail: "Check-ups, physio, yoga", type: "senior_activity" },
] as const satisfies readonly { name: string; detail: string; type: EventType }[];

export const ORGANISER_TYPES = ["rwa", "resident_group", "ngo", "hospital_clinic", "other"] as const satisfies readonly OrganiserType[];
export const ORGANISER_TYPE_LABELS: Record<OrganiserType, string> = {
  rwa: "RWA",
  resident_group: "Resident group",
  ngo: "NGO",
  hospital_clinic: "Hospital / clinic",
  other: "Other",
};

/** The three statements an organiser must confirm before submitting an event. */
export const EVENT_SUBMISSION_CONSENTS = [
  "I’m authorised to share this event on behalf of the organiser.",
  "The event offers no individual diagnosis or treatment beyond what qualified professionals provide on site.",
  "HealthGurgaon may publish these event details and contact the organiser to verify them.",
] as const;

// ── Content ─────────────────────────────────────────────────────────────────

export const ARTICLE_LABELS = ["reporting", "roundup", "opinion", "sponsored"] as const satisfies readonly ArticleLabel[];
export const ARTICLE_LABEL_NAMES: Record<ArticleLabel, string> = {
  reporting: "Reporting",
  roundup: "Roundup",
  opinion: "Opinion",
  sponsored: "Sponsored",
};

// ── Community ───────────────────────────────────────────────────────────────

export const FORUM_TOPICS = [
  { slug: "pharmacy-after-hours", label: "Pharmacy & after-hours", labelHi: "दवा दुकानें और रात की सेवा" },
  { slug: "diagnostics", label: "Diagnostics", labelHi: "जांच और लैब" },
  { slug: "senior-care", label: "Senior care", labelHi: "बुज़ुर्गों की देखभाल" },
  { slug: "parenting-children", label: "Parenting & children", labelHi: "बच्चे और पालन-पोषण" },
  { slug: "womens-health", label: "Women’s health", labelHi: "महिला स्वास्थ्य" },
  { slug: "accessibility", label: "Accessibility", labelHi: "सुगम्यता" },
  { slug: "rwa-initiatives", label: "RWA initiatives", labelHi: "RWA की पहल" },
  // Not in the prototype's topic list: added for hospital discussions such as "Which insurance
  // plans are cashless at Aravali?" (Find care, hospital profile → Discussions).
  { slug: "hospitals-insurance", label: "Hospitals & insurance", labelHi: "अस्पताल और बीमा" },
] as const;
export type TopicSlug = (typeof FORUM_TOPICS)[number]["slug"];

export function topicLabel(slug: string, lang: Lang = "en"): string {
  const t = FORUM_TOPICS.find((x) => x.slug === slug);
  return t ? (lang === "hi" ? t.labelHi : t.label) : slug;
}

export const QUESTION_MIN_LENGTH = 12;
export const ANSWER_MIN_LENGTH = 3;

export const SOCIETY_TYPES = ["registered_rwa", "apartment_association", "informal_group"] as const satisfies readonly SocietyType[];
export const SOCIETY_TYPE_LABELS: Record<SocietyType, string> = {
  registered_rwa: "Registered RWA",
  apartment_association: "Apartment association",
  informal_group: "Informal resident group",
};

export const CONTACT_CHANNELS = ["whatsapp", "phone", "email"] as const satisfies readonly ContactChannel[];
export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  phone: "Phone call",
  email: "Email",
};

export const VOLUNTEER_PAY_LABELS: Record<VolunteerPay, string> = {
  voluntary: "Voluntary",
  stipend: "Stipend",
  reimbursed: "Reimbursed",
  paid_per_piece: "Paid per piece",
};
export const VOLUNTEER_AUDIENCES = ["resident", "student", "professional"] as const satisfies readonly VolunteerAudience[];
export const VOLUNTEER_AUDIENCE_LABELS: Record<VolunteerAudience, string> = {
  resident: "Residents",
  student: "Students",
  professional: "Professionals",
};
export const VOLUNTEER_AVAILABILITY = ["Weekdays", "Weekday evenings", "Weekends", "Online only"] as const;

export const STORY_CATEGORIES = ["Recovery", "Children", "Seniors", "Women’s health", "Chronic care"] as const;

// ── Accounts ────────────────────────────────────────────────────────────────

export const SAVED_KINDS = ["provider", "event", "article", "guide", "thread", "top_list", "story"] as const satisfies readonly SavedKind[];
export const FOLLOW_KINDS = ["locality", "topic", "thread", "society", "provider"] as const satisfies readonly FollowKind[];
export const ALERT_PREFS = ["none", "in_app", "email", "whatsapp"] as const satisfies readonly AlertPref[];
export const ALERT_PREF_LABELS: Record<AlertPref, string> = {
  none: "No alerts",
  in_app: "On the site only",
  email: "Email",
  whatsapp: "WhatsApp",
};

export const CONSENT_PURPOSES = ["weekly_report", "city_channel", "locality_updates", "community_replies", "saved_changes"] as const satisfies readonly ConsentPurpose[];

/** Which message type carries the alerts for something you follow ("Send alerts about X?"). */
export const FOLLOW_ALERT_PURPOSE: Record<FollowKind, ConsentPurpose> = {
  locality: "locality_updates",
  society: "locality_updates",
  provider: "saved_changes",
  thread: "community_replies",
  topic: "community_replies",
};
export const CONSENT_CHANNELS = ["whatsapp", "email", "sms"] as const satisfies readonly ConsentChannel[];
