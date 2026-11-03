// Save and follow buttons, and alerts for things you follow.

import { z } from "zod";

import { ALERT_PREFS, FOLLOW_KINDS, SAVED_KINDS } from "@/lib/domain";

import { checkbox, lang, recordId } from "./common";

/** Which page a follow change came from, for the consent record's "where". */
export const FOLLOW_PLACES = ["saved", "page"] as const;

export const toggleSavedSchema = z.object({
  kind: z.enum(SAVED_KINDS, "Can’t save this."),
  targetId: recordId,
  lang,
});
export type ToggleSavedInput = z.infer<typeof toggleSavedSchema>;

/** Follow or unfollow. `undo` + `alerts` ("on") restore alerts straight after an unfollow
 * turned them off ("Undo: follow Sohna Road again"). */
export const toggleFollowSchema = z.object({
  kind: z.enum(FOLLOW_KINDS, "Can’t follow this."),
  targetId: recordId,
  from: z.enum(FOLLOW_PLACES).catch("page"),
  undo: checkbox,
  alerts: checkbox,
  lang,
});
export type ToggleFollowInput = z.infer<typeof toggleFollowSchema>;

/** Alerts for something you follow: "on" (by the message type's channel), "off", or an exact
 * preference. Turning alerts on may need the message type turned on too: the form then shows
 * "Send alerts about X?" and posts again with `confirm` ticked. */
export const setFollowAlertSchema = z.object({
  kind: z.enum(FOLLOW_KINDS, "Can’t follow this."),
  targetId: recordId,
  alert: z.enum([...ALERT_PREFS, "on", "off"], "Choose how to be alerted."),
  confirm: checkbox,
  from: z.enum(FOLLOW_PLACES).catch("page"),
  lang,
});
export type SetFollowAlertInput = z.infer<typeof setFollowAlertSchema>;
