import type { Lang } from "./config";

/**
 * Strings for the error screens (app/[lang]/error.tsx, app/global-error.tsx).
 * Kept apart from the main dictionaries because error boundaries are Client
 * Components that load with every page: this keeps them a few hundred bytes.
 */
type ErrorStrings = {
  kicker: string;
  title: string;
  body: string;
  retry: string;
  home: string;
};

export const ERROR_STRINGS: Record<Lang, ErrorStrings> = {
  en: {
    kicker: "Something went wrong",
    title: "This page didn’t load properly",
    body: "Please try again. If it keeps happening, come back in a few minutes. If you need urgent help, call 112.",
    retry: "Try again",
    home: "Go to the homepage",
  },
  hi: {
    kicker: "कुछ गड़बड़ हो गई",
    title: "यह पेज ठीक से लोड नहीं हुआ",
    body: "कृपया फिर से कोशिश करें। अगर ऐसा बार-बार हो, तो कुछ मिनट बाद आएं। तुरंत मदद चाहिए तो 112 पर कॉल करें।",
    retry: "फिर से कोशिश करें",
    home: "होमपेज पर जाएं",
  },
};
