"use client";

import { useState } from "react";

import { cn } from "@/components/ui/cn";

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** A calendar file (.ics) for a saved event: works with any calendar app, nothing is sent to us. */
export function CalendarLink({
  id,
  uid,
  title,
  startsAt,
  endsAt,
  location,
  url,
  label,
  readyText,
  variant = "primary",
}: {
  id?: string;
  uid: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  url: string;
  label: string;
  /** "✓ Calendar file ready: …", announced after the tap. */
  readyText: string;
  variant?: "primary" | "plain";
}) {
  const [ready, setReady] = useState(false);
  const end = endsAt ?? new Date(new Date(startsAt).getTime() + 2 * 3_600_000).toISOString();
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HealthGurgaon//Saved events//EN",
    "BEGIN:VEVENT",
    `UID:${uid}@healthgurgaon.in`,
    `DTSTAMP:${icsDate(startsAt)}`,
    `DTSTART:${icsDate(startsAt)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(title)}`,
    location ? `LOCATION:${icsText(location)}` : "",
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  return (
    <>
      <a
        id={id}
        href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`}
        download={`${uid}.ics`}
        onClick={() => setReady(true)}
        className={cn(
          "inline-flex min-h-11 flex-none items-center justify-center rounded-pill px-4.5 text-14 font-semibold",
          variant === "primary" ? "border-[1.5px] border-teal bg-teal text-white hover:bg-teal-dark hover:text-white" : "border-[1.5px] border-ink bg-white font-medium text-ink hover:bg-cream hover:text-ink",
        )}
      >
        {label}
      </a>
      {ready && (
        <span role="status" className="basis-full text-14 leading-normal text-success">
          {readyText}
        </span>
      )}
    </>
  );
}
