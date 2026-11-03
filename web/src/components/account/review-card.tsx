"use client";

// One of "My reviews": its moderation status, why it was sent back, Edit / Fix and send again,
// Withdraw (with Undo). Server Actions: editMyReview, withdrawMyReview, restoreMyReview.

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { editMyReview, restoreMyReview, withdrawMyReview, type ReviewEditData, type ReviewWithdrawData } from "@/app/actions/account";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";
import { fmt } from "@/lib/i18n/format";
import type { AccountStrings } from "@/lib/i18n/areas/account";

import { checkDraft, listText, type TextSegment } from "./format";
import { focusElement, useFocusLater, useOnChange } from "./hooks";
import { StatusPill, type PillTone } from "./progress-steps";

export type ReviewCardData = {
  ref: string;
  name: string;
  href: string;
  sub: string;
  meta: string;
  pill: string;
  pillTone: PillTone;
  /** needs_changes: "Why a moderator sent it back". */
  reasons: { heading: string; lines: string[]; suggestion: string | null } | null;
  segments: TextSegment[];
  /** The text the editor starts from. */
  draft: string;
  shownAs: string;
  reply: { lead: string; text: string } | null;
  next: string;
  canEdit: boolean;
  editLabel: string;
  editPrimary: boolean;
  editNote: string;
  withdrawText: string;
  withdrawn: boolean;
  /** Without JavaScript, Edit and Withdraw open their panels through the URL (?edit=, ?withdraw=). */
  editHref: string;
  withdrawHref: string;
  border: "changes" | "withdrawn" | "plain";
};

type Labels = AccountStrings["activity"] & { cancel: string; undo: string; and: string; sending: string };

export function ReviewCard({
  lang,
  data,
  labels: t,
  startEditing,
  startConfirming,
}: {
  lang: "en" | "hi";
  data: ReviewCardData;
  labels: Labels;
  startEditing: boolean;
  startConfirming: boolean;
}) {
  const focusLater = useFocusLater();
  const [editing, setEditing] = useState(startEditing && data.canEdit);
  const [confirming, setConfirming] = useState(startConfirming && data.canEdit && !startEditing);
  const [draft, setDraft] = useState(data.draft);
  const [editState, editAction, editPending] = useActionState<ActionState<ReviewEditData>, FormData>(editMyReview, idle);
  const [wdState, wdAction, wdPending] = useActionState<ActionState<ReviewWithdrawData>, FormData>(withdrawMyReview, idle);
  const [rsState, rsAction, rsPending] = useActionState<ActionState<{ ref: string }>, FormData>(restoreMyReview, idle);
  // One note at a time: the latest action's.
  const [noteFrom, setNoteFrom] = useState<"edit" | "withdraw" | "restore" | null>(null);

  const id = data.ref;
  const edId = `hg-ed-${id}`;
  useEffect(() => {
    if (startEditing && data.canEdit) focusElement(edId);
    else if (startConfirming && data.canEdit) focusElement(`hg-wdh-${id}`);
  }, [startEditing, startConfirming, data.canEdit, edId, id]);

  useOnChange(editState, (s) => {
    if (s.status === "success") {
      setEditing(false);
      setNoteFrom("edit");
      focusLater(`hg-rvnote-${id}`);
    } else if (s.status === "error") focusElement(edId);
  });
  useOnChange(wdState, (s) => {
    if (s.status === "success") {
      setConfirming(false);
      setNoteFrom("withdraw");
      focusLater(`hg-rvundo-${id}`);
    }
  });
  useOnChange(rsState, (s) => {
    if (s.status === "success") {
      setNoteFrom("restore");
      focusLater(`hg-rvnote-${id}`);
    }
  });

  const check = checkDraft(draft);
  const checkText =
    check.key === "dose"
      ? fmt(t.draftDose, { list: check.dose.join(", ") }) + (check.words.length ? fmt(t.draftDoseAlso, { list: listText(check.words, t.and) }) : "")
      : check.key === "words"
        ? fmt(t.draftWords, { list: check.words.join(", ") }) + (check.phone ? t.draftWordsPhone : "")
        : check.key === "short"
          ? t.draftShort
          : check.key === "phone"
            ? t.draftPhone
            : t.draftOk;
  const editErr = editState.status === "error" ? (editState.fieldErrors?.text?.[0] ?? editState.message) : null;
  const note =
    noteFrom === "edit" && editState.status === "success"
      ? editState.message
      : noteFrom === "restore" && rsState.status === "success"
        ? rsState.message
        : null;
  const showUndo = noteFrom === "withdraw" && wdState.status === "success" && data.withdrawn;
  const showActions = !data.withdrawn && !editing && !confirming;
  const hidden = (
    <>
      <input type="hidden" name="ref" value={data.ref} />
      <input type="hidden" name="lang" value={lang} />
    </>
  );

  return (
    <article
      id={`rv-${id}`}
      className={cn(
        "flex min-w-0 scroll-mt-24 flex-col gap-3 rounded-20 bg-white",
        data.border === "changes" ? "border-2 border-saffron p-4.25" : data.border === "withdrawn" ? "border-[1.5px] border-dashed border-phase p-4.5" : "border border-line p-4.5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-col">
          <span className="mono-label text-10.5 leading-[1.6] tracking-[.04em] text-subtle">{data.meta}</span>
          <h3 className="m-0 text-[length:inherit]">
            <Link href={data.href} className="inline-flex min-h-11 items-center text-17 font-semibold leading-[1.3] text-ink hover:text-teal">
              {data.name}
            </Link>
          </h3>
          <span className="text-13.5 font-light leading-[1.45] text-muted" lang={lang === "hi" ? "en" : undefined}>
            {data.sub}
          </span>
        </div>
        <StatusPill tone={data.pillTone}>{data.pill}</StatusPill>
      </div>

      {data.reasons && !editing && (
        <div className="flex flex-col gap-1.5 rounded-14 bg-pending-tint px-3.5 py-3">
          <span className="mono-label text-10.5 text-pending">{data.reasons.heading}</span>
          {data.reasons.lines.map((r) => (
            <span key={r} className="flex items-baseline gap-2.5 text-14 leading-normal">
              <span aria-hidden="true" className="flex-none font-bold text-caution">
                !
              </span>
              <span>{r}</span>
            </span>
          ))}
          {data.reasons.suggestion && (
            <span className="text-13.5 font-light leading-normal text-ink-soft" lang={lang === "hi" ? "en" : undefined}>
              {data.reasons.suggestion}
            </span>
          )}
        </div>
      )}

      {!editing && (
        <blockquote className="m-0 border-l-3 border-line-strong py-0.5 pl-3.5 text-15 font-light leading-[1.7] text-ink" lang={lang === "hi" ? "en" : undefined}>
          {data.segments.map((s, i) =>
            s.mark === "number" ? (
              <span key={i} className="whitespace-nowrap rounded-5 bg-line px-1.25 py-px font-mono text-12 font-medium text-ink-soft">
                {s.text}
              </span>
            ) : s.mark === "medical" ? (
              <mark key={i} className="rounded-3 bg-pending-tint px-0.5 font-medium text-ink shadow-[inset_0_-2px_0_var(--color-sponsored)]">
                {s.text}
              </mark>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )}
        </blockquote>
      )}
      <span className="text-13.5 leading-normal text-muted">{data.shownAs}</span>
      {data.reply && (
        <div className="rounded-14 bg-cream px-3.5 py-3 text-14 font-light leading-[1.55]">
          <b className="font-semibold">{data.reply.lead}</b> <span lang={lang === "hi" ? "en" : undefined}>{data.reply.text}</span>
        </div>
      )}
      <div className="flex flex-col gap-0.75 border-t border-line pt-2.5">
        <span className="mono-label text-10.5 text-subtle">{t.whatNext}</span>
        <span className="text-14 leading-[1.55]">{data.next}</span>
      </div>

      {note && (
        <div id={`hg-rvnote-${id}`} tabIndex={-1} role="status" className="rounded-14 bg-success-tint px-3.5 py-2.5 text-14 leading-normal text-success">
          {note}
        </div>
      )}

      {editing && (
        <form action={editAction} noValidate className="flex flex-col gap-2.5 rounded-16 border-[1.5px] border-ink p-3.5">
          {hidden}
          <label htmlFor={edId} className="text-15 font-semibold">
            {t.editLabel}
          </label>
          <textarea
            id={edId}
            name="text"
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-describedby={`hg-edh-${id}${editErr ? ` hg-ede-${id}` : ""}`}
            aria-invalid={!!editErr || undefined}
            className={cn(
              "w-full resize-y rounded-14 border-[1.5px] p-3 text-15 font-light leading-[1.6] text-ink",
              editErr ? "border-emergency" : check.tone === "warn" ? "border-sponsored" : "border-line-strong",
            )}
          />
          <span
            id={`hg-edh-${id}`}
            role="status"
            className={cn(
              "text-13.5 leading-normal",
              check.tone === "warn" ? "rounded-12 border-[1.5px] border-dashed border-sponsored bg-pending-tint px-3 py-2 text-pending" : check.tone === "short" ? "text-muted" : "text-success",
            )}
          >
            {checkText}
          </span>
          {editErr && (
            <span id={`hg-ede-${id}`} role="alert" className="text-14 font-medium leading-normal text-emergency">
              {editErr}
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={editPending} className="min-h-12 rounded-pill bg-teal px-5 text-14.5 font-semibold text-white hover:bg-teal-dark disabled:opacity-70">
              {editPending ? t.sending : t.sendToMod}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                focusLater(`hg-edit-${id}`);
              }}
              className="min-h-12 rounded-pill border-[1.5px] border-line-strong bg-white px-4.5 text-14.5 text-ink hover:border-ink"
            >
              {t.cancel}
            </button>
          </div>
          <span className="text-13.5 font-light leading-normal text-muted">{data.editNote}</span>
        </form>
      )}

      {confirming && !data.withdrawn && (
        <div role="group" aria-labelledby={`hg-wdh-${id}`} className="flex flex-col gap-2.5 rounded-16 border-[1.5px] border-emergency p-3.5">
          <span id={`hg-wdh-${id}`} tabIndex={-1} className="text-15.5 font-semibold">
            {t.withdrawTitle}
          </span>
          <span className="text-14 font-light leading-[1.55]">{data.withdrawText}</span>
          <div className="flex flex-wrap gap-2">
            <form action={wdAction}>
              {hidden}
              <button type="submit" disabled={wdPending} className="min-h-12 rounded-pill bg-emergency px-5 text-14.5 font-semibold text-white hover:bg-[#8f1c13] disabled:opacity-70">
                {t.withdrawBtn}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                focusLater(`hg-wdb-${id}`);
              }}
              className="min-h-12 rounded-pill border-[1.5px] border-line-strong bg-white px-4.5 text-14.5 text-ink hover:border-ink"
            >
              {t.keepIt}
            </button>
          </div>
          {wdState.status === "error" && (
            <span role="alert" className="text-14 font-medium text-emergency">
              {wdState.message}
            </span>
          )}
        </div>
      )}

      {showUndo && wdState.status === "success" && wdState.data && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-14 bg-cream py-1.5 pr-1.5 pl-3.5 text-14 leading-normal">
          <span className="min-w-0 py-2">{wdState.message}</span>
          <form action={rsAction}>
            {hidden}
            <input type="hidden" name="previous" value={wdState.data.previous} />
            <button
              id={`hg-rvundo-${id}`}
              type="submit"
              disabled={rsPending}
              aria-label={fmt(t.undoWithdrawAria, { name: data.name })}
              className="min-h-11 rounded-pill bg-ink px-4.5 text-14 font-medium text-cream hover:bg-ink-soft disabled:opacity-70"
            >
              {t.undo}
            </button>
          </form>
        </div>
      )}
      {rsState.status === "error" && noteFrom === "withdraw" && (
        <span role="alert" className="text-14 font-medium text-emergency">
          {rsState.message}
        </span>
      )}

      {showActions && (
        <div className="flex flex-wrap gap-2">
          {data.canEdit && (
            <a
              id={`hg-edit-${id}`}
              href={data.editHref}
              onClick={(e) => {
                e.preventDefault();
                setEditing(true);
                setNoteFrom(null);
                setDraft(data.draft);
                focusLater(edId);
              }}
              aria-label={fmt(t.editAria, { label: data.editLabel, name: data.name })}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-pill px-4.5 text-14",
                data.editPrimary ? "bg-teal font-semibold text-white hover:bg-teal-dark hover:text-white" : "border-[1.5px] border-ink bg-white font-medium text-ink hover:bg-cream hover:text-ink",
              )}
            >
              {data.editLabel}
            </a>
          )}
          {data.canEdit && (
            <a
              id={`hg-wdb-${id}`}
              href={data.withdrawHref}
              onClick={(e) => {
                e.preventDefault();
                setConfirming(true);
                setNoteFrom(null);
                focusLater(`hg-wdh-${id}`);
              }}
              aria-label={fmt(t.withdrawAria, { name: data.name })}
              className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-line-strong bg-white px-4.5 text-14 text-ink hover:border-ink hover:text-ink"
            >
              {t.withdraw}
            </a>
          )}
        </div>
      )}
    </article>
  );
}
