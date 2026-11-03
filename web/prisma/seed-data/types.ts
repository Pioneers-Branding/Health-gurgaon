// Typed shapes for the sample data the seed loads. Relations are referenced by slug (or a stable
// key) and resolved by prisma/seed.ts, which fails loudly on unknown references.
// Dates are IST wall-clock strings: "2026-10-12" or "2026-10-16 10:12".

import type {
  ArticleLabel,
  ClaimRole,
  ClaimStatus,
  ConsentAction,
  ConsentChannel,
  ConsentPurpose,
  CorrectionKind,
  DisputeReason,
  DisputeRole,
  DisputeStatus,
  DisputeTarget,
  EventStatus,
  EventType,
  FollowKind,
  MentionSentiment,
  MentionTrust,
  OrganiserType,
  Ownership,
  ProviderKind,
  ReportStatus,
  ReportType,
  ReviewStatus,
  Role,
  SavedKind,
  SocietyType,
  ThreadStatus,
  VerificationResult,
  VolunteerAudience,
  VolunteerPay,
} from "@prisma/client";
import type {
  AccessibilityItem,
  AutoCheck,
  Department,
  EmergencyInfo,
  Faq,
  GuideSection,
  HomeCollection,
  LabTest,
  LocalNote,
  LocalityStats,
  OpeningHours,
  Redaction,
  ReviewStats,
  VisitingInfo,
} from "../../src/lib/json-types";

/** A progress step shown to the person who sent something ("Received", "Organiser check", …). */
export type SeedTimelineEntry = { status: string; at: string; note?: string };

export type SeedLocalityExtra = {
  slug: string;
  stats: LocalityStats;
  statsChecked: string;
  description?: string;
  gettingCare?: string;
  editorLabel?: string;
  pageUpdated?: string;
};

export type SeedSpecialty = {
  slug: string;
  name: string;
  nameHi: string;
  doctorNoun: string;
  doctorNounPlural: string;
  summary?: string;
  whenToSee?: string;
  emergencyNote?: string;
  synonyms: string[];
  conditions: string[];
  relatedSearches?: string[];
  faqs?: Faq[];
  relatedGuides?: string[];
  reviewedBy?: string;
  reviewed?: string;
};

export type SeedFacilityType = { slug: string; name: string; description?: string; inDirectory: boolean };

export type SeedVerification = {
  field: string;
  label: string;
  value?: string;
  method?: string;
  result: VerificationResult;
  note?: string;
  fact?: boolean;
  log?: boolean;
  checked?: string;
};

export type SeedProvider = {
  slug: string;
  kind: ProviderKind;
  name: string;
  initials?: string;
  headline: string;
  specialty?: string;
  qualifications?: string;
  registration?: { council: string; number: string };
  years?: number;
  gender?: "female" | "male";
  ownership: Ownership;
  facilityType?: string;
  sizeLabel?: string;
  beds?: number;
  address?: string;
  area?: string;
  sector?: string;
  locality?: string | null;
  serves?: string[];
  distanceKm?: number;
  languages?: string[];
  fee?: number | null;
  feeVerified?: boolean;
  followUp?: string;
  hours?: OpeningHours | null;
  open24h?: boolean;
  hoursSummary?: string;
  hoursSource?: string;
  hoursChecked?: string;
  practiceLabel?: string;
  wheelchair?: boolean | null;
  accessibility?: AccessibilityItem[];
  services?: string[];
  tags?: string[];
  keywords?: string;
  keyFact?: string;
  departments?: Department[];
  emergency?: EmergencyInfo;
  homeVisits?: boolean;
  homeCollection?: HomeCollection;
  delivery?: boolean;
  tests?: LabTest[];
  visiting?: VisitingInfo;
  phone?: string;
  badges: string[];
  sponsored?: boolean;
  sponsorLabel?: string;
  claimed?: boolean;
  reviewStats?: ReviewStats;
  checked?: string | null;
  nextCheck?: string;
  verifications?: SeedVerification[];
};

export type SeedAffiliation = { doctor: string; facility: string; days?: string; department?: string; verified: boolean; source?: string };

export type SeedFeatured = {
  locality: string;
  provider: string;
  placement: "homepage" | "locality";
  metaLine: string;
  highlights: string[];
  photoLabel?: string;
};

export type SeedProviderQuestion = { provider: string; question: string; answer: string; answered: string };

export type SeedUser = {
  key: string;
  phone: string;
  role: Role;
  displayName: string;
  locality?: string;
  /** Finer than the locality: "Sector 57". */
  area?: string;
  /** How their reviews and posts are signed. */
  reviewLabel?: string;
  professionalLabel?: string;
  /** Confirmed email for messages, and when it was confirmed. */
  email?: string;
  emailVerified?: string;
  lang?: "en" | "hi";
  /** First sign-in (default 1 Sep 2026); a "SIGN-IN ONLY" line is written unless the account's
   * consent record is given in full (account.ts). */
  firstSignIn?: string;
};

export type SeedReview = {
  ref: string;
  provider: string;
  author?: string; // SeedUser key
  authorLabel: string;
  visitMonth: string;
  visitType?: string;
  department?: string;
  answers?: Record<string, string>;
  text: string;
  noConflict: boolean;
  verificationTags: string[];
  status: ReviewStatus;
  autoChecks?: AutoCheck[];
  flags?: string[];
  privateNote?: string;
  /** Shown to the author when returned for changes. */
  moderationReason?: string;
  suggestion?: string;
  moderated?: string;
  redactions?: Redaction[];
  reply?: string;
  replied?: string;
  helpful?: number;
  created: string;
  published?: string;
};

export type SeedEvent = {
  slug: string;
  ref?: string;
  title: string;
  type: EventType;
  template?: string;
  description?: string;
  bring?: string;
  organiserName: string;
  organiserType: OrganiserType;
  organiserVerified: boolean;
  organiserNote?: string;
  society?: string;
  starts: string;
  ends?: string;
  timeLabel: string;
  venue?: string;
  locality?: string;
  online?: boolean;
  eligibility?: string;
  audience?: string[];
  cost: string;
  registration?: string;
  capacity?: number;
  services?: string[];
  status: EventStatus;
  source?: string;
  verified?: string;
  submitter?: string;
  submitted?: string;
  contactName?: string;
  contactRole?: string;
  autoChecks?: AutoCheck[];
  flags?: string[];
  reportSummary?: string;
  /** Status changes_requested: what the submitter must add. */
  requestedChanges?: string;
  timeline?: SeedTimelineEntry[];
};

export type SeedArticle = {
  slug: string;
  label: ArticleLabel;
  category: string;
  title: string;
  dek: string;
  sourceNote: string;
  sponsorName?: string;
  published: string;
};

export type SeedCorrection = { kind: CorrectionKind; text: string; on: string; provider?: string; event?: string; article?: string };

export type SeedGuide = {
  slug: string;
  title: string;
  category: string;
  tag: string;
  summary?: string;
  reviewedBy?: string;
  reviewNote?: string;
  writtenBy?: string;
  updated: string;
  nextReview?: string;
  sections: GuideSection[];
  emergencyNote?: string;
  localNote?: LocalNote;
  disclaimer?: string;
  relatedSpecialties?: string[];
  relatedGuides?: string[];
};

export type SeedPost = {
  key: string;
  author?: string;
  authorLabel: string;
  professionalLabel?: string;
  isProviderAnswer?: boolean;
  body: string;
  helpful: number;
  best?: boolean;
  status?: "published" | "hidden" | "pending";
  created: string;
  autoChecks?: AutoCheck[];
  flags?: string[];
};

export type SeedThread = {
  id: string;
  title: string;
  body?: string;
  topic: string;
  locality?: string;
  area: string;
  author?: string;
  status: ThreadStatus;
  provider?: string;
  replyCount: number;
  helpful: number;
  answeredBy?: string;
  created: string;
  lastActivity?: string;
  posts?: SeedPost[];
};

export type SeedFlag = {
  ref: string;
  thread: string;
  post: string; // SeedPost key
  targetLabel: string;
  reason: string;
  autoChecks: AutoCheck[];
  flags: string[];
  privateNote: string;
  created: string;
};

export type SeedSociety = {
  slug: string;
  name: string;
  shortName: string;
  badgeText: string;
  locality?: string;
  area: string;
  groupType: SocietyType;
  verified: string;
  memberSince: string;
  contactName: string;
  contactRole: string;
  contactUser?: string;
  localResources: string;
  profileViews30d: number;
  members: { name: string; title: string; permission: "admin" | "editor" | "viewer"; user?: string }[];
  initiatives: { title: string; on: string; summary: string }[];
  needs: { title: string; detail: string }[];
  offers: { name: string; detail: string }[];
};

export type SeedVolunteerRole = {
  slug: string;
  title: string;
  description: string;
  time: string;
  pay: VolunteerPay;
  payLabel: string;
  audience: VolunteerAudience;
  access: string;
  requiresRegistration?: boolean;
};

export type SeedTopListEntry = {
  name: string;
  provider?: string;
  ownership: Ownership;
  typeLabel: string;
  meta: string;
  quote: string;
  score: number;
  reviews: number;
  sub: [number, number, number, number];
  locality?: string;
  hasStory: boolean;
  movement: string;
};

export type SeedTopList = {
  slug: string;
  title: string;
  h1: string;
  crumb: string;
  tabLabel: string;
  hubGroup: string;
  bandGroup: string;
  countLabel: string;
  intro: string;
  basis: string;
  hubMeta: string;
  badgeLabel: string;
  sourceList?: string;
  presetOwnership?: Ownership;
  entries: SeedTopListEntry[];
};

export type SeedStory = {
  slug: string;
  title: string;
  who: string;
  provider?: string;
  providerName: string;
  ownership: Ownership;
  category: string;
  duration: string;
  meta: string;
  transcript: string;
  published: string;
};

/** Mentions are generated from these specs so the counts match the prototype. */
export type SeedMentionSpec = {
  provider: string;
  locality?: string;
  specialty?: string;
  /** Different residents recommending positively in the last 12 months. */
  recentPositive: number;
  /** Positive residents whose only mention is older than 12 months. */
  olderPositive?: number;
  negative?: number;
  verifiedVisit?: number;
  newAccounts?: number;
  mild?: number;
  themes?: Record<string, number>;
  negativeThemes?: Record<string, number>;
  quotes?: { text: string; meta: string; on: string }[];
};

export type SeedReport = {
  ref: string;
  type: ReportType;
  targetKind?: string;
  target?: string; // provider slug when targetKind = provider
  targetLabel: string;
  field?: string;
  details: string;
  firsthand?: boolean;
  reporter?: string;
  status: ReportStatus;
  resolution?: string;
  created: string;
  resolved?: string;
  /** Progress shown to the reporter; defaults to received (+ the outcome). */
  timeline?: SeedTimelineEntry[];
  autoChecks?: AutoCheck[];
  flags?: string[];
  privateNote?: string;
};

export type SeedDispute = {
  ref: string;
  target: DisputeTarget;
  provider?: string;
  topList?: string;
  itemLabel: string;
  filerRole: DisputeRole;
  /** SeedUser key of the person who filed it. */
  filer?: string;
  reason: DisputeReason;
  details: string;
  status: DisputeStatus;
  outcomeText?: string;
  outcomePublished?: string;
  created: string;
};

export type SeedClaim = {
  ref: string;
  provider: string;
  claimant: string;
  role: ClaimRole;
  registrationNumber?: string;
  otpVerified: boolean;
  status: ClaimStatus;
  autoChecks?: AutoCheck[];
  privateNote?: string;
  decisionReason?: string;
  decided?: string;
  created: string;
};

export type SeedAudit = { at: string; actorLabel: string; actor?: string; actorRole?: string; action: string; targetKind?: string; targetLabel: string; reason?: string };

/** One line of a person's consent record, in the account page's words. */
export type SeedConsentLine = {
  user: string;
  at: string;
  action: ConsentAction;
  purpose?: ConsentPurpose;
  channel?: ConsentChannel;
  summary: string;
  context?: string;
  source: string;
  /** Exact words agreed to; default: the standard wording for the purpose and channel. */
  wording?: string;
  /** Locality alerts: the locality's name. */
  subject?: string;
};

/** State details the record alone doesn't carry. */
export type SeedConsentStateExtra = { user: string; purpose: ConsentPurpose; channel: ConsentChannel; confirmed?: string; lastSent?: string };

export type SeedListingChange = { provider: string; field: string; summary: string; source?: string; reportRef?: string; at: string };
export type SeedSaved = { user: string; kind: SavedKind; target: string; at: string };
export type SeedFollow = { user: string; kind: FollowKind; target: string; at: string; alert?: "none" | "in_app" | "email" | "whatsapp" };

export type SeedReviewSummaryMap = Record<string, ReviewStats>;
export type { MentionSentiment, MentionTrust };
