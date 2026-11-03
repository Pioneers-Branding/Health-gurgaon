// Numbers that must never be messaged: kept as an HMAC (never the number) for a year after the
// person deleted their account ("We keep only a note that this number said stop, for one year,
// so it is never messaged by mistake"). Senders check isOnStopList() before every message.
// Server-only. Changing AUTH_SECRET makes earlier entries unmatchable.

import "server-only";

import { createHmac } from "node:crypto";

import { db, type DbClient } from "@/lib/db";

export const STOP_LIST_DAYS = 365;

export function stopListHash(phone: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(phone).digest("hex");
}

export async function addToStopList(phone: string, reason: "account_deleted" | "stop_reply", client: DbClient = db): Promise<void> {
  const expiresAt = new Date(Date.now() + STOP_LIST_DAYS * 86_400_000);
  const phoneHash = stopListHash(phone);
  await client.stopListEntry.upsert({ where: { phoneHash }, create: { phoneHash, reason, expiresAt }, update: { reason, expiresAt } });
}

/** True while the number is on the stop list. Only messages check it, never sign-in codes. A
 * fresh "yes" from the same number removes the entry (see setConsent in src/lib/consent.ts). */
export async function isOnStopList(phone: string, client: DbClient = db): Promise<boolean> {
  const row = await client.stopListEntry.findUnique({ where: { phoneHash: stopListHash(phone) } });
  return !!row && row.expiresAt.getTime() > Date.now();
}

export async function removeFromStopList(phone: string, client: DbClient = db): Promise<void> {
  await client.stopListEntry.deleteMany({ where: { phoneHash: stopListHash(phone) } });
}

/** Housekeeping: drop entries older than a year. */
export async function pruneStopList(client: DbClient = db): Promise<number> {
  const { count } = await client.stopListEntry.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return count;
}
