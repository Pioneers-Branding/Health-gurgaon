// One-time code rules as plain constants (no Node APIs), so forms in the browser can use them.

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60_000;
/** Wrong codes allowed before a code stops working ("That code didn’t match 3 times"). */
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_RESEND_COOLDOWN_MS = 30_000;
export const OTP_DEFAULT_MAX_PER_PHONE_PER_HOUR = 5;
export const OTP_DEFAULT_MAX_PER_IP_PER_HOUR = 20;
