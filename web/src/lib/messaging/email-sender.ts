// How emails reach residents (email-address confirmation links; later, messages people switch to
// email). Only a "dev" sender exists: it writes the email to the server log. Plug a provider in
// the same way as the OTP sender (docs/BACKEND.md → "Plugging in a real SMS/WhatsApp sender").

import "server-only";

import { maskEmail } from "@/lib/redact";

export type OutgoingEmail = { to: string; subject: string; text: string };

export interface EmailSender {
  readonly name: string;
  send(email: OutgoingEmail): Promise<{ delivered: boolean }>;
}

export const devEmailSender: EmailSender = {
  name: "dev",
  async send(email) {
    console.info(`[email:dev] to ${maskEmail(email.to)}: ${email.subject}\n${email.text}`);
    return { delivered: true };
  },
};

/** EMAIL_PROVIDER (default "dev"). Unknown providers fall back to dev outside production. */
export function getEmailSender(env: Record<string, string | undefined> = process.env): EmailSender {
  const provider = (env.EMAIL_PROVIDER ?? "dev").trim().toLowerCase() || "dev";
  if (provider === "dev") return devEmailSender;
  throw new Error(`EMAIL_PROVIDER "${provider}" is not implemented yet. See docs/BACKEND.md.`);
}

/** Show the confirmation link on screen in development (like the dev sign-in code)? */
export function shouldRevealDevLink(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" && ((env.EMAIL_PROVIDER ?? "dev").trim().toLowerCase() || "dev") === "dev";
}
