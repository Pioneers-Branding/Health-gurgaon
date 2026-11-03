// Removes personal data that residents type into public text (community posts, replies,
// reviews, stories): phone numbers, email addresses and Aadhaar-like ID numbers. Pure.
//
// Run it on the server before saving; never trust the browser to have done it. Public helplines
// (112, 108, 14416 and 1800/1860 toll-free numbers) are kept, because they're not personal data.

import type { Redaction } from "./json-types";

export type RedactionKind = Redaction["kind"];

export const REDACTION_TOKENS: Record<RedactionKind, string> = {
  phone: "[number removed]",
  email: "[email removed]",
  id_number: "[ID number removed]",
};

export type RedactionResult = {
  text: string;
  redactions: Redaction[];
  changed: boolean;
};

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
/** Indian PAN (ABCDE1234F): an ID number like Aadhaar. */
const PAN = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
/** Runs of digits with the separators people use inside numbers. Classified one by one below. */
const DIGIT_RUN = /(?<![\w@/])(?:\(?\+\s?)?\d[\d\s().-]{6,}\d(?![\w@/])/g;

type Kind = RedactionKind | null;

/** What a run of digits is, judged by its digits only. */
function classifyDigits(raw: string): Kind {
  const plus = raw.trim().startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    return digits.length >= 9 && digits.length <= 15 ? "phone" : null;
  }
  if (/^(1800|1860)\d{6,7}$/.test(digits)) return null; // toll-free helplines
  if (plus) {
    if (/^91[1-9]\d{9}$/.test(digits)) return "phone";
    return digits.length >= 9 && digits.length <= 15 ? "phone" : null;
  }
  if (/^[6-9]\d{9}$/.test(digits)) return "phone"; // mobile
  if (/^0[1-9]\d{9}$/.test(digits)) return "phone"; // 0 + mobile, or STD code + landline
  if (/^0?91[6-9]\d{9}$/.test(digits)) return "phone"; // 91 + mobile without + (or "091 …")
  if (/^[2-9]\d{11}$/.test(digits)) return "id_number"; // Aadhaar-like: 12 digits, not starting 0/1
  return null;
}

/** Split a long run ("98765 43210 98123 45678") into numbers at spaces, greedily. */
function redactRun(run: string, counts: Map<RedactionKind, number>): string {
  const whole = classifyDigits(run);
  if (whole) {
    counts.set(whole, (counts.get(whole) ?? 0) + 1);
    return REDACTION_TOKENS[whole];
  }
  // Tokens sit at even indexes, the whitespace between them at odd ones.
  const parts = run.split(/(\s+)/);
  if (parts.length < 3) return run;
  let out = "";
  let i = 0;
  while (i < parts.length) {
    if (i % 2 === 1) {
      out += parts[i];
      i += 1;
      continue;
    }
    let matched = false;
    // Try the longest group of tokens starting at i that forms a number.
    for (let j = parts.length - 1; j > i; j -= 2) {
      const candidate = parts.slice(i, j + 1).join("");
      const kind = classifyDigits(candidate);
      if (kind) {
        counts.set(kind, (counts.get(kind) ?? 0) + 1);
        out += REDACTION_TOKENS[kind];
        i = j + 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += parts[i];
      i += 1;
    }
  }
  return out;
}

/** Replace phone numbers, emails and ID numbers with "[number removed]" etc. */
export function redactPersonalData(input: string): RedactionResult {
  const counts = new Map<RedactionKind, number>();
  let text = input.replace(EMAIL, () => {
    counts.set("email", (counts.get("email") ?? 0) + 1);
    return REDACTION_TOKENS.email;
  });
  text = text.replace(PAN, () => {
    counts.set("id_number", (counts.get("id_number") ?? 0) + 1);
    return REDACTION_TOKENS.id_number;
  });
  // A run starts with "(+", "+" or a digit and ends with a digit, so it never swallows
  // surrounding punctuation.
  text = text.replace(DIGIT_RUN, (run) => redactRun(run, counts));
  const redactions: Redaction[] = (["phone", "email", "id_number"] as const)
    .filter((k) => counts.has(k))
    .map((k) => ({ kind: k, count: counts.get(k)! }));
  return { text, redactions, changed: redactions.length > 0 };
}

/** What personal data a draft contains, for the live warnings on forms
 * ("It looks like you've included a phone number…"). */
export function findPersonalData(input: string): { phone: boolean; email: boolean; idNumber: boolean } {
  const { redactions } = redactPersonalData(input);
  return {
    phone: redactions.some((r) => r.kind === "phone"),
    email: redactions.some((r) => r.kind === "email"),
    idNumber: redactions.some((r) => r.kind === "id_number"),
  };
}

/** "anjali@example.com" → "a•••••@example.com" (the account pages and the consent record). */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const at = email.lastIndexOf("@");
  if (at < 1) return "•••••";
  return `${email.charAt(0)}•••••${email.slice(at)}`;
}
