// Shapes of the Json columns in prisma/schema.prisma, plus small readers that turn an untyped
// Prisma `JsonValue` into these shapes without trusting it blindly. Pure: safe to import anywhere.

/** Opening hours in India Standard Time. `day` 0 = Monday … 6 = Sunday. Minutes since midnight. */
export type OpeningHoursDay = {
  day: number;
  /** As printed: "10 am – 1 pm, 5 – 8 pm", "Closed", "Open 24 hours". */
  text: string;
  /** Machine-readable ranges; empty = closed. A range may end at 1440 (midnight). */
  ranges: [number, number][];
};
export type OpeningHours = OpeningHoursDay[];

export type AccessibilityItem = {
  item: string; // "Step-free main entrance"
  status: "verified" | "unverified" | "no";
  source: string; // "Checked on visit, 7 Oct 2026" | "Not yet verified"
};

export type Department = { name: string; detail: string };

export type EmergencyInfo = {
  available24x7: boolean;
  label: string; // "24×7 emergency department"
  areaLabel: string; // "Sector 51, near Golf Course Ext. Road"
  /** Children's emergency confirmed with the hospital. */
  children: boolean;
  source: string; // "Confirmed by call on 7 Oct 2026"
  checkedAt: string; // ISO date
  /** Approximate road distance in km from each locality centre; "gurugram" = Rajiv Chowk. */
  kmFrom: Record<string, number>;
  /** Shown on the emergency directory. */
  listed: boolean;
};

export type HomeCollection = {
  area: string; // "Sector 45–57 and Sushant Lok"
  hours: string; // "6 am – 11 am"
  charge: string; // "₹100 per visit"
  booking: string; // "Book by calling the lab"
};

export type LabTest = { name: string; turnaround: string; price: string };

export type VisitingInfo = { text: string; confirmedAt: string };

/** Snapshot of review aggregates shown on profiles. Recomputed from published reviews by
 * `computeReviewStats()`; sample rows carry the prototype's numbers. */
export type ReviewStats = {
  total: number;
  /** "What patients mention": share of reviews mentioning each theme positively. */
  mentions: { label: string; pct: number }[];
  /** Patient-experience score (Phase 2 lists only) and its four parts. */
  experienceScore?: number;
  subScores?: { label: string; value: number; weight: number }[];
  /** Review counts and scores per hospital department. */
  departments?: { name: string; score: number; count: number }[];
  /** Phase 2 profile tabs. */
  storyCount?: number;
  discussionCount?: number;
};

/** Coverage snapshot for a locality (verified listings only). */
export type LocalityStats = {
  doctors: number;
  careFacilities: number;
  pharmaciesLabs: number;
  extra?: string;
  /** Verified listings per locality-page category, e.g. { clinics: 14, labs: 6 }. */
  categories?: Record<string, number>;
};

export type AutoCheck = { ok: boolean; text: string };

export type TimelineEntry = { status: string; at: string; note?: string };

export type GuideSection = { heading: string; body: string };

export type LocalNote = { text: string; ctaLabel?: string; ctaKind?: "search" | "guide" | "emergency"; ctaQuery?: string };

export type Faq = { q: string; a: string };

export type Redaction = { kind: "phone" | "email" | "id_number"; count: number };

export type EvidenceFile = { name: string; sizeKb: number };

// ── Readers ─────────────────────────────────────────────────────────────────

type JsonLike = unknown;

export function asStringArray(value: JsonLike): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function asArray<T>(value: JsonLike, guard?: (v: unknown) => v is T): T[] {
  if (!Array.isArray(value)) return [];
  return guard ? value.filter(guard) : (value as T[]);
}

export function asRecord<T = unknown>(value: JsonLike): Record<string, T> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, T>) : {};
}

export function asObject<T>(value: JsonLike): T | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as T) : null;
}

export function asOpeningHours(value: JsonLike): OpeningHours | null {
  if (!Array.isArray(value)) return null;
  const days = value.filter(
    (d): d is OpeningHoursDay =>
      !!d && typeof d === "object" && typeof (d as OpeningHoursDay).day === "number" && Array.isArray((d as OpeningHoursDay).ranges),
  );
  return days.length ? days.sort((a, b) => a.day - b.day) : null;
}

export function asSubScores(value: JsonLike): [number, number, number, number] {
  const a = Array.isArray(value) ? value.map((n) => (typeof n === "number" ? n : 0)) : [];
  return [a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 0];
}
