// WhatsApp & email: your messages, the five message types, the consent record, your email, what
// we keep, and download / sign out / delete. Prototype: "Health Gurgaon Account.dc.html" #consent.

import type { ReactNode } from "react";

import type { ConsentRecordEntry, MessageTypeSummary } from "@/lib/consent";
import { CONSENT_PURPOSE_INFO } from "@/lib/consent-text";
import type { FollowEntry, MyAccount, MyActivity, MyConsent } from "@/lib/data/account";
import { topicLabel } from "@/lib/domain";
import { fmt, type Lang } from "@/lib/i18n";
import { accountStrings, type AccountStrings } from "@/lib/i18n/areas/account";
import { LOCALITIES } from "@/lib/localities";
import { maskEmail } from "@/lib/redact";
import { routes } from "@/lib/routes";

import { SignOutButton } from "./account-header";
import { ConfirmEmail, DataControls, EmailForm, MessageLanguage, MessageTypeCard, StopAllCard, type MessageTypeView } from "./consent-controls";
import { countText, dateShort, dayShort, dayTime, listText, shortTitle, stampLabel, timeOfDay, translateLine } from "./format";

const H2 = "m-0 text-22 font-bold tracking-[-.025em]";
const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** Stored record text in the reader's language: known lines translated, message-type and locality
 * names in Hindi. Unknown lines stay English and are marked lang="en". */
function localText(lang: Lang, text: string | null, patterns: readonly (readonly [string, string])[]): ReactNode {
  if (!text) return null;
  if (lang === "en") return text;
  const r = translateLine(text, patterns);
  if (!r.translated) return <span lang="en">{text}</span>;
  let out = r.text;
  for (const info of CONSENT_PURPOSE_INFO) out = out.replaceAll(info.label, info.labelHi);
  for (const L of LOCALITIES) out = out.replaceAll(L.name, L.nameHi);
  return out;
}

/** A message type's RECORD line ("Agreed 3 Oct 2026, 8:14 pm, on the homepage. …"). */
function recordFor(lang: Lang, t: AccountStrings, m: MessageTypeSummary): ReactNode {
  if (lang === "en") return m.recordText;
  const c = t.consent;
  const h = m.history;
  if (!h.length) return c.recordNever;
  const sentence = (e: ConsentRecordEntry) => {
    const verb = e.action === "withdrawn" ? c.recordVerb.stopped : e.action === "channel_changed" ? c.recordVerb.changed : e.summary.startsWith("Turned back on") ? c.recordVerb.again : c.recordVerb.agreed;
    return (
      <>
        {verb} {dateShort(lang, e.at)}, {timeOfDay(e.at)}
        {e.context ? <>, {localText(lang, e.context, t.record.contexts)}</> : "।"}
      </>
    );
  };
  const latest = h[0];
  const grant = h.find((e) => e.action === "granted");
  if (m.on || latest.action !== "withdrawn") return sentence(grant ?? latest);
  return grant ? (
    <>
      {sentence(grant)} {sentence(latest)}
    </>
  ) : (
    sentence(latest)
  );
}

type Props = {
  lang: Lang;
  now: string;
  account: MyAccount;
  consent: MyConsent;
  follows: FollowEntry[];
  activity: MyActivity | null;
  ask: string | null;
  openDelete: boolean;
  confirmToken: string | null;
};

export function ConsentView({ lang, now, account, consent, follows, activity, ask, openDelete, confirmToken }: Props) {
  const all = accountStrings(lang);
  const c = all.consent;
  const placeName = (name: string) => {
    const L = LOCALITIES.find((l) => l.name === name);
    return lang === "hi" && L ? L.nameHi : name;
  };
  const places = consent.alertLocalities.map(placeName);
  // The masked number never breaks across lines ("+91 98XXX XX321").
  const phone = account.phoneMasked.replace(/ /g, " ");
  const hasEmail = !!account.emailMasked;
  const channelWord = (ch: "whatsapp" | "email") => (ch === "email" && hasEmail ? all.common.email : all.common.whatsapp);
  const destOf = (ch: "whatsapp" | "email") => (ch === "email" && account.emailMasked ? account.emailMasked : phone);
  const nameOf = (m: MessageTypeSummary) => (lang === "hi" ? m.labelHi : m.label);
  const base = routes.accountConsent(lang);

  // Your messages, your choice
  const on = consent.types.filter((m) => m.on);
  const wa = on.filter((m) => !(m.channel === "email" && hasEmail));
  const em = on.filter((m) => m.channel === "email" && hasEmail);
  const onNames = on.map((m) => (m.purpose === "locality_updates" && places.length ? `${nameOf(m)} (${places.join(", ")})` : nameOf(m)));
  const summary = on.length
    ? fmt(c.summaryOn, { n: on.length, list: onNames.join(", ") }) +
      (wa.length ? (em.length ? fmt(c.summaryMixed, { wa: wa.length, em: em.length, phone }) : fmt(c.summaryAllWa, { phone })) : c.summaryAllEm)
    : c.summaryNone;

  // What each type covers
  const alerting = follows.filter((f) => f.wantsAlerts);
  const replyNames = alerting
    .filter((f) => f.purpose === "community_replies")
    .map((f) => (f.kind === "topic" ? topicLabel(f.targetId, lang) : `“${shortTitle(f.title, 40)}”`));
  const coversOf = (m: MessageTypeSummary): string | null => {
    if (m.purpose === "locality_updates") return places.length ? listText(places, all.common.and) : null;
    if (m.purpose === "community_replies") return replyNames.length ? fmt(c.coversRepliesAnd, { list: listText(replyNames, all.common.and) }) : c.coversReplies;
    if (m.purpose === "saved_changes")
      return fmt(c.coversSaved, {
        places: account.counts.savedPlaces === 1 ? c.place : fmt(c.places, { n: account.counts.savedPlaces }),
        events: account.counts.savedEvents === 1 ? c.event : fmt(c.events, { n: account.counts.savedEvents }),
      });
    return null;
  };
  const followedLocality = follows.find((f) => f.kind === "locality");
  const followedPlace = followedLocality ? placeName(followedLocality.title) : null;
  const localities = LOCALITIES.filter((l) => l.live).map((l) => ({ slug: l.slug, name: lang === "hi" ? l.nameHi : l.name }));

  const types: MessageTypeView[] = consent.types.map((m) => {
    const name = nameOf(m);
    const channel = m.channel === "email" && hasEmail ? "email" : "whatsapp";
    return {
      purpose: m.purpose,
      key: m.key,
      name,
      on: m.on,
      state: m.on ? fmt(c.stateOn, { channel: channel === "email" ? all.common.emailCap : all.common.whatsapp }) : c.stateOff,
      why: lang === "hi" ? m.whyHi : m.why,
      often: lang === "hi" ? m.oftenHi : m.often,
      covers: coversOf(m),
      record: recordFor(lang, all, m),
      last: m.lastSentAt ? fmt(m.on ? c.lastOn : c.lastOff, { date: dayShort(lang, m.lastSentAt) }) : m.on ? c.lastNone : null,
      sponsored: m.sponsored,
      hasEmail,
      channel,
      dest: destOf(channel),
      askTitle: fmt(c.askTitle, { name }),
      askBody: fmt(c.askBody, {
        channel: channelWord(channel),
        dest: destOf(channel),
        about: m.purpose === "locality_updates" && followedPlace ? fmt(c.askAbout, { place: followedPlace }) : "",
        often: lang === "hi" ? m.oftenHi : m.often,
      }),
      needLocality: m.purpose === "locality_updates" && !followedLocality,
      askHref: `${base}?ask=${m.key}#msg-${m.key}`,
    };
  });

  // What we keep
  const n = account.counts;
  const contributions = n.reviews + n.reports + n.events + n.disputes;
  const keep: [string, string, string, string][] = [
    [...c.keepRows.mobile.slice(0, 1), account.phoneMasked, ...c.keepRows.mobile.slice(1)] as [string, string, string, string],
    [c.keepRows.email[0], account.emailMasked ?? c.noneGiven, c.keepRows.email[1], c.keepRows.email[2]],
    [c.keepRows.area[0], account.area ?? c.noneChosen, c.keepRows.area[1], c.keepRows.area[2]],
    [c.keepRows.saved[0], [countText(n.savedPlaces, c.count.place), countText(n.savedEvents, c.count.event), countText(n.follows, c.count.follow)].join(" · "), c.keepRows.saved[1], c.keepRows.saved[2]],
    [
      c.keepRows.items[0],
      contributions
        ? [countText(n.reviews, c.count.review), countText(n.reports, c.count.report), countText(n.events, c.count.submitted), countText(n.disputes, c.count.dispute)].join(" · ")
        : c.noneYet,
      c.keepRows.items[1],
      c.keepRows.items[2],
    ],
    [c.keepRows.record[0], countText(n.consentEntries, c.count.entry), c.keepRows.record[1], c.keepRows.record[2]],
  ];

  // Delete: the published-review question
  const published = (activity?.reviews ?? []).filter((r) => r.status === "published");
  const pubPending = published.some((r) => !!r.editText);
  const pubQuestion = published.length
    ? {
        legend: published.length === 1 ? fmt(c.pubLegendOne, { name: published[0].provider.name }) : c.pubLegendMany,
        intro: pubPending ? c.pubIntroPending : published.length === 1 ? c.pubIntro : c.pubIntroMany,
        options: [
          { value: "keep" as const, label: pubPending ? c.keepLabelPending : c.keepLabel, desc: pubPending ? c.keepDescPending : c.keepDesc },
          { value: "remove" as const, label: c.removeLabel, desc: pubPending ? c.removeDescPending : c.removeDesc },
        ],
      }
    : null;

  const freshSince = new Date(now).getTime() - 30 * 60_000;
  const pending = account.emailPending ? fmt(c.pendingNote, { email: maskEmail(account.emailPending.email), time: dayTime(lang, account.emailPending.expiresAt) }) : null;

  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-9 px-6 pt-5.5 pb-14">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,25rem),1fr))] items-start gap-4">
        <StopAllCard
          lang={lang}
          kicker={c.darkKicker}
          title={c.darkTitle}
          summary={summary}
          anyWhatsApp={wa.length > 0}
          noneText={c.noneWa}
          stopLabel={c.stopAll}
          undoLabel={all.common.undo}
          undoAria={c.undoStopAria}
        />
        <MessageLanguage lang={lang} current={account.messageLang} legend={c.langLegend} previewKicker={c.previewKicker} preview={c.preview} businessNote={c.businessNote} saveLabel={all.common.save} />
      </div>

      <section aria-labelledby="hg-msgs-h" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="hg-msgs-h" className={H2}>
            {c.typesTitle} <span className="font-normal text-subtle">{fmt(c.typesCount, { n: on.length })}</span>
          </h2>
          <p className="max-w-[48.75rem] text-14 font-light leading-[1.55] text-ink-soft">{c.typesIntro}</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,27.5rem),1fr))] items-start gap-3.5">
          {types.map((m) => (
            <MessageTypeCard
              key={m.key}
              lang={lang}
              m={m}
              localities={localities}
              startAsking={ask === m.key}
              labels={{
                turnOn: c.turnOn,
                turnOff: c.turnOff,
                toggleAria: c.toggleAria,
                sponsorTag: c.sponsorTag,
                dtWhy: c.dtWhy,
                dtOften: c.dtOften,
                dtAbout: c.dtAbout,
                dtSentBy: c.dtSentBy,
                dtRecord: c.dtRecord,
                dtLast: c.dtLast,
                chanAria: c.chanAria,
                destTo: c.destTo,
                useEmail: c.useEmail,
                askYes: c.askYes,
                cancel: all.common.cancel,
                undo: all.common.undo,
                undoAria: c.undoAria,
                whichLocality: all.signin.whichLocality,
                whatsapp: all.common.whatsapp,
                email: all.common.emailCap,
              }}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="hg-record-h" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="hg-record-h" className={H2}>
            {c.recordTitle}
          </h2>
          <p className="max-w-[48.75rem] text-14 font-light leading-[1.55] text-ink-soft">{c.recordIntro}</p>
        </div>
        <ol aria-label={c.recordLabel} className="m-0 list-none overflow-hidden rounded-20 border border-line p-0">
          {consent.record.map((l, i) => (
            <li key={l.id} className={`flex flex-wrap items-start gap-x-4.5 gap-y-1 px-4 py-3 ${i ? "border-t border-line" : ""} ${new Date(l.at).getTime() >= freshSince ? "bg-sponsored-tint" : "bg-white"}`}>
              <span className="mono-label flex-[0_0_11.25rem] text-11 font-medium leading-[1.7] tracking-normal text-subtle">
                <time dateTime={l.at}>{stampLabel(lang, l.at)}</time>
              </span>
              <span className="flex min-w-0 flex-[1_1_18.75rem] flex-col gap-0.5">
                <span className="text-14.5 font-medium leading-[1.45]">{localText(lang, l.summary, all.record.summaries)}</span>
                {l.context && <span className="text-13.5 font-light leading-normal text-ink-soft">{localText(lang, l.context, all.record.contexts)}</span>}
              </span>
              <span
                className={`mono-label flex-none self-start whitespace-nowrap rounded-pill px-2.5 py-1 text-10.5 tracking-[.04em] ${
                  l.tag === "AGREED" ? "bg-success-tint text-success" : l.tag === "STOPPED" ? "bg-line text-ink-soft" : "bg-cream text-subtle"
                }`}
              >
                {c.tags[l.tag] ?? l.tag}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section id="hg-email-sec" aria-labelledby="hg-email-h" className="grid scroll-mt-24 grid-cols-[repeat(auto-fit,minmax(min(100%,21.25rem),1fr))] items-start gap-x-7 gap-y-3 rounded-20 border border-line p-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 id="hg-email-h" className="m-0 text-20 font-bold tracking-title">
            {c.emailTitle}
          </h2>
          <p className="text-14 font-light leading-[1.6] text-ink-soft">{account.emailMasked ? fmt(c.emailIntroHas, { email: account.emailMasked }) : c.emailIntroNone}</p>
          {confirmToken && <ConfirmEmail lang={lang} token={confirmToken} title={c.confirmTitle} body={c.confirmBody} button={c.confirmBtn} />}
        </div>
        <EmailForm
          lang={lang}
          label={account.emailMasked ? c.emailLabelChange : c.emailLabel}
          placeholder={c.emailPlaceholder}
          sendLabel={c.sendLink}
          help={c.emailHelp}
          formatError={c.emailErr}
          devLinkLabel={c.devLink}
          pending={pending}
        />
      </section>

      <section aria-labelledby="hg-keep-h" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="hg-keep-h" className={H2}>
            {c.keepTitle}
          </h2>
          <p className="max-w-[48.75rem] text-14 font-light leading-[1.55] text-ink-soft">{c.keepIntro}</p>
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-[2_1_35rem] overflow-hidden rounded-20 border border-line">
            {keep.map(([what, value, why, how], i) => (
              <div key={what} className={`flex flex-wrap gap-x-6 gap-y-1.5 px-4 py-3.5 ${i ? "border-t border-line" : ""}`}>
                <div className="flex min-w-0 flex-[1_1_13.75rem] flex-col gap-0.75">
                  <span className="text-14.5 font-semibold leading-[1.4]">{what}</span>
                  <span className={`font-mono text-11 leading-[1.6] text-subtle [overflow-wrap:anywhere] ${i > 1 ? "uppercase" : ""}`} lang={i < 2 ? "en" : undefined}>
                    {value}
                  </span>
                </div>
                <div className="flex min-w-0 flex-[1.4_1_16.25rem] flex-col gap-0.75">
                  <span className="text-14 leading-[1.55]">
                    <b className="font-medium">{c.keepWhy}</b> {why}
                  </span>
                  <span className="text-13.5 font-light leading-normal text-ink-soft">
                    <b className="font-medium">{c.keepHow}</b> {lang === "en" ? lowerFirst(how) : how}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex min-w-0 flex-[1_1_18.75rem] flex-col gap-2.5 rounded-20 bg-cream p-4.5">
            <h3 className="m-0 text-16.5 font-semibold">{c.neverTitle}</h3>
            {c.never.map((x) => (
              <div key={x} className="flex items-start gap-3 text-14 leading-normal">
                <span aria-hidden="true" className="flex size-5.5 flex-none items-center justify-center rounded-full bg-white text-11 font-bold text-ink">
                  ✕
                </span>
                <span>{x}</span>
              </div>
            ))}
            <p className="border-t border-line-strong pt-2.5 text-14 font-medium leading-normal">{c.neverFoot}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="hg-control-h" className="flex flex-col gap-3">
        <h2 id="hg-control-h" className={H2}>
          {c.controlTitle}
        </h2>
        <DataControls
          lang={lang}
          t={{
            download: c.download,
            downloadBody: c.downloadBody,
            downloadAgain: c.downloadAgain,
            readyStrong: c.readyStrong,
            readyRest: c.readyRest,
            saveFile: c.saveFile,
            deleteTitle: c.deleteTitle,
            deleteCard: c.deleteCard + (pubQuestion ? c.deleteCardPub : ""),
            deleteOpen: c.deleteOpen,
            panelTitle: c.panelTitle,
            whatHappens: c.whatHappens,
            cantUndo: c.cantUndo,
            confirmDelete: c.confirmDelete,
            keepAccount: c.keepAccount,
            deleting: c.deleting,
            choiceErr: c.choiceErr,
            working: all.common.working,
          }}
          signOut={
            <div className="flex min-w-0 flex-col gap-2.5 rounded-20 border border-line p-4.5">
              <h3 className="m-0 text-16.5 font-semibold">{c.signOutTitle}</h3>
              <p className="text-14 font-light leading-[1.55] text-ink-soft">{c.signOutBody}</p>
              <SignOutButton lang={lang} label={all.common.signOut} className="min-h-12 px-5 text-14.5" />
            </div>
          }
          published={pubQuestion}
          facts={contributions ? c.facts : c.facts.slice(0, 2)}
          startOpen={openDelete}
          deleteHref={`${base}?delete=1#hg-delete`}
          closeHref={`${base}#hg-control-h`}
        />
      </section>
    </div>
  );
}
