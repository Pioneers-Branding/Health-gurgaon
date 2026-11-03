// Text checks used on forms that residents write into (ask a question, reply, review, dispute,
// story). Pure, so client components can show the warnings live; Server Actions run the same
// checks again. Wording of the warnings is the prototype's.

/** Red flags from the Emergency page and the Ask form. */
const URGENT = [
  /chest pain/i,
  /can'?t breathe|cannot breathe|can not breathe|trouble breathing|difficulty breathing|not breathing|breathless/i,
  /unconscious|hard to wake|not waking up|fainted/i,
  /bleeding heavily|heavy bleeding/i,
  /stroke|face drooping|slurred speech/i,
  /seizure|convulsion|\bfits\b/i,
  /overdose|poison/i,
  /सीने में दर्द|सांस नहीं|बेहोश|दौरा/,
];
const SELF_HARM = [/suicid|kill myself|end my life|self[- ]harm|want to die/i, /आत्महत्या/];

export type Urgency = { urgent: boolean; selfHarm: boolean };

/** "This sounds urgent. Please don't wait for replies." Self-harm also shows Tele-MANAS 14416. */
export function detectUrgency(text: string): Urgency {
  const selfHarm = SELF_HARM.some((r) => r.test(text));
  return { urgent: selfHarm || URGENT.some((r) => r.test(text)), selfHarm };
}

/** Asking neighbours for medical advice (dosage, diagnosis, treatment): the Ask form blocks it. */
export function detectAdviceRequest(text: string): boolean {
  return /(what (medicine|dose|tablet)|how much .* (take|give)|should i (take|give)|diagnos|is it (cancer|serious)|dosage|\bmg\b|which (medicine|tablet|antibiotic))/i.test(text);
}

/** Giving dosage or treatment advice in a reply: warn before posting. */
export function detectDosageAdvice(text: string): boolean {
  return /\b(dose|dosage|mg|take \d|should (i|you) take|give (him|her) \d)\b/i.test(text);
}

/** Medical details in a review or dispute (diagnoses, prescriptions, reports, medicines). */
export function detectMedicalDetails(text: string): boolean {
  return /\b(prescription|prescribed|diagnos\w*|discharge summary|test report|lab report|medical record|report says|\d+\s?mg\b|tablets?\b)/i.test(text);
}

export const SAFETY_MESSAGES = {
  phoneInReview: "It looks like you’ve included a phone number. Please remove it; we’ll redact it automatically if you don’t.",
  medicalInReview: "Please avoid sharing diagnoses, medicine names or report details. Focus on your experience of the visit.",
  phoneInDispute: "It looks like you’ve included a phone number. Please remove it: we don’t need anyone’s contact details to check a dispute.",
  medicalInDispute: "Please leave out diagnoses, medicines and report details. We check how a ranking or mention was counted, not anyone’s medical care.",
  phoneInReply: "Phone numbers will be replaced with [number removed] when you post.",
  dosageInReply: "Please don’t give dosage or treatment advice. Suggest seeing a doctor or pharmacist instead.",
  urgent: "This sounds urgent. Please don't wait for replies. Call 112 (ambulance 108) or go to the nearest emergency department now.",
  selfHarm: "If you or someone else is in danger, call 112 now. Tele-MANAS 14416 is free and open 24×7.",
  adviceRequest:
    "It looks like you're asking for medical advice (dosage, diagnosis or treatment). Neighbours can't safely answer that. Try asking where to find the right doctor instead.",
} as const;
