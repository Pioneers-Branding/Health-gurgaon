// How sign-in codes reach residents. Only the "dev" sender is implemented; see docs/BACKEND.md
// ("Plugging in a real SMS/WhatsApp sender") for MSG91, Twilio and WhatsApp Cloud API.
//
// To add one: implement OtpSender in a new file (e.g. otp-sender-msg91.ts) reading its own env
// vars, then return it from getOtpSender() for its OTP_PROVIDER value.

import { maskPhone } from "./phone";

/** What a code is for. Sign-in refuses codes issued for anything else. */
export type OtpPurpose = "sign_in" | "claim";

export type OtpMessage = {
  /** E.164, e.g. "+919876543210". */
  phone: string;
  code: string;
  expiresAt: Date;
  lang: "en" | "hi";
  /** "claim": the code went to a clinic's number on record to confirm a profile claim. */
  purpose: OtpPurpose;
  /** SMS works on any phone; WhatsApp only sends this code and signs the person up for nothing. */
  channel: "sms" | "whatsapp";
};

export interface OtpSender {
  readonly name: string;
  send(message: OtpMessage): Promise<{ delivered: boolean; reference?: string }>;
}

/** Misconfiguration (unknown provider, dev sender in production): sign-in shows "temporarily unavailable". */
export class OtpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpConfigError";
  }
}

/** The SMS/WhatsApp text. Keep it short: DLT-registered SMS templates in India must match exactly. */
export function otpMessageText(message: Pick<OtpMessage, "code" | "lang"> & { purpose?: OtpPurpose }): string {
  if (message.purpose === "claim") {
    return message.lang === "hi"
      ? `${message.code} HealthGurgaon पर इस क्लिनिक की प्रोफ़ाइल के दावे की पुष्टि का कोड है। यह 10 मिनट में समाप्त हो जाएगा। अगर आपने दावा नहीं किया है, तो इसे अनदेखा करें।`
      : `${message.code} is the code to confirm a claim of this clinic's profile on HealthGurgaon. It expires in 10 minutes. If you didn't make a claim, ignore this message.`;
  }
  return message.lang === "hi"
    ? `${message.code} आपका HealthGurgaon साइन-इन कोड है। यह 10 मिनट में समाप्त हो जाएगा। इसे किसी से साझा न करें।`
    : `${message.code} is your HealthGurgaon sign-in code. It expires in 10 minutes. Never share it with anyone.`;
}

/** Development sender: writes the code to the server log (the phone is masked). */
export const devOtpSender: OtpSender = {
  name: "dev",
  async send(message) {
    const at = message.expiresAt.toISOString().slice(11, 16);
    const what = message.purpose === "claim" ? "claim code" : "code";
    console.info(`[otp:dev] ${message.channel} ${what} for ${maskPhone(message.phone)}: ${message.code} (expires ${at} UTC)`);
    return { delivered: true, reference: "dev" };
  },
};

type Env = Record<string, string | undefined>;

export function otpProviderName(env: Env = process.env): string {
  return (env.OTP_PROVIDER ?? "dev").trim().toLowerCase() || "dev";
}

/** The configured sender. Throws OtpConfigError when OTP_PROVIDER isn't usable. */
export function getOtpSender(env: Env = process.env): OtpSender {
  const provider = otpProviderName(env);
  if (provider === "dev") {
    if (env.NODE_ENV === "production" && env.OTP_DEV_ALLOW_IN_PRODUCTION !== "1") {
      throw new OtpConfigError("OTP_PROVIDER=dev is disabled in production. Configure a real sender (docs/BACKEND.md) or set OTP_DEV_ALLOW_IN_PRODUCTION=1 on staging.");
    }
    return devOtpSender;
  }
  throw new OtpConfigError(`OTP_PROVIDER "${provider}" is not implemented yet. See docs/BACKEND.md → "Plugging in a real SMS/WhatsApp sender".`);
}

/** Show the code on the sign-in screen ("Development mode: your code is 123456")? Only outside
 * production and only with the dev sender. */
export function shouldRevealDevCode(env: Env = process.env): boolean {
  return env.NODE_ENV !== "production" && otpProviderName(env) === "dev";
}
