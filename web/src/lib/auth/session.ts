// Sessions and the current user. Server-only.
//
// The cookie holds a random 32-byte token; the database stores only its SHA-256, with a 30-day
// expiry. The cookie is httpOnly, SameSite=Lax, Secure in production (and named with the
// __Host- prefix there).
//
// Reading the user is request-time data. With Cache Components, call getCurrentUser() inside a
// component wrapped in <Suspense> (never at the top of a layout), and never inside 'use cache':
//
//   <Suspense fallback={<SignInButton />}><AccountMenu /></Suspense>
//   async function AccountMenu() { const user = await getCurrentUser(); … }
//
// Server Actions must check the user again themselves (see src/app/actions/*).

import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { defaultReviewLabel } from "@/lib/review-label";

import { can, type Permission } from "./permissions";
import { maskPhone } from "./phone";
import type { Role, SessionUser } from "./types";

export type { Role, SessionUser } from "./types";

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-hg_session" : "hg_session";
export const SESSION_TTL_DAYS = 30;
const TOKEN_BYTES = 32;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const sessionUserSelect = {
  id: true,
  role: true,
  phone: true,
  displayName: true,
  lang: true,
  reviewLabel: true,
  professionalLabel: true,
  area: true,
  localitySlug: true,
  deletedAt: true,
} as const;

function toSessionUser(user: {
  id: string;
  role: Role;
  phone: string;
  displayName: string | null;
  lang: string;
  reviewLabel: string | null;
  professionalLabel: string | null;
  area: string | null;
  localitySlug: string | null;
}): SessionUser {
  return {
    id: user.id,
    role: user.role,
    phoneMasked: maskPhone(user.phone),
    displayName: user.displayName,
    lang: user.lang === "hi" ? "hi" : "en",
    reviewLabel: user.reviewLabel ?? defaultReviewLabel(user.area),
    professionalLabel: user.professionalLabel,
    area: user.area,
    localitySlug: user.localitySlug,
  };
}

/** The signed-in user for this request, or null. Reads the session cookie (request-time data). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length < 32 || token.length > 128) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { expiresAt: true, user: { select: sessionUserSelect } },
  });
  if (!session) return null;
  // The expiry check reads the clock, so it may only run for a real request (not a prerender or runtime prefetch).
  await connection();
  if (session.expiresAt.getTime() <= Date.now() || session.user.deletedAt) return null;
  return toSessionUser(session.user);
});

/** Start a session for a user and set the cookie. Server Actions and Route Handlers only. */
export async function createSession(userId: string, opts: { userAgent?: string | null } = {}): Promise<void> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await db.session.create({
    data: { tokenHash: hashSessionToken(token), userId, expiresAt, userAgent: opts.userAgent?.slice(0, 200) ?? null },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** End this browser's session (sign out). Server Actions and Route Handlers only. */
export async function deleteCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  store.delete(SESSION_COOKIE);
}

/** Sign a user out everywhere (account deletion, role removal). */
export async function deleteAllSessions(userId: string): Promise<number> {
  const { count } = await db.session.deleteMany({ where: { userId } });
  return count;
}

/** Only same-site relative paths survive as ?next= targets. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) return null;
  return next.slice(0, 500);
}

/** "/account?next=…" (or "/hi/account?next=…"): where requireUser() sends signed-out visitors. */
export function signInPath(opts: { next?: string | null; lang?: "en" | "hi" } = {}): string {
  const base = opts.lang === "hi" ? "/hi/account" : "/account";
  const next = safeNextPath(opts.next);
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}

type GuardOptions = { next?: string | null; lang?: "en" | "hi" };

/** The signed-in user, or a redirect to sign-in. For pages; Server Actions should use
 * getCurrentUser() and return an error state instead of redirecting. */
export async function requireUser(opts: GuardOptions = {}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(signInPath(opts));
  return user;
}

/** The signed-in user if their role is allowed. Signed-out visitors go to sign-in; signed-in
 * users without the role get the 404 page, so private areas don't reveal that they exist.
 * (Next's forbidden() needs the experimental authInterrupts flag, which this app doesn't enable.) */
export async function requireRole(roles: Role | readonly Role[], opts: GuardOptions = {}): Promise<SessionUser> {
  const user = await requireUser(opts);
  const allowed = typeof roles === "string" ? [roles] : roles;
  if (!allowed.includes(user.role)) notFound();
  return user;
}

/** Like requireRole, using the plan's permission table (src/lib/auth/permissions.ts). */
export async function requirePermission(permission: Permission, opts: GuardOptions & { own?: boolean } = {}): Promise<SessionUser> {
  const user = await requireUser(opts);
  if (!can(user.role, permission, { own: opts.own })) notFound();
  return user;
}
