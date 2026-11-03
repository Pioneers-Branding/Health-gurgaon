// Messages the community, RWA and volunteer Server Actions send back, in English and Hindi, and the
// Hindi for the English validation messages in src/lib/validation/{community,rwa,volunteer}.ts.
// Pure (no "use server"): the action files import it, and tests/unit/community.test.ts checks it.

import type { ActionState, FieldErrors } from "@/lib/action-state";

export type Lang = "en" | "hi";

export const MESSAGES = {
  signInAsk: { en: "Please sign in with your phone number to ask a question.", hi: "सवाल पूछने के लिए कृपया अपने फ़ोन नंबर से साइन इन करें।" },
  signInReply: { en: "Sign in to reply. It only takes your phone number.", hi: "जवाब देने के लिए साइन इन करें। बस आपका फ़ोन नंबर चाहिए।" },
  signInAct: {
    en: "Sign in to mark replies helpful and follow discussions. It only takes your phone number.",
    hi: "जवाबों को मददगार बताने और चर्चाएं फ़ॉलो करने के लिए साइन इन करें। बस आपका फ़ोन नंबर चाहिए।",
  },
  signInFollow: { en: "Sign in to follow topics and discussions. It only takes your phone number.", hi: "विषय और चर्चाएं फ़ॉलो करने के लिए साइन इन करें। बस आपका फ़ोन नंबर चाहिए।" },
  signInRegister: { en: "Please sign in with your phone number to register your society.", hi: "अपनी सोसाइटी रजिस्टर करने के लिए कृपया अपने फ़ोन नंबर से साइन इन करें।" },
  signInMessage: { en: "Sign in to message the organiser. It only takes your phone number.", hi: "आयोजक को संदेश भेजने के लिए साइन इन करें। बस आपका फ़ोन नंबर चाहिए।" },
  signInApply: { en: "Please sign in with your phone number to apply.", hi: "आवेदन के लिए कृपया अपने फ़ोन नंबर से साइन इन करें।" },
  signInDashboard: { en: "Please sign in to use your society dashboard.", hi: "अपना सोसाइटी डैशबोर्ड इस्तेमाल करने के लिए कृपया साइन इन करें।" },
  notAllowed: { en: "You don’t have permission to do that.", hi: "आपको ऐसा करने की अनुमति नहीं है।" },
  askerOnly: { en: "Only the person who asked can do that.", hi: "यह सिर्फ़ सवाल पूछने वाले ही कर सकते हैं।" },
  threadNotFound: { en: "We couldn’t find that discussion.", hi: "यह चर्चा नहीं मिली।" },
  postNotFound: { en: "We couldn’t find that reply.", hi: "यह जवाब नहीं मिला।" },
  ownPost: { en: "You can’t mark your own reply helpful.", hi: "आप अपने ही जवाब को मददगार नहीं बता सकते।" },
  duplicateQuestion: { en: "You’ve already asked this. It’s waiting for a moderator or already published.", hi: "आप यह पहले ही पूछ चुके हैं। यह मॉडरेटर के पास है या प्रकाशित हो चुका है।" },
  tooManyPending: {
    en: "You have 3 questions waiting for a moderator. Please wait until they’re checked.",
    hi: "आपके 3 सवाल मॉडरेटर के पास हैं। कृपया उनकी जांच होने तक इंतज़ार करें।",
  },
  duplicateReply: { en: "You’ve already sent this reply. It’s with a moderator.", hi: "आप यह जवाब पहले ही भेज चुके हैं। यह मॉडरेटर के पास है।" },
  questionPosted: { en: "Posted. A moderator will approve your question shortly.", hi: "पोस्ट हो गया। एक मॉडरेटर जल्द ही आपका सवाल मंज़ूर करेगा।" },
  replySent: { en: "Reply sent. A moderator will check it before it appears.", hi: "जवाब भेजा गया। दिखने से पहले एक मॉडरेटर इसे जांचेगा।" },
  helpfulOn: { en: "Marked helpful.", hi: "मददगार बताया गया।" },
  helpfulOff: { en: "Helpful mark removed.", hi: "मददगार का निशान हटाया गया।" },
  bestOn: { en: "Marked most helpful.", hi: "सबसे मददगार माना गया।" },
  bestOff: { en: "No longer marked most helpful.", hi: "अब सबसे मददगार के रूप में नहीं।" },
  resolved: { en: "Marked as resolved.", hi: "हल हुआ माना गया।" },
  reopened: { en: "Reopened.", hi: "फिर से खोला गया।" },
  followingCommunity: { en: "Following every topic in the community.", hi: "कम्युनिटी के हर विषय को फ़ॉलो कर रहे हैं।" },
  unfollowedCommunity: { en: "You’ve unfollowed the community topics.", hi: "आपने कम्युनिटी के विषयों को फ़ॉलो करना बंद किया।" },
  localityUnknown: { en: "Choose a locality.", hi: "इलाका चुनें।" },
  registered: { en: "Thanks. We’ll contact you within 3 working days to verify.", hi: "धन्यवाद। सत्यापन के लिए हम 3 कामकाजी दिनों में संपर्क करेंगे।" },
  alreadyRegistered: {
    en: "A society with this name is already registered. If it’s yours, ask its admin to add you to the team.",
    hi: "इस नाम की सोसाइटी पहले से रजिस्टर्ड है। अगर यह आपकी है, तो उसके एडमिन से आपको टीम में जोड़ने को कहें।",
  },
  societyNotFound: { en: "We couldn’t find that society.", hi: "यह सोसाइटी नहीं मिली।" },
  messageSent: { en: "Sent privately to the organiser.", hi: "आयोजक को निजी तौर पर भेजा गया।" },
  tooManyMessages: {
    en: "You have 3 messages waiting for this organiser. Please wait for a reply.",
    hi: "इस आयोजक के पास आपके 3 संदेश पहले से हैं। कृपया जवाब का इंतज़ार करें।",
  },
  offerNotFound: { en: "We couldn’t find that offer.", hi: "यह पेशकश नहीं मिली।" },
  offerAccepted: { en: "Accepted. We’ve sent an introduction.", hi: "स्वीकार किया। हमने परिचय भेज दिया है।" },
  offerDeclined: { en: "Declined politely.", hi: "विनम्रता से मना किया।" },
  eventNotFound: { en: "We couldn’t find that event for your society.", hi: "आपकी सोसाइटी का यह कार्यक्रम नहीं मिला।" },
  reportNotDue: { en: "A report for this event isn’t due, or was already published.", hi: "इस कार्यक्रम की रिपोर्ट बाकी नहीं है, या पहले ही प्रकाशित हो चुकी है।" },
  reportNoNames: {
    en: "Please give counts only. Leave out names, phone numbers and anyone’s health details.",
    hi: "कृपया सिर्फ़ गिनती लिखें। नाम, फ़ोन नंबर और किसी की स्वास्थ्य जानकारी न डालें।",
  },
  reportPublished: { en: "Report published on your society’s profile.", hi: "रिपोर्ट आपकी सोसाइटी की प्रोफ़ाइल पर प्रकाशित हो गई।" },
  roleNotFound: { en: "Choose a role first.", hi: "पहले एक भूमिका चुनें।" },
  alreadyApplied: { en: "You’ve already applied for this role. We’ll be in touch.", hi: "आप इस भूमिका के लिए पहले ही आवेदन कर चुके हैं। हम संपर्क करेंगे।" },
  applied: { en: "Application received.", hi: "आवेदन मिल गया।" },
} as const satisfies Record<string, Record<Lang, string>>;

export type MessageKey = keyof typeof MESSAGES;

export function msg(key: MessageKey, lang: Lang): string {
  return MESSAGES[key][lang];
}

/** Hindi for the English messages in the community, RWA and volunteer schemas. */
const SCHEMA_HI: Record<string, string> = {
  "Please write your question in a full sentence.": "कृपया अपना सवाल पूरे वाक्य में लिखें।",
  "Please rephrase so you’re not asking for medical advice.": "कृपया सवाल ऐसे लिखें कि उसमें चिकित्सा सलाह न मांगी जाए।",
  "Choose a topic.": "विषय चुनें।",
  "Choose a locality.": "इलाका चुनें।",
  "Write a reply first.": "पहले जवाब लिखें।",
  "Please fill in the society name, locality and contact.": "कृपया सोसाइटी का नाम, इलाका और संपर्क भरें।",
  "Choose the type of group.": "समूह का प्रकार चुनें।",
  "Choose how we should contact you.": "चुनें कि हम आपसे कैसे संपर्क करें।",
  "Please confirm you’re authorised.": "कृपया पुष्टि करें कि आप अधिकृत हैं।",
  "Write a short message first.": "पहले एक छोटा संदेश लिखें।",
  "Describe what happened in a sentence (counts only, no names).": "एक वाक्य में बताएं कि क्या हुआ (सिर्फ़ गिनती, कोई नाम नहीं)।",
  "Please add your name and locality.": "कृपया अपना नाम और इलाका लिखें।",
  "Please confirm the code of conduct.": "कृपया आचार संहिता की पुष्टि करें।",
  "Professional roles need a registration number.": "पेशेवर भूमिकाओं के लिए रजिस्ट्रेशन नंबर ज़रूरी है।",
  "Missing reference.": "संदर्भ नहीं मिला।",
  "Invalid reference.": "संदर्भ सही नहीं है।",
};

/** One validation message in the form's language ("Please keep this under 200 characters." too). */
export function localizeMessage(message: string, lang: Lang): string {
  if (lang === "en") return message;
  const known = SCHEMA_HI[message];
  if (known) return known;
  const max = /^Please keep this under (\d+) characters\.$/.exec(message);
  if (max) return `कृपया इसे ${max[1]} अक्षरों से कम रखें।`;
  return message;
}

/** A failed parse's state (summary and field errors) in the form's language. */
export function localizeState<T>(state: ActionState<T>, lang: Lang): ActionState<T> {
  if (state.status !== "error" || lang === "en") return state;
  const fieldErrors: FieldErrors | undefined = state.fieldErrors
    ? Object.fromEntries(Object.entries(state.fieldErrors).map(([k, v]) => [k, v?.map((m) => localizeMessage(m, lang))]))
    : undefined;
  return { ...state, message: localizeMessage(state.message, lang), ...(fieldErrors ? { fieldErrors } : {}) };
}
