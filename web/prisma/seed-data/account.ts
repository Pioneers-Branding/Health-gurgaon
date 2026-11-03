// The Account prototype's sample resident ("Health Gurgaon Account.dc.html", 27 Oct 2026):
// saved places and an event, follows, and the consent record behind "WhatsApp & email".
// Their reviews (HG-RV-8412, 8796, 8817), reports (HG-3107, 2041, 1987, HG-CC-0112), events
// (HG-EV-5190, 5182, 5179) and dispute (HG-DS-0402) live with the other reviews, reports,
// events and disputes, linked by user "resident".
//
// Where the prototype disagrees with another screen, the other screen's content wins and the
// account page computes from it:
//   · The 24-hour chemist discussion: the prototype follows it "since 24 Oct" with "2 new
//     replies"; the Community thread's replies are dated 13–16 Oct, so the follow is dated
//     14 Oct, which still gives 2 new replies.
//   · The Senior care topic: "1 new question, asked yesterday" (relative to 27 Oct); the
//     Community threads in that topic are dated to the Community prototype's 16 Oct.

import { HOMEPAGE_WEEKLY_WORDING } from "../../src/lib/consent-text";
import type { SeedConsentLine, SeedConsentStateExtra, SeedFollow, SeedSaved } from "./types";

/** Saved & followed → Saved. Changed places come first on the page (computed). */
export const SAVED: SeedSaved[] = [
  { user: "resident", kind: "provider", target: "aravali-multispeciality-hospital", at: "2026-09-20 18:20" },
  { user: "resident", kind: "provider", target: "dr-ananya-rao", at: "2026-09-28 21:15" },
  { user: "resident", kind: "provider", target: "prakash-path-labs", at: "2026-10-05 19:30" },
  // "You saved it while it was awaiting review. We called the organiser … on 14 Oct."
  { user: "resident", kind: "event", target: "free-eye-check-up-camp-senior-citizens-sector-57", at: "2026-10-12 20:40" },
];

/** Saved & followed → Following. Only the locality sends alerts (WhatsApp). */
export const FOLLOWS: SeedFollow[] = [
  { user: "resident", kind: "topic", target: "senior-care", at: "2026-10-02 07:45", alert: "in_app" },
  { user: "resident", kind: "thread", target: "gcer-24h-chemist", at: "2026-10-14 08:00", alert: "in_app" },
  { user: "resident", kind: "locality", target: "sohna-road", at: "2026-10-14 11:02", alert: "whatsapp" },
];

/** "Your consent record" (LEDGER0), oldest first. */
export const CONSENT_LINES: SeedConsentLine[] = [
  {
    user: "resident",
    at: "2026-09-20 18:04",
    action: "sign_in_only",
    channel: "sms",
    summary: "Gave your mobile number, for sign-in codes only",
    context: "On the sign-in page. The code came by SMS.",
    source: "sign_in",
  },
  {
    user: "resident",
    at: "2026-09-20 18:05",
    action: "setting",
    summary: "Chose English for messages and sign-in codes. No messages turned on.",
    context: "At your first sign-in.",
    source: "sign_in",
  },
  {
    user: "resident",
    at: "2026-09-24 09:12",
    action: "granted",
    purpose: "city_channel",
    channel: "whatsapp",
    summary: "Turned on: Gurugram camps & public-health alerts",
    context: "On the Health Report page, under a dengue advisory. You tapped Get alerts and confirmed.",
    source: "news_page",
  },
  {
    user: "resident",
    at: "2026-10-02 07:30",
    action: "withdrawn",
    purpose: "city_channel",
    channel: "whatsapp",
    summary: "Stopped: Gurugram camps & public-health alerts",
    context: "On WhatsApp. You replied STOP.",
    source: "whatsapp_reply",
    wording: "Stopped: Gurugram camps & public-health alerts (whatsapp).",
  },
  {
    user: "resident",
    at: "2026-10-03 20:14",
    action: "granted",
    purpose: "weekly_report",
    channel: "whatsapp",
    summary: "Turned on: Weekly Gurgaon Health Report",
    context: "On the homepage. You chose WhatsApp, then confirmed by replying YES.",
    source: "homepage_form",
    wording: HOMEPAGE_WEEKLY_WORDING,
  },
  {
    user: "resident",
    at: "2026-10-03 20:20",
    action: "setting",
    channel: "email",
    summary: "Confirmed your email address for messages: a•••••@example.com",
    context: "From the link we sent. Nothing is sent there unless you choose Email for a message.",
    source: "email_link",
  },
  {
    user: "resident",
    at: "2026-10-14 11:02",
    action: "granted",
    purpose: "locality_updates",
    channel: "whatsapp",
    summary: "Turned on: Locality alerts for Sohna Road",
    context: "On the Sohna Road locality page. You tapped Follow and chose WhatsApp alerts.",
    source: "locality_page",
    subject: "Sohna Road",
  },
];

/** Users whose consent record is given in full above (no automatic "SIGN-IN ONLY" line). */
export const FULL_RECORD_USERS = ["resident"];

/** When each type was confirmed and last sent ("Last sent Fri 23 Oct"). */
export const CONSENT_STATE_EXTRAS: SeedConsentStateExtra[] = [
  { user: "resident", purpose: "weekly_report", channel: "whatsapp", confirmed: "2026-10-03 20:14", lastSent: "2026-10-23 08:00" },
  { user: "resident", purpose: "city_channel", channel: "whatsapp", lastSent: "2026-09-29 10:30" },
  { user: "resident", purpose: "locality_updates", channel: "whatsapp", confirmed: "2026-10-14 11:02", lastSent: "2026-10-20 09:00" },
];
