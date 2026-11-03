"use client";

// Lists with "Remove" / "Unfollow" and an Undo row that stays where the item was, even after the
// server has dropped the item (the page re-renders with fresh data after each action).
//
// With JavaScript, the card's button hands over to an UndoRow in the list, which posts the
// removal itself (toggleSaved / toggleFollow with want=unsave|unfollow, so it never flips twice)
// and offers Undo (want=save|follow, undo=1 and the original date, so "Saved 5 Oct" and "new since
// you followed" come back unchanged). Without JavaScript the button is a plain form post.

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { toggleFollow, toggleSaved } from "@/app/actions/saved";
import { cn } from "@/components/ui/cn";
import { idle, type ActionState } from "@/lib/action-state";

import { focusElement } from "./hooks";

type UndoKind = "saved" | "follow";
type Removal = {
  kind: UndoKind;
  /** kind, targetId, lang (+ from) */
  fields: Record<string, string>;
  /** The original save/follow time, restored by Undo. */
  restoreAt: string;
  /** Unfollow: turn alerts back on with Undo. */
  alerts?: boolean;
  /** What the row says: "Removed X from Saved." (the action's own message is used for follows). */
  text: ReactNode;
  undoLabel: string;
  undoAria: string;
};
type Entry = Removal & { index: number };
type Ctx = { remove: (key: string, removal: Removal) => void };

const UndoCtx = createContext<Ctx | null>(null);

export type UndoListItem = { key: string; content: ReactNode };

type AnyAction = (s: ActionState<unknown>, f: FormData) => Promise<ActionState<unknown>>;
const actionFor = (kind: UndoKind) => (kind === "saved" ? toggleSaved : toggleFollow) as unknown as AnyAction;

export function UndoList({ items, className, empty }: { items: UndoListItem[]; className?: string; empty?: ReactNode }) {
  const [removed, setRemoved] = useState<Record<string, Entry>>({});
  const focusAfter = useRef<string | null>(null);
  const keys = items.map((i) => i.key);
  const keyList = keys.join("|");

  // Undo worked and the server sent the card again: focus its button.
  useEffect(() => {
    const key = focusAfter.current;
    if (!key || removed[key]) return;
    if (keyList.split("|").includes(key)) {
      focusElement(`hg-rm-${key}`);
      focusAfter.current = null;
    }
  }, [keyList, removed]);

  const ctx: Ctx = {
    remove: (key, removal) => {
      const index = keys.indexOf(key);
      setRemoved((prev) => ({ ...prev, [key]: { ...removal, index: index < 0 ? keys.length : index } }));
    },
  };
  const drop = (key: string) =>
    setRemoved((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  // Server items, with each removed one shown in its old place until it is undone.
  const rows: { key: string; node: ReactNode }[] = items.map((i) => ({ key: i.key, node: i.content }));
  for (const [key, entry] of Object.entries(removed).sort((a, b) => a[1].index - b[1].index)) {
    const node = (
      <UndoRow
        key={`undo-${key}`}
        itemKey={key}
        entry={entry}
        onUndone={() => {
          focusAfter.current = key;
          drop(key);
        }}
        onFailed={() => drop(key)}
      />
    );
    const at = rows.findIndex((row) => row.key === key);
    if (at >= 0) rows[at] = { key, node };
    else rows.splice(Math.min(entry.index, rows.length), 0, { key, node });
  }

  if (!rows.length) return <>{empty}</>;
  return (
    <UndoCtx.Provider value={ctx}>
      <div className={className}>
        {rows.map((row) => (
          <div key={row.key} className="contents">
            {row.node}
          </div>
        ))}
      </div>
    </UndoCtx.Provider>
  );
}

function UndoRow({ itemKey, entry, onUndone, onFailed }: { itemKey: string; entry: Entry; onUndone: () => void; onFailed: () => void }) {
  const [removeState, removeAction] = useActionState<ActionState<unknown>, FormData>(actionFor(entry.kind), idle);
  const [undoState, undoAction, undoing] = useActionState<ActionState<unknown>, FormData>(actionFor(entry.kind), idle);
  const fired = useRef(false);
  const undoId = `hg-undo-${itemKey}`;

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const fd = new FormData();
    for (const [k, v] of Object.entries(entry.fields)) fd.set(k, v);
    fd.set("want", entry.kind === "saved" ? "unsave" : "unfollow");
    startTransition(() => removeAction(fd));
    focusElement(undoId);
  }, [entry, removeAction, undoId]);

  const done = useRef<unknown>(null);
  useEffect(() => {
    if (undoState.status === "success" && done.current !== undoState) {
      done.current = undoState;
      onUndone();
    }
  }, [undoState, onUndone]);
  useEffect(() => {
    if (removeState.status === "error") {
      const id = window.setTimeout(onFailed, 4000);
      return () => window.clearTimeout(id);
    }
  }, [removeState, onFailed]);

  const text = entry.kind === "follow" && removeState.status === "success" ? removeState.message : entry.text;
  return (
    <div role="status" className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 self-start rounded-16 border-[1.5px] border-dashed border-phase py-1.5 pr-1.5 pl-4 text-14 leading-normal">
      <span className="min-w-0 py-2">{text}</span>
      <form action={undoAction}>
        {Object.entries(entry.fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input type="hidden" name="want" value={entry.kind === "saved" ? "save" : "follow"} />
        <input type="hidden" name="undo" value="1" />
        <input type="hidden" name="restoreAt" value={entry.restoreAt} />
        {entry.alerts && <input type="hidden" name="alerts" value="1" />}
        <button
          id={undoId}
          type="submit"
          disabled={undoing}
          aria-label={entry.undoAria}
          className="min-h-11 rounded-pill bg-ink px-5 text-14 font-medium text-cream hover:bg-ink-soft disabled:opacity-60"
        >
          {entry.undoLabel}
        </button>
      </form>
      {(removeState.status === "error" || undoState.status === "error") && (
        <span role="alert" className="w-full pb-1.5 text-13.5 font-medium text-emergency">
          {removeState.status === "error" ? removeState.message : undoState.status === "error" ? undoState.message : ""}
        </span>
      )}
    </div>
  );
}

const softBtn = "min-h-11 rounded-pill border-[1.5px] border-line-strong bg-white px-4.5 text-14 text-ink hover:border-ink disabled:opacity-60";

/** "Remove" (saved place or event) or "Unfollow". A form post without JavaScript; with it, the
 * list's Undo row takes over. */
export function RemoveButton({
  itemKey,
  removal,
  label,
  ariaLabel,
}: {
  itemKey: string;
  removal: Removal;
  label: string;
  ariaLabel: string;
}) {
  const ctx = useContext(UndoCtx);
  const [state, action, pending] = useActionState<ActionState<unknown>, FormData>(actionFor(removal.kind), idle);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!ctx) return;
        e.preventDefault();
        ctx.remove(itemKey, removal);
      }}
      className="contents"
    >
      {Object.entries(removal.fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="want" value={removal.kind === "saved" ? "unsave" : "unfollow"} />
      <button id={`hg-rm-${itemKey}`} type="submit" disabled={pending} aria-label={ariaLabel} className={cn(softBtn)}>
        {label}
      </button>
      {state.status === "error" && (
        <span role="alert" className="w-full text-13.5 font-medium text-emergency">
          {state.message}
        </span>
      )}
    </form>
  );
}
