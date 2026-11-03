// Human-readable reference codes residents see after submitting something ("Ref HG-RV-8831").
// Server-only. Numbers come from the Sequence table, incremented atomically.

import "server-only";

import { db, type DbClient } from "@/lib/db";

export const REF_FORMATS = {
  review: { prefix: "HG-RV-", digits: 4 },
  report: { prefix: "HG-", digits: 4 },
  /** Concerns (report type complaint) take the separate review path: "HG-CC-0113". */
  concern: { prefix: "HG-CC-", digits: 4 },
  event: { prefix: "HG-EV-", digits: 4 },
  dispute: { prefix: "HG-DS-", digits: 4 },
  claim: { prefix: "HG-CL-", digits: 4 },
  volunteer: { prefix: "HG-VOL-", digits: 3 },
  story: { prefix: "HG-ST-", digits: 3 },
  flag: { prefix: "HG-CM-", digits: 4 },
  society: { prefix: "HG-RWA-", digits: 3 },
  /** "Suggest a locality" on the localities index: "Ref HG-LOC-2207". */
  locality: { prefix: "HG-LOC-", digits: 4 },
} as const;
export type RefKind = keyof typeof REF_FORMATS;

/** The next reference for a kind, e.g. nextRef("review") → "HG-RV-8831". Pass the transaction
 * client when creating the row in a transaction. */
export async function nextRef(kind: RefKind, client: DbClient = db): Promise<string> {
  const row = await client.sequence.upsert({
    where: { prefix: kind },
    create: { prefix: kind, value: 1 },
    update: { value: { increment: 1 } },
  });
  const f = REF_FORMATS[kind];
  return `${f.prefix}${String(row.value).padStart(f.digits, "0")}`;
}

/** "HG-RV-8830" → "RV-8830" (the admin queue's short form). */
export function shortRef(ref: string): string {
  return ref.startsWith("HG-") && ref.length > 7 && /^HG-[A-Z]+-/.test(ref) ? ref.slice(3) : ref;
}
