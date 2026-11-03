"use server";

// Save and follow. Every action re-checks the signed-in user and returns the new state, so a
// button can show "✓ Saved" / "✓ Following" from `state.data` without reloading.
//
//   const [state, action, pending] = useActionState(toggleSaved, idle);
//   <form action={action}>
//     <input type="hidden" name="kind" value="provider" />
//     <input type="hidden" name="targetId" value={slug} />
//     <button aria-pressed={saved}>{saved ? "✓ Saved" : "Save"}</button>
//   </form>
//
// Signed-out visitors get code "sign_in_required" (show the sign-in prompt; the Mobile prototype
// keeps saves on the device until sign-in, then calls importDeviceSaved).

import type { AlertPref, ConsentPurpose, FollowKind } from "@prisma/client";

import { fail, failWith, formLang, needsSignIn, ok, parseForm, type ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { currentChannel, setConsent, type ConsentSource } from "@/lib/consent";
import { CONSENT_VERSION, channelName, consentInfo, type MessageChannel } from "@/lib/consent-text";
import { db, type DbClient } from "@/lib/db";
import { FOLLOW_ALERT_PURPOSE, SAVED_KINDS } from "@/lib/domain";
import { resolveTarget, resolveTargets } from "@/lib/targets";
import { setFollowAlertSchema, toggleFollowSchema, toggleSavedSchema } from "@/lib/validation/saved";

const T = {
  signIn: { en: "Sign in to save and follow. It only takes your phone number.", hi: "सेव और फ़ॉलो करने के लिए साइन इन करें। बस आपका फ़ोन नंबर चाहिए।" },
  notFound: { en: "We couldn’t find that item.", hi: "यह आइटम नहीं मिला।" },
  saved: { en: "Saved", hi: "सेव किया गया" },
  unsaved: { en: "Removed from saved", hi: "सेव से हटाया गया" },
  following: { en: "Following", hi: "फ़ॉलो कर रहे हैं" },
  unfollowed: { en: "Unfollowed", hi: "फ़ॉलो हटाया" },
  alertsOn: { en: "✓ Alerts on for {name}.", hi: "✓ {name} के अलर्ट चालू।" },
  alertsOnConsent: { en: "✓ Alerts on. Noted in your consent record, with today’s date.", hi: "✓ अलर्ट चालू। आज की तारीख के साथ आपके सहमति रिकॉर्ड में दर्ज।" },
  alertsOff: { en: "No alerts about {name}. You can still see it here.", hi: "{name} के बारे में कोई अलर्ट नहीं। यह यहाँ दिखता रहेगा।" },
  alertsOffNoted: { en: "No alerts about {name}. Noted in your consent record. You can still see it here.", hi: "{name} के बारे में कोई अलर्ट नहीं। आपके सहमति रिकॉर्ड में दर्ज। यह यहाँ दिखता रहेगा।" },
  alertsOffConsent: { en: "No alerts about {name}. Locality alerts are now off, and that’s noted in your consent record.", hi: "{name} के बारे में कोई अलर्ट नहीं। इलाके के अलर्ट अब बंद हैं, और यह आपके सहमति रिकॉर्ड में दर्ज है।" },
  unfollowedOff: { en: "You’ve unfollowed {name}. Locality alerts are off too, and that’s noted in your consent record.", hi: "आपने {name} को फ़ॉलो करना बंद किया। इलाके के अलर्ट भी बंद हैं, और यह आपके सहमति रिकॉर्ड में दर्ज है।" },
  unfollowedNoted: { en: "You’ve unfollowed {name}. Its alerts are off too, and that’s noted in your consent record.", hi: "आपने {name} को फ़ॉलो करना बंद किया। इसके अलर्ट भी बंद हैं, और यह आपके सहमति रिकॉर्ड में दर्ज है।" },
  unfollowedName: { en: "You’ve unfollowed {name}. No more alerts about it.", hi: "आपने {name} को फ़ॉलो करना बंद किया। इसके बारे में अब कोई अलर्ट नहीं।" },
  notFollowing: { en: "Follow this first, then choose alerts.", hi: "पहले फ़ॉलो करें, फिर अलर्ट चुनें।" },
  ask: { en: "Send alerts about {name}? This turns on “{label}” in your messages.", hi: "{name} के बारे में अलर्ट भेजें? इससे आपके संदेशों में “{label}” चालू हो जाएगा।" },
  imported: { en: "Your saved items are now in your account.", hi: "आपकी सेव की गई चीज़ें अब आपके खाते में हैं।" },
} as const;

const FOLLOW_PURPOSE = FOLLOW_ALERT_PURPOSE;

type Lang = "en" | "hi";

function tr(key: keyof typeof T, lang: Lang, vars: Record<string, string> = {}): string {
  return Object.entries(vars).reduce<string>((s, [k, v]) => s.replaceAll(`{${k}}`, v), T[key][lang]);
}

/** Where an unfollow or its Undo happened, for the consent record: "On the Saved & followed
 * page." or "On the Sohna Road locality page." (`from` is the form's hidden field). */
function followPlace(from: "saved" | "page", kind: FollowKind, name: string): { where: string; source: ConsentSource } {
  if (from === "saved") return { where: "On the Saved & followed page. ", source: "saved_page" };
  if (kind === "locality") return { where: `On the ${name} locality page. `, source: "locality_page" };
  return { where: "", source: "account_settings" };
}

/** Locality alerts stop when no followed locality wants them any more. Returns true when the
 * message type was switched off. */
async function stopLocalityAlertsIfLast(tx: DbClient, userId: string, name: string, context: string, source: ConsentSource = "saved_page"): Promise<boolean> {
  const others = await tx.follow.count({ where: { userId, kind: { in: ["locality", "society"] }, alert: { in: ["whatsapp", "email"] } } });
  if (others > 0) return false;
  const r = await setConsent({ userId, purpose: "locality_updates", granted: false, source, context, subject: name }, tx);
  return r.changed;
}

/** Undo straight after removing or unfollowing (`undo=1`) restores the original date (field
 * `restoreAt`, an ISO time), so "Saved 5 Oct" and "new since you followed" stay as they were.
 * Only past dates within two years are accepted; anything else means "now". */
function restoreDate(formData: FormData): Date | undefined {
  const undo = formData.get("undo");
  const raw = formData.get("restoreAt");
  if ((undo !== "1" && undo !== "on" && undo !== "true") || typeof raw !== "string") return undefined;
  const at = new Date(raw);
  const now = Date.now();
  return Number.isNaN(at.getTime()) || at.getTime() > now || now - at.getTime() > 2 * 365 * 86_400_000 ? undefined : at;
}

/** A follow's alerts changed while its message type stayed on (another locality, or one more
 * discussion under "Replies to my questions"): that still changes what we may send, so it gets a
 * line in the consent record too ("Alerts on: new replies in “…”"). An account line (no purpose),
 * so the message type's own record keeps its first "Agreed". */
async function noteAlertScope(
  tx: DbClient,
  input: { userId: string; on: boolean; kind: FollowKind; name: string; purpose: ConsentPurpose; channel: MessageChannel; context: string; source?: ConsentSource },
) {
  const label = consentInfo(input.purpose).label;
  const scope =
    input.kind === "thread"
      ? `new replies in “${input.name}”`
      : input.kind === "topic"
        ? `new questions and replies in ${input.name}`
        : input.kind === "provider"
          ? `changes to ${input.name}`
          : `${label} for ${input.name}`;
  const summary = `Alerts ${input.on ? "on" : "off"}: ${scope}`;
  await tx.consent.create({
    data: {
      userId: input.userId,
      purpose: null,
      channel: input.channel,
      action: input.on ? "granted" : "channel_changed",
      summary,
      context: input.context,
      source: input.source ?? "saved_page",
      wording: input.on ? `Also send ${scope} with “${label}”, by ${channelName(input.channel)}. ${consentInfo(input.purpose).often}` : summary,
      wordingVersion: CONSENT_VERSION,
    },
  });
}

/** Save or unsave a provider, event, article, guide, thread, top list or story. Undo straight
 * after removing: undo=1 and restoreAt (the original save time). Optional `want` (save | unsave)
 * makes it idempotent. */
export async function toggleSaved(_prev: ActionState<{ saved: boolean }>, formData: FormData): Promise<ActionState<{ saved: boolean }>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(T.signIn[lang]);
  const parsed = parseForm(toggleSavedSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { kind, targetId } = parsed.data;

  const where = { userId_kind_targetId: { userId: user.id, kind, targetId } };
  const existing = await db.savedItem.findUnique({ where });
  // `want` (save | unsave) makes the call idempotent: Remove and its Undo never flip twice.
  const want = formData.get("want");
  if ((want === "save" && existing) || (want === "unsave" && !existing)) return ok(existing ? T.saved[lang] : T.unsaved[lang], { saved: !!existing });
  if (existing) {
    await db.savedItem.delete({ where });
  } else {
    if (!(await resolveTarget(kind, targetId))) return fail("not_found", T.notFound[lang]);
    const createdAt = restoreDate(formData);
    await db.savedItem.create({ data: { userId: user.id, kind, targetId, ...(createdAt ? { createdAt } : {}) } });
  }
  expireTags(tags.saved(user.id));
  return ok(existing ? T.unsaved[lang] : T.saved[lang], { saved: !existing });
}

export type FollowData = {
  following: boolean;
  /** Unfollowing switched locality alerts off: offer an Undo that turns them back on (undo=1, alerts=1). */
  alertsWereOn: boolean;
};

/** Follow or unfollow a locality, topic, thread, society or provider. New follows alert on the
 * site only (in_app) until the person turns alerts on. Unfollowing the last locality with alerts
 * turns locality alerts off (noted in the consent record); unfollowing anything whose alerts were
 * being sent is noted too. `alertsWereOn`: Undo (undo=1, alerts=1) follows again and turns them
 * back on. */
export async function toggleFollow(_prev: ActionState<FollowData>, formData: FormData): Promise<ActionState<FollowData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(T.signIn[lang]);
  const parsed = parseForm(toggleFollowSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { kind, targetId, undo, alerts, from } = parsed.data;
  const target = await resolveTarget(kind, targetId);
  const name = target?.title ?? targetId;
  const place = followPlace(from, kind, name);

  const where = { userId_kind_targetId: { userId: user.id, kind, targetId } };
  const existing = await db.follow.findUnique({ where });
  // `want` (follow | unfollow) makes the call idempotent: Unfollow and its Undo never flip twice.
  const want = formData.get("want");
  if ((want === "follow" && existing) || (want === "unfollow" && !existing)) {
    return ok(existing ? T.following[lang] : tr("unfollowedName", lang, { name }), { following: !!existing, alertsWereOn: false });
  }
  if (existing) {
    const wasAlerting = existing.alert === "whatsapp" || existing.alert === "email";
    const { stopped, effective } = await db.$transaction(async (tx) => {
      await tx.follow.delete({ where });
      if (!wasAlerting) return { stopped: false, effective: false };
      const context = `${place.where}You unfollowed ${name}.`;
      const stopped = kind === "locality" || kind === "society" ? await stopLocalityAlertsIfLast(tx, user.id, name, context, place.source) : false;
      if (!stopped) {
        const purpose = FOLLOW_PURPOSE[kind];
        const typeOn = await tx.consentState.count({ where: { userId: user.id, purpose, granted: true } });
        if (typeOn) {
          const channel: MessageChannel = existing.alert === "email" ? "email" : "whatsapp";
          await noteAlertScope(tx, { userId: user.id, on: false, kind, name, purpose, channel, source: place.source, context: `${context} “${consentInfo(purpose).label}” stays on for the rest.` });
          return { stopped: false, effective: true };
        }
      }
      return { stopped, effective: stopped };
    });
    expireTags(tags.follows(user.id), effective ? tags.consent(user.id) : null);
    return ok(tr(stopped ? "unfollowedOff" : effective ? "unfollowedNoted" : "unfollowedName", lang, { name }), { following: false, alertsWereOn: effective });
  }

  if (!target) return fail("not_found", T.notFound[lang]);
  await db.$transaction(async (tx) => {
    const purpose = FOLLOW_PURPOSE[kind];
    let alert: AlertPref = "in_app";
    if (undo && alerts) {
      const states = await tx.consentState.findMany({ where: { userId: user.id, purpose } });
      const channel = currentChannel(states, purpose);
      if (states.some((st) => st.granted)) {
        await noteAlertScope(tx, { userId: user.id, on: true, kind, name, purpose, channel, source: place.source, context: `${place.where}You tapped Undo straight after unfollowing ${name}.` });
      }
      await setConsent(
        {
          userId: user.id,
          purpose,
          granted: true,
          channel,
          source: place.source,
          subject: kind === "locality" ? name : null,
          regrant: true,
          confirmed: true,
          context: `${place.where}You tapped Undo straight after unfollowing ${name}.`,
        },
        tx,
      );
      alert = channel;
    }
    const createdAt = undo ? restoreDate(formData) : undefined;
    await tx.follow.create({ data: { userId: user.id, kind, targetId, alert, ...(createdAt ? { createdAt } : {}) } });
  });
  expireTags(tags.follows(user.id), undo && alerts ? tags.consent(user.id) : null);
  return ok(T.following[lang], { following: true, alertsWereOn: false });
}

export type FollowAlertData = {
  alert: AlertPref;
  /** With code "consent_required": what to ask ("Send alerts about X?"). Post again with confirm=1. */
  ask?: { purpose: ConsentPurpose; label: string; channel: MessageChannel; often: string };
};

/** Alerts for something you follow: "on" (by the message type's channel), "off", or an exact
 * AlertPref. If the message type is off, the first post returns code "consent_required" with
 * `data.ask`; posting again with confirm=1 turns it on (noted in the consent record) and then
 * the alerts. Turning off the last locality's alerts turns locality alerts off. */
export async function setFollowAlert(_prev: ActionState<FollowAlertData>, formData: FormData): Promise<ActionState<FollowAlertData>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(T.signIn[lang]);
  const parsed = parseForm(setFollowAlertSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { kind, targetId, confirm, from } = parsed.data;

  const follow = await db.follow.findUnique({ where: { userId_kind_targetId: { userId: user.id, kind, targetId } } });
  if (!follow) return fail("not_following", T.notFollowing[lang]);
  const target = await resolveTarget(kind, targetId);
  const name = target?.title ?? targetId;
  const place = followPlace(from, kind, name);
  const purpose = FOLLOW_PURPOSE[kind];
  const states = await db.consentState.findMany({ where: { userId: user.id, purpose } });
  const typeChannel = currentChannel(states, purpose);
  const typeOn = states.some((s) => s.granted);
  const wanted: AlertPref = parsed.data.alert === "on" ? typeChannel : parsed.data.alert === "off" ? "in_app" : parsed.data.alert;
  const turningOn = wanted === "whatsapp" || wanted === "email";

  if (turningOn && !typeOn && !confirm) {
    const info = consentInfo(purpose);
    return failWith("consent_required", tr("ask", lang, { name, label: info.label }), {
      alert: follow.alert,
      ask: { purpose, label: info.label, channel: wanted, often: info.often },
    });
  }

  const wasAlerting = follow.alert === "whatsapp" || follow.alert === "email";
  let consentChanged = false;
  let typeStopped = false;
  await db.$transaction(async (tx) => {
    if (turningOn && (!typeOn || typeChannel !== wanted)) {
      const context =
        from === "saved"
          ? `On the Saved & followed page. You chose Send alerts for ${name} and confirmed.`
          : kind === "locality"
            ? `On the ${name} locality page. You tapped Follow and chose ${channelName(wanted)} alerts.`
            : `You chose ${channelName(wanted)} alerts for “${name}” and confirmed.`;
      const r = await setConsent(
        {
          userId: user.id,
          purpose,
          granted: true,
          channel: wanted,
          source: from === "saved" ? "saved_page" : kind === "locality" ? "locality_page" : "account_settings",
          context,
          subject: kind === "locality" ? name : null,
          confirmed: true,
        },
        tx,
      );
      consentChanged = r.changed;
    }
    await tx.follow.update({ where: { id: follow.id }, data: { alert: wanted } });
    if (!turningOn && wasAlerting && (kind === "locality" || kind === "society")) {
      typeStopped = await stopLocalityAlertsIfLast(tx, user.id, name, `${place.where}You chose No alerts for ${name}.`, place.source);
      consentChanged = typeStopped;
    }
    const where = place.where;
    if (turningOn && !wasAlerting && !consentChanged) {
      await noteAlertScope(tx, {
        userId: user.id,
        on: true,
        kind,
        name,
        purpose,
        channel: wanted === "email" ? "email" : "whatsapp",
        source: place.source,
        context: `${where}You chose Send alerts for ${name}. They come with “${consentInfo(purpose).label}”, which was already on.`,
      });
      consentChanged = true;
    } else if (!turningOn && wasAlerting && !consentChanged && typeOn) {
      await noteAlertScope(tx, {
        userId: user.id,
        on: false,
        kind,
        name,
        purpose,
        channel: follow.alert === "email" ? "email" : "whatsapp",
        source: place.source,
        context: `${where}You chose No alerts for ${name}. “${consentInfo(purpose).label}” stays on for the rest.`,
      });
      consentChanged = true;
    }
  });
  expireTags(tags.follows(user.id), consentChanged ? tags.consent(user.id) : null);
  // "Locality alerts are now off" only when the message type itself went off.
  const message = turningOn
    ? consentChanged
      ? T.alertsOnConsent[lang]
      : tr("alertsOn", lang, { name })
    : tr(typeStopped ? "alertsOffConsent" : consentChanged ? "alertsOffNoted" : "alertsOff", lang, { name });
  return ok(message, { alert: wanted });
}

/** After sign-in: move items saved on this device (localStorage) into the account.
 * Field `items`: JSON array of { kind, targetId }, at most 50. Unknown items are skipped. */
export async function importDeviceSaved(_prev: ActionState<{ imported: number }>, formData: FormData): Promise<ActionState<{ imported: number }>> {
  const lang = formLang(formData);
  const user = await getCurrentUser();
  if (!user) return needsSignIn(T.signIn[lang]);
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return fail("invalid_input", T.notFound[lang]);
  }
  const items = (Array.isArray(raw) ? raw : [])
    .slice(0, 50)
    .map((i) => toggleSavedSchema.safeParse({ ...(i as object), lang }))
    .filter((r) => r.success)
    .map((r) => r.data!)
    .filter((i) => (SAVED_KINDS as readonly string[]).includes(i.kind));
  const resolved = await resolveTargets(items);
  const valid = items.filter((i) => resolved.has(`${i.kind}:${i.targetId}`));
  const already = new Set(
    (await db.savedItem.findMany({ where: { userId: user.id }, select: { kind: true, targetId: true } })).map((r) => `${r.kind}:${r.targetId}`),
  );
  let imported = 0;
  for (const i of valid) {
    if (already.has(`${i.kind}:${i.targetId}`)) continue;
    await db.savedItem.create({ data: { userId: user.id, kind: i.kind, targetId: i.targetId } });
    already.add(`${i.kind}:${i.targetId}`);
    imported += 1;
  }
  expireTags(tags.saved(user.id));
  return ok(T.imported[lang], { imported });
}
