// Smoke test of the data layer and auth against the seeded database, outside Next (next/* and
// server-only are stubbed by ./register.mjs). Run with `npm run test:data`: it reseeds first and
// again afterwards, because signing in and changing consent write to the database.

import { getHomepage } from "@/lib/data/home";
import { getSearchCatalogue, runSearch } from "@/lib/data/search";
import { getProviderProfile, getProviderReviews, getSpecialtyPage, getEmergencyDirectory, getFacilityDirectory, getFeaturedProviders, getRecentlyVerified, getProviderForRoute, getProviderDiscussions, findClaimCandidates, getSpecialties, getPublicPhone } from "@/lib/data/providers";
import { getLocalityIndex, getLocalityPage } from "@/lib/data/localities";
import { getUpcomingEvents, getEventMonth, getEvent, listEventSlugs } from "@/lib/data/events";
import { getArticles, getArticle, getGuides, getGuide, getCorrections, getDisputeOutcomes, getNewsUpdatedAt } from "@/lib/data/content";
import { getThreads, getTopicCounts, getThread, getSocieties, getSociety, getVolunteerRoles, getSocietyDashboard } from "@/lib/data/community";
import { getTopLists, getTopList, getStories } from "@/lib/data/top-lists";
import { getNeighbourSummary, getNeighbourRanking, getNeighbourCounts } from "@/lib/data/neighbours";
import { getMyAccount, getMySaved, getMyFollows, getMyActivity, getMyConsent, isSaved } from "@/lib/data/account";
import { saveWelcomeChoices } from "@/app/actions/auth";
import {
  changeMessageChannel,
  confirmEmail,
  deleteMyAccount,
  exportMyData,
  requestEmailChange,
  setConsent as setConsentAction,
  setMessageLanguage,
  setReviewLabel,
  stopAllWhatsApp,
  undoStopAllWhatsApp,
} from "@/app/actions/consent";
import { setFollowAlert } from "@/app/actions/saved";
import { isOnStopList } from "@/lib/messaging/stop-list";
import { getAdminOverview, getModerationQueue, getAuditLog, getVerificationDesk, getListings, revealPrivateDetails, getModerationItem } from "@/lib/data/admin";
import { issueOtp, verifyOtp } from "@/lib/auth/otp-service";
import { completeSignIn } from "@/lib/auth/sign-in";
import { getCurrentUser, deleteCurrentSession } from "@/lib/auth/session";
import { changeConsentChannel, setConsent, withdrawAll } from "@/lib/consent";
import { nextRef } from "@/lib/refs";
import { DEFAULT_SEARCH, resultTitle } from "@/lib/search";
import { orderEmergencyDepartments } from "@/lib/emergency";
import { db } from "@/lib/db";

function check(label: string, cond: unknown, extra?: unknown) {
  if (!cond) {
    console.error("FAIL", label, extra ?? "");
    process.exitCode = 1;
  } else console.log("ok  ", label);
}

async function signInAs(phone: string) {
  const issued = await issueOtp({ phone, ipHash: "smoke", lang: "en", channel: "sms" });
  if (!issued.ok) throw new Error("issue failed " + JSON.stringify(issued));
  const v = await verifyOtp({ challengeId: issued.challengeId, code: issued.devCode! });
  if (!v.ok) throw new Error("verify failed " + JSON.stringify(v));
  await completeSignIn({ phone: v.phone, lang: "en", channel: v.channel });
}

async function main() {
  const cat = await getSearchCatalogue();
  check("catalogue providers", cat.providers.length >= 40, cat.providers.length);
  const s = await runSearch({ ...DEFAULT_SEARCH, q: "Paediatrician" });
  check("search paediatrician", s.total > 3 && s.sponsored?.slug === "aravali-multispeciality-hospital", resultTitle(s));
  const nr = await runSearch({ ...DEFAULT_SEARCH, q: "Paediatric cardiologist", locality: "new-gurgaon" });
  check("no results payload", nr.noResults?.suggestions.length === 3, nr.noResults);

  const rao = await getProviderProfile("dr-ananya-rao");
  check("profile facts", rao?.verification.facts.length === 6 && rao.practicesAt.length === 2 && rao.hours.days?.length === 7, rao?.verification);
  check("profile top list", rao?.topLists[0]?.rank === 1, rao?.topLists);
  check("profile route kind", (await getProviderForRoute("hospital", "dr-ananya-rao")) === null);
  const aravali = await getProviderProfile("aravali-multispeciality-hospital");
  check("hospital", aravali?.doctorsHere.length === 3 && aravali.questions.length === 3 && aravali.emergency?.children === true, aravali?.doctorsHere);
  const reviews = await getProviderReviews("aravali-multispeciality-hospital", { department: "Emergency" });
  check("reviews by department", reviews?.reviews.length === 1 && reviews.departments.length === 5, reviews?.departments);
  check("discussions", (await getProviderDiscussions("aravali-multispeciality-hospital")).length === 3);
  const spec = await getSpecialtyPage("paediatrics");
  check("specialty page", (spec?.doctors.length ?? 0) >= 3 && spec?.faqs.length === 4 && spec.relatedGuides.length === 2, spec?.doctors.map((d) => d.slug));
  check("specialties", (await getSpecialties()).length === 15);
  const er = await getEmergencyDirectory();
  check("emergency", er.departments.length === 5 && er.bloodBanks.length === 3 && er.chemists24h.length === 2, er.departments.map((d) => d.slug));
  check("emergency order", orderEmergencyDepartments(er.departments, "new-gurgaon")[0].slug === "new-gurgaon-24h-diagnostics-hospital");
  const fac = await getFacilityDirectory();
  check("facilities", fac.facilities.length >= 14 && fac.types.length === 10, fac.facilities.length);
  check("featured", (await getFeaturedProviders("sohna-road", "locality")).length === 4);
  check("recently verified", (await getRecentlyVerified("sector-56")).length === 4);
  check("claim candidates", (await findClaimCandidates("ananya")).length === 2);
  check("public phone", (await getPublicPhone("dr-ananya-rao")) === "+91 124 400 1234");

  const idx = await getLocalityIndex();
  check("locality index", idx.localities.length === 9 && idx.liveCount === 5, idx.listCheckedAt);
  const sohna = await getLocalityPage("sohna-road");
  check("locality page", sohna?.categories.find((c) => c.key === "clinics")?.count === 14 && sohna.featuredHospitals.length === 4 && sohna.events.length >= 1, sohna?.categories.map((c) => [c.key, c.count, c.providers.length]));
  check("locality hospitals serving", (sohna?.categories.find((c) => c.key === "hospitals")?.providers.length ?? 0) >= 2);
  check("unknown locality", (await getLocalityPage("atlantis")) === null);

  const upcoming = await getUpcomingEvents();
  check("upcoming events", upcoming.length >= 9, upcoming.length);
  const nov = await getEventMonth(2026, 11);
  check("calendar month", nov.daysInMonth === 30 && nov.firstWeekday === 0 && nov.days[14].events.length === 2, nov.days[14]);
  const eye = await getEvent("free-eye-check-up-camp-senior-citizens-sector-57");
  check("event detail", eye?.society?.slug === "sector-57-rwa" && eye.whenLabel === "Sunday 15 Nov 2026 · 9 am – 1 pm", eye?.whenLabel);
  check("changes-requested event isn't public", (await getEvent("morning-yoga-bp-check-seniors-sector-57")) === null && !(await listEventSlugs()).includes("morning-yoga-bp-check-seniors-sector-57"));
  const labProfile = await getProviderProfile("prakash-path-labs");
  check("hours being re-checked", labProfile?.hours.underRecheck === true && labProfile.recentChanges[0]?.summary.startsWith("Sunday hours"), labProfile?.hours);

  check("articles", (await getArticles()).length === 6);
  check("article", (await getArticle("dengue-season-district-health-department-advice"))?.title.startsWith("Dengue"));
  check("news updated", (await getNewsUpdatedAt()) !== null);
  const guide = await getGuide("how-to-find-the-right-specialist");
  check("guide", guide?.sections.length === 4 && guide.relatedSpecialties.length === 1 && guide.hasContent);
  check("guides", (await getGuides()).length === 7);
  check("corrections", (await getCorrections()).length === 4);
  check("dispute outcomes", (await getDisputeOutcomes()).map((d) => d.outcome).join(",") === "UPHELD,PARTLY UPHELD,NOT UPHELD,UPHELD");

  const threads = await getThreads();
  check("threads", threads.length >= 10 && threads.some((t) => t.statusLabel === "Pharmacist answered"), threads.map((t) => t.statusLabel));
  check("topic counts", (await getTopicCounts()).total >= 12);
  const t = await getThread("gcer-24h-chemist");
  check("thread", t?.posts.length === 3 && t.posts[0].isBest, t?.posts.map((p) => p.authorLabel));
  check("societies", (await getSocieties()).length === 1);
  const soc = await getSociety("sector-57-rwa");
  check("society", soc?.completed.length === 3 && soc.volunteerNeeds.length === 2, soc?.upcoming.map((e) => e.slug));
  check("volunteer roles", (await getVolunteerRoles()).length === 6);

  const lists = await getTopLists();
  check("top lists", lists.length === 9);
  const paeds = await getTopList("paediatricians");
  check("top list", paeds?.entries[0].name === "Dr. Ananya Rao" && paeds.tabs.length === 5, paeds?.tabs);
  const gov = await getTopList("government");
  check("government list", gov?.entries.every((e) => e.ownership === "government") && gov.entries.length === 2, gov?.entries.map((e) => e.name));
  check("stories", (await getStories()).length === 9);

  const kavya = await getNeighbourSummary("dr-kavya-menon");
  check("neighbours kavya", kavya?.recommendedBy === 24 && kavya.concernedResidents === 2 && kavya.rank?.position === 1 && kavya.quotes.length === 2, kavya);
  const movewell = await getNeighbourSummary("movewell-physio");
  check("neighbours not enough", movewell?.status === "not_enough" && movewell.label === "Not enough neighbour discussion yet");
  const counts = await getNeighbourCounts(["aravali-multispeciality-hospital", "dr-ananya-rao", "sai-medicos"]);
  check("neighbour counts", counts["aravali-multispeciality-hospital"] === 41 && counts["dr-ananya-rao"] === 19 && counts["sai-medicos"] === 0, counts);
  check("neighbour ranking", (await getNeighbourRanking("sohna-road", "paediatrics")).rows[0]?.provider.slug === "dr-kavya-menon");

  const home = await getHomepage();
  check("homepage", home.tabs.length === 5 && home.featuredHospitals["sector-56"].length === 4 && home.featuredHospitals["sector-56"][0].recommendedBy === 41 && home.news.length === 3 && home.topLists.length === 4, home.topLists.map((l) => l.slug));

  // ── Auth, account and admin ───────────────────────────────────────────────
  check("signed out", (await getCurrentUser()) === null);
  check("signed-out saved", (await getMySaved()) === null);
  await signInAs("+919000000007");
  const me = await getCurrentUser();
  check("signed in as resident", me?.displayName === "Resident, Sector 57" && me.phoneMasked === "+91 90XXX XX007" && me.reviewLabel === "Parent of a 2-year-old · Sector 57" && me.area === "Sector 57", me);
  const account = await getMyAccount();
  check(
    "my account",
    account?.emailMasked === "a•••••@example.com" &&
      account.reviewLabelOptions.join("|") === "Parent of a 2-year-old · Sector 57|Parent · Sector 57|Resident · Gurugram" &&
      account.counts.reviews === 3 &&
      account.counts.reports === 4 &&
      account.counts.events === 3 &&
      account.counts.disputes === 1 &&
      account.counts.savedPlaces === 3 &&
      account.counts.savedEvents === 1,
    account,
  );
  const saved = await getMySaved();
  const lab = saved?.[0];
  check(
    "my saved: changed place first",
    saved?.length === 4 && lab?.targetId === "prakash-path-labs" && lab.provider?.changesSinceSaved[0]?.summary === "Sunday hours are now 7 am – 1 pm. They were 7 – 11 am." && lab.provider.myReports[0]?.ref === "HG-3107",
    saved?.map((s) => [s.targetId, s.provider?.changesSinceSaved.length]),
  );
  const savedRao = saved?.find((s) => s.targetId === "dr-ananya-rao");
  check("my saved: re-confirmed, report couldn’t verify", savedRao?.provider?.recheckedSinceSaved === true && savedRao.provider.changesSinceSaved.length === 0 && savedRao.provider.myReports[0]?.statusLabel === "Couldn’t verify", savedRao?.provider);
  check("my saved: event verified since saved", saved?.find((s) => s.kind === "event")?.event?.verifiedSinceSaved === true);
  const follows = await getMyFollows();
  const loc = follows?.find((f) => f.kind === "locality");
  check(
    "my follows",
    follows?.length === 3 && loc?.alertsOn === true && (loc.news.locality?.upcoming.length ?? 0) >= 2 && follows.find((f) => f.kind === "thread")?.news.thread?.newReplies === 2 && follows.find((f) => f.kind === "topic")?.alertsOn === false,
    follows?.map((f) => [f.targetId, f.alertsOn, JSON.stringify(f.news)]),
  );
  check("is saved", await isSaved("provider", "dr-ananya-rao"));
  const activity = await getMyActivity();
  check(
    "my activity",
    activity?.reviews.length === 3 && activity.reports.length === 3 && activity.concerns.length === 1 && activity.events.length === 3 && activity.disputes.length === 1 && activity.attention.length === 2,
    activity?.attention,
  );
  check(
    "activity details",
    activity?.reviews.find((r) => r.ref === "HG-RV-8796")?.suggestion?.startsWith("You could write") &&
      activity.reports.find((r) => r.ref === "HG-3107")?.dueAt.startsWith("2026-10-29") &&
      activity.events.find((e) => e.ref === "HG-EV-5190")?.listed === false &&
      activity.concerns[0]?.statusLabel === "Closed" &&
      activity.disputes[0]?.statusLabel === "✓ Upheld",
    activity?.reports.map((r) => [r.ref, r.dueAt]),
  );
  const consent = await getMyConsent();
  const camps = consent?.types.find((t) => t.purpose === "city_channel");
  check(
    "my consent",
    consent?.onCount === 2 &&
      consent.whatsappOn.join(",") === "weekly_report,locality_updates" &&
      camps?.on === false &&
      camps.recordText.includes("Stopped 2 Oct 2026, 7:30 am, on WhatsApp") &&
      consent.types.find((t) => t.purpose === "weekly_report")?.lastSentAt?.startsWith("2026-10-23") &&
      consent.record.length === 7 &&
      consent.record[0].summary === "Turned on: Locality alerts for Sohna Road" &&
      consent.record.at(-1)?.tag === "SIGN-IN ONLY",
    { types: consent?.types.map((t) => [t.purpose, t.on, t.channel, t.recordText]), record: consent?.record.map((r) => r.summary) },
  );
  await setConsent({ userId: me!.id, purpose: "city_channel", channel: "whatsapp", granted: true, source: "account_settings", confirmed: true });
  const stopped = await withdrawAll(me!.id, { channel: "whatsapp", source: "account_settings", context: "On the WhatsApp & email page. You tapped Stop all WhatsApp messages." });
  check("stop all whatsapp", stopped.length === 3, stopped);
  const moved = await changeConsentChannel({ userId: me!.id, purpose: "weekly_report", channel: "email", source: "account_settings", context: "On the WhatsApp & email page." });
  const afterMove = await getMyConsent();
  check("channel change while off", moved.changed && afterMove?.types.find((t) => t.purpose === "weekly_report")?.channel === "email" && afterMove.record[0].tag === "CHANGED", afterMove?.record.slice(0, 2));
  let threw = false;
  try {
    await getAdminOverview();
  } catch (e) {
    threw = (e as { notFound?: boolean }).notFound === true;
  }
  check("resident can't open admin", threw);
  check("dashboard hidden from non-members", (await getSocietyDashboard("sector-57-rwa")) === null);
  await deleteCurrentSession();
  check("signed out again", (await getCurrentUser()) === null);

  // A first sign-in: the record notes the number, then the optional choices.
  await signInAs("+919811112222");
  const fresh = await getCurrentUser();
  const choices = new FormData();
  for (const [k, v] of Object.entries({ messageLang: "hi", weekly: "on", local: "on", locality: "sohna-road", lang: "en" })) choices.set(k, v);
  const chosen = await saveWelcomeChoices({ status: "idle" }, choices);
  const freshRecord = await getMyConsent();
  check(
    "first sign-in choices",
    chosen.status === "success" &&
      freshRecord?.record.map((r) => r.tag).join(",") === "SETTING,AGREED,AGREED,SIGN-IN ONLY" &&
      freshRecord.record[0].summary === "Chose Hindi for messages and sign-in codes" &&
      freshRecord.alertLocalities.join() === "Sohna Road",
    { chosen, record: freshRecord?.record.map((r) => `${r.tag} ${r.summary}`), user: fresh },
  );
  await deleteCurrentSession();

  await signInAs("+919000000006");
  const dash = await getSocietyDashboard("sector-57-rwa");
  check("rwa dashboard", dash?.permission === "admin" && dash.offers.length === 3 && dash.events.some((e) => e.reportDue), dash?.events.map((e) => [e.slug, e.reportDue]));
  await deleteCurrentSession();

  await signInAs("+919000000003");
  const modOverview = await getAdminOverview();
  check("moderator overview", modOverview.queues.every((q) => q.queue !== "claims"), modOverview);
  const queue = await getModerationQueue("reviews");
  const waitingReviews = queue.filter((q) => q.status === "waiting" || q.status === "escalated").map((q) => q.shortRef);
  check("reviews queue", waitingReviews.join(",") === "RV-8826,RV-8830,RV-8817", waitingReviews);
  check("queue item", (await getModerationItem("events", "diabetes-bp-screening-sector-49"))?.title === "Diabetes and BP screening, Sohna Road (9 Nov)");
  threw = false;
  try {
    await revealPrivateDetails("reviews", "HG-RV-8830");
  } catch (e) {
    threw = (e as { notFound?: boolean }).notFound === true;
  }
  check("moderator can't reveal", threw);
  await deleteCurrentSession();

  await signInAs("+919000000001");
  const overview = await getAdminOverview();
  check("admin overview", overview.waiting >= 6, overview);
  check("reveal private", (await revealPrivateDetails("reviews", "HG-RV-8830")) === "Reviewer: Sector 57 resident, verified by OTP");
  const audit = await getAuditLog();
  check("audit log", audit[0].action === "private.reveal" && audit.some((a) => a.summary.includes("RV-8819")), audit.slice(0, 3));
  check("verification desk", (await getVerificationDesk()).length >= 1);
  check("listings", (await getListings({ q: "sai" })).total === 1);
  await deleteCurrentSession();

  check("refs", /^HG-RV-883\d$/.test(await nextRef("review")));
  const admin = await db.user.findUnique({ where: { phone: "+919000000001" } });
  check("admin phone stays admin", admin?.role === "admin");

  // ── Account Server Actions, end to end (as the sample resident; the run reseeds afterwards) ──
  const form = (fields: Record<string, string | string[]>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
    return f;
  };
  const idle = { status: "idle" } as const;
  await completeSignIn({ phone: "+919000000007", lang: "en", channel: "sms" }); // code checks ran above; skip the 30 s resend wait
  const resident = (await getCurrentUser())!;
  const recordTop = async () => (await getMyConsent())!.record[0];
  // Undo the earlier lib-level checks (stop all, weekly by email) so the actions start from the seed's state.
  for (const purpose of ["weekly_report", "locality_updates"] as const) {
    await setConsent({ userId: resident.id, purpose, granted: true, channel: "whatsapp", source: "admin", context: "Smoke test reset.", subject: purpose === "locality_updates" ? "Sohna Road" : null, confirmed: true });
  }

  const ask = await setFollowAlert(idle, form({ kind: "thread", targetId: "gcer-24h-chemist", alert: "on", from: "saved" }));
  check("follow alert asks first", ask.status === "error" && ask.code === "consent_required" && ask.data?.ask?.label === "Replies to my questions", ask);
  const confirmed = await setFollowAlert(idle, form({ kind: "thread", targetId: "gcer-24h-chemist", alert: "on", from: "saved", confirm: "1" }));
  const afterConfirm = await recordTop();
  check(
    "follow alert confirmed",
    confirmed.status === "success" && confirmed.data?.alert === "whatsapp" && afterConfirm.summary === "Turned on: Replies to my questions" && afterConfirm.context?.startsWith("On the Saved & followed page. You chose Send alerts for"),
    { confirmed, afterConfirm },
  );
  const off = await setFollowAlert(idle, form({ kind: "locality", targetId: "sohna-road", alert: "off", from: "saved" }));
  check("last locality alert off stops locality alerts", off.status === "success" && (await recordTop()).summary === "Stopped: Locality alerts for Sohna Road", off);

  const stopAll = await stopAllWhatsApp(idle, form({}));
  const stoppedTypes = stopAll.status === "success" ? (stopAll.data?.stopped ?? []) : [];
  check("stop all (action)", stoppedTypes.sort().join(",") === "community_replies,weekly_report", stopAll);
  const undo = await undoStopAllWhatsApp(idle, form({ purposes: stoppedTypes }));
  check("undo stop all", undo.status === "success" && undo.data?.restored.length === 2 && (await recordTop()).summary.startsWith("Turned back on:"), undo);

  const toEmail = await changeMessageChannel(idle, form({ purpose: "weekly_report", channel: "email" }));
  check("weekly report by email", toEmail.status === "success" && (await getMyConsent())?.types.find((t) => t.purpose === "weekly_report")?.channel === "email", toEmail);

  const emailReq = await requestEmailChange(idle, form({ email: "new.address@example.com" }));
  const token = emailReq.status === "success" ? new URL(emailReq.data!.devLink!).searchParams.get("confirm_email") : null;
  check("email change pending", !!token && (await getMyAccount())?.emailPending?.email === "new.address@example.com", emailReq);
  const emailOk = await confirmEmail(idle, form({ token: token ?? "" }));
  check("email confirmed", emailOk.status === "success" && (await getMyAccount())?.email === "new.address@example.com" && (await recordTop()).summary === "Confirmed your email address for messages: n•••••@example.com", emailOk);
  check("email link works once", (await confirmEmail(idle, form({ token: token ?? "" }))).status === "error");

  check("review label must be offered", (await setReviewLabel(idle, form({ label: "Doctor · Sector 57" }))).status === "error");
  const relabel = await setReviewLabel(idle, form({ label: "Parent · Sector 57" }));
  check("review label", relabel.status === "success" && (await db.review.findUnique({ where: { ref: "HG-RV-8412" } }))?.authorLabel === "Parent · Sector 57", relabel);

  const hindi = await setMessageLanguage(idle, form({ messageLang: "hi" }));
  check("message language", hindi.status === "success" && (await recordTop()).summary === "Chose Hindi for messages and sign-in codes", hindi);

  const savedOn = await setConsentAction(idle, form({ purpose: "saved_changes", granted: "on", from: "saved" }));
  check("saved-changes switch", savedOn.status === "success" && (await recordTop()).context === "On the Saved & followed page. You switched on “Tell me when something I saved changes”.", savedOn);

  const exported = await exportMyData(idle, form({}));
  const dump = exported.status === "success" ? JSON.parse(exported.data!.json) : null;
  check("export", dump?.account.mobile === "+919000000007" && dump.reviews.length === 3 && dump.consent_record.length > 7 && dump.saved.length === 4, dump?.account);

  const noChoice = await deleteMyAccount(idle, form({}));
  check("delete asks about the published review", noChoice.status === "error" && noChoice.code === "choice_required", noChoice);
  let redirected = "";
  try {
    await deleteMyAccount(idle, form({ publishedReviews: "keep" }));
  } catch (e) {
    redirected = (e as { redirect?: string }).redirect ?? "";
  }
  const kept = await db.review.findUnique({ where: { ref: "HG-RV-8412" } });
  const gone = await db.user.findUnique({ where: { id: resident.id } });
  check(
    "account deleted",
    redirected === "/account?deleted=1&review=keep" &&
      kept?.authorLabel === "Former resident" &&
      kept.authorId === null &&
      kept.status === "published" &&
      (await db.review.count({ where: { ref: { in: ["HG-RV-8796", "HG-RV-8817"] } } })) === 0 &&
      gone?.deletedAt !== null &&
      gone?.email === null &&
      (await db.consentState.count({ where: { userId: resident.id, granted: true } })) === 0 &&
      (await isOnStopList("+919000000007")) &&
      (await getCurrentUser()) === null,
    { redirected, kept, gone },
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
