import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectAdviceRequest, detectDosageAdvice, detectMedicalDetails, detectUrgency } from "../../src/lib/content-safety";
import { findPersonalData, redactPersonalData } from "../../src/lib/redact";

const redact = (s: string) => redactPersonalData(s).text;

describe("redacting phone numbers", () => {
  it("removes mobile numbers in every common format", () => {
    for (const n of ["9876543210", "98765 43210", "98765-43210", "+91 98765 43210", "+919876543210", "091 98765 43210", "09876543210", "919876543210", "(+91) 98765-43210"]) {
      assert.equal(redact(`Call ${n} after 9`), "Call [number removed] after 9", n);
    }
  });

  it("removes landlines with an STD code", () => {
    assert.equal(redact("Clinic: +91 124 400 1234"), "Clinic: [number removed]");
    assert.equal(redact("Clinic: 0124-4001234."), "Clinic: [number removed].");
  });

  it("removes several numbers and counts them", () => {
    const r = redactPersonalData("Try 98765 43210 or 98123 45678");
    assert.equal(r.text, "Try [number removed] or [number removed]");
    assert.deepEqual(r.redactions, [{ kind: "phone", count: 2 }]);
    assert.equal(redact("98765 43210 98123 45678"), "[number removed] [number removed]");
  });

  it("keeps emergency and helpline numbers", () => {
    const text = "Call 112, ambulance 108 or Tele-MANAS 14416. Toll-free 1800-891-4416.";
    assert.equal(redact(text), text);
  });

  it("keeps dates, times, prices, sectors and registration numbers", () => {
    const text = "Visited 15-10-2026 at 10:30 am in Sector 56; paid ₹1,200; reg HMC-12345; pin 122018; 2026-10-16.";
    assert.equal(redact(text), text);
    assert.equal(redactPersonalData(text).changed, false);
  });
});

describe("redacting emails and ID numbers", () => {
  it("removes email addresses", () => {
    assert.equal(redact("Write to priya.s+clinic@example.co.in today"), "Write to [email removed] today");
  });

  it("removes Aadhaar-like numbers and PAN", () => {
    assert.equal(redact("My Aadhaar is 2345 6789 0123"), "My Aadhaar is [ID number removed]");
    assert.equal(redact("Aadhaar 234567890123"), "Aadhaar [ID number removed]");
    assert.equal(redact("PAN ABCDE1234F"), "PAN [ID number removed]");
  });

  it("reports what a draft contains for live warnings", () => {
    assert.deepEqual(findPersonalData("call 9876543210 or mail a@b.in"), { phone: true, email: true, idNumber: false });
    assert.deepEqual(findPersonalData("Explained the vaccine schedule clearly."), { phone: false, email: false, idNumber: false });
  });
});

describe("content safety", () => {
  it("spots urgent questions", () => {
    assert.equal(detectUrgency("My father has chest pain since morning").urgent, true);
    assert.equal(detectUrgency("baby can't breathe properly").urgent, true);
    assert.deepEqual(detectUrgency("I want to kill myself"), { urgent: true, selfHarm: true });
    assert.equal(detectUrgency("Which lab does home collection on Sunday?").urgent, false);
  });

  it("blocks asking neighbours for medical advice", () => {
    assert.equal(detectAdviceRequest("What medicine should I give for fever?"), true);
    assert.equal(detectAdviceRequest("Should I take 500 mg paracetamol?"), true);
    assert.equal(detectAdviceRequest("Which labs do home collection on Sundays in Sector 49?"), false);
  });

  it("warns about dosage advice and medical details", () => {
    assert.equal(detectDosageAdvice("Just take 2 tablets of 500 mg"), true);
    assert.equal(detectDosageAdvice("They deliver after midnight"), false);
    assert.equal(detectMedicalDetails("The prescription said 20 mg twice a day"), true);
    assert.equal(detectMedicalDetails("Waited 25 minutes, doctor explained well"), false);
  });
});
