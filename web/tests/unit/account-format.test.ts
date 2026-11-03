import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkDraft,
  cleanCode,
  cleanPhoneInput,
  countText,
  dateShort,
  dayLong,
  dayShort,
  daysUntil,
  doseHits,
  listText,
  medicalHits,
  medicineWordHits,
  phoneProblem,
  reviewSegments,
  shortTitle,
  stampLabel,
  translateLine,
  visitMonthLabel,
} from "../../src/components/account/format";
import { accountStrings } from "../../src/lib/i18n/areas/account";

describe("sign-in fields", () => {
  it("keeps only the 10 digits of a typed or pasted number", () => {
    assert.equal(cleanPhoneInput("98123 45321"), "9812345321");
    assert.equal(cleanPhoneInput("+91 98123-45321"), "9812345321");
    assert.equal(cleanPhoneInput("098123 45321"), "9812345321");
    assert.equal(cleanPhoneInput("9812345321999"), "9812345321");
  });

  it("names the problem with a number in the prototype's three ways", () => {
    assert.deepEqual(phoneProblem(""), { kind: "empty" });
    assert.deepEqual(phoneProblem("5812345321"), { kind: "first" });
    assert.deepEqual(phoneProblem("98123453"), { kind: "count", n: 8 });
    assert.deepEqual(phoneProblem("981234532123"), { kind: "count", n: 12 });
    assert.equal(phoneProblem("+91 98123 45321"), null);
  });

  it("accepts a pasted code with a space or a dash: digits first, then the length limit", () => {
    assert.equal(cleanCode("123 456"), "123456");
    assert.equal(cleanCode("123-456"), "123456");
    assert.equal(cleanCode(" 1 2 3 4 5 6 7"), "123456");
    assert.equal(cleanCode("12a"), "12");
  });
});

describe("review checks", () => {
  const text = "Delivered my father’s blood pressure tablets (40 mg) at 1 am when we ran out. Call the owner directly on [number removed], very helpful.";

  it("finds doses and medicine words, once each", () => {
    assert.deepEqual(doseHits(text), ["40 mg"]);
    assert.deepEqual(medicineWordHits(text), ["blood pressure", "tablets"]);
    assert.deepEqual(medicalHits(text), ["blood pressure", "tablets", "40 mg"]);
    assert.deepEqual(doseHits("Took 2.5 ml and 2.5 ML"), ["2.5 ml"]);
  });

  it("marks the removed number and medical words in the text", () => {
    const segs = reviewSegments(text);
    assert.equal(segs.map((s) => s.text).join(""), text);
    assert.deepEqual(
      segs.filter((s) => s.mark).map((s) => [s.text, s.mark]),
      [
        ["blood pressure", "medical"],
        ["tablets", "medical"],
        ["40 mg", "medical"],
        ["[number removed]", "number"],
      ],
    );
  });

  it("checks a draft in the prototype's order: dose, words, length, phone", () => {
    assert.equal(checkDraft(text).key, "dose");
    assert.equal(checkDraft("Delivered our regular tablets at 1 am when we ran out. Very helpful.").key, "words");
    assert.equal(checkDraft("Very helpful.").key, "short");
    assert.equal(checkDraft("Delivered our regular medicines at 1 am. Call 98123 45321, very helpful.").key, "phone");
    assert.equal(checkDraft("Delivered our regular medicines at 1 am when we ran out. Very helpful.").key, "ok");
  });
});

describe("dates and lists", () => {
  it("formats the account page's dates in India time", () => {
    assert.equal(dayShort("en", "2026-10-29T06:00:00.000Z"), "Thu 29 Oct");
    assert.equal(dayShort("en", "2026-10-26T14:10:00.000Z", { year: true }), "Mon 26 Oct 2026");
    assert.equal(dayLong("en", "2026-11-15T03:30:00.000Z"), "Sunday 15 Nov 2026");
    assert.equal(dateShort("en", "2026-10-08T18:30:00.000Z"), "9 Oct 2026");
    assert.equal(stampLabel("en", "2026-10-14T05:32:00.000Z"), "14 Oct 2026, 11:02 am");
    assert.match(dayShort("hi", "2026-10-29T06:00:00.000Z"), /^गुरुवार, 29 /);
  });

  it("shortens visit months and counts days to an event", () => {
    assert.equal(visitMonthLabel("en", "October 2026"), "Oct 2026");
    assert.equal(visitMonthLabel("en", "Earlier in 2026"), "Earlier in 2026");
    assert.equal(daysUntil("2026-10-27T06:00:00.000Z", "2026-11-15T03:30:00.000Z"), 19);
    assert.equal(daysUntil("2026-11-15T01:00:00.000Z", "2026-11-15T03:30:00.000Z"), 0);
  });

  it("joins lists and picks singular or plural", () => {
    assert.equal(listText(["a"], " and "), "a");
    assert.equal(listText(["a", "b", "c"], " and "), "a, b and c");
    assert.equal(countText(1, ["{n} camp", "{n} camps"]), "1 camp");
    assert.equal(countText(2, ["{n} camp", "{n} camps"]), "2 camps");
    assert.equal(shortTitle("Any 24-hour chemist near Golf Course Ext. Road that delivers at night?"), "Any 24-hour chemist near Golf Course Ext. Road…");
  });
});

describe("the consent record in Hindi", () => {
  const { record } = accountStrings("hi");

  it("translates the stored lines it knows and leaves the rest", () => {
    assert.deepEqual(translateLine("Turned on: Locality alerts for Sohna Road", record.summaries), { text: "चालू किया: Sohna Road के इलाके के अलर्ट", translated: true });
    assert.equal(translateLine("On WhatsApp. You replied STOP.", record.contexts).text, "WhatsApp पर। आपने STOP लिखकर जवाब दिया।");
    assert.deepEqual(translateLine("Something new", record.contexts), { text: "Something new", translated: false });
  });

  it("has every English key in Hindi", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    assert.deepEqual(keys(accountStrings("hi")).sort(), keys(accountStrings("en")).sort());
  });
});
