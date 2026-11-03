// The five message types and the words residents agree to. Pure: sign-up forms show this text,
// and the consent record (src/lib/consent.ts) stores a snapshot of it with every change.
//
// Source: "Health Gurgaon Account.dc.html" → WhatsApp & email (TYPES, the ledger lines and the
// "Turn on …?" confirmations); the homepage form's own tick-box text for the weekly report.
// Change the wording → bump CONSENT_VERSION, so the record shows which text each person saw.

import type { ConsentChannel, ConsentPurpose } from "@prisma/client";

export const CONSENT_VERSION = "2026-10-27";

/** Channels a message type can use. SMS is only for sign-in codes. */
export const MESSAGE_CHANNELS = ["whatsapp", "email"] as const satisfies readonly ConsentChannel[];
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export type ConsentPurposeInfo = {
  purpose: ConsentPurpose;
  /** The prototype's short key, handy for element ids: weekly | camps | local | replies | saved. */
  key: "weekly" | "camps" | "local" | "replies" | "saved";
  label: string;
  labelHi: string;
  /** Why we'd message you. */
  why: string;
  whyHi: string;
  /** How often. */
  often: string;
  oftenHi: string;
  /** The weekly report carries a sponsor line ("Sponsors never see who gets this"). */
  sponsored: boolean;
  channels: readonly MessageChannel[];
};

export const CONSENT_PURPOSE_INFO: ConsentPurposeInfo[] = [
  {
    purpose: "weekly_report",
    key: "weekly",
    label: "Weekly Gurgaon Health Report",
    labelHi: "साप्ताहिक गुड़गांव हेल्थ रिपोर्ट",
    why: "Free camps, new services and checked health advice across Gurugram, in one message.",
    whyHi: "पूरे गुरुग्राम के मुफ़्त कैंप, नई सेवाएँ और जाँची हुई स्वास्थ्य सलाह, एक ही संदेश में।",
    often: "Once a week, on Friday morning.",
    oftenHi: "हफ़्ते में एक बार, शुक्रवार सुबह।",
    sponsored: true,
    channels: MESSAGE_CHANNELS,
  },
  {
    purpose: "city_channel",
    key: "camps",
    label: "Gurugram camps & public-health alerts",
    labelHi: "गुरुग्राम के कैंप और जन-स्वास्थ्य अलर्ट",
    why: "Urgent advice from the district health department, such as dengue or heatwave warnings, and new free camps.",
    whyHi: "ज़िला स्वास्थ्य विभाग की ज़रूरी सलाह, जैसे डेंगू या लू की चेतावनी, और नए मुफ़्त कैंप।",
    often: "Only when something comes up. At most 2 a week.",
    oftenHi: "सिर्फ़ जब कुछ ज़रूरी हो। हफ़्ते में ज़्यादा से ज़्यादा 2।",
    sponsored: false,
    channels: MESSAGE_CHANNELS,
  },
  {
    purpose: "locality_updates",
    key: "local",
    label: "Locality alerts",
    labelHi: "इलाके के अलर्ट",
    why: "New verified clinics and labs, changed hours and camps in the locality you follow.",
    whyHi: "आपके फ़ॉलो किए इलाके में नए सत्यापित क्लिनिक और लैब, बदला हुआ समय और कैंप।",
    often: "One summary a week, only if something changed.",
    oftenHi: "हफ़्ते में एक सारांश, सिर्फ़ तब जब कुछ बदला हो।",
    sponsored: false,
    channels: MESSAGE_CHANNELS,
  },
  {
    purpose: "community_replies",
    key: "replies",
    label: "Replies to my questions",
    labelHi: "मेरे सवालों के जवाब",
    why: "When someone answers a question you asked, or replies in a discussion or topic you follow.",
    whyHi: "जब कोई आपके पूछे सवाल का जवाब दे, या आपकी फ़ॉलो की गई चर्चा या विषय में जवाब आए।",
    often: "At most one message a day. We group replies together.",
    oftenHi: "दिन में ज़्यादा से ज़्यादा एक संदेश। हम जवाबों को एक साथ भेजते हैं।",
    sponsored: false,
    channels: MESSAGE_CHANNELS,
  },
  {
    purpose: "saved_changes",
    key: "saved",
    label: "Changes to things I saved",
    labelHi: "सेव की गई चीज़ों में बदलाव",
    why: "When a saved place changes its fee, hours or address, or a saved camp moves or is cancelled. Plus a reminder the day before a saved camp.",
    whyHi: "जब सेव की गई जगह की फ़ीस, समय या पता बदले, या सेव किया गया कैंप बदले या रद्द हो। साथ ही, सेव किए गए कैंप से एक दिन पहले याद दिलाना।",
    often: "Only when something changes.",
    oftenHi: "सिर्फ़ जब कुछ बदले।",
    sponsored: false,
    channels: MESSAGE_CHANNELS,
  },
];

/** The homepage form's tick-box, recorded word for word when someone signs up there. */
export const HOMEPAGE_WEEKLY_WORDING = "I agree to receive one weekly message from HealthGurgaon. My number won't be shared or added to groups.";

/** How to stop, shown with every message type. */
export const STOP_TEXT = "Every message ends with “Reply STOP to stop”. You can also turn it off here at any time.";

export function consentInfo(purpose: ConsentPurpose): ConsentPurposeInfo {
  const info = CONSENT_PURPOSE_INFO.find((p) => p.purpose === purpose);
  if (!info) throw new Error(`Unknown consent purpose: ${purpose}`);
  return info;
}

export function isOfferedChannel(purpose: ConsentPurpose, channel: ConsentChannel): boolean {
  return (consentInfo(purpose).channels as readonly ConsentChannel[]).includes(channel);
}

export function channelName(channel: ConsentChannel | null | undefined): string {
  return channel === "email" ? "email" : channel === "sms" ? "SMS" : "WhatsApp";
}

/** The label as it appears in the record: "Locality alerts for Sohna Road". */
export function purposeLabel(purpose: ConsentPurpose, subject?: string | null): string {
  const label = consentInfo(purpose).label;
  return purpose === "locality_updates" && subject ? `${label} for ${subject}` : label;
}

/** What someone agrees to when they turn a message type on, for the record. */
export function consentWording(purpose: ConsentPurpose, channel: ConsentChannel, subject?: string | null): string | null {
  if (!isOfferedChannel(purpose, channel)) return null;
  const info = consentInfo(purpose);
  const about = purpose === "locality_updates" && subject ? ` about ${subject}` : "";
  const exit = channel === "email" ? "Every email has a one-tap way to stop." : "Every message ends with “Reply STOP to stop”.";
  return `Send me “${info.label}”${about} by ${channelName(channel)}. ${info.often} ${exit}`;
}

/** The record's line for a change: "Turned on: …", "Stopped: …". */
export function consentSummary(action: "granted" | "withdrawn" | "regranted", purpose: ConsentPurpose, subject?: string | null): string {
  const label = purposeLabel(purpose, subject);
  return action === "granted" ? `Turned on: ${label}` : action === "regranted" ? `Turned back on: ${label}` : `Stopped: ${label}`;
}

/** "Changed how you get “Weekly Gurgaon Health Report”: now by email". */
export function channelChangeSummary(purpose: ConsentPurpose, channel: ConsentChannel): string {
  return `Changed how you get “${consentInfo(purpose).label}”: now by ${channelName(channel)}`;
}

/** The record's tag for each kind of line, as the account page prints it. */
export const CONSENT_ACTION_TAGS = {
  granted: "AGREED",
  withdrawn: "STOPPED",
  channel_changed: "CHANGED",
  setting: "SETTING",
  sign_in_only: "SIGN-IN ONLY",
} as const;
