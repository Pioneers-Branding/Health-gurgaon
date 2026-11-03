"use client";

// "Private contact details hidden · Reveal (logged)". Editors and admins only; the Server Action
// writes "Viewed private details of …" to the audit log before anything is shown.

import { useActionState, useEffect, useRef } from "react";

import { revealPrivate, type RevealData } from "@/app/actions/admin";
import { idle, type ActionState } from "@/lib/action-state";
import type { Lang } from "@/lib/i18n/config";

type Labels = { hidden: string; revealed: string; none: string; reveal: string; revealing: string; onlyEditors: string };

export function RevealPrivate({ lang, queue, itemId, canReveal, labels }: { lang: Lang; queue: string; itemId: string; canReveal: boolean; labels: Labels }) {
  const [state, action, pending] = useActionState<ActionState<RevealData>, FormData>(revealPrivate, idle);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (state.status !== "idle") ref.current?.focus();
  }, [state]);

  const shown = state.status === "success";
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1 rounded-12 border border-dashed border-sponsored bg-white px-3 py-2.5 text-13">
      {shown ? (
        <span ref={ref} tabIndex={-1} role="status" className="min-w-0 break-words outline-none">
          {state.data?.text ? (
            <>
              <span className="font-light text-muted">{labels.revealed}</span> <span className="font-medium">{state.data.text}</span>
            </>
          ) : (
            labels.none
          )}
        </span>
      ) : (
        <>
          <span>{labels.hidden}</span>
          {canReveal ? (
            <form action={action}>
              <input type="hidden" name="queue" value={queue} />
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="lang" value={lang} />
              <button type="submit" disabled={pending} className="min-h-11 cursor-pointer bg-transparent px-1 text-12.5 text-teal hover:text-ink disabled:opacity-60">
                {pending ? labels.revealing : labels.reveal}
              </button>
            </form>
          ) : (
            <span className="text-12 font-light text-subtle">{labels.onlyEditors}</span>
          )}
        </>
      )}
      {state.status === "error" && (
        <span ref={ref} tabIndex={-1} role="alert" className="w-full text-13 font-medium text-emergency outline-none">
          {state.message}
        </span>
      )}
    </div>
  );
}
