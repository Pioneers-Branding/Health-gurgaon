"use client";

// "+ Follow this locality" on a locality page, then the alerts choice the Account prototype
// describes: "WhatsApp alerts about Sohna Road: No alerts | Send alerts", asking "Send alerts
// about Sohna Road?" when Locality alerts are off. Both use the account area's actions
// (toggleFollow, setFollowAlert), which write the consent record ("On the Sohna Road locality
// page. You tapped Follow and chose WhatsApp alerts.").

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { setFollowAlert, toggleFollow } from "@/app/actions/saved";
import { cn } from "@/components/ui/cn";
import { idle } from "@/lib/action-state";
import type { LocalEventsStrings } from "@/lib/i18n/areas/local-events";
import type { Lang } from "@/lib/i18n/config";

import { fill } from "./format";

export type FollowInitial = {
  following: boolean;
  /** WhatsApp or email chosen for this locality. */
  wantsAlerts: boolean;
  /** …and Locality alerts are on, so they are actually sent. */
  alertsOn: boolean;
};

type Note = { text: string; tone: "ok" | "error" | "signin" };

const seg = (on: boolean) =>
  cn("min-h-11 rounded-pill border-[1.5px] px-4 text-14 disabled:opacity-70", on ? "border-ink bg-ink font-semibold text-cream" : "border-line-strong bg-white text-ink hover:border-ink");

export function LocalityFollow({
  lang,
  slug,
  name,
  live,
  initial,
  signedIn,
  channelName,
  dest,
  t,
  signInHref,
  accountHref,
  consentHref,
  meta,
}: {
  lang: Lang;
  slug: string;
  name: string;
  live: boolean;
  initial: FollowInitial;
  /** null while the session isn't known (the static page). */
  signedIn: boolean | null;
  /** "WhatsApp" / "Email" in the page language: how Locality alerts come. */
  channelName: string;
  /** Where they go: the masked number or email. */
  dest: string;
  t: LocalEventsStrings["follow"];
  signInHref: string;
  accountHref: string;
  consentHref: string;
  /** The "PAGE UPDATED …" line next to the button. */
  meta?: string;
}) {
  const [following, setFollowing] = useState(initial.following);
  const [wants, setWants] = useState(initial.wantsAlerts);
  const [on, setOn] = useState(initial.alertsOn);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [pending, start] = useTransition();
  const askRef = useRef<HTMLSpanElement>(null);
  const followRef = useRef<HTMLButtonElement>(null);
  // The button is disabled while the action runs, which drops focus: put it back once it's enabled.
  const refocus = useRef(false);
  useEffect(() => {
    if (!pending && refocus.current) {
      refocus.current = false;
      followRef.current?.focus();
    }
  }, [pending]);

  const form = (extra: Record<string, string>) => {
    const fd = new FormData();
    fd.set("kind", "locality");
    fd.set("targetId", slug);
    fd.set("from", "page");
    fd.set("lang", lang);
    for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    return fd;
  };

  function toggle() {
    if (signedIn === false) {
      setNote({ text: t.signIn, tone: "signin" });
      return;
    }
    start(async () => {
      const res = await toggleFollow(idle, form({ want: following ? "unfollow" : "follow" }));
      if (res.status === "success") {
        const now = res.data?.following ?? !following;
        setFollowing(now);
        if (!now) {
          setWants(false);
          setOn(false);
          setAsking(false);
        }
        setNote({ text: res.message, tone: "ok" });
      } else if (res.status === "error") {
        setNote(res.code === "sign_in_required" ? { text: t.signIn, tone: "signin" } : { text: res.message, tone: "error" });
      }
      refocus.current = true;
    });
  }

  function alerts(alert: "on" | "off", confirm = false) {
    start(async () => {
      const res = await setFollowAlert(idle, form({ alert, ...(confirm ? { confirm: "1" } : {}) }));
      if (res.status === "success") {
        const sent = res.data?.alert === "whatsapp" || res.data?.alert === "email";
        setWants(sent);
        setOn(sent);
        setAsking(false);
        setNote({ text: res.message, tone: "ok" });
      } else if (res.status === "error" && res.code === "consent_required") {
        setAsking(true);
        setNote(null);
        requestAnimationFrame(() => askRef.current?.focus());
      } else if (res.status === "error") {
        setNote(res.code === "sign_in_required" ? { text: t.signIn, tone: "signin" } : { text: res.message, tone: "error" });
      }
    });
  }

  const label = live ? (following ? fill(t.following, { name }) : t.follow) : following ? t.tellingYou : t.tellMe;
  const headingId = `hg-alerts-${slug}`;
  const askId = `hg-ask-${slug}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          ref={followRef}
          type="button"
          aria-pressed={following}
          disabled={pending}
          onClick={toggle}
          className={cn(
            "inline-flex min-h-11 items-center rounded-pill px-4.5 text-14 font-medium transition-colors disabled:opacity-70",
            following ? "bg-success-tint text-success" : "bg-ink text-cream hover:bg-ink-soft",
          )}
        >
          {label}
        </button>
        {meta && <span className="font-mono text-11 text-subtle uppercase">{meta}</span>}
      </div>

      {following && (
        <div className="flex max-w-[36rem] flex-col gap-2 rounded-16 border border-line bg-white p-3.5">
          <span id={headingId} className="text-14 font-medium">
            {fill(t.alertsHeading, { channel: channelName, name })}
          </span>
          <div role="group" aria-labelledby={headingId} className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={!on} disabled={pending} onClick={() => alerts("off")} className={seg(!on)}>
              {t.noAlerts}
            </button>
            <button type="button" aria-pressed={on} disabled={pending} onClick={() => alerts("on")} className={seg(on)}>
              {t.sendAlerts}
            </button>
          </div>
          <span className={cn("text-13.5 leading-normal", on ? "font-medium text-success" : wants ? "text-caution" : "text-muted")}>
            {on ? fill(t.alertsOn, { channel: channelName, dest }) : wants ? t.alertsStopped : t.alertsOff}
          </span>
          {asking && (
            <div role="group" aria-labelledby={askId} className="flex flex-col gap-2.5 rounded-16 border-[1.5px] border-teal bg-cream p-3.5">
              <span id={askId} ref={askRef} tabIndex={-1} className="text-15 leading-[1.4] font-semibold">
                {fill(t.askTitle, { name })}
              </span>
              <span className="text-14 leading-[1.55] font-light text-ink">{fill(t.askBody, { channel: channelName, dest })}</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={pending} onClick={() => alerts("on", true)} className="min-h-11 rounded-pill bg-teal px-5 text-14.5 font-semibold text-white hover:bg-teal-dark disabled:opacity-70">
                  {t.askYes}
                </button>
                <button type="button" onClick={() => setAsking(false)} className="min-h-11 rounded-pill border-[1.5px] border-line-strong bg-white px-4.5 text-14.5 text-ink hover:border-ink">
                  {t.askNo}
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4">
            <Link href={accountHref} className="inline-flex min-h-11 items-center text-13.5 font-medium">
              {t.seeAccount}
            </Link>
            <Link href={consentHref} className="inline-flex min-h-11 items-center text-13.5 font-medium">
              {t.allMessages}
            </Link>
          </div>
        </div>
      )}

      {note && (
        <span role={note.tone === "error" ? "alert" : "status"} className={cn("max-w-[36rem] text-14 leading-normal", note.tone === "ok" ? "text-success" : note.tone === "error" ? "font-medium text-emergency" : "text-muted")}>
          {note.text}
          {note.tone === "signin" && (
            <>
              {" "}
              <Link href={signInHref} className="font-medium">
                {t.signInLink}
              </Link>
            </>
          )}
        </span>
      )}
    </div>
  );
}
