// Indian mobile numbers: normalisation and masking. Pure.
// Sign-in is for Indian mobiles only (10 digits starting 6–9); they are stored as E.164.

/** "+91 98765 43210", "098765-43210", "919876543210", "9876543210" → "+919876543210"; else null. */
export function normalizeIndianMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = String(input).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    if (!digits.startsWith("+91")) return null;
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.includes("+")) return null;
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

/** What's wrong with a typed number, in the sign-in page's words; null when it's a valid Indian
 * mobile. Like the field itself, it ignores spaces and dashes, a leading +91/91 and a leading 0. */
export function mobileNumberProblem(input: string | null | undefined): string | null {
  let d = String(input ?? "").replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  if (!d) return "Please enter your mobile number.";
  if (!/^[6-9]/.test(d)) return "This doesn’t look like an Indian mobile number. It should start with 6, 7, 8 or 9.";
  if (d.length !== 10) return `Please enter all 10 digits. You’ve typed ${d.length}.`;
  return null;
}

export function isValidIndianMobile(input: string | null | undefined): boolean {
  return normalizeIndianMobile(input) !== null;
}

/** "+919876543210" → "+91 98XXX XX210". Anything unparseable → "+91 XXXXX XXXXX". */
export function maskPhone(phone: string | null | undefined): string {
  const e164 = normalizeIndianMobile(phone);
  if (!e164) return "+91 XXXXX XXXXX";
  const d = e164.slice(3);
  return `+91 ${d.slice(0, 2)}XXX XX${d.slice(7)}`;
}

/** "+919876543210" → "+91 98765 43210" (only for the owner's own screens and staff tools). */
export function formatPhone(phone: string): string {
  const e164 = normalizeIndianMobile(phone);
  if (!e164) return phone;
  const d = e164.slice(3);
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

/** Parse the ADMIN_PHONES env value (comma or space separated, any common format). */
export function parsePhoneList(value: string | null | undefined): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(/[,;\n]/)
        .map((s) => normalizeIndianMobile(s.trim()))
        .filter((s): s is string => !!s),
    ),
  );
}
