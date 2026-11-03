// Roles & permissions, transcribed from the Website Plan ("Roles & permissions" table).
// Pure module: client components may use `can()` to hide controls, but every Server Action must
// check again on the server (requireRole / requirePermission in src/lib/auth/session.ts).
//
// Legend from the plan: ● allowed · ◐ own items only / after verification · blank = not allowed.
// "Every moderator and admin action is written to the audit log."

import type { Role } from "./types";

export const ROLES = ["resident", "champion", "provider", "rwa", "moderator", "editor", "admin"] as const satisfies readonly Role[];

export const ROLE_LABELS: Record<Role, string> = {
  resident: "Resident",
  champion: "Champion",
  provider: "Provider",
  rwa: "RWA rep",
  moderator: "Moderator",
  editor: "Editor",
  admin: "Admin",
};

export const STAFF_ROLES = ["moderator", "editor", "admin"] as const satisfies readonly Role[];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isStaff(role: Role | null | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly Role[]).includes(role);
}

export type Permission =
  | "write_review"
  | "report_incorrect_info"
  | "ask_answer_community"
  | "submit_event"
  | "edit_own_provider_profile"
  | "manage_society_profile"
  | "approve_events_reviews"
  | "edit_credentials_verification"
  | "see_reporter_contact"
  | "manage_roles_audit";

/** "full" = ●, "own" = ◐ (own items only / after verification). Visitors (signed out) can only
 * search, read and report incorrect information. */
type Grant = "full" | "own";

export const PERMISSIONS: Record<Permission, { label: string; grants: Partial<Record<Role, Grant>> }> = {
  // "Search & read everything" is open to everyone, signed in or not: no permission needed.
  report_incorrect_info: {
    label: "Report incorrect info",
    grants: { resident: "full", champion: "full", provider: "full", rwa: "full", moderator: "full", editor: "full", admin: "full" },
  },
  // As rendered in the plan: Resident, Provider, Editor, Admin. See docs/BACKEND.md (open question).
  write_review: {
    label: "Write a review",
    grants: { resident: "full", provider: "full", editor: "full", admin: "full" },
  },
  ask_answer_community: {
    label: "Ask / answer in community",
    grants: { resident: "full", champion: "full", provider: "full", rwa: "full", moderator: "full", editor: "full", admin: "full" },
  },
  submit_event: {
    label: "Submit an event",
    grants: { resident: "full", champion: "full", provider: "full", rwa: "full", moderator: "full", editor: "full", admin: "full" },
  },
  edit_own_provider_profile: {
    label: "Edit own provider profile",
    grants: { provider: "own", admin: "full" },
  },
  manage_society_profile: {
    label: "Manage society profile",
    grants: { rwa: "own", admin: "full" },
  },
  approve_events_reviews: {
    label: "Approve events & reviews",
    grants: { moderator: "full", editor: "full", admin: "full" },
  },
  edit_credentials_verification: {
    label: "Edit credentials / verification",
    grants: { editor: "full", admin: "full" },
  },
  see_reporter_contact: {
    label: "See reporter contact details",
    grants: { moderator: "own", editor: "full", admin: "full" },
  },
  manage_roles_audit: {
    label: "Manage roles & audit log",
    grants: { admin: "full" },
  },
};

/**
 * Can `role` do `permission`? For ◐ grants pass `{ own: true }` when the item belongs to the
 * user (their claimed provider, their society) or the user's verification is complete.
 * `role` null = signed-out visitor.
 */
export function can(role: Role | null | undefined, permission: Permission, ctx: { own?: boolean } = {}): boolean {
  if (!role) return false;
  const grant = PERMISSIONS[permission].grants[role];
  if (grant === "full") return true;
  if (grant === "own") return !!ctx.own;
  return false;
}

/** Moderation queues and who may act in them (Admin & moderation prototype: moderators approve,
 * reject and escalate; editors and admins also verify credentials, approve claims and see private
 * contact details; admins manage roles and export the audit log). */
export const ADMIN_QUEUES = ["reviews", "reports", "events", "claims", "disputes", "community", "stories", "verification", "listings", "audit"] as const;
export type AdminQueue = (typeof ADMIN_QUEUES)[number];

export const QUEUE_ACCESS: Record<AdminQueue, readonly Role[]> = {
  reviews: STAFF_ROLES,
  reports: STAFF_ROLES,
  events: STAFF_ROLES,
  community: STAFF_ROLES,
  stories: STAFF_ROLES,
  claims: ["editor", "admin"],
  disputes: ["editor", "admin"],
  verification: ["editor", "admin"],
  listings: ["editor", "admin"],
  audit: STAFF_ROLES,
};

export function canOpenQueue(role: Role | null | undefined, queue: AdminQueue): boolean {
  return !!role && QUEUE_ACCESS[queue].includes(role);
}
