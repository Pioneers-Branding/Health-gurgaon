// Homepage UI copy that isn't already in the shared dictionary (`getDictionary(lang).home` holds
// the prototype's EN/HI table and most section copy). English follows "Health Gurgaon
// Homepage.dc.html" word for word; Hindi addresses the reader as आप. Plain strings with
// {placeholders} for fmt(), so slices can go to Client Components as props. Never import this
// module in a "use client" file.

import { getDictionary, type Lang } from "@/lib/i18n";

const en = {
  /** "Sun 26 Oct, 9 am" under the hero's next camp. */
  heroWhen: "{day}, {time}",
  weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  quickLabel: "Popular searches",
  noCamp: "No verified camps coming up yet.",
  seeCalendar: "See the events calendar →",

  categoriesLabel: "Healthcare services",
  facilityChipsLabel: "Hospitals & care centres by type",
  topN: "Top {n}",

  storyVideo: "VIDEO · {place}",
  storyAria: "{title} ({duration} video)",

  tabsLabel: "Choose a locality",
  showingNear: "Showing listings near {place}.",
  km: "{km} km",
  fee: "Consultation {fee} (verified)",
  freeConsult: "Free consultation (verified)",
  hoursChecked: "{hours} (hours checked)",
  profileAria: "View profile: {name}",
  contactAria: "Contact {name}",

  ownershipLabel: "Show hospitals by ownership",
  noFeatured: "No featured hospitals for {place} yet.",
  recommendedOne: "Recommended by 1 neighbour",

  eventsLabel: "Show events",
  noEvents: "No events of this kind coming up right now.",
  noEventsLink: "See the full calendar",

  replyOne: "1 reply",
  answered: "{who} answered",
  unanswered: "Unanswered",

  photo: "PHOTO · {photo}",

  /** Weekly report sign-up: the parts the shared dictionary doesn't have. */
  weekly: {
    prefix: "+91",
    sending: "Subscribing…",
    failed: "Something went wrong. Please try again.",
  },
};

const hi: typeof en = {
  heroWhen: "{day}, {time}",
  weekdaysShort: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
  monthsShort: ["जन॰", "फ़र॰", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अग॰", "सित॰", "अक्तू॰", "नव॰", "दिस॰"],
  quickLabel: "लोकप्रिय खोजें",
  noCamp: "अभी आने वाला कोई सत्यापित कैंप नहीं है।",
  seeCalendar: "कार्यक्रम कैलेंडर देखें →",

  categoriesLabel: "स्वास्थ्य सेवाएं",
  facilityChipsLabel: "प्रकार के अनुसार अस्पताल और केयर सेंटर",
  topN: "टॉप {n}",

  storyVideo: "वीडियो · {place}",
  storyAria: "{title} ({duration} का वीडियो)",

  tabsLabel: "इलाका चुनें",
  showingNear: "{place} के पास की लिस्टिंग दिख रही हैं।",
  km: "{km} किमी",
  fee: "परामर्श शुल्क {fee} (सत्यापित)",
  freeConsult: "मुफ़्त परामर्श (सत्यापित)",
  hoursChecked: "{hours} (समय जाँचा गया)",
  profileAria: "प्रोफ़ाइल देखें: {name}",
  contactAria: "{name} से संपर्क करें",

  ownershipLabel: "स्वामित्व के अनुसार अस्पताल दिखाएं",
  noFeatured: "{place} के लिए अभी कोई प्रमुख अस्पताल नहीं चुना गया है।",
  recommendedOne: "1 पड़ोसी ने सुझाया",

  eventsLabel: "कार्यक्रम दिखाएं",
  noEvents: "अभी इस तरह का कोई कार्यक्रम आने वाला नहीं है।",
  noEventsLink: "पूरा कैलेंडर देखें",

  replyOne: "1 जवाब",
  answered: "{who} ने जवाब दिया",
  unanswered: "अभी जवाब नहीं आया",

  photo: "फोटो · {photo}",

  weekly: {
    prefix: "+91",
    sending: "सदस्यता ली जा रही है…",
    failed: "कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।",
  },
};

export type HomeStrings = typeof en;

export function homeStrings(lang: Lang): HomeStrings {
  return lang === "hi" ? hi : en;
}

/** Labels for <WeeklyReportSignup> (homepage and news page). Pass them from a Server Component. */
export type WeeklyReportLabels = {
  phoneLabel: string;
  prefix: string;
  subscribe: string;
  sending: string;
  consent: string;
  errorPhone: string;
  errorConsent: string;
  failed: string;
  done: string;
};

export function weeklyReportLabels(lang: Lang): WeeklyReportLabels {
  const w = getDictionary(lang).home.whatsapp;
  const x = homeStrings(lang).weekly;
  return {
    phoneLabel: w.phoneLabel,
    prefix: x.prefix,
    subscribe: w.subscribe,
    sending: x.sending,
    consent: w.consent,
    errorPhone: w.errorPhone,
    errorConsent: w.errorConsent,
    failed: x.failed,
    done: w.done,
  };
}

// ── Stored English data shown on /hi ─────────────────────────────────────────

/** "Healthcare by locality" tiles: description and photo caption per locality. */
const LOCALITY_TILE_HI: Record<string, { desc: string; photo: string }> = {
  "golf-course-road": { desc: "बड़े अस्पताल, विशेषज्ञ, इमेजिंग", photo: "गोल्फ़ कोर्स रोड" },
  "golf-course-ext-road": { desc: "नई सोसाइटियां, क्लिनिक, केमिस्ट", photo: "GCER की सोसाइटियां" },
  "sohna-road": { desc: "क्लिनिक, लैब, घर पर देखभाल", photo: "सोहना रोड" },
  "dlf-phases-1-5": { desc: "पुराने भरोसेमंद क्लिनिक, बुज़ुर्गों की देखभाल", photo: "DLF फ़ेज़" },
  "sector-56": { desc: "पड़ोस के डॉक्टर, लैब", photo: "सेक्टर 56 मार्केट" },
  "new-gurgaon": { desc: "बढ़ती कवरेज, नई सुविधाएं", photo: "न्यू गुड़गांव" },
};

export function localityTileText(lang: Lang, tile: { slug: string; desc: string; photo: string }): { desc: string; photo: string } {
  return lang === "hi" ? (LOCALITY_TILE_HI[tile.slug] ?? tile) : { desc: tile.desc, photo: tile.photo };
}

/** Short stored labels on homepage cards (photo captions, hospital highlights, who answered). */
const DATA_HI: Record<string, string> = {
  // featured hospital photo captions
  "Hospital entrance": "अस्पताल का प्रवेश द्वार",
  "Civil hospital": "सिविल अस्पताल",
  "Building front": "इमारत का सामने का हिस्सा",
  "PHC entrance": "PHC का प्रवेश द्वार",
  "Hospital campus": "अस्पताल परिसर",
  "Nursing home": "नर्सिंग होम",
  "ESIC hospital": "ESIC अस्पताल",
  "Hospital front": "अस्पताल का सामने का हिस्सा",
  "Recovery centre": "रिकवरी सेंटर",
  Hospice: "हॉस्पिस",
  "Trust hospital": "ट्रस्ट अस्पताल",
  "CHC entrance": "CHC का प्रवेश द्वार",
  // featured hospital highlights
  Paediatrics: "बाल रोग",
  Cardiology: "हृदय रोग",
  Ortho: "हड्डी रोग",
  "General medicine": "सामान्य चिकित्सा",
  Maternity: "प्रसूति",
  Eye: "नेत्र रोग",
  "General surgery": "सामान्य सर्जरी",
  Medicine: "मेडिसिन",
  Vaccinations: "टीकाकरण",
  "Antenatal care": "प्रसव-पूर्व देखभाल",
  Cardiac: "हृदय",
  Oncology: "कैंसर उपचार",
  Transplant: "ट्रांसप्लांट",
  Gynaecology: "स्त्री रोग",
  "ESIC card holders": "ESIC कार्ड धारक",
  Emergency: "इमरजेंसी",
  "Post-surgery": "सर्जरी के बाद",
  "Stroke rehab": "स्ट्रोक रीहैब",
  Neuro: "न्यूरो",
  Palliative: "पैलिएटिव",
  "Home care": "घर पर देखभाल",
  Dialysis: "डायलिसिस",
  Imaging: "इमेजिंग",
  // facility types
  "Large hospital": "बड़ा अस्पताल",
  "Small hospital": "छोटा अस्पताल",
  "Health centre": "स्वास्थ्य केंद्र",
  "Transition care": "ट्रांज़िशन केयर",
  "Hospice / palliative": "हॉस्पिस / पैलिएटिव",
  Rehabilitation: "पुनर्वास",
  "Dialysis centre": "डायलिसिस केंद्र",
  "Elder care home": "बुज़ुर्ग देखभाल गृह",
  // listing badges
  "Registration checked": "पंजीकरण जाँचा गया",
  "Facility checked": "सुविधा जाँची गई",
  "Hours checked": "समय जाँचा गया",
  "Credentials checked": "योग्यता जाँची गई",
  "Licence seen": "लाइसेंस देखा गया",
  "Clinic address checked": "क्लिनिक का पता जाँचा गया",
  // who answered a question
  Pharmacist: "फ़ार्मासिस्ट",
  Hospital: "अस्पताल",
  Doctor: "डॉक्टर",
  Clinic: "क्लिनिक",
};

/** A short stored English label in the page language (unknown labels stay as stored). */
export function homeData(lang: Lang, text: string): string {
  return lang === "hi" ? (DATA_HI[text] ?? text) : text;
}
