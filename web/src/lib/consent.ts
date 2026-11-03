// Consent: an append-only record (Consent) plus the current state per message type and channel
// (ConsentState). Server-only. Wording, labels and tags: src/lib/consent-text.ts.
//
// Each message type is on or off, and comes by one channel (WhatsApp or email). Every change
// writes one record line in the words the account page shows ("Turned on: Locality alerts for
// Sohna Road" · "On the Sohna Road locality page. You tapped Follow and chose WhatsApp alerts.").
// Account lines (language chosen, email confirmed, number given for sign-in codes only) go in
// the same record via recordAccountEvent(). Nothing is ever deleted: deleting an account
// withdraws everything with source "account_deleted".

import "server-only";

import type { ConsentAction, ConsentChannel, ConsentPurpose, ConsentState } from "@prisma/client";

import {
  CONSENT_ACTION_TAGS,
  CONSENT_PURPOSE_INFO,
  CONSENT_VERSION,
  channelChangeSummary,
  consentInfo,
  consentSummary,
  consentWording,
  isOfferedChannel,
  type ConsentPurposeInfo,
  type MessageChannel,
} from "@/lib/consent-text";
import { formatDate, formatTime } from "@/lib/dates";
import { db, type DbClient } from "@/lib/db";
import { removeFromStopList } from "@/lib/messaging/stop-list";

export type ConsentSource =
  | "homepage_form"
  | "news_page"
  | "locality_page"
  | "event_page"
  | "account_settings"
  | "saved_page"
  | "sign_in"
  | "whatsapp_reply"
  | "email_link"
  | "account_deleted"
  | "admin";

export class ConsentError extends Error {}

export type ConsentChange = {
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  /** Turning on: the channel to use (default: the type's current channel, else WhatsApp).
   * Turning off: ignored; the type stops on every channel. */
  channel?: MessageChannel;
  source: ConsentSource;
  /** Where and how, for the record: "On the WhatsApp & email page. You tapped Turn off." */
  context?: string | null;
  /** Locality alerts: the locality's name, so the record says "Locality alerts for Sohna Road". */
  subject?: string | null;
  /** The exact words agreed to, when a form shows its own (the homepage tick-box). */
  wording?: string | null;
  /** Undo straight after stopping: the record says "Turned back on". */
  regrant?: boolean;
  /** Double opt-in already done (the person replied YES). */
  confirmed?: boolean;
  /** Set when a staff member records it on the person's behalf. */
  actorId?: string | null;
};

export type ConsentResult = { changed: boolean; on: boolean; channel: MessageChannel };

function asMessageChannel(channel: ConsentChannel | null | undefined): MessageChannel {
  return channel === "email" ? "email" : "whatsapp";
}

/** The channel a type uses: where it's on, else the last one chosen, else WhatsApp. */
export function currentChannel(states: Pick<ConsentState, "purpose" | "channel" | "granted" | "updatedAt">[], purpose: ConsentPurpose): MessageChannel {
  const mine = states.filter((s) => s.purpose === purpose && (s.channel === "whatsapp" || s.channel === "email"));
  const on = mine.find((s) => s.granted);
  if (on) return asMessageChannel(on.channel);
  const latest = mine.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  return asMessageChannel(latest?.channel);
}

async function writeLine(
  tx: DbClient,
  line: { userId: string; purpose: ConsentPurpose | null; channel: ConsentChannel | null; action: ConsentAction; summary: string; context?: string | null; source: string; wording: string; actorId?: string | null; at?: Date },
) {
  return tx.consent.create({
    data: {
      userId: line.userId,
      purpose: line.purpose,
      channel: line.channel,
      action: line.action,
      summary: line.summary,
      context: line.context ?? null,
      source: line.source,
      wording: line.wording,
      wordingVersion: CONSENT_VERSION,
      actorId: line.actorId ?? null,
      ...(line.at ? { createdAt: line.at } : {}),
    },
  });
}

async function putState(tx: DbClient, key: { userId: string; purpose: ConsentPurpose; channel: ConsentChannel }, data: { granted: boolean; lastConsentId: string; confirmedAt?: Date | null }) {
  await tx.consentState.upsert({
    where: { userId_purpose_channel: key },
    create: { ...key, granted: data.granted, lastConsentId: data.lastConsentId, confirmedAt: data.confirmedAt ?? null },
    update: { granted: data.granted, lastConsentId: data.lastConsentId, ...(data.confirmedAt !== undefined ? { confirmedAt: data.confirmedAt } : {}) },
  });
}

/** Turn a message type on or off. No record line when nothing would change. Turning on while
 * it's on by another channel moves it to the new channel (a "CHANGED" line). */
export async function setConsent(change: ConsentChange, client?: DbClient): Promise<ConsentResult> {
  const run = async (tx: DbClient): Promise<ConsentResult> => {
    const states = await tx.consentState.findMany({ where: { userId: change.userId, purpose: change.purpose } });
    const granted = states.filter((s) => s.granted);
    const now = new Date();

    if (!change.granted) {
      if (!granted.length) return { changed: false, on: false, channel: currentChannel(states, change.purpose) };
      for (const s of granted) {
        const row = await writeLine(tx, {
          userId: change.userId,
          purpose: change.purpose,
          channel: s.channel,
          action: "withdrawn",
          summary: consentSummary("withdrawn", change.purpose, change.subject),
          context: change.context,
          source: change.source,
          wording: `Stopped: ${consentInfo(change.purpose).label} (${s.channel}).`,
          actorId: change.actorId,
        });
        await putState(tx, { userId: change.userId, purpose: change.purpose, channel: s.channel }, { granted: false, lastConsentId: row.id, confirmedAt: null });
      }
      return { changed: true, on: false, channel: asMessageChannel(granted[0].channel) };
    }

    const channel = change.channel ?? currentChannel(states, change.purpose);
    if (!isOfferedChannel(change.purpose, channel)) throw new ConsentError(`${channel} isn't offered for ${change.purpose}`);
    if (granted.some((s) => s.channel === channel)) return { changed: false, on: true, channel };
    if (granted.length) {
      await moveChannel(tx, change.userId, change.purpose, channel, granted, { source: change.source, context: change.context, actorId: change.actorId });
      return { changed: true, on: true, channel };
    }
    const wording = change.wording ?? consentWording(change.purpose, channel, change.subject) ?? consentInfo(change.purpose).why;
    const row = await writeLine(tx, {
      userId: change.userId,
      purpose: change.purpose,
      channel,
      action: "granted",
      summary: consentSummary(change.regrant ? "regranted" : "granted", change.purpose, change.subject),
      context: change.context,
      source: change.source,
      wording,
      actorId: change.actorId,
    });
    await putState(tx, { userId: change.userId, purpose: change.purpose, channel }, { granted: true, lastConsentId: row.id, confirmedAt: change.confirmed ? now : null });
    // A fresh yes overrides an old "stop" kept after an earlier account was deleted.
    const owner = await tx.user.findUnique({ where: { id: change.userId }, select: { phone: true } });
    if (owner?.phone.startsWith("+")) await removeFromStopList(owner.phone, tx);
    return { changed: true, on: true, channel };
  };
  return client ? run(client) : db.$transaction((tx) => run(tx));
}

async function moveChannel(
  tx: DbClient,
  userId: string,
  purpose: ConsentPurpose,
  channel: MessageChannel,
  granted: ConsentState[],
  opts: { source: ConsentSource; context?: string | null; actorId?: string | null },
) {
  const row = await writeLine(tx, {
    userId,
    purpose,
    channel,
    action: "channel_changed",
    summary: channelChangeSummary(purpose, channel),
    context: opts.context,
    source: opts.source,
    wording: consentWording(purpose, channel) ?? consentInfo(purpose).why,
    actorId: opts.actorId,
  });
  for (const s of granted) {
    if (s.channel !== channel) await putState(tx, { userId, purpose, channel: s.channel }, { granted: false, lastConsentId: row.id, confirmedAt: null });
  }
  await putState(tx, { userId, purpose, channel }, { granted: granted.length > 0, lastConsentId: row.id, confirmedAt: granted.length ? (granted[0].confirmedAt ?? null) : null });
}

/** "How you get X: WhatsApp | Email". Works whether the type is on or off (off: it's the
 * channel used when it's next turned on). Writes a "CHANGED" line. */
export async function changeConsentChannel(
  input: { userId: string; purpose: ConsentPurpose; channel: MessageChannel; source: ConsentSource; context?: string | null; actorId?: string | null },
  client?: DbClient,
): Promise<{ changed: boolean; on: boolean }> {
  if (!isOfferedChannel(input.purpose, input.channel)) throw new ConsentError(`${input.channel} isn't offered for ${input.purpose}`);
  const run = async (tx: DbClient) => {
    const states = await tx.consentState.findMany({ where: { userId: input.userId, purpose: input.purpose } });
    const granted = states.filter((s) => s.granted);
    if (currentChannel(states, input.purpose) === input.channel) return { changed: false, on: granted.length > 0 };
    await moveChannel(tx, input.userId, input.purpose, input.channel, granted, input);
    return { changed: true, on: granted.length > 0 };
  };
  return client ? run(client) : db.$transaction((tx) => run(tx));
}

/** Stop every message type that is on, optionally only on one channel ("Stop all WhatsApp
 * messages"). Returns the types stopped (for an Undo). */
export async function withdrawAll(
  userId: string,
  opts: { channel?: MessageChannel; source: ConsentSource; context?: string | null; subjects?: Partial<Record<ConsentPurpose, string>> },
  client?: DbClient,
): Promise<ConsentPurpose[]> {
  const run = async (tx: DbClient) => {
    const active = await tx.consentState.findMany({ where: { userId, granted: true, ...(opts.channel ? { channel: opts.channel } : {}) } });
    const stopped: ConsentPurpose[] = [];
    for (const s of active) {
      const row = await writeLine(tx, {
        userId,
        purpose: s.purpose,
        channel: s.channel,
        action: "withdrawn",
        summary: consentSummary("withdrawn", s.purpose, opts.subjects?.[s.purpose]),
        context: opts.context,
        source: opts.source,
        wording: `Stopped: ${consentInfo(s.purpose).label} (${s.channel}).`,
      });
      await putState(tx, { userId, purpose: s.purpose, channel: s.channel }, { granted: false, lastConsentId: row.id, confirmedAt: null });
      if (!stopped.includes(s.purpose)) stopped.push(s.purpose);
    }
    return stopped;
  };
  return client ? run(client) : db.$transaction((tx) => run(tx));
}

/** A line about the account rather than a message type: the language chosen, an email
 * confirmed, the number given for sign-in codes only. */
export async function recordAccountEvent(
  input: { userId: string; action: "setting" | "sign_in_only"; summary: string; context?: string | null; source: ConsentSource; channel?: ConsentChannel | null; actorId?: string | null },
  client: DbClient = db,
) {
  return writeLine(client, {
    userId: input.userId,
    purpose: null,
    channel: input.channel ?? null,
    action: input.action,
    summary: input.summary,
    context: input.context,
    source: input.source,
    wording: input.summary,
    actorId: input.actorId,
  });
}

/** May we send this type to this person, and by which channel? A yes from the homepage form
 * counts only once confirmed (they replied YES); a yes given while signed in is confirmed by the
 * sign-in itself. Senders must also check isOnStopList() for WhatsApp. */
export async function hasConsent(userId: string, purpose: ConsentPurpose, client: DbClient = db): Promise<MessageChannel | null> {
  const s = await client.consentState.findFirst({ where: { userId, purpose, granted: true, confirmedAt: { not: null } } });
  return s ? asMessageChannel(s.channel) : null;
}

// ── Reading ──────────────────────────────────────────────────────────────────

export type ConsentRecordEntry = {
  id: string;
  /** ISO time. Show as "14 OCT 2026, 11:02 AM" (formatStamp). */
  at: string;
  action: ConsentAction;
  /** AGREED | STOPPED | CHANGED | SETTING | SIGN-IN ONLY */
  tag: (typeof CONSENT_ACTION_TAGS)[ConsentAction];
  /** What: "Turned on: Weekly Gurgaon Health Report". */
  summary: string;
  /** Where and how: "On the homepage. You chose WhatsApp, then confirmed by replying YES." */
  context: string | null;
  purpose: ConsentPurpose | null;
  channel: ConsentChannel | null;
  source: string;
  /** The exact words agreed to, and their version. */
  wording: string;
  wordingVersion: string;
};

export type MessageTypeSummary = Omit<ConsentPurposeInfo, "channels"> & {
  on: boolean;
  /** How it comes (or would come, if turned on). */
  channel: MessageChannel;
  channels: readonly MessageChannel[];
  /** Double opt-in done (replied YES). */
  confirmed: boolean;
  /** "Last sent Fri 23 Oct". Null when nothing has been sent. */
  lastSentAt: string | null;
  /** The type's own record, newest first. */
  history: ConsentRecordEntry[];
  /** One line for the card, e.g. "Agreed 3 Oct 2026, 8:14 pm, on the homepage. You chose WhatsApp,
   * then confirmed by replying YES." or "Never turned on." */
  recordText: string;
};

function toEntry(r: { id: string; createdAt: Date; action: ConsentAction; summary: string; context: string | null; purpose: ConsentPurpose | null; channel: ConsentChannel | null; source: string; wording: string; wordingVersion: string }): ConsentRecordEntry {
  return {
    id: r.id,
    at: r.createdAt.toISOString(),
    action: r.action,
    tag: CONSENT_ACTION_TAGS[r.action],
    summary: r.summary,
    context: r.context,
    purpose: r.purpose,
    channel: r.channel,
    source: r.source,
    wording: r.wording,
    wordingVersion: r.wordingVersion,
  };
}

function lowerFirst(text: string): string {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/** "Agreed 3 Oct 2026, 8:14 pm, on the homepage. …" from a record line. */
export function recordSentence(entry: Pick<ConsentRecordEntry, "action" | "at" | "context" | "summary">): string {
  const at = new Date(entry.at);
  const verb = entry.action === "withdrawn" ? "Stopped" : entry.action === "channel_changed" ? "Changed" : entry.summary.startsWith("Turned back on") ? "Agreed again" : "Agreed";
  const when = `${formatDate(at)}, ${formatTime(at)}`;
  return entry.context ? `${verb} ${when}, ${lowerFirst(entry.context)}` : `${verb} ${when}.`;
}

function recordText(history: ConsentRecordEntry[], on: boolean): string {
  if (!history.length) return "Never turned on.";
  const latest = history[0];
  if (on || latest.action !== "withdrawn") {
    const grant = history.find((h) => h.action === "granted") ?? latest;
    return recordSentence(grant);
  }
  const grant = history.find((h) => h.action === "granted");
  return grant ? `${recordSentence(grant)} ${recordSentence(latest)}` : recordSentence(latest);
}

/** Every message type with its state, channel and record (WhatsApp & email page). */
export async function getConsentSummary(userId: string, client: DbClient = db): Promise<MessageTypeSummary[]> {
  const [states, rows] = await Promise.all([
    client.consentState.findMany({ where: { userId } }),
    client.consent.findMany({ where: { userId, purpose: { not: null } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
  ]);
  return CONSENT_PURPOSE_INFO.map((info) => {
    const mine = states.filter((s) => s.purpose === info.purpose);
    const on = mine.some((s) => s.granted);
    const channel = currentChannel(mine, info.purpose);
    const onState = mine.find((s) => s.granted);
    const sent = mine.map((s) => s.lastSentAt).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const history = rows.filter((r) => r.purpose === info.purpose).map(toEntry);
    return {
      ...info,
      on,
      channel,
      confirmed: !!onState?.confirmedAt,
      lastSentAt: sent?.toISOString() ?? null,
      history,
      recordText: recordText(history, on),
    };
  });
}

/** The whole record, newest first ("Your consent record"). */
export async function getConsentHistory(userId: string, limit = 200, client: DbClient = db): Promise<ConsentRecordEntry[]> {
  // Lines written in one action share a timestamp; ids (cuid) keep their order.
  const rows = await client.consent.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit });
  return rows.map(toEntry);
}
