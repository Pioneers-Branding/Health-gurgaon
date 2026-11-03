"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";

/** Hospital overview: "Departments" with "Find a department" (filters as you type). Without
 * JavaScript every department is listed. */
export function DepartmentFinder({
  departments,
  labels,
  askHref,
}: {
  departments: { name: string; detail: string }[];
  labels: { title: string; find: string; none: string; ask: string; rest: string };
  askHref: string;
}) {
  const [q, setQ] = useState("");
  const id = useId();
  const shown = departments.filter((d) => d.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 id={`${id}-h`} className="text-20 font-semibold">
          {labels.title}
        </h2>
        <label className="w-full sm:w-auto">
          <span className="sr-only">{labels.find}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={labels.find}
            className="min-h-11 w-full min-w-0 rounded-pill border-[1.5px] border-line-strong bg-white px-3.5 text-14 placeholder:text-subtle sm:w-56"
          />
        </label>
      </div>
      {shown.length > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,11.25rem),1fr))] gap-2">
          {shown.map((d) => (
            <li key={d.name} className="flex flex-col gap-0.5 rounded-14 bg-cream px-3.5 py-3">
              <span className="text-14 font-medium">{d.name}</span>
              <span className="text-12 font-light text-subtle">{d.detail}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status" className="text-14 font-light text-muted">
          {labels.none} <Link href={askHref}>{labels.ask}</Link>
          {labels.rest}
        </p>
      )}
    </section>
  );
}

/** Lab: "Tests offered" table with "Search tests". Without JavaScript the full list shows. */
export function TestFinder({
  tests,
  labels,
}: {
  tests: { name: string; turnaround: string; price: string }[];
  labels: { title: string; search: string; test: string; reportIn: string; price: string; none: string };
}) {
  const [q, setQ] = useState("");
  const id = useId();
  const shown = tests.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 id={`${id}-h`} className="text-20 font-semibold">
          {labels.title}
        </h2>
        <label className="w-full sm:w-auto">
          <span className="sr-only">{labels.search}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={labels.search}
            className="min-h-11 w-full min-w-0 rounded-pill border-[1.5px] border-line-strong bg-white px-3.5 text-14 placeholder:text-subtle sm:w-60"
          />
        </label>
      </div>
      <div className="overflow-hidden rounded-20 border border-line">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="bg-ink text-cream">
            <tr className="mono-label text-10.5">
              <th scope="col" className="w-1/2 px-4.5 py-3 font-medium">
                {labels.test}
              </th>
              <th scope="col" className="w-1/4 px-3 py-3 font-medium">
                {labels.reportIn}
              </th>
              <th scope="col" className="w-1/4 px-3 py-3 font-medium">
                {labels.price}
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.name} className="border-t border-line text-14">
                <th scope="row" className="px-4.5 py-3 font-medium break-words">
                  {t.name}
                </th>
                <td className="px-3 py-3 font-light break-words">{t.turnaround}</td>
                <td className="px-3 py-3 font-light">{t.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && (
        <p role="status" className="text-14 font-light text-muted">
          {labels.none}
        </p>
      )}
    </section>
  );
}

const READY_KEY = "hg:emergency-ready";
const READY_EVENT = "hg:emergency-ready";

let memoryReady = "[]";

function readReady(): string {
  try {
    return window.localStorage.getItem(READY_KEY) ?? "[]";
  } catch {
    return memoryReady;
  }
}

function writeReady(next: string) {
  memoryReady = next;
  try {
    window.localStorage.setItem(READY_KEY, next);
  } catch {
    // Storage blocked: the ticks still work for this visit.
  }
  window.dispatchEvent(new Event(READY_EVENT));
}

function subscribeReady(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(READY_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(READY_EVENT, callback);
  };
}

/** Emergency page "Keep ready" checklist. Ticks stay on this device only. */
export function KeepReady({ title, items, countLabel }: { title: string; items: string[]; countLabel: string }) {
  const raw = useSyncExternalStore(subscribeReady, readReady, () => "[]");
  const ticked = parseReady(raw);
  const id = useId();

  function toggle(i: number) {
    writeReady(JSON.stringify(ticked.includes(i) ? ticked.filter((x) => x !== i) : [...ticked, i]));
  }

  const count = ticked.filter((i) => i < items.length).length;
  return (
    <fieldset className="flex flex-col gap-1 rounded-20 border border-line p-4.5">
      <div className="flex items-baseline justify-between gap-2.5">
        <legend className="float-left text-16 font-semibold">{title}</legend>
        <span aria-live="polite" className="font-mono text-10.5 text-subtle uppercase">
          {countLabel.replace("{done}", String(count)).replace("{total}", String(items.length))}
        </span>
      </div>
      {items.map((label, i) => (
        <label key={label} htmlFor={`${id}-${i}`} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-14">
          <input id={`${id}-${i}`} type="checkbox" checked={ticked.includes(i)} onChange={() => toggle(i)} className="size-4.5 flex-none cursor-pointer accent-teal" />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

function parseReady(raw: string): number[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}
