// Confirming an email address for messages. Server-only.
//
// The address is only used for message types the person switches to email; sign-in is always
// by phone. A link with a random token (only its SHA-256 is stored) works once, for 24 hours.
// Until it's opened the account keeps its current address ("Nothing changes until you open it").

import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { recordAccountEvent } from "@/lib/consent";
import { db } from "@/lib/db";
import { maskEmail } from "@/lib/redact";

export const EMAIL_LINK_TTL_HOURS = 24;

export function hashEmailToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Start confirming `email` for `userId`. Earlier pending links stop working. Returns the token
 * to put in the link. */
export async function startEmailChange(userId: string, email: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMAIL_LINK_TTL_HOURS * 3_600_000);
  await db.$transaction([
    db.emailChallenge.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: now } }),
    db.emailChallenge.create({ data: { userId, email, tokenHash: hashEmailToken(token), expiresAt, createdAt: now } }),
  ]);
  return { token, expiresAt };
}

/** The address waiting for its link to be opened, if any. */
export async function pendingEmail(userId: string): Promise<{ email: string; expiresAt: Date } | null> {
  const row = await db.emailChallenge.findFirst({
    where: { userId, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { email: true, expiresAt: true },
  });
  return row;
}

export type ConfirmEmailResult = { ok: true; userId: string; email: string } | { ok: false; reason: "not_found" | "expired" | "used" };

/** Opening the link: the address becomes the account's email for messages, and the consent
 * record notes it (masked, so the record keeps no address after an account is deleted). */
export async function confirmEmailChange(token: string): Promise<ConfirmEmailResult> {
  if (!token || token.length < 20 || token.length > 200) return { ok: false, reason: "not_found" };
  const now = new Date();
  const row = await db.emailChallenge.findUnique({ where: { tokenHash: hashEmailToken(token) } });
  if (!row) return { ok: false, reason: "not_found" };
  if (row.consumedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "expired" };

  return db.$transaction(async (tx) => {
    const claimed = await tx.emailChallenge.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: now } });
    if (!claimed.count) return { ok: false as const, reason: "used" as const };
    const user = await tx.user.findUnique({ where: { id: row.userId }, select: { deletedAt: true } });
    if (!user || user.deletedAt) return { ok: false as const, reason: "not_found" as const };
    await tx.user.update({ where: { id: row.userId }, data: { email: row.email, emailVerifiedAt: now } });
    await recordAccountEvent(
      {
        userId: row.userId,
        action: "setting",
        summary: `Confirmed your email address for messages: ${maskEmail(row.email)}`,
        context: "From the link we sent. Nothing is sent there unless you choose Email for a message.",
        source: "email_link",
        channel: "email",
      },
      tx,
    );
    return { ok: true as const, userId: row.userId, email: row.email };
  });
}
