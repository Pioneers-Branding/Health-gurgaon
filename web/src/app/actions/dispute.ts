"use server";

// "Dispute a ranking or a mention" (/dispute/[kind]/[slug]): What & who → Item & reason →
// Evidence → Declare & send. One Server Action answers every step with the next one, carrying
// the values in the form, so the four steps also work without JavaScript:
//   intent=next    check this step (disputeStep{1..4}Schema), then show the next
//   intent=back    one step back, nothing checked
//   intent=submit  check everything again (disputeSchema), then file the dispute (HG-DS-0420)
// No account is needed (residents stay anonymous to the provider); a signed-in filer also sees
// the dispute under My reviews & reports. The ranking stays as published until an editor decides.

import { formLang, ok, parseForm, type ActionState, type FieldErrors } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";
import { expireTags, tags } from "@/lib/cache";
import { getDisputeItems } from "@/lib/data/content";
import { db } from "@/lib/db";
import { isProfileKind } from "@/lib/domain";
import { redactPersonalData } from "@/lib/redact";
import { nextRef } from "@/lib/refs";
import { disputeSchema, parseLinks } from "@/lib/validation/dispute";

import { checkDisputeStep, clampStep, DISPUTE_STEPS, firstInvalidStep, readDisputeValues, type DisputeItem, type DisputeValues } from "./dispute-schemas";

const T = {
  notFound: { en: "We couldn’t find that listing.", hi: "यह लिस्टिंग नहीं मिली।" },
  check: { en: "Please check the highlighted fields.", hi: "कृपया चिह्नित जानकारी जाँचें।" },
  review: {
    en: "A single review goes through the review policy: use “Report” under the review on the profile.",
    hi: "किसी एक समीक्षा पर समीक्षा नीति लागू होती है: प्रोफ़ाइल पर समीक्षा के नीचे “शिकायत करें” चुनें।",
  },
  done: { en: "Dispute received. Reference {ref}.", hi: "आपत्ति मिल गई। संदर्भ {ref}।" },
} as const;

export type DisputeData = {
  step: number;
  values: DisputeValues;
  /** Set once the dispute is filed. */
  ref: string | null;
  /** "Ranking position: Dr. Ananya Rao, #1 of 10 · …" as stored (for the confirmation). */
  itemLabel: string | null;
};

type State = ActionState<DisputeData>;

const one = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

function errorState(message: string, d: DisputeData, fieldErrors?: FieldErrors, code = "invalid_input"): State {
  return fieldErrors ? { status: "error", code, message, fieldErrors, data: d } : { status: "error", code, message, data: d };
}

/** "Top hospitals by patient experience, Gurugram 2026 · #2" (the disputes log's wording). */
function itemLabelFor(item: DisputeItem, providerName: string): string {
  if (item.kind === "mention") return `Neighbour mentions · ${providerName}`;
  if (item.listTitle && item.rank) return `${item.listTitle} · #${item.rank} · ${providerName}`;
  return `${providerName} · not in a top list`;
}

export async function disputeStep(_prev: State, formData: FormData): Promise<State> {
  const lang = formLang(formData);
  const intent = one(formData.get("intent"));
  const step = clampStep(one(formData.get("step")));
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") raw[k] = v;
  const values = readDisputeValues(raw);
  const at = (s: number): DisputeData => ({ step: s, values, ref: null, itemLabel: null });

  if (intent === "back") return ok("", at(Math.max(1, step - 1)));

  const providerKind = one(formData.get("providerKind"));
  const providerSlug = one(formData.get("providerSlug"));
  if (!isProfileKind(providerKind)) return errorState(T.notFound[lang], at(step), undefined, "not_found");
  const items = await getDisputeItems(providerKind, providerSlug);
  if (!items) return errorState(T.notFound[lang], at(step), undefined, "not_found");
  if (values.kind === "review") return errorState(T.review[lang], at(1), { kind: [T.review.en] });
  const itemIds = (values.kind === "mention" ? items.mention : items.ranking).map((i) => i.id);

  if (intent !== "submit") {
    const errors = checkDisputeStep(step, values, itemIds);
    if (errors) return errorState(T.check[lang], at(step), errors);
    return ok("", at(Math.min(DISPUTE_STEPS, step + 1)));
  }

  // Submit: every step again, then the whole dispute.
  const invalid = firstInvalidStep(values, itemIds);
  if (invalid) return errorState(T.check[lang], at(invalid.step), invalid.errors);
  const parsed = parseForm(disputeSchema, { ...values, lang });
  if (!parsed.ok) {
    const s = parsed.state;
    return errorState(T.check[lang], at(4), s.status === "error" ? s.fieldErrors : undefined);
  }
  const d = parsed.data;
  const provider = await db.provider.findUnique({ where: { slug: providerSlug }, select: { id: true, name: true, status: true } });
  if (!provider || provider.status !== "published") return errorState(T.notFound[lang], at(step), undefined, "not_found");
  const item = (d.kind === "mention" ? items.mention : items.ranking).find((i) => i.id === d.itemId)!;
  const itemLabel = itemLabelFor(item, provider.name);

  const user = await getCurrentUser();
  const ref = await db.$transaction(async (tx) => {
    const r = await nextRef("dispute", tx);
    await tx.dispute.create({
      data: {
        ref: r,
        target: d.kind,
        providerId: provider.id,
        topListSlug: item.listSlug,
        itemLabel,
        filerRole: d.role,
        filerConnection: d.connection ? redactPersonalData(d.connection).text : null,
        filerId: user?.id ?? null,
        reason: d.reason,
        details: redactPersonalData(d.details).text,
        links: parseLinks(d.link, d.links),
        evidenceFiles: [],
        email: d.email ?? null,
        declared: true,
      },
    });
    return r;
  });
  if (user) expireTags(tags.activity(user.id));
  return ok(T.done[lang].replace("{ref}", ref), { step: DISPUTE_STEPS, values, ref, itemLabel });
}
