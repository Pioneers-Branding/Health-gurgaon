// Finishing a sign-in once the code checks out: find or create the account for the phone,
// apply ADMIN_PHONES, record the sign-in and start a session. Server-only.

import "server-only";

import { writeAudit } from "@/lib/audit";
import { recordAccountEvent } from "@/lib/consent";
import { db } from "@/lib/db";

import { parsePhoneList } from "./phone";
import { createSession } from "./session";
import type { SessionUser } from "./types";

export function adminPhones(): string[] {
  return parsePhoneList(process.env.ADMIN_PHONES);
}

/** Create or update the user for a verified phone and set the session cookie. `isNew` is true
 * on the first sign-in (also for a number first given on the homepage form), which is when the
 * sign-in page offers the optional "Choices" step. */
export async function completeSignIn(input: {
  phone: string;
  lang: "en" | "hi";
  /** How the code came: noted in the consent record at the first sign-in. */
  channel?: "sms" | "whatsapp";
  userAgent?: string | null;
}): Promise<{ userId: string; isNew: boolean; role: SessionUser["role"] }> {
  const now = new Date();
  const makeAdmin = adminPhones().includes(input.phone);
  const existing = await db.user.findUnique({ where: { phone: input.phone } });

  let userId: string;
  let isNew = false;
  let role = existing?.role ?? "resident";
  if (existing && !existing.deletedAt) {
    const promote = makeAdmin && existing.role !== "admin";
    isNew = !existing.lastSignInAt;
    await db.user.update({
      where: { id: existing.id },
      data: { lastSignInAt: now, phoneVerifiedAt: existing.phoneVerifiedAt ?? now, ...(promote ? { role: "admin" } : {}) },
    });
    userId = existing.id;
    if (promote) {
      role = "admin";
      await writeAudit({
        actor: "system",
        action: "role.change",
        target: { kind: "user", id: existing.id, label: existing.displayName ?? "User" },
        reason: "Phone listed in ADMIN_PHONES",
        details: { from: existing.role, to: "admin" },
      });
    }
  } else {
    role = makeAdmin ? "admin" : "resident";
    const created = await db.user.create({
      data: { phone: input.phone, phoneVerifiedAt: now, lastSignInAt: now, role, lang: input.lang },
    });
    userId = created.id;
    isNew = true;
    if (makeAdmin) {
      await writeAudit({ actor: "system", action: "role.change", target: { kind: "user", id: created.id, label: "New admin" }, reason: "Phone listed in ADMIN_PHONES", details: { to: "admin" } });
    }
  }
  if (isNew) {
    const via = input.channel === "whatsapp" ? "WhatsApp" : "SMS";
    await recordAccountEvent({
      userId,
      action: "sign_in_only",
      summary: "Gave your mobile number, for sign-in codes only",
      context: `On the sign-in page. The code came by ${via}.`,
      source: "sign_in",
      channel: input.channel ?? "sms",
    });
  }
  await createSession(userId, { userAgent: input.userAgent });
  return { userId, isNew, role };
}
